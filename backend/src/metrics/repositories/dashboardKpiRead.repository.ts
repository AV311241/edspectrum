import { Prisma } from '@prisma/client';
import { provide } from 'inversify-binding-decorators';
import { prisma } from '../../config/db.config';
import { DashboardKpiMetric, KPI_SCHOOL_NGO_WIDE } from '../constants/dashboardKpi.constants';
import { METRICS_BUDGET_CATEGORY_LABELS } from '../constants/metrics.constants';
import {
  CategorySpendSnapshotDTO,
  CoverageCellDTO,
  DimensionCountDTO,
  EngagementRateSnapshotDTO,
  FinanceSnapshotDTO,
  HomeVisitSnapshotDTO,
  ObjectiveStatusSnapshotDTO,
  SnapshotFreshnessDTO,
} from '../dtos/dashboardKpiSnapshot.dto';

/**
 * Read-side query input.
 *
 * `schoolId` is omitted for the NGO-wide roll-up. It lives here rather than in
 * `dtos/` because it is never returned over the wire - tsoa only ever sees the
 * controller's own `DashboardSnapshotQuery`.
 */
export interface DashboardKpiQuery {
  academicYear: string;
  /** Omit for the NGO-wide roll-up (`school_id = 0`). */
  schoolId?: number;
}

/** Raw snapshot row as returned by Prisma, before numeric normalisation. */
interface SnapshotRow {
  metricCode: string;
  schoolId: number;
  classSectionId: number;
  dimKey: string;
  dimLabel: string | null;
  valueNum: Prisma.Decimal;
  denominatorNum: Prisma.Decimal | null;
  batchSlot: number;
  computedAt: Date;
}

export interface IDashboardKpiReadRepository {
  finance(q: DashboardKpiQuery): Promise<FinanceSnapshotDTO>;
  categorySpend(q: DashboardKpiQuery): Promise<CategorySpendSnapshotDTO[]>;
  objectiveStatus(q: DashboardKpiQuery): Promise<ObjectiveStatusSnapshotDTO>;
  objectiveCoverage(q: DashboardKpiQuery): Promise<CoverageCellDTO[]>;
  engagement(q: DashboardKpiQuery): Promise<EngagementRateSnapshotDTO[]>;
  homeVisits(q: DashboardKpiQuery): Promise<HomeVisitSnapshotDTO>;
  parentEngagement(q: DashboardKpiQuery): Promise<DimensionCountDTO[]>;
  parentInteractions(q: DashboardKpiQuery): Promise<DimensionCountDTO[]>;
  freshness(q: DashboardKpiQuery): Promise<SnapshotFreshnessDTO>;
}

/**
 * Read side of the KPI snapshot table.
 *
 * Every method is a *primary-key prefix* lookup - equality on `academic_year`
 * plus (usually) `metric_code` and `school_id`. That is exactly what the clustered
 * composite primary key is ordered for, so no secondary index is required and each
 * query is a short range scan rather than a full table read.
 *
 * These queries are read-only and create nothing, matching the rest of the
 * metrics module.
 */
@provide(DashboardKpiReadRepository)
export class DashboardKpiReadRepository implements IDashboardKpiReadRepository {
  /**
   * Resolve the stored `school_id` for a request.
   *
   * Omitting `schoolId` means the NGO-wide roll-up, which the refresh stores under
   * the `0` sentinel. Returning `undefined` instead would widen the query to every
   * school and silently turn a scoped request into a global one.
   */
  private scope(q: DashboardKpiQuery): number {
    return q.schoolId ?? KPI_SCHOOL_NGO_WIDE;
  }

  /** Fetch snapshot rows for a metric set within one scope. */
  private async rowsFor(
    q: DashboardKpiQuery,
    metricCodes: DashboardKpiMetric[],
    classSectionId?: number
  ): Promise<SnapshotRow[]> {
    return await prisma.dashboardKpiSnapshot.findMany({
      where: {
        academicYear: q.academicYear,
        metricCode: { in: metricCodes },
        schoolId: this.scope(q),
        ...(classSectionId !== undefined ? { classSectionId } : {}),
      },
      select: {
        metricCode: true,
        schoolId: true,
        classSectionId: true,
        dimKey: true,
        dimLabel: true,
        valueNum: true,
        denominatorNum: true,
        batchSlot: true,
        computedAt: true,
      },
    });
  }

