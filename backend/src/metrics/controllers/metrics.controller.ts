import { Controller, Route, Get, Query, Tags, Response } from 'tsoa';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { MetricsService } from '../services/metrics.service';
import { metricsFilterQuerySchema, MetricsFilterQuery } from '../dtos/metricsFilter.dto';
import { DashboardSummaryResponseDTO } from '../dtos/dashboardSummary.dto';
import { KpiSummaryResponseDTO } from '../dtos/kpiSummary.dto';
import { LearningProgressDTO } from '../dtos/learningProgress.dto';
import { SchoolPerformanceResponseDTO } from '../dtos/schoolPerformance.dto';
import { NeedsAttentionResponseDTO } from '../dtos/needsAttention.dto';
import { EngagementMetricsDTO } from '../dtos/engagementMetrics.dto';
import { ResourceFinanceDTO } from '../dtos/resourceFinance.dto';
import { TeachingObjectivesDTO } from '../dtos/teachingObjectives.dto';

/** The filter parameters every metrics endpoint accepts. */
interface MetricsEndpointQuery {
  academicYear?: string;
  fromDate?: string;
  toDate?: string;
  schoolId?: number;
  classId?: number;
  month?: number;
  year?: number;
}

/**
 * MetricsController - read-only dashboard endpoints for the
 * "Akshara - English Skill Building Program" dashboard.
 *
 * ## Route prefix
 *
 * `@Route('metrics')` follows the application's existing convention: TSOA routes
 * are registered at the application ROOT by `RegisterRoutes(app)` in
 * `src/index.ts`, so the effective path is `/metrics/dashboard`, NOT
 * `/api/v1/metrics/dashboard`. That is the same rule the attendance, student,
 * class and baseline-assessment controllers already follow, and it is documented
 * in `Docs/backend/CONTEXT.md` section 4.
 *
 * Because the dashboard product spec calls for `/api/v1/metrics`, a non-breaking
 * alias is ALSO mounted at `/api/v1/metrics` in `src/routes/index.ts`. Both paths
 * resolve to this controller, so frontend services written against either
 * convention keep working.
 *
 * Every endpoint is `GET` and read-only: the module creates no records and
 * modifies no existing table.
 */
@Tags('Metrics')
@Route('metrics')
@provide(MetricsController)
export class MetricsController extends Controller {
  constructor(@inject(MetricsService) private metricsService: MetricsService) {
    super();
  }

  /**
   * Parse and validate the shared filter set.
   *
   * Zod is the authoritative runtime gate (it coerces query strings to numbers and
   * enforces the from/to and month/year pairings); the typed `@Query()` parameters
   * are the declared contract tsoa uses to build the OpenAPI spec and to validate
   * incoming requests.
   */
  private parseFilter(query: MetricsEndpointQuery): MetricsFilterQuery {
    return metricsFilterQuerySchema.parse(query) as MetricsFilterQuery;
  }

  /**
   * Get the complete dashboard in one request.
   *
   * Covers all seven core aspects plus the three derived metrics. Preferred for the
   * initial page load, because it guarantees every section of the screen is derived
   * from a single resolved filter window. The granular endpoints expose the same
   * data for clients that refresh one section at a time.
   *
   * @query academicYear e.g. "2026-2027". Omit to span every academic year.
   * @query fromDate      Period start, YYYY-MM-DD.
   * @query toDate        Period end, YYYY-MM-DD.
   * @query schoolId      Restrict to one school.
   * @query classId       Restrict to one class section.
   * @query month         Reporting month 1-12; requires `year`.
   * @query year          Reporting year; required when `month` is supplied.
   */
  @Get('dashboard')
  @Response(400, 'Bad Request - Invalid filter parameters')
  public async getDashboard(
    @Query() academicYear?: string,
    @Query() fromDate?: string,
    @Query() toDate?: string,
    @Query() schoolId?: number,
    @Query() classId?: number,
    @Query() month?: number,
    @Query() year?: number
  ): Promise<DashboardSummaryResponseDTO> {
    return await this.metricsService.getDashboardSummary(
      this.parseFilter({ academicYear, fromDate, toDate, schoolId, classId, month, year })
    );
  }

