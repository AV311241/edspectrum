import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  AdminStudentView,
  ClassListRecord,
  Gender,
  SchoolRecord,
  StudentStatus,
  UpdateStudentPayload,
} from '../../../../core/models/admin.model';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';

/** Academic year the form starts on when creating a student. */
const DEFAULT_YEAR = new Date().getFullYear();

/**
 * Create / edit modal for a single student, built on a typed Reactive Form.
 *
 * It is a **dumb form**: it collects and validates, then emits a payload. The
 * page owns the API call, the loading state and the error surface, so the same
 * modal serves both the "Add student" button and a row's Edit action.
 *
 * `effect()` re-seeds the form whenever the target student changes, which is
 * what makes `patchValue` correct: switching straight from editing one student
 * to another replaces every field, including clearing ones the new record
 * leaves empty, instead of leaving the previous learner's values behind.
 */
@Component({
  selector: 'app-student-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, UiButtonComponent, UiIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-form-modal.component.html',
})
export class StudentFormModalComponent {
  private readonly fb = inject(FormBuilder);

  /** `null` means "create a new student". */
  readonly student = input<AdminStudentView | null>(null);
  readonly schools = input<SchoolRecord[]>([]);
  readonly classes = input<ClassListRecord[]>([]);
  readonly saving = input(false);

  readonly saved = output<UpdateStudentPayload>();
  readonly cancelled = output<void>();

  /** `true` when an existing student is being edited. */
  protected readonly isEdit = () => this.student() !== null;

  protected readonly form: FormGroup = this.fb.group({
    studentIdCode: ['', [Validators.required, Validators.maxLength(50)]],
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    schoolId: [null as number | null, Validators.required],
    classId: [null as number | null],
    gender: [null as Gender | null],
    dateOfBirth: [''],
    status: ['ACTIVE' as StudentStatus],
  });

  protected readonly statuses: StudentStatus[] = ['ACTIVE', 'INACTIVE', 'TRANSFERRED'];
  protected readonly genders: Gender[] = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

  constructor() {
    // Re-seed whenever the modal switches between create / edit / another row.
    effect(() => {
      const target = this.student();
      const schoolId = this.schools()[0]?.id ?? null;

      this.form.reset(
        {
          studentIdCode: target?.studentIdCode ?? '',
          firstName: target?.record.firstName ?? '',
          lastName: target?.record.lastName ?? '',
          schoolId: target?.record.schoolId ?? schoolId,
          classId: target?.record.classId ?? this.classes()[0]?.id ?? null,
          gender: target?.record.gender ?? null,
          dateOfBirth: target?.record.dateOfBirth ?? '',
          status: target?.record.status ?? 'ACTIVE',
        },
        { emitEvent: false }
      );

      // `reset` clears touched/dirty state; re-enable live validation for edits.
      if (target) this.form.markAsPristine();
    });
  }

  /** True once a control has been touched and is invalid. */
  invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      // Reveal every problem at once rather than one field per attempt.
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue() as {
      studentIdCode: string;
      firstName: string;
      lastName: string;
      schoolId: number | null;
      classId: number | null;
      gender: Gender | null;
      dateOfBirth: string;
      status: StudentStatus;
    };

    this.saved.emit({
      studentIdCode: value.studentIdCode.trim(),
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      schoolId: value.schoolId ?? undefined,
      classId: value.classId,
      gender: value.gender,
      // The API expects `null`, not an empty string, for an absent date.
      dateOfBirth: value.dateOfBirth ? value.dateOfBirth : null,
      status: value.status,
    });
  }
}