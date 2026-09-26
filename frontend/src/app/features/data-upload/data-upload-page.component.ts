import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiIconComponent } from '../../shared/components/ui-icon/ui-icon.component';
import { UploadDropzoneComponent } from './components/upload-dropzone/upload-dropzone.component';
import { ValidationErrorMatrixComponent } from './components/validation-error-matrix/validation-error-matrix.component';
import { DataGridEditorComponent } from './components/data-grid-editor/data-grid-editor.component';
import { BulkUploadService } from '../../core/services/bulk-upload-base.service';
import { ClassUploadService } from '../../core/services/class-upload.service';
import { StudentUploadService } from '../../core/services/student-upload.service';
import { AttendanceUploadService } from '../../core/services/attendance-upload.service';
import {
  BatchUploadResponse,
  DataGrid,
  MatrixContext,
  UploadEntityType,
  UploadSheetFormat,
  ValidationError,
  ValidationResult,
} from '../../core/models/upload.models';
import { formatFileSize } from '../../core/utils/excel-upload.utils';

export interface EntityOption {
  type: UploadEntityType;
  label: string;
  description: string;
  icon: string;
  endpoint: string;
}

export interface UploadOutcome {
  type: UploadEntityType;
  label: string;
  response: BatchUploadResponse;
}

const ENTITY_OPTIONS: EntityOption[] = [
  {
    type: 'CLASSES',
    label: 'Classes Master',
    description: 'Bulk-create class sections for an academic year.',
    icon: 'academic-cap',
    endpoint: 'POST /classes/batch',
  },
  {
    type: 'STUDENTS',
    label: 'Students Master',
    description: 'Bulk-create students and enrol them into classes.',
    icon: 'users',
    endpoint: 'POST /students/batch',
  },
  {
    type: 'ATTENDANCE',
    label: 'Daily Attendance',
    description: 'Row-based or Excel grid/matrix, incl. class cancellation.',
    icon: 'calendar',
    endpoint: 'POST /attendance/batch-upload',
  },
];

/**
 * Centralized bulk Excel Data Upload page.
 *
 * Five-step flow: Select Entity -> Download Template -> Drag & Drop ->
 * Validation Summary & Error Matrix (with row exclusion + inline cell edit)
 * -> Submit.
 *
 * Nothing is sent to the network until client-side validation has run, and only
 * the clean, non-excluded rows are ever dispatched.
 */
@Component({
  selector: 'app-data-upload-page',
  standalone: true,
  imports: [
    CommonModule,
    UiIconComponent,
    UploadDropzoneComponent,
    ValidationErrorMatrixComponent,
    DataGridEditorComponent,
  ],
  templateUrl: './data-upload-page.component.html',
})
export class DataUploadPageComponent {
  private readonly classService = inject(ClassUploadService);
  private readonly studentService = inject(StudentUploadService);
  private readonly attendanceService = inject(AttendanceUploadService);

  private readonly dropzone = viewChild(UploadDropzoneComponent);

  // -------------------------------------------------------------------------
  // Wizard state
  // -------------------------------------------------------------------------
  readonly entities = ENTITY_OPTIONS;
  readonly selectedEntity = signal<UploadEntityType>('CLASSES');

  readonly fileName = signal<string | null>(null);
  readonly fileSize = signal<string | null>(null);
  readonly parsing = signal<boolean>(false);
  readonly parseProgress = signal<number>(0);
  readonly sheetFormat = signal<UploadSheetFormat>('ROW');
  readonly sheetName = signal<string | null>(null);

  readonly grid = signal<DataGrid>({ columns: [], rows: [] });
  readonly validation = signal<ValidationResult<unknown> | null>(null);
  readonly serverErrors = signal<ValidationError[]>([]);

  readonly submitting = signal<boolean>(false);
  readonly outcome = signal<UploadOutcome | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly noticeMessage = signal<string | null>(null);

  /** Fallback class context for a matrix sheet without a metadata row. */
  readonly matrixContext = signal<MatrixContext>({ schoolCode: '', className: '', academicYear: '' });
  readonly showMatrixContext = signal<boolean>(false);

  /** Shared empty set for the read-only error matrix in the success view. */
  readonly emptyRowIndexSet: ReadonlySet<number> = new Set<number>();

  readonly activeStep = computed(() => {
    if (this.outcome()) return 5;
    if (this.grid().rows.length > 0 || this.validation()) return 4;
    if (this.fileName()) return 3;
    return 2;
  });

