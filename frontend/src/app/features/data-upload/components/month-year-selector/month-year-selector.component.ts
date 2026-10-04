import { Component, computed, input, output } from '@angular/core';
import { MONTH_NAMES, daysInMonth } from '../../../../core/utils/attendanceParser';
import {
  SelectOption,
  UiSelectComponent,
} from '../../../../shared/components/ui-select/ui-select.component';

/** The year window offered in the dropdown (inclusive). */
const YEAR_MIN = 2020;
const YEAR_MAX = 2035;

/** One calendar selection: `month` is 1-12. */
export interface MonthYearSelection {
  month: number;
  year: number;
}

/**
 * Month + Year pickers for the wide day-matrix layout (`1st`..`31st`).
 *
 * A day ordinal is meaningless without a calendar — `1st` denotes a different
 * date every month — so the wizard cannot enable its dropzone until both fields
 * are chosen. Each change is emitted immediately (including a half-finished
 * selection) so the parent can keep the dropzone disabled until the pair is
 * complete.
 */
@Component({
  selector: 'app-month-year-selector',
  standalone: true,
  imports: [UiSelectComponent],
  templateUrl: './month-year-selector.component.html',
})
export class MonthYearSelectorComponent {
  readonly month = input<number | null>(null);
  readonly year = input<number | null>(null);
  readonly disabled = input<boolean>(false);

  readonly selectionChange = output<MonthYearSelection>();

  readonly monthOptions: SelectOption[] = MONTH_NAMES.map((name, index) => ({
    label: name,
    value: String(index + 1),
  }));

  readonly yearOptions: SelectOption[] = Array.from(
    { length: YEAR_MAX - YEAR_MIN + 1 },
    (_, i) => ({ label: String(YEAR_MIN + i), value: String(YEAR_MIN + i) })
  );

  /** Days in the chosen month, so the admin can sanity-check the sheet width. */
  readonly dayCountLabel = computed(() => {
    const m = this.month();
    const y = this.year();
    if (m === null || y === null) return null;
    return `${daysInMonth(y, m)} days`;
  });

  onMonthChange(value: string): void {
    const month = Number(value);
    const year = this.year();
    if (Number.isInteger(month) && year !== null) this.selectionChange.emit({ month, year });
  }

  onYearChange(value: string): void {
    const year = Number(value);
    const month = this.month();
    if (Number.isInteger(year) && month !== null) this.selectionChange.emit({ month, year });
  }
}
