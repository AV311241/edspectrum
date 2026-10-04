import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { envConfig } from '../config/env.config';

import { HttpStatusCode } from '../constants/httpStatus.constants';

/**
 * Create a rate limiter with consistent configuration
 */
function createRateLimiter(
  windowMs: number,
  max: number,
  message: string,
  keyGenerator?: (req: Request) => string
) {
  return rateLimit({
    windowMs,
    max: envConfig.NODE_ENV === 'production' ? max : max * 10, // More lenient in development
    message: {
      success: false,
      statusCode: HttpStatusCode.TOO_MANY_REQUESTS,
      error: {
        code: 'RATE_LIMITED',
        message,
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => req.ip || 'unknown'),
    handler: (_req, res, _next, options) => {
      res.status(HttpStatusCode.TOO_MANY_REQUESTS).json(options.message);
    },
  });
}

/**
 * General API rate limiter - 100 requests per 15 minutes in production
 */
export const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many requests from this IP, please try again later.'
);

/**
 * Strict rate limiter for authentication endpoints - 5 requests per hour
 */
export const authLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  5,
  'Too many authentication attempts, please try again later.'
);

/**
 * Stricter rate limiter for sensitive operations - 10 requests per 15 minutes
 */
export const sensitiveOperationLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  'Too many sensitive operations, please try again later.'
);

/**
 * Rate limiter for bulk upload endpoints - 5 requests per hour
 */
export const bulkUploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  5,
  'Too many bulk upload attempts, please try again later.'
);

/**
 * Rate limiter per user (instead of per IP) for authenticated routes
 */
export const userRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  200,
  'Too many requests, please try again later.',
  (req) => (req as any).user?.id?.toString() || req.ip || 'unknown'
);

/**
 * Middleware to skip rate limiting for health checks
 */
export const skipHealthCheck = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.path === '/health' || req.path === '/api/v1/health') {
    return next();
  }
  next();
};