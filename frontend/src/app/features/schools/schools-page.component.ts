import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ClassRecord,
  SchoolManagementService,
  SchoolRecord,
  StudentRecord,
} from '../../core/services/school-management.service';
import { UiIconComponent } from '../../shared/components/ui-icon/ui-icon.component';

type DialogMode = 'school' | 'class' | 'edit-class' | 'edit-student' | 'transfer';

@Component({
  selector: 'app-schools-page',
  standalone: true,
  imports: [DatePipe, FormsModule, UiIconComponent],
  templateUrl: './schools-page.component.html',
  styleUrl: './schools-page.component.scss',
})
export class SchoolsPageComponent implements OnInit {
  private readonly api = inject(SchoolManagementService);

  readonly schools = signal<SchoolRecord[]>([]);
  readonly selectedSchool = signal<SchoolRecord | null>(null);
  readonly classes = signal<ClassRecord[]>([]);
  readonly selectedClass = signal<ClassRecord | null>(null);
  readonly students = signal<StudentRecord[]>([]);
  readonly filteredSchools = computed(() => {
    const query = this.schoolSearch().trim().toLowerCase();
    return this.schools().filter((school) =>
      school.id === this.selectedSchool()?.id || `${school.name} ${school.code}`.toLowerCase().includes(query)
    );
  });
  readonly filteredStudents = computed(() => {
    const query = this.studentSearch().trim().toLowerCase();
    const status = this.statusFilter();
    return this.students().filter((student) => {
      const matchesQuery = `${student.firstName} ${student.lastName} ${student.studentIdCode}`
        .toLowerCase()
        .includes(query);
      return matchesQuery && (!status || student.status === status);
    });
  });
  readonly schoolsLoading = signal(true);
  readonly classesLoading = signal(false);
  readonly rosterLoading = signal(false);
  readonly saving = signal(false);
  readonly dialog = signal<DialogMode | null>(null);
  readonly dialogClass = signal<ClassRecord | null>(null);
  readonly dialogStudent = signal<StudentRecord | null>(null);
  readonly schoolSearch = signal('');
  readonly studentSearch = signal('');
  readonly statusFilter = signal('');
  readonly toast = signal('');

  schoolCode = '';
  schoolName = '';
  className = '';
  academicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  studentFirstName = '';
  studentLastName = '';
  studentStatus: StudentRecord['status'] = 'ACTIVE';
  transferTargetId = '';

  async ngOnInit(): Promise<void> {
    await this.loadSchools();
  }

  async loadSchools(): Promise<void> {
    this.schoolsLoading.set(true);
    try {
      const schools = await this.api.listSchools();
      this.schools.set(schools);
      const selected = schools.find((school) => school.id === this.selectedSchool()?.id) ?? schools[0] ?? null;
      this.selectedSchool.set(selected);
      if (selected) await this.loadClasses(selected);
      else this.classes.set([]);
    } catch (error) {
      this.notify(this.errorMessage(error, 'Could not load schools.'));
    } finally {
      this.schoolsLoading.set(false);
    }
  }

  async selectSchool(event: Event): Promise<void> {
    const schoolId = Number((event.target as HTMLSelectElement).value);
    const school = this.schools().find((item) => item.id === schoolId) ?? null;
    this.selectedSchool.set(school);
    this.closeRoster();
    if (school) await this.loadClasses(school);
  }

  private async loadClasses(school: SchoolRecord): Promise<void> {
    this.classesLoading.set(true);
    try {
      const response = await this.api.getClasses(school.id);
      this.classes.set(response.classes);
    } catch (error) {
      this.classes.set([]);
      this.notify(this.errorMessage(error, 'Could not load classes.'));
    } finally {
      this.classesLoading.set(false);
    }
  }

  async openRoster(classSection: ClassRecord): Promise<void> {
    this.selectedClass.set(classSection);
    this.studentSearch.set('');
    this.statusFilter.set('');
    this.rosterLoading.set(true);
    this.students.set([]);
    try {
      this.students.set(await this.api.getClassStudents(classSection.id));
    } catch (error) {
      this.notify(this.errorMessage(error, 'Could not load the class roster.'));
    } finally {
      this.rosterLoading.set(false);
    }
  }

