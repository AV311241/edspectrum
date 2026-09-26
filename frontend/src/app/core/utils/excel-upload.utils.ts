import * as XLSX from 'xlsx';
import { ColumnSpec, DataGrid, GridRow, ValidationError } from '../models/upload.models';

/** Academic year must look like `2026-2027`. */
export const ACADEMIC_YEAR_REGEX = /^\d{4}-\d{4}$/;

/** ISO calendar date `YYYY-MM-DD`. */
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Reject the Excel serial-number overflow window (>= 2958466 is year 10000). */
const MAX_EXCEL_SERIAL = 2958465;

export interface ParsedSheet {
  sheetName: string;
  /** All sheets, so callers can pick a specific one if needed. */
  sheetNames: string[];
  /** Raw 2D array of every sheet, keyed by sheet name. */
  sheets: Record<string, unknown[][]>;
}

/**
 * Normalize a header cell so `School Code`, `school_code` and `SCHOOLCODE`
 * all collapse to the same lookup key.
 */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

/** Render any raw cell as the trimmed string a human would recognise. */
export function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/**
 * Convert an Excel serial date (the raw number SheetJS yields for a date cell)
 * into a `YYYY-MM-DD` string. Uses the same 25569 epoch offset as the existing
 * baseline-assessment validator so both parsers agree.
 */
export function excelSerialToIsoDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0 || serial > MAX_EXCEL_SERIAL) return null;
  const jsDate = new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (Number.isNaN(jsDate.getTime())) return null;
  return jsDate.toISOString().slice(0, 10);
}

/**
 * Coerce any of `Date` | Excel serial | ISO string | `DD/MM/YYYY` into ISO
 * `YYYY-MM-DD`, or return `null` when the value cannot be understood.
 */
export function toIsoDate(value: unknown): string | null {
  if (isBlank(value)) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number') {
    return excelSerialToIsoDate(value);
  }

  const str = String(value).trim();

  if (ISO_DATE_REGEX.test(str)) {
    // Guard against impossible calendar dates such as 2026-13-45.
    const parsed = new Date(`${str}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== str) return null;
    return str;
  }

  // D/M/Y or D-M-Y, a common export format in South-Asian school spreadsheets.
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const parsed = new Date(`${iso}T00:00:00.000Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso) return iso;
    return null;
  }

  const fallback = new Date(str);
  if (!Number.isNaN(fallback.getTime())) return fallback.toISOString().slice(0, 10);
  return null;
}

const TRUTHY = new Set(['true', '1', 'yes', 'y', 't', 'active']);
const FALSY = new Set(['false', '0', 'no', 'n', 'f', 'inactive']);

/**
 * Coerce Excel booleans, numbers and human words into a boolean.
 * Returns `null` when the value is unrecognised so the caller can raise an
 * `ERROR` rather than silently defaulting.
 */
export function coerceBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || String(value).trim() === '') return true;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  const str = String(value).trim().toLowerCase();
  if (TRUTHY.has(str)) return true;
  if (FALSY.has(str)) return false;
  return null;
}

/**
 * Aliases tolerated when matching a declared column against a sheet header, so
 * `Student Code`, `student_id` and `ID` all land on the `studentId` column.
 */
const HEADER_ALIASES: Record<string, string[]> = {
  studentId: ['studentcode', 'studentidcode', 'id'],
  schoolCode: ['schoolcode', 'school'],
  className: ['classname', 'class', 'section'],
  academicYear: ['academicyear', 'year', 'sessionyear'],
  studentName: ['studentname', 'name', 'fullname'],
  isActive: ['isactive', 'active', 'status'],
  sessionDate: ['sessiondate', 'date', 'attendancedate'],
  status: ['status', 'attendancestatus'],
  remarks: ['remarks', 'remark', 'notes', 'comment'],
  section: ['section'],
  capacity: ['capacity', 'maxcapacity'],
  name: ['name', 'classfullname'],
};

/**
 * Locate the header row by scanning the first `maxScan` rows for one that
 * contains every required column. Tolerates title/notes rows above the header,
 * mirroring the existing baseline-assessment parser.
 */
export function findHeaderRow(
  rows: unknown[][],
  requiredKeys: string[],
  maxScan: number = 15
): number {
  const required = requiredKeys.map(normalizeHeader);
  const limit = Math.min(maxScan, rows.length);
  for (let i = 0; i < limit; i++) {
    const normalized = (rows[i] ?? []).map(normalizeHeader);
    if (required.every((key) => normalized.includes(key))) return i;
  }
  return -1;
}

