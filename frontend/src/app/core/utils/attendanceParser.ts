/**
 * Pure parser for the **wide day-matrix** attendance layout.
 *
 * Target sheet shape (one student per row, one day per column):
 *
 * ```
 * Student_ID | Student_Name | 1st | 2nd | 3rd | ... | 30th | Total class - 8 | Average
 * EDSF 035   | Abhinav      | P   | P   | A   | ... |      | 12              | 40
 * ```
 *
 * This is deliberately a *different* layout from the `MATRIX` format already
 * handled by `AttendanceUploadService.buildMatrixGrid()`, whose headers are real
 * dates (`2026-01-05`). Here the headers are bare **ordinals**, so the file on
 * its own is ambiguous: `1st` denotes a different calendar date every month. The
 * caller must therefore supply the {@link CalendarContext} the sheet omits, which
 * is why the wizard renders Month + Year selectors before enabling the dropzone.
 *
 * The pivot emits exactly the same logical row shape the row-based format
 * produces, so validation, inline editing, the error matrix and dispatch all
 * stay format-agnostic.
 *
 * Every export here is pure and side-effect free, so each rule can be unit
 * tested without a DOM, an Angular injector or a network call.
 */

import {
  ATTENDANCE_STATUSES,
  AttendanceStatus,
  CLASS_WIDE_ATTENDANCE_STATUSES,
} from '../models/upload.models';
import { RawGridRow, isBlank, isEmptyRow, normalizeHeader, stringifyCell } from './excel-upload.utils';

// ---------------------------------------------------------------------------
// Ordinal day detection
// ---------------------------------------------------------------------------

/**
 * An ordinal day token: `1st`, `2nd`, `3rd`, `4th`, `21st`, or a bare `7`.
 *
 * The suffix is optional because Excel frequently stores a header such as
 * "1st" with a custom number format, in which case SheetJS hands us the plain
 * number `1` instead of the string.
 */
export const ORDINAL_DAY_REGEX = /^(\d{1,2})(?:st|nd|rd|th)?$/i;

/** Bounds guard so a mistyped year cannot silently build nonsense dates. */
export const MIN_SUPPORTED_YEAR = 2000;
export const MAX_SUPPORTED_YEAR = 2099;

/** Month labels, 0-indexed to match the 1-based `month` field. */
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Header spellings that identify the student-code column. */
const STUDENT_ID_HEADERS = ['studentid', 'studentcode', 'studentidcode', 'id', 'student'];

/** Header spellings that identify the student-name column. */
const STUDENT_NAME_HEADERS = ['studentname', 'name', 'fullname'];

// ---------------------------------------------------------------------------
// Context & layout shapes
// ---------------------------------------------------------------------------

export interface CalendarContext {
  year: number;
  /** 1-12, matching the JS `Date` convention and the backend query params. */
  month: number;
}

/** A single day column lifted out of the header row. */
export interface DayColumn {
  /** Spreadsheet column index. */
  colIndex: number;
  /** The literal header text, e.g. `7th`. */
  header: string;
  day: number;
  /** `YYYY-MM-DD`, or `null` when that day does not exist in the chosen month. */
  isoDate: string | null;
}

/** A column we deliberately ignored, surfaced in the UI rather than dropped silently. */
export interface SkippedColumn {
  colIndex: number;
  header: string;
  reason: string;
}

export interface DayMatrixLayout {
  /** 0-based index of the header row within the raw sheet. */
  headerRowIndex: number;
  studentIdCol: number;
  /** `-1` when the sheet carries no separate name column. */
  studentNameCol: number;
  /** Day columns that map onto a real date in the selected month. */
  dayColumns: DayColumn[];
  /** Summary columns (`Total class`, `Average`) and out-of-range ordinals. */
  skippedColumns: SkippedColumn[];
}

/** Class context + the calendar the sheet omits. */
export interface DayMatrixPivotContext extends CalendarContext {
  schoolCode: string;
  className: string;
  academicYear: string;
}

export interface DayMatrixPivotResult {
  rows: RawGridRow[];
  /** Cells that produced a record. */
  markedCellCount: number;
  /** Blank day cells — "not marked", skipped rather than guessed. */
  blankCellCount: number;
  /** Dates collapsed into a single class-wide cancellation, as `YYYY-MM-DD`. */
  classWideDates: string[];
}

// ---------------------------------------------------------------------------
// Day + date construction
// ---------------------------------------------------------------------------

/**
 * Read a day-of-month out of a header cell: `1st` -> 1, `21` -> 21.
 *
 * Returns `null` for anything that is not a plausible ordinal, which is what
 * lets the caller tell `31st` (a day) apart from `Total class - 8` (a summary).
 */
