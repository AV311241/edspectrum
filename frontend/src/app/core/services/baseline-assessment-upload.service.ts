import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BaselineAssessmentUploadRow,
  BatchUploadResponse,
  ColumnSpec,
  UploadEntityType,
  ValidationError,
} from '../models/upload.models';
import {
  AssessmentStatus,
  BaselineDomain,
  BulkImportBaselineAssessmentInput,
  BulkImportResponse,
  CreateBaselineAssessmentInput,
  DomainScoreInput,
  OralFlag,
} from '../models/api.models';
import { RawGridRow, normalizeHeader, toIsoDate } from '../utils/excel-upload.utils';
import { BulkUploadService, RowValidationOutcome } from './bulk-upload-base.service';

/** The seven rubric domains and the column prefix each one is written as. */
export const BASELINE_DOMAIN_PREFIXES: ReadonlyArray<{
  domain: BaselineDomain;
  prefix: string;
}> = [
  { domain: 'Vocabulary', prefix: 'V' },
  { domain: 'Grammar', prefix: 'G' },
  { domain: 'Phrase_Sentence', prefix: 'P' },
  { domain: 'Listening', prefix: 'L' },
  { domain: 'Speaking', prefix: 'S' },
  { domain: 'Reading', prefix: 'R' },
  { domain: 'Writing', prefix: 'W' },
];

/** Rubric items per domain, i.e. the `1`..`5` suffix on every column name. */
const RATING_ITEMS = [1, 2, 3, 4, 5] as const;

/** Assumed assessor when the column is left blank, matching the legacy parser. */
const DEFAULT_ASSESSOR = 'Assessor';

const ORAL_FLAGS: readonly OralFlag[] = ['C0', 'C1', 'C2', 'C3'];

/** Spreadsheet column name for a domain/item pair, e.g. Vocabulary + 2 -> `V2`. */
function ratingKey(prefix: string, item: number): string {
  return `${prefix}${item}`;
}

/** Fold `present` / `absent` / `ab` / `partial` onto the backend enum. */
export function normalizeAssessmentStatus(raw: unknown): AssessmentStatus | null {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!key) return 'Present';
  if (key === 'present' || key === 'p') return 'Present';
  if (key === 'absent' || key === 'ab' || key === 'a') return 'Absent';
  if (key === 'partial') return 'Partial';
  return null;
}

const RATING_GROUP = 'Rubric ratings (0-4, or AB for not rated)';
const IDENTITY_GROUP = 'Assessment details';

/**
 * The 35 rubric columns, generated so the domain/prefix/item tables above stay
 * the single source of truth for the column layout.
 */
const RATING_COLUMNS: ColumnSpec[] = BASELINE_DOMAIN_PREFIXES.flatMap(({ domain, prefix }) =>
  RATING_ITEMS.map((item) => ({
    key: ratingKey(prefix, item),
    header: ratingKey(prefix, item),
    required: false,
    editable: true,
    example: '3',
    group: RATING_GROUP,
    help: `${domain} item ${item}.`,
  }))
);

export const BASELINE_ASSESSMENT_UPLOAD_COLUMNS: ColumnSpec[] = [
  {
    key: 'studentId',
    header: 'Student_ID',
    required: true,
    editable: true,
    example: 'EDSF-349',
    group: IDENTITY_GROUP,
    help: 'Must match a student already in the Students master.',
  },
  {
    key: 'assessmentDate',
    header: 'Assessment_Date',
    required: true,
    editable: true,
    example: '2026-01-05',
    group: IDENTITY_GROUP,
    help: 'YYYY-MM-DD. Excel date cells are converted automatically.',
  },
  {
    key: 'assessorName',
    header: 'Assessor',
    required: true,
    editable: true,
    example: 'Meera Rao',
    group: IDENTITY_GROUP,
    help: 'Leave blank to default to "Assessor".',
  },
  {
    key: 'status',
    header: 'Status',
    required: false,
    editable: true,
    example: 'Present',
    group: IDENTITY_GROUP,
    help: 'Present, Absent or Partial. Defaults to Present when blank.',
  },
  {
    key: 'keySupportFlag',
    header: 'Key_Support_Flag',
    required: false,
    editable: true,
    example: 'Yes',
    group: IDENTITY_GROUP,
  },
  {
    key: 'oralFlag',
    header: 'Oral_Flag',
    required: false,
    editable: true,
    example: 'C1',
    group: IDENTITY_GROUP,
    help: 'C0, C1, C2 or C3. Leave blank when not assessed.',
  },
  {
    key: 'qcNotes',
    header: 'QC_Notes',
    required: false,
    editable: true,
    example: 'Re-tested after illness',
    group: IDENTITY_GROUP,
  },
  ...RATING_COLUMNS,
];

