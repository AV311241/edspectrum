import { z } from 'zod';
import { Gender, StudentStatus, EnrollmentStatus } from '@prisma/client';

export interface CreateStudentInput {
  schoolId: number;
  studentIdCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  classId?: number | null;
  createdById?: number;
}

export interface UpdateStudentInput {
  schoolId?: number;
  studentIdCode?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  classId?: number | null;
  status?: StudentStatus;
}

export interface EnrollStudentInput {
  classSectionId: number;
}

export interface UnenrollStudentInput {
  classSectionId?: number;
  reason?: string;
}

export interface TransferStudentInput {
  fromClassSectionId?: number;
  toClassSectionId: number;
  reason?: string;
}

export interface StudentFilterQuery {
  page?: number;
  limit?: number;
  schoolId?: number;
  classId?: number;
  status?: StudentStatus;
  search?: string;
}

export interface EnrollmentRecordDTO {
  id: number;
  studentId: number;
  classSectionId: number;
  schoolId: number | null;
  withdrawnDate: string | null;
  status: EnrollmentStatus;
  isCurrent: boolean;
  createdAt: string;
  className?: string;
}

export interface StudentResponseDTO {
  id: number;
  schoolId: number;
  classId: number | null;
  studentIdCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
  createdById: number;
  schoolName?: string;
  className?: string;
  currentEnrollment?: EnrollmentRecordDTO | null;
}

export interface PaginatedStudentResponseDTO {
  records: StudentResponseDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const createStudentSchema = z.object({
  schoolId: z.number({ required_error: 'schoolId is required' }).int().positive('schoolId must be positive'),
  studentIdCode: z.string({ required_error: 'studentIdCode is required' }).min(1, 'studentIdCode is required').max(100),
  firstName: z.string({ required_error: 'firstName is required' }).min(1, 'firstName is required').max(100),
  lastName: z.string({ required_error: 'lastName is required' }).min(1, 'lastName is required').max(100),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be formatted YYYY-MM-DD')
    .nullable()
    .optional(),
  gender: z.nativeEnum(Gender).nullable().optional(),
  classId: z.number().int().positive().nullable().optional(),
  createdById: z.number().int().positive().optional().default(1),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  status: z.nativeEnum(StudentStatus).optional(),
});

export const enrollStudentSchema = z.object({
  classSectionId: z.number({ required_error: 'classSectionId is required' }).int().positive('classSectionId must be positive'),
});

export const unenrollStudentSchema = z.object({
  classSectionId: z.number().int().positive().optional(),
  reason: z.string().max(255).optional(),
});

export const transferStudentSchema = z.object({
  fromClassSectionId: z.number().int().positive().optional(),
  toClassSectionId: z.number({ required_error: 'toClassSectionId is required' }).int().positive('toClassSectionId must be positive'),
  reason: z.string().max(255).optional(),
});

export const studentFilterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  schoolId: z.coerce.number().int().positive().optional(),
  classId: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(StudentStatus).optional(),
  search: z.string().optional(),
});
