import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { CreateUserDTO, RoleRecord, UpdateUserDTO, UserResponseDTO } from '../../core/models/api.models';

interface UserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const EMPTY_FORM: UserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  roleId: 0,
  status: 'ACTIVE',
};

/**
 * The admin-only user management screen.
 *
 * Accounts can ONLY be created here (there is no self-registration anywhere
 * in the product): the route is double-gated by `authGuard` + `adminGuard`
 * and every API call it makes is rejected by the backend's `requireAdmin`
 * middleware for non-admin tokens.
 *
 * Guard-rail aware: the signed-in admin cannot delete themselves or change
 * their own role/status, so those actions are hidden for the current row and
 * the API would answer 403 anyway.
 */
@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './users-page.component.html',
})
export class UsersPageComponent {
  private readonly usersApi = inject(UserService);
  private readonly auth = inject(AuthService);

  readonly users = signal<UserResponseDTO[]>([]);
  readonly roles = signal<RoleRecord[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  /** Modal state: `editingId === null` means create mode. */
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  editingId: number | null = null;

  form: UserForm = { ...EMPTY_FORM };

  readonly currentUserId = this.auth.user()?.id ?? -1;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.usersApi.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageOf(err));
      },
    });

    this.usersApi.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      // Roles only feed the form pick-list; the table stays usable without them.
      error: () => this.roles.set([]),
    });
  }

  isCurrentUser(user: UserResponseDTO): boolean {
    return user.id === this.currentUserId;
  }

  roleName(user: UserResponseDTO): string {
    const role = this.roles().find((r) => r.id === user.roleId);
    return role ? role.name : `Role #${user.roleId}`;
  }

  // ---------------------------------------------------------------------------
  // Create / edit form
  // ---------------------------------------------------------------------------

  openCreate(): void {
    this.editingId = null;
    this.form = { ...EMPTY_FORM, roleId: this.roles()[0]?.id ?? 0 };
    this.formError.set(null);
    this.notice.set(null);
    this.formOpen.set(true);
  }

  openEdit(user: UserResponseDTO): void {
    this.editingId = user.id;
    // Password left blank in edit mode means "keep current password".
    this.form = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      roleId: user.roleId,
      status: user.status,
    };
    this.formError.set(null);
    this.notice.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingId = null;
  }

  save(): void {
    const validation = this.validateForm();
    if (validation) {
      this.formError.set(validation);
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);

    const onSuccess = (): void => {
      this.saving.set(false);
      this.notice.set(this.editingId === null ? 'User created.' : 'User updated.');
      this.closeForm();
      this.load();
    };
    const onError = (err: unknown): void => {
      this.saving.set(false);
      this.formError.set(this.messageOf(err));
    };

    if (this.editingId === null) {
      const payload: CreateUserDTO = {
        email: this.form.email.trim(),
        firstName: this.form.firstName.trim(),
        lastName: this.form.lastName.trim(),
        password: this.form.password,
        roleId: this.form.roleId,
        status: this.form.status,
      };
      this.usersApi.createUser(payload).subscribe({ next: onSuccess, error: onError });
    } else {
      const payload: UpdateUserDTO = {
        email: this.form.email.trim(),
        firstName: this.form.firstName.trim(),
        lastName: this.form.lastName.trim(),
        roleId: this.form.roleId,
        status: this.form.status,
      };
      if (this.form.password) payload.password = this.form.password;
      this.usersApi.updateUser(this.editingId, payload).subscribe({ next: onSuccess, error: onError });
    }
  }

  // ---------------------------------------------------------------------------
  // Row actions
  // ---------------------------------------------------------------------------

  toggleStatus(user: UserResponseDTO): void {
    if (this.isCurrentUser(user)) return; // backend rejects self status changes
    const status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.error.set(null);
    this.usersApi.updateUser(user.id, { status }).subscribe({
      next: () => {
        this.notice.set(`${user.firstName} ${user.lastName} is now ${status.toLowerCase()}.`);
        this.load();
      },
      error: (err: unknown) => this.error.set(this.messageOf(err)),
    });
  }

  remove(user: UserResponseDTO): void {
    if (this.isCurrentUser(user)) return; // backend rejects self-deletion
    const confirmed = window.confirm(
      `Delete ${user.firstName} ${user.lastName} (${user.email})? This cannot be undone.`
    );
    if (!confirmed) return;

    this.error.set(null);
    this.usersApi.deleteUser(user.id).subscribe({
      next: () => {
        this.notice.set(`User ${user.email} deleted.`);
        this.load();
      },
      error: (err: unknown) => this.error.set(this.messageOf(err)),
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private validateForm(): string | null {
    if (this.form.firstName.trim().length < 2) return 'First name must be at least 2 characters.';
    if (this.form.lastName.trim().length < 2) return 'Last name must be at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) return 'Enter a valid email address.';
    if (!this.form.roleId) return 'Select a role.';
    // Create mode always needs a password; edit mode treats blank as "unchanged".
    if (this.editingId === null && this.form.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (this.form.password && this.form.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    return null;
  }

  /** Extracts the backend's `{ error: { message } }` envelope, if present. */
  private messageOf(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { error?: { message?: string } } | null;
      if (body?.error?.message) return body.error.message;
      if (err.status === 0) return 'Cannot reach the server. Please try again.';
      return `Request failed (${err.status}).`;
    }
    return 'Unexpected error. Please try again.';
  }
}