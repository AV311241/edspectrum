import { z } from 'zod';
import {
  ATTENDANCE_STATUS_VALUES,
  ATTENDANCE_CLASS_WIDE_STATUSES,
  AttendanceStatusValue,
} from '../constants/attendance.constants';
import { MAX_BULK_UPLOAD_ROWS } from '../dtos/upload-common.dto';

/**
 * Canonical Zod contract for the Daily Attendance bulk upload.
 *
 * This module is the single source of truth for the wire format. The upload
 * page applies the same cleansing rules in the browser (see
 * `attendance-upload.service.ts`) so users get row-scoped errors before a
 * request is made, and the backend re-runs this schema as the authoritative
 * gate.
 *
 * Unlike the NestJS original, this repository is Express + tsoa, so the schema
 * is invoked via `schema.parse()` in the controller. The central
 * `globalErrorHandler` already maps `ZodError` to a 400 with per-field paths -
 * exactly what a `ZodValidationPipe` would have produced.
 */

export const AttendanceStatusSchema = z.enum(ATTENDANCE_STATUS_VALUES, {
  errorMap: () => ({
    message: `status must be one of: ${ATTENDANCE_STATUS_VALUES.join(', ')}`,
  }),
});

export type { AttendanceStatusValue };

/** Statuses that describe an entire session rather than a single student. */
export function isClassWideStatus(status: string): boolean {
  return (ATTENDANCE_CLASS_WIDE_STATUSES as readonly string[]).includes(status);
}

/**
 * Fold the spellings real school spreadsheets contain into the canonical
 * statuses. Case, separators and stray padding are ignored. Anything that does
 * not match is returned untouched so `AttendanceStatusSchema` raises the error
 * rather than this function guessing.
 *
 * Deliberately strict: a token is only accepted when it maps unambiguously to
 * one status, so typos surface instead of silently becoming "present".
 */
const EXACT_STATUS_ALIASES: Record<string, AttendanceStatusValue> = {
  p: 'P',
  present: 'P',
  pr: 'P',
  a: 'A',
  ab: 'A',
  absent: 'A',
  abs: 'A',
  half_day: 'HALF_DAY',
  halfday: 'HALF_DAY',
  hd: 'HALF_DAY',
  activity: 'ACTIVITY',
  act: 'ACTIVITY',
  on_leave: 'ON_LEAVE',
  leave: 'ON_LEAVE',
  ol: 'ON_LEAVE',
  cancelled: 'CANCELLED',
  canceled: 'CANCELLED',
  cancel: 'CANCELLED',
  holiday: 'CANCELLED',
  school_holiday: 'CANCELLED',
};

/** Tokens implying a held session, which this codebase models as ACTIVITY. */
const ACTIVITY_HINTS = ['activit', 'function', 'outing', 'dance', 'sports'];

export function cleanseExcelStatus(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s\-.]+/g, '_')
    .replace(/_+/g, '_');

  if (!normalized) return value;
  if (EXACT_STATUS_ALIASES[normalized]) return EXACT_STATUS_ALIASES[normalized];

  // Broader substring matches, ordered so the more specific token wins.
  if (normalized.includes('half') && normalized.includes('day')) return 'HALF_DAY';
  if (normalized.includes('leave')) return 'ON_LEAVE';
  if (normalized.includes('cancel') || normalized.includes('holiday')) return 'CANCELLED';
  // NOTE: "school function" maps to ACTIVITY, not CANCELLED. This diverges from
  // the original brief, which mapped it to CANCELLED, because this codebase
  // already defines ACTIVITY as "a full present day (school function / outing)"
  // in attendance.constants.ts. Mapping it to CANCELLED would have excluded a
  // genuinely held session from the working-day denominator and understated
  // attendance. A non-session day is expressed as a holiday/closure instead.
  if (ACTIVITY_HINTS.some((hint) => normalized.includes(hint))) return 'ACTIVITY';
  if (normalized.startsWith('present')) return 'P';
  if (normalized.startsWith('absent')) return 'A';

  return value;
}

