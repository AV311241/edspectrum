import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BatchClassUploadInput,
  BatchUploadResponse,
  ClassUploadRow,
  ColumnSpec,
  UploadEntityType,
  ValidationError,
} from '../models/upload.models';
import { ACADEMIC_YEAR_REGEX, RawGridRow } from '../utils/excel-upload.utils';
import { BulkUploadService, RowValidationOutcome } from './bulk-upload-base.service';

export const CLASS_UPLOAD_COLUMNS: ColumnSpec[] = [
  {
    key: 'schoolCode',
    header: 'schoolCode',
    required: true,
    editable: true,
    example: 'SCH-001',
    help: 'Must already exist in the Schools master.',
  },
  {
    key: 'className',
    header: 'className',
    required: true,
    editable: true,
    example: '6A',
    help: 'Free text, e.g. 6A, 8th A, Grade-3B.',
  },
  {
    key: 'academicYear',
    header: 'academicYear',
    required: true,
    editable: true,
    example: '2026-2027',
    help: 'Must match the pattern YYYY-YYYY.',
  },
  {
    key: 'section',
    header: 'section',
    required: false,
    editable: true,
    example: 'A',
    help: 'Optional. Defaults to "A".',
  },
  {
    key: 'name',
    header: 'name',
    required: false,
    editable: true,
    example: 'SCH-001 6A',
    help: 'Optional. Defaults to "<schoolCode> <className>".',
  },
  {
    key: 'capacity',
    header: 'capacity',
    required: false,
    editable: true,
    example: '40',
    help: 'Optional whole number 1-500. Defaults to 40.',
  },
];

/**
 * Bulk upload for the **Classes Master** sheet.
 *
 * Validation rules:
 *  - `schoolCode`  : non-empty string
 *  - `className`   : non-empty string
 *  - `academicYear`: must match `^\d{4}-\d{4}$`
 *  - duplicate     : `schoolCode` + `className` + `academicYear` must be unique
 *                    within the uploaded sheet (case-insensitive)
 *
 * Dispatches to `POST /classes/batch`.
 */
@Injectable({ providedIn: 'root' })
export class ClassUploadService extends BulkUploadService<ClassUploadRow> {
  readonly entityType: UploadEntityType = 'CLASSES';
  readonly label = 'Classes Master';
  readonly description =
    'Bulk-create class sections for an academic year. Upload this first — Students and Attendance both reference these classes.';
  readonly icon = 'academic-cap';
  readonly endpointLabel = 'POST /classes/batch';
  readonly templateFileName = 'Classes_Master_Template.xlsx';

  readonly columns: ColumnSpec[] = CLASS_UPLOAD_COLUMNS;
  readonly requiredHeaderKeys: string[] = ['schoolCode', 'className', 'academicYear'];

  // Declared explicitly because Angular cannot inherit a constructor from the
  // undecorated BulkUploadService base (NG2006).
  constructor(http: HttpClient) {
    super(http);
  }

  private readonly apiUrl = `${environment.apiUrl}/classes`;

  protected validateRow(row: RawGridRow): RowValidationOutcome<ClassUploadRow> {
    const errors: ValidationError[] = [];
    const { rowIndex, cells } = row;

    const schoolCode = (cells['schoolCode'] ?? '').trim();
    const className = (cells['className'] ?? '').trim();
    const academicYear = (cells['academicYear'] ?? '').trim();
    const section = (cells['section'] ?? '').trim();
    const name = (cells['name'] ?? '').trim();
    const capacityRaw = (cells['capacity'] ?? '').trim();

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

    let capacity: number | null = null;
    if (capacityRaw) {
      const parsed = Number(capacityRaw);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) {
        errors.push(
          this.rowError(
            rowIndex,
            'capacity',
            capacityRaw,
            `Invalid capacity "${capacityRaw}". Expected a whole number between 1 and 500.`
          )
        );
      } else {
        capacity = parsed;
      }
    }

    const hasError = errors.length > 0;
    const value: ClassUploadRow | null = hasError
      ? null
      : { schoolCode, className, academicYear, section: section || null, name: name || null, capacity };

    return { value, errors };
  }

  /**
   * `schoolCode` + `className` + `academicYear` must be unique within the file.
   * The first occurrence is kept and every later duplicate is flagged.
   */
  protected override crossRowRules(rows: RawGridRow[]): Map<number, ValidationError[]> {
    const firstSeenAt = new Map<string, number>();
    const duplicates = new Map<number, ValidationError[]>();

    for (const row of rows) {
      const schoolCode = (row.cells['schoolCode'] ?? '').trim();
      const className = (row.cells['className'] ?? '').trim();
      const academicYear = (row.cells['academicYear'] ?? '').trim();
      if (!schoolCode || !className || !academicYear) continue;

      const key = `${schoolCode}|${className}|${academicYear}`.toLowerCase();
      const first = firstSeenAt.get(key);
      if (first === undefined) {
        firstSeenAt.set(key, row.rowIndex);
        continue;
      }
      const list = duplicates.get(row.rowIndex) ?? [];
      list.push(
        this.rowError(
          row.rowIndex,
          'className',
          className,
          `Duplicate class: schoolCode + className + academicYear already appears on row ${first}.`,
          'ERROR'
        )
      );
      duplicates.set(row.rowIndex, list);
    }

    return duplicates;
  }

  protected dispatch(rows: ClassUploadRow[]): Observable<BatchUploadResponse> {
    const body: BatchClassUploadInput = { classes: rows };
    return this.http.post<BatchUploadResponse>(`${this.apiUrl}/batch`, body);
  }

  protected templateSheets() {
    return [
      {
        name: 'Classes',
        columnWidths: [14, 14, 16, 10, 24, 11],
        rows: [
          CLASS_UPLOAD_COLUMNS.map((c) => c.header),
          ['SCH-001', '6A', '2026-2027', 'A', 'SCH-001 6A', 40],
          ['SCH-001', '8th A', '2026-2027', 'A', 'SCH-001 8th A', 40],
          ['SCH-002', '6A', '2026-2027', 'A', 'SCH-002 6A', 40],
        ],
      },
      {
        name: 'Instructions',
        columnWidths: [18, 72],
        rows: [
          ['Field', 'Rule'],
          ['schoolCode', 'Required. Must match an existing School code (e.g. SCH-001).'],
          ['className', 'Required. Free text, e.g. 6A or 8th A.'],
          ['academicYear', 'Required. Must match the pattern YYYY-YYYY, e.g. 2026-2027.'],
          ['section', 'Optional. Defaults to "A" when blank.'],
          ['name', 'Optional display name. Defaults to "<schoolCode> <className>".'],
          ['capacity', 'Optional whole number 1-500. Defaults to 40.'],
          ['Uniqueness', 'schoolCode + className + academicYear must be unique within the file.'],
        ],
      },
    ];
  }
}

/** Alias matching the `ClassServiceUpload` naming used in the feature brief. */
export { ClassUploadService as ClassServiceUpload };
