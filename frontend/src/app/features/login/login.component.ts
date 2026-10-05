import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Full-page sign-in screen for the Akshara portal.
 *
 * Adapted from the provided mock to what the backend actually supports:
 * - Email + password only (`POST /auth/login` takes `{ email, password }`).
 *   There is NO OTP endpoint, NO Google Workspace SSO, and NO
 *   self-registration — accounts are created by an administrator
 *   (`POST /users`, admin-only) from the seeded default admin. So the
 *   mock's OTP tab / Google / "Request Access" actions are rendered as
 *   disabled informational affordances, never as working logins.
 * - The "quick role preview" fills the email field with the seeded default
 *   admin (`admin@edspectrum.org`, see `backend/src/seed/admin.seed.ts`);
 *   the other preset addresses are demo-only and will 401 unless an admin
 *   has actually created them.
 * - Full-page chrome (top bar + footer) lives here, not in the dashboard
 *   shell — `LayoutShellComponent` skips sidebar/header/footer on `/login`.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = 'admin@edspectrum.org';
  password = '';
  rememberMe = true;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly selectedDemo = signal<'admin' | 'lead' | 'teacher'>('admin');

  /** Demo presets — only the admin address is guaranteed to exist (seed). */
  private static readonly DEMO_EMAILS = {
    admin: 'admin@edspectrum.org',
    lead: 'lead.eval@edspectrum.org',
    teacher: 'teacher.english@tilpat.school.org',
  } as const;

  fillDemo(role: 'admin' | 'lead' | 'teacher'): void {
    this.selectedDemo.set(role);
    this.email = LoginComponent.DEMO_EMAILS[role];
    this.error.set(null);
  }

  togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

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

