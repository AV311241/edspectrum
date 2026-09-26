import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { BarChartComponent } from '../../../../shared/charts/bar-chart/bar-chart.component';

@Component({
  selector: 'app-learning-progress-chart',
  standalone: true,
  imports: [UiCardComponent, BarChartComponent],
  templateUrl: './learning-progress-chart.component.html',
  styleUrl: './learning-progress-chart.component.scss'
})
export class LearningProgressChartComponent {
  readonly dashboardService = inject(DashboardDataService);
}
