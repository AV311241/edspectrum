import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DataGrid,
  GridRow,
  ColumnSpec,
  UploadEntityType,
  UploadParseResult,
  UploadSheetFormat,
  ValidationError,
  ValidationResult,
  BatchUploadResponse,
} from '../models/upload.models';
import {
  RawGridRow,
  buildGridFromRowSheet,
  downloadTemplate,
  findHeaderRow,
  isEmptyRow,
  normalizeHeader,
  readWorkbook,
  rowError,
  toPlainGrid,
} from '../utils/excel-upload.utils';

/** One row's outcome from an entity-specific rule engine. */
export interface RowValidationOutcome<T> {
  /** The mapped row model, or `null` when the row failed hard validation. */
  value: T | null;
  errors: ValidationError[];
}

export interface AnnotatedGrid<T> {
  grid: DataGrid;
  result: ValidationResult<T>;
}

/**
 * Shared plumbing for the three bulk-upload services.
 *
 * Intentionally **abstract and not** `@Injectable` — it holds the parse /
 * validate / dispatch scaffolding so each concrete service keeps full ownership
 * of its own validation rules and API endpoint. Because Angular's DI cannot
 * inherit a constructor from an undecorated base, every concrete subclass
 * declares its own `constructor(http: HttpClient) { super(http); }`.
 */
export abstract class BulkUploadService<T> {
  abstract readonly entityType: UploadEntityType;
  /** Human label shown on the entity-selection card. */
  abstract readonly label: string;
  abstract readonly description: string;
  /** Key into the shared `ui-icon` icon set. */
  abstract readonly icon: string;
  /** Displayed on the submit card so admins know what will be called. */
  abstract readonly endpointLabel: string;
  abstract readonly columns: ColumnSpec[];
  /** Column keys that must be present in the sheet header. */
  abstract readonly requiredHeaderKeys: string[];
  /** File name for the generated template. */
  abstract readonly templateFileName: string;

  constructor(protected readonly http: HttpClient) {}

  /**
   * Entity-specific rule engine. Runs against the *string* cell values so it
   * behaves identically for freshly parsed files and after inline edits.
   */
  protected abstract validateRow(row: RawGridRow): RowValidationOutcome<T>;

  /** POST the validated rows to this entity's batch endpoint. */
  protected abstract dispatch(rows: T[]): Observable<BatchUploadResponse>;

  /** Sample workbook contents for the "Download Template" action. */
  protected abstract templateSheets(): {
    name: string;
    rows: unknown[][];
    columnWidths?: number[];
  }[];

  // -------------------------------------------------------------------------
  // Grid construction
  // -------------------------------------------------------------------------

  /**
   * Turn raw sheet rows into a cell grid. Row-based by default; the attendance
   * service overrides this to also support the Excel matrix layout and to
   * report the detected format back to the UI.
   */
  protected buildFromSheet(
    allRows: unknown[][],
    headerRowIndex: number
  ): { grid: DataGrid; missingColumns: string[]; format: UploadSheetFormat } {
    const { grid, missingColumns } = buildGridFromRowSheet(
      allRows,
      headerRowIndex,
      this.columns
    );
    return { grid, missingColumns, format: 'ROW' };
  }

