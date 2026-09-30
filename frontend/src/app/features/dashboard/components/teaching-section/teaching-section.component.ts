import { Component, computed, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { TeachingModuleStatus } from '../../../../core/models/dashboard.model';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { UiSelectComponent, SelectOption } from '../../../../shared/components/ui-select/ui-select.component';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';

/** Geometry shared by the legend swatch and the matrix cell dot. */
const DOT_BASE_CLASS = 'w-2.5 h-2.5 rounded-full inline-block shrink-0';

/**
 * Presentation metadata for one module status in the coverage matrix.
 */
export interface ModuleStatusMeta {
  status: TeachingModuleStatus;
  /** Legend text, also used as each dot's tooltip / screen-reader label. */
  label: string;
  /** Status colour/stroke only — geometry is added by `dotClass()`. */
  dotClass: string;
}

/**
 * Single source of truth for the coverage matrix: the legend entry and the dot
 * rendered in a cell are both read from this list, so a dot colour can never
 * appear in the grid without a matching legend entry explaining it.
 *
 * The non-"covered" states carry a ring as well as a hue, so the state is
 * distinguishable by more than colour alone (WCAG 1.4.1).
 */
export const MODULE_STATUS_META: readonly ModuleStatusMeta[] = [
  { status: 'covered', label: 'Covered', dotClass: 'bg-emerald-600' },
  { status: 'in-progress', label: 'In progress', dotClass: 'bg-amber-500 ring-2 ring-amber-200' },
  { status: 'not-started', label: 'Not started', dotClass: 'bg-slate-300 ring-1 ring-slate-200' }
];

const STATUS_META_BY_STATUS = new Map<TeachingModuleStatus, ModuleStatusMeta>(
  MODULE_STATUS_META.map((meta) => [meta.status, meta])
);

/** Metadata for a status, falling back to the last entry for an unknown value. */
export function moduleStatusMeta(status: TeachingModuleStatus): ModuleStatusMeta {
  return (
    STATUS_META_BY_STATUS.get(status) ??
    MODULE_STATUS_META[MODULE_STATUS_META.length - 1]
  );
}

/** Module column headers, e.g. `['M01', … 'M10']`. */
export function buildModuleColumns(count: number): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) =>
    `M${String(index + 1).padStart(2, '0')}`
  );
}

@Component({
  selector: 'app-teaching-section',
  standalone: true,
  imports: [UiCardComponent, UiSelectComponent, UiIconComponent],
  templateUrl: './teaching-section.component.html'
})
export class TeachingSectionComponent {
  readonly dashboardService = inject(DashboardDataService);

  /** Drives the "Objective Coverage by Class" legend. */
  readonly statusLegend: readonly ModuleStatusMeta[] = MODULE_STATUS_META;

  /**
   * Column headers derived from the data, so the header count can never drift
   * out of step with the number of status cells in a row.
   */
  readonly moduleColumns = computed<string[]>(() => {
    const rows = this.dashboardService.teachingMatrix();
    return buildModuleColumns(rows.reduce((max, row) => Math.max(max, row.modules.length), 0));
  });

  readonly classOptions: SelectOption[] = [
    { label: 'All Classes', value: 'All Classes' },
    { label: 'Class 6A', value: 'Class 6A' },
    { label: 'Class 7A', value: 'Class 7A' }
  ];

  /**
   * Full class for a status dot: shared geometry plus the status colour.
   * Returned as one string because a template `class` attribute and a `[class]`
   * binding on the same element conflict — the binding replaces the attribute.
   */
  dotClass(status: TeachingModuleStatus): string {
    return `${DOT_BASE_CLASS} ${moduleStatusMeta(status).dotClass}`;
  }

  /** Legend swatch, matching the matrix cell exactly. */
  legendDotClass(status: TeachingModuleStatus): string {
    return this.dotClass(status);
  }

  /** Human-readable state, used as a dot's tooltip and accessible label. */
  statusLabel(status: TeachingModuleStatus): string {
    return moduleStatusMeta(status).label;
  }
}
