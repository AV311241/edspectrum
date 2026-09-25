import { PrismaClient } from '@prisma/client';
import { envConfig } from './env.config';
import { logger } from './logger.config';

/**
 * Global declaration to retain PrismaClient singleton instance during HMR in development.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton instance of PrismaClient configured for MySQL / HeatWave.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      envConfig.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (envConfig.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

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
