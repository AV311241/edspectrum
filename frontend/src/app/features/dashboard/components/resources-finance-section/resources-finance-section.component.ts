import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { UiSelectComponent, SelectOption } from '../../../../shared/components/ui-select/ui-select.component';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';
import { LineChartComponent } from '../../../../shared/charts/line-chart/line-chart.component';

@Component({
  selector: 'app-resources-finance-section',
  standalone: true,
  imports: [UiCardComponent, UiSelectComponent, UiIconComponent, LineChartComponent],
  templateUrl: './resources-finance-section.component.html'
})
export class ResourcesFinanceSectionComponent {
  readonly dashboardService = inject(DashboardDataService);

  readonly monthOptions: SelectOption[] = [
    { label: 'Aug 2026', value: 'Aug 2026' },
    { label: 'Jul 2026', value: 'Jul 2026' }
  ];
}
