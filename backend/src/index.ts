import 'reflect-metadata';
import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { envConfig } from './config/env.config';
import { logger, httpLogger } from './config/logger.config';
import { DatabaseManager } from './config/db.config';
import { globalErrorHandler } from './middlewares/errorHandler.middleware';
import { AppError } from './utils/appError.utils';
import { HttpStatusCode, HttpResponseMessage } from './constants/httpStatus.constants';
import routes from './routes';
import parentInteractionRoutes from './routes/parentInteraction.routes';
import { apiLimiter, authLimiter, skipHealthCheck } from './middlewares/rateLimiter.middleware';
import { requestContextMiddleware, authenticate, requireAdmin, AuthenticatedRequest } from './middlewares/auth.middleware';
import { seedDefaultAdmin } from './seed/admin.seed';

import path from 'path';

let RegisterRoutes: ((app: Express) => void) | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RegisterRoutes = require('./generated/routes').RegisterRoutes;
} catch {
  // TSOA routes will be loaded once generated
}

export function createApp(): Express {
  const app = express();

  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);

  // Establish the per-request audit/context store FIRST so every downstream
  // middleware, controller and the Prisma audit hook can read it.
  app.use(requestContextMiddleware);

  // Security & Core Middlewares
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind needs unsafe-inline
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for Swagger UI
  }));
  
  // CORS - require explicit origin in production
  const corsOrigin = envConfig.CORS_ORIGIN === '*' && envConfig.NODE_ENV === 'production' 
    ? false // Disable CORS if wildcard in production (will be handled by reverse proxy)
    : envConfig.CORS_ORIGIN;
  app.use(cors({ origin: corsOrigin, credentials: true }));
  
  // Request size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  
  // HTTP logging
  app.use(httpLogger);

  // Skip rate limiting for health checks
  app.use(skipHealthCheck);
  
  // General API rate limiting
  app.use(apiLimiter);

  // Direct download and raw spec endpoints for Swagger / OpenAPI
  app.get('/docs/swagger.json', (_req, res) => {
    res.sendFile(path.join(__dirname, 'generated', 'swagger.json'));
  });

  // Root health alias. The handler itself lives on the `/api/v1` router (see
  // routes/index.ts), but the auth-gate allowlist, the rate-limiter skip list
  // and the smoke test all treat `/health` as a public path - so serve it at
  // the root too instead of letting it fall through to the 404 catch-all.
  app.get('/health', (_req, res) => {
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
  app.get('/docs/swagger.yaml', (_req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.sendFile(path.join(__dirname, 'generated', 'swagger.yaml'));
  });
  app.get('/docs/download/yaml', (_req, res) => {
    res.download(path.join(__dirname, 'generated', 'swagger.yaml'), 'swagger.yaml');
  });

  // Serve Interactive OpenAPI Swagger UI Docs
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const swaggerDocument = require('./generated/swagger.json');
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch {
    logger.info('Swagger spec not found. Run TSOA CLI to generate OpenAPI spec.');
  }

  // Strict rate limiting on the authentication endpoint (brute-force protection).
  // Mounted before the TSOA routes so it runs for `/auth/login` specifically.
  app.use('/auth/login', authLimiter);

  // ---------------------------------------------------------------------------
  // JWT authentication gate.
  //
  // Every endpoint requires a valid Bearer token EXCEPT the explicit allowlist
  // below. Mounted before the TSOA routes and the legacy routers so a single
  // check covers both, and after the health/swagger endpoints so probes and
  // API docs stay reachable without a token.
  // ---------------------------------------------------------------------------
  const PUBLIC_PATHS = new Set(['/health', '/api/v1/health', '/auth/login']);
  const PUBLIC_PREFIXES = ['/docs'];
  app.use((req: Request, res: Response, next: NextFunction) => {
    const p = req.path;
    if (PUBLIC_PATHS.has(p) || PUBLIC_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))) {
      return next();
    }
    // `authenticate` reports every failure through `next(error)`, which the
    // global error handler turns into a 401/403 JSON response.
    authenticate(req as AuthenticatedRequest, res, next).catch(next);
  });

  // ---------------------------------------------------------------------------
  // Role-based authorization gate (admin only).
  //
  // User management (`/users`) and the role pick-list (`/roles`) are strictly
  // administrator territory: regular accounts are created and managed BY an
  // admin, there is no self-registration path. Mounted after the auth gate so
  // `req.user` is always populated, and before the TSOA routes so both the
  // root-mounted TSOA handlers and any legacy alias are covered.
  // ---------------------------------------------------------------------------
  const ADMIN_ONLY_PATHS = new Set([
    '/users',
    '/roles',
    '/api/v1/users',
    '/api/v1/roles',
  ]);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const p = req.path;
    const isAdminResource =
      ADMIN_ONLY_PATHS.has(p) ||
      [...ADMIN_ONLY_PATHS].some((base) => p.startsWith(`${base}/`));
    if (!isAdminResource) {
      return next();
    }
    requireAdmin(req as AuthenticatedRequest, res, next).catch(next);
  });

  // Register TSOA Auto-Generated Routes with Inversify Container bindings
  if (RegisterRoutes) {
    RegisterRoutes(app);
  }

  // API Legacy / Manual Router Fallback
  app.use('/api/v1', routes);

  // `/api/parent-interactions/*` alias (see routes/parentInteraction.routes.ts).
  // Mounted AFTER the `/api/v1` router and BEFORE the TSOA catch-all so the
  // alias wins for its own paths while everything else falls through unchanged.
  app.use('/api', parentInteractionRoutes);

  // 404 Route Catch-All
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('Endpoint not found', HttpStatusCode.NOT_FOUND));
  });

  // Centralized Error Handling Middleware
  app.use(globalErrorHandler);

  return app;
}

async function startServer(): Promise<void> {
  try {
    await DatabaseManager.connect();
    // Idempotent default-admin seed: creates the ADMIN role and (only when no
    // administrator exists yet) the default admin account. See admin.seed.ts.
    await seedDefaultAdmin();
    const app = createApp();
    app.listen(envConfig.PORT, () => {
      logger.info(`Server running in ${envConfig.NODE_ENV} mode on port ${envConfig.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start application server', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}
