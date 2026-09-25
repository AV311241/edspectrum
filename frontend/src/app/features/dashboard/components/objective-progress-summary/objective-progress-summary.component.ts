import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';

@Component({
  selector: 'app-objective-progress-summary',
  standalone: true,
  imports: [UiCardComponent],
  templateUrl: './objective-progress-summary.component.html'
})
export class ObjectiveProgressSummaryComponent {
  readonly dashboardService = inject(DashboardDataService);
}
