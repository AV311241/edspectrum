import { z } from 'zod';
import { MAX_BULK_UPLOAD_ROWS, RowErrorDTO, BatchUploadResultDTO } from './upload-common.dto';
import {
  PARENT_INTERACTION_MODES,
  PARENT_INTERACTION_STATUSES,
  PARENT_RELATIONS,
  ParentInteractionMode,
  ParentInteractionStatus,
  ParentRelation,
} from '../constants/parentInteraction.constants';

/**
 * Zod + transport contracts for the Parent Interaction register.
 *
 * The register arrives as free text from an Excel sheet, so every field is
 * accepted as a permissive `string` at the transport boundary and only
 * *normalised* (not rejected) in the service. Rejecting an unusual spelling of
 * "Phone call" would lose a real parent-teacher conversation, which is a far
 * worse outcome than storing "OTHER".
 */

/** Long-form text columns, bounded to keep a single row from bloating the table. */
const longText = (label: string, max = 5000) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v === null || v === undefined || v === '' ? null : String(v).trim().slice(0, max)))
    .refine((v) => v === null || v.length > 0, { message: `${label} must not be empty when provided` });

/**
 * A REQUIRED date column on the register sheet - used for `date`, the one cell
 * the schema declares NOT NULL.
 *
 * Excel yields either a real date, an ISO `YYYY-MM-DD` string, or a raw serial
 * number depending on how the file was produced, so all three are accepted here
 * and the service performs the actual conversion.
 */
const requiredRegisterDate = z
  .union([z.string(), z.number(), z.date()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date) return v;
    if (typeof v === 'number') return v; // Excel serial - converted in the service.
    return String(v).trim();
  })
  .refine((v) => v !== null && v !== '', { message: 'date is required and must be a valid date' });

/**
 * An OPTIONAL date column - used for `nextDate`, which is nullable.
 *
 * Same accepted shapes as `requiredRegisterDate`, but a blank cell is legitimate
 * and passes straight through as `null` rather than failing validation.
 */
const optionalRegisterDate = z
  .union([z.string(), z.number(), z.date()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date) return v;
    if (typeof v === 'number') return v;
    return String(v).trim();
  });

/** `visitNo` accepts `"2nd"`, `" 2 "`, `2` or `""`; the service does the parsing. */
const visitNumber = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .nullable()
  .transform((v) => (v === null || v === undefined || v === '') ? null : v);

/** Short, single-line, optional text column. */
const shortText = (max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v === null || v === undefined || v === '' ? null : String(v).trim().slice(0, max)));

/** One row of the "Parent Interaction" Excel sheet. */
export const parentInteractionRowSchema = z.object({
  studentId: z
    .string({ required_error: 'studentId is required' })
    .trim()
    .min(1, 'studentId is required')
    .max(100, 'studentId must not exceed 100 characters'),
  studentName: z
    .string({ required_error: 'studentName is required' })
    .trim()
    .min(1, 'studentName is required')
    .max(200, 'studentName must not exceed 200 characters'),
  class: z
    .string({ required_error: 'class is required' })
    .trim()
    .min(1, 'class is required')
    .max(100, 'class must not exceed 100 characters'),
  parentName: z
    .string({ required_error: 'parentName is required' })
    .trim()
    .min(1, 'parentName is required')
    .max(150, 'parentName must not exceed 150 characters'),
  relation: shortText(50),
  date: requiredRegisterDate,
  mode: shortText(50),
  visitNo: visitNumber,
  purpose: longText('purpose'),
  parentShared: longText('parentShared'),
  keyNotes: longText('keyNotes'),
  observation: longText('observation'),
  commitment: longText('commitment'),
  nextDate: optionalRegisterDate,
  nextInteraction: longText('nextInteraction', 255),
  objective: longText('objective'),
  status: shortText(50),
  photoUrl: shortText(500),
});

