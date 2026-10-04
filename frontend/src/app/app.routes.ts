import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { BaselineAssessmentComponent } from './features/baseline-assessment/baseline-assessment.component';
import { DataUploadPageComponent } from './features/data-upload/data-upload-page.component';
import { LoginComponent } from './features/login/login.component';

export const routes: Routes = [
  // Public: the only screen reachable without a token.
  { path: 'login', component: LoginComponent },

  // Everything below requires a valid session (backend enforces the same rule).
  { path: '', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'baseline-assessment', component: BaselineAssessmentComponent, canActivate: [authGuard] },
  { path: 'data-upload', component: DataUploadPageComponent, canActivate: [authGuard] },
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
  { path: '**', redirectTo: '' }
];
