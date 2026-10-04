/**
 * Dashboard KPI snapshot constants.
 *
 * The snapshot table (`dashboard_kpi_snapshots`) is a *long-format* read model:
 * every dashboard figure is one row, identified by the tuple
 * (academicYear, metricCode, schoolId, classSectionId, dimKey).
 *
 * The codes are declared as an enum here, in one place, because they are shared
 * by three layers that must agree exactly - the refresh SQL that writes them, the
 * read service that queries them, and the API contract that returns them. A typo
 * in any one of them would otherwise surface only as a silently missing tile on
 * the dashboard rather than as a compile error.
 */

/**
 * Every metric code the refresh can emit.
 *
 * Naming convention: `SCOPE_THING` in upper snake case, matching the existing
 * `AttendanceStatusValue` / `MetricsStageCode` vocabulary style.
 */
export enum DashboardKpiMetric {
  /** Total sanctioned budget for the academic year. */
  FIN_BUDGET = 'FIN_BUDGET',
  /** Total actual outflow for the academic year. */
  FIN_SPENT = 'FIN_SPENT',
  /** `FIN_BUDGET - FIN_SPENT`. May legitimately be negative. */
  FIN_BALANCE = 'FIN_BALANCE',
  /** Spend within one `BudgetCategory`; `dimKey` holds the category. */
  FIN_CATEGORY_SPEND = 'FIN_CATEGORY_SPEND',

  /** Objective count by plan status; `dimKey` holds the `ObjectivePlanStatus`. */
  OBJ_STATUS = 'OBJ_STATUS',
  /** One cell of the class x module matrix; `dimKey` holds the module code. */
  OBJ_COVERAGE = 'OBJ_COVERAGE',

  /** Distinct students with a `CLASS_PARTICIPATION` activity; denominator = active students. */
  ENG_CLASS_PARTICIPATION = 'ENG_CLASS_PARTICIPATION',
  /** Distinct students with an `AI_IVRS` or `PRACTICE` activity; denominator = active students. */
  ENG_AI_PRACTICE = 'ENG_AI_PRACTICE',

  /** Visit count by `HomeVisitStatus`; `dimKey` holds the status. */
  HOME_VISITS = 'HOME_VISITS',
  /** Sum of `students_reached` over COMPLETED visits. */
  HOME_VISIT_STUDENTS_REACHED = 'HOME_VISIT_STUDENTS_REACHED',

  /** Parent engagements by `ParentEngagementChannel`; `dimKey` holds the channel. */
  PARENT_ENGAGEMENT = 'PARENT_ENGAGEMENT',
  /** Interaction register entries by free-text status; `dimKey` holds the status. */
  PARENT_INTERACTIONS = 'PARENT_INTERACTIONS',
}

/**
 * Sentinel used for `school_id = 0`: the NGO-wide consolidated total.
 *
 * A real school primary key can never be 0 (it starts at 1), so the sentinel is
 * unambiguous. It exists because `finance_records`, `home_visits` and friends all
 * use a *nullable* `school_id` where NULL means NGO-wide, and MySQL treats NULLs
 * as distinct inside a unique index - which would break the composite primary key
 * of the snapshot table and let the upsert insert duplicate rows.
 */
export const KPI_SCHOOL_NGO_WIDE = 0;

/** Sentinel for "not dimensioned by class" in `class_section_id`. */
export const KPI_CLASS_NOT_DIMENSIONED = 0;

/** Sentinel for "not dimensioned" in `dim_key`. */
export const KPI_DIM_NOT_DIMENSIONED = '';

/**
 * `dim_key` substituted for a NULL `parent_interactions.status`.
 *
 * The register's `status` column is free text and nullable, but the snapshot
 * primary key cannot hold NULL. `UNKNOWN` keeps those rows visible on the
 * dashboard instead of silently dropping unlabelled interactions.
 */
export const KPI_PARENT_INTERACTION_UNKNOWN = 'UNKNOWN';

/**
 * The six budget categories, in the order the dashboard renders them.
 *
 * Re-declared as an ordered tuple (rather than reusing the `BudgetCategory`
 * Prisma enum) because the refresh cross-joins this list to guarantee a row for
 * every category even when a category has no spend - without it a category that
 * happened to be unspent would be absent from the chart rather than shown at 0.
 *
 * The literal values match the `BudgetCategory` enum in `prisma/schema.prisma`
 * exactly, because they are compared against `finance_records.category`.
 */
export const KPI_BUDGET_CATEGORIES = [
  'HUMAN_RESOURCES',
  'TRAVEL',
  'TEACHING_MATERIALS',
  'TECHNOLOGY',
  'EVENTS',
  'OTHERS',
] as const;

export type KpiBudgetCategory = (typeof KPI_BUDGET_CATEGORIES)[number];

/**
 * Default rolling window, in days, for the engagement rates.
 *
 * `student_engagement_activities` carries no academic-year column, so engagement
 * cannot be scoped to `@ay` the way finance can. It is measured over a rolling
 * window instead - the same trade-off the live `MetricsService` makes.
 */
export const KPI_DEFAULT_ENGAGEMENT_WINDOW_DAYS = 30;

/**
 * Academic-year date bounds.
 *
 * The snapshot table is keyed by academic year, but `home_visits` and
 * `parent_interactions` are date-only tables with no academic-year column. They
 * are bounded by these explicit start/end dates instead. Defaults describe a
 * 1 April - 31 March Indian academic year.
 */
export const KPI_ACADEMIC_YEAR_DEFAULT_START = '2026-04-01';
export const KPI_ACADEMIC_YEAR_DEFAULT_END = '2027-03-31';

/**
 * The two daily refresh slots. `batch_slot` records which one produced the row so
 * a client can tell a 06:00 snapshot from an 18:00 one.
 */
export const KPI_BATCH_SLOT_MORNING = 1;
export const KPI_BATCH_SLOT_EVENING = 2;

/** Hour boundary separating the two slots. Before this hour = slot 1. */
export const KPI_BATCH_SLOT_BOUNDARY_HOUR = 12;

/**
 * Derive the batch slot from a timestamp.
 *
 * Exported as a pure function (rather than inlined `HOUR()` SQL) so the rule is
 * unit-testable and so the service and any scheduler agree on the mapping.
 */
export function resolveBatchSlot(at: Date): number {
  return at.getHours() < KPI_BATCH_SLOT_BOUNDARY_HOUR
    ? KPI_BATCH_SLOT_MORNING
    : KPI_BATCH_SLOT_EVENING;
}