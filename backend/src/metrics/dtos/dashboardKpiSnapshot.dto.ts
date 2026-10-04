/**
 * Transport contracts for the pre-aggregated dashboard KPI snapshot.
 *
 * These live in `dtos/` (rather than beside the repository) because tsoa
 * resolves every controller return type into the OpenAPI spec by name. tsoa
 * requires each model NAME to be globally unique, so the shapes are deliberately
 * suffixed `...SnapshotDTO` - `CategorySpendDTO`, for example, is already taken
 * by `resourceFinance.dto.ts` for the live `MetricsService` response, and a
 * second type of that name makes `tsoa spec-and-routes` fail outright.
 *
 * The suffix also documents intent at the call site: a `...SnapshotDTO` value
 * came from the pre-computed table and may be up to one refresh old, whereas the
 * unsuffixed shapes in `resourceFinance.dto.ts` are computed live.
 */

/** Finance tiles from the snapshot. */
export interface FinanceSnapshotDTO {
  totalBudget: number;
  totalSpent: number;
  balance: number;
  /** Share of the budget consumed, 0-100. `null` when budget is zero. */
  utilizationPercent: number | null;
  lastRefreshed: string | null;
}

/** One category-spend row from the snapshot, already percentage-computed. */
export interface CategorySpendSnapshotDTO {
  category: string;
  categoryLabel: string;
  spent: number;
  spendPercent: number | null;
}

/** Objective overview tiles. Every field is zero-filled rather than absent. */
export interface ObjectiveStatusSnapshotDTO {
  planned: number;
  completed: number;
  inProgress: number;
  upcoming: number;
  total: number;
}

/** One cell of the class x module coverage matrix. */
export interface CoverageCellDTO {
  classSectionId: number;
  className: string;
  moduleCode: string;
  moduleName: string;
  sequenceNumber: number;
  status: string;
  completionPercent: number;
}

/** One engagement rate row. */
export interface EngagementRateSnapshotDTO {
  metricCode: string;
  engagedStudents: number;
  activeStudents: number;
  ratePercent: number | null;
}

/** Home visit tiles. */
export interface HomeVisitSnapshotDTO {
  visitsCompleted: number;
  visitsScheduled: number;
  visitsCancelled: number;
  studentsReached: number;
}

/** A labelled count row, used by both parent breakdowns. */
export interface DimensionCountDTO {
  dimKey: string;
  dimLabel: string | null;
  count: number;
}

/** Snapshot freshness. */
export interface SnapshotFreshnessDTO {
  lastRefreshed: string | null;
  lastBatchSlot: number | null;
  /** Number of KPI rows held for the academic year. */
  rowCount: number;
}

/**
 * Result of one refresh run, returned by `POST /metrics/kpi-snapshot/refresh`.
 *
 * `deleted` is the count of rows removed because the source no longer produces
 * them (a deleted coverage cell, a channel with no engagement). A non-zero value
 * on a routine run is normal, not an error.
 */
export interface DashboardKpiRefreshResultDTO {
  academicYear: string;
  /** 1 = morning refresh, 2 = evening refresh. */
  batchSlot: number;
  computedAt: string;
  upserted: number;
  deleted: number;
}

/** Everything the dashboard needs for one academic year + school scope. */
export interface DashboardSnapshotDTO {
  academicYear: string;
  /** `0` means the NGO-wide roll-up. */
  schoolId: number;
  finance: FinanceSnapshotDTO;
  categorySpend: CategorySpendSnapshotDTO[];
  objectives: ObjectiveStatusSnapshotDTO;
  coverage: CoverageCellDTO[];
  engagement: EngagementRateSnapshotDTO[];
  homeVisits: HomeVisitSnapshotDTO;
  parentEngagement: DimensionCountDTO[];
  parentInteractions: DimensionCountDTO[];
  freshness: SnapshotFreshnessDTO;
}

/** Query parameters shared by every read endpoint. */
export interface DashboardSnapshotQuery {
  academicYear?: string;
  schoolId?: number;
}

/** Body of the manual refresh trigger. */
export interface DashboardSnapshotRefreshBody {
  academicYear: string;
  academicYearStart?: string;
  academicYearEnd?: string;
  engagementWindowDays?: number;
}