import { Body, Controller, Get, Post, Query, Response, Route, Tags } from 'tsoa';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { z } from 'zod';
import { DashboardKpiService } from '../services/dashboardKpi.service';
import { invalidateByPrefixThrottled } from '../../utils/cache.utils';
import { CACHE_PREFIX } from '../../constants/cache.constants';
import {
  CategorySpendSnapshotDTO,
  CoverageCellDTO,
  DashboardKpiRefreshResultDTO,
  DashboardSnapshotDTO,
  DashboardSnapshotQuery,
  DashboardSnapshotRefreshBody,
  DimensionCountDTO,
  EngagementRateSnapshotDTO,
  FinanceSnapshotDTO,
  HomeVisitSnapshotDTO,
  ObjectiveStatusSnapshotDTO,
  SnapshotFreshnessDTO,
} from '../dtos/dashboardKpiSnapshot.dto';

/**
 * Validates the shared read query.
 *
 * `academicYear` is REQUIRED here, unlike on `MetricsController` where it is
 * optional. That is deliberate: the snapshot table is partitioned by academic
 * year and a refresh only ever populates one, so resolving a "default" year
 * would risk silently returning another year's cached numbers. Making the caller
 * state the year removes that ambiguity.
 *
 * `schoolId` is optional and defaults to the NGO-wide roll-up.
 */
const snapshotQuerySchema = z.object({
  academicYear: z.string().min(1).max(20),
  schoolId: z.coerce.number().int().positive().optional(),
});

/** Validates the refresh body. */
const refreshBodySchema = z.object({
  academicYear: z.string().min(1).max(20),
  academicYearStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'academicYearStart must be formatted YYYY-MM-DD')
    .optional(),
  academicYearEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'academicYearEnd must be formatted YYYY-MM-DD')
    .optional(),
  engagementWindowDays: z.coerce.number().int().positive().max(365).optional(),
});

/**
 * DashboardKpiController - read-only endpoints over the pre-aggregated KPI
 * snapshot table, plus a manual refresh trigger.
 *
 * ## Route prefix
 *
 * `@Route('metrics/kpi-snapshot')` follows the same convention as
 * `MetricsController`: tsoa routes are registered at the application ROOT by
 * `RegisterRoutes(app)`, so the effective path is `/metrics/kpi-snapshot/...`.
 *
 * ## Relationship to `MetricsController`
 *
 * These endpoints serve the SAME figures as `/metrics/*`, but from the
 * pre-computed snapshot table instead of aggregating live on every request.
 * `MetricsController` remains the authoritative, always-current path; use these
 * endpoints when a dashboard will tolerate data that is at most one refresh old.
 *
 * Nothing here mutates source data. The only write is the refresh endpoint, which
 * rewrites the snapshot table alone.
 */
@Tags('Metrics')
@Route('metrics/kpi-snapshot')
@provide(DashboardKpiController)
export class DashboardKpiController extends Controller {
  constructor(@inject(DashboardKpiService) private kpiService: DashboardKpiService) {
    super();
  }

  private parseQuery(query: DashboardSnapshotQuery) {
    return snapshotQuerySchema.parse(query);
  }

  /**
   * Get every dashboard KPI for one academic year and school scope in a single
   * request. The preferred endpoint for a snapshot-driven dashboard.
   *
   * @query academicYear Required, e.g. "2026-2027".
   * @query schoolId      Optional. Omit for the NGO-wide total.
   */
  @Get()
  @Response(400, 'Bad Request - Invalid query parameters')
  public async getSnapshot(
    @Query() academicYear?: string,
    @Query() schoolId?: number
  ): Promise<DashboardSnapshotDTO> {
    return await this.kpiService.getSnapshot(this.parseQuery({ academicYear, schoolId }));
  }

  /** Finance tiles: budget, spent, balance, budget utilisation. */
  @Get('finance')
  @Response(400, 'Bad Request - Invalid query parameters')
  public async getFinance(
    @Query() academicYear?: string,
    @Query() schoolId?: number
  ): Promise<FinanceSnapshotDTO> {
    return await this.kpiService.getFinance(this.parseQuery({ academicYear, schoolId }));
  }

