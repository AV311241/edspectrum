import { z } from 'zod';
import {
  schoolCodeSchema,
  classNameSchema,
  academicYearSchema,
  RowErrorDTO,
  BatchUploadResultDTO,
  MAX_BULK_UPLOAD_ROWS,
} from './upload-common.dto';
import { AttendanceResponseDTO } from './attendance.dto';

/**
 * Markable per-student statuses. `CANCELLED` is handled separately because it is
 * a class-wide record (studentId = null) rather than a per-student mark.
 */
export const MARKABLE_ATTENDANCE_STATUSES = ['P', 'A', 'HALF_DAY', 'ACTIVITY'] as const;
export type MarkableAttendanceStatus = (typeof MARKABLE_ATTENDANCE_STATUSES)[number];

export const ALL_ATTENDANCE_STATUSES = [...MARKABLE_ATTENDANCE_STATUSES, 'CANCELLED'] as const;
export type UploadAttendanceStatus = (typeof ALL_ATTENDANCE_STATUSES)[number];

export const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A single attendance row, in EITHER the row-based format:
 *   schoolCode, className, academicYear, sessionDate, studentId, status, remarks
 * or the pivoted equivalent produced from the Excel matrix (grid) format.
 *
 * `studentId` is optional *only* when `status === 'CANCELLED'`, which encodes a
 * class-wide session cancellation and therefore requires `remarks`.
 */
export interface BulkAttendanceUploadRow {
  schoolCode: string;
  className: string;
  academicYear: string;
  sessionDate: string;
  studentId?: string | null;
  status: UploadAttendanceStatus;
  remarks?: string | null;
}

export interface BulkAttendanceUploadInput {
  records: BulkAttendanceUploadRow[];
}

export interface BulkAttendanceUploadResultDTO extends BatchUploadResultDTO<AttendanceResponseDTO> {
  /** Number of class-wide cancellation records created. */
  cancellations: number;
  /** Number of distinct (class, date) sessions touched. */
  sessionsProcessed: number;
}

export const bulkAttendanceUploadRowSchema = z
  .object({
    schoolCode: schoolCodeSchema,
    className: classNameSchema,
    academicYear: academicYearSchema,
    sessionDate: z
      .string({ required_error: 'sessionDate is required' })
      .trim()
      .regex(isoDateRegex, 'sessionDate must be formatted YYYY-MM-DD'),
    studentId: z
      .string()
      .trim()
      .min(1, 'studentId must not be blank')
      .max(100)
      .nullable()
      .optional(),
    status: z.enum(ALL_ATTENDANCE_STATUSES, {
      errorMap: () => ({ message: `status must be one of: ${ALL_ATTENDANCE_STATUSES.join(', ')}` }),
    }),
    remarks: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((row, ctx) => {
    const isCancellation = row.status === 'CANCELLED';
    if (isCancellation) {
      if (!row.remarks) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['remarks'],
          message: 'remarks is required when status is CANCELLED (e.g. "School function")',
        });
      }
    } else if (!row.studentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['studentId'],
        message: `studentId is required when status is ${row.status}`,
      });
    }
  });

export const bulkAttendanceUploadSchema = z.object({
  records: z
    .array(bulkAttendanceUploadRowSchema)
    .min(1, 'At least one attendance row is required')
    .max(MAX_BULK_UPLOAD_ROWS, `A single upload cannot exceed ${MAX_BULK_UPLOAD_ROWS} rows`),
});

export type { RowErrorDTO };
