import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

/**
 * Every feature route is code-split with `loadComponent` so the initial
 * bundle only carries the app shell (layout, auth, router) plus the guards.
 *
 * This matters most for the two Excel-capable routes: `xlsx` (~430 kB
 * minified, non-tree-shakable) is loaded on demand by their chunks, never
 * up front. `LoginComponent` is lazy too - it is the only eager consumer of
 * `FormsModule`, so this also keeps `@angular/forms` out of the first paint.
 */
export const routes: Routes = [
  // Public: the only screen reachable without a token.
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((module) => module.LoginComponent),
  },

  // Everything below requires a valid session (backend enforces the same rule).
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (module) => module.DashboardComponent
      ),
  },
  {
    path: 'baseline-assessment',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/baseline-assessment/baseline-assessment.component').then(
        (module) => module.BaselineAssessmentComponent
      ),
  },
  {
    path: 'data-upload',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/data-upload/data-upload-page.component').then(
        (module) => module.DataUploadPageComponent
      ),
  },
  {
    path: 'schools',
    canActivate: [authGuard],
    loadComponent: () => import('./features/schools/schools-page.component').then((module) => module.SchoolsPageComponent),
  },
  {
    // Admin control tower. Lazy-loaded so its CRUD components only reach the
    // bundle when an administrator actually opens /admin.
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/admin-dashboard.component').then(
        (module) => module.AdminDashboardComponent
      ),
  },
  {
    // Admin-only user management (create / edit / status / delete accounts).
    // `adminGuard` redirects non-admins; the backend enforces the same rule.
    path: 'users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/users/users-page.component').then(
        (module) => module.UsersPageComponent
      ),
  },
  { path: '**', redirectTo: '' }
];