  /** Budget / spent / balance tiles. */
  public async finance(q: DashboardKpiQuery): Promise<FinanceSnapshotDTO> {
    const rows = await this.rowsFor(q, [
      DashboardKpiMetric.FIN_BUDGET,
      DashboardKpiMetric.FIN_SPENT,
      DashboardKpiMetric.FIN_BALANCE,
    ]);

    const pick = (code: DashboardKpiMetric): number => {
      const row = rows.find((r) => r.metricCode === code);
      return row ? row.valueNum.toNumber() : 0;
    };

    const totalBudget = pick(DashboardKpiMetric.FIN_BUDGET);
    const totalSpent = pick(DashboardKpiMetric.FIN_SPENT);
    const lastRefreshed = rows.reduce<Date | null>(
      (latest, r) => (latest === null || r.computedAt > latest ? r.computedAt : latest),
      null
    );

    return {
      totalBudget,
      totalSpent,
      balance: pick(DashboardKpiMetric.FIN_BALANCE),
      utilizationPercent: ratioPercent(totalSpent, totalBudget),
      lastRefreshed: lastRefreshed ? lastRefreshed.toISOString() : null,
    };
  }

  /**
   * Spend per budget category, highest first.
   *
   * The refresh writes a row for every category (zero-filled), so this normally
   * returns the full list - but a scope with no finance data at all would yield
   * nothing, and the caller should render zeroes rather than an empty chart.
   */
  public async categorySpend(q: DashboardKpiQuery): Promise<CategorySpendSnapshotDTO[]> {
    const rows = await this.rowsFor(q, [DashboardKpiMetric.FIN_CATEGORY_SPEND]);

    return rows
      .map((r) => ({
        category: r.dimKey,
        categoryLabel:
          METRICS_BUDGET_CATEGORY_LABELS[r.dimKey as keyof typeof METRICS_BUDGET_CATEGORY_LABELS] ??
          r.dimLabel ??
          r.dimKey,
        spent: r.valueNum.toNumber(),
        spendPercent: ratioPercent(r.valueNum.toNumber(), r.denominatorNum?.toNumber() ?? 0),
      }))
      .sort((a, b) => b.spent - a.spent);
  }

  /**
   * Objective overview tiles.
   *
   * Every tile is zero-filled rather than omitted. A missing key and a genuine
   * zero are indistinguishable to the dashboard otherwise, and "no objectives
   * planned" must render as 0 rather than as an empty tile.
   */
  public async objectiveStatus(q: DashboardKpiQuery): Promise<ObjectiveStatusSnapshotDTO> {
    const rows = await this.rowsFor(q, [DashboardKpiMetric.OBJ_STATUS]);
    const byStatus = new Map(rows.map((r) => [r.dimKey, r.valueNum.toNumber()]));

    const planned = byStatus.get('PLANNED') ?? 0;
    const completed = byStatus.get('COMPLETED') ?? 0;
    const inProgress = byStatus.get('IN_PROGRESS') ?? 0;
    const upcoming = byStatus.get('UPCOMING') ?? 0;

    return {
      planned,
      completed,
      inProgress,
      upcoming,
      total: planned + completed + inProgress + upcoming,
    };
  }