// ---------------------------------------------------------------------------
// Single record
// ---------------------------------------------------------------------------

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const sessionDateSchema = z
  .string({ required_error: 'sessionDate is required' })
  .trim()
  .regex(ISO_DATE_REGEX, 'sessionDate must be in YYYY-MM-DD format')
  .refine((value) => {
    // Guards against syntactically valid but impossible dates such as 2026-02-31.
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'sessionDate is not a valid calendar date');

/**
 * Excel writes identifiers as text or a number depending on the column format,
 * so both are accepted and normalised to a trimmed string.
 */
const studentIdSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

const remarksSchema = z
  .string({ invalid_type_error: 'remarks must be a string' })
  .trim()
  .max(2000, 'remarks must not exceed 2000 characters')
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

export const singleAttendanceRecordBaseSchema = z.object({
  studentId: studentIdSchema,
  sessionDate: sessionDateSchema,
  status: z.preprocess(cleanseExcelStatus, AttendanceStatusSchema),
  remarks: remarksSchema,
});

/**
 * A class-wide cancellation has no student but must be justified; every other
 * status must name a student.
 *
 * Applied via `superRefine` on top of the *base object* so the code-based
 * variant can still `.extend()` the base shape (Zod forbids extending an
 * already-wrapped `ZodEffects`).
 */
function refineStudentOrCancellation(
  data: { studentId?: string | null; status: string; remarks?: string | null },
  ctx: z.RefinementCtx
): void {
  if (isClassWideStatus(data.status)) {
    if (!data.remarks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['remarks'],
        message:
          'remarks is required for a class-wide CANCELLED session (e.g. "School function")',
      });
    }
    return;
  }
  if (!data.studentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['studentId'],
      message: `studentId is required when status is ${data.status}`,
    });
  }
}

export const SingleAttendanceRecordSchema =
  singleAttendanceRecordBaseSchema.superRefine(refineStudentOrCancellation);

export type SingleAttendanceRecord = z.infer<typeof SingleAttendanceRecordSchema>;

// ---------------------------------------------------------------------------
// Batch payloads
// ---------------------------------------------------------------------------

/**
 * Envelope form: the class is identified once by numeric primary key and every
 * record only carries per-student data.
 */
export const BatchAttendanceUploadSchema = z.object({
  schoolId: z
    .number({ required_error: 'schoolId is required' })
    .int('schoolId must be an integer')
    .positive('schoolId must be positive'),
  classSectionId: z
    .number({ required_error: 'classSectionId is required' })
    .int('classSectionId must be an integer')
    .positive('classSectionId must be positive'),
  records: z
    .array(SingleAttendanceRecordSchema)
    .min(1, 'At least one record is required')
    .max(MAX_BULK_UPLOAD_ROWS, `A single upload cannot exceed ${MAX_BULK_UPLOAD_ROWS} rows`),
});

export type BatchAttendanceUploadDTO = z.infer<typeof BatchAttendanceUploadSchema>;

/**
 * Code-based form (the Excel-sheet contract): each record names its school and
 * class by human-readable code, so one sheet may span several classes. This is
 * what the upload wizard sends, including after pivoting a matrix sheet.
 */
export const codeBasedAttendanceRowSchema = singleAttendanceRecordBaseSchema
  .extend({
    schoolCode: z
      .string({ required_error: 'schoolCode is required' })
      .trim()
      .min(1, 'schoolCode is required')
      .max(50),
    className: z
      .string({ required_error: 'className is required' })
      .trim()
      .min(1, 'className is required')
      .max(50),
    academicYear: z
      .string({ required_error: 'academicYear is required' })
      .trim()
      .regex(/^\d{4}-\d{4}$/, 'academicYear must be formatted YYYY-YYYY (e.g. 2026-2027)'),
  })
  .superRefine(refineStudentOrCancellation);

export const CodeBasedAttendanceUploadSchema = z.object({
  records: z
    .array(codeBasedAttendanceRowSchema)
    .min(1, 'At least one record is required')
    .max(MAX_BULK_UPLOAD_ROWS, `A single upload cannot exceed ${MAX_BULK_UPLOAD_ROWS} rows`),
});

export type CodeBasedAttendanceUploadDTO = z.infer<typeof CodeBasedAttendanceUploadSchema>;

/**
 * Both shapes are accepted on the same route. `classSectionId` is the
 * discriminator: present => envelope form, absent => per-row codes. Supporting
 * both lets the per-class flow and the multi-class matrix flow share one
 * endpoint instead of forcing a breaking change on either.
 */
export const AttendanceUploadRequestSchema = z.union([
  BatchAttendanceUploadSchema,
  CodeBasedAttendanceUploadSchema,
]);

export type AttendanceUploadRequestDTO = z.infer<typeof AttendanceUploadRequestSchema>;

export function isEnvelopeForm(
  payload: AttendanceUploadRequestDTO
): payload is BatchAttendanceUploadDTO {
  return 'classSectionId' in payload;
}

