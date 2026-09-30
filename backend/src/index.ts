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
import { HttpStatusCode } from './constants/httpStatus.constants';
import routes from './routes';
import parentInteractionRoutes from './routes/parentInteraction.routes';

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

  // Security & Core Middlewares
  app.use(helmet());
  app.use(cors({ origin: envConfig.CORS_ORIGIN }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(httpLogger);

  // Direct download and raw spec endpoints for Swagger / OpenAPI
  app.get('/docs/swagger.json', (_req, res) => {
    res.sendFile(path.join(__dirname, 'generated', 'swagger.json'));
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
