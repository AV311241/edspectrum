import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';
import { DataGrid, GridRow } from '../../../../core/models/upload.models';
import { errorForCell } from '../../../../core/utils/excel-upload.utils';

/**
 * Step 5 of the wizard (bonus): direct cell editing.
 *
 * Lets an admin fix a small number of spreadsheet mistakes in the browser
 * instead of re-uploading. Every edit re-runs the entity's rule engine, so the
 * validation summary and error matrix update immediately.
 */
@Component({
  selector: 'app-data-grid-editor',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  templateUrl: './data-grid-editor.component.html',
})
export class DataGridEditorComponent {
  readonly grid = input.required<DataGrid>();
  readonly pageSize = input<number>(25);

  /** Emits a new grid with one cell changed and all errors re-computed. */
  readonly cellEdited = output<{ rowIndex: number; columnKey: string; value: string }>();
  readonly rowExcluded = output<number>();

  readonly page = signal<number>(0);

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.grid().rows.length / this.pageSize())));

  readonly pagedRows = computed<GridRow[]>(() => {
    const start = this.page() * this.pageSize();
    return this.grid().rows.slice(start, start + this.pageSize());
  });

  readonly editRowIndex = signal<number | null>(null);
  readonly editColumnKey = signal<string | null>(null);
  readonly editBuffer = signal<string>('');

  readonly errorRowCount = computed(
    () =>
      this.grid().rows.filter((r) =>
        !r.excluded && r.errors.some((e) => e.severity === 'ERROR')
      ).length
  );

  cellError(row: GridRow, columnKey: string) {
    return errorForCell(row, columnKey);
  }

  hasRowError(row: GridRow): boolean {
    return row.errors.some((e) => e.severity === 'ERROR');
  }

  startEdit(row: GridRow, columnKey: string, editable: boolean): void {
    if (!editable) return;
    this.editRowIndex.set(row.rowIndex);
    this.editColumnKey.set(columnKey);
    this.editBuffer.set(row.cells[columnKey] ?? '');
  }

  cancelEdit(): void {
    this.editRowIndex.set(null);
    this.editColumnKey.set(null);
  }

  commitEdit(): void {
    const rowIndex = this.editRowIndex();
    const columnKey = this.editColumnKey();
    if (rowIndex !== null && columnKey !== null) {
      this.cellEdited.emit({ rowIndex, columnKey, value: this.editBuffer() });
    }
    this.cancelEdit();
  }

  onEditorKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  goToPage(next: number): void {
    this.page.set(Math.max(0, Math.min(this.pageCount() - 1, next)));
  }
}
