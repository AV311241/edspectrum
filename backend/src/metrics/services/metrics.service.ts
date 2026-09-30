import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { logger } from '../../config/logger.config';
import { AppError } from '../../utils/appError.utils';
import { HttpStatusCode } from '../../constants/httpStatus.constants';
import { parseIsoDate, toIsoDateString, getUtcMonthRange } from '../../utils/date.utils';
import { MetricsRepository, IMetricsRepository, ScopeFilters } from '../repositories/metrics.repository';
import { DomainMetricsCalculator } from './DomainMetricsCalculator.service';
import { KPIMetricsCalculator } from './KPIMetricsCalculator.service';
import { MetricsFilterQuery, MetricsFilterEchoDTO } from '../dtos/metricsFilter.dto';
import { DashboardSummaryResponseDTO, DerivedInsightsDTO } from '../dtos/dashboardSummary.dto';
import { KpiSummaryResponseDTO } from '../dtos/kpiSummary.dto';
import { LearningProgressDTO } from '../dtos/learningProgress.dto';
import {
  SchoolPerformanceDTO,
  SchoolPerformanceResponseDTO,
} from '../dtos/schoolPerformance.dto';
import { NeedsAttentionDTO, NeedsAttentionResponseDTO } from '../dtos/needsAttention.dto';
import { EngagementMetricsDTO } from '../dtos/engagementMetrics.dto';
import { ResourceFinanceDTO, CategorySpendDTO, MonthlySpendPointDTO } from '../dtos/resourceFinance.dto';
import { TeachingObjectivesDTO } from '../dtos/teachingObjectives.dto';
import { ScopeRowModel } from '../models/metrics.models';
import {
  AlertSeverity,
  METRICS_ALERT_THRESHOLDS,
  METRICS_BUDGET_CATEGORY_LABELS,
  METRICS_MAX_ALERTS,
  METRICS_ME_THRESHOLDS,
  METRICS_STATUS_BAND_DISPLAY,
  METRICS_STATUS_BAND_FRONTEND_LABEL,
  MetricsStatusBand,
  NeedsAttentionCategory,
} from '../constants/metrics.constants';
import {
  aggregateAttendance,
  aggregateAttendanceByClass,
  average,
  buildCategoryDistribution,
  calculateEquityScore,
  calculateRiskScore,
  clamp,
  distinctCount,
  percentage,
  pointDelta,
  riskBand,
  round,
  sum,
  toKpiDelta,
  toModuleStatus,
} from '../utils/MetricsCalculationUtils';

/**
 * Public contract of the metrics module.
 *
 * Declared as an interface and bound to the concrete class so the controller and
 * any future implementation (e.g. a cached or pre-aggregated variant) stay
 * swappable, matching the `IXxxRepository` convention already used here.
 */
export interface IMetricsService {
  getDashboardSummary(query: MetricsFilterQuery): Promise<DashboardSummaryResponseDTO>;
  getKpiSummary(query: MetricsFilterQuery): Promise<KpiSummaryResponseDTO>;
  getLearningOutcomes(query: MetricsFilterQuery): Promise<LearningProgressDTO>;
  getSchoolPerformance(query: MetricsFilterQuery): Promise<SchoolPerformanceResponseDTO>;
  getNeedsAttention(query: MetricsFilterQuery): Promise<NeedsAttentionResponseDTO>;
  getTeachingObjectives(query: MetricsFilterQuery): Promise<TeachingObjectivesDTO>;
  getEngagementMetrics(query: MetricsFilterQuery): Promise<EngagementMetricsDTO>;
  getResourceFinance(query: MetricsFilterQuery): Promise<ResourceFinanceDTO>;
}

/** Resolved reporting window plus the scope filters derived from the request. */
interface ResolvedWindow {
  filters: ScopeFilters;
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  year: number;
  month: number;
  previousYear: number;
  previousMonth: number;
}

/** Per-school attendance roll-up, weighted by working days. */
interface SchoolAttendanceSlice {
  percent: number;
  workingDays: number;
  rows: number;
}

/** Everything the school table and the alert generator read from one fetch pass. */
interface ScopeAggregates {
  scopeRows: ScopeRowModel[];
  attendanceBySchool: Map<number, SchoolAttendanceSlice>;
  attendanceByClass: Map<number, SchoolAttendanceSlice>;
  attendanceOverall: { percent: number; workingDays: number; rows: number };
}

/**
 * Internal per-school record.
 *
 * `dto` is the wire shape; the sibling fields are context the alert generator needs
 * but that must never leak into the API response.
 */
interface InternalSchoolRow {
  dto: SchoolPerformanceDTO;
  hasAttendanceData: boolean;
  assessedStudents: number;
}

/** Short month labels for the finance trend chart, indexed 1-12. */
const MONTH_LABELS: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec',
};

/**
 * MetricsService - the metrics orchestration layer.
 *
 * Responsibilities, in order of the request lifecycle:
 *  1. resolve the reporting window and the previous period for MoM comparisons;
 *  2. fan out the reads it needs;
 *  3. hand pure row-sets to the calculators;
 *  4. assemble the seven dashboard aspects.
 *
 * It owns NO arithmetic of its own beyond scope bookkeeping - every formula lives
 * in `MetricsCalculationUtils` or one of the two calculators.
 */
@provide(MetricsService)
export class MetricsService implements IMetricsService {
  constructor(
    @inject(MetricsRepository) private metricsRepo: IMetricsRepository,
    @inject(DomainMetricsCalculator) private domainCalc: DomainMetricsCalculator,
    @inject(KPIMetricsCalculator) private kpiCalc: KPIMetricsCalculator
  ) {}

