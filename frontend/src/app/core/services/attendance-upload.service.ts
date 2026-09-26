import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ATTENDANCE_STATUSES,
  AttendanceStatus,
  AttendanceUploadRow,
  BulkAttendanceUploadInput,
  BatchUploadResponse,
  ColumnSpec,
  DataGrid,
  MatrixContext,
  UploadEntityType,
  UploadSheetFormat,
  ValidationError,
} from '../models/upload.models';
import {
  ACADEMIC_YEAR_REGEX,
  RawGridRow,
  isBlank,
  isEmptyRow,
  normalizeHeader,
  stringifyCell,
  toIsoDate,
} from '../utils/excel-upload.utils';
import { BulkUploadService, RowValidationOutcome } from './bulk-upload-base.service';

export const ATTENDANCE_UPLOAD_COLUMNS: ColumnSpec[] = [
  {
    key: 'schoolCode',
    header: 'schoolCode',
    required: true,
    editable: true,
    example: 'SCH-001',
  },
  {
    key: 'className',
    header: 'className',
    required: true,
    editable: true,
    example: '6A',
  },
  {
    key: 'academicYear',
    header: 'academicYear',
    required: true,
    editable: true,
    example: '2026-2027',
  },
  {
    key: 'sessionDate',
    header: 'sessionDate',
    required: true,
    editable: true,
    example: '2026-01-05',
    help: 'YYYY-MM-DD. Excel date cells are converted automatically.',
  },
  {
    key: 'studentId',
    header: 'studentId',
    required: false,
    editable: true,
    example: 'EDSF-349',
    help: 'Optional only when status is CANCELLED.',
  },
  {
    key: 'status',
    header: 'status',
    required: true,
    editable: true,
    example: 'P',
    help: 'P, A, HALF_DAY, ACTIVITY, ON_LEAVE or CANCELLED.',
  },
  {
    key: 'remarks',
    header: 'remarks',
    required: false,
    editable: true,
    example: 'School function',
    help: 'Required when status is CANCELLED.',
  },
];

/**
 * Normalise the spellings school spreadsheets actually contain into the
 * canonical statuses. Anything not recognised here is rejected as an ERROR,
 * which keeps the contract strict while forgiving case, separator and padding
 * noise.
 *
 * Mirrors `cleanseExcelStatus` in backend/src/schemas/attendance-upload.schema.ts
 * so the browser and the API agree on what a given cell means.
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

/**
 * Bulk upload for the **Daily Attendance** sheet.
 *
 * Supports two layouts:
 *  1. Row-based — `schoolCode, className, academicYear, sessionDate, studentId,
 *     status, remarks`.
 *  2. Matrix / grid — date columns across row 1 and student IDs down column A,
 *     optionally preceded by a `schoolCode:` / `className:` / `academicYear:`
 *     metadata row. The grid is pivoted into the same logical row shape so the
 *     validator, editor and payload are identical for both formats.
 *
 * Validation rules:
 *  - `sessionDate`: valid ISO `YYYY-MM-DD` or an Excel serial date
 *  - `status`     : must resolve to P | A | HALF_DAY | ACTIVITY | ON_LEAVE | CANCELLED
 *  - cancellation : `status === 'CANCELLED'` may omit `studentId` but REQUIRES
 *                   `remarks`; every other status REQUIRES `studentId`
 *
 * `ON_LEAVE` is authorised leave: it is counted as a non-present day but is not
 * an absence, so it never extends a consecutive-absence streak.
 *
 * Dispatches to `POST /attendance/batch-upload`.
 */
@Injectable({ providedIn: 'root' })
export class AttendanceUploadService extends BulkUploadService<AttendanceUploadRow> {
  readonly entityType: UploadEntityType = 'ATTENDANCE';
  readonly label = 'Daily Attendance';
  readonly description =
    'Bulk-mark daily attendance in either row-based or Excel grid/matrix layout. Supports class-wide session cancellation.';
  readonly icon = 'calendar';
  readonly endpointLabel = 'POST /attendance/batch-upload';
  readonly templateFileName = 'Daily_Attendance_Template.xlsx';

  readonly columns: ColumnSpec[] = ATTENDANCE_UPLOAD_COLUMNS;
  readonly requiredHeaderKeys: string[] = [
    'schoolCode',
    'className',
    'academicYear',
    'sessionDate',
    'status',
  ];

  private readonly apiUrl = `${environment.apiUrl}/attendance`;

