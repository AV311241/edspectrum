import { Routes } from '@angular/router';
import { LayoutShellComponent } from './layout/layout-shell/layout-shell.component';
import { authGuard, publicOnlyGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

/**
 * Route map: one public page, everything else behind the dashboard shell.
 *
 * - `/login` renders STANDALONE (no sidebar, no Akshara dashboard header, no
 *   dashboard footer). It is deliberately NOT a child of the `shell` branch —
 *   that is what guarantees login owns the full viewport until sign-in.
 * - Every other page renders INSIDE `LayoutShellComponent` via the `shell`
 *   branch below, which carries the sidebar + header + footer chrome.
 *
 * Code-splitting is unchanged: every feature still lazy-loads with
 * `loadComponent`, so the initial bundle only carries the shell (layout,
 * auth, router) plus the guards. This matters most for the Excel-capable
 * routes — `xlsx` (~430 kB minified, non-tree-shakable) loads on demand.
 */
export const routes: Routes = [
  // Public: the only screen reachable without a token.
  // `publicOnlyGuard` bounces signed-in sessions to `/` so the login page
  // never renders beside (or instead of) the dashboard shell.
  {
    path: 'login',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./features/login/login.component').then((module) => module.LoginComponent),
  },

  // Authenticated shell: sidebar + header + footer around every child below.
  // The backend enforces the same session rule on each API.
  {
    path: '',
    component: LayoutShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (module) => module.DashboardComponent
          ),
      },
      {
        path: 'baseline-assessment',
        loadComponent: () =>
          import('./features/baseline-assessment/baseline-assessment.component').then(
            (module) => module.BaselineAssessmentComponent
          ),
      },
      {
        path: 'data-upload',
        loadComponent: () =>
          import('./features/data-upload/data-upload-page.component').then(
            (module) => module.DataUploadPageComponent
          ),
      },
      {
        path: 'schools',
        loadComponent: () => import('./features/schools/schools-page.component').then((module) => module.SchoolsPageComponent),
      },
      {
        // Admin control tower. Lazy-loaded so its CRUD components only reach the
        // bundle when an administrator actually opens /admin.
        path: 'admin',
        loadComponent: () =>
          import('./features/admin/admin-dashboard.component').then(
            (module) => module.AdminDashboardComponent
          ),
      },
      {
        // Admin-only user management (create / edit / status / delete accounts).
        // `adminGuard` redirects non-admins; the backend enforces the same rule.
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/users/users-page.component').then(
            (module) => module.UsersPageComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' }
];