/** Read every sheet of a workbook into raw 2D arrays. */
export async function readWorkbook(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames ?? [];
  if (sheetNames.length === 0) {
    throw new Error('Excel workbook contains no sheets.');
  }
  const sheets: Record<string, unknown[][]> = {};
  for (const name of sheetNames) {
    sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    }) as unknown[][];
  }
  return { sheetName: sheetNames[0], sheetNames, sheets };
}

/** True when every cell in the row is blank (trailing whitespace in Excel). */
export function isEmptyRow(row: unknown[]): boolean {
  return (row ?? []).every((cell) => isBlank(cell));
}

/** Resolve a declared column to its spreadsheet column index, or -1. */
export function resolveColumnIndex(
  headerCells: string[],
  col: ColumnSpec
): number {
  const wanted = normalizeHeader(col.header);
  let idx = headerCells.indexOf(wanted);
  if (idx === -1) idx = headerCells.indexOf(normalizeHeader(col.key));
  if (idx === -1) {
    for (const alias of HEADER_ALIASES[col.key] ?? []) {
      idx = headerCells.indexOf(alias);
      if (idx !== -1) break;
    }
  }
  return idx;
}

/**
 * A grid row that also retains the untouched spreadsheet cells, so date
 * columns can be re-derived from their original Excel serial number after an
 * inline edit has normalised them to a string.
 */
export interface RawGridRow extends GridRow {
  rawCells: Record<string, unknown>;
}

/**
 * Build a cell grid from a row-based sheet. Header matching is tolerant, so
 * column order does not matter and `School Code` == `school_code`.
 *
 * Returns the grid plus the list of required columns that were not found.
 */
export function buildGridFromRowSheet(
  allRows: unknown[][],
  headerRowIndex: number,
  columns: ColumnSpec[]
): { grid: DataGrid; missingColumns: string[] } {
  const headerCells = (allRows[headerRowIndex] ?? []).map(normalizeHeader);

  const indexByColumn = new Map<string, number>();
  const missingColumns: string[] = [];

  for (const col of columns) {
    const idx = resolveColumnIndex(headerCells, col);
    if (idx === -1) {
      if (col.required) missingColumns.push(col.header);
    } else {
      indexByColumn.set(col.key, idx);
    }
  }

  const rows: RawGridRow[] = [];
  for (let r = headerRowIndex + 1; r < allRows.length; r++) {
    const raw = allRows[r];
    if (isEmptyRow(raw)) continue;

    const cells: Record<string, string> = {};
    const rawCells: Record<string, unknown> = {};
    for (const col of columns) {
      const idx = indexByColumn.get(col.key);
      const value = idx === undefined ? null : raw[idx];
      rawCells[col.key] = value;
      cells[col.key] = stringifyCell(value);
    }
    rows.push({
      rowIndex: r + 1,
      cells,
      rawCells,
      errors: [],
      excluded: false,
    });
  }

  return { grid: { columns, rows }, missingColumns };
}

/** Strip the raw-cell payload so a grid can be held in a plain signal. */
export function toPlainGrid(grid: DataGrid): DataGrid {
  return {
    columns: grid.columns,
    rows: grid.rows.map(({ rowIndex, cells, errors, excluded }) => ({
      rowIndex,
      cells,
      errors,
      excluded,
    })),
  };
}

/** Build and immediately download a sample .xlsx template. */
export function downloadTemplate(
  fileName: string,
  sheets: { name: string; rows: unknown[][]; columnWidths?: number[] }[]
): void {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    if (sheet.columnWidths?.length) {
      worksheet['!cols'] = sheet.columnWidths.map((wch) => ({ wch }));
    }
    // Excel refuses to open a completely empty sheet, so add a trailing row.
    XLSX.utils.sheet_add_aoa(worksheet, [[]], { origin: -1 });
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(workbook, fileName);
}

/** Human-readable byte size for the drop-zone file indicator. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Find the first validation error attached to a specific grid cell. */
export function errorForCell(row: GridRow, columnKey: string): ValidationError | undefined {
  return row.errors.find((e) => e.columnName === columnKey);
}

/** Build a `ValidationError` in one call, keeping the rule sites terse. */
export function rowError(
  rowIndex: number,
  columnName: string,
  invalidValue: unknown,
  errorMessage: string,
  severity: 'ERROR' | 'WARNING' = 'ERROR'
): ValidationError {
  return { rowIndex, columnName, invalidValue, errorMessage, severity };
}