  /**
   * Resolve the reporting window.
   *
   * When the caller supplies `month`/`year` the window is exactly that calendar
   * month, and the comparison window is the month before it (rolling the year back
   * from January). Otherwise the window is the supplied from/to pair, or a rolling
   * year-to-date when neither is given. This keeps every endpoint explicit about
   * which period it is reporting on.
   */
  private resolveWindow(query: MetricsFilterQuery): ResolvedWindow {
    const now = new Date();
    const defaultYear = query.year ?? now.getUTCFullYear();
    const defaultMonth = query.month ?? now.getUTCMonth() + 1;

    if (query.month !== undefined && query.year !== undefined) {
      const { start, end } = getUtcMonthRange(defaultYear, defaultMonth);
      // January has no month 0, so roll back into December of the prior year.
      const prevYear = defaultMonth === 1 ? defaultYear - 1 : defaultYear;
      const prevMonth = defaultMonth === 1 ? 12 : defaultMonth - 1;
      const { start: prevStart, end: prevEnd } = getUtcMonthRange(prevYear, prevMonth);
      return {
        filters: {},
        from: start,
        to: end,
        previousFrom: prevStart,
        previousTo: prevEnd,
        year: defaultYear,
        month: defaultMonth,
        previousYear: prevYear,
        previousMonth: prevMonth,
      };
    }

    const from = query.fromDate
      ? parseIsoDate(query.fromDate, 'fromDate')
      : new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const to = query.toDate ? parseIsoDate(query.toDate, 'toDate') : now;
    if (from > to) {
      throw new AppError('fromDate must be on or before toDate', HttpStatusCode.BAD_REQUEST);
    }

    // The comparison window is the immediately preceding span of equal length, so a
    // custom from/to pair still receives a like-for-like month-over-month figure.
    const spanMs = to.getTime() - from.getTime();
    return {
      filters: {},
      from,
      to,
      previousFrom: new Date(from.getTime() - spanMs - 1),
      previousTo: new Date(from.getTime() - 1),
      year: defaultYear,
      month: defaultMonth,
      previousYear: defaultYear,
      previousMonth: defaultMonth,
    };
  }

  /** Assemble the scope filters shared by every repository call. */
  private buildFilters(query: MetricsFilterQuery, window: ResolvedWindow): ScopeFilters {
    return {
      ...(query.schoolId !== undefined ? { schoolId: query.schoolId } : {}),
      ...(query.classId !== undefined ? { classId: query.classId } : {}),
      ...(query.academicYear !== undefined ? { academicYear: query.academicYear } : {}),
      fromDate: window.from,
      toDate: window.to,
    };
  }

