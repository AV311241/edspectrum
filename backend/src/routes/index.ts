import { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { HttpStatusCode, HttpResponseMessage } from '../constants/httpStatus.constants';
import { iocContainer } from '../ioc';
import { MetricsController } from '../metrics/controllers/metrics.controller';
import { metricsFilterQuerySchema } from '../metrics/dtos/metricsFilter.dto';
import { AppError } from '../utils/appError.utils';
import { logger } from '../config/logger.config';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(HttpStatusCode.OK).json({
    success: true,
    statusCode: HttpStatusCode.OK,
    message: HttpResponseMessage.SUCCESS,
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'lumino1-baseline-backend',
    },
  });
});

/**
 * `/api/v1/metrics/*` compatibility alias.
 *
 * The application's canonical mount point is the application ROOT, so TSOA already
 * serves the metrics controller at `/metrics/...` (see `Docs/backend/CONTEXT.md`
 * section 4). The dashboard product specification, however, calls for
 * `/api/v1/metrics/...`, and older revisions of the project documents used that
 * prefix before it was corrected.
 *
 * Rather than change the canonical mount - which would be a breaking change for
 * every existing frontend service - this thin alias forwards the request to the
 * exact same `MetricsController` instance that Inversify built for the TSOA
 * routes. Both paths therefore execute identical code, share one cache and one
 * set of log lines, and cannot drift apart.
 *
 * Read-only by construction: this router exposes only the `GET` endpoints, so
 * adding the alias cannot widen the module's attack surface.
 */
/**
 * Lazily resolve the controller from the Inversify container.
 *
 * This MUST NOT be a top-level `iocContainer.get(...)`. `inversify-binding-decorators`
 * builds the provider module by scanning the modules that are already in the
 * require cache at the moment `src/ioc.ts` is first evaluated. `src/index.ts`
 * imports `./routes`, which imports `./ioc` and only afterwards imports
 * `MetricsController` - so at `ioc` evaluation time the controller's `@provide`
 * decorator has not run yet and an eager `get()` throws
 * "No matching bindings found for serviceIdentifier: MetricsController".
 *
 * Resolving on first request sidesteps that ordering entirely: by the time any
 * HTTP request arrives, every module in the application has been imported and the
 * container is fully populated. The instance is memoised so the container still
 * performs construction exactly once, and both alias and TSOA routes then share
 * the same singleton controller and the same service graph.
 */
let cachedController: MetricsController | undefined;

function getMetricsController(): MetricsController {
  if (cachedController === undefined) {
    cachedController = iocContainer.get<MetricsController>(MetricsController);
  }
  return cachedController;
}

/** Query keys the metrics endpoints accept, forwarded verbatim. */
const METRICS_QUERY_KEYS = [
  'academicYear',
  'fromDate',
  'toDate',
  'schoolId',
  'classId',
  'month',
  'year',
] as const;

type MetricsAspect =
  | 'dashboard'
  | 'kpis'
  | 'learning-outcomes'
  | 'school-performance'
  | 'needs-attention'
  | 'teaching-objectives'
  | 'engagement'
  | 'finance';

/** Map a URL segment onto the controller method that serves it. */
const ASPECT_METHODS: Record<
  MetricsAspect,
  (controller: MetricsController, q: Record<string, unknown>) => Promise<unknown>
> = {
  dashboard: (c, q) => c.getDashboard(...(argList(q) as never[])),
  kpis: (c, q) => c.getKpis(...(argList(q) as never[])),
  'learning-outcomes': (c, q) => c.getLearningOutcomes(...(argList(q) as never[])),
  'school-performance': (c, q) => c.getSchoolPerformance(...(argList(q) as never[])),
  'needs-attention': (c, q) => c.getNeedsAttention(...(argList(q) as never[])),
  'teaching-objectives': (c, q) => c.getTeachingObjectives(...(argList(q) as never[])),
  engagement: (c, q) => c.getEngagement(...(argList(q) as never[])),
  finance: (c, q) => c.getFinance(...(argList(q) as never[])),
};

/** Order must match the controller's positional `@Query()` parameters. */
const METRICS_ARG_ORDER = [
  'academicYear',
  'fromDate',
  'toDate',
  'schoolId',
  'classId',
  'month',
  'year',
] as const;

function argList(query: Record<string, unknown>): unknown[] {
  return METRICS_ARG_ORDER.map((key) => query[key]);
}

/** Express 4 does not forward rejected promises; funnel them into the next error. */
function asyncHandler(
  handler: (req: Request, res: Response) => Promise<unknown>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

router.get(
  '/metrics/:aspect',
  asyncHandler(async (req: Request, res: Response) => {
    const aspect = req.params.aspect as MetricsAspect;
    const method = ASPECT_METHODS[aspect];
    if (!method) {
      throw new AppError(`Unknown metrics aspect: ${aspect}`, HttpStatusCode.NOT_FOUND);
    }

    // Forward only the whitelisted keys, so the alias cannot be used to pass
    // unexpected query parameters through to the Zod contract.
    const query: Record<string, unknown> = {};
    for (const key of METRICS_QUERY_KEYS) {
      const value = req.query[key];
      if (value !== undefined) query[key] = value;
    }

    // Parse here purely to reject malformed filters with the same 400 the TSOA
    // route would return, keeping both paths observably identical.
    metricsFilterQuerySchema.parse(query);

    const data = await method(getMetricsController(), query);
    res.status(HttpStatusCode.OK).json({
      success: true,
      statusCode: HttpStatusCode.OK,
      message: HttpResponseMessage.SUCCESS,
      data,
    });
  })
);

logger.info('[routes] Registered /api/v1/metrics compatibility alias');

export default router;
