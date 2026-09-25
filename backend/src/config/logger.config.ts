import fs from 'fs';
import path from 'path';
import winston from 'winston';
import morgan from 'morgan';
import { RequestHandler } from 'express';
import { envConfig } from './env.config';

const isLoggingEnabled = envConfig.ENABLE_LOGGING;
const logsDir = path.resolve(process.cwd(), 'logs');

if (isLoggingEnabled) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const consoleFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const transports: winston.transport[] = [];

if (isLoggingEnabled) {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        consoleFormat
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
    })
  );
}

export const logger = winston.createLogger({
  level: envConfig.LOG_LEVEL,
  silent: !isLoggingEnabled,
  defaultMeta: { service: 'lumino1-baseline-backend' },
  transports,
});

const morganStream: morgan.StreamOptions = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

const passThrough: RequestHandler = (_req, _res, next) => {
  next();
};

export const httpLogger: RequestHandler = isLoggingEnabled
  ? morgan(envConfig.NODE_ENV === 'production' ? 'combined' : 'dev', {
      stream: morganStream,
    })
  : passThrough;
