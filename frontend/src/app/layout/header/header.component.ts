import { Component, OnInit, computed, inject } from '@angular/core';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { HeaderFilterService } from '../../core/services/header-filter.service';
import {
  ALL_CLASSES_FILTER,
  ALL_SCHOOLS_FILTER,
  NOT_AVAILABLE_FILTER,
} from '../../core/models/dashboard.model';
import { UiSelectComponent, SelectOption } from '../../shared/components/ui-select/ui-select.component';
import { UiIconComponent } from '../../shared/components/ui-icon/ui-icon.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [UiSelectComponent, UiIconComponent],
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit {
  readonly dashboardService = inject(DashboardDataService);
  readonly headerFilters = inject(HeaderFilterService);
  readonly auth = inject(AuthService);

  readonly yearOptions: SelectOption[] = [
    { label: '2026 – 27', value: '2026 – 27' },
    { label: '2025 – 26', value: '2025 – 26' }
  ];

  readonly monthOptions: SelectOption[] = [
    { label: 'Aug 2026', value: 'Aug 2026' },
    { label: 'Jul 2026', value: 'Jul 2026' },
    { label: 'Jun 2026', value: 'Jun 2026' }
  ];

  /**
   * Schools come from `GET /schools`. Until the first response lands the list
   * is empty, and an empty list renders as a single `NA` option, so the
   * dropdown is never blank.
   */
  readonly schoolOptions = computed<SelectOption[]>(() => {
    const schools = this.headerFilters.schools();
    if (schools.length === 0) {
      return [{ label: NOT_AVAILABLE_FILTER, value: NOT_AVAILABLE_FILTER }];
    }
    return [
      { label: 'All Schools', value: ALL_SCHOOLS_FILTER },
      ...schools.map((school) => ({ label: school.name, value: String(school.id) }))
    ];
  });

  /**
   * Class sections come from `GET /classes`, scoped to the selected school.
   * When "All Schools" is active the school name is appended so identically
   * named sections stay distinguishable.
   */
  readonly classOptions = computed<SelectOption[]>(() => {
    const classes = this.headerFilters.classes();
    if (classes.length === 0) {
      return [{ label: NOT_AVAILABLE_FILTER, value: NOT_AVAILABLE_FILTER }];
    }
    const showSchool = this.headerFilters.isAllSchoolsSelected();
    return [
      { label: 'All Classes', value: ALL_CLASSES_FILTER },
      ...classes.map((classSection) => ({
        label: showSchool && classSection.schoolName
          ? `${classSection.name} (${classSection.schoolName})`
          : classSection.name,
        value: String(classSection.id)
      }))
    ];
  });

  /**
   * A native `<select>` silently falls back to its first option when the bound
   * value is missing from the list, so the displayed value is resolved against
   * the options that are actually rendered.
   */
  readonly selectedSchoolValue = computed(() =>
    this.matchOption(this.schoolOptions(), this.dashboardService.activeFilters().school)
  );

  readonly selectedClassValue = computed(() =>
    this.matchOption(this.classOptions(), this.dashboardService.activeFilters().className)
  );

  async ngOnInit(): Promise<void> {
    await this.headerFilters.load();
  }

  onSchoolChange(value: string): void {
    this.dashboardService.updateFilter('school', value);
    const schoolId =
      value === ALL_SCHOOLS_FILTER || value === NOT_AVAILABLE_FILTER ? undefined : Number(value);
    void this.headerFilters.selectSchool(schoolId);
  }

  onClassChange(value: string): void {
    if (value === ALL_CLASSES_FILTER) {
      this.dashboardService.updateFilter('className', value);
      return;
    }
    if (value === NOT_AVAILABLE_FILTER) return;
    this.headerFilters.selectClass(Number(value));
  }

  private matchOption(options: SelectOption[], current: string): string {
    return options.some((option) => option.value === current)
      ? current
      : (options[0]?.value ?? NOT_AVAILABLE_FILTER);
  }
}
