import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';

@Component({
  selector: 'app-stage-movement',
  standalone: true,
  imports: [UiCardComponent],
  templateUrl: './stage-movement.component.html'
})
export class StageMovementComponent {
  readonly dashboardService = inject(DashboardDataService);
}
