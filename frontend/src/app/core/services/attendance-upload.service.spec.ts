import { describe, expect, it } from 'vitest';
import {
  ATTENDANCE_UPLOAD_COLUMNS,
  AttendanceUploadService,
  normalizeAttendanceStatus,
} from './attendance-upload.service';
import { DataGrid, GridRow, MatrixContext } from '../models/upload.models';

const service = new AttendanceUploadService(null as never);

function row(rowIndex: number, cells: Record<string, string>, excluded = false): GridRow {
  return { rowIndex, cells, errors: [], excluded };
}

function grid(rows: GridRow[]): DataGrid {
  return { columns: ATTENDANCE_UPLOAD_COLUMNS, rows };
}

const validCells = {
  schoolCode: 'SCH-001',
  className: '6A',
  academicYear: '2026-2027',
  sessionDate: '2026-01-05',
  studentId: 'EDSF-349',
  status: 'P',
  remarks: '',
};

/** Expose the protected sheet->grid step so the matrix pivot can be tested. */
class TestableAttendanceService extends AttendanceUploadService {
  buildFromRows(allRows: unknown[][]): {
    rows: GridRow[];
    format: string;
    missing: string[];
    headerIndex: number;
  } {
    const self = this as unknown as {
      locateHeader(rows: unknown[][]): number;
      buildFromSheet(
        rows: unknown[][],
        headerIndex: number
      ): { grid: DataGrid; missingColumns: string[]; format: string };
    };
    const headerIndex = self.locateHeader(allRows);
    const built = self.buildFromSheet(allRows, headerIndex);
    return {
      rows: built.grid.rows,
      format: built.format,
      missing: built.missingColumns,
      headerIndex,
    };
  }
}

describe('normalizeAttendanceStatus', () => {
  it('folds the canonical values and common synonyms', () => {
    const cases: [string, string][] = [
      ['P', 'P'],
      ['p', 'P'],
      ['Present', 'P'],
      ['A', 'A'],
      ['AB', 'A'],
      ['absent', 'A'],
      ['HALF_DAY', 'HALF_DAY'],
      ['half day', 'HALF_DAY'],
      ['HD', 'HALF_DAY'],
      ['ACTIVITY', 'ACTIVITY'],
      ['act', 'ACTIVITY'],
      ['CANCELLED', 'CANCELLED'],
      ['canceled', 'CANCELLED'],
    ];
    for (const [input, expected] of cases) {
      expect(normalizeAttendanceStatus(input), input).toBe(expected);
    }
  });

  it('rejects anything outside the allowed set', () => {
    for (const bad of ['HOLIDAY', 'PP', 'LEAVE', 'yes', '']) {
      expect(normalizeAttendanceStatus(bad), bad).toBeNull();
    }
  });
});

