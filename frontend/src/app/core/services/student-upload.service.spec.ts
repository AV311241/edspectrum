import { describe, expect, it } from 'vitest';
import { StudentUploadService, STUDENT_UPLOAD_COLUMNS } from './student-upload.service';
import { DataGrid, GridRow } from '../models/upload.models';

const service = new StudentUploadService(null as never);

function row(rowIndex: number, cells: Record<string, string>, excluded = false): GridRow {
  return { rowIndex, cells, errors: [], excluded };
}

function grid(rows: GridRow[]): DataGrid {
  return { columns: STUDENT_UPLOAD_COLUMNS, rows };
}

const validCells = {
  studentId: 'EDSF-349',
  schoolCode: 'SCH-001',
  className: '6A',
  academicYear: '2026-2027',
  studentName: 'Aarav Sharma',
  isActive: 'TRUE',
};

describe('StudentUploadService validation', () => {
  it('accepts a fully valid sheet', () => {
    const result = service.validateGrid(grid([row(2, { ...validCells })]));

    expect(result.isValid).toBe(true);
    expect(result.validRows[0]).toEqual({
      studentId: 'EDSF-349',
      schoolCode: 'SCH-001',
      className: '6A',
      academicYear: '2026-2027',
      studentName: 'Aarav Sharma',
      isActive: true,
    });
  });

  it('requires studentId, schoolCode, className, academicYear and studentName', () => {
    const result = service.validateGrid(
      grid([
        row(2, {
          studentId: '',
          schoolCode: '',
          className: '',
          academicYear: '',
          studentName: '',
          isActive: 'TRUE',
        }),
      ])
    );

    expect(result.isValid).toBe(false);
    expect(result.validRows).toHaveLength(0);
    expect(result.errors.map((e) => e.columnName).sort()).toEqual([
      'academicYear',
      'className',
      'schoolCode',
      'studentId',
      'studentName',
    ]);
  });

  it('rejects a blank-but-whitespace studentName', () => {
    const result = service.validateGrid(grid([row(2, { ...validCells, studentName: '   ' })]));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.columnName === 'studentName')).toBe(true);
  });

  it('flags duplicate studentId across the whole file', () => {
    const result = service.validateGrid(
      grid([
        row(2, { ...validCells }),
        row(3, { ...validCells, className: '8th A', studentId: 'EDSF-349' }),
        // Different case must still collide.
        row(4, { ...validCells, className: '7B', studentId: 'edsf-349' }),
      ])
    );

    expect(result.isValid).toBe(false);
    expect(result.validRows).toHaveLength(1);

    const dup3 = result.errors.find((e) => e.rowIndex === 3);
    expect(dup3?.errorMessage).toContain('Duplicate studentId');
    expect(dup3?.errorMessage).toContain('row 2');

    const dup4 = result.errors.find((e) => e.rowIndex === 4);
    expect(dup4?.errorMessage).toContain('row 2');
  });

  it('coerces every accepted isActive spelling', () => {
    const truthy = ['TRUE', 'true', '1', 'YES', 'y', 'active'];
    const falsy = ['FALSE', 'false', '0', 'NO', 'n', 'inactive'];

    for (const raw of truthy) {
      const result = service.validateGrid(grid([row(2, { ...validCells, isActive: raw })]));
      expect(result.isValid, `"${raw}" should be valid`).toBe(true);
      expect(result.validRows[0].isActive, `"${raw}" should be true`).toBe(true);
    }

    for (const raw of falsy) {
      const result = service.validateGrid(grid([row(2, { ...validCells, isActive: raw })]));
      expect(result.isValid, `"${raw}" should be valid`).toBe(true);
      expect(result.validRows[0].isActive, `"${raw}" should be false`).toBe(false);
    }
  });

  it('defaults isActive to true when the column is omitted or blank', () => {
    for (const raw of ['', '   ']) {
      const result = service.validateGrid(grid([row(2, { ...validCells, isActive: raw })]));
      expect(result.isValid).toBe(true);
      expect(result.validRows[0].isActive).toBe(true);
    }
  });

  it('rejects an unrecognised isActive value rather than defaulting it', () => {
    const result = service.validateGrid(grid([row(2, { ...validCells, isActive: 'maybe' })]));

    expect(result.isValid).toBe(false);
    expect(result.validRows).toHaveLength(0);
    const err = result.errors.find((e) => e.columnName === 'isActive');
    expect(err?.errorMessage).toContain('TRUE/FALSE');
  });

  it('rejects a malformed academicYear', () => {
    const result = service.validateGrid(grid([row(2, { ...validCells, academicYear: '2026-27' })]));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.columnName === 'academicYear')).toBe(true);
  });

  it('excludes the endpoint and required headers as expected', () => {
    expect(service.endpointLabel).toBe('POST /students/batch');
    expect(service.entityType).toBe('STUDENTS');
    expect(service.requiredHeaderKeys).toContain('studentId');
    expect(service.requiredHeaderKeys).toContain('studentName');
  });
});
