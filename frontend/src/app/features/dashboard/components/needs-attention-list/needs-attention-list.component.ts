import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';

@Component({
  selector: 'app-needs-attention-list',
  standalone: true,
  imports: [UiCardComponent],
  templateUrl: './needs-attention-list.component.html'
})
export class NeedsAttentionListComponent {
  readonly dashboardService = inject(DashboardDataService);
}