/** Request body of `POST /parent-interactions/upload`. */
export const parentInteractionUploadSchema = z.object({
  records: z
    .array(parentInteractionRowSchema)
    .min(1, 'At least one parent interaction row is required')
    .max(MAX_BULK_UPLOAD_ROWS, `A single upload cannot exceed ${MAX_BULK_UPLOAD_ROWS} rows`),
});

/** Query parameters accepted by `GET /parent-interactions`. */
export const parentInteractionFilterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
  studentId: z.string().trim().min(1).max(100).optional(),
  class: z.string().trim().min(1).max(100).optional(),
  parentName: z.string().trim().min(1).max(150).optional(),
  relation: z.string().trim().min(1).max(50).optional(),
  mode: z.string().trim().min(1).max(50).optional(),
  status: z.string().trim().min(1).max(50).optional(),
  fromDate: z.string().trim().optional(),
  toDate: z.string().trim().optional(),
  search: z.string().trim().min(1).max(150).optional(),
});

export type ParentInteractionFilterQuery = z.infer<typeof parentInteractionFilterQuerySchema>;
/** Filter bag handed down to the repository. */
export interface ParentInteractionFilterOptions {
  page: number;
  limit: number;
  studentId?: string;
  class?: string;
  parentName?: string;
  relation?: string;
  mode?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
}

/** A persisted register entry, as returned by the API. */
export interface ParentInteractionResponseDTO {
  id: number;
  studentId: string;
  studentName: string;
  class: string;
  parentName: string;
  relation: string | null;
  /** `YYYY-MM-DD`. */
  date: string;
  mode: string | null;
  visitNo: number | null;
  purpose: string | null;
  parentShared: string | null;
  keyNotes: string | null;
  observation: string | null;
  commitment: string | null;
  /** `YYYY-MM-DD`, or null. */
  nextDate: string | null;
  nextInteraction: string | null;
  objective: string | null;
  status: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Page envelope, matching `PaginatedStudentResponseDTO` in `student.dto.ts`. */
export interface PaginatedParentInteractionResponseDTO {
  records: ParentInteractionResponseDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Result of the bulk upload, matching the shared `BatchUploadResultDTO` shape. */
export type ParentInteractionUploadResultDTO = BatchUploadResultDTO<ParentInteractionResponseDTO>;

/**
 * The Zod-validated form of the upload body.
 *
 * This is the *parsed* shape: every cell is already coerced to `string | null`,
 * `date` is a `string | number | Date` and `visitNo` a `string | number | null`.
 * It is assignable to the plain `ParentInteractionUploadRequestBody` the
 * controller declares, which is what lets tsoa keep a resolvable route type
 * while Zod stays the authoritative runtime gate.
 */
export type ParentInteractionUploadInput = ParentInteractionUploadRequestBody;

/**
 * Route-level body shape for `POST /parent-interactions/upload`.
 *
 * A plain interface rather than the Zod-inferred type because tsoa cannot
 * introspect `z.infer`; `parentInteractionUploadSchema` remains the authoritative
 * runtime gate. Mirrors the `AttendanceUploadRequestBody` precedent.
 */
export interface ParentInteractionUploadRequestBody {
  records: {
    studentId: string;
    studentName: string;
    class: string;
    parentName: string;
    relation?: string | null;
    date: string | number | Date;
    mode?: string | null;
    visitNo?: string | number | null;
    purpose?: string | null;
    parentShared?: string | null;
    keyNotes?: string | null;
    observation?: string | null;
    commitment?: string | null;
    nextDate?: string | number | Date | null;
    nextInteraction?: string | null;
    objective?: string | null;
    status?: string | null;
    photoUrl?: string | null;
  }[];
}

export type {
  ParentInteractionMode,
  ParentInteractionStatus,
  ParentRelation,
  PARENT_INTERACTION_MODES,
  PARENT_INTERACTION_STATUSES,
  PARENT_RELATIONS,
  RowErrorDTO,
};