  /** Spend per budget category, highest first, with each share of total spend. */
  @Get('finance/categories')
  @Response(400, 'Bad Request - Invalid query parameters')
  public async getCategorySpend(
    @Query() academicYear?: string,
    @Query() schoolId?: number
  ): Promise<CategorySpendSnapshotDTO[]> {
    return await this.kpiService.getCategorySpend(this.parseQuery({ academicYear, schoolId }));
  }

  /** Objective overview tiles: planned / completed / in-progress / upcoming. */
  @Get('objectives')
  @Response(400, 'Bad Request - Invalid query parameters')
  public async getObjectives(
    @Query() academicYear?: string,
    @Query() schoolId?: number
  ): Promise<ObjectiveStatusSnapshotDTO> {
    return await this.kpiService.getObjectiveStatus(this.parseQuery({ academicYear, schoolId }));
  }

  /**
   * The class x module coverage matrix.
   *
   * Only cells recorded in `objective_coverages` are returned; an absent cell
   * means NOT_STARTED rather than 0% covered, so the client renders the gaps.
   */
  @Get('objectives/coverage')
  @Response(400, 'Bad Request - Invalid query parameters')
  public async getCoverage(
    @Query() academicYear?: string,
    @Query() schoolId?: number
  ): Promise<CoverageCellDTO[]> {
    return await this.kpiService.getObjectiveCoverage(this.parseQuery({ academicYear, schoolId }));
  }

  /** Student engagement rates: class participation and AI/IVRS + practice. */
  @Get('engagement')
  @Response(400, 'Bad Request - Invalid query parameters')
  public async getEngagement(
    @Query() academicYear?: string,
    @Query() schoolId?: number
  ): Promise<EngagementRateSnapshotDTO[]> {
    return await this.kpiService.getEngagement(this.parseQuery({ academicYear, schoolId }));
  }

  /** Home visit tiles: completed, scheduled, cancelled, students reached. */
  @Get('home-visits')
  @Response(400, 'Bad Request - Invalid query parameters')
  public async getHomeVisits(
    @Query() academicYear?: string,
    @Query() schoolId?: number
  ): Promise<HomeVisitSnapshotDTO> {
    return await this.kpiService.getHomeVisits(this.parseQuery({ academicYear, schoolId }));
  }

  /** Parent engagements by channel, highest first. */
  @Get('parent-engagement')
  @Response(400, 'Bad Request - Invalid query parameters')
  public async getParentEngagement(
    @Query() academicYear?: string,
    @Query() schoolId?: number
  ): Promise<DimensionCountDTO[]> {
    return await this.kpiService.getParentEngagement(this.parseQuery({ academicYear, schoolId }));
  }

  /**
   * Parent interaction register counts by status. Always NGO-wide - the source
   * table carries no school column, so a school scope cannot be honoured.
   */
  @Get('parent-interactions')
  @Response(400, 'Bad Request - Invalid query parameters')
  public async getParentInteractions(
    @Query() academicYear?: string,
    @Query() schoolId?: number
  ): Promise<DimensionCountDTO[]> {
    return await this.kpiService.getParentInteractions(this.parseQuery({ academicYear, schoolId }));
  }

  /** When the snapshot was last refreshed, and how many rows it holds. */
  @Get('freshness')
  @Response(400, 'Bad Request - Invalid query parameters')
  public async getFreshness(
    @Query() academicYear?: string,
    @Query() schoolId?: number
  ): Promise<SnapshotFreshnessDTO> {
    return await this.kpiService.getFreshness(this.parseQuery({ academicYear, schoolId }));
  }

  /**
   * Recompute the snapshot for one academic year.
   *
   * Intended for an operator or a scheduled job, not for interactive use. The
   * refresh is a single statement plus a stale-row cleanup, both inside one
   * transaction, so it is safe to call while the dashboard is being read.
   */
  @Post('refresh')
  @Response(400, 'Bad Request - Invalid body parameters')
  public async refresh(@Body() body: DashboardSnapshotRefreshBody): Promise<DashboardKpiRefreshResultDTO> {
    const result = await this.kpiService.refresh(refreshBodySchema.parse(body));
    // The refresh rewrites aggregated numbers: drop any cached `/metrics/*`
    // responses so no dashboard consumer keeps seeing pre-refresh figures.
    invalidateByPrefixThrottled(CACHE_PREFIX.METRICS);
    // `computedAt` crosses the wire as an ISO string; returning the raw Date would
    // serialise identically but bypasses the declared DTO contract.
    return { ...result, computedAt: result.computedAt.toISOString() };
  }
}