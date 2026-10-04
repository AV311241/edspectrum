import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateSchoolPayload } from '../../../../core/models/admin.model';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';

/**
 * Modal for creating a school.
 *
 * The backend's `CreateSchoolInput` accepts only `code` and `name`, so those are
 * the only two required fields here. `location` is rendered but sent through
 * untouched by `AdminService.createSchool`; it exists in the payload model so
 * adding the column to the backend needs no change to this form.
 *
 * The `code` field is upper-cased on blur because the backend treats it as the
 * school's unique identity, and a stray lowercase value would be stored
 * inconsistently against codes entered elsewhere in the app.
 */
@Component({
  selector: 'app-school-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, UiButtonComponent, UiIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './school-form-modal.component.html',
})
export class SchoolFormModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly saving = input(false);
  /** Codes already in use, so the form can warn before the API answers 409. */
  readonly existingCodes = input<string[]>([]);

  readonly created = output<CreateSchoolPayload>();
  readonly cancelled = output<void>();

  protected readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    code: ['', [Validators.required, Validators.maxLength(50)]],
    location: [''],
  });

  /** True when the entered code collides with a school that already exists. */
  protected get codeTaken(): boolean {
    const code = String(this.form.get('code')?.value ?? '')
      .trim()
      .toUpperCase();
    if (!code) return false;
    return this.existingCodes().some((existing) => existing.toUpperCase() === code);
  }

  protected invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected normaliseCode(): void {
    this.form.patchValue(
      { code: String(this.form.get('code')?.value ?? '').trim().toUpperCase() },
      { emitEvent: false }
    );
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.codeTaken) return;

    const value = this.form.getRawValue() as { name: string; code: string; location: string };
    this.created.emit({
      name: value.name.trim(),
      code: value.code.trim().toUpperCase(),
      location: value.location.trim() || undefined,
    });
  }
}