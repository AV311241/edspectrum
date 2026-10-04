import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const LOGIN_URL_SEGMENT = '/auth/login';

/**
 * Attaches the JWT to every request and converts expired sessions into a
 * redirect to `/login`.
 *
 * The login call itself never gets a token attached and never triggers the
 * 401 handling - a wrong password must surface as a form error, not a
 * navigation loop.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isLoginCall = req.url.includes(LOGIN_URL_SEGMENT);
  const token = auth.getToken();

  const request =
    token && !isLoginCall
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isLoginCall) {
        auth.clearSession();
        if (!router.url.startsWith('/login')) {
          void router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
