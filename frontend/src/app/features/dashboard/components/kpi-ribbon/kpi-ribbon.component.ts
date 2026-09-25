import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { UiBadgeComponent } from '../../../../shared/components/ui-badge/ui-badge.component';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';

@Component({
  selector: 'app-kpi-ribbon',
  standalone: true,
  imports: [UiCardComponent, UiBadgeComponent, UiIconComponent],
  templateUrl: './kpi-ribbon.component.html'
})
export class KpiRibbonComponent {
  readonly dashboardService = inject(DashboardDataService);
}