  // Declared explicitly because Angular cannot inherit a constructor from the
  // undecorated BulkUploadService base (NG2006).
  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Fallback context for a matrix sheet that carries no metadata row. The
   * upload page can override this so admins are not forced to restructure
   * their spreadsheet.
   */
  private fallbackContext: MatrixContext = { schoolCode: '', className: '', academicYear: '' };

  setMatrixContext(context: MatrixContext): void {
    this.fallbackContext = { ...context };
  }

  // -------------------------------------------------------------------------
  // Format detection & matrix pivoting
  // -------------------------------------------------------------------------

  /**
   * Row-based header detection first (it is unambiguous because it declares
   * `status`); fall back to matrix detection, where the header row is the one
   * whose first cell names a student and whose remaining cells are dates.
   */
  protected override locateHeader(allRows: unknown[][]): number {
    const rowBased = super.locateHeader(allRows);
    if (rowBased !== -1) return rowBased;
    return this.detectMatrixHeader(allRows);
  }

  private detectMatrixHeader(allRows: unknown[][]): number {
    const limit = Math.min(15, allRows.length);
    for (let i = 0; i < limit; i++) {
      const row = allRows[i] ?? [];
      if (row.length < 2) continue;
      const first = normalizeHeader(row[0]);
      const looksLikeStudentHeader = ['studentid', 'studentcode', 'id', 'student'].includes(first);
      if (!looksLikeStudentHeader) continue;
      // At least one date column is required to call this a matrix.
      const dateCells = row.slice(1).filter((cell) => toIsoDate(cell) !== null).length;
      if (dateCells >= 1) return i;
    }
    return -1;
  }

  /**
   * Read `schoolCode` / `className` / `academicYear` from a metadata row near
   * the top of the sheet. Accepts both `schoolCode: SCH-001` in a single cell
   * and adjacent label/value cells.
   */
  private extractMatrixMetadata(allRows: unknown[][]): MatrixContext {
    const ctx: MatrixContext = { schoolCode: '', className: '', academicYear: '' };
    const apply = (key: string, value: string) => {
      if (!value) return;
      if (key === 'schoolcode' && !ctx.schoolCode) ctx.schoolCode = value;
      else if (key === 'classname' && !ctx.className) ctx.className = value;
      else if (key === 'academicyear' && !ctx.academicYear) ctx.academicYear = value;
    };

    const limit = Math.min(6, allRows.length);
    for (let i = 0; i < limit; i++) {
      const row = allRows[i] ?? [];

      // Form 1: "schoolCode: SCH-001" inside one cell.
      for (const cell of row) {
        const str = stringifyCell(cell);
        if (!str) continue;
        const match = str.match(/^([A-Za-z][A-Za-z0-9 _-]*?)\s*[:=]\s*(.+)$/);
        if (match) apply(normalizeHeader(match[1]), match[2].trim());
      }

      // Form 2: adjacent label/value cells, e.g. ['schoolCode', 'SCH-001', ...].
      for (let c = 0; c < row.length - 1; c++) {
        apply(normalizeHeader(row[c]), stringifyCell(row[c + 1]));
      }
    }
    return ctx;
  }

  /**
   * Pivot the Excel matrix into the same logical row shape the row-based format
   * produces, so validation, inline editing and dispatch are format-agnostic.
   */
  private buildMatrixGrid(allRows: unknown[][], headerRowIndex: number): DataGrid {
    const header = allRows[headerRowIndex] ?? [];

    // Collect the date columns; the first column holds the student IDs.
    const dateColumns: { colIndex: number; iso: string }[] = [];
    for (let c = 1; c < header.length; c++) {
      const iso = toIsoDate(header[c]);
      if (iso) dateColumns.push({ colIndex: c, iso });
    }

    const sheetMeta = this.extractMatrixMetadata(allRows);
    const schoolCode = sheetMeta.schoolCode || this.fallbackContext.schoolCode;
    const className = sheetMeta.className || this.fallbackContext.className;
    const academicYear = sheetMeta.academicYear || this.fallbackContext.academicYear;

    const rows: RawGridRow[] = [];
    for (let r = headerRowIndex + 1; r < allRows.length; r++) {
      const raw = allRows[r] ?? [];
      if (isEmptyRow(raw)) continue;

      const studentId = stringifyCell(raw[0]);
      for (const { colIndex, iso } of dateColumns) {
        const statusRaw = raw[colIndex];
        // A blank matrix cell simply means the session was not marked.
        if (isBlank(statusRaw)) continue;

        rows.push({
          rowIndex: r + 1,
          cells: {
            schoolCode,
            className,
            academicYear,
            sessionDate: iso,
            studentId,
            status: stringifyCell(statusRaw),
            remarks: '',
          },
          rawCells: {
            schoolCode,
            className,
            academicYear,
            sessionDate: iso,
            studentId,
            status: statusRaw,
            remarks: '',
          },
          errors: [],
          excluded: false,
        });
      }
    }

    return { columns: this.columns, rows };
  }

