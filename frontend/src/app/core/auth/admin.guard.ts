import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserResponseDTO } from '../models/api.models';

/**
 * Legacy numeric fallback for the ADMIN role id.
 *
 * The backend resolves admins by the stable `roleCode` now, but sessions that
 * were stored before `roleCode` existed only carry the numeric id - and on a
 * fresh database the seed creates the ADMIN role first, so it is id 1.
 */
const ADMIN_ROLE_ID_FALLBACK = 1;

/** Pure admin check shared by the route guard and the sidebar visibility. */
export function isAdminUser(user: UserResponseDTO | null): boolean {
  if (!user) return false;
  if (user.roleCode) return user.roleCode === 'ADMIN';
  return user.roleId === ADMIN_ROLE_ID_FALLBACK;
}

/**
 * Keeps non-administrators off admin-only routes (e.g. `/users`).
 *
 * Applied after `authGuard` so the session check still wins for anonymous
 * visitors - they land on `/login`, not on a 403 they cannot act on.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (isAdminUser(auth.user())) return true;
  return router.createUrlTree(['/']);
};