/**
 * Bulk upload for the **Baseline Assessment** sheet.
 *
 * Moves what used to be a standalone parser+poster (the sidebar's Baseline
 * Assessment page) into the centralised Data Upload wizard, so baseline rows
 * now get the same five-step treatment as Classes / Students / Attendance:
 * template download, drag & drop, a row-scoped error matrix, per-row exclusion
 * and inline cell editing — all *before* anything is sent.
 *
 * Validation rules (deliberately identical to the legacy `ExcelValidator`, so
 * existing spreadsheets keep parsing exactly as they used to):
 *  - `studentId`      : required
 *  - `assessmentDate` : required, ISO `YYYY-MM-DD` or an Excel serial date
 *  - `assessorName`   : blank falls back to `"Assessor"` with a WARNING
 *  - `status`         : Present | Absent | Partial, defaults to Present
 *  - `oralFlag`       : C0-C3, blank allowed
 *  - rubric items     : whole number 0-4, or `AB`/blank for "not rated"
 *  - `Absent`         : every rubric item is nulled, whatever the sheet says
 *  - `Present`        : at least one rubric item must actually be rated
 *
 * Dispatches to `POST /baseline-assessments/import`.
 */
@Injectable({ providedIn: 'root' })
export class BaselineAssessmentUploadService extends BulkUploadService<BaselineAssessmentUploadRow> {
  readonly entityType: UploadEntityType = 'BASELINE_ASSESSMENTS';
  readonly label = 'Baseline Assessments';
  readonly description =
    'Bulk-import baseline assessment records with all 35 rubric ratings (V1-W5). Students must already exist in the Students master.';
  readonly icon = 'target';
  readonly endpointLabel = 'POST /baseline-assessments/import';
  readonly templateFileName = 'Baseline_Assessment_Template.xlsx';

  readonly columns: ColumnSpec[] = BASELINE_ASSESSMENT_UPLOAD_COLUMNS;
  readonly requiredHeaderKeys: string[] = ['studentId', 'assessmentDate', 'assessorName'];

  // Declared explicitly because Angular cannot inherit a constructor from the
  // undecorated BulkUploadService base (NG2006).
  constructor(http: HttpClient) {
    super(http);
  }

  private readonly apiUrl = `${environment.apiUrl}/baseline-assessments`;

  /**
   * `findHeaderRow` only matches literal header text, so a sheet labelling the
   * assessor column `Assessor Name` (or the date column `Date`) would not be
   * found even though `resolveColumnIndex` would happily alias it. Fall back to
   * the first row that declares a student identifier — the same tolerance the
   * legacy validator had.
   */
  protected override locateHeader(allRows: unknown[][]): number {
    const standard = super.locateHeader(allRows);
    if (standard !== -1) return standard;

    const limit = Math.min(15, allRows.length);
    for (let i = 0; i < limit; i++) {
      const normalized = (allRows[i] ?? []).map(normalizeHeader);
      if (['studentid', 'studentcode', 'id', 'student'].some((h) => normalized.includes(h))) {
        return i;
      }
    }
    return -1;
  }

