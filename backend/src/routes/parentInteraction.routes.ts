import { Request, Response, NextFunction, Router } from 'express';
import { iocContainer } from '../ioc';
import { ParentInteractionController } from '../controllers/parentInteraction.controller';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode, HttpResponseMessage } from '../constants/httpStatus.constants';
import { logger } from '../config/logger.config';

const router = Router();

/**
 * `/api/parent-interactions/*` alias.
 *
 * The application's canonical mount point is the application ROOT, so TSOA
 * already serves `ParentInteractionController` at `/parent-interactions/...` and
 * `/parent-interactions/upload` (see `Docs/backend/CONTEXT.md` section 4). The
 * Parent Interaction product specification, however, names
 * `/api/parent-interactions/upload` and `/api/parent-interactions`.
 *
 * Rather than change the canonical mount - which would be a breaking change for
 * every existing frontend service - this thin alias forwards each request to the
 * exact same `ParentInteractionController` instance that Inversify built for the
 * TSOA routes. Both paths therefore execute identical code, share one service
 * graph and one set of log lines, and cannot drift apart.
 *
 * The alias deliberately re-uses the controller's own Zod gates rather than
 * re-implementing validation, so a malformed payload returns the same 400 from
 * either path.
 *
 * Unlike the metrics alias (which is read-only and therefore safe to expose
 * broadly), this router also carries the **write** endpoint. It forwards to the
 * identical controller method that the TSOA route already exposes publicly, so
 * mounting it adds no new capability - only an additional spelling of a route
 * that is already live.
 */
let cachedController: ParentInteractionController | undefined;

/**
 * Lazily resolve the controller from the Inversify container.
 *
 * This MUST NOT be a top-level `iocContainer.get(...)`.
 * `inversify-binding-decorators` builds the provider module by scanning the
 * modules already in the require cache when `src/ioc.ts` is first evaluated.
 * Resolving on first request sidesteps that ordering entirely: by the time any
 * HTTP request arrives, every module has been imported and the container is
 * fully populated. The instance is memoised so the container still constructs
 * exactly once, and both the alias and the TSOA routes share the same singleton.
 */
function getController(): ParentInteractionController {
  if (cachedController === undefined) {
    cachedController = iocContainer.get<ParentInteractionController>(ParentInteractionController);
  }
  return cachedController;
}

/** Express 4 does not forward rejected promises; funnel them into the next error. */
function asyncHandler(
  handler: (req: Request, res: Response) => Promise<unknown>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

/** Wrap a payload in the project's standard success envelope. */
function sendSuccess(res: Response, data: unknown): void {
  res.status(HttpStatusCode.OK).json({
    success: true,
    statusCode: HttpStatusCode.OK,
    message: HttpResponseMessage.SUCCESS,
    data,
  });
}

/**
 * Query keys forwarded verbatim to the controller.
 *
 * `class` is exposed on the URL as `className` because `class` is a reserved
 * word in several SQL dialects and reads poorly in a query string; the
 * controller's positional parameter is named `className` to match.
 */
const LIST_QUERY_KEYS = [
  'page',
  'limit',
  'studentId',
  'className',
  'parentName',
  'relation',
  'mode',
  'status',
  'fromDate',
  'toDate',
  'search',
] as const;

/** Order must match the controller's positional `@Query()` parameters. */
const LIST_ARG_ORDER = LIST_QUERY_KEYS;

function listArgList(query: Record<string, unknown>): unknown[] {
  return LIST_ARG_ORDER.map((key) => query[key]);
}

/**
 * `POST /api/parent-interactions/upload` - bulk register upload.
 */
router.post(
  '/parent-interactions/upload',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await getController().uploadParentInteractions(req.body);
    sendSuccess(res, data);
  })
);

/**
 * `GET /api/parent-interactions` - paginated register listing.
 */
router.get(
  '/parent-interactions',
  asyncHandler(async (req: Request, res: Response) => {
    // Forward only the whitelisted keys, so the alias cannot be used to pass
    // unexpected query parameters through to the Zod contract.
    const query: Record<string, unknown> = {};
    for (const key of LIST_QUERY_KEYS) {
      const value = req.query[key];
      if (value !== undefined) query[key] = value;
    }

    const data = await getController().listParentInteractions(...(listArgList(query) as never[]));
    sendSuccess(res, data);
  })
);

/**
 * `GET /api/parent-interactions/:id` - single register entry.
 */
router.get(
  '/parent-interactions/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    if (!/^\d+$/.test(id)) {
      throw new AppError(`Invalid parent interaction id: "${id}"`, HttpStatusCode.BAD_REQUEST);
    }
    const data = await getController().getParentInteractionById(id);
    sendSuccess(res, data);
  })
);

logger.info('[routes] Registered /api/parent-interactions alias');

export default router;