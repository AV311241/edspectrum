import { z } from 'zod';
import { ClassStatus, Gender, StudentStatus } from '@prisma/client';

export interface CreateClassInput {
  schoolId: number;
  gradeId?: number | null;
  className: string;
  section: string;
  name: string;
  academicYear?: string | null;
  assessmentCycle?: string | null;
  capacity?: number;
  createdById?: number;
}

export interface UpdateClassInput {
  schoolId?: number;
  gradeId?: number | null;
  className?: string;
  section?: string;
  name?: string;
  academicYear?: string | null;
  assessmentCycle?: string | null;
  capacity?: number;
  status?: ClassStatus;
}

export interface ClassFilterQuery {
  page?: number;
  limit?: number;
  schoolId?: number;
  gradeId?: number;
  status?: ClassStatus;
  academicYear?: string;
  search?: string;
}

export interface EnrolledStudentSummaryDTO {
  id: number;
  studentIdCode: string;
  firstName: string;
  lastName: string;
  gender: Gender | null;
  status: StudentStatus;
  enrolledAt: string;
}

export interface ClassResponseDTO {
  id: number;
  schoolId: number;
  gradeId: number | null;
  className: string;
  section: string;
  name: string;
  academicYear: string | null;
  status: ClassStatus;
  assessmentCycle: string | null;
  capacity: number;
  enrolledCount: number;
  availableSeats: number;
  createdAt: string;
  updatedAt: string;
  createdById: number;
  schoolName?: string;
  gradeName?: string;
  enrolledStudents?: EnrolledStudentSummaryDTO[];
}

export interface PaginatedClassResponseDTO {
  records: ClassResponseDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const createClassSchema = z.object({
  schoolId: z.number({ required_error: 'schoolId is required' }).int().positive('schoolId must be positive'),
  gradeId: z.number().int().positive().nullable().optional(),
  className: z.string({ required_error: 'className is required' }).min(1, 'className is required').max(50),
  section: z.string({ required_error: 'section is required' }).min(1, 'section is required').max(10),
  name: z.string({ required_error: 'name is required' }).min(1, 'name is required').max(100),
  academicYear: z.string().max(20).nullable().optional(),
  assessmentCycle: z.string().max(50).nullable().optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(500, 'Capacity cannot exceed 500').default(40),
  createdById: z.number().int().positive().optional().default(1),
});

export const updateClassSchema = createClassSchema.partial().extend({
  status: z.nativeEnum(ClassStatus).optional(),
});

export const classFilterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  schoolId: z.coerce.number().int().positive().optional(),
  gradeId: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(ClassStatus).optional(),
  academicYear: z.string().optional(),
  search: z.string().optional(),
});