describe('AttendanceUploadService — row-based format', () => {
  it('accepts a fully valid row', () => {
    const result = service.validateGrid(grid([row(2, { ...validCells })]));

    expect(result.isValid).toBe(true);
    expect(result.validRows[0]).toEqual({
      schoolCode: 'SCH-001',
      className: '6A',
      academicYear: '2026-2027',
      sessionDate: '2026-01-05',
      studentId: 'EDSF-349',
      status: 'P',
      remarks: null,
    });
  });

  it('requires schoolCode, className, academicYear, sessionDate and status', () => {
    const result = service.validateGrid(
      grid([
        row(2, {
          schoolCode: '',
          className: '',
          academicYear: '',
          sessionDate: '',
          studentId: '',
          status: '',
          remarks: '',
        }),
      ])
    );

    expect(result.isValid).toBe(false);
    expect(result.validRows).toHaveLength(0);
    expect(result.errors.map((e) => e.columnName).sort()).toEqual([
      'academicYear',
      'className',
      'schoolCode',
      'sessionDate',
      'status',
    ]);
  });

  it('rejects a sessionDate that is not a real calendar date', () => {
    for (const bad of ['2026-13-45', '05-01-2026x', 'not-a-date', '2026-01-32']) {
      const result = service.validateGrid(grid([row(2, { ...validCells, sessionDate: bad })]));
      expect(result.isValid, `"${bad}" should be rejected`).toBe(false);
      expect(result.errors.some((e) => e.columnName === 'sessionDate')).toBe(true);
    }
  });

  it('rejects a status outside the allowed set', () => {
    const result = service.validateGrid(grid([row(2, { ...validCells, status: 'HOLIDAY' })]));

    expect(result.isValid).toBe(false);
    const err = result.errors.find((e) => e.columnName === 'status');
    expect(err?.errorMessage).toContain('P, A, HALF_DAY, ACTIVITY, CANCELLED');
  });

  it('requires studentId for every status except CANCELLED', () => {
    for (const status of ['P', 'A', 'HALF_DAY', 'ACTIVITY']) {
      const result = service.validateGrid(
        grid([row(2, { ...validCells, status, studentId: '' })])
      );
      expect(result.isValid, `${status} should require a studentId`).toBe(false);
      const err = result.errors.find((e) => e.columnName === 'studentId');
      expect(err?.errorMessage).toContain(status);
    }
  });

  it('allows a blank studentId when status is CANCELLED but demands remarks', () => {
    const noRemarks = service.validateGrid(
      grid([row(2, { ...validCells, studentId: '', status: 'CANCELLED', remarks: '' })])
    );

    expect(noRemarks.isValid).toBe(false);
    const err = noRemarks.errors.find((e) => e.columnName === 'remarks');
    expect(err?.errorMessage).toContain('remarks is required when status is CANCELLED');
    // The studentId rule must not fire for a cancellation.
    expect(noRemarks.errors.some((e) => e.columnName === 'studentId')).toBe(false);

    const withRemarks = service.validateGrid(
      grid([
        row(2, { ...validCells, studentId: '', status: 'CANCELLED', remarks: 'School function' }),
      ])
    );

    expect(withRemarks.isValid).toBe(true);
    expect(withRemarks.validRows[0]).toMatchObject({
      status: 'CANCELLED',
      studentId: null,
      remarks: 'School function',
    });
  });

  it('flags a student marked twice for the same class and session date', () => {
    const result = service.validateGrid(
      grid([row(2, { ...validCells }), row(3, { ...validCells, status: 'A' })])
    );

    expect(result.isValid).toBe(false);
    expect(result.validRows).toHaveLength(1);
    expect(
      result.errors.some((e) => e.rowIndex === 3 && e.errorMessage.includes('Duplicate attendance'))
    ).toBe(true);
  });

  it('allows the same student on different session dates', () => {
    const result = service.validateGrid(
      grid([row(2, { ...validCells }), row(3, { ...validCells, sessionDate: '2026-01-06' })])
    );

    expect(result.isValid).toBe(true);
    expect(result.validRows).toHaveLength(2);
  });

  it('exposes the expected endpoint', () => {
    expect(service.endpointLabel).toBe('POST /attendance/batch-upload');
    expect(service.entityType).toBe('ATTENDANCE');
  });
});