  /** Get the five headline KPI cards (Aspect 1). */
  @Get('kpis')
  @Response(400, 'Bad Request - Invalid filter parameters')
  public async getKpis(
    @Query() academicYear?: string,
    @Query() fromDate?: string,
    @Query() toDate?: string,
    @Query() schoolId?: number,
    @Query() classId?: number,
    @Query() month?: number,
    @Query() year?: number
  ): Promise<KpiSummaryResponseDTO> {
    return await this.metricsService.getKpiSummary(
      this.parseFilter({ academicYear, fromDate, toDate, schoolId, classId, month, year })
    );
  }

  /**
   * Get learning progress and outcomes (Aspect 2).
   *
   * Returns overall progress, per-domain baseline vs current, the S1-S5 stage
   * distribution, stage movement between baseline and current, and the SAS split.
   */
  @Get('learning-outcomes')
  @Response(400, 'Bad Request - Invalid filter parameters')
  public async getLearningOutcomes(
    @Query() academicYear?: string,
    @Query() fromDate?: string,
    @Query() toDate?: string,
    @Query() schoolId?: number,
    @Query() classId?: number,
    @Query() month?: number,
    @Query() year?: number
  ): Promise<LearningProgressDTO> {
    return await this.metricsService.getLearningOutcomes(
      this.parseFilter({ academicYear, fromDate, toDate, schoolId, classId, month, year })
    );
  }

  /** Get the school performance matrix (Aspect 3). */
  @Get('school-performance')
  @Response(400, 'Bad Request - Invalid filter parameters')
  public async getSchoolPerformance(
    @Query() academicYear?: string,
    @Query() fromDate?: string,
    @Query() toDate?: string,
    @Query() schoolId?: number,
    @Query() classId?: number,
    @Query() month?: number,
    @Query() year?: number
  ): Promise<SchoolPerformanceResponseDTO> {
    return await this.metricsService.getSchoolPerformance(
      this.parseFilter({ academicYear, fromDate, toDate, schoolId, classId, month, year })
    );
  }

  /** Get the dynamically generated "Needs Attention" alerts (Aspect 4). */
  @Get('needs-attention')
  @Response(400, 'Bad Request - Invalid filter parameters')
  public async getNeedsAttention(
    @Query() academicYear?: string,
    @Query() fromDate?: string,
    @Query() toDate?: string,
    @Query() schoolId?: number,
    @Query() classId?: number,
    @Query() month?: number,
    @Query() year?: number
  ): Promise<NeedsAttentionResponseDTO> {
    return await this.metricsService.getNeedsAttention(
      this.parseFilter({ academicYear, fromDate, toDate, schoolId, classId, month, year })
    );
  }

  /** Get teaching objectives and the class x module coverage matrix (Aspect 5). */
  @Get('teaching-objectives')
  @Response(400, 'Bad Request - Invalid filter parameters')
  public async getTeachingObjectives(
    @Query() academicYear?: string,
    @Query() fromDate?: string,
    @Query() toDate?: string,
    @Query() schoolId?: number,
    @Query() classId?: number,
    @Query() month?: number,
    @Query() year?: number
  ): Promise<TeachingObjectivesDTO> {
    return await this.metricsService.getTeachingObjectives(
      this.parseFilter({ academicYear, fromDate, toDate, schoolId, classId, month, year })
    );
  }

  /** Get stakeholder engagement metrics (Aspect 6). */
  @Get('engagement')
  @Response(400, 'Bad Request - Invalid filter parameters')
  public async getEngagement(
    @Query() academicYear?: string,
    @Query() fromDate?: string,
    @Query() toDate?: string,
    @Query() schoolId?: number,
    @Query() classId?: number,
    @Query() month?: number,
    @Query() year?: number
  ): Promise<EngagementMetricsDTO> {
    return await this.metricsService.getEngagementMetrics(
      this.parseFilter({ academicYear, fromDate, toDate, schoolId, classId, month, year })
    );
  }

  /** Get resources and finance tracking (Aspect 7). */
  @Get('finance')
  @Response(400, 'Bad Request - Invalid filter parameters')
  public async getFinance(
    @Query() academicYear?: string,
    @Query() fromDate?: string,
    @Query() toDate?: string,
    @Query() schoolId?: number,
    @Query() classId?: number,
    @Query() month?: number,
    @Query() year?: number
  ): Promise<ResourceFinanceDTO> {
    return await this.metricsService.getResourceFinance(
      this.parseFilter({ academicYear, fromDate, toDate, schoolId, classId, month, year })
    );
  }
}
