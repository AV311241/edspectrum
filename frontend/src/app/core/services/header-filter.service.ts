import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ALL_CLASSES_FILTER,
  ALL_SCHOOLS_FILTER,
  NOT_AVAILABLE_FILTER,
} from '../models/dashboard.model';
import { DashboardDataService } from './dashboard-data.service';
import {
  ClassListRecord,
  SchoolManagementService,
  SchoolRecord,
} from './school-management.service';

/**
 * Backs the dashboard header's School and Class dropdowns with real backend
 * data instead of hard-coded sample rows.
 *
 * Rules:
 *  - Schools come from `GET /schools`; class sections from `GET /classes`.
 *  - An empty list **and** a failed request both collapse the dropdown to a
 *    single `NA` option, so the header never shows a blank control.
 *  - Changing the school reloads the class list for that school and resets the
 *    class filter, because a class section belongs to exactly one school.
 */
@Injectable({ providedIn: 'root' })
export class HeaderFilterService {
  private readonly api = inject(SchoolManagementService);
  private readonly dashboard = inject(DashboardDataService);

  readonly schools = signal<SchoolRecord[]>([]);
  readonly classes = signal<ClassListRecord[]>([]);
  readonly schoolsLoading = signal(false);
  readonly classesLoading = signal(false);
  readonly schoolsLoaded = signal(false);
  readonly classesLoaded = signal(false);
  readonly loadError = signal('');

  /** True while the School dropdown is pinned to the "All Schools" option. */
  readonly isAllSchoolsSelected = computed(
    () => this.dashboard.activeFilters().school === ALL_SCHOOLS_FILTER
  );

  /** True when the backend returned no school at all, so the dropdown shows `NA`. */
  readonly hasSchools = computed(() => this.schools().length > 0);

  /** True when the current school has no class sections, so the dropdown shows `NA`. */
  readonly hasClasses = computed(() => this.classes().length > 0);

  /** Loads both dropdowns. Safe to call repeatedly (e.g. on every header mount). */
  async load(): Promise<void> {
    await this.loadSchools();
    await this.loadClasses();
  }

  async loadSchools(): Promise<void> {
    this.schoolsLoading.set(true);
    this.loadError.set('');
    try {
      this.schools.set(await this.api.listSchools());
    } catch (error) {
      this.schools.set([]);
      this.loadError.set(this.errorMessage(error, 'Could not load schools.'));
    } finally {
      this.schoolsLoaded.set(true);
      this.schoolsLoading.set(false);
      this.reconcileSchoolFilter();
    }
  }

  /**
   * Loads the class sections for one school, or every class section when
   * `schoolId` is omitted (the "All Schools" case).
   */
  async loadClasses(schoolId?: number): Promise<void> {
    this.classesLoading.set(true);
    try {
      this.classes.set(await this.api.listClasses(schoolId));
    } catch (error) {
      this.classes.set([]);
      this.loadError.set(this.errorMessage(error, 'Could not load class sections.'));
    } finally {
      this.classesLoaded.set(true);
      this.classesLoading.set(false);
      this.reconcileClassFilter();
    }
  }

  /**
   * Applies a new School selection and reloads the class list to match.
   * The Class filter always resets, because the previously selected section
   * may not exist in the newly selected school.
   */
  async selectSchool(schoolId?: number): Promise<void> {
    this.dashboard.updateFilter('className', ALL_CLASSES_FILTER);
    await this.loadClasses(schoolId);
  }

  selectClass(classId: number): void {
    this.dashboard.updateFilter('className', String(classId));
  }

  /**
   * Forces the stored filter onto an option that actually exists, so the
   * native `<select>` can never be left pointing at a removed record.
   */
  private reconcileSchoolFilter(): void {
    const current = this.dashboard.activeFilters().school;
    if (current === ALL_SCHOOLS_FILTER || current === NOT_AVAILABLE_FILTER) return;

    const stillExists = this.schools().some((school) => String(school.id) === current);
    this.dashboard.updateFilter('school', stillExists ? current : ALL_SCHOOLS_FILTER);
  }

  private reconcileClassFilter(): void {
    const current = this.dashboard.activeFilters().className;
    if (current === ALL_CLASSES_FILTER || current === NOT_AVAILABLE_FILTER) return;

    const stillExists = this.classes().some((classSection) => String(classSection.id) === current);
    this.dashboard.updateFilter('className', stillExists ? current : ALL_CLASSES_FILTER);
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message ?? error.error?.error?.message;
      return typeof message === 'string' ? message : fallback;
    }
    return fallback;
  }
}