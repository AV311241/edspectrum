import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';
import { ValidationError } from '../../../../core/models/upload.models';

/**
 * Step 4 of the wizard: the cell/row-specific error matrix.
 *
 * Shows `Row #`, `Column Name`, `Cell Value` and `Error Description`, with a
 * "Show Errors Only" filter, per-row exclusion toggles and a severity split.
 */
@Component({
  selector: 'app-validation-error-matrix',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  templateUrl: './validation-error-matrix.component.html',
})
export class ValidationErrorMatrixComponent {
  readonly errors = input<ValidationError[]>([]);
  /** Row indices the user has excluded; those rows are never dispatched. */
  readonly excludedRowIndices = input<ReadonlySet<number>>(new Set<number>());

  readonly rowExcluded = output<number>();
  readonly includeAllRows = output<void>();
  readonly excludeAllErrorRows = output<void>();

  readonly errorsOnly = signal<boolean>(true);
  readonly severityFilter = signal<'ALL' | 'ERROR' | 'WARNING'>('ALL');

  readonly errorCount = computed(() => this.errors().filter((e) => e.severity === 'ERROR').length);
  readonly warningCount = computed(() => this.errors().filter((e) => e.severity === 'WARNING').length);

  /** Distinct spreadsheet rows that carry at least one hard error. */
  readonly errorRowIndices = computed(() => {
    const set = new Set<number>();
    for (const e of this.errors()) {
      if (e.severity === 'ERROR' && e.rowIndex > 0) set.add(e.rowIndex);
    }
    return set;
  });

  readonly visibleErrors = computed(() => {
    let list = this.errors();

    if (this.errorsOnly()) {
      const excluded = this.excludedRowIndices();
      list = list.filter((e) => !excluded.has(e.rowIndex));
    }
    const severity = this.severityFilter();
    if (severity !== 'ALL') {
      list = list.filter((e) => e.severity === severity);
    }
    // File-level problems (rowIndex 0) last, they are contextual not tabular.
    return [...list].sort((a, b) => {
      if (a.rowIndex === 0 && b.rowIndex !== 0) return 1;
      if (b.rowIndex === 0 && a.rowIndex !== 0) return -1;
      return a.rowIndex - b.rowIndex;
    });
  });

  toggleErrorsOnly(): void {
    this.errorsOnly.update((v) => !v);
  }

  setSeverity(value: 'ALL' | 'ERROR' | 'WARNING'): void {
    this.severityFilter.set(value);
  }

  isExcluded(rowIndex: number): boolean {
    return this.excludedRowIndices().has(rowIndex);
  }

  /** Render any cell value safely, including blanks. */
  displayValue(value: unknown): string {
    if (value === null || value === undefined) return '(blank)';
    const str = String(value).trim();
    return str === '' ? '(blank)' : str;
  }
}
