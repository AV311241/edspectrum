import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BatchStudentUploadInput,
  BatchUploadResponse,
  ColumnSpec,
  StudentUploadRow,
  UploadEntityType,
  ValidationError,
} from '../models/upload.models';
import { ACADEMIC_YEAR_REGEX, RawGridRow, coerceBoolean } from '../utils/excel-upload.utils';
import { BulkUploadService, RowValidationOutcome } from './bulk-upload-base.service';

export const STUDENT_UPLOAD_COLUMNS: ColumnSpec[] = [
  {
    key: 'studentId',
    header: 'studentId',
    required: true,
    editable: true,
    example: 'EDSF-349',
    help: 'Must be unique within the file and within the school.',
  },
  {
    key: 'schoolCode',
    header: 'schoolCode',
    required: true,
    editable: true,
    example: 'SCH-001',
    help: 'Must match an existing School code.',
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
    help: 'Must match the pattern YYYY-YYYY.',
  },
  {
    key: 'studentName',
    header: 'studentName',
    required: true,
    editable: true,
    example: 'Aarav Sharma',
    help: 'Split into first / last name on the server.',
  },
  {
    key: 'isActive',
    header: 'isActive',
    required: false,
    editable: true,
    example: 'TRUE',
    help: 'TRUE/FALSE or 1/0. Defaults to TRUE when blank.',
  },
];

/**
 * Bulk upload for the **Students Master** sheet.
 *
 * Validation rules:
 *  - `studentId`  : required and unique within the file
 *  - `schoolCode` : required
 *  - `className`  : required
 *  - `studentName`: required, non-empty
 *  - `isActive`   : boolean flag, defaults to `true` when omitted
 *
 * Dispatches to `POST /students/batch`.
 */
@Injectable({ providedIn: 'root' })
export class StudentUploadService extends BulkUploadService<StudentUploadRow> {
  readonly entityType: UploadEntityType = 'STUDENTS';
  readonly label = 'Students Master';
  readonly description =
    'Bulk-create students and enrol them into their class sections. Classes must already be uploaded for the referenced schoolCode + className + academicYear.';
  readonly icon = 'users';
  readonly endpointLabel = 'POST /students/batch';
  readonly templateFileName = 'Students_Master_Template.xlsx';

  readonly columns: ColumnSpec[] = STUDENT_UPLOAD_COLUMNS;
  readonly requiredHeaderKeys: string[] = [
    'studentId',
    'schoolCode',
    'className',
    'academicYear',
    'studentName',
  ];

  // Declared explicitly because Angular cannot inherit a constructor from the
  // undecorated BulkUploadService base (NG2006).
  constructor(http: HttpClient) {
    super(http);
  }

  private readonly apiUrl = `${environment.apiUrl}/students`;

  protected validateRow(row: RawGridRow): RowValidationOutcome<StudentUploadRow> {
    const errors: ValidationError[] = [];
    const { rowIndex, cells } = row;

    const studentId = (cells['studentId'] ?? '').trim();
    const schoolCode = (cells['schoolCode'] ?? '').trim();
    const className = (cells['className'] ?? '').trim();
    const academicYear = (cells['academicYear'] ?? '').trim();
    const studentName = (cells['studentName'] ?? '').trim();

    if (!studentId) {
      errors.push(this.rowError(rowIndex, 'studentId', cells['studentId'], 'studentId is required.'));
    }
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
    if (!studentName) {
      errors.push(
        this.rowError(rowIndex, 'studentName', cells['studentName'], 'studentName is required.')
      );
    }

    // Blank defaults to TRUE; anything unrecognised is a hard error.
    const isActive = coerceBoolean(cells['isActive']);
    if (isActive === null) {
      errors.push(
        this.rowError(
          rowIndex,
          'isActive',
          cells['isActive'],
          `Invalid isActive value "${cells['isActive']}". Expected TRUE/FALSE, 1/0, YES/NO.`
        )
      );
    }

    const hasError = errors.length > 0;
    const value: StudentUploadRow | null = hasError
      ? null
      : { studentId, schoolCode, className, academicYear, studentName, isActive: isActive ?? true };

    return { value, errors };
  }

  /** `studentId` must be unique across the whole file. */
  protected override crossRowRules(rows: RawGridRow[]): Map<number, ValidationError[]> {
    const firstSeenAt = new Map<string, number>();
    const duplicates = new Map<number, ValidationError[]>();

    for (const row of rows) {
      const studentId = (row.cells['studentId'] ?? '').trim();
      if (!studentId) continue;

      const key = studentId.toLowerCase();
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
          `Duplicate studentId "${studentId}" already appears on row ${first}.`,
          'ERROR'
        )
      );
      duplicates.set(row.rowIndex, list);
    }

    return duplicates;
  }

  protected dispatch(rows: StudentUploadRow[]): Observable<BatchUploadResponse> {
    const body: BatchStudentUploadInput = { students: rows };
    return this.http.post<BatchUploadResponse>(`${this.apiUrl}/batch`, body);
  }

  protected templateSheets() {
    return [
      {
        name: 'Students',
        columnWidths: [14, 13, 12, 16, 22, 10],
        rows: [
          STUDENT_UPLOAD_COLUMNS.map((c) => c.header),
          ['EDSF-349', 'SCH-001', '6A', '2026-2027', 'Aarav Sharma', 'TRUE'],
          ['EDSF-350', 'SCH-001', '6A', '2026-2027', 'Diya Patel', 'TRUE'],
          ['EDSF-351', 'SCH-001', '8th A', '2026-2027', 'Rohan Iyer', 'FALSE'],
        ],
      },
      {
        name: 'Instructions',
        columnWidths: [18, 72],
        rows: [
          ['Field', 'Rule'],
          ['studentId', 'Required. Must be unique within this file.'],
          ['schoolCode', 'Required. Must match an existing School code.'],
          ['className', 'Required. Must already exist for that school + academic year.'],
          ['academicYear', 'Required. Must match the pattern YYYY-YYYY, e.g. 2026-2027.'],
          ['studentName', 'Required. Split into first / last name on the server.'],
          ['isActive', 'Optional. TRUE/FALSE or 1/0. Defaults to TRUE when blank.'],
        ],
      },
    ];
  }
}

/** Alias matching the `StudentServiceUpload` naming used in the feature brief. */
export { StudentUploadService as StudentServiceUpload };
