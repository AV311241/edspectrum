import { provide } from 'inversify-binding-decorators';
import { prisma } from '../../config/db.config';
import {
  DashboardKpiMetric,
  KPI_ACADEMIC_YEAR_DEFAULT_END,
  KPI_ACADEMIC_YEAR_DEFAULT_START,
  KPI_BUDGET_CATEGORIES,
  KPI_CLASS_NOT_DIMENSIONED,
  KPI_DEFAULT_ENGAGEMENT_WINDOW_DAYS,
  KPI_DIM_NOT_DIMENSIONED,
  KPI_PARENT_INTERACTION_UNKNOWN,
  KPI_SCHOOL_NGO_WIDE,
  resolveBatchSlot,
} from '../constants/dashboardKpi.constants';

/** Inputs for one refresh run. */
export interface DashboardKpiRefreshOptions {
  /** Academic year key, e.g. "2026-2027". */
  academicYear: string;
  /** Inclusive period start for the date-only tables. Defaults to 1 April. */
  academicYearStart?: string;
  /** Inclusive period end for the date-only tables. Defaults to 31 March. */
  academicYearEnd?: string;
  /** Rolling engagement window in days. */
  engagementWindowDays?: number;
  /**
   * Refresh timestamp. Injectable so a run is reproducible and so `computed_at`
   * is stable across every row written by the same run.
   */
  now?: Date;
}

export interface DashboardKpiRefreshResult {
  academicYear: string;
  batchSlot: number;
  computedAt: Date;
  /** Rows inserted or updated by the upsert. */
  upserted: number;
  /** Stale rows deleted (KPIs that no longer exist in the source data). */
  deleted: number;
}

export interface IDashboardKpiRepository {
  refresh(options: DashboardKpiRefreshOptions): Promise<DashboardKpiRefreshResult>;
}

/**
 * The single-statement refresh that populates `dashboard_kpi_snapshots`.
 *
 * ## Why raw SQL instead of Prisma
 *
 * The point of this table is to collapse a multi-table aggregate into one cheap
 * read. Expressing that as N separate Prisma writes would mean N round trips per
 * refresh, and would make the stale-row cleanup impossible to express - Prisma
 * has no notion of "delete everything this statement did not touch". One
 * `INSERT ... SELECT ... ON DUPLICATE KEY UPDATE` does both halves.
 *
 * ## Why the session variables are safe here
 *
 * `refresh()` runs on a Prisma *interactive* transaction, which pins a single
 * connection. The SQL relies on session variables (`@ay`, `@now`, ...) to avoid
 * repeating a placeholder across all 12 UNION branches. Session variables are
 * per-connection, so they are only correct when every statement in the batch
 * runs on the same connection - which the interactive transaction guarantees.
 *
 * ## Schema assumptions worth stating out loud
 *
 * - `school_id = 0` is the NGO-wide roll-up. A NULL `school_id` in a source table
 *   counts ONLY into that roll-up, never into a per-school row. This mirrors
 *   `MetricsRepository.fetchFinanceRecords`, which treats a NULL `schoolId` as
 *   NGO-wide when a single school is selected.
 * - `parent_interactions` has no school key at all, so `PARENT_INTERACTIONS` is
 *   emitted at `school_id = 0` only.
 * - The active-student denominator comes from `student_class_enrollments`
 *   (`is_current = 1`), not from `students`, matching
 *   `MetricsRepository.countEnrolledStudents`. Counting student rows instead
 *   would silently include students whose enrollment has already ended.
 */