export function parseOrdinalDay(value: unknown): number | null {
  if (isBlank(value)) return null;
  const match = ORDINAL_DAY_REGEX.exec(String(value).trim());
  if (!match) return null;
  const day = Number(match[1]);
  return day >= 1 && day <= 31 ? day : null;
}

/** True when the header names a day of the month. */
export function isDayHeader(value: unknown): boolean {
  return parseOrdinalDay(value) !== null;
}

/**
 * Real number of days in the given month, leap years included.
 *
 * Day 0 of the *following* month is the last day of this one, which avoids the
 * `new Date(year, month, 0)` timezone trap.
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** True when a 1-based `{year, month}` pair is inside the supported range. */
export function isValidCalendarContext(ctx: CalendarContext): boolean {
  const { year, month } = ctx;
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12 &&
    year >= MIN_SUPPORTED_YEAR &&
    year <= MAX_SUPPORTED_YEAR
  );
}

/**
 * Combine the selected month/year with a day column into an exact ISO date.
 *
 * Returns `null` for a day the chosen month does not have — e.g. `31st` under
 * February or April — so an impossible calendar date can never be generated.
 */
export function buildIsoDate(year: number, month: number, day: number): string | null {
  if (!isValidCalendarContext({ year, month })) return null;
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) return null;

  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  // Round-trip guard: catches any residual overflow (e.g. 31 February).
  return new Date(`${iso}T00:00:00.000Z`).toISOString().slice(0, 10) === iso ? iso : null;
}

// ---------------------------------------------------------------------------
// Status normalisation
// ---------------------------------------------------------------------------

/**
 * Spellings school spreadsheets actually contain, folded onto the canonical
 * attendance vocabulary.
 *
 * Kept byte-for-byte aligned with `STATUS_ALIASES` in
 * `attendance-upload.service.ts` (which re-exports the normaliser from here)
 * and with `EXACT_STATUS_ALIASES` in the backend's
 * `cleanseExcelStatus`, so the browser and the API cannot disagree about what a
 * given cell means.
 */
const STATUS_ALIASES: Record<string, AttendanceStatus> = {
  p: 'P',
  present: 'P',
  pr: 'P',
  a: 'A',
  ab: 'A',
  absent: 'A',
  abs: 'A',
  hd: 'HALF_DAY',
  halfday: 'HALF_DAY',
  activity: 'ACTIVITY',
  act: 'ACTIVITY',
  function: 'ACTIVITY',
  outing: 'ACTIVITY',
  dance: 'ACTIVITY',
  sports: 'ACTIVITY',
  onleave: 'ON_LEAVE',
  leave: 'ON_LEAVE',
  ol: 'ON_LEAVE',
  cancelled: 'CANCELLED',
  canceled: 'CANCELLED',
  cancel: 'CANCELLED',
  holiday: 'CANCELLED',
  schoolholiday: 'CANCELLED',
};

/** Fold a raw status cell to its canonical form, or `null` if unrecognised. */
export function normalizeAttendanceStatus(raw: unknown): AttendanceStatus | null {
  const key = stringifyCell(raw).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!key) return null;

  const exact = STATUS_ALIASES[key];
  if (exact) return exact;

  // Substring fallbacks, ordered so the more specific token wins.
  if (key.includes('half') && key.includes('day')) return 'HALF_DAY';
  if (key.includes('leave')) return 'ON_LEAVE';
  if (key.includes('cancel') || key.includes('holiday')) return 'CANCELLED';
  if (['activit', 'function', 'outing', 'dance', 'sports'].some((h) => key.includes(h))) {
    return 'ACTIVITY';
  }
  if (key.startsWith('present')) return 'P';
  if (key.startsWith('absent')) return 'A';

  return null;
}

/** A status describes the whole session rather than one student. */
export function isClassWideStatus(status: AttendanceStatus): boolean {
  return (CLASS_WIDE_ATTENDANCE_STATUSES as readonly AttendanceStatus[]).includes(status);
}

/**
 * Outcome of reading one day cell.
 *
 * `remarks` preserves the *original* text whenever it was free prose
 * (`"teacher on leave"`, `"School holiday - tadari"`), so the admin's own
 * wording survives into the database instead of being flattened to a code.
 */
export interface NormalizedMark {
  status: AttendanceStatus;
  /** The original string, or `''` when the cell was already a canonical token. */
  remarks: string;
}

/**
 * Normalise a single day cell into a status plus remarks.
 *
 * A blank cell yields `null`: the brief allows skipping it or recording
 * `NOT_MARKED`, but this codebase's vocabulary has no such status and a blank
 * genuinely means the register was not filled in, so inventing a record would
 * fabricate attendance.
 */
