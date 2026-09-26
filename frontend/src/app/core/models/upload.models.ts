/**
 * Models for the centralized bulk Excel Data Upload pipeline.
 *
 * These mirror the backend `*-upload.dto.ts` contracts one-to-one so a
 * row-scoped `ValidationError` renders identically whether it was detected
 * client-side (before any network call) or server-side (after commit).
 */

/** A single cell- or row-scoped validation problem. */
export interface ValidationError {
  /** 1-based spreadsheet row number, matching what the user sees in Excel. */
  rowIndex: number;
  columnName: string;
  invalidValue: any;
  errorMessage: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidationResult<T> {
  isValid: boolean;
  totalRows: number;
  validRows: T[];
  errors: ValidationError[];
}

export type UploadEntityType = 'CLASSES' | 'STUDENTS' | 'ATTENDANCE';

/** Row-based layout, or the pivoted Excel grid/matrix layout. */
export type UploadSheetFormat = 'ROW' | 'MATRIX';

/**
 * Attendance statuses accepted by the daily attendance register.
 *
 * Kept in lockstep with the backend's `ATTENDANCE_STATUS_VALUES`
 * (backend/src/constants/attendance.constants.ts), which is the single source of
 * truth. `ON_LEAVE` = authorised leave; `CANCELLED` = the whole session did not
 * run and is the only status that may omit a studentId.
 */
export const ATTENDANCE_STATUSES = [
  'P',
  'A',
  'HALF_DAY',
  'ACTIVITY',
  'ON_LEAVE',
  'CANCELLED',
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Per-student markable statuses (CANCELLED is class-wide, so it is excluded). */
export const MARKABLE_ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  'P',
  'A',
  'HALF_DAY',
  'ACTIVITY',
  'ON_LEAVE',
];

/** Statuses that describe the whole session rather than a single student. */
export const CLASS_WIDE_ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ['CANCELLED'];

export interface ColumnSpec {
  /** Field name on the row model; also the key used in `GridRow.cells`. */
  key: string;
  /** Exact header text written into the downloadable template. */
  header: string;
  required: boolean;
  /** Allow inline editing in the browser grid. */
  editable: boolean;
  example: string;
  /** Short helper text rendered under the column header. */
  help?: string;
}

export interface GridRow {
  /** 1-based spreadsheet row number, preserved through pivoting + editing. */
  rowIndex: number;
  cells: Record<string, string>;
  errors: ValidationError[];
  /** User-toggled: excluded rows are never dispatched to the API. */
  excluded: boolean;
}

export interface DataGrid {
  columns: ColumnSpec[];
  rows: GridRow[];
}

export interface UploadParseResult<T> {
  result: ValidationResult<T>;
  grid: DataGrid;
  format: UploadSheetFormat;
  sheetName: string;
}

/** Response shape returned by all three batch endpoints. */
export interface BatchUploadResponse {
  totalRows: number;
  created: number;
  skipped: number;
  failed: number;
  records: Record<string, unknown>[];
  errors: ValidationError[];
  /** Attendance only: class-wide cancellation records created. */
  cancellations?: number;
  /** Attendance only: distinct (class, date) sessions touched. */
  sessionsProcessed?: number;
}

// ---------------------------------------------------------------------------
// Row models — one per entity type
// ---------------------------------------------------------------------------

/** Classes Master. */
export interface ClassUploadRow {
  schoolCode: string;
  className: string;
  academicYear: string;
  section?: string | null;
  name?: string | null;
  capacity?: number | null;
}

/** Students Master. */
export interface StudentUploadRow {
  studentId: string;
  schoolCode: string;
  className: string;
  academicYear: string;
  studentName: string;
  isActive: boolean;
}

/** Daily Attendance (row-based, or the pivoted matrix layout). */
export interface AttendanceUploadRow {
  schoolCode: string;
  className: string;
  academicYear: string;
  sessionDate: string;
  /** Optional *only* when `status === 'CANCELLED'`. */
  studentId?: string | null;
  status: AttendanceStatus;
  remarks?: string | null;
}

export interface BatchClassUploadInput {
  classes: ClassUploadRow[];
}

export interface BatchStudentUploadInput {
  students: StudentUploadRow[];
}

export interface BulkAttendanceUploadInput {
  records: AttendanceUploadRow[];
}

/** Fallback context for a matrix sheet that carries no metadata row. */
export interface MatrixContext {
  schoolCode: string;
  className: string;
  academicYear: string;
}
