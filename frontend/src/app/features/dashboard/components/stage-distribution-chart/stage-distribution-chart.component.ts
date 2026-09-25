import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { HorizontalBarChartComponent } from '../../../../shared/charts/horizontal-bar-chart/horizontal-bar-chart.component';

@Component({
  selector: 'app-stage-distribution-chart',
  standalone: true,
  imports: [UiCardComponent, HorizontalBarChartComponent],
  templateUrl: './stage-distribution-chart.component.html'
})
export class StageDistributionChartComponent {
  readonly dashboardService = inject(DashboardDataService);
}
