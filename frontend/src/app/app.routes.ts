import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { BaselineAssessmentComponent } from './features/baseline-assessment/baseline-assessment.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'baseline-assessment', component: BaselineAssessmentComponent },
  { path: '**', redirectTo: '' }
];
