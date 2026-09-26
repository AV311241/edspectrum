import { z } from 'zod';
import { SchoolStatus } from '@prisma/client';

export interface SchoolSummaryDTO {
  id: number;
  code: string;
  name: string;
  status: SchoolStatus;
}

export interface CreateSchoolInput {
  code: string;
  name: string;
}

export interface CreateSchoolClassInput {
  className: string;
  academicYear: string;
}

export interface SchoolClassDTO {
  id: number;
  className: string;
  academicYear: string | null;
  totalStudents: number;
  createdAt: string;
}

export interface SchoolClassesResponseDTO {
  school: Pick<SchoolSummaryDTO, 'id' | 'code' | 'name'>;
  classes: SchoolClassDTO[];
}

export const createSchoolSchema = z.object({
  code: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(255),
});

export const createSchoolClassSchema = z.object({
  className: z.string().trim().min(1).max(50),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Academic year must be YYYY-YYYY format (e.g. 2026-2027)'),
});