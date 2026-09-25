import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';

@Component({
  selector: 'app-overall-progress-summary',
  standalone: true,
  imports: [UiCardComponent],
  templateUrl: './overall-progress-summary.component.html'
})
export class OverallProgressSummaryComponent {
  readonly dashboardService = inject(DashboardDataService);
}
