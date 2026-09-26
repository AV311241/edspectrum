import { z } from 'zod';
import {
  schoolCodeSchema,
  classNameSchema,
  academicYearSchema,
  RowErrorDTO,
  BatchUploadResultDTO,
  MAX_BULK_UPLOAD_ROWS,
} from './upload-common.dto';
import { ClassResponseDTO } from './class.dto';

/**
 * A single row of the "Classes Master" Excel template.
 * Columns: schoolCode, className, academicYear (plus two optional overrides).
 */
export interface BatchClassUploadRow {
  schoolCode: string;
  className: string;
  academicYear: string;
  /** Defaults to `'A'` when omitted. */
  section?: string | null;
  /** Defaults to `"<schoolCode> <className>"` when omitted. */
  name?: string | null;
  capacity?: number | null;
}

export interface BatchClassUploadInput {
  classes: BatchClassUploadRow[];
  createdById?: number;
}

export type BatchClassUploadResultDTO = BatchUploadResultDTO<ClassResponseDTO>;

export const batchClassUploadRowSchema = z.object({
  schoolCode: schoolCodeSchema,
  className: classNameSchema,
  academicYear: academicYearSchema,
  section: z.string().trim().min(1).max(10).nullable().optional(),
  name: z.string().trim().min(1).max(100).nullable().optional(),
  capacity: z.coerce.number().int().min(1, 'capacity must be at least 1').max(500, 'capacity cannot exceed 500').nullable().optional(),
});

export const batchClassUploadSchema = z.object({
  classes: z
    .array(batchClassUploadRowSchema)
    .min(1, 'At least one class row is required')
    .max(MAX_BULK_UPLOAD_ROWS, `A single upload cannot exceed ${MAX_BULK_UPLOAD_ROWS} rows`),
  createdById: z.number().int().positive().optional().default(1),
});

export type { RowErrorDTO };
