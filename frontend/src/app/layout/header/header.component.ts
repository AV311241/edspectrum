import { Component, inject } from '@angular/core';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { UiSelectComponent, SelectOption } from '../../shared/components/ui-select/ui-select.component';
import { UiIconComponent } from '../../shared/components/ui-icon/ui-icon.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [UiSelectComponent, UiIconComponent],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  readonly dashboardService = inject(DashboardDataService);

  readonly yearOptions: SelectOption[] = [
    { label: '2026 – 27', value: '2026 – 27' },
    { label: '2025 – 26', value: '2025 – 26' }
  ];

  readonly monthOptions: SelectOption[] = [
    { label: 'Aug 2026', value: 'Aug 2026' },
    { label: 'Jul 2026', value: 'Jul 2026' },
    { label: 'Jun 2026', value: 'Jun 2026' }
  ];

  readonly schoolOptions: SelectOption[] = [
    { label: 'All Schools', value: 'All Schools' },
    { label: 'Navjyoti Public School', value: 'Navjyoti Public School' },
    { label: 'RS Vidya School', value: 'RS Vidya School' },
    { label: 'Tilpat Public School', value: 'Tilpat Public School' },
    { label: 'Shirdi Sai Baba School', value: 'Shirdi Sai Baba School' }
  ];

  readonly classOptions: SelectOption[] = [
    { label: 'All Classes', value: 'All Classes' },
    { label: 'Class 6A', value: 'Class 6A' },
    { label: 'Class 7A', value: 'Class 7A' },
    { label: 'Class 8A', value: 'Class 8A' },
    { label: 'Class 9A', value: 'Class 9A' },
    { label: 'Class 10A', value: 'Class 10A' }
  ];
}