  closeRoster(): void {
    this.selectedClass.set(null);
    this.students.set([]);
  }

  openDialog(mode: DialogMode, classSection?: ClassRecord, student?: StudentRecord): void {
    this.dialog.set(mode);
    this.dialogClass.set(classSection ?? null);
    this.dialogStudent.set(student ?? null);
    if (mode === 'school') {
      this.schoolCode = '';
      this.schoolName = '';
    } else if (mode === 'class') {
      this.className = '';
      this.academicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    } else if (mode === 'edit-class' && classSection) {
      this.className = classSection.className;
      this.academicYear = classSection.academicYear ?? '';
    } else if (mode === 'edit-student' && student) {
      this.studentFirstName = student.firstName;
      this.studentLastName = student.lastName;
      this.studentStatus = student.status;
    } else if (mode === 'transfer') {
      this.transferTargetId = '';
    }
  }

  closeDialog(): void {
    if (!this.saving()) this.dialog.set(null);
  }

  async submitDialog(): Promise<void> {
    const mode = this.dialog();
    if (!mode) return;
    this.saving.set(true);
    try {
      if (mode === 'school') {
        const created = await this.api.createSchool({ code: this.schoolCode, name: this.schoolName });
        this.schools.update((schools) => [...schools, created].sort((a, b) => a.name.localeCompare(b.name)));
        this.selectedSchool.set(created);
        this.dialog.set(null);
        await this.loadClasses(created);
        this.notify('School created.');
        return;
      }
      if (mode === 'class') {
        const school = this.selectedSchool();
        if (!school) return;
        await this.api.createClass(school.id, { className: this.className, academicYear: this.academicYear });
        this.dialog.set(null);
        await this.loadClasses(school);
        this.notify('Class created.');
        return;
      }
      if (mode === 'edit-class') {
        const current = this.dialogClass();
        const school = this.selectedSchool();
        if (!current || !school) return;
        await this.api.updateClass(current.id, { name: this.className, academicYear: this.academicYear });
        this.dialog.set(null);
        await this.loadClasses(school);
        this.notify('Class updated.');
        return;
      }
      if (mode === 'edit-student') {
        const student = this.dialogStudent();
        if (!student) return;
        await this.api.updateStudent(student.id, {
          firstName: this.studentFirstName,
          lastName: this.studentLastName,
          status: this.studentStatus,
        });
        this.dialog.set(null);
        await this.refreshRoster();
        await this.refreshClassCounts();
        this.notify('Student updated.');
        return;
      }
      if (mode === 'transfer') await this.transferSelectedStudent();
    } catch (error) {
      this.notify(this.errorMessage(error, 'The change could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteClass(classSection: ClassRecord): Promise<void> {
    if (!window.confirm(`Delete ${classSection.className}? Classes with enrolled students cannot be deleted.`)) return;
    try {
      await this.api.deleteClass(classSection.id);
      if (this.selectedClass()?.id === classSection.id) this.closeRoster();
      const school = this.selectedSchool();
      if (school) await this.loadClasses(school);
      this.notify('Class deleted.');
    } catch (error) {
      this.notify(this.errorMessage(error, 'Could not delete this class.'));
    }
  }

  private async transferSelectedStudent(): Promise<void> {
    const student = this.dialogStudent();
    const currentClass = this.selectedClass();
    const targetId = Number(this.transferTargetId);
    if (!student || !currentClass || !targetId) return;
    await this.api.transferStudent(student.id, currentClass.id, targetId);
    this.dialog.set(null);
    await this.refreshRoster();
    await this.refreshClassCounts();
    this.notify('Student transferred.');
  }

  private async refreshRoster(): Promise<void> {
    const currentClass = this.selectedClass();
    if (currentClass) this.students.set(await this.api.getClassStudents(currentClass.id));
  }

  private async refreshClassCounts(): Promise<void> {
    const school = this.selectedSchool();
    if (school) await this.loadClasses(school);
  }

  private notify(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => {
      if (this.toast() === message) this.toast.set('');
    }, 4000);
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message ?? error.error?.error?.message;
      return typeof message === 'string' ? message : fallback;
    }
    return fallback;
  }
}