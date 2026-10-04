import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  ENABLE_LOGGING: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  // Authentication
  JWT_SECRET: z.string().min(16).default('dev-only-insecure-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform((val) => parseInt(val, 10)).default('3306'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default('password'),
  DB_NAME: z.string().default('edspectrum'),
  DATABASE_URL: z.string().default('mysql://root:root@localhost:3306/edspectrum'),
  // Cache (optional - falls back to in-memory when unset)
  REDIS_URL: z.string().optional(),
  CACHE_TTL_SECONDS: z.string().transform((val) => parseInt(val, 10)).default('300'),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('Invalid environment configuration:', parseResult.error.format());
  throw new Error('Environment variable validation failed');
}

export const envConfig = parseResult.data;
