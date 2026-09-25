import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { UiSelectComponent, SelectOption } from '../../../../shared/components/ui-select/ui-select.component';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';

@Component({
  selector: 'app-teaching-section',
  standalone: true,
  imports: [UiCardComponent, UiSelectComponent, UiIconComponent],
  templateUrl: './teaching-section.component.html'
})
export class TeachingSectionComponent {
  readonly dashboardService = inject(DashboardDataService);

  readonly classOptions: SelectOption[] = [
    { label: 'All Classes', value: 'All Classes' },
    { label: 'Class 6A', value: 'Class 6A' },
    { label: 'Class 7A', value: 'Class 7A' }
  ];
}
