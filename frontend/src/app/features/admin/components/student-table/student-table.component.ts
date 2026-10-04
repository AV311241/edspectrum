import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AdminStudentView, MAndEStatus } from '../../../../core/models/admin.model';
import { NO_VALUE_PLACEHOLDER } from '../../../../core/utils/format.utils';
import { UiBadgeComponent } from '../../../../shared/components/ui-badge/ui-badge.component';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';

/**
 * Roster table for the selected School → Class.
 *
 * Fully presentational: it takes already-projected `AdminStudentView[]` and
 * emits intent (`edit` / `remove` / `preview`). It never calls the API, so the
 * page owns all loading and mutation state and this table stays trivially
 * testable and reusable.
 *
 * Row actions:
 *  - **View profile** — emits `preview` for the inline detail card.
 *  - **Edit** — emits `edit`; the page opens the reactive form pre-filled via
 *    `patchValue`.
 *  - **Delete** — emits `remove`; the page opens the confirm dialog first.
 */
@Component({
  selector: 'app-student-table',
  standalone: true,
  imports: [DatePipe, UiBadgeComponent, UiButtonComponent, UiIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-table.component.html',
})
export class StudentTableComponent {
  readonly students = input.required<AdminStudentView[]>();
  readonly loading = input(false);
  /** Row whose profile card is expanded; `null` collapses it. */
  readonly previewingId = input<number | null>(null);

  readonly editRequested = output<AdminStudentView>();
  readonly removeRequested = output<AdminStudentView>();
  readonly previewToggled = output<AdminStudentView>();

  readonly hasRows = computed(() => this.students().length > 0);

  /** Label + badge colour for each M&E state, in one place so they stay aligned. */
  private readonly meLabels: Record<MAndEStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
    ENROLLED: { label: 'Enrolled', variant: 'success' },
    TRANSFERRED: { label: 'Transferred', variant: 'info' },
    EXCLUDED: { label: 'Excluded', variant: 'warning' },
    NOT_ENROLLED: { label: 'Not enrolled', variant: 'neutral' },
  };

  meLabel(status: MAndEStatus): string {
    return this.meLabels[status].label;
  }

  meVariant(status: MAndEStatus): 'success' | 'warning' | 'info' | 'neutral' {
    return this.meLabels[status].variant;
  }

  isPreviewing(student: AdminStudentView): boolean {
    return this.previewingId() === student.record.id;
  }

  togglePreview(student: AdminStudentView): void {
    this.previewToggled.emit(student);
  }

  /** `—` rather than an empty cell, so a missing value reads as intentional. */
  orDash(value: string | null | undefined): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : NO_VALUE_PLACEHOLDER;
  }
}