@provide(DashboardKpiRepository)
export class DashboardKpiRepository implements IDashboardKpiRepository {
  /**
   * Build the refresh statement.
   *
   * Split into a pure builder so the SQL can be reviewed and tested without a
   * live database connection. Public for that reason - `scripts/print-refresh-sql.ts`
   * prints the exact statement without connecting to anything.
   *
   * NOTE ON `ON DUPLICATE KEY UPDATE`: `VALUES()` is used for the
   * branch-independent column references. It is formally deprecated as of MySQL
   * 8.0.20 but remains supported on MySQL 8.x and HeatWave; it is kept because
   * the row-alias form (`AS new`) is not accepted by every 8.0 minor release.
   */
  public buildRefreshSql(windowDays: number): string {
    // `dim_key` literal for a KPI that is not dimensioned. This must be a SQL
    // string literal (a quoted empty string), not a bare JS value - rendering it
    // unquoted would emit `[]` and break the statement.
    const notDim = `'${KPI_DIM_NOT_DIMENSIONED}'`;
    const classDim = KPI_CLASS_NOT_DIMENSIONED;
    const ngo = KPI_SCHOOL_NGO_WIDE;
    // Session-variable names, repeated across every UNION branch so the literal
    // can never drift from the SET that binds it.
    const ay = '@ay';
    const slot = '@slot';
    const ts = '@now';
    const labels = notDim;

    const categoriesCte = KPI_BUDGET_CATEGORIES.map((c) => `  SELECT '${c}' AS c`).join('\n  UNION ALL\n');

    // `windowDays` is interpolated rather than read from a session variable
    // because MySQL does not reliably evaluate a user variable inside an
    // INTERVAL expression. The value is validated as a positive integer by the
    // zod schema / CLI parser before it ever reaches here, so inlining it cannot
    // introduce SQL injection.
    const window = Number.isInteger(windowDays) && windowDays > 0 ? windowDays : null;
    if (window === null) {
      throw new Error(`engagementWindowDays must be a positive integer, received ${windowDays}`);
    }

    return `
INSERT INTO dashboard_kpi_snapshots
  (academic_year, metric_code, school_id, class_section_id, dim_key, dim_label, value_num, denominator_num, batch_slot, computed_at)
WITH
/* One row per scope level. Joined against a source table it duplicates every
   source row into exactly the two scopes it belongs to: its own school (lvl 0)
   and the NGO-wide roll-up (lvl 1). Both fall out of a single pass, so the
   source tables are not scanned twice. */
scope_levels AS (
  SELECT 0 AS lvl UNION ALL SELECT 1
),
/* Every budget category, so a category with no spend still yields a row at 0
   rather than vanishing from the chart. Cross-joined, hence the literal list;
   the values match the BudgetCategory enum exactly. */
categories AS (
${categoriesCte}
),
/* Budget / spent / balance, per school and NGO-wide. */
fin AS (
  SELECT IF(sc.lvl = 1, ${ngo}, f.school_id) AS school_id,
         SUM(CASE WHEN f.entry_type = 'BUDGET'  THEN f.amount ELSE 0 END) AS budget,
         SUM(CASE WHEN f.entry_type = 'EXPENSE' THEN f.amount ELSE 0 END) AS spent
  FROM finance_records f
  JOIN scope_levels sc ON sc.lvl = 1 OR f.school_id IS NOT NULL
  WHERE f.academic_year = ${ay}
  GROUP BY IF(sc.lvl = 1, ${ngo}, f.school_id)
),
/* Spend per category, per school and NGO-wide. */
fin_cat AS (
  SELECT IF(sc.lvl = 1, ${ngo}, f.school_id) AS school_id,
         f.category AS dim_key,
         SUM(f.amount) AS spent
  FROM finance_records f
  JOIN scope_levels sc ON sc.lvl = 1 OR f.school_id IS NOT NULL
  WHERE f.academic_year = ${ay} AND f.entry_type = 'EXPENSE'
  GROUP BY IF(sc.lvl = 1, ${ngo}, f.school_id), f.category
),
/* Objective plan-status counts. */
obj AS (
  SELECT IF(sc.lvl = 1, ${ngo}, p.school_id) AS school_id,
         p.status AS dim_key,
         COUNT(*) AS n
  FROM program_objectives p
  JOIN scope_levels sc ON sc.lvl = 1 OR p.school_id IS NOT NULL
  WHERE p.academic_year = ${ay}
  GROUP BY IF(sc.lvl = 1, ${ngo}, p.school_id), p.status
),
/* Active-student denominator, per school and NGO-wide.
   COUNT(DISTINCT student_id) rather than COUNT(*): a student holding a current
   enrollment in more than one class section must still be counted once. */
stu AS (
  SELECT IF(sc.lvl = 1, ${ngo}, s.school_id) AS school_id,
         COUNT(DISTINCT e.student_id) AS total
  FROM student_class_enrollments e
  JOIN students s ON s.id = e.student_id AND s.status = 'ACTIVE'
  CROSS JOIN scope_levels sc
  WHERE e.is_current = 1
  GROUP BY IF(sc.lvl = 1, ${ngo}, s.school_id)
),
/* Distinct engaged students over the rolling window.
   school_id comes from the STUDENT, not from the activity row: the activity
   table's own school_id is nullable and would otherwise drop a student from
   every scope. */
eng AS (
  SELECT IF(sc.lvl = 1, ${ngo}, s.school_id) AS school_id,
         COUNT(DISTINCT CASE WHEN a.activity_type = 'CLASS_PARTICIPATION' THEN a.student_id END) AS cp,
         COUNT(DISTINCT CASE WHEN a.activity_type IN ('AI_IVRS','PRACTICE') THEN a.student_id END) AS ap
  FROM student_engagement_activities a
  JOIN students s ON s.id = a.student_id AND s.status = 'ACTIVE'
  CROSS JOIN scope_levels sc
  WHERE a.completed = 1
    AND a.activity_date >= DATE_SUB(CURDATE(), INTERVAL ${window} DAY)
  GROUP BY IF(sc.lvl = 1, ${ngo}, s.school_id)
),
/* Home visits by status, plus students reached. */
hv AS (
  SELECT IF(sc.lvl = 1, ${ngo}, h.school_id) AS school_id,
         h.status AS dim_key,
         COUNT(*) AS n,
         SUM(h.students_reached) AS reached
  FROM home_visits h
  JOIN scope_levels sc ON sc.lvl = 1 OR h.school_id IS NOT NULL
  WHERE h.visit_date BETWEEN @ay_start AND @ay_end
  GROUP BY IF(sc.lvl = 1, ${ngo}, h.school_id), h.status
),
/* Parent engagements by channel. */
pe AS (
  SELECT IF(sc.lvl = 1, ${ngo}, p.school_id) AS school_id,
         p.channel AS dim_key,
         COUNT(*) AS n
  FROM parent_engagements p
  JOIN scope_levels sc ON sc.lvl = 1 OR p.school_id IS NOT NULL
  WHERE p.engaged_on BETWEEN @ay_start AND @ay_end
  GROUP BY IF(sc.lvl = 1, ${ngo}, p.school_id), p.channel
)
SELECT ${ay}, '${DashboardKpiMetric.FIN_BUDGET}', school_id, ${classDim}, ${labels}, NULL, budget, NULL, ${slot}, ${ts} FROM fin
UNION ALL
SELECT ${ay}, '${DashboardKpiMetric.FIN_SPENT}', school_id, ${classDim}, ${labels}, NULL, spent, NULL, ${slot}, ${ts} FROM fin
UNION ALL
SELECT ${ay}, '${DashboardKpiMetric.FIN_BALANCE}', school_id, ${classDim}, ${labels}, NULL, budget - spent, NULL, ${slot}, ${ts} FROM fin
UNION ALL
/* denominator_num carries the school total spend so a consumer can render the
   category percentage without a second query. */
SELECT ${ay}, '${DashboardKpiMetric.FIN_CATEGORY_SPEND}', fin.school_id, ${classDim}, cat.c, NULL,
       COALESCE(fc.spent, 0), fin.spent, ${slot}, ${ts}
FROM fin CROSS JOIN categories cat
LEFT JOIN fin_cat fc ON fc.school_id = fin.school_id AND fc.dim_key = cat.c
UNION ALL
SELECT ${ay}, '${DashboardKpiMetric.OBJ_STATUS}', school_id, ${classDim}, dim_key, NULL, n, NULL, ${slot}, ${ts} FROM obj
UNION ALL
/* One row per EXISTING coverage cell. An absent cell is deliberately not
   written: the schema treats a missing row as NOT_STARTED rather than 0%, and
   materialising a 0 here would destroy that distinction. */
SELECT ${ay}, '${DashboardKpiMetric.OBJ_COVERAGE}',
       COALESCE(oc.school_id, cs.school_id), oc.class_section_id, m.code, oc.status,
       COALESCE(oc.completion_percent, CASE WHEN oc.status = 'COVERED' THEN 100 ELSE 0 END), NULL, ${slot}, ${ts}
FROM objective_coverages oc
JOIN teaching_modules m ON m.id = oc.module_id
JOIN class_sections cs ON cs.id = oc.class_section_id
WHERE oc.academic_year = ${ay}
UNION ALL
/* LEFT JOIN driven from stu, NOT from eng: a school with zero engaged students
   must still report 0/N rather than disappearing from the dashboard entirely. */
SELECT ${ay}, '${DashboardKpiMetric.ENG_CLASS_PARTICIPATION}', stu.school_id, ${classDim}, ${labels}, NULL,
       COALESCE(eng.cp, 0), stu.total, ${slot}, ${ts}
FROM stu LEFT JOIN eng ON eng.school_id = stu.school_id
UNION ALL
SELECT ${ay}, '${DashboardKpiMetric.ENG_AI_PRACTICE}', stu.school_id, ${classDim}, ${labels}, NULL,
       COALESCE(eng.ap, 0), stu.total, ${slot}, ${ts}
FROM stu LEFT JOIN eng ON eng.school_id = stu.school_id
UNION ALL
SELECT ${ay}, '${DashboardKpiMetric.HOME_VISITS}', school_id, ${classDim}, dim_key, NULL, n, NULL, ${slot}, ${ts} FROM hv
UNION ALL
/* Students reached counts only COMPLETED visits, matching the schema comment on
   HomeVisit. */
SELECT ${ay}, '${DashboardKpiMetric.HOME_VISIT_STUDENTS_REACHED}', school_id, ${classDim}, ${labels}, NULL,
       COALESCE(reached, 0), NULL, ${slot}, ${ts}
FROM hv WHERE dim_key = 'COMPLETED'
UNION ALL
SELECT ${ay}, '${DashboardKpiMetric.PARENT_ENGAGEMENT}', school_id, ${classDim}, dim_key, NULL, n, NULL, ${slot}, ${ts} FROM pe
UNION ALL
/* NGO-wide only: parent_interactions carries no school column at all, so there
   is no per-school breakdown to emit. */
SELECT ${ay}, '${DashboardKpiMetric.PARENT_INTERACTIONS}', ${ngo}, ${classDim},
       COALESCE(\`status\`, '${KPI_PARENT_INTERACTION_UNKNOWN}'), NULL, COUNT(*), NULL, ${slot}, ${ts}
FROM parent_interactions
WHERE \`date\` BETWEEN @ay_start AND @ay_end
GROUP BY COALESCE(\`status\`, '${KPI_PARENT_INTERACTION_UNKNOWN}')
ON DUPLICATE KEY UPDATE
  dim_label       = VALUES(dim_label),
  value_num       = VALUES(value_num),
  denominator_num = VALUES(denominator_num),
  batch_slot      = VALUES(batch_slot),
  computed_at     = VALUES(computed_at)`;
  }