  // -------------------------------------------------------------------------
  // Derived summaries
  // -------------------------------------------------------------------------
  readonly activeService = computed<BulkUploadService<unknown>>(() => {
    const map: Record<UploadEntityType, BulkUploadService<unknown>> = {
      CLASSES: this.classService as BulkUploadService<unknown>,
      STUDENTS: this.studentService as BulkUploadService<unknown>,
      ATTENDANCE: this.attendanceService as BulkUploadService<unknown>,
    };
    return map[this.selectedEntity()];
  });

  readonly totalRows = computed(() => this.grid().rows.length);

  readonly excludedRowIndices = computed(
    () => new Set(this.grid().rows.filter((r) => r.excluded).map((r) => r.rowIndex))
  );

  readonly excludedCount = computed(() => this.excludedRowIndices().size);

  readonly cleanRowCount = computed(
    () =>
      this.grid().rows.filter(
        (r) => !r.excluded && !r.errors.some((e) => e.severity === 'ERROR')
      ).length
  );

  readonly errorRowCount = computed(
    () =>
      this.grid().rows.filter(
        (r) => !r.excluded && r.errors.some((e) => e.severity === 'ERROR')
      ).length
  );

  readonly warningCount = computed(
    () => this.validation()?.errors.filter((e) => e.severity === 'WARNING').length ?? 0
  );

  readonly errorCount = computed(
    () => this.validation()?.errors.filter((e) => e.severity === 'ERROR').length ?? 0
  );

  /** Client-side errors plus anything the server reported on commit. */
  readonly allErrors = computed<ValidationError[]>(() => [
    ...(this.validation()?.errors ?? []),
    ...this.serverErrors(),
  ]);

  /** The Save button stays disabled until at least one clean row survives. */
  readonly canSubmit = computed(
    () => this.cleanRowCount() > 0 && !this.submitting() && !this.parsing()
  );

  // -------------------------------------------------------------------------
  // Step 1 — entity selection
  // -------------------------------------------------------------------------
  selectEntity(type: UploadEntityType): void {
    if (this.selectedEntity() === type) return;
    this.selectedEntity.set(type);
    this.resetUpload();
  }

  // -------------------------------------------------------------------------
  // Step 2 — template download
  // -------------------------------------------------------------------------
  downloadTemplate(): void {
    try {
      this.activeService().downloadTemplate();
      this.noticeMessage.set(`Sample ${this.activeService().label} template downloaded.`);
    } catch {
      this.errorMessage.set('Could not generate the template file.');
    }
  }

  // -------------------------------------------------------------------------
  // Step 3 — file intake & parse
  // -------------------------------------------------------------------------
  onFileAccepted(file: File): void {
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.outcome.set(null);
    this.serverErrors.set([]);

    this.fileName.set(file.name);
    this.fileSize.set(formatFileSize(file.size));
    this.parsing.set(true);
    this.parseProgress.set(15);
    this.dropzone()?.setProgress(15);

    const service = this.activeService();
    if (service instanceof AttendanceUploadService) {
      service.setMatrixContext(this.matrixContext());
    }

    // Defer a tick so the progress bar paints before the synchronous parse.
    setTimeout(() => {
      service
        .parseAndValidate(file)
        .then((parsed) => {
          this.parseProgress.set(100);
          this.dropzone()?.setProgress(100);
          this.parsing.set(false);
          this.grid.set(parsed.grid);
          this.validation.set(parsed.result as ValidationResult<unknown>);
          this.sheetFormat.set(parsed.format);
          this.sheetName.set(parsed.sheetName);
          this.showMatrixContext.set(parsed.format === 'MATRIX');

          const blocked = parsed.result.errors.filter((e) => e.severity === 'ERROR').length;
          this.noticeMessage.set(
            blocked === 0
              ? `All ${parsed.result.totalRows} row(s) passed client-side validation.`
              : `${parsed.result.totalRows} row(s) parsed — ${blocked} issue(s) need attention before upload.`
          );
        })
        .catch((err: unknown) => {
          this.parsing.set(false);
          this.grid.set({ columns: service.columns, rows: [] });
          this.validation.set(null);
          this.errorMessage.set(
            err instanceof Error
              ? err.message
              : 'Failed to read the Excel file. Please ensure it is a valid .xlsx/.xls file.'
          );
        });
    }, 60);
  }

