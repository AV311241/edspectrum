import { Component, computed, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { formatCompactInr, formatInr } from '../../../../core/utils/format.utils';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { UiSelectComponent, SelectOption } from '../../../../shared/components/ui-select/ui-select.component';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';
import { LineChartComponent, LineChartPoint } from '../../../../shared/charts/line-chart/line-chart.component';

@Component({
  selector: 'app-resources-finance-section',
  standalone: true,
  imports: [UiCardComponent, UiSelectComponent, UiIconComponent, LineChartComponent],
  templateUrl: './resources-finance-section.component.html'
})
export class ResourcesFinanceSectionComponent {
  readonly dashboardService = inject(DashboardDataService);

  /**
   * The spend trend, reshaped from the service's `{ month, amount }` records
   * into the labelled series the chart consumes. Deriving the axis from this
   * data (rather than hard-coding ticks) means the labels always match the
   * series, including after the month filter changes.
   */
  readonly monthlySpend = computed<LineChartPoint[]>(() =>
    this.dashboardService.financeData().monthlyTrend.map((entry) => ({
      label: entry.month,
      value: entry.amount
    }))
  );

  readonly formatCompactInr = formatCompactInr;
  readonly formatInr = formatInr;

  readonly monthOptions: SelectOption[] = [
    { label: 'Aug 2026', value: 'Aug 2026' },
    { label: 'Jul 2026', value: 'Jul 2026' }
  ];
}