  protected validateRow(row: RawGridRow): RowValidationOutcome<BaselineAssessmentUploadRow> {
    const errors: ValidationError[] = [];
    const { rowIndex, cells, rawCells } = row;

    // 1. studentId
    const studentId = (cells['studentId'] ?? '').trim();
    if (!studentId) {
      errors.push(this.rowError(rowIndex, 'studentId', cells['studentId'], 'Student ID is required.'));
    }

    // 2. assessmentDate — prefer the untouched cell so an Excel serial number
    //    survives, and fall back to the string after an inline edit.
    const assessmentDate = toIsoDate(rawCells['assessmentDate'] ?? cells['assessmentDate']);
    if (!assessmentDate) {
      errors.push(
        this.rowError(
          rowIndex,
          'assessmentDate',
          cells['assessmentDate'],
          `Invalid date "${cells['assessmentDate'] ?? ''}". Expected YYYY-MM-DD.`
        )
      );
    }

    // 3. assessorName — blank is tolerated, matching the legacy parser.
    let assessorName = (cells['assessorName'] ?? '').trim();
    if (!assessorName) {
      assessorName = DEFAULT_ASSESSOR;
      errors.push(
        this.rowError(
          rowIndex,
          'assessorName',
          cells['assessorName'],
          `Assessor is blank — defaulted to "${DEFAULT_ASSESSOR}".`,
          'WARNING'
        )
      );
    }

    // 4. status
    const status = normalizeAssessmentStatus(cells['status']);
    if (status === null) {
      errors.push(
        this.rowError(
          rowIndex,
          'status',
          cells['status'],
          `Invalid status "${cells['status'] ?? ''}". Must be Present, Absent or Partial.`
        )
      );
    }

    // 5. oralFlag
    const oralFlagRaw = (cells['oralFlag'] ?? '').trim().toUpperCase();
    let oralFlag: OralFlag | null = null;
    if (oralFlagRaw) {
      const match = ORAL_FLAGS.find((flag) => flag === oralFlagRaw);
      if (match) {
        oralFlag = match;
      } else {
        errors.push(
          this.rowError(
            rowIndex,
            'oralFlag',
            cells['oralFlag'],
            `Invalid oral flag "${oralFlagRaw}". Must be C0, C1, C2 or C3.`
          )
        );
      }
    }

    // 6. The 35 rubric ratings, kept flat and keyed by column name.
    const itemScores: Record<string, number | null> = {};
    let ratedItems = 0;

    for (const { domain, prefix } of BASELINE_DOMAIN_PREFIXES) {
      for (const item of RATING_ITEMS) {
        const key = ratingKey(prefix, item);
        const raw = (cells[key] ?? '').trim();

        // Blank and "AB" both mean "not rated".
        if (!raw || raw.toUpperCase() === 'AB') {
          itemScores[key] = null;
          continue;
        }

        const value = Number(raw);
        if (!Number.isInteger(value) || value < 0 || value > 4) {
          errors.push(
            this.rowError(
              rowIndex,
              key,
              raw,
              `Invalid rating "${raw}" for ${domain} item ${item}. Must be a whole number 0-4, or AB.`
            )
          );
          itemScores[key] = null;
          continue;
        }

        itemScores[key] = value;
        ratedItems++;
      }
    }

    const resolvedStatus = status ?? 'Present';

    // An absent student has no rubric, so drop any ratings the sheet carried.
    if (resolvedStatus === 'Absent') {
      for (const { prefix } of BASELINE_DOMAIN_PREFIXES) {
        for (const item of RATING_ITEMS) itemScores[ratingKey(prefix, item)] = null;
      }
    } else if (ratedItems === 0) {
      errors.push(
        this.rowError(
          rowIndex,
          'V1',
          null,
          'Student is not marked Absent, but all 35 rubric ratings (V1-W5) are empty.'
        )
      );
    }

    const hasError = errors.some((e) => e.severity === 'ERROR');
    const value: BaselineAssessmentUploadRow | null = hasError
      ? null
      : {
          studentId,
          assessmentDate: assessmentDate as string,
          assessorName,
          status: resolvedStatus,
          keySupportFlag: (cells['keySupportFlag'] ?? '').trim() || null,
          oralFlag,
          qcNotes: (cells['qcNotes'] ?? '').trim() || null,
          itemScores,
        };

    return { value, errors };
  }