  /**
   * The class x module coverage matrix, ordered for display.
   *
   * Only cells that EXIST in `objective_coverages` are returned. An absent cell
   * means NOT_STARTED rather than 0% covered, and the schema comment on
   * `ObjectiveCoverage` is explicit that this distinction must be preserved, so
   * the caller renders the missing cells rather than receiving zeroed rows.
   *
   * Omitting `schoolId` spans every school, because the matrix is only
   * meaningful as a whole-programme view. Unlike the other reads, this one
   * deliberately does NOT default to the `school_id = 0` sentinel - the refresh
   * writes coverage rows under the real school id, never under the sentinel.
   */
  public async objectiveCoverage(q: DashboardKpiQuery): Promise<CoverageCellDTO[]> {
    const where: Prisma.DashboardKpiSnapshotWhereInput = {
      academicYear: q.academicYear,
      metricCode: DashboardKpiMetric.OBJ_COVERAGE,
      ...(q.schoolId !== undefined ? { schoolId: q.schoolId } : {}),
    };

    const cells = await prisma.dashboardKpiSnapshot.findMany({
      where,
      select: {
        classSectionId: true,
        dimKey: true,
        dimLabel: true,
        valueNum: true,
      },
    });
    if (cells.length === 0) return [];

    // Resolve human-readable labels with two keyed lookups rather than a join per
    // cell; the cell count is bounded by classes x modules.
    const classIds = [...new Set(cells.map((c) => c.classSectionId))];
    const [classes, modules] = await Promise.all([
      prisma.classSection.findMany({
        where: { id: { in: classIds } },
        select: { id: true, name: true },
      }),
      prisma.teachingModule.findMany({
        select: { code: true, name: true, sequenceNumber: true },
      }),
    ]);

    const classNameById = new Map(classes.map((c) => [c.id, c.name]));
    const moduleByCode = new Map(modules.map((m) => [m.code, m]));

    return cells
      .map((c) => {
        const mod = moduleByCode.get(c.dimKey);
        return {
          classSectionId: c.classSectionId,
          className: classNameById.get(c.classSectionId) ?? `Class ${c.classSectionId}`,
          moduleCode: c.dimKey,
          moduleName: mod?.name ?? c.dimKey,
          // Unmatched modules sort last rather than first, so an unknown module
          // code cannot push the known M01..M10 columns off the matrix.
          sequenceNumber: mod?.sequenceNumber ?? Number.MAX_SAFE_INTEGER,
          status: c.dimLabel ?? c.dimKey,
          completionPercent: c.valueNum.toNumber(),
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className) || a.sequenceNumber - b.sequenceNumber);
  }

  /** Class participation and AI/IVRS + practice rates. */
  public async engagement(q: DashboardKpiQuery): Promise<EngagementRateSnapshotDTO[]> {
    const rows = await this.rowsFor(q, [
      DashboardKpiMetric.ENG_CLASS_PARTICIPATION,
      DashboardKpiMetric.ENG_AI_PRACTICE,
    ]);

    return rows
      .map((r) => {
        const engaged = r.valueNum.toNumber();
        const active = r.denominatorNum?.toNumber() ?? 0;
        return {
          metricCode: r.metricCode,
          engagedStudents: engaged,
          activeStudents: active,
          ratePercent: ratioPercent(engaged, active),
        };
      })
      .sort((a, b) => a.metricCode.localeCompare(b.metricCode));
  }

  /** Home visit tiles. */
  public async homeVisits(q: DashboardKpiQuery): Promise<HomeVisitSnapshotDTO> {
    const rows = await this.rowsFor(q, [
      DashboardKpiMetric.HOME_VISITS,
      DashboardKpiMetric.HOME_VISIT_STUDENTS_REACHED,
    ]);

    const visitsByStatus = new Map(
      rows
        .filter((r) => r.metricCode === DashboardKpiMetric.HOME_VISITS)
        .map((r) => [r.dimKey, r.valueNum.toNumber()])
    );
    const reached = rows.find((r) => r.metricCode === DashboardKpiMetric.HOME_VISIT_STUDENTS_REACHED);

    return {
      visitsCompleted: visitsByStatus.get('COMPLETED') ?? 0,
      visitsScheduled: visitsByStatus.get('SCHEDULED') ?? 0,
      visitsCancelled: visitsByStatus.get('CANCELLED') ?? 0,
      studentsReached: reached ? reached.valueNum.toNumber() : 0,
    };
  }

  /** Parent engagements per channel, highest first. */
  public async parentEngagement(q: DashboardKpiQuery): Promise<DimensionCountDTO[]> {
    return this.dimensionCounts(q, DashboardKpiMetric.PARENT_ENGAGEMENT);
  }

  /**
   * Parent interaction register counts per status.
   *
   * Always NGO-wide: `parent_interactions` has no school column, so the refresh
   * only ever writes `school_id = 0`. Forcing the sentinel here means a
   * school-scoped request still returns the register rather than a misleadingly
   * empty list.
   */
  public async parentInteractions(q: DashboardKpiQuery): Promise<DimensionCountDTO[]> {
    return this.dimensionCounts(
      { ...q, schoolId: KPI_SCHOOL_NGO_WIDE },
      DashboardKpiMetric.PARENT_INTERACTIONS
    );
  }

  /** When the snapshot was last recomputed, and how big it is. */
  public async freshness(q: DashboardKpiQuery): Promise<SnapshotFreshnessDTO> {
    const [newest, rowCount] = await Promise.all([
      prisma.dashboardKpiSnapshot.findFirst({
        where: { academicYear: q.academicYear },
        select: { computedAt: true, batchSlot: true },
        orderBy: { computedAt: 'desc' },
      }),
      // Cheap COUNT over the PK prefix; tells an operator whether a refresh
      // produced anything at all.
      prisma.dashboardKpiSnapshot.count({ where: { academicYear: q.academicYear } }),
    ]);

    return {
      lastRefreshed: newest ? newest.computedAt.toISOString() : null,
      lastBatchSlot: newest ? newest.batchSlot : null,
      rowCount,
    };
  }

  /** Shared helper for the two "count per dimension" breakdowns. */
  private async dimensionCounts(
    q: DashboardKpiQuery,
    metric: DashboardKpiMetric
  ): Promise<DimensionCountDTO[]> {
    const rows = await this.rowsFor(q, [metric]);
    return rows
      .map((r) => ({ dimKey: r.dimKey, dimLabel: r.dimLabel, count: r.valueNum.toNumber() }))
      .sort((a, b) => b.count - a.count);
  }
}

/**
 * Percentage of `part` against `whole`, or `null` when the base is unusable.
 *
 * Returning `null` rather than `0` is deliberate: a 0% rate would be
 * indistinguishable from "nothing to divide by", and the dashboard needs to tell
 * those apart to avoid rendering a confident-looking 0% for an empty cohort.
 */
function ratioPercent(part: number, whole: number): number | null {
  if (!Number.isFinite(whole) || whole === 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}