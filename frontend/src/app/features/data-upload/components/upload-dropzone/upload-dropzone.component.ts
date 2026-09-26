import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';
import { formatFileSize } from '../../../../core/utils/excel-upload.utils';

export interface SelectedUploadFile {
  file: File;
  sizeLabel: string;
}

/**
 * Step 3 of the wizard: a drag-and-drop zone with a simulated read progress
 * bar and a file-size indicator. Emits the accepted `File` upward; the parent
 * page owns parsing and validation.
 */
@Component({
  selector: 'app-upload-dropzone',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  templateUrl: './upload-dropzone.component.html',
})
export class UploadDropzoneComponent {
  readonly accept = input<string>('.xlsx,.xls');
  readonly disabled = input<boolean>(false);
  readonly hint = input<string>('Drag & drop your Excel file here, or click to browse.');
  readonly selectedFileName = input<string | null>(null);
  readonly selectedFileSize = input<string | null>(null);

  readonly fileAccepted = output<File>();
  readonly fileRejected = output<string>();
  /** Emitted with a 0-100 integer while the file is being read. */
  readonly progressChange = output<number>();

  readonly isDragOver = signal<boolean>(false);
  readonly internalProgress = signal<number>(0);

  private readonly MAX_BYTES = 10 * 1024 * 1024; // 10 MB

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled()) this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    if (this.disabled()) return;

    const file = event.dataTransfer?.files?.[0];
    if (file) this.accept_(file);
  }

  onBrowseClick(fileInput: HTMLInputElement): void {
    if (!this.disabled()) fileInput.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.accept_(file);
    // Allow re-selecting the same file after a failure.
    input.value = '';
  }

  /** Shared gate for both the drop and the browse paths. */
  private accept_(file: File): void {
    const extensionOk = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!extensionOk) {
      this.fileRejected.emit(`"${file.name}" is not a supported file. Use .xlsx, .xls or .csv.`);
      return;
    }
    if (file.size > this.MAX_BYTES) {
      this.fileRejected.emit(
        `"${file.name}" is ${formatFileSize(file.size)}, which exceeds the 10 MB limit.`
      );
      return;
    }
    if (file.size === 0) {
      this.fileRejected.emit(`"${file.name}" is empty.`);
      return;
    }
    this.fileAccepted.emit(file);
  }

  /** Drive the progress bar; the page calls this while parsing. */
  setProgress(value: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    this.internalProgress.set(clamped);
    this.progressChange.emit(clamped);
  }
}