  /** The filter echo embedded in every response. */
  private buildFilterEcho(query: MetricsFilterQuery, window: ResolvedWindow): MetricsFilterEchoDTO {
    return {
      academicYear: query.academicYear ?? null,
      fromDate: toIsoDateString(window.from),
      toDate: toIsoDateString(window.to),
      schoolId: query.schoolId ?? null,
      classId: query.classId ?? null,
      month: query.month ?? null,
      year: query.year ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Aggregate the raw rows into the per-school and per-class figures that
   * Aspects 1, 3 and the derived insights all read from.
   *
   * Doing this once per request (rather than per aspect) is what guarantees the
   * school table, the KPI cards and the alert list describe the same data.
   */
  private async buildScopeAggregates(filters: ScopeFilters): Promise<{
    scopeRows: ScopeRowModel[];
    attendanceBySchool: Map<number, { percent: number; workingDays: number; rows: number }>;
    attendanceByClass: Map<number, { percent: number; workingDays: number; rows: number }>;
    attendanceOverall: { percent: number; workingDays: number; rows: number };
  }> {
    const scopeRows = await this.metricsRepo.fetchScope(filters);
    const attendanceRows = await this.metricsRepo.fetchAttendanceRows(filters);

    // Map every class to its school once, so per-class attendance can be rolled up
    // without a second query per class.
    const schoolByClass = new Map<number, number>();
    for (const row of scopeRows) {
      if (row.classSectionId !== null) schoolByClass.set(row.classSectionId, row.schoolId);
    }

    const byClassAgg = aggregateAttendanceByClass(attendanceRows);
    const attendanceByClass = new Map<number, { percent: number; workingDays: number; rows: number }>();
    for (const [classId, agg] of byClassAgg) {
      attendanceByClass.set(classId, {
        percent: agg.attendancePercent,
        workingDays: agg.workingDays,
        rows: agg.weightedPresentDays,
      });
    }

    // Roll up to school, weighted by working days: averaging class percentages
    // would let a class with a single marked session count as much as a class
    // marked every day.
    const weightedBySchool = new Map<number, { present: number; workingDays: number }>();
    for (const [classId, agg] of byClassAgg) {
      const schoolId = schoolByClass.get(classId);
      if (schoolId === undefined) continue;
      const bucket = weightedBySchool.get(schoolId) ?? { present: 0, workingDays: 0 };
      bucket.present += agg.weightedPresentDays;
      bucket.workingDays += agg.workingDays;
      weightedBySchool.set(schoolId, bucket);
    }

    const attendanceBySchool = new Map<number, { percent: number; workingDays: number; rows: number }>();
    for (const [schoolId, bucket] of weightedBySchool) {
      attendanceBySchool.set(schoolId, {
        percent: percentage(bucket.present, bucket.workingDays),
        workingDays: bucket.workingDays,
        rows: bucket.present,
      });
    }

    const overall = aggregateAttendance(attendanceRows);
    return {
      scopeRows,
      attendanceBySchool,
      attendanceByClass,
      attendanceOverall: {
        percent: overall.attendancePercent,
        workingDays: overall.workingDays,
        rows: overall.weightedPresentDays,
      },
    };
  }

  /** Objective counts + the class x module coverage matrix (Aspect 5). */
  public async getTeachingObjectives(query: MetricsFilterQuery): Promise<TeachingObjectivesDTO> {
    const window = this.resolveWindow(query);
    const filters = this.buildFilters(query, window);

    const [objectives, coverages, modules, scopeRows] = await Promise.all([
      this.metricsRepo.fetchObjectives(filters),
      this.metricsRepo.fetchObjectiveCoverageWithModules(filters),
      this.metricsRepo.fetchTeachingModules(),
      this.metricsRepo.fetchScope(filters),
    ]);

    const counts = this.countObjectiveStatuses(objectives.map((o) => o.status));
    const total = objectives.length;
    const completionPercent = percentage(counts.completed, total);
    const momDelta = pointDelta(completionPercent, 0);

    // Index coverage by class + module id for O(1) matrix assembly.
    const coverageByClass = new Map<number, Map<number, string>>();
    for (const cell of coverages) {
      const byModule = coverageByClass.get(cell.classSectionId) ?? new Map<number, string>();
      byModule.set(cell.moduleId, cell.status);
      coverageByClass.set(cell.classSectionId, byModule);
    }

    const moduleCount = modules.length;
    const matrixRows = scopeRows
      .filter((row): row is ScopeRowModel & { classSectionId: number } => row.classSectionId !== null)
      .map((row) => {
        const byModule = coverageByClass.get(row.classSectionId) ?? new Map<number, string>();
        const statuses = modules.map((m) => toModuleStatus(byModule.get(m.id) ?? 'NOT_STARTED'));
        const coveredCount = statuses.filter((s) => s === 'covered').length;
        const inProgressCount = statuses.filter((s) => s === 'in-progress').length;
        return {
          classSectionId: row.classSectionId,
          schoolId: row.schoolId,
          schoolName: row.schoolName,
          className: row.className ?? '',
          modules: statuses,
          coveragePercent: percentage(coveredCount, moduleCount),
          coveredCount,
          inProgressCount,
          notStartedCount: statuses.filter((s) => s === 'not-started').length,
          enrolledStudents: row.enrolledStudents,
        };
      });

    const totalCovered = matrixRows.reduce((acc, r) => acc + r.coveredCount, 0);
    const totalCells = matrixRows.length * moduleCount;

    return {
      objectiveProgress: {
        ...counts,
        completionPercent,
        total,
        momDeltaPoints: momDelta.value,
        momDirection: momDelta.direction,
      },
      moduleColumns: modules.map((m) => ({
        moduleId: m.id,
        code: m.code,
        name: m.name,
        sequenceNumber: m.sequenceNumber,
      })),
      teachingMatrix: matrixRows,
      overallCoveragePercent: percentage(totalCovered, totalCells),
    };
  }

  /** Tally objective plan statuses into the four dashboard buckets. */
  private countObjectiveStatuses(statuses: string[]): {
    planned: number;
    completed: number;
    inProgress: number;
    upcoming: number;
  } {
    const counts = { planned: 0, completed: 0, inProgress: 0, upcoming: 0 };
    for (const status of statuses) {
      if (status === 'COMPLETED') counts.completed += 1;
      else if (status === 'IN_PROGRESS') counts.inProgress += 1;
      else if (status === 'UPCOMING') counts.upcoming += 1;
      else counts.planned += 1;
    }
    return counts;
  }

  /** Stakeholder engagement (Aspect 6). */
  public async getEngagementMetrics(query: MetricsFilterQuery): Promise<EngagementMetricsDTO> {
    const window = this.resolveWindow(query);
    const filters = this.buildFilters(query, window);

    const [activities, parents, visits, scopeRows] = await Promise.all([
      this.metricsRepo.fetchEngagementActivities(filters),
      this.metricsRepo.fetchParentEngagements(filters),
      this.metricsRepo.fetchHomeVisits(filters),
      this.metricsRepo.fetchScope(filters),
    ]);

    const enrolledStudents = scopeRows.reduce((acc, r) => acc + r.enrolledStudents, 0);
    const sparkMonths = this.academicMonths();

    // --- Card 1: class participation ---
    const participantsByClass = new Map<number, Set<number>>();
    for (const activity of activities) {
      if (activity.activityType !== 'CLASS_PARTICIPATION' || activity.classSectionId === null) continue;
      const bucket = participantsByClass.get(activity.classSectionId) ?? new Set<number>();
      bucket.add(activity.studentId);
      participantsByClass.set(activity.classSectionId, bucket);
    }
    const participationIds = distinctCount(
      activities.filter((a) => a.activityType === 'CLASS_PARTICIPATION').map((a) => a.studentId)
    );
    const byClass = scopeRows
      .filter((row): row is ScopeRowModel & { classSectionId: number } => row.classSectionId !== null)
      .map((row) => {
        const count = participantsByClass.get(row.classSectionId)?.size ?? 0;
        return {
          classSectionId: row.classSectionId,
          className: row.className ?? '',
          schoolName: row.schoolName,
          participatingStudents: count,
          enrolledStudents: row.enrolledStudents,
          participationRatePercent: percentage(count, row.enrolledStudents),
        };
      });
    const participationRate = percentage(participationIds, enrolledStudents);

    // --- Card 2: AI/IVRS + practice active students ---
    const practiceActivities = activities.filter(
      (a) => a.activityType === 'AI_IVRS' || a.activityType === 'PRACTICE'
    );
    const activeStudents = distinctCount(practiceActivities.map((a) => a.studentId));
    const activeRate = percentage(activeStudents, enrolledStudents);
    const byActivityType = (['AI_IVRS', 'PRACTICE'] as const).map((type) => {
      const count = distinctCount(
        practiceActivities.filter((a) => a.activityType === type).map((a) => a.studentId)
      );
      return {
        activityType: type,
        activeStudents: count,
        percentOfActive: percentage(count, activeStudents),
      };
    });

    // --- Card 3: parents reached (MoM against the previous window) ---
    const parentsReached = parents.length;
    const previousParents = await this.countParentsInPreviousWindow(filters, window);
    const parentMom = pointDelta(parentsReached, previousParents);

    // --- Card 4: home visits (COMPLETED rows only) ---
    const completedVisits = visits.filter((v) => v.status === 'COMPLETED');
    const studentsReached = sum(completedVisits.map((v) => v.studentsReached));
    const previousVisits = await this.countVisitsInPreviousWindow(filters, window);
    const visitMom = pointDelta(completedVisits.length, previousVisits.completedVisits);
    const previousActive = await this.countActiveInPreviousWindow(filters, window);

    return {
      classParticipation: {
        participatingStudents: participationIds,
        enrolledStudents,
        participationRatePercent: participationRate,
        delta: toKpiDelta(pointDelta(participationRate, 0), 'vs last month'),
        byClass,
      },
      activeStudents: {
        activeStudents,
        enrolledStudents,
        activeRatePercent: activeRate,
        delta: toKpiDelta(
          pointDelta(activeRate, percentage(previousActive, enrolledStudents)),
          'vs last month'
        ),
        byActivityType,
        sparkline: this.monthlyCountSeries(
          parents.map((p) => p.engagedOn),
          window.year,
          sparkMonths
        ),
      },
      parentEngagement: {
        parentsReached,
        previousMonthParentsReached: previousParents,
        momPercentChange: parentMom.value,
        delta: toKpiDelta(parentMom, 'vs last month'),
        byChannel: [],
        sparkline: this.monthlyCountSeries(
          parents.map((p) => p.engagedOn),
          window.year,
          sparkMonths
        ),
      },
      homeVisits: {
        completedVisits: completedVisits.length,
        previousMonthCompletedVisits: previousVisits.completedVisits,
        studentsReached,
        previousMonthStudentsReached: previousVisits.studentsReached,
        studentsReachedDelta: round(studentsReached - previousVisits.studentsReached, 2),
        delta: toKpiDelta(visitMom, 'vs last month'),
        sparkline: this.monthlyCountSeries(
          completedVisits.map((v) => v.visitDate),
          window.year,
          sparkMonths
        ),
      },
      overallEngagementScore: average([participationRate, activeRate]),
    };
  }

  /** Academic-year months, Apr -> Mar - the Indian school-year convention. */
  private academicMonths(): number[] {
    return [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
  }

  /** Zero-filled monthly counts for a sparkline series. */
  private monthlyCountSeries(dates: Date[], year: number, months: number[]): number[] {
    const counts = new Map<string, number>();
    for (const date of dates) {
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return months.map((m) => counts.get(`${year}-${m}`) ?? 0);
  }

  private async countParentsInPreviousWindow(
    filters: ScopeFilters,
    window: ResolvedWindow
  ): Promise<number> {
    const rows = await this.metricsRepo.fetchParentEngagements({
      ...filters,
      fromDate: window.previousFrom,
      toDate: window.previousTo,
    });
    return rows.length;
  }

  private async countVisitsInPreviousWindow(
    filters: ScopeFilters,
    window: ResolvedWindow
  ): Promise<{ completedVisits: number; studentsReached: number }> {
    const rows = await this.metricsRepo.fetchHomeVisits({
      ...filters,
      fromDate: window.previousFrom,
      toDate: window.previousTo,
    });
    const completed = rows.filter((r) => r.status === 'COMPLETED');
    return {
      completedVisits: completed.length,
      studentsReached: sum(completed.map((r) => r.studentsReached)),
    };
  }

  private async countActiveInPreviousWindow(
    filters: ScopeFilters,
    window: ResolvedWindow
  ): Promise<number> {
    const rows = await this.metricsRepo.fetchEngagementActivities({
      ...filters,
      fromDate: window.previousFrom,
      toDate: window.previousTo,
    });
    return distinctCount(
      rows
        .filter((r) => r.activityType === 'AI_IVRS' || r.activityType === 'PRACTICE')
        .map((r) => r.studentId)
    );
  }

  /** Resources and finance (Aspect 7). */
  public async getResourceFinance(query: MetricsFilterQuery): Promise<ResourceFinanceDTO> {
    const window = this.resolveWindow(query);
    const filters = this.buildFilters(query, window);

    const [budgets, allocations, records] = await Promise.all([
      this.metricsRepo.fetchProgramBudgets(filters),
      this.metricsRepo.fetchBudgetAllocations(filters),
      this.metricsRepo.fetchFinanceRecords(filters),
    ]);

    // Prefer the school-specific budget; fall back to the NGO-wide consolidated row.
    const budget =
      (query.schoolId !== undefined
        ? budgets.find((b) => b.schoolId === query.schoolId)
        : undefined) ??
      budgets.find((b) => b.schoolId === null) ??
      budgets[0];

    const totalBudget = budget?.totalAmount ?? 0;
    const currency = budget?.currency ?? 'INR';

    // Only EXPENSE rows are actual outflows; a BUDGET line is the sanctioned figure
    // and must never be double-counted as spend.
    const expenses = records.filter((r) => r.entryType === 'EXPENSE');
    const totalSpend = sum(expenses.map((r) => r.amount));

    // All six categories are always present so the chart's shape is stable even
    // when a category has recorded no spend.
    const categoryKeys = Object.keys(
      METRICS_BUDGET_CATEGORY_LABELS
    ) as Array<keyof typeof METRICS_BUDGET_CATEGORY_LABELS>;

    const allocatedByCategory = new Map<string, number>();
    for (const allocation of allocations) {
      allocatedByCategory.set(
        allocation.category,
        (allocatedByCategory.get(allocation.category) ?? 0) + allocation.allocatedAmount
      );
    }

    const categorySpend: CategorySpendDTO[] = buildCategoryDistribution(
      expenses.map((r) => r.category),
      categoryKeys
    ).map((entry) => {
      const amount = sum(
        expenses.filter((r) => r.category === entry.category).map((r) => r.amount)
      );
      const allocated = allocatedByCategory.get(entry.category) ?? null;
      return {
        name: METRICS_BUDGET_CATEGORY_LABELS[entry.category],
        category: entry.category,
        amount,
        percentage: entry.percentage,
        allocatedAmount: allocated,
        varianceAmount: allocated === null ? null : round(amount - allocated, 2),
      };
    });

    // Monthly trend, Apr -> Mar, zero-filled so gaps read as gaps.
    const spendByMonth = new Map<string, number>();
    for (const record of expenses) {
      const key = `${record.spentOn.getUTCFullYear()}-${record.spentOn.getUTCMonth() + 1}`;
      spendByMonth.set(key, (spendByMonth.get(key) ?? 0) + record.amount);
    }

    let previousAmount = 0;
    const monthlySpendTrend: MonthlySpendPointDTO[] = this.academicMonths().map((monthNumber) => {
      const amount = round(spendByMonth.get(`${window.year}-${monthNumber}`) ?? 0, 2);
      const point: MonthlySpendPointDTO = {
        month: MONTH_LABELS[monthNumber],
        monthNumber,
        year: window.year,
        amount,
        deltaFromPrevious: round(amount - previousAmount, 2),
      };
      previousAmount = amount;
      return point;
    });

    // Straight-line pace expectation for the elapsed part of the academic year, so
    // the UI can say "ahead of / behind pace" rather than showing a bare percentage
    // that is impossible to interpret in April.
    const yearStart = new Date(Date.UTC(window.year, 3, 1)).getTime();
    const elapsedFraction = clamp((window.to.getTime() - yearStart) / (365 * 24 * 60 * 60 * 1000), 0, 1);
    const utilisation = percentage(totalSpend, totalBudget);
    const expectedUtilisation = round(elapsedFraction * 100, 2);

    return {
      budget: {
        totalAnnualBudget: round(totalBudget, 2),
        spentTillDate: totalSpend,
        balanceRemaining: round(totalBudget - totalSpend, 2),
        currency,
        utilisationPercent: utilisation,
        expectedUtilisationPercent: expectedUtilisation,
        burnRateDeltaPercent: round(utilisation - expectedUtilisation, 2),
        academicYear: budget?.academicYear ?? query.academicYear ?? null,
        hasBudget: budget !== undefined,
      },
      categorySpend,
      monthlySpendTrend,
      totalSpendInAcademicYear: totalSpend,
      monthsWithSpend: monthlySpendTrend.filter((m) => m.amount > 0).length,
    };
  }

  /**
   * Band a school into On Track / Watch / Critical.
   *
   * CRITICAL requires a CONJUNCTION - a school must breach BOTH the attendance and
   * the objectives thresholds (or have no assessment data at all) to be escalated.
   * That deliberately makes the Critical badge trustworthy: no school is flagged on
   * the strength of a single lagging indicator.
   */
  private resolveStatusBand(params: {
    attendancePercent: number;
    objectivesCoveredPercent: number;
    learningGainPoints: number;
    hasAssessmentData: boolean;
  }): MetricsStatusBand {
    const t = METRICS_ME_THRESHOLDS;
    if (!params.hasAssessmentData) return MetricsStatusBand.CRITICAL;

    const critical =
      params.attendancePercent < t.attendancePercent.criticalBelow &&
      params.objectivesCoveredPercent < t.objectivesCoveredPercent.criticalBelow;

    if (critical) return MetricsStatusBand.CRITICAL;

    const watch =
      params.attendancePercent < t.attendancePercent.watchBelow ||
      params.objectivesCoveredPercent < t.objectivesCoveredPercent.watchBelow ||
      params.learningGainPoints < t.learningGainPoints.watchBelow;

    return watch ? MetricsStatusBand.WATCH : MetricsStatusBand.ON_TRACK;
  }

  /** Build the per-school rows shared by Aspect 3 and the alert generator. */
  private async buildSchoolRows(filters: ScopeFilters): Promise<{
    rows: InternalSchoolRow[];
    aggregates: ScopeAggregates;
  }> {
    const [aggregates, domainRows, coverage, objectives] = await Promise.all([
      this.buildScopeAggregates(filters),
      this.metricsRepo.fetchDomainStageRows(filters),
      this.metricsRepo.fetchObjectiveCoverageWithModules(filters),
      this.metricsRepo.fetchObjectives(filters),
    ]);

    const { baseline, current } = this.domainCalc.splitPeriods(domainRows);
    const currentBySchool = this.domainCalc.buildSchoolProgress(current);
    const baselineBySchool = this.domainCalc.buildSchoolProgress(baseline);
    const snapshots = this.domainCalc.snapshotsFor(current);

    // Objectives covered, per school: a school-scoped objective OR a global
    // (schoolId IS NULL) objective applies to every school.
    const allSchoolIds = [...new Set(aggregates.scopeRows.map((r) => r.schoolId))];
    const objectiveBySchool = new Map<number, { completed: number; total: number }>();
    for (const objective of objectives) {
      const targets = objective.schoolId === null ? allSchoolIds : [objective.schoolId];
      for (const schoolId of targets) {
        const bucket = objectiveBySchool.get(schoolId) ?? { completed: 0, total: 0 };
        bucket.total += 1;
        if (objective.status === 'COMPLETED') bucket.completed += 1;
        objectiveBySchool.set(schoolId, bucket);
      }
    }

    // Matrix coverage, per school - the fallback for "objectives covered".
    const coverageBySchool = new Map<number, { covered: number; total: number }>();
    for (const cell of coverage) {
      if (cell.schoolId === null) continue;
      const bucket = coverageBySchool.get(cell.schoolId) ?? { covered: 0, total: 0 };
      bucket.total += 1;
      if (cell.status === 'COVERED') bucket.covered += 1;
      coverageBySchool.set(cell.schoolId, bucket);
    }

    const schoolMeta = new Map<
      number,
      { code: string; name: string; students: number; classCount: number }
    >();
    for (const scopeRow of aggregates.scopeRows) {
      const meta = schoolMeta.get(scopeRow.schoolId) ?? {
        code: scopeRow.schoolCode,
        name: scopeRow.schoolName,
        students: 0,
        classCount: 0,
      };
      meta.students += scopeRow.enrolledStudents;
      if (scopeRow.classSectionId !== null) meta.classCount += 1;
      schoolMeta.set(scopeRow.schoolId, meta);
    }

    const rows: InternalSchoolRow[] = [...schoolMeta.entries()].map(([schoolId, meta]) => {
      const attendance = aggregates.attendanceBySchool.get(schoolId);
      const attendancePercent = attendance?.percent ?? 0;

      const currentProgress = currentBySchool.get(schoolId) ?? 0;
      const baselineProgress = baselineBySchool.get(schoolId) ?? currentProgress;
      const learningGainPoints = round(currentProgress - baselineProgress, 2);

      const objBucket = objectiveBySchool.get(schoolId);
      const covBucket = coverageBySchool.get(schoolId);
      // The card shows the objective-level figure when objectives exist, otherwise
      // the per-cell matrix coverage, otherwise 0 - never a fabricated number.
      const objectivesCoveredPercent =
        objBucket && objBucket.total > 0
          ? percentage(objBucket.completed, objBucket.total)
          : covBucket && covBucket.total > 0
            ? percentage(covBucket.covered, covBucket.total)
            : 0;

      const assessedStudents = distinctCount(
        [...snapshots.values()].filter((s) => s.schoolId === schoolId).map((s) => s.studentId)
      );
      const dataCompletenessPercent = percentage(assessedStudents, meta.students);

      const band = this.resolveStatusBand({
        attendancePercent,
        objectivesCoveredPercent,
        learningGainPoints,
        hasAssessmentData: assessedStudents > 0,
      });

      return {
        dto: {
          id: String(schoolId),
          school: meta.name,
          students: meta.students,
          attendance: attendancePercent,
          learningGain: learningGainPoints,
          objectives: objectivesCoveredPercent,
          meStatus: METRICS_STATUS_BAND_DISPLAY[band],
          meStatusCategory: METRICS_STATUS_BAND_FRONTEND_LABEL[band],
          schoolId,
          schoolCode: meta.code,
          studentCount: meta.students,
          attendancePercent,
          learningGainPoints,
          objectivesCoveredPercent,
          meStatusBand: band,
          riskScore: calculateRiskScore({
            attendancePercent,
            objectivesCoveredPercent,
            learningGainPoints,
            dataCompletenessPercent,
          }),
          dataCompletenessPercent,
          classCount: meta.classCount,
        },
        // Internal-only context the alert generator needs; never serialised.
        hasAttendanceData: (attendance?.workingDays ?? 0) > 0,
        assessedStudents,
      };
    });

    return { rows, aggregates };
  }

  /** School performance matrix (Aspect 3). */
  public async getSchoolPerformance(
    query: MetricsFilterQuery
  ): Promise<SchoolPerformanceResponseDTO> {
    const window = this.resolveWindow(query);
    const filters = this.buildFilters(query, window);
    const { rows } = await this.buildSchoolRows(filters);

    // Worst-performing schools first: the table exists to drive intervention.
    const schools = rows
      .map((r) => r.dto)
      .sort((a, b) => a.riskScore - b.riskScore || a.school.localeCompare(b.school));

    return {
      schools,
      totalSchools: schools.length,
      programmeAverage: {
        attendancePercent: average(schools.map((s) => s.attendancePercent)),
        learningGainPoints: average(schools.map((s) => s.learningGainPoints)),
        objectivesCoveredPercent: average(schools.map((s) => s.objectivesCoveredPercent)),
        riskScore: average(schools.map((s) => s.riskScore)),
      },
    };
  }

  /**
   * Dynamic "Needs Attention" alerts (Aspect 4).
   *
   * Alerts are never persisted. They are re-derived on every call from the very
   * same figures that feed the KPI tiles and the school table, which is what
   * guarantees the alert list can never contradict the numbers shown beside it.
   */
  public async getNeedsAttention(query: MetricsFilterQuery): Promise<NeedsAttentionResponseDTO> {
    const window = this.resolveWindow(query);
    const filters = this.buildFilters(query, window);
    const startTime = Date.now();

    const [{ rows }, domainRows] = await Promise.all([
      this.buildSchoolRows(filters),
      this.metricsRepo.fetchDomainStageRows(filters),
    ]);

    const learning = this.domainCalc.buildLearningProgress(domainRows);
    const speaking = learning.domainProgress.find((d) => d.domain === 'Speaking');
    const alerts: NeedsAttentionDTO[] = [];

    for (const row of rows) {
      const school = row.dto;
      const base = {
        schoolId: school.schoolId,
        schoolName: school.school,
        classSectionId: null,
        className: null,
      };

      // 1. Data gap - no attendance marked at all this period.
      if (!row.hasAttendanceData) {
        alerts.push({
          id: `data-gap-${school.schoolId}`,
          title: `Attendance data missing (${school.school})`,
          subtitle: 'No attendance marked in this period',
          category: NeedsAttentionCategory.DATA_GAP,
          severity: AlertSeverity.CRITICAL,
          ...base,
          issueDescription: `No attendance has been recorded for ${school.school} in the selected period, so its ${school.classCount} class section(s) cannot be evaluated.`,
          actionNeeded:
            'Ask the school to upload attendance for the period, or mark the sessions as CANCELLED if the programme did not run.',
          observedValue: 0,
          thresholdValue: METRICS_ALERT_THRESHOLDS.attendanceRowGap,
          unit: 'sessions',
          gapPoints: null,
        });
      }

      // 2. Low attendance.
      if (row.hasAttendanceData && school.attendancePercent < METRICS_ALERT_THRESHOLDS.attendancePercentBelow) {
        const shortfall = round(
          METRICS_ALERT_THRESHOLDS.attendancePercentBelow - school.attendancePercent,
          2
        );
        alerts.push({
          id: `attendance-${school.schoolId}`,
          title: `Attendance (${school.school})`,
          subtitle: `${school.attendancePercent}% - below the ${METRICS_ALERT_THRESHOLDS.attendancePercentBelow}% target`,
          category: NeedsAttentionCategory.ATTENDANCE,
          severity:
            school.attendancePercent < METRICS_ME_THRESHOLDS.attendancePercent.criticalBelow
              ? AlertSeverity.CRITICAL
              : AlertSeverity.WARNING,
          ...base,
          issueDescription: `Attendance is ${school.attendancePercent}%, which is ${shortfall} points below the programme target of ${METRICS_ALERT_THRESHOLDS.attendancePercentBelow}%.`,
          actionNeeded:
            'Review the class registers for irregular sessions and follow up with the school on student-level absenteeism.',
          observedValue: school.attendancePercent,
          thresholdValue: METRICS_ALERT_THRESHOLDS.attendancePercentBelow,
          unit: '%',
          gapPoints: -shortfall,
        });
      }

      // 3. Low learning gain.
      if (row.assessedStudents > 0 && school.learningGainPoints < METRICS_ALERT_THRESHOLDS.learningGainPointsBelow) {
        alerts.push({
          id: `learning-gain-${school.schoolId}`,
          title: `Learning gain (${school.school})`,
          subtitle: `${school.learningGainPoints} pts - below the ${METRICS_ALERT_THRESHOLDS.learningGainPointsBelow} pt target`,
          category: NeedsAttentionCategory.LEARNING_GAIN,
          severity: AlertSeverity.WARNING,
          ...base,
          issueDescription: `Average attainment moved ${school.learningGainPoints} points between baseline and current, below the ${METRICS_ALERT_THRESHOLDS.learningGainPointsBelow} point target across ${row.assessedStudents} assessed student(s).`,
          actionNeeded:
            'Compare the class profile against the target module coverage and re-plan the teaching sequence for the lagging classes.',
          observedValue: school.learningGainPoints,
          thresholdValue: METRICS_ALERT_THRESHOLDS.learningGainPointsBelow,
          unit: ' pts',
          gapPoints: round(school.learningGainPoints - METRICS_ALERT_THRESHOLDS.learningGainPointsBelow, 2),
        });
      }

      // 4. Objectives coverage.
      if (school.objectivesCoveredPercent < METRICS_ALERT_THRESHOLDS.objectivesCoveredPercentBelow) {
        alerts.push({
          id: `objectives-${school.schoolId}`,
          title: `Objectives coverage (${school.school})`,
          subtitle: `${school.objectivesCoveredPercent}% of objectives covered`,
          category: NeedsAttentionCategory.OBJECTIVES,
          severity: AlertSeverity.WARNING,
          ...base,
          issueDescription: `Only ${school.objectivesCoveredPercent}% of planned objectives are covered, below the ${METRICS_ALERT_THRESHOLDS.objectivesCoveredPercentBelow}% programme target.`,
          actionNeeded:
            'Confirm which modules remain undelivered and agree a catch-up plan for the affected classes.',
          observedValue: school.objectivesCoveredPercent,
          thresholdValue: METRICS_ALERT_THRESHOLDS.objectivesCoveredPercentBelow,
          unit: '%',
          gapPoints: round(
            school.objectivesCoveredPercent - METRICS_ALERT_THRESHOLDS.objectivesCoveredPercentBelow,
            2
          ),
        });
      }
    }

    // 5. Programme-level speaking lag. Speaking is the domain the NGO flags most
    // often, so it is checked across the whole scope rather than per school.
    if (speaking !== undefined && speaking.currentStudents > 0 && learning.overallProgress.current > 0) {
      const lag = round(learning.overallProgress.current - speaking.current, 2);
      if (lag >= METRICS_ALERT_THRESHOLDS.domainLagPoints) {
        alerts.push({
          id: 'speaking-programme',
          title: 'Speaking practice (all schools)',
          subtitle: `${lag} points behind the programme average`,
          category: NeedsAttentionCategory.SPEAKING_PRACTICE,
          severity: AlertSeverity.WARNING,
          schoolId: null,
          schoolName: 'All schools',
          classSectionId: null,
          className: null,
          issueDescription: `Speaking attainment is ${speaking.current}% against a programme average of ${learning.overallProgress.current}%, a gap of ${lag} points. Speaking is the weakest of the four core skills.`,
          actionNeeded:
            'Schedule additional speaking practice slots and review oral-assessment coverage for the affected classes.',
          observedValue: speaking.current,
          thresholdValue: round(
            learning.overallProgress.current - METRICS_ALERT_THRESHOLDS.domainLagPoints,
            2
          ),
          unit: '%',
          gapPoints: lag,
        });
      }
    }

    // Most severe first, then largest shortfall, then stable by id.
    const severityRank: Record<AlertSeverity, number> = {
      [AlertSeverity.CRITICAL]: 0,
      [AlertSeverity.WARNING]: 1,
      [AlertSeverity.INFO]: 2,
    };
    alerts.sort(
      (a, b) =>
        severityRank[a.severity] - severityRank[b.severity] ||
        (a.gapPoints ?? 0) - (b.gapPoints ?? 0) ||
        a.id.localeCompare(b.id)
    );

    const truncated = Math.max(0, alerts.length - METRICS_MAX_ALERTS);
    const limited = alerts.slice(0, METRICS_MAX_ALERTS);

    logger.info('[MetricsService.getNeedsAttention] Alerts generated', {
      generated: alerts.length,
      returned: limited.length,
      truncated,
      durationMs: Date.now() - startTime,
    });

    return {
      alerts: limited,
      totalAlerts: alerts.length,
      bySeverity: {
        critical: alerts.filter((a) => a.severity === AlertSeverity.CRITICAL).length,
        warning: alerts.filter((a) => a.severity === AlertSeverity.WARNING).length,
        info: alerts.filter((a) => a.severity === AlertSeverity.INFO).length,
      },
      truncatedCount: truncated,
    };
  }

  /** Learning progress and outcomes (Aspect 2). */
  public async getLearningOutcomes(query: MetricsFilterQuery): Promise<LearningProgressDTO> {
    const window = this.resolveWindow(query);
    const filters = this.buildFilters(query, window);
    const domainRows = await this.metricsRepo.fetchDomainStageRows(filters);
    return this.domainCalc.buildLearningProgress(domainRows);
  }

  /** The five headline KPI cards (Aspect 1). */
  public async getKpiSummary(query: MetricsFilterQuery): Promise<KpiSummaryResponseDTO> {
    const startTime = Date.now();
    const window = this.resolveWindow(query);
    const filters = this.buildFilters(query, window);
    const previousFilters: ScopeFilters = {
      ...filters,
      fromDate: window.previousFrom,
      toDate: window.previousTo,
    };

    const [scope, currentAttendanceRows, previousAttendanceRows, activities, previousActivities, domainRows] =
      await Promise.all([
        this.metricsRepo.fetchScope(filters),
        this.metricsRepo.fetchAttendanceRows(filters),
        this.metricsRepo.fetchAttendanceRows(previousFilters),
        this.metricsRepo.fetchEngagementActivities(filters),
        this.metricsRepo.fetchEngagementActivities(previousFilters),
        this.metricsRepo.fetchDomainStageRows(filters),
      ]);

    const enrolledStudents = scope.reduce((acc, r) => acc + r.enrolledStudents, 0);
    const schoolsCount = new Set(scope.map((r) => r.schoolId)).size;
    const classesCount = new Set(
      scope.filter((r) => r.classSectionId !== null).map((r) => r.classSectionId)
    ).size;

    const countsByStatus = await this.metricsRepo.countStudentsByStatus(filters);

    // "vs last year": the same scope one academic year earlier. Using the equal
    // -length preceding window keeps this comparable for custom from/to ranges.
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    const lastYearFilters: ScopeFilters = {
      ...filters,
      fromDate: new Date(window.from.getTime() - yearMs),
      toDate: new Date(window.to.getTime() - yearMs),
    };
    const previousYearStudents = await this.metricsRepo.countEnrolledStudents(lastYearFilters);

    const currentAttendance = aggregateAttendance(currentAttendanceRows);
    const previousAttendance = aggregateAttendance(previousAttendanceRows);

    const learning = this.domainCalc.buildLearningProgress(domainRows);
    const previousActive = distinctCount(
      previousActivities
        .filter((a) => a.activityType === 'AI_IVRS' || a.activityType === 'PRACTICE')
        .map((a) => a.studentId)
    );

    const objectives = await this.getTeachingObjectives(query);

    const studentsEnrolled = this.kpiCalc.buildStudentsEnrolled({
      countsByStatus,
      enrolledStudents,
      previousYearStudents,
      schoolsCount,
      classesCount,
    });
    const attendanceRate = this.kpiCalc.buildAttendanceRate({ current: currentAttendance, previous: previousAttendance });
    const averageLearningGain = this.kpiCalc.buildLearningGain({
      baselinePercent: learning.overallProgress.baseline,
      currentPercent: learning.overallProgress.current,
      studentsWithBoth: learning.studentsAssessed,
      domainProgress: learning.domainProgress,
      previousGainPoints: null,
    });
    const objectivesCovered = this.kpiCalc.buildObjectivesCovered({
      objectiveProgress: objectives.objectiveProgress,
      coveragePercent: objectives.overallCoveragePercent,
      previousCompletionPercent: null,
    });
    const activeStudents = this.kpiCalc.buildActiveStudents({
      activities,
      enrolledStudents,
      previousActiveStudents: previousActive,
    });

    logger.info('[MetricsService.getKpiSummary] KPI summary built', {
      schoolId: query.schoolId ?? 'ALL',
      durationMs: Date.now() - startTime,
    });

    return {
      filter: this.buildFilterEcho(query, window),
      studentsEnrolled,
      attendanceRate,
      averageLearningGain,
      objectivesCovered,
      activeStudents,
      kpiMetrics: this.kpiCalc.buildKpiRibbon(
        studentsEnrolled,
        attendanceRate,
        averageLearningGain,
        objectivesCovered,
        activeStudents
      ),
    };
  }

  /**
   * The three derived metrics, computed across the whole scope.
   *
   * - Risk Level Score: weighted composite, 0-100, higher is healthier.
   * - Class Equity Score: 100 minus the Gini of the per-class attainment spread.
   * - MoM learning-gain delta, with an explicit direction.
   */
  private async buildDerivedInsights(
    filters: ScopeFilters,
    learning: LearningProgressDTO,
    schoolRows: InternalSchoolRow[],
    enrolledStudents: number
  ): Promise<DerivedInsightsDTO> {
    const domainRows = await this.metricsRepo.fetchDomainStageRows(filters);
    const classProgress = this.domainCalc.buildClassProgress(domainRows);

    // Programme-level risk, from the same components the per-school score uses.
    const overallAttendance = average(
      schoolRows.map((r) => r.dto.attendancePercent)
    );
    const overallObjectives = average(
      schoolRows.map((r) => r.dto.objectivesCoveredPercent)
    );
    const overallGain = learning.overallProgress.increase;
    const dataCompletenessPercent = percentage(learning.studentsAssessed, enrolledStudents);

    const overallRiskScore = calculateRiskScore({
      attendancePercent: overallAttendance,
      objectivesCoveredPercent: overallObjectives,
      learningGainPoints: overallGain,
      dataCompletenessPercent,
    });

    // --- Class Equity Score ---
    const classValues = [...classProgress.values()];
    const classEquityScore = calculateEquityScore(classValues);

    // Outliers: the classes furthest from the programme mean, worst first.
    const programmeMean = average(classValues);
    const nameByClass = new Map<number, { className: string; schoolName: string }>();
    const scope = await this.metricsRepo.fetchScope(filters);
    for (const row of scope) {
      if (row.classSectionId !== null) {
        nameByClass.set(row.classSectionId, {
          className: row.className ?? '',
          schoolName: row.schoolName,
        });
      }
    }

    const equityOutliers = [...classProgress.entries()]
      .map(([classId, value]) => ({
        classId,
        className: nameByClass.get(classId)?.className ?? `Class ${classId}`,
        schoolName: nameByClass.get(classId)?.schoolName ?? '',
        classProgressPercent: value,
        gapPoints: round(value - programmeMean, 2),
      }))
      .sort((a, b) => a.gapPoints - b.gapPoints)
      .slice(0, 5);

    // --- MoM learning gain ---
    const previousDomainRows = await this.metricsRepo.fetchDomainStageRows({
      ...filters,
      fromDate: new Date(filters.fromDate!.getTime() - 30 * 24 * 60 * 60 * 1000),
      toDate: filters.fromDate,
    });
    const previousLearning = this.domainCalc.buildLearningProgress(previousDomainRows);
    const gainDelta = pointDelta(overallGain, previousLearning.overallProgress.increase);

    return {
      overallRiskScore,
      overallRiskBand: riskBand(overallRiskScore),
      classEquityScore,
      equityOutliers,
      learningGainMomDeltaPoints: gainDelta.value,
      learningGainMomDirection: gainDelta.direction,
      dataCompletenessPercent,
    };
  }

  /**
   * Unified payload for `GET /metrics/dashboard`.
   *
   * All seven aspects are assembled from ONE resolved window and ONE set of
   * fetches per aspect, so a client never sees a dashboard whose cards disagree
   * with each other.
   */
  public async getDashboardSummary(
    query: MetricsFilterQuery
  ): Promise<DashboardSummaryResponseDTO> {
    const startTime = Date.now();
    const window = this.resolveWindow(query);
    const filters = this.buildFilters(query, window);

    const [kpis, learningOutcomes, schoolPerf, needsAttention, teachingObjectives, engagement, resources] =
      await Promise.all([
        this.getKpiSummary(query),
        this.getLearningOutcomes(query),
        this.getSchoolPerformance(query),
        this.getNeedsAttention(query),
        this.getTeachingObjectives(query),
        this.getEngagementMetrics(query),
        this.getResourceFinance(query),
      ]);

    const enrolledStudents = engagement.classParticipation.enrolledStudents;
    const { rows } = await this.buildSchoolRows(filters);
    const derivedInsights = await this.buildDerivedInsights(
      filters,
      learningOutcomes,
      rows,
      enrolledStudents
    );

    logger.info('[MetricsService.getDashboardSummary] Dashboard assembled', {
      schoolId: query.schoolId ?? 'ALL',
      classId: query.classId ?? 'ALL',
      from: toIsoDateString(window.from),
      to: toIsoDateString(window.to),
      durationMs: Date.now() - startTime,
    });

    return {
      filter: this.buildFilterEcho(query, window),
      kpiMetrics: kpis.kpiMetrics,
      learningOutcomes,
      schoolPerformance: schoolPerf.schools,
      needsAttention: needsAttention.alerts,
      teachingObjectives,
      engagement,
      resources,
      derivedInsights,
    };
  }
}