import { Component } from '@angular/core';
import { KpiRibbonComponent } from './components/kpi-ribbon/kpi-ribbon.component';
import { LearningProgressChartComponent } from './components/learning-progress-chart/learning-progress-chart.component';
import { StageDistributionChartComponent } from './components/stage-distribution-chart/stage-distribution-chart.component';
import { OverallProgressSummaryComponent } from './components/overall-progress-summary/overall-progress-summary.component';
import { DomainProgressChartComponent } from './components/domain-progress-chart/domain-progress-chart.component';
import { SchoolPerformanceTableComponent } from './components/school-performance-table/school-performance-table.component';
import { NeedsAttentionListComponent } from './components/needs-attention-list/needs-attention-list.component';
import { StageMovementComponent } from './components/stage-movement/stage-movement.component';
import { SasDistributionChartComponent } from './components/sas-distribution-chart/sas-distribution-chart.component';
import { ObjectiveProgressSummaryComponent } from './components/objective-progress-summary/objective-progress-summary.component';
import { EngagementSectionComponent } from './components/engagement-section/engagement-section.component';
import { TeachingSectionComponent } from './components/teaching-section/teaching-section.component';
import { ResourcesFinanceSectionComponent } from './components/resources-finance-section/resources-finance-section.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    KpiRibbonComponent,
    LearningProgressChartComponent,
    StageDistributionChartComponent,
    OverallProgressSummaryComponent,
    DomainProgressChartComponent,
    SchoolPerformanceTableComponent,
    NeedsAttentionListComponent,
    StageMovementComponent,
    SasDistributionChartComponent,
    ObjectiveProgressSummaryComponent,
    EngagementSectionComponent,
    TeachingSectionComponent,
    ResourcesFinanceSectionComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {}
