import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AdminStudentView,
  ClassListRecord,
  CreateSchoolPayload,
  ParentContact,
  SchoolRecord,
  UpdateStudentPayload,
} from '../../core/models/admin.model';
import { AdminService } from '../../core/services/admin.service';
import { toErrorMessage } from '../../core/utils/http-error.utils';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { UiBadgeComponent } from '../../shared/components/ui-badge/ui-badge.component';
import { UiButtonComponent } from '../../shared/components/ui-button/ui-button.component';
import { UiCardComponent } from '../../shared/components/ui-card/ui-card.component';
import { UiIconComponent } from '../../shared/components/ui-icon/ui-icon.component';
import { ClassFormModalComponent } from './components/class-form-modal/class-form-modal.component';
import { SchoolFormModalComponent } from './components/school-form-modal/school-form-modal.component';
import { StudentFormModalComponent } from './components/student-form-modal/student-form-modal.component';
import {
  StudentSearchComponent,
  toStudentView,
} from './components/student-search/student-search.component';
import { StudentTableComponent } from './components/student-table/student-table.component';

/** Which modal is open, if any. */
type ModalKind = 'school' | 'class' | 'student' | 'confirm-student' | 'confirm-class';

/**
 * `/admin` — a single control tower for full CRUD on schools, classes and
 * students.
 *
 * Design notes:
 *  - **Signals, not a store.** The page owns its state in signals and derives
 *    the visible roster with `computed()`, matching `HeaderFilterService` and
 *    the schools page. This app has no NgRx/extra store, so introducing one for
 *    a single page would be out of step with the codebase.
 *  - **The hierarchy is a funnel.** Picking a school narrows the class list and
 *    resets the class; picking a class narrows the roster. Both live in signals
 *    and the roster is a `computed` over them, so there is no manual "reload"
 *    bookkeeping to drift out of sync.
 *  - **Modals are dumb.** Each child form validates and emits; every API call
 *    happens here so error handling and re-fetching stay in one place.
 *  - **Parent names are hydrated, not invented.** They come from the
 *    parent-interaction register, and a failure there degrades to an em-dash
 *    rather than blocking the roster.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    ClassFormModalComponent,
    ConfirmDialogComponent,
    SchoolFormModalComponent,
    StudentFormModalComponent,
    StudentSearchComponent,
    StudentTableComponent,
    UiBadgeComponent,
    UiButtonComponent,
    UiCardComponent,
    UiIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly admin = inject(AdminService);

  // ------------------------------------------------------------- page state --

  readonly schools = signal<SchoolRecord[]>([]);
  readonly classes = signal<ClassListRecord[]>([]);
  /** Whole-school roster; the table filters it down by class client-side. */
  readonly allStudents = signal<AdminStudentView[]>([]);
  readonly parentContacts = signal<Map<string, ParentContact>>(new Map());

  readonly selectedSchoolId = signal<number | null>(null);
  readonly selectedClassId = signal<number | null>(null);
  readonly searchTerm = signal('');

  readonly schoolsLoading = signal(true);
  readonly classesLoading = signal(false);
  readonly rosterLoading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly modal = signal<ModalKind | null>(null);
  readonly editingStudent = signal<AdminStudentView | null>(null);
  readonly deletingStudent = signal<AdminStudentView | null>(null);
  readonly deletingClass = signal<ClassListRecord | null>(null);
  readonly previewingStudentId = signal<number | null>(null);
  readonly toast = signal('');
  readonly loadError = signal('');

  // --------------------------------------------------------- derived state --

  readonly selectedSchool = computed(
    () => this.schools().find((school) => school.id === this.selectedSchoolId()) ?? null
  );

  /**
   * The visible roster. Filtering happens here rather than re-querying the API
   * on every class change, so switching class back and forth is instant and
   * cannot produce a loading flash.
   */
  readonly visibleStudents = computed(() => {
    const classId = this.selectedClassId();
    const term = this.searchTerm().trim().toLowerCase();
    return this.allStudents().filter((student) => {
      if (classId !== null && student.record.classId !== classId) return false;
      if (!term) return true;
      return (
        student.studentIdCode.toLowerCase().includes(term) ||
        student.fullName.toLowerCase().includes(term)
      );
    });
  });

  readonly studentCount = computed(() => this.visibleStudents().length);
  readonly classCount = computed(() => this.classes().length);

  /** The chosen section, so the template can label the roster without a lookup. */
  readonly selectedClass = computed(
    () => this.classes().find((section) => section.id === this.selectedClassId()) ?? null
  );

  /** Codes already taken, so the school form can warn before the API says 409. */
  readonly existingSchoolCodes = computed(() => this.schools().map((school) => school.code));

  readonly hasSchools = computed(() => this.schools().length > 0);
  readonly hasSelection = computed(
    () => this.selectedSchoolId() !== null && this.selectedClassId() !== null
  );

  ngOnInit(): void {
    this.loadSchools();
  }
  // ------------------------------------------------------------------ load --

  private loadSchools(): void {
    this.schoolsLoading.set(true);
    this.loadError.set('');

    this.admin.getSchools().subscribe({
      next: (schools) => {
        this.schools.set(schools);
        // Land on the first school so the page is never in a dead state.
        if (this.selectedSchoolId() === null && schools.length > 0) {
          this.selectSchool(schools[0].id);
        }
        this.schoolsLoading.set(false);
      },
      error: (error: unknown) => {
        this.schools.set([]);
        this.loadError.set(toErrorMessage(error, 'Could not load schools.'));
        this.schoolsLoading.set(false);
      },
    });
  }

  /**
   * Step 1 → 2. Loads a school's classes and its roster together, and clears
   * the class selection because a section from the previous school cannot be
   * valid in the new one.
   */
  selectSchool(schoolId: number): void {
    this.selectedSchoolId.set(schoolId);
    this.selectedClassId.set(null);
    this.previewingStudentId.set(null);

    this.classesLoading.set(true);
    this.rosterLoading.set(true);
    this.classes.set([]);
    this.allStudents.set([]);

    this.admin.getSchoolWorkspace(schoolId).subscribe({
      next: ({ classes, students }) => {
        this.classes.set(classes);
        this.allStudents.set(students.map((record) => this.project(record)));
        this.classesLoading.set(false);
        this.rosterLoading.set(false);
        this.loadParents();
      },
      error: (error: unknown) => {
        this.loadError.set(toErrorMessage(error, 'Could not load this school.'));
        this.classesLoading.set(false);
        this.rosterLoading.set(false);
      },
    });
  }

  /** Step 2 → 3. Narrows the already-loaded roster to one section. */
  selectClass(classId: number | null): void {
    this.selectedClassId.set(classId);
    this.previewingStudentId.set(null);
  }

  /** Client-side refinement on top of the class filter. */
  onSearchTermChanged(term: string): void {
    this.searchTerm.set(term);
  }

  /**
   * Joins the parent register onto the roster by student id code.
   *
   * Failures are swallowed deliberately: a missing parent register must not
   * blank the student table, which is this page's primary job.
   */
  private loadParents(): void {
    this.admin.getParentContacts().subscribe({
      next: (contacts) => {
        this.parentContacts.set(contacts);
        this.allStudents.update((rows) => rows.map((row) => this.project(row.record)));
      },
      error: () => this.parentContacts.set(new Map()),
    });
  }

  /** Rebuilds one row using the latest parent data. */
  private project(record: AdminStudentView['record']): AdminStudentView {
    return toStudentView(record, this.parentContacts().get(record.studentIdCode) ?? null);
  }

  // --------------------------------------------------------------- actions --

  openSchoolModal(): void {
    this.modal.set('school');
  }

  openClassModal(): void {
    if (!this.selectedSchool()) return;
    this.modal.set('class');
  }

  openCreateStudent(): void {
    if (!this.hasSchools()) return;
    this.editingStudent.set(null);
    this.modal.set('student');
  }

  openEditStudent(student: AdminStudentView): void {
    this.editingStudent.set(student);
    this.modal.set('student');
  }

  /** A student found via global search opens straight into the edit modal. */
  openSearchedStudent(student: AdminStudentView): void {
    this.openEditStudent(student);
  }

  requestDeleteStudent(student: AdminStudentView): void {
    this.deletingStudent.set(student);
    this.modal.set('confirm-student');
  }

  requestDeleteClass(classSection: ClassListRecord): void {
    this.deletingClass.set(classSection);
    this.modal.set('confirm-class');
  }

  closeModal(): void {
    this.modal.set(null);
    this.editingStudent.set(null);
    this.deletingStudent.set(null);
    this.deletingClass.set(null);
  }

  togglePreview(student: AdminStudentView): void {
    this.previewingStudentId.update((current) =>
      current === student.record.id ? null : student.record.id
    );
  }
  // -------------------------------------------------------------- mutations --

  createSchool(payload: CreateSchoolPayload): void {
    this.saving.set(true);
    this.admin.createSchool(payload).subscribe({
      next: (created) => {
        this.closeModal();
        this.saving.set(false);
        this.schools.update((schools) => [...schools, created]);
        // Jump straight to the new school so the next steps are immediately usable.
        this.selectSchool(created.id);
        this.notify(`School "${created.name}" created.`);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify(toErrorMessage(error, 'Could not create the school.'));
      },
    });
  }

  createClass(payload: { className: string; academicYear: string }): void {
    const school = this.selectedSchool();
    if (!school) return;

    this.saving.set(true);
    this.admin.createClass(school.id, payload).subscribe({
      next: (created) => {
        this.closeModal();
        this.saving.set(false);
        this.classes.update((classes) => [...classes, created]);
        this.notify(`Class ${created.className} created.`);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify(toErrorMessage(error, 'Could not create the class.'));
      },
    });
  }

  /**
   * Creates or updates depending on whether a target row was supplied.
   *
   * On success the row is spliced into the local roster rather than triggering
   * a full refetch, so the table keeps its scroll position and the new record
   * appears immediately.
   */
  saveStudent(payload: UpdateStudentPayload): void {
    const target = this.editingStudent();
    this.saving.set(true);

    const request$ = target
      ? this.admin.updateStudent(target.record.id, payload)
      : this.admin.createStudent({
          schoolId: payload.schoolId ?? this.selectedSchoolId() ?? 0,
          studentIdCode: payload.studentIdCode ?? '',
          firstName: payload.firstName ?? '',
          lastName: payload.lastName ?? '',
          dateOfBirth: payload.dateOfBirth ?? null,
          gender: payload.gender ?? null,
          classId: payload.classId ?? null,
        });

    request$.subscribe({
      next: (saved) => {
        this.closeModal();
        this.saving.set(false);
        this.allStudents.update((rows) => [
          ...rows.filter((row) => row.record.id !== saved.id),
          this.project(saved),
        ]);
        this.notify(target ? 'Student updated.' : 'Student created.');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify(toErrorMessage(error, 'Could not save the student.'));
      },
    });
  }

  confirmDeleteStudent(): void {
    const target = this.deletingStudent();
    if (!target) return;

    this.deleting.set(true);
    this.admin.deleteStudent(target.record.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeModal();
        this.allStudents.update((rows) => rows.filter((row) => row.record.id !== target.record.id));
        this.notify(`${target.fullName} deleted.`);
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        this.notify(toErrorMessage(error, 'Could not delete this student.'));
      },
    });
  }

  confirmDeleteClass(): void {
    const target = this.deletingClass();
    if (!target) return;

    this.deleting.set(true);
    this.admin.deleteClass(target.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeModal();
        this.classes.update((classes) => classes.filter((item) => item.id !== target.id));
        if (this.selectedClassId() === target.id) this.selectedClassId.set(null);
        this.notify(`Class ${target.className} deleted.`);
      },
      error: (error: unknown) => {
        // 409 means the class still has students — the backend's own safeguard.
        this.deleting.set(false);
        this.notify(toErrorMessage(error, 'Could not delete this class.'));
      },
    });
  }

  private notify(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => {
      if (this.toast() === message) this.toast.set('');
    }, 4000);
  }
}