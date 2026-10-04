import { z } from 'zod';
import { UserStatus } from '@prisma/client';

export interface CreateUserDTO {
  email: string;
  firstName: string;
  lastName: string;
  password: string; // Plain password - will be hashed in service
  roleId: number;
}

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  password: z.string().min(8).max(128), // Stronger password requirements
  roleId: z.number().int().positive(),
});

export interface UserResponseDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number;
  status: UserStatus;
  schoolId: number | null;
  createdAt: Date;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
