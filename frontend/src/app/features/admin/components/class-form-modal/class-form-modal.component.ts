import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClassListRecord } from '../../../../core/models/admin.model';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';

/** Academic year the form starts on, e.g. `2026-2027`. */
function defaultAcademicYear(): string {
  const start = new Date().getFullYear();
  return `${start}-${start + 1}`;
}

/**
 * Modal for adding a class section to a school.
 *
 * A class section is unique per `(school, grade, section)`, so the form checks
 * the name against the school's existing sections and blocks a duplicate before
 * the request — otherwise the user would only learn about it from a 409.
 */
@Component({
  selector: 'app-class-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, UiButtonComponent, UiIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './class-form-modal.component.html',
})
export class ClassFormModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly saving = input(false);
  /** Sections already in the target school, used for the duplicate check. */
  readonly existingClasses = input<ClassListRecord[]>([]);
  /** Name of the school the class will belong to. */
  readonly schoolName = input('');

  readonly created = output<{ className: string; academicYear: string }>();
  readonly cancelled = output<void>();

  protected readonly form: FormGroup = this.fb.group({
    className: ['', [Validators.required, Validators.maxLength(50)]],
    academicYear: [
      defaultAcademicYear(),
      [Validators.required, Validators.pattern(/^\d{4}-\d{4}$/)],
    ],
  });

  /**
   * True when this school already has a section with the entered name.
   *
   * A plain getter rather than a `computed()` on purpose: the source of truth
   * is a reactive-form control, which is not a signal, so a `computed` would
   * cache the first answer and never notice the user typing. Re-evaluating on
   * each change-detection pass is exactly the behaviour we want.
   */
  protected get duplicateName(): boolean {
    const name = String(this.form.get('className')?.value ?? '')
      .trim()
      .toUpperCase();
    if (!name) return false;
    return this.existingClasses().some(
      (section) => section.className.trim().toUpperCase() === name
    );
  }

  protected invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.duplicateName) return;

    const value = this.form.getRawValue() as { className: string; academicYear: string };
    this.created.emit({
      className: value.className.trim().toUpperCase(),
      academicYear: value.academicYear.trim(),
    });
  }
}