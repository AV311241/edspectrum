import { PrismaClient, AuditAction } from '@prisma/client';
import { envConfig } from './env.config';
import { logger } from './logger.config';
import { getRequestContext } from '../utils/requestContext.utils';
import { invalidateByPrefixThrottled } from '../utils/cache.utils';
import { CACHE_PREFIX } from '../constants/cache.constants';

/**
 * Global declaration to retain PrismaClient singleton instance during HMR in development.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Build DATABASE_URL with connection pool parameters for production
 */
function buildDatabaseUrl(): string {
  const baseUrl = envConfig.DATABASE_URL;
  const url = new URL(baseUrl);
  
  // Add connection pool parameters for MySQL
  if (envConfig.NODE_ENV === 'production') {
    url.searchParams.set('connection_limit', '20');
    url.searchParams.set('pool_timeout', '10');
    url.searchParams.set('connect_timeout', '10');
  }
  
  return url.toString();
}

/**
 * Unextended PrismaClient singleton configured for MySQL / HeatWave.
 *
 * The base client lives on the global so HMR reuses one connection pool; the
 * audit extension below is re-applied to it on every module evaluation.
 */
const baseClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
    log:
      envConfig.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (envConfig.NODE_ENV !== 'production') {
  globalForPrisma.prisma = baseClient;
}

/**
 * Models that should be audited. Model names must match the Prisma client
 * property names (the camelCase form), because `params.model` carries those.
 */
const AUDITED_MODELS = new Set([
  'student',
  'school',
  'classSection',
  'baselineAssessment',
  'attendance',
  'parentInteraction',
  'user',
  'studentClassEnrollment',
  'homeVisit',
  'studentEngagementActivity',
]);

/** System fallback user id for writes that happen outside a request (seeds, scripts). */
const SYSTEM_USER_ID = 1;

/** Read actions never produce an audit row. */
const READ_ACTIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

/**
 * Client extension that writes a row to `audit_logs` for every mutation on an
 * audited model. (Prisma removed middleware `$use`; the `query` component of
 * `$extends` is the supported replacement and also runs inside interactive
 * transactions.)
 *
 * Attribution comes from the per-request `AsyncLocalStorage` context set by
 * `requestContextMiddleware`; a background job or seed simply records against
 * the system user. The write is fire-and-forget against the *base* client so it
 * never re-enters this extension and can never roll back or slow down the
 * caller's transaction.
 */
const auditedPrisma = baseClient.$extends({
  name: 'audit-logger',
  query: {
    $allModels: {
      async $allOperations({
        model,
        operation,
        args,
        query,
      }: {
        model?: string;
        operation: string;
        args: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query: (args: any) => Promise<any>;
      }) {
        // Only audit known models, and only mutation actions.
        if (!model) return query(args);
        const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
        if (!AUDITED_MODELS.has(modelKey)) return query(args);
        if (READ_ACTIONS.has(operation)) return query(args);

        const isMutation =
          operation === 'create' || operation === 'update' || operation === 'delete' ||
          operation === 'createMany' || operation === 'updateMany' || operation === 'deleteMany' ||
          operation === 'upsert';
        if (!isMutation) return query(args);

        const result = await query(args);

        // Resolve the affected row id for the audit record.
        let entityId: number | null = null;
        if (operation === 'delete' || operation === 'update' || operation === 'upsert') {
          const where = (args as { where?: { id?: unknown } } | undefined)?.where;
          if (where && typeof where.id === 'number') entityId = where.id;
        }
        if (entityId === null && result && typeof (result as { id?: unknown }).id === 'number') {
          entityId = (result as { id: number }).id;
        }

        const auditAction =
          operation === 'create' || operation === 'createMany' ? AuditAction.CREATE :
          operation === 'delete' || operation === 'deleteMany' ? AuditAction.DELETE :
          AuditAction.UPDATE;

        const context = getRequestContext();
        const summary = {
          action: operation,
          args,
          affected: Array.isArray(result) ? result.length : 1,
        };

        void baseClient.auditLog
          .create({
            data: {
              userId: context?.userId ?? SYSTEM_USER_ID,
              action: auditAction,
              entityName: model,
              entityId,
              details: JSON.stringify(summary),
              ipAddress: context?.ipAddress ?? null,
              userAgent: context?.userAgent ?? null,
            },
          })
          .catch((err: unknown) => {
            logger.error('Audit log write failed', {
              model,
              action: operation,
              error: err instanceof Error ? err.message : String(err),
            });
          });

        // A source-data write can change any dashboard figure, so drop the cached
        // `/metrics/*` responses. Throttled so a bulk upload cannot thrash the cache.
        invalidateByPrefixThrottled(CACHE_PREFIX.METRICS);

        return result;
      },
    },
  },
});

/**
 * The audit hook above is a pure interceptor - it adds no models, results or
 * client methods - so the extended client is re-exported with the plain
 * `PrismaClient` type. (Prisma types extended clients with stricter
 * `Exact<...>` argument types that are not assignable to `Prisma.TransactionClient`,
 * which would break every existing `tx: Prisma.TransactionClient` annotation.)
 * The runtime value is still the extended client, so auditing stays active.
 */
export const prisma: PrismaClient = auditedPrisma as unknown as PrismaClient;

/**
 * Database connection lifecycle manager.
 */
export class DatabaseManager {
  private static isConnected = false;

  public static async connect(): Promise<void> {
    if (this.isConnected) return;
    try {
      await prisma.$connect();
      this.isConnected = true;
      try {
        const parsedUrl = new URL(envConfig.DATABASE_URL);
        const databaseFromUrl = parsedUrl.pathname.replace(/^\//, '');
        if (databaseFromUrl && databaseFromUrl !== envConfig.DB_NAME) {
          logger.warn(
            `DATABASE_URL targets '${databaseFromUrl}' but DB_NAME is '${envConfig.DB_NAME}'. Prisma uses DATABASE_URL.`
          );
        }
        logger.info(
          `Prisma ORM connected via DATABASE_URL to '${databaseFromUrl}' at ${parsedUrl.hostname}:${parsedUrl.port || '3306'}`
        );
      } catch {
        logger.info('Prisma ORM connected using DATABASE_URL (DB_HOST/DB_NAME are not used by Prisma)');
      }
    } catch (error) {
      logger.error('Failed to establish connection to MySQL database via Prisma:', error);
      process.exit(1);
    }
  }

  public static async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    try {
      await prisma.$disconnect();
      this.isConnected = false;
      logger.info('Prisma ORM disconnected cleanly from MySQL database');
    } catch (error) {
      logger.error('Error disconnecting from MySQL database:', error);
    }
  }
}

// Graceful application shutdown listeners
process.on('beforeExit', async () => {
  await DatabaseManager.disconnect();
});

process.on('SIGINT', async () => {
  await DatabaseManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await DatabaseManager.disconnect();
  process.exit(0);
});

export default prisma;
