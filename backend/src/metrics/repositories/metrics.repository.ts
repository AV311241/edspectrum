import { Prisma } from '@prisma/client';
import { provide } from 'inversify-binding-decorators';
import { prisma } from '../../config/db.config';
import {
  AttendanceRow,
  BudgetAllocationModel,
  DomainStageRow,
  EngagementActivityModel,
  FinanceRecordModel,
  HomeVisitModel,
  ObjectiveCoverageWithModule,
  ParentEngagementModel,
  ProgramBudgetModel,
  ProgramObjectiveModel,
  ScopeRowModel,
  TeachingModuleModel,
} from '../models/metrics.models';

export interface ScopeFilters {
  schoolId?: number;
  classId?: number;
  academicYear?: string;
  fromDate?: Date;
  toDate?: Date;
  /** Resolved class scope. An empty array means "genuinely nothing in scope". */
  classSectionIds?: number[];
}

export interface IMetricsRepository {
  /** Schools in scope, with their active class sections and enrolled head counts. */
  fetchScope(filters: ScopeFilters): Promise<ScopeRowModel[]>;
  fetchAttendanceRows(filters: ScopeFilters): Promise<AttendanceRow[]>;
  fetchDomainStageRows(filters: ScopeFilters): Promise<DomainStageRow[]>;
  fetchObjectives(filters: ScopeFilters): Promise<ProgramObjectiveModel[]>;
  fetchObjectiveCoverageWithModules(filters: ScopeFilters): Promise<ObjectiveCoverageWithModule[]>;
  fetchTeachingModules(): Promise<TeachingModuleModel[]>;
  fetchEngagementActivities(filters: ScopeFilters): Promise<EngagementActivityModel[]>;
  fetchParentEngagements(filters: ScopeFilters): Promise<ParentEngagementModel[]>;
  fetchHomeVisits(filters: ScopeFilters): Promise<HomeVisitModel[]>;
  fetchProgramBudgets(filters: ScopeFilters): Promise<ProgramBudgetModel[]>;
  fetchBudgetAllocations(filters: ScopeFilters): Promise<BudgetAllocationModel[]>;
  fetchFinanceRecords(filters: ScopeFilters): Promise<FinanceRecordModel[]>;
  countStudentsByStatus(filters: ScopeFilters): Promise<Record<string, number>>;
  countEnrolledStudents(filters: ScopeFilters): Promise<number>;
}

/**
 * Metrics data-access layer.
 *
 * Reuse-first: attendance, students, classes and assessments are read through the
 * SAME tables the existing `AttendanceService` / `StudentService` /
 * `ClassService` / `BaselineAssessmentService` already use. No table is duplicated
 * and no existing repository method is modified - this repository only adds
 * read-only projections plus access to the metrics-owned tables.
 */
@provide(MetricsRepository)
export class MetricsRepository implements IMetricsRepository {
  /**
   * Build a reusable class filter. An explicitly empty `classSectionIds` means the
   * scope is genuinely empty, so it returns a filter matching nothing rather than
   * silently widening the query to the whole programme.
   */
  private classScope(filters: ScopeFilters): Prisma.IntFilter | number | undefined {
    if (filters.classSectionIds !== undefined) {
      return filters.classSectionIds.length === 0 ? { in: [-1] } : { in: filters.classSectionIds };
    }
    if (filters.classId !== undefined) return filters.classId;
    return undefined;
  }

