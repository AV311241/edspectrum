import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { UiSelectComponent, SelectOption } from '../../../../shared/components/ui-select/ui-select.component';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';
import { UiBadgeComponent } from '../../../../shared/components/ui-badge/ui-badge.component';
import { LineChartComponent } from '../../../../shared/charts/line-chart/line-chart.component';

@Component({
  selector: 'app-engagement-section',
  standalone: true,
  imports: [UiCardComponent, UiSelectComponent, UiIconComponent, UiBadgeComponent, LineChartComponent],
  templateUrl: './engagement-section.component.html'
})
export class EngagementSectionComponent {
  readonly dashboardService = inject(DashboardDataService);

  readonly schoolOptions: SelectOption[] = [
    { label: 'All Schools', value: 'All Schools' },
    { label: 'Navjyoti Public School', value: 'Navjyoti Public School' },
    { label: 'RS Vidya School', value: 'RS Vidya School' }
  ];
}
