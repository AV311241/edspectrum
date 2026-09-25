import { Request, Response, NextFunction } from 'express';
import { ValidateError } from 'tsoa';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';
import { logger } from '../config/logger.config';

export const globalErrorHandler = (
  err: Error | AppError | ValidateError | ZodError | Prisma.PrismaClientKnownRequestError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Handle TSOA Validation Errors (400 Bad Request)
  if (err instanceof ValidateError) {
    logger.warn(`TSOA Validation Error: ${err.message}`, { fields: err.fields });
    res.status(HttpStatusCode.BAD_REQUEST).json({
      success: false,
      statusCode: HttpStatusCode.BAD_REQUEST,
      error: {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: err.fields,
      },
    });
    return;
  }

  // 2. Handle Zod Validation Errors (400 Bad Request)
  if (err instanceof ZodError) {
    const issues = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    logger.warn(`Zod Validation Error: ${err.message}`, { issues });
    res.status(HttpStatusCode.BAD_REQUEST).json({
      success: false,
      statusCode: HttpStatusCode.BAD_REQUEST,
      error: {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: issues,
      },
    });
    return;
  }

  // 3. Handle AppError (Custom Operational Errors: 400, 404, 409, 500, etc.)
  if (err instanceof AppError) {
    logger.warn(`Operational Error (${err.statusCode}): ${err.message}`, { details: err.details });
    const codeName = HttpStatusCode[err.statusCode] || 'ERROR';
    res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      error: {
        code: codeName,
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }

  // 4. Handle Prisma Known Database Errors (e.g. P2002 Duplicate Key -> 409 Conflict, P2025 Not Found -> 404 Not Found)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      logger.warn(`Prisma Unique Constraint Violation on target: ${target}`);
      res.status(HttpStatusCode.CONFLICT).json({
        success: false,
        statusCode: HttpStatusCode.CONFLICT,
        error: {
          code: 'CONFLICT',
          message: `A record with this ${target} already exists.`,
          details: err.meta ?? null,
        },
      });
      return;
    }

    if (err.code === 'P2025') {
      logger.warn(`Prisma Record Not Found: ${err.message}`);
      res.status(HttpStatusCode.NOT_FOUND).json({
        success: false,
        statusCode: HttpStatusCode.NOT_FOUND,
        error: {
          code: 'NOT_FOUND',
          message: 'Requested record was not found in the database.',
          details: null,
        },
      });
      return;
    }
  }

  // 5. Unhandled Internal Server Errors (500)
  logger.error(`Unhandled Error: ${err.message}`, { stack: err.stack });
  res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
    success: false,
    statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred',
      details: null,
    },
  });
};