  public async fetchScope(filters: ScopeFilters): Promise<ScopeRowModel[]> {
    const classFilter = this.classScope(filters);

    const classSections = await prisma.classSection.findMany({
      where: {
        status: 'ACTIVE',
        ...(filters.schoolId !== undefined ? { schoolId: filters.schoolId } : {}),
        ...(filters.academicYear !== undefined ? { academicYear: filters.academicYear } : {}),
        ...(classFilter !== undefined ? { id: classFilter } : {}),
      },
      select: {
        id: true,
        name: true,
        schoolId: true,
        school: { select: { code: true, name: true } },
        _count: { select: { studentEnrollments: { where: { isCurrent: true } } } },
      },
      orderBy: [{ schoolId: 'asc' }, { name: 'asc' }],
    });

    // A class filter narrows to exactly one class, so no school roll-up is needed.
    if (filters.classId !== undefined) return [];

    // A school with no active classes still belongs in the matrix - it is exactly
    // the school that needs an alert - so synthesise a school-level row for it.
    const schools = await prisma.school.findMany({
      where: {
        status: 'ACTIVE',
        ...(filters.schoolId !== undefined ? { id: filters.schoolId } : {}),
      },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });

    const rows: ScopeRowModel[] = classSections.map((c) => ({
      schoolId: c.schoolId,
      schoolCode: c.school.code,
      schoolName: c.school.name,
      classSectionId: c.id,
      className: c.name,
      enrolledStudents: c._count.studentEnrollments,
    }));

    const schoolsWithClasses = new Set(classSections.map((c) => c.schoolId));
    for (const school of schools) {
      if (schoolsWithClasses.has(school.id)) continue;
      rows.push({
        schoolId: school.id,
        schoolCode: school.code,
        schoolName: school.name,
        classSectionId: null,
        className: null,
        enrolledStudents: 0,
      });
    }

    return rows;
  }

