import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';
import { prisma } from '../config/db.config';
import { UserStatus } from '@prisma/client';
import { runWithRequestContext, getRequestContext, RequestContext } from '../utils/requestContext.utils';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    roleId: number;
    schoolId: number | null;
    status: UserStatus;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'];

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable must be set in production');
}

/**
 * Establishes the per-request AsyncLocalStorage context.
 *
 * Mounted as the FIRST middleware so every downstream layer - including the
 * Prisma audit middleware - can read the request metadata. The context object is
 * mutated later by `authenticate`/`optionalAuth` to attach the user id.
 */
export const requestContextMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const context: RequestContext = {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
  runWithRequestContext(context, () => next());
};

export interface JwtPayload {
  id: number;
  email: string;
  roleId: number;
  schoolId: number | null;
  status: UserStatus;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for a user
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token and return decoded payload
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * Authentication middleware - validates JWT token and attaches user to request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', HttpStatusCode.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        roleId: true,
        schoolId: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppError('User no longer exists', HttpStatusCode.UNAUTHORIZED);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError('Account is deactivated', HttpStatusCode.FORBIDDEN);
    }

    req.user = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      schoolId: user.schoolId,
      status: user.status,
    };

    // Attach to the audit context so writes are attributed to this user.
    const context = getRequestContext();
    if (context) context.userId = user.id;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', HttpStatusCode.UNAUTHORIZED));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', HttpStatusCode.UNAUTHORIZED));
    } else {
      next(error);
    }
  }
};

/**
 * Optional authentication - attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        roleId: true,
        schoolId: true,
        status: true,
      },
    });

    if (user && user.status === UserStatus.ACTIVE) {
      req.user = {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        schoolId: user.schoolId,
        status: user.status,
      };
    }

    next();
  } catch {
    // Silently ignore invalid tokens for optional auth
    next();
  }
};

/**
 * Authorization middleware - checks if user has required role(s)
 */
export const authorize = (...allowedRoles: number[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', HttpStatusCode.UNAUTHORIZED));
    }

    if (!allowedRoles.includes(req.user.roleId)) {
      return next(new AppError('Insufficient permissions', HttpStatusCode.FORBIDDEN));
    }

    next();
  };
};

// ---------------------------------------------------------------------------
// Admin-only authorization.
//
// Role ids are AUTO_INCREMENT values, so hardcoding `roleId === 1` silently
// breaks on any database where the ADMIN role was not the first row inserted.
// Instead the role is looked up by its stable `code`, memoized after the
// first successful read (roles are reference data and never change id).
// ---------------------------------------------------------------------------

/** Canonical role code for the platform administrator role. */
export const ADMIN_ROLE_CODE = 'ADMIN';

let adminRoleIdCache: number | null = null;

/**
 * Resolve the id of the ADMIN role, caching it for the process lifetime.
 * Returns `null` when the role does not exist yet (no admin can exist then
 * either, so denying is correct); the cache is only populated on success so
 * a role created after boot is picked up on a later request.
 */
export async function getAdminRoleId(): Promise<number | null> {
  if (adminRoleIdCache !== null) return adminRoleIdCache;
  const role = await prisma.role.findUnique({
    where: { code: ADMIN_ROLE_CODE },
    select: { id: true },
  });
  if (role) adminRoleIdCache = role.id;
  return role?.id ?? null;
}

/**
 * Role-based authorization middleware - rejects every caller that is not an
 * ACTIVE administrator. Must be mounted AFTER `authenticate`, which is what
 * populates `req.user`.
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', HttpStatusCode.UNAUTHORIZED));
    }

    const adminRoleId = await getAdminRoleId();
    if (adminRoleId === null || req.user.roleId !== adminRoleId) {
      return next(new AppError('Administrator access required', HttpStatusCode.FORBIDDEN));
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * School-scoped authorization - users can only access data from their school (unless admin)
 */
export const authorizeSchoolAccess = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    return next(new AppError('Authentication required', HttpStatusCode.UNAUTHORIZED));
  }

  try {
    // Admins can access all schools; resolved by role code, not a hardcoded id.
    const adminRoleId = await getAdminRoleId();
    if (adminRoleId !== null && req.user.roleId === adminRoleId) {
      return next();
    }

    // For school-scoped resources, check if user belongs to the school
    const schoolId = req.params.schoolId
      ? parseInt(req.params.schoolId, 10)
      : req.query.schoolId
        ? parseInt(req.query.schoolId as string, 10)
        : req.body.schoolId
          ? parseInt(req.body.schoolId, 10)
          : null;

    if (schoolId && req.user.schoolId !== schoolId) {
      return next(new AppError('Access denied: resource belongs to a different school', HttpStatusCode.FORBIDDEN));
    }

    next();
  } catch (error) {
    next(error);
  }
};