  /** The same student cannot be assessed twice on the same date. */
  protected override crossRowRules(rows: RawGridRow[]): Map<number, ValidationError[]> {
    const firstSeenAt = new Map<string, number>();
    const duplicates = new Map<number, ValidationError[]>();

    for (const row of rows) {
      const studentId = (row.cells['studentId'] ?? '').trim();
      if (!studentId) continue;

      const key = `${studentId}|${(row.cells['assessmentDate'] ?? '').trim()}`.toLowerCase();
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
          `Duplicate assessment: ${studentId} already has an assessment on row ${first}.`,
          'ERROR'
        )
      );
      duplicates.set(row.rowIndex, list);
    }

    return duplicates;
  }

  /**
   * Fold the flat `itemScores` map into the nested `domainScores` array the
   * import contract expects, then POST it.
   */
  protected dispatch(rows: BaselineAssessmentUploadRow[]): Observable<BatchUploadResponse> {
    const assessments: CreateBaselineAssessmentInput[] = rows.map((row) => ({
      studentId: row.studentId,
      assessmentDate: row.assessmentDate,
      assessorName: row.assessorName,
      status: row.status,
      keySupportFlag: row.keySupportFlag,
      oralFlag: row.oralFlag,
      qcNotes: row.qcNotes,
      domainScores: this.toDomainScores(row.itemScores),
    }));

    const body: BulkImportBaselineAssessmentInput = { assessments };

    // `/import` answers `{ importedCount, records }`, so adapt it to the shared
    // batch shape the wizard's success view renders.
    return this.http.post<BulkImportResponse>(`${this.apiUrl}/import`, body).pipe(
      map((response) => {
        const created = response?.importedCount ?? 0;
        return {
          totalRows: rows.length,
          created,
          skipped: 0,
          failed: Math.max(0, rows.length - created),
          records: (response?.records ?? []) as unknown as Record<string, unknown>[],
          errors: [] as ValidationError[],
        };
      })
    );
  }

  /** Map `V1..W5` onto the 7 domain records, in a stable order. */
  private toDomainScores(itemScores: Record<string, number | null>): DomainScoreInput[] {
    return BASELINE_DOMAIN_PREFIXES.map(({ domain, prefix }) => ({
      domain,
      item1: itemScores[ratingKey(prefix, 1)] ?? null,
      item2: itemScores[ratingKey(prefix, 2)] ?? null,
      item3: itemScores[ratingKey(prefix, 3)] ?? null,
      item4: itemScores[ratingKey(prefix, 4)] ?? null,
      item5: itemScores[ratingKey(prefix, 5)] ?? null,
    }));
  }

  /**
   * A deterministic 0-4 spread for the sample rows, so the generated workbook
   * demonstrates the whole rating range without hard-coding 35 values.
   */
  private sampleRatings(seed: number | null): string[] {
    return BASELINE_DOMAIN_PREFIXES.flatMap(({ prefix }, domainIndex) =>
      RATING_ITEMS.map((item) => (seed === null ? '' : String((seed + domainIndex + item) % 5)))
    );
  }


  protected templateSheets() {
    const identityHeaders = BASELINE_ASSESSMENT_UPLOAD_COLUMNS.filter(
      (c) => c.group === IDENTITY_GROUP
    ).map((c) => c.header);
    const ratingHeaders = BASELINE_ASSESSMENT_UPLOAD_COLUMNS.filter(
      (c) => c.group !== IDENTITY_GROUP
    ).map((c) => c.header);

    return [
      {
        name: 'Baseline Assessments',
        columnWidths: [...identityHeaders.map(() => 16), ...ratingHeaders.map(() => 6)],
        rows: [
          [...identityHeaders, ...ratingHeaders],
          ['EDSF-349', '2026-01-05', 'Meera Rao', 'Present', 'Yes', 'C1', '', ...this.sampleRatings(1)],
          [
            'EDSF-350',
            '2026-01-05',
            'Meera Rao',
            'Present',
            '',
            'C0',
            'Re-tested after illness',
            ...this.sampleRatings(3),
          ],
          // An absent student needs no rubric ratings.
          [
            'EDSF-351',
            '2026-01-05',
            'Meera Rao',
            'Absent',
            '',
            '',
            'On leave',
            ...this.sampleRatings(null),
          ],
        ],
      },
      {
        name: 'Instructions',
        columnWidths: [22, 80],
        rows: [
          ['Field', 'Rule'],
          ['Student_ID', 'Required. Must match a student already in the Students master.'],
          ['Assessment_Date', 'Required. YYYY-MM-DD, or an Excel date cell (converted automatically).'],
          ['Assessor', 'Required. Left blank defaults to "Assessor".'],
          ['Status', 'Optional. Present, Absent or Partial (case-insensitive). Defaults to Present.'],
          ['Key_Support_Flag', 'Optional free text, e.g. Yes / No.'],
          ['Oral_Flag', 'Optional. One of C0, C1, C2, C3.'],
          ['QC_Notes', 'Optional free text.'],
          ['V1-V5', 'Vocabulary items 1-5. Whole number 0-4, or AB / blank when not rated.'],
          ['G1-G5', 'Grammar items 1-5. Same 0-4 or AB rule.'],
          ['P1-P5', 'Phrase & Sentence items 1-5. Same 0-4 or AB rule.'],
          ['L1-L5', 'Listening items 1-5. Same 0-4 or AB rule.'],
          ['S1-S5', 'Speaking items 1-5. Same 0-4 or AB rule.'],
          ['R1-R5', 'Reading items 1-5. Same 0-4 or AB rule.'],
          ['W1-W5', 'Writing items 1-5. Same 0-4 or AB rule.'],
          ['Absent rows', 'All 35 rubric ratings are discarded for a student marked Absent.'],
          ['Present rows', 'A Present student must have at least one rubric rating.'],
          ['Duplicates', 'The same Student_ID + Assessment_Date may appear only once per file.'],
        ],
      },
    ];
  }
}

/** Alias matching the `BaselineServiceUpload` naming in the feature brief. */
export { BaselineAssessmentUploadService as BaselineServiceUpload };

