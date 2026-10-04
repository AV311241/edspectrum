import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSessionResponse, UserResponseDTO } from '../models/api.models';

const TOKEN_KEY = 'lumino1.auth.token';
const USER_KEY = 'lumino1.auth.user';

/**
 * Owns the JWT session: login, persistence, and the current user signal.
 *
 * The token is stored in `localStorage` so a page refresh keeps the session;
 * `authInterceptor` attaches it to every outgoing request, and the router guard
 * reads `isLoggedIn` to keep anonymous visitors on `/login`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly userSignal = signal<UserResponseDTO | null>(AuthService.readStoredUser());

  /** The signed-in user, or `null` when logged out. */
  readonly user = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.userSignal() !== null);

  /** `POST /auth/login` - stores the session before the observable completes. */
  login(email: string, password: string): Observable<AuthSessionResponse> {
    return this.http
      .post<AuthSessionResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((session) => {
          localStorage.setItem(TOKEN_KEY, session.token);
          localStorage.setItem(USER_KEY, JSON.stringify(session.user));
          this.userSignal.set(session.user);
        })
      );
  }

  /** Clears the stored session without navigating (used on 401 by the interceptor). */
  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
  }

  /** Clears the session and returns to the login screen. */
  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private static readStoredUser(): UserResponseDTO | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      // Both keys must be present, otherwise the session is half-restored.
      if (!raw || !localStorage.getItem(TOKEN_KEY)) return null;
      return JSON.parse(raw) as UserResponseDTO;
    } catch {
      return null;
    }
  }
}