export function normalizeMarkCell(raw: unknown): NormalizedMark | null {
  const original = stringifyCell(raw);
  if (!original) return null;

  const status = normalizeAttendanceStatus(raw);
  if (!status) return null;

  // Keep the author's wording only when it is more than the bare code.
  const isBareCode = original.toUpperCase() === status;
  return { status, remarks: isBareCode ? '' : original };
}

/** Human-readable list for error messages, kept in one place. */
export const ALLOWED_STATUS_LABEL = ATTENDANCE_STATUSES.join(', ');

// ---------------------------------------------------------------------------
// Header detection & column filtering
// ---------------------------------------------------------------------------

/** Index of the student-id column in `row`, or -1. */
function findStudentIdCol(row: unknown[]): number {
  for (let c = 0; c < row.length; c++) {
    if (STUDENT_ID_HEADERS.includes(normalizeHeader(row[c]))) return c;
  }
  return -1;
}

/** Index of the student-name column in `row`, or -1 when absent. */
function findStudentNameCol(row: unknown[]): number {
  for (let c = 0; c < row.length; c++) {
    if (STUDENT_NAME_HEADERS.includes(normalizeHeader(row[c]))) return c;
  }
  return -1;
}

/**
 * Locate the day-matrix header row.
 *
 * Requires a recognisable student-id column *and* at least one ordinal day
 * column, which is what distinguishes this layout from the date-header `MATRIX`
 * format (whose headers parse as real dates, not ordinals). Scans the first 15
 * rows to tolerate title and notes rows above the header.
 */
export function findDayMatrixHeaderRow(allRows: unknown[][], maxScan = 15): number {
  const limit = Math.min(maxScan, allRows.length);
  for (let i = 0; i < limit; i++) {
    const row = allRows[i] ?? [];
    if (row.length < 2) continue;
    if (findStudentIdCol(row) === -1) continue;
    const dayCount = row.filter((cell) => isDayHeader(cell)).length;
    if (dayCount >= 1) return i;
  }
  return -1;
}

/** `1st`/`2nd`/`3rd`/`4th` suffix for a day number. */
function ordinalSuffix(day: number): string {
  const lastTwo = day % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][day % 10] ?? 'th';
}

/**
 * Split a header row into usable day columns and everything to be ignored.
 *
 * Three kinds of column are skipped, each reported back so the wizard can show
 * the admin what was ignored rather than dropping it silently:
 *  - the student id / name columns,
 *  - summary columns (`Total class - 8`, `Average`),
 *  - ordinals the selected month is too short to have (`31st` in February).
 */
export function detectDayMatrixLayout(
  allRows: unknown[][],
  headerRowIndex: number,
  ctx: CalendarContext
): DayMatrixLayout | null {
  const header = allRows[headerRowIndex] ?? [];
  const studentIdCol = findStudentIdCol(header);
  if (studentIdCol === -1) return null;

  const studentNameCol = findStudentNameCol(header);
  const dayColumns: DayColumn[] = [];
  const skippedColumns: SkippedColumn[] = [];
  const seenDays = new Set<number>();

  for (let c = 0; c < header.length; c++) {
    if (c === studentIdCol || c === studentNameCol) continue;

    const text = stringifyCell(header[c]);
    const day = parseOrdinalDay(header[c]);

    if (day === null) {
      if (!text) continue; // trailing empty cell, not worth reporting
      skippedColumns.push({
        colIndex: c,
        header: text,
        reason: 'Summary column — not a day of the month.',
      });
      continue;
    }

    // A duplicated ordinal means the sheet is malformed rather than merely odd.
    if (seenDays.has(day)) {
      skippedColumns.push({
        colIndex: c,
        header: text,
        reason: `Duplicate day column — day ${day}${ordinalSuffix(day)} already has a column.`,
      });
      continue;
    }
    seenDays.add(day);

    const isoDate = buildIsoDate(ctx.year, ctx.month, day);
    if (isoDate === null) {
      skippedColumns.push({
        colIndex: c,
        header: text,
        reason:
          `${MONTH_NAMES[ctx.month - 1]} ${ctx.year} has only ` +
          `${daysInMonth(ctx.year, ctx.month)} days, so there is no ${day}${ordinalSuffix(day)}.`,
      });
      continue;
    }

    dayColumns.push({ colIndex: c, header: text, day, isoDate });
  }

  if (dayColumns.length === 0) return null;

  return { headerRowIndex, studentIdCol, studentNameCol, dayColumns, skippedColumns };
}
// ---------------------------------------------------------------------------
// The pivot: wide matrix -> flat rows
// ---------------------------------------------------------------------------

