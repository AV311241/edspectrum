import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { STAGE_COLOR_CLASSES } from '../../../../shared/charts/horizontal-bar-chart/horizontal-bar-chart.component';

@Component({
  selector: 'app-stage-movement',
  standalone: true,
  imports: [UiCardComponent],
  templateUrl: './stage-movement.component.html'
})
export class StageMovementComponent {
  readonly dashboardService = inject(DashboardDataService);

  /** Each stage bar is tinted from the shared Stage 1 -> Stage 5 ramp. */
  getStageBarClass(idx: number): string {
    return STAGE_COLOR_CLASSES[idx] ?? STAGE_COLOR_CLASSES[STAGE_COLOR_CLASSES.length - 1];
  }
}