  /** Default header detection: first row containing every required column. */
  protected locateHeader(allRows: unknown[][]): number {
    return findHeaderRow(allRows, this.requiredHeaderKeys);
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  /**
   * Run the rule engine over every row and return an immutable
   * `ValidationResult`, exactly as specified. Excluded rows never block and are
   * never submitted.
   */
  validateGrid(grid: DataGrid): ValidationResult<T> {
    return this.annotate(grid).result;
  }

  /**
   * Cross-row rules (duplicate detection, etc.) that cannot be decided from a
   * single row in isolation. Returns extra errors keyed by spreadsheet row
   * index; the base class merges them into the per-row error lists.
   */
  protected crossRowRules(rows: RawGridRow[]): Map<number, ValidationError[]> {
    return new Map();
  }

  /**
   * Same as `validateGrid` but also returns a grid whose rows carry their own
   * errors, so the browser grid can highlight offending cells.
   */
  annotate(grid: DataGrid): AnnotatedGrid<T> {
    const errors: ValidationError[] = [];
    const validRows: T[] = [];
    let errorRowCount = 0;

    const rawRows = grid.rows as RawGridRow[];
    const extra = this.crossRowRules(rawRows);
    const extrasFor = (rowIndex: number): ValidationError[] => extra.get(rowIndex) ?? [];

    const rows: GridRow[] = grid.rows.map((row) => {
      // NOTE: the row must be used by identity, never looked up by rowIndex.
      // A matrix sheet pivots one Excel row into N logical rows that all share
      // the same rowIndex, so a `find` would hand every one of them the first
      // row's raw cells (and therefore the wrong sessionDate).
      const { value, errors: ownErrors } = this.validateRow({
        ...row,
        cells: row.cells,
        rawCells: (row as RawGridRow).rawCells ?? {},
      });
      const rowErrors = [...ownErrors, ...extrasFor(row.rowIndex)];

      const hasError = rowErrors.some((e) => e.severity === 'ERROR');
      errors.push(...rowErrors);

      if (!row.excluded && !hasError && value !== null) {
        validRows.push(value);
      }
      if (!row.excluded && hasError) {
        errorRowCount++;
      }

      return {
        rowIndex: row.rowIndex,
        cells: row.cells,
        errors: rowErrors,
        excluded: row.excluded,
      };
    });

    return {
      grid: { columns: grid.columns, rows },
      result: {
        isValid: errorRowCount === 0,
        totalRows: grid.rows.length,
        validRows,
        errors,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Parse
  // -------------------------------------------------------------------------

  /**
   * Read + validate an uploaded workbook.
   * Throws only when the file itself is unreadable; per-cell problems are
   * reported through `result.errors`, never thrown.
   */
  async parseAndValidate(file: File): Promise<UploadParseResult<T>> {
    const workbook = await readWorkbook(file);
    const allRows = workbook.sheets[workbook.sheetName] ?? [];
    const headerRowIndex = this.locateHeader(allRows);

    if (headerRowIndex === -1) {
      const expected = this.columns
        .filter((c) => this.requiredHeaderKeys.includes(c.key))
        .map((c) => c.header)
        .join(', ');
      return {
        result: {
          isValid: false,
          totalRows: 0,
          validRows: [],
          errors: [
            rowError(
              1,
              'Header',
              null,
              `Could not find a header row. Expected a row containing: ${expected}.`
            ),
          ],
        },
        grid: { columns: this.columns, rows: [] },
        format: 'ROW',
        sheetName: workbook.sheetName,
      };
    }

    const { grid, missingColumns, format } = this.buildFromSheet(allRows, headerRowIndex);
    const { grid: annotated, result } = this.annotate(grid);

    // A missing required *column* is a file-level problem, not a row problem.
    if (missingColumns.length > 0) {
      result.isValid = false;
      result.errors.unshift(
        rowError(
          headerRowIndex + 1,
          'Header',
          missingColumns.join(', '),
          `Required column(s) missing from the sheet: ${missingColumns.join(', ')}`
        )
      );
    }

    if (grid.rows.length === 0) {
      result.errors.push(
        rowError(headerRowIndex + 2, 'Data', null, 'No data rows found below the header row.')
      );
    }

    return {
      result,
      grid: annotated,
      format,
      sheetName: workbook.sheetName,
    };
  }

  // -------------------------------------------------------------------------
  // Dispatch & templates
  // -------------------------------------------------------------------------

  /** Submit the clean, non-excluded subset of a grid to the backend. */
  submit(grid: DataGrid): Observable<BatchUploadResponse> {
    const { result } = this.annotate(grid);
    if (result.validRows.length === 0) {
      throw new Error(
        'There are no valid rows left to upload. Fix or exclude the errored rows first.'
      );
    }
    return this.dispatch(result.validRows);
  }

  downloadTemplate(): void {
    downloadTemplate(this.templateFileName, this.templateSheets());
  }

  // -------------------------------------------------------------------------
  // Small helpers re-exported for concrete services
  // -------------------------------------------------------------------------

  protected isEmptyRow(row: unknown[]): boolean {
    return isEmptyRow(row);
  }

  protected normalizeHeader(value: unknown): string {
    return normalizeHeader(value);
  }

  protected toPlainGrid(grid: DataGrid): DataGrid {
    return toPlainGrid(grid);
  }

  protected rowError(
    rowIndex: number,
    columnName: string,
    invalidValue: unknown,
    errorMessage: string,
    severity: 'ERROR' | 'WARNING' = 'ERROR'
  ): ValidationError {
    return rowError(rowIndex, columnName, invalidValue, errorMessage, severity);
  }
}
