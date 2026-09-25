import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { UiBadgeComponent } from '../../../../shared/components/ui-badge/ui-badge.component';

@Component({
  selector: 'app-school-performance-table',
  standalone: true,
  imports: [UiCardComponent, UiBadgeComponent],
  templateUrl: './school-performance-table.component.html'
})
export class SchoolPerformanceTableComponent {
  readonly dashboardService = inject(DashboardDataService);
}
