import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { DonutChartComponent } from '../../../../shared/charts/donut-chart/donut-chart.component';

@Component({
  selector: 'app-sas-distribution-chart',
  standalone: true,
  imports: [UiCardComponent, DonutChartComponent],
  templateUrl: './sas-distribution-chart.component.html'
})
export class SasDistributionChartComponent {
  readonly dashboardService = inject(DashboardDataService);
}