describe('AttendanceUploadService — Excel matrix format', () => {
  it('pivots date columns x student rows into logical rows', () => {
    const tester = new TestableAttendanceService(null as never);
    const sheet = [
      ['schoolCode: SCH-001', '', 'className: 6A', '', 'academicYear: 2026-2027'],
      ['Student ID', '2026-01-05', '2026-01-06', '2026-01-07'],
      ['EDSF-349', 'P', 'A', 'HALF_DAY'],
      ['EDSF-350', 'A', 'P', 'ACTIVITY'],
    ];

    const built = tester.buildFromRows(sheet);

    expect(built.format).toBe('MATRIX');
    // 3 date columns x 2 students = 6 logical rows.
    expect(built.rows).toHaveLength(6);

    expect(built.rows[0].rowIndex).toBe(3);
    expect(built.rows[0].cells).toMatchObject({
      schoolCode: 'SCH-001',
      className: '6A',
      academicYear: '2026-2027',
      sessionDate: '2026-01-05',
      studentId: 'EDSF-349',
      status: 'P',
    });
  });

  it('skips blank matrix cells (unmarked sessions)', () => {
    const tester = new TestableAttendanceService(null as never);
    const sheet = [
      ['schoolCode: SCH-001', 'className: 6A', 'academicYear: 2026-2027'],
      ['Student ID', '2026-01-05', '2026-01-06'],
      ['EDSF-349', 'P', ''],
      ['EDSF-350', 'A', 'P'],
    ];

    expect(tester.buildFromRows(sheet).rows).toHaveLength(3);
  });

  it('validates a pivoted matrix end-to-end', () => {
    const tester = new TestableAttendanceService(null as never);
    const sheet = [
      ['schoolCode: SCH-001', 'className: 6A', 'academicYear: 2026-2027'],
      ['Student ID', '2026-01-05', '2026-01-06'],
      ['EDSF-349', 'P', 'HOLIDAY'],
      ['EDSF-350', 'A', 'P'],
    ];

    const built = tester.buildFromRows(sheet);
    const result = service.validateGrid({ columns: ATTENDANCE_UPLOAD_COLUMNS, rows: built.rows });

    // The single bad status blocks exactly one pivoted row.
    expect(result.isValid).toBe(false);
    expect(result.totalRows).toBe(4);
    expect(result.validRows).toHaveLength(3);

    const statusError = result.errors.find((e) => e.columnName === 'status');
    expect(statusError?.invalidValue).toBe('HOLIDAY');
  });

  it('falls back to the caller-supplied context when no metadata row exists', () => {
    const tester = new TestableAttendanceService(null as never);
    const context: MatrixContext = {
      schoolCode: 'SCH-009',
      className: '9Z',
      academicYear: '2026-2027',
    };
    tester.setMatrixContext(context);

    const sheet = [
      ['Student ID', '2026-01-05'],
      ['EDSF-349', 'P'],
    ];

    const built = tester.buildFromRows(sheet);
    expect(built.format).toBe('MATRIX');
    expect(built.rows[0].cells).toMatchObject(context);

    const result = service.validateGrid({ columns: ATTENDANCE_UPLOAD_COLUMNS, rows: built.rows });
    expect(result.isValid).toBe(true);
  });

  it('gives every pivoted row its OWN sessionDate', () => {
    // Regression guard: one Excel row fans out into N logical rows that all
    // share a rowIndex. If those rows were resolved by rowIndex instead of by
    // identity, every date after the first column would be wrong.
    const tester = new TestableAttendanceService(null as never);
    const sheet = [
      ['schoolCode: SCH-001', 'className: 6A', 'academicYear: 2026-2027'],
      ['Student ID', '2026-01-05', '2026-01-06', '2026-01-07'],
      ['EDSF-349', 'P', 'A', 'HALF_DAY'],
    ];

    const built = tester.buildFromRows(sheet);
    const result = service.validateGrid({ columns: ATTENDANCE_UPLOAD_COLUMNS, rows: built.rows });

    expect(result.isValid).toBe(true);
    expect(result.validRows.map((r) => r.sessionDate)).toEqual([
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
    ]);
    expect(result.validRows.map((r) => r.status)).toEqual(['P', 'A', 'HALF_DAY']);
  });

  it('still detects a row-based sheet as ROW format', () => {
    const tester = new TestableAttendanceService(null as never);
    const sheet = [
      ['schoolCode', 'className', 'academicYear', 'sessionDate', 'studentId', 'status', 'remarks'],
      ['SCH-001', '6A', '2026-2027', '2026-01-05', 'EDSF-349', 'P', ''],
    ];

    const built = tester.buildFromRows(sheet);
    expect(built.format).toBe('ROW');
    expect(built.rows).toHaveLength(1);
  });
});

