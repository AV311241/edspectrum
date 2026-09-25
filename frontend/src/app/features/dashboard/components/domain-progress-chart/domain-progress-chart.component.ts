import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { BarChartComponent } from '../../../../shared/charts/bar-chart/bar-chart.component';

@Component({
  selector: 'app-domain-progress-chart',
  standalone: true,
  imports: [UiCardComponent, BarChartComponent],
  templateUrl: './domain-progress-chart.component.html'
})
export class DomainProgressChartComponent {
  readonly dashboardService = inject(DashboardDataService);
}
