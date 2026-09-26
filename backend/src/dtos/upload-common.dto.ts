import { z } from 'zod';

/**
 * Shared DTOs for the centralized bulk Excel Data Upload pipeline.
 *
 * These contracts are deliberately *code-based* (schoolCode / className /
 * studentId string codes) because they mirror the human-facing Excel columns.
 * Code -> foreign-key resolution happens server-side inside the services so the
 * spreadsheet authors never need to know about numeric primary keys.
 */

/** Academic year must look like `2026-2027`. */
export const ACADEMIC_YEAR_REGEX = /^\d{4}-\d{4}$/;

/** Hard cap on rows accepted by a single bulk upload request. */
export const MAX_BULK_UPLOAD_ROWS = 5000;

export const schoolCodeSchema = z
  .string({ required_error: 'schoolCode is required' })
  .trim()
  .min(1, 'schoolCode is required')
  .max(50, 'schoolCode must not exceed 50 characters');

export const classNameSchema = z
  .string({ required_error: 'className is required' })
  .trim()
  .min(1, 'className is required')
  .max(50, 'className must not exceed 50 characters');

export const academicYearSchema = z
  .string({ required_error: 'academicYear is required' })
  .trim()
  .regex(ACADEMIC_YEAR_REGEX, 'academicYear must match the format YYYY-YYYY (e.g. 2026-2027)');

/**
 * A single row-scoped failure. Deliberately mirrors the frontend
 * `ValidationError` shape so the upload page can render server-detected
 * problems in exactly the same error matrix as client-side ones.
 */
export interface RowErrorDTO {
  /** 1-based spreadsheet row number, matching what the user sees in Excel. */
  rowIndex: number;
  columnName: string;
  invalidValue: unknown;
  errorMessage: string;
  severity: 'ERROR' | 'WARNING';
}

export interface BatchUploadResultDTO<T = Record<string, unknown>> {
  totalRows: number;
  created: number;
  skipped: number;
  failed: number;
  records: T[];
  errors: RowErrorDTO[];
}

/** True when the result contains at least one hard row-level failure. */
export function batchUploadHasErrors<T>(result: BatchUploadResultDTO<T>): boolean {
  return result.errors.some((e) => e.severity === 'ERROR');
}