  public async fetchAttendanceRows(filters: ScopeFilters): Promise<AttendanceRow[]> {
    const classFilter = this.classScope(filters);
    const rows = await prisma.attendance.findMany({
      where: {
        ...(classFilter !== undefined ? { classSectionId: classFilter } : {}),
        ...(filters.fromDate || filters.toDate
          ? {
              sessionDate: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      select: { classSectionId: true, studentId: true, sessionDate: true, status: true },
      orderBy: { sessionDate: 'asc' },
    });
    return rows.map((r) => ({
      classSectionId: r.classSectionId,
      studentId: r.studentId,
      sessionDate: r.sessionDate,
      status: r.status as AttendanceRow['status'],
    }));
  }

  /**
   * Flattened `baseline_assessments` x `domain_results` for the learning calculators.
   *
   * Only assessments that have been submitted or reviewed are considered: a DRAFT
   * or IN_REVIEW row is a work in progress and would make the dashboard report
   * progress that has not actually been agreed.
   */
  public async fetchDomainStageRows(filters: ScopeFilters): Promise<DomainStageRow[]> {
    const classFilter = this.classScope(filters);
    const assessments = await prisma.baselineAssessment.findMany({
      where: {
        status: { in: ['SUBMITTED', 'REVIEWED', 'REVIEWED_OVERRIDE', 'LOCKED'] },
        ...(filters.schoolId !== undefined ? { schoolId: filters.schoolId } : {}),
        ...(classFilter !== undefined ? { classSectionId: classFilter } : {}),
        ...(filters.fromDate || filters.toDate
          ? {
              assessmentDate: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      select: {
        studentId: true,
        schoolId: true,
        classSectionId: true,
        assessmentDate: true,
        domainResults: {
          select: {
            suggestedStage: true,
            finalStage: true,
            domain: { select: { id: true, name: true } },
          },
        },
      },
    });

    const flattened: DomainStageRow[] = [];
    for (const assessment of assessments) {
      for (const result of assessment.domainResults) {
        // `finalStage` is the teacher's override and always wins; otherwise fall
        // back to the engine's `suggestedStage`. Same precedence the class summary
        // uses, so the dashboard can never contradict it.
        const effective = result.finalStage ?? result.suggestedStage;
        flattened.push({
          studentId: assessment.studentId,
          schoolId: assessment.schoolId,
          classSectionId: assessment.classSectionId,
          domainId: result.domain.id,
          domainName: result.domain.name,
          stage: effective,
          assessmentDate: assessment.assessmentDate,
        });
      }
    }
    return flattened;
  }

  public async fetchObjectives(filters: ScopeFilters): Promise<ProgramObjectiveModel[]> {
    const classFilter = this.classScope(filters);
    const rows = await prisma.programObjective.findMany({
      where: {
        ...(filters.academicYear !== undefined ? { academicYear: filters.academicYear } : {}),
        ...(filters.schoolId !== undefined
          ? { OR: [{ schoolId: filters.schoolId }, { schoolId: null }] }
          : {}),
        ...(classFilter !== undefined ? { classSectionId: classFilter } : {}),
      },
      select: {
        id: true,
        moduleId: true,
        schoolId: true,
        classSectionId: true,
        status: true,
        academicYear: true,
        targetMonth: true,
        completedAt: true,
      },
    });
    return rows.map((r) => ({ ...r }));
  }

  public async fetchObjectiveCoverageWithModules(
    filters: ScopeFilters
  ): Promise<ObjectiveCoverageWithModule[]> {
    const classFilter = this.classScope(filters);
    const rows = await prisma.objectiveCoverage.findMany({
      where: {
        ...(filters.academicYear !== undefined ? { academicYear: filters.academicYear } : {}),
        ...(filters.schoolId !== undefined ? { schoolId: filters.schoolId } : {}),
        ...(classFilter !== undefined ? { classSectionId: classFilter } : {}),
      },
      select: {
        id: true,
        classSectionId: true,
        moduleId: true,
        schoolId: true,
        status: true,
        completionPercent: true,
        academicYear: true,
        module: { select: { id: true, code: true, name: true, sequenceNumber: true } },
      },
      orderBy: [{ classSectionId: 'asc' }, { module: { sequenceNumber: 'asc' } }],
    });

    // Prisma returns Decimal for DECIMAL columns; convert once, here, so every
    // downstream calculator works with plain numbers.
    return rows.map((r) => ({
      id: r.id,
      classSectionId: r.classSectionId,
      moduleId: r.moduleId,
      schoolId: r.schoolId,
      status: r.status,
      completionPercent: r.completionPercent === null ? null : Number(r.completionPercent),
      academicYear: r.academicYear,
      module: r.module,
    }));
  }

  public async fetchTeachingModules(): Promise<TeachingModuleModel[]> {
    const rows = await prisma.teachingModule.findMany({
      select: { id: true, code: true, name: true, sequenceNumber: true },
      orderBy: { sequenceNumber: 'asc' },
    });
    return rows;
  }

  public async fetchEngagementActivities(
    filters: ScopeFilters
  ): Promise<EngagementActivityModel[]> {
    const classFilter = this.classScope(filters);
    const rows = await prisma.studentEngagementActivity.findMany({
      where: {
        completed: true,
        ...(filters.schoolId !== undefined ? { schoolId: filters.schoolId } : {}),
        ...(classFilter !== undefined ? { classSectionId: classFilter } : {}),
        ...(filters.fromDate || filters.toDate
          ? {
              activityDate: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        studentId: true,
        classSectionId: true,
        schoolId: true,
        activityType: true,
        activityDate: true,
        completed: true,
      },
      orderBy: { activityDate: 'asc' },
    });
    return rows;
  }

  public async fetchParentEngagements(filters: ScopeFilters): Promise<ParentEngagementModel[]> {
    const classFilter = this.classScope(filters);
    const rows = await prisma.parentEngagement.findMany({
      where: {
        ...(filters.schoolId !== undefined ? { schoolId: filters.schoolId } : {}),
        ...(classFilter !== undefined ? { classSectionId: classFilter } : {}),
        ...(filters.fromDate || filters.toDate
          ? {
              engagedOn: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      select: { id: true, schoolId: true, classSectionId: true, studentId: true, engagedOn: true },
      orderBy: { engagedOn: 'asc' },
    });
    return rows;
  }

  public async fetchHomeVisits(filters: ScopeFilters): Promise<HomeVisitModel[]> {
    const classFilter = this.classScope(filters);
    const rows = await prisma.homeVisit.findMany({
      where: {
        ...(filters.schoolId !== undefined ? { schoolId: filters.schoolId } : {}),
        ...(classFilter !== undefined ? { classSectionId: classFilter } : {}),
        ...(filters.fromDate || filters.toDate
          ? {
              visitDate: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        schoolId: true,
        classSectionId: true,
        visitDate: true,
        status: true,
        studentsReached: true,
      },
      orderBy: { visitDate: 'asc' },
    });
    return rows;
  }

  /**
   * Budgets for the scope. A NULL `schoolId` is the NGO-wide consolidated budget,
   * so a school-scoped request returns BOTH the global row and the school's own
   * allocation; the service decides which one to prefer.
   */
  public async fetchProgramBudgets(filters: ScopeFilters): Promise<ProgramBudgetModel[]> {
    const rows = await prisma.programBudget.findMany({
      where: {
        ...(filters.academicYear !== undefined ? { academicYear: filters.academicYear } : {}),
        ...(filters.schoolId !== undefined
          ? { OR: [{ schoolId: filters.schoolId }, { schoolId: null }] }
          : {}),
      },
      select: {
        id: true,
        schoolId: true,
        academicYear: true,
        totalAmount: true,
        currency: true,
        approvedOn: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ ...r, totalAmount: Number(r.totalAmount) }));
  }

  public async fetchBudgetAllocations(filters: ScopeFilters): Promise<BudgetAllocationModel[]> {
    const budgets = await this.fetchProgramBudgets(filters);
    if (budgets.length === 0) return [];

    const rows = await prisma.budgetAllocation.findMany({
      where: { programBudgetId: { in: budgets.map((b) => b.id) } },
      select: { id: true, programBudgetId: true, category: true, allocatedAmount: true },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => ({ ...r, allocatedAmount: Number(r.allocatedAmount) }));
  }

  public async fetchFinanceRecords(filters: ScopeFilters): Promise<FinanceRecordModel[]> {
    const rows = await prisma.financeRecord.findMany({
      where: {
        ...(filters.academicYear !== undefined ? { academicYear: filters.academicYear } : {}),
        ...(filters.schoolId !== undefined
          ? { OR: [{ schoolId: filters.schoolId }, { schoolId: null }] }
          : {}),
        ...(filters.fromDate || filters.toDate
          ? {
              spentOn: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        schoolId: true,
        academicYear: true,
        entryType: true,
        category: true,
        amount: true,
        spentOn: true,
      },
      orderBy: { spentOn: 'asc' },
    });
    return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
  }

  /**
   * Student head counts by `StudentStatus`.
   *
   * Returns a plain `Record<status, count>` that always contains every status key
   * (zero-filled) so the KPI tile can render a breakdown without null-guarding.
   */
  public async countStudentsByStatus(filters: ScopeFilters): Promise<Record<string, number>> {
    const classFilter = this.classScope(filters);
    const grouped = await prisma.student.groupBy({
      by: ['status'],
      where: {
        ...(filters.schoolId !== undefined ? { schoolId: filters.schoolId } : {}),
        ...(classFilter !== undefined ? { classId: classFilter } : {}),
      },
      _count: { _all: true },
    });

    const counts: Record<string, number> = { ACTIVE: 0, INACTIVE: 0, TRANSFERRED: 0 };
    for (const row of grouped) counts[row.status] = row._count._all;
    return counts;
  }

  /**
   * Enrolled head count from the CURRENT enrollment table rather than
   * `students.classId`, because a transferred student keeps their student row but
   * their enrollment is no longer current. This matches the `_count` projection
   * `ClassService` and `SchoolService` already use.
   */
  public async countEnrolledStudents(filters: ScopeFilters): Promise<number> {
    const classFilter = this.classScope(filters);
    if (filters.classSectionIds !== undefined && filters.classSectionIds.length === 0) return 0;

    return prisma.studentClassEnrollment.count({
      where: {
        isCurrent: true,
        ...(filters.schoolId !== undefined ? { schoolId: filters.schoolId } : {}),
        ...(classFilter !== undefined ? { classSectionId: classFilter } : {}),
      },
    });
  }
}
