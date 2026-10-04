import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import {
  DashboardKpiRepository,
  DashboardKpiRefreshOptions,
  DashboardKpiRefreshResult,
} from '../repositories/dashboardKpi.repository';
import { DashboardKpiQuery, DashboardKpiReadRepository } from '../repositories/dashboardKpiRead.repository';
import {
  CategorySpendSnapshotDTO,
  CoverageCellDTO,
  DashboardSnapshotDTO,
  DimensionCountDTO,
  EngagementRateSnapshotDTO,
  FinanceSnapshotDTO,
  HomeVisitSnapshotDTO,
  ObjectiveStatusSnapshotDTO,
  SnapshotFreshnessDTO,
} from '../dtos/dashboardKpiSnapshot.dto';

export type {
  DashboardSnapshotDTO,
  DashboardKpiRefreshResult,
  DashboardKpiRefreshOptions,
};

export interface IDashboardKpiService {
  refresh(options: DashboardKpiRefreshOptions): Promise<DashboardKpiRefreshResult>;
  getFinance(q: DashboardKpiQuery): Promise<FinanceSnapshotDTO>;
  getCategorySpend(q: DashboardKpiQuery): Promise<CategorySpendSnapshotDTO[]>;
  getObjectiveStatus(q: DashboardKpiQuery): Promise<ObjectiveStatusSnapshotDTO>;
  getObjectiveCoverage(q: DashboardKpiQuery): Promise<CoverageCellDTO[]>;
  getEngagement(q: DashboardKpiQuery): Promise<EngagementRateSnapshotDTO[]>;
  getHomeVisits(q: DashboardKpiQuery): Promise<HomeVisitSnapshotDTO>;
  getParentEngagement(q: DashboardKpiQuery): Promise<DimensionCountDTO[]>;
  getParentInteractions(q: DashboardKpiQuery): Promise<DimensionCountDTO[]>;
  getFreshness(q: DashboardKpiQuery): Promise<SnapshotFreshnessDTO>;
  getSnapshot(q: DashboardKpiQuery): Promise<DashboardSnapshotDTO>;
}

/**
 * Service layer for the pre-aggregated dashboard KPI snapshots.
 *
 * ## Relationship to the existing `MetricsService`
 *
 * This is a *complementary* read path, not a replacement. `MetricsService`
 * computes everything live from the source tables, which is always correct but
 * re-aggregates every table on every request. This service serves the same
 * figures from the pre-computed snapshot table for dashboards that refresh
 * twice a day and tolerate slightly stale numbers.
 *
 * The live path remains the source of truth. Nothing here writes to the source
 * tables, and `MetricsService` is untouched.
 *
 * Declared as an interface and bound to the concrete class so the controller and
 * any future cached implementation stay swappable, matching the `IXxxService`
 * convention already used by `MetricsService`.
 */
@provide(DashboardKpiService)
export class DashboardKpiService implements IDashboardKpiService {
  constructor(
    @inject(DashboardKpiRepository) private readonly writer: DashboardKpiRepository,
    @inject(DashboardKpiReadRepository) private readonly reader: DashboardKpiReadRepository
  ) {}

  /**
   * Recompute the snapshot for one academic year.
   *
   * Intended to be driven by an external scheduler (cron, a MySQL EVENT, or the
   * admin endpoint) rather than on the request path. See
   * `scripts/refresh-dashboard-kpi.ts` for the CLI entry point.
   */
  public async refresh(options: DashboardKpiRefreshOptions): Promise<DashboardKpiRefreshResult> {
    return await this.writer.refresh(options);
  }

  public async getFinance(q: DashboardKpiQuery): Promise<FinanceSnapshotDTO> {
    return await this.reader.finance(q);
  }

  public async getCategorySpend(q: DashboardKpiQuery): Promise<CategorySpendSnapshotDTO[]> {
    return await this.reader.categorySpend(q);
  }

  public async getObjectiveStatus(q: DashboardKpiQuery): Promise<ObjectiveStatusSnapshotDTO> {
    return await this.reader.objectiveStatus(q);
  }

  public async getObjectiveCoverage(q: DashboardKpiQuery): Promise<CoverageCellDTO[]> {
    return await this.reader.objectiveCoverage(q);
  }

  public async getEngagement(q: DashboardKpiQuery): Promise<EngagementRateSnapshotDTO[]> {
    return await this.reader.engagement(q);
  }

  public async getHomeVisits(q: DashboardKpiQuery): Promise<HomeVisitSnapshotDTO> {
    return await this.reader.homeVisits(q);
  }

  public async getParentEngagement(q: DashboardKpiQuery): Promise<DimensionCountDTO[]> {
    return await this.reader.parentEngagement(q);
  }

  public async getParentInteractions(q: DashboardKpiQuery): Promise<DimensionCountDTO[]> {
    return await this.reader.parentInteractions(q);
  }

  public async getFreshness(q: DashboardKpiQuery): Promise<SnapshotFreshnessDTO> {
    return await this.reader.freshness(q);
  }

  /**
   * The whole snapshot for one scope in a single round trip.
   *
   * The nine sub-reads run concurrently because each is an independent PK-prefix
   * query against one tiny table; issuing them in parallel keeps the endpoint at
   * roughly the cost of its slowest query instead of their sum.
   */
  public async getSnapshot(q: DashboardKpiQuery): Promise<DashboardSnapshotDTO> {
    const [
      finance,
      categorySpend,
      objectives,
      coverage,
      engagement,
      homeVisits,
      parentEngagement,
      parentInteractions,
      freshness,
    ] = await Promise.all([
      this.reader.finance(q),
      this.reader.categorySpend(q),
      this.reader.objectiveStatus(q),
      this.reader.objectiveCoverage(q),
      this.reader.engagement(q),
      this.reader.homeVisits(q),
      this.reader.parentEngagement(q),
      this.reader.parentInteractions(q),
      this.reader.freshness(q),
    ]);

    return {
      academicYear: q.academicYear,
      schoolId: q.schoolId ?? 0,
      finance,
      categorySpend,
      objectives,
      coverage,
      engagement,
      homeVisits,
      parentEngagement,
      parentInteractions,
      freshness,
    };
  }
}