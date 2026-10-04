import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * The single sign-in screen.
 *
 * Deliberately minimal: email + password against `POST /auth/login`, then a
 * redirect to the dashboard. Credential errors render inline rather than as a
 * toast so they cannot be missed next to the form that caused them.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/']);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.error.set('Invalid email or password.');
        } else if (err instanceof HttpErrorResponse && err.status === 429) {
          this.error.set('Too many attempts. Please wait a moment and try again.');
        } else {
          this.error.set('Sign-in failed. Please try again.');
        }
      },
    });
  }
}
