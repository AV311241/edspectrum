import { RowErrorDTO, BatchUploadResultDTO } from './upload-common.dto';
import { AttendanceResponseDTO } from './attendance.dto';
import {
  codeBasedAttendanceRowSchema,
  CodeBasedAttendanceUploadSchema,
} from '../schemas/attendance-upload.schema';

/**
 * Markable per-student statuses. Derived from the canonical constants so
 * `ON_LEAVE` (and any future status) cannot be missed here.
 */
export const MARKABLE_ATTENDANCE_STATUSES = [
  'P',
  'A',
  'HALF_DAY',
  'ACTIVITY',
  'ON_LEAVE',
] as const;
export type MarkableAttendanceStatus = (typeof MARKABLE_ATTENDANCE_STATUSES)[number];

export const ALL_ATTENDANCE_STATUSES = [
  ...MARKABLE_ATTENDANCE_STATUSES,
  'CANCELLED',
] as const;
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

/**
 * Row schema for the code-based form. Re-exported from the canonical schema
 * module so the Excel cleansing rules, the `studentId`/`remarks` conditionals
 * and the status enum exist in exactly one place.
 */
export const bulkAttendanceUploadRowSchema = codeBasedAttendanceRowSchema;

export const bulkAttendanceUploadSchema = CodeBasedAttendanceUploadSchema;

export type { RowErrorDTO };