  /**
   * Recompute every KPI for one academic year, in a single transaction.
   *
   * Three steps, all on one pinned connection:
   *   1. bind the session variables the SQL interpolates,
   *   2. upsert the entire KPI set,
   *   3. delete rows for this academic year that the upsert did NOT rewrite.
   *
   * Step 3 is what keeps the table "latest snapshot only": a coverage cell that
   * was deleted at source, or a channel that no longer has any engagement, would
   * otherwise linger forever as a stale row. Because the delete is scoped to the
   * academic year, refreshing one year never disturbs another year's snapshot.
   *
   * All three steps share the transaction, so a concurrent dashboard read sees
   * either the complete previous state or the complete new state - never a
   * half-refreshed mixture.
   */
  public async refresh(options: DashboardKpiRefreshOptions): Promise<DashboardKpiRefreshResult> {
    const academicYear = options.academicYear;
    const now = options.now ?? new Date();
    const slot = resolveBatchSlot(now);
    const ayStart = options.academicYearStart ?? KPI_ACADEMIC_YEAR_DEFAULT_START;
    const ayEnd = options.academicYearEnd ?? KPI_ACADEMIC_YEAR_DEFAULT_END;
    const windowDays = options.engagementWindowDays ?? KPI_DEFAULT_ENGAGEMENT_WINDOW_DAYS;
    const upsertSql = this.buildRefreshSql(windowDays);

    return await prisma.$transaction(async (tx) => {
      // Session variables MUST be set inside the interactive transaction so they
      // land on the same connection that later runs the upsert.
      await tx.$executeRawUnsafe('SET @ay = ?', academicYear);
      await tx.$executeRawUnsafe('SET @ay_start = ?', ayStart);
      await tx.$executeRawUnsafe('SET @ay_end = ?', ayEnd);
      await tx.$executeRawUnsafe('SET @now = ?', formatSqlDateTime(now));
      await tx.$executeRawUnsafe('SET @slot = ?', slot);

      const upserted = await tx.$executeRawUnsafe(upsertSql);

      // Anything still carrying an older computed_at was not rewritten by this
      // run, so the source no longer produces it. Comparing on the exact same
      // truncated timestamp keeps freshly-written rows out of the delete.
      const deleted = await tx.dashboardKpiSnapshot.deleteMany({
        where: { academicYear, computedAt: { lt: now } },
      });

      return {
        academicYear,
        batchSlot: slot,
        computedAt: now,
        upserted,
        deleted: deleted.count,
      };
    });
  }
}

/**
 * Format a JS Date as a MySQL DATETIME literal, truncated to whole seconds.
 *
 * `computed_at` is `DATETIME(0)`. Truncating here rather than leaving it to the
 * server matters: the stale-row delete compares against `now`, so a value that
 * the server rounded *up* past `now` would make this run delete its own fresh
 * rows.
 *
 * Local-time fields are used deliberately - `NOW()` in the SQL and `new Date()`
 * in TypeScript are both resolved in the same server/session timezone, so the
 * literal written here matches what `CURDATE()` would have returned.
 */
function formatSqlDateTime(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}