  /** Pick the matrix pivot when the sheet is a grid, else the row-based build. */
  protected override buildFromSheet(
    allRows: unknown[][],
    headerRowIndex: number
  ): { grid: DataGrid; missingColumns: string[]; format: UploadSheetFormat } {
    const header = allRows[headerRowIndex] ?? [];
    const firstHeaderCell = normalizeHeader(header[0]);
    const isMatrix =
      ['studentid', 'studentcode', 'id', 'student'].includes(firstHeaderCell) &&
      !normalizeHeader(header[1]).includes('class');

    if (isMatrix) {
      return { grid: this.buildMatrixGrid(allRows, headerRowIndex), missingColumns: [], format: 'MATRIX' };
    }
    return super.buildFromSheet(allRows, headerRowIndex);
  }

  // -------------------------------------------------------------------------
  // Validation rules
  // -------------------------------------------------------------------------

  protected validateRow(row: RawGridRow): RowValidationOutcome<AttendanceUploadRow> {
    const errors: ValidationError[] = [];
    const { rowIndex, cells, rawCells } = row;

    const schoolCode = (cells['schoolCode'] ?? '').trim();
    const className = (cells['className'] ?? '').trim();
    const academicYear = (cells['academicYear'] ?? '').trim();
    const studentId = (cells['studentId'] ?? '').trim();
    const remarks = (cells['remarks'] ?? '').trim();
    const statusRaw = cells['status'] ?? '';

    if (!schoolCode) {
      errors.push(this.rowError(rowIndex, 'schoolCode', cells['schoolCode'], 'schoolCode is required.'));
    }
    if (!className) {
      errors.push(this.rowError(rowIndex, 'className', cells['className'], 'className is required.'));
    }
    if (!academicYear) {
      errors.push(
        this.rowError(rowIndex, 'academicYear', cells['academicYear'], 'academicYear is required.')
      );
    } else if (!ACADEMIC_YEAR_REGEX.test(academicYear)) {
      errors.push(
        this.rowError(
          rowIndex,
          'academicYear',
          academicYear,
          `Invalid academicYear "${academicYear}". Expected the format YYYY-YYYY, e.g. 2026-2027.`
        )
      );
    }

    // Prefer the untouched spreadsheet cell so an Excel serial date still
    // converts correctly; fall back to the (possibly inline-edited) string.
    const rawDate = rawCells?.['sessionDate'];
    const sessionDate = toIsoDate(isBlank(rawDate) ? cells['sessionDate'] : rawDate);
    if (!sessionDate) {
      errors.push(
        this.rowError(
          rowIndex,
          'sessionDate',
          cells['sessionDate'],
          `Invalid sessionDate "${cells['sessionDate']}". Expected YYYY-MM-DD or a valid Excel date.`
        )
      );
    }

    const status = normalizeAttendanceStatus(statusRaw);
    if (!status) {
      errors.push(
        this.rowError(
          rowIndex,
          'status',
          statusRaw,
          `Invalid status "${statusRaw}". Expected one of: ${ATTENDANCE_STATUSES.join(', ')}.`
        )
      );
    }

    // --- The class-cancellation business rule ---
    if (status === 'CANCELLED') {
      // studentId may be blank, but remarks become mandatory.
      if (!remarks) {
        errors.push(
          this.rowError(
            rowIndex,
            'remarks',
            cells['remarks'],
            'remarks is required when status is CANCELLED (e.g. "School function").'
          )
        );
      }
    } else if (status && !studentId) {
      errors.push(
        this.rowError(
          rowIndex,
          'studentId',
          cells['studentId'],
          `studentId is required when status is ${status}. Leave it blank only for CANCELLED sessions.`
        )
      );
    }

    const hasError = errors.length > 0;
    const value: AttendanceUploadRow | null = hasError || !status || !sessionDate
      ? null
      : {
          schoolCode,
          className,
          academicYear,
          sessionDate,
          studentId: studentId || null,
          status,
          remarks: remarks || null,
        };

    return { value, errors };
  }

