import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiButtonComponent } from '../ui-button/ui-button.component';
import { UiIconComponent } from '../ui-icon/ui-icon.component';

/**
 * Reusable confirmation dialog for destructive actions.
 *
 * Rendered as an overlay rather than a `window.confirm` so the copy can be
 * specific ("Aarav Sharma will be permanently removed"), the confirm button can
 * be styled per severity, and the surrounding page is not blocked by a
 * browser-owned modal that cannot be themed.
 *
 * Because Angular 22 renders content by default, the host binds its own
 * classes and forwards the panel with `position: fixed` so it escapes any
 * `overflow: hidden` ancestor.
 */
/**
 * Per-instance id counter for `aria-labelledby` wiring.
 *
 * A module-level counter is used rather than `crypto.randomUUID()`, which is
 * only available in a secure context and would therefore throw on a plain-http
 * LAN deployment — taking the whole dialog down for an accessibility detail.
 */
let confirmDialogSequence = 0;

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [UiButtonComponent, UiIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'fixed inset-0 z-50 flex items-center justify-center p-4' },
  template: `
    <div
      class="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
      aria-hidden="true"
      (click)="cancelled.emit()"
    ></div>

    <section
      role="alertdialog"
      aria-modal="true"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="messageId"
      class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
    >
      <div class="flex items-start gap-4">
        <span
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          [class]="danger() ? 'bg-red-50 text-red-500' : 'bg-brand-pink-soft text-brand-pink'"
        >
          <app-ui-icon [name]="danger() ? 'alert-circle' : 'info'" [size]="21" />
        </span>

        <div class="min-w-0 flex-1">
          <h2 [id]="titleId" class="text-headline-lg text-brand-ink">{{ title() }}</h2>
          <p [id]="messageId" class="mt-1.5 text-body-md text-brand-muted">{{ message() }}</p>

          @if (detail()) {
            <p class="mt-3 rounded-xl bg-brand-bg px-3 py-2 text-table-md font-medium text-brand-ink">
              {{ detail() }}
            </p>
          }
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-2.5">
        <app-ui-button variant="outline" size="md" [disabled]="busy()" (btnClick)="cancelled.emit()">
          {{ cancelLabel() }}
        </app-ui-button>
        <app-ui-button
          variant="primary"
          size="md"
          [disabled]="busy()"
          [customClass]="danger() ? 'bg-red-500 hover:bg-red-600' : ''"
          (btnClick)="confirmed.emit()"
        >
          {{ busy() ? busyLabel() : confirmLabel() }}
        </app-ui-button>
      </div>
    </section>
  `,
})
export class ConfirmDialogComponent {
  readonly title = input('Are you sure?');
  readonly message = input('This action cannot be undone.');
  /** Optional second line naming the record being acted on. */
  readonly detail = input('');
  readonly confirmLabel = input('Delete');
  readonly cancelLabel = input('Cancel');
  readonly busyLabel = input('Working…');
  /** Red styling for destructive actions. */
  readonly danger = input(true);
  /** Disables both buttons while the parent call is in flight. */
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  /** Stable per-instance ids so `aria-labelledby` always resolves. */
  protected readonly titleId = `confirm-title-${++confirmDialogSequence}`;
  protected readonly messageId = `confirm-message-${confirmDialogSequence}`;
}