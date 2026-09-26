import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { BaselineAssessmentComponent } from './features/baseline-assessment/baseline-assessment.component';
import { DataUploadPageComponent } from './features/data-upload/data-upload-page.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'baseline-assessment', component: BaselineAssessmentComponent },
  { path: 'data-upload', component: DataUploadPageComponent },
  {
    path: 'schools',
    loadComponent: () => import('./features/schools/schools-page.component').then((module) => module.SchoolsPageComponent),
  },
  { path: '**', redirectTo: '' }
];
