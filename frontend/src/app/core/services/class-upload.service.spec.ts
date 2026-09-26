import { describe, expect, it } from 'vitest';
import { ClassUploadService, CLASS_UPLOAD_COLUMNS } from './class-upload.service';
import { DataGrid, GridRow } from '../models/upload.models';

/**
 * `validateGrid` is pure and synchronous, so no HttpClient is needed — the
 * constructor argument is only used by `dispatch`, which these tests never call.
 */
const service = new ClassUploadService(null as never);

function row(rowIndex: number, cells: Record<string, string>, excluded = false): GridRow {
  return { rowIndex, cells, errors: [], excluded };
}

function grid(rows: GridRow[]): DataGrid {
  return { columns: CLASS_UPLOAD_COLUMNS, rows };
}

const validCells = {
  schoolCode: 'SCH-001',
  className: '6A',
  academicYear: '2026-2027',
  section: 'A',
  name: 'SCH-001 6A',
  capacity: '40',
};

describe('ClassUploadService validation', () => {
  it('accepts a fully valid sheet', () => {
    const result = service.validateGrid(grid([row(2, { ...validCells })]));

    expect(result.isValid).toBe(true);
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0]).toMatchObject({
      schoolCode: 'SCH-001',
      className: '6A',
      academicYear: '2026-2027',
      capacity: 40,
    });
    expect(result.errors).toHaveLength(0);
  });

  it('requires schoolCode, className and academicYear', () => {
    const result = service.validateGrid(
      grid([row(2, { schoolCode: '', className: '', academicYear: '' })])
    );

    expect(result.isValid).toBe(false);
    expect(result.validRows).toHaveLength(0);

    const columns = result.errors.map((e) => e.columnName).sort();
    expect(columns).toEqual(['academicYear', 'className', 'schoolCode']);
    // Every error must be row-scoped and ERROR severity.
    expect(result.errors.every((e) => e.rowIndex === 2 && e.severity === 'ERROR')).toBe(true);
  });

  it('rejects an academicYear that does not match ^\\d{4}-\\d{4}$', () => {
    for (const bad of ['2026', '26-2027', '2026/2027', '2026-27', 'AY2026-2027', '2026-20277']) {
      const result = service.validateGrid(
        grid([row(2, { ...validCells, academicYear: bad })])
      );

      expect(result.isValid, `"${bad}" should be rejected`).toBe(false);
      const err = result.errors.find((e) => e.columnName === 'academicYear');
      expect(err?.errorMessage).toContain('YYYY-YYYY');
      expect(err?.invalidValue).toBe(bad);
    }
  });

  it('accepts any well-formed academic year', () => {
    for (const good of ['2026-2027', '2025-2026', '2030-2031']) {
      const result = service.validateGrid(grid([row(2, { ...validCells, academicYear: good })]));
      expect(result.isValid, `"${good}" should be accepted`).toBe(true);
    }
  });

  it('flags duplicate schoolCode + className + academicYear (case-insensitive)', () => {
    const result = service.validateGrid(
      grid([
        row(2, { ...validCells }),
        // Same triple, different casing and padding -> still a duplicate.
        row(3, { ...validCells, schoolCode: ' sch-001 ', className: '6a' }),
      ])
    );

    expect(result.isValid).toBe(false);
    // The first occurrence is kept; only the later duplicate is an error.
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].className).toBe('6A');

    const dup = result.errors.find((e) => e.rowIndex === 3);
    expect(dup?.errorMessage).toContain('Duplicate class');
    expect(dup?.errorMessage).toContain('row 2');
  });

  it('treats a different academicYear as a distinct class, not a duplicate', () => {
    const result = service.validateGrid(
      grid([
        row(2, { ...validCells }),
        row(3, { ...validCells, academicYear: '2027-2028' }),
      ])
    );

    expect(result.isValid).toBe(true);
    expect(result.validRows).toHaveLength(2);
  });

  it('validates the optional capacity bounds', () => {
    const tooBig = service.validateGrid(grid([row(2, { ...validCells, capacity: '900' })]));
    expect(tooBig.isValid).toBe(false);
    expect(tooBig.errors.some((e) => e.columnName === 'capacity')).toBe(true);

    const nonInteger = service.validateGrid(grid([row(2, { ...validCells, capacity: '12.5' })]));
    expect(nonInteger.isValid).toBe(false);

    // Blank capacity is legal and resolves to null (server defaults to 40).
    const blank = service.validateGrid(grid([row(2, { ...validCells, capacity: '' })]));
    expect(blank.isValid).toBe(true);
    expect(blank.validRows[0].capacity).toBeNull();
  });

  it('never dispatches excluded rows, and they stop blocking the upload', () => {
    const result = service.validateGrid(
      grid([
        row(2, { ...validCells }),
        row(3, { ...validCells, academicYear: 'nope' }, true),
      ])
    );

    // Only the broken row was errored, and it is excluded, so the file is clean.
    expect(result.isValid).toBe(true);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].academicYear).toBe('2026-2027');
  });

  it('exposes the expected endpoint and required headers', () => {
    expect(service.endpointLabel).toBe('POST /classes/batch');
    expect(service.requiredHeaderKeys).toEqual(['schoolCode', 'className', 'academicYear']);
    expect(service.entityType).toBe('CLASSES');
  });
});
