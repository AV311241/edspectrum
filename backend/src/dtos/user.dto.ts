import { z } from 'zod';
import { UserStatus } from '@prisma/client';

export interface CreateUserDTO {
  email: string;
  firstName: string;
  lastName: string;
  password: string; // Plain password - will be hashed in service
  roleId: number;
  schoolId?: number | null;
  status?: UserStatus;
}

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  password: z.string().min(8).max(128), // Stronger password requirements
  roleId: z.number().int().positive(),
  schoolId: z.number().int().positive().nullable().optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

/**
 * Admin-driven edit of an existing user. Every field is optional - the
 * controller merges the provided keys onto the stored record - but at least
 * one field must be present so a stray empty PUT is a 400, not a no-op write.
 */
export interface UpdateUserDTO {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string; // Plain password - will be re-hashed in service
  roleId?: number;
  schoolId?: number | null;
  status?: UserStatus;
}

export const updateUserSchema = z
  .object({
    email: z.string().email().optional(),
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    password: z.string().min(8).max(128).optional(),
    roleId: z.number().int().positive().optional(),
    schoolId: z.number().int().positive().nullable().optional(),
    status: z.nativeEnum(UserStatus).optional(),
  })
  .refine((fields) => Object.values(fields).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

export interface UserResponseDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number;
  /**
   * Role code (e.g. 'ADMIN') resolved from the `roles` table. Lets callers do
   * role-based checks without hardcoding numeric role ids, which are only
   * stable because the seed creates the ADMIN role first.
   */
  roleCode: string;
  status: UserStatus;
  schoolId: number | null;
  createdAt: Date;
}

/** A row from the `roles` table - the pick-list for admin user creation. */
export interface RoleResponseDTO {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

/** Body returned by destructive admin endpoints (`DELETE /users/{id}`). */
export interface DeleteResponseDTO {
  success: boolean;
  message: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
