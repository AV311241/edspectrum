/**
 * Metrics module - internal domain model / read-model contracts.
 *
 * These are NOT Prisma models. They are the *narrow, purpose-built shapes* the
 * repository returns, so that the service and utility layers never touch a
 * generated Prisma payload directly. That keeps the calculation code free of ORM
 * concerns and makes every calculator trivially unit-testable with plain objects.
 *
 * Field naming follows the existing repository convention: an `…Model` interface
 * for scalar columns and an `…WithModule` style interface for joined data. See
 * `repositories/student.repository.ts`.
 */

import type {
  BudgetCategory,
  EngagementActivityType,
  FinanceEntryType,
  HomeVisitStatus,
  ObjectiveModuleStatus,
  ObjectivePlanStatus,
} from '@prisma/client';
import type { AttendanceStatusValue } from '../../constants/attendance.constants';

// VERIFICATION NEEDED: Verify schema definition against existing DB models.
// Mirrors Prisma model `ProgramBudget` (`program_budgets`). The nullable
// `schoolId` is meaningful data, not an omission: NULL means the NGO-wide
// consolidated budget rather than a per-school allocation.
export interface ProgramBudgetModel {
  id: number;
  schoolId: number | null;
  academicYear: string;
  totalAmount: number;
  currency: string;
  approvedOn: Date | null;
  createdAt: Date;
}

// VERIFICATION NEEDED: Verify schema definition against existing DB models.
// Mirrors Prisma model `BudgetAllocation` (`budget_allocations`), the sanctioned
// category split of a ProgramBudget.
export interface BudgetAllocationModel {
  id: number;
  programBudgetId: number;
  category: BudgetCategory;
  allocatedAmount: number;
}

// VERIFICATION NEEDED: Verify schema definition against existing DB models.
// Mirrors Prisma model `FinanceRecord` (`finance_records`), the append-only
// ledger from which budget, spend, balance, category split and the monthly trend
// are all derived.
export interface FinanceRecordModel {
  id: number;
  schoolId: number | null;
  academicYear: string;
  entryType: FinanceEntryType;
  category: BudgetCategory;
  amount: number;
  spentOn: Date;
}

// VERIFICATION NEEDED: Verify schema definition against existing DB models.
// Mirrors Prisma model `TeachingModule` (`teaching_modules`), the M01..M10
// catalogue that defines the column order of the coverage matrix.
export interface TeachingModuleModel {
  id: number;
  code: string;
  name: string;
  sequenceNumber: number;
}

// VERIFICATION NEEDED: Verify schema definition against existing DB models.
// Mirrors Prisma model `ProgramObjective` (`program_objectives`). This is the
// source for the objective *overview* tiles; per-class delivery lives in
// `ObjectiveCoverageModel`.
export interface ProgramObjectiveModel {
  id: number;
  moduleId: number;
  schoolId: number | null;
  classSectionId: number | null;
  status: ObjectivePlanStatus;
  academicYear: string;
  targetMonth: number | null;
  completedAt: Date | null;
}

// VERIFICATION NEEDED: Verify schema definition against existing DB models.
// Mirrors Prisma model `ObjectiveCoverage` (`objective_coverages`) - one cell of
// the class x module matrix. An absent row means NOT_STARTED, never "0% covered".
export interface ObjectiveCoverageModel {
  id: number;
  classSectionId: number;
  moduleId: number;
  schoolId: number | null;
  status: ObjectiveModuleStatus;
  completionPercent: number | null;
  academicYear: string;
}

/** Coverage cell joined to its module, so the matrix can be keyed by module code. */
export interface ObjectiveCoverageWithModule extends ObjectiveCoverageModel {
  module: TeachingModuleModel;
}

// VERIFICATION NEEDED: Verify schema definition against existing DB models.
// Mirrors Prisma model `StudentEngagementActivity`
// (`student_engagement_activities`), the activity log behind the class
// participation rate and the AI/IVRS + practice active-students rate.
export interface EngagementActivityModel {
  id: number;
  studentId: number;
  classSectionId: number | null;
  schoolId: number | null;
  activityType: EngagementActivityType;
  activityDate: Date;
  completed: boolean;
}

// VERIFICATION NEEDED: Verify schema definition against existing DB models.
// Mirrors Prisma model `ParentEngagement` (`parent_engagements`). One row is one
// reached parent/guardian; `studentId` is nullable so a whole-school meeting does
// not require fabricating one row per student.
export interface ParentEngagementModel {
  id: number;
  schoolId: number | null;
  classSectionId: number | null;
  studentId: number | null;
  engagedOn: Date;
}

// VERIFICATION NEEDED: Verify schema definition against existing DB models.
// Mirrors Prisma model `HomeVisit` (`home_visits`). Only `COMPLETED` rows count
// toward the dashboard figure, and `studentsReached` is stored rather than derived
// so a visit that reached several siblings is not double counted.
export interface HomeVisitModel {
  id: number;
  schoolId: number | null;
  classSectionId: number | null;
  visitDate: Date;
  status: HomeVisitStatus;
  studentsReached: number;
}

/** A school/class pair plus the roll-up numbers every calculator needs. */
export interface ScopeRowModel {
  schoolId: number;
  schoolCode: string;
  schoolName: string;
  classSectionId: number | null;
  className: string | null;
  enrolledStudents: number;
}

/**
 * One assessed domain result, flattened for the domain calculators.
 *
 * `stage` is the *effective* stage: `finalStage` when a teacher has overridden the
 * engine's suggestion, otherwise `suggestedStage`. This mirrors how the existing
 * baseline service treats the two columns, so the dashboard cannot disagree with
 * the class summary about what stage a student is on.
 */
export interface DomainStageRow {
  studentId: number;
  schoolId: number;
  classSectionId: number;
  domainId: number;
  domainName: string;
  stage: string | null;
  assessmentDate: Date;
}

/** Attendance rows flattened for the attendance calculators. */
export interface AttendanceRow {
  classSectionId: number;
  studentId: number | null;
  sessionDate: Date;
  status: AttendanceStatusValue;
}
