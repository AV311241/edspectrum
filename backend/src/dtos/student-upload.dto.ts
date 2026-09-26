import { z } from 'zod';
import {
  schoolCodeSchema,
  classNameSchema,
  academicYearSchema,
  BatchUploadResultDTO,
  MAX_BULK_UPLOAD_ROWS,
} from './upload-common.dto';
import { StudentResponseDTO } from './student.dto';

/**
 * A single row of the "Students Master" Excel template.
 * Columns: studentId, schoolCode, className, academicYear, studentName, isActive
 */
export interface BatchStudentUploadRow {
  /** Maps to `Student.studentIdCode`. */
  studentId: string;
  schoolCode: string;
  className: string;
  academicYear: string;
  /** Full name; split server-side into firstName / lastName. */
  studentName: string;
  /** Defaults to `true` when the column is omitted or blank. */
  isActive?: boolean;
}

export interface BatchStudentUploadInput {
  students: BatchStudentUploadRow[];
  createdById?: number;
}

export type BatchStudentUploadResultDTO = BatchUploadResultDTO<StudentResponseDTO>;

/** Accepts TRUE/FALSE, 1/0, Y/N, YES/NO — mirrors Excel's boolean coercions. */
const truthy = new Set(['true', '1', 'yes', 'y', 't']);
const falsy = new Set(['false', '0', 'no', 'n', 'f']);

export function coerceIsActive(raw: unknown): boolean | null {
  if (raw === null || raw === undefined) return true;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') {
    if (raw === 1) return true;
    if (raw === 0) return false;
    return null;
  }
  const str = String(raw).trim().toLowerCase();
  if (str === '') return true;
  if (truthy.has(str)) return true;
  if (falsy.has(str)) return false;
  return null;
}

export const batchStudentUploadRowSchema = z.object({
  studentId: z
    .string({ required_error: 'studentId is required' })
    .trim()
    .min(1, 'studentId is required')
    .max(100, 'studentId must not exceed 100 characters'),
  schoolCode: schoolCodeSchema,
  className: classNameSchema,
  academicYear: academicYearSchema,
  studentName: z
    .string({ required_error: 'studentName is required' })
    .trim()
    .min(1, 'studentName is required')
    .max(200, 'studentName must not exceed 200 characters'),
  isActive: z.boolean().optional().default(true),
});

export const batchStudentUploadSchema = z.object({
  students: z
    .array(batchStudentUploadRowSchema)
    .min(1, 'At least one student row is required')
    .max(MAX_BULK_UPLOAD_ROWS, `A single upload cannot exceed ${MAX_BULK_UPLOAD_ROWS} rows`),
  createdById: z.number().int().positive().optional().default(1),
});