/** One resolved day cell, before it becomes a logical row. */
interface Candidate {
  isoDate: string;
  status: AttendanceStatus;
  remarks: string;
  /** The untouched spreadsheet cell, so raw-cell lookups stay O(1). */
  rawCell: unknown;
  /** The student answered with text we could not classify. */
  unrecognised: boolean;
}

/**
 * Transform a wide day-matrix sheet into the flat logical rows the rest of the
 * upload pipeline already understands.
 *
 * Three behaviours are worth calling out:
 *
 * 1. **A day column that is class-wide collapses to one row.** When every
 *    non-blank cell in a column resolves to a class-wide status (e.g. the whole
 *    column reads "School holiday - tadari"), emitting one row per student
 *    would be wrong: the backend buckets `CANCELLED` by `(class, date)` into a
 *    single `studentId = null` record and would then silently overwrite all but
 *    one of them. Collapsing here keeps the payload honest and the response's
 *    `cancellations` counter meaningful.
 *
 * 2. **Blank cells are skipped, never guessed.** An unfilled register cell means
 *    "not marked". This vocabulary has no `NOT_MARKED` status, and inventing a
 *    record would fabricate attendance that nobody registered.
 *
 * 3. **Unclassifiable text is preserved verbatim.** It is emitted with its raw
 *    string as the status so the shared `validateRow` raises a row-scoped ERROR
 *    the admin can see and fix inline, rather than the value silently vanishing.
 */
export function pivotDayMatrix(
  allRows: unknown[][],
  layout: DayMatrixLayout,
  ctx: DayMatrixPivotContext
): DayMatrixPivotResult {
  const { headerRowIndex, studentIdCol, dayColumns } = layout;

  const rows: RawGridRow[] = [];
  const classWideDates = new Set<string>();
  let markedCellCount = 0;
  let blankCellCount = 0;

  for (let r = headerRowIndex + 1; r < allRows.length; r++) {
    const raw = allRows[r] ?? [];
    if (isEmptyRow(raw)) continue;

    const studentId = stringifyCell(raw[studentIdCol]);
    const candidates: Candidate[] = [];

    for (const col of dayColumns) {
      const cell = raw[col.colIndex];
      const isoDate = col.isoDate as string;

      if (isBlank(cell)) {
        blankCellCount++;
        continue;
      }

      const mark = normalizeMarkCell(cell);
      if (!mark) {
        // Kept as-is so `validateRow` raises a row-scoped ERROR on it instead of
        // the unrecognised text disappearing from the preview.
        candidates.push({
          isoDate,
          status: stringifyCell(cell) as AttendanceStatus,
          remarks: '',
          rawCell: cell,
          unrecognised: true,
        });
        continue;
      }

      markedCellCount++;
      candidates.push({ ...mark, isoDate, rawCell: cell, unrecognised: false });
    }

    for (const candidate of candidates) {
      // Only free-text class-wide marks (e.g. "School holiday - tadari") are
      // collapsible. A bare `CANCELLED` token is a deliberate per-session entry,
      // so it is kept per-student rather than swallowed.
      const collapsible = isClassWideStatus(candidate.status) && candidate.remarks !== '';
      const isFirstReport = collapsible && !classWideDates.has(candidate.isoDate);

      if (collapsible) {
        // Claim the date for the first student who reports it; every later
        // report of the same class-wide day is a duplicate, not a new record.
        if (isFirstReport) {
          classWideDates.add(candidate.isoDate);
        } else {
          markedCellCount--;
          continue;
        }
      }

      const studentCell = isFirstReport ? '' : studentId;

      rows.push({
        // A matrix row fans out into N logical rows that share one spreadsheet
        // row, which is why the pipeline matches rows by identity, not index.
        rowIndex: r + 1,
        cells: {
          schoolCode: ctx.schoolCode,
          className: ctx.className,
          academicYear: ctx.academicYear,
          sessionDate: candidate.isoDate,
          studentId: studentCell,
          status: candidate.status,
          remarks: candidate.remarks,
        },
        rawCells: {
          schoolCode: ctx.schoolCode,
          className: ctx.className,
          academicYear: ctx.academicYear,
          sessionDate: candidate.isoDate,
          studentId: studentCell,
          status: candidate.unrecognised ? stringifyCell(candidate.rawCell) : candidate.status,
          remarks: candidate.remarks,
        },
        errors: [],
        excluded: false,
      });
    }
  }

  return { rows, markedCellCount, blankCellCount, classWideDates: [...classWideDates].sort() };
}