  onFileRejected(message: string): void {
    this.errorMessage.set(message);
    this.noticeMessage.set(null);
  }

  // -------------------------------------------------------------------------
  // Step 4 — grid edits, row exclusion, re-validation
  // -------------------------------------------------------------------------

  /** Apply an inline cell edit and immediately re-run the rule engine. */
  onCellEdited(edit: { rowIndex: number; columnKey: string; value: string }): void {
    this.patchGrid((grid) => ({
      ...grid,
      rows: grid.rows.map((row) =>
        row.rowIndex === edit.rowIndex
          ? { ...row, cells: { ...row.cells, [edit.columnKey]: edit.value } }
          : row
      ),
    }));
    this.noticeMessage.set(
      `Updated row ${edit.rowIndex}, column "${edit.columnKey}". Validation re-run.`
    );
  }

  /** Toggle a single row in/out of the excluded set. */
  toggleRowExclusion(rowIndex: number): void {
    this.patchGrid((grid) => ({
      ...grid,
      rows: grid.rows.map((row) =>
        row.rowIndex === rowIndex ? { ...row, excluded: !row.excluded } : row
      ),
    }));
  }

  /** Exclude every row currently carrying a hard error. */
  excludeAllErrorRows(): void {
    const bad = new Set(
      this.grid()
        .rows.filter((r) => r.errors.some((e) => e.severity === 'ERROR'))
        .map((r) => r.rowIndex)
    );
    this.patchGrid((grid) => ({
      ...grid,
      rows: grid.rows.map((row) => ({ ...row, excluded: bad.has(row.rowIndex) })),
    }));
    this.noticeMessage.set(
      `Excluded ${bad.size} errored row(s). The remaining clean rows will be uploaded.`
    );
  }

  /** Clear every exclusion so previously-blocked rows are considered again. */
  includeAllRows(): void {
    this.patchGrid((grid) => ({
      ...grid,
      rows: grid.rows.map((row) => ({ ...row, excluded: false })),
    }));
    this.noticeMessage.set('All rows restored.');
  }

  /** Re-annotate the grid with fresh errors from the active rule engine. */
  private patchGrid(mutate: (grid: DataGrid) => DataGrid): void {
    const mutated = mutate(this.grid());
    const { grid: annotated, result } = this.activeService().annotate(mutated);
    this.grid.set(annotated);
    this.validation.set(result as ValidationResult<unknown>);
  }

  /** Update one field of the matrix fallback context. */
  updateMatrixContext(field: keyof MatrixContext, value: string): void {
    this.matrixContext.update((ctx) => ({ ...ctx, [field]: value }));
  }

  /** Confirm the matrix context the user typed in. */
  applyMatrixContext(): void {
    const ctx = this.matrixContext();
    if (!ctx.schoolCode || !ctx.className || !ctx.academicYear) {
      this.errorMessage.set(
        'Provide schoolCode, className and academicYear before re-uploading the matrix file.'
      );
      return;
    }
    this.errorMessage.set(null);
    this.noticeMessage.set('Matrix context applied. Re-select the file to re-parse.');
  }

  // -------------------------------------------------------------------------
  // Step 5 — commit
  // -------------------------------------------------------------------------
  submit(): void {
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.serverErrors.set([]);

    const service = this.activeService();
    if (this.cleanRowCount() === 0) {
      this.errorMessage.set(
        'There are no valid rows left to upload. Fix or exclude the errored rows first.'
      );
      return;
    }

    this.submitting.set(true);
    service.submit(this.grid()).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.outcome.set({ type: this.selectedEntity(), label: service.label, response });
        this.serverErrors.set(response.errors ?? []);
        this.noticeMessage.set(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err?.error?.error?.message ||
            err?.error?.message ||
            err?.message ||
            `Failed to upload ${service.label} to the server.`
        );
      },
    });
  }

  /** Return to a clean wizard after a successful commit. */
  startOver(): void {
    this.resetUpload();
  }

  private resetUpload(): void {
    this.fileName.set(null);
    this.fileSize.set(null);
    this.grid.set({ columns: this.activeService().columns, rows: [] });
    this.validation.set(null);
    this.serverErrors.set([]);
    this.outcome.set(null);
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.sheetFormat.set('ROW');
    this.sheetName.set(null);
    this.parseProgress.set(0);
    this.parsing.set(false);
    this.showMatrixContext.set(false);
  }
}


