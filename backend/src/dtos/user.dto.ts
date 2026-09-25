import { z } from 'zod';

export interface CreateUserDTO {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  roleId: number;
}

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  passwordHash: z.string().min(6),
  roleId: z.number().int().positive(),
});

export interface UserResponseDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number;
  status: string;
  createdAt: Date;
}