  /**
   * A given student may only be marked once per (class, session date). This
   * matters most for the matrix layout, where a pivot could produce repeats.
   */
  protected override crossRowRules(rows: RawGridRow[]): Map<number, ValidationError[]> {
    const firstSeenAt = new Map<string, number>();
    const duplicates = new Map<number, ValidationError[]>();

    for (const row of rows) {
      const schoolCode = (row.cells['schoolCode'] ?? '').trim();
      const className = (row.cells['className'] ?? '').trim();
      const academicYear = (row.cells['academicYear'] ?? '').trim();
      const sessionDate = (row.cells['sessionDate'] ?? '').trim();
      const studentId = (row.cells['studentId'] ?? '').trim();
      if (!schoolCode || !className || !sessionDate) continue;
      // Class-wide cancellations legitimately repeat, so key them separately.
      if (!studentId) continue;

      const key =
        `${schoolCode}|${className}|${academicYear}|${sessionDate}|${studentId}`.toLowerCase();
      const first = firstSeenAt.get(key);
      if (first === undefined) {
        firstSeenAt.set(key, row.rowIndex);
        continue;
      }
      const list = duplicates.get(row.rowIndex) ?? [];
      list.push(
        this.rowError(
          row.rowIndex,
          'studentId',
          studentId,
          `Duplicate attendance mark: this student already has a mark for ${sessionDate} on row ${first}.`,
          'ERROR'
        )
      );
      duplicates.set(row.rowIndex, list);
    }

    return duplicates;
  }

  protected dispatch(rows: AttendanceUploadRow[]): Observable<BatchUploadResponse> {
    const body: BulkAttendanceUploadInput = { records: rows };
    return this.http.post<BatchUploadResponse>(`${this.apiUrl}/batch-upload`, body);
  }

  protected templateSheets() {
    return [
      {
        name: 'Row-Based',
        columnWidths: [13, 11, 15, 13, 13, 12, 22],
        rows: [
          ATTENDANCE_UPLOAD_COLUMNS.map((c) => c.header),
          ['SCH-001', '6A', '2026-2027', '2026-01-05', 'EDSF-349', 'P', ''],
          ['SCH-001', '6A', '2026-2027', '2026-01-05', 'EDSF-350', 'A', 'Medical'],
          ['SCH-001', '6A', '2026-2027', '2026-01-05', 'EDSF-351', 'HALF_DAY', ''],
          ['SCH-001', '6A', '2026-2027', '2026-01-06', 'EDSF-349', 'ACTIVITY', ''],
          // A class-wide cancellation: studentId is blank, remarks is required.
          ['SCH-001', '6A', '2026-2027', '2026-01-07', '', 'CANCELLED', 'School function'],
        ],
      },
      {
        name: 'Matrix',
        columnWidths: [15, 13, 13, 13, 13],
        rows: [
          ['schoolCode: SCH-001', '', 'className: 6A', '', 'academicYear: 2026-2027'],
          ['Student ID', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'],
          ['EDSF-349', 'P', 'A', 'HALF_DAY', 'P'],
          ['EDSF-350', 'A', 'P', 'ACTIVITY', 'P'],
          ['EDSF-351', 'P', 'P', '', 'A'],
        ],
      },
      {
        name: 'Instructions',
        columnWidths: [18, 72],
        rows: [
          ['Field', 'Rule'],
          ['schoolCode', 'Required. Must match an existing School code.'],
          ['className', 'Required. Must already exist for that school + academic year.'],
          ['academicYear', 'Required. Must match the pattern YYYY-YYYY.'],
          ['sessionDate', 'Required. YYYY-MM-DD, or an Excel date cell (converted automatically).'],
          ['studentId', 'Required for every status EXCEPT CANCELLED.'],
          [
            'status',
            'Required. One of P, A, HALF_DAY, ACTIVITY, ON_LEAVE, CANCELLED (case-insensitive).',
          ],
          [
            'remarks',
            'Required when status is CANCELLED (e.g. "School function", "Teacher on leave").',
          ],
          ['Matrix layout', 'Row 1 = dates, column A = student IDs. Add a metadata row for the class.'],
        ],
      },
    ];
  }
}

/** Alias matching the `AttendanceServiceUpload` naming in the feature brief. */
export { AttendanceUploadService as AttendanceServiceUpload };


