import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Keeps anonymous visitors off every authenticated route.
 *
 * Applied route-by-route in `app.routes.ts` so `/login` itself stays public.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

/**
 * Keeps signed-in sessions off the public login page.
 *
 * Without this, a user with a stored token can navigate back to `/login` and
 * see a second sign-in form floating without the dashboard chrome — the page
 * looks "full screen but wrong". Redirecting to `/` keeps exactly one
 * authenticated surface: the dashboard shell.
 */
export const publicOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? router.createUrlTree(['/']) : true;
};
