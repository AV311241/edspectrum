import { Injectable, signal, computed } from '@angular/core';
import {
  ALL_CLASSES_FILTER,
  ALL_SCHOOLS_FILTER,
  DashboardData,
  FilterOptions,
  KpiMetric,
  LearningProgressItem,
  StageDistributionItem,
  OverallProgressSummary,
  SchoolPerformanceItem,
  NeedsAttentionItem,
  SasDistributionItem,
  ObjectiveProgressData,
  EngagementMetricItem,
  TeachingStatusCounts,
  TeachingMatrixRow,
  FinanceSummaryData
} from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardDataService {
  readonly activeFilters = signal<FilterOptions>({
    academicYear: '2026 – 27',
    month: 'Aug 2026',
    school: ALL_SCHOOLS_FILTER,
    className: ALL_CLASSES_FILTER
  });

  /**
   * KPI icon containers use the spec's semantic palette: blue for enrollment,
   * emerald for attendance, purple for learning gain, amber for objectives.
   */
  readonly kpiMetrics = signal<KpiMetric[]>([
    {
      id: 'students-enrolled',
      title: 'Students Enrolled',
      value: 500,
      subtext: 'Students Enrolled',
      trend: '+8% vs last year',
      isPositive: true,
      icon: 'users',
      badgeBg: 'bg-blue-50',
      badgeIconColor: 'text-blue-600'
    },
    {
      id: 'attendance-rate',
      title: 'Attendance Rate',
      value: '81%',
      subtext: 'Attendance Rate',
      trend: '+7% vs last month',
      isPositive: true,
      icon: 'academic-cap',
      badgeBg: 'bg-emerald-50',
      badgeIconColor: 'text-emerald-600'
    },
    {
      id: 'learning-gain',
      title: 'Avg. Learning Gain',
      value: '+9',
      subtext: '(Assessment %)',
      trend: '+3 points',
      isPositive: true,
      icon: 'chart-bar',
      badgeBg: 'bg-purple-50',
      badgeIconColor: 'text-purple-600'
    },
    {
      id: 'objectives-covered',
      title: 'Objectives Covered',
      value: '62%',
      subtext: 'Objectives Covered',
      trend: '+12% vs last month',
      isPositive: true,
      icon: 'target',
      badgeBg: 'bg-amber-50',
      badgeIconColor: 'text-amber-600'
    },
    {
      id: 'active-students',
      title: 'Active Students',
      value: '64%',
      subtext: '(AI/IVRS + Practice)',
      trend: '+10% vs last month',
      isPositive: true,
      icon: 'user-voice',
      badgeBg: 'bg-brand-pink-soft',
      badgeIconColor: 'text-brand-pink'
    }
  ]);

  readonly learningProgress = signal<LearningProgressItem[]>([
    { domain: 'Listening', baseline: 44, current: 56 },
    { domain: 'Speaking', baseline: 39, current: 51 },
    { domain: 'Reading', baseline: 61, current: 69 },
    { domain: 'Writing', baseline: 43, current: 53 }
  ]);

  readonly stageDistribution = signal<StageDistributionItem[]>([
    { stage: 'Stage 1', percentage: 28 },
    { stage: 'Stage 2', percentage: 24 },
    { stage: 'Stage 3', percentage: 23 },
    { stage: 'Stage 4', percentage: 15 },
    { stage: 'Stage 5', percentage: 5 }
  ]);

  readonly overallProgress = signal<OverallProgressSummary>({
    baseline: 49,
    current: 61,
    increase: 12
  });

  readonly domainProgress = signal<LearningProgressItem[]>([
    { domain: 'Listening', baseline: 46, current: 56 },
    { domain: 'Speaking', baseline: 39, current: 51 },
    { domain: 'Reading', baseline: 61, current: 69 },
    { domain: 'Writing', baseline: 43, current: 53 },
    { domain: 'Vocabulary', baseline: 66, current: 66 },
    { domain: 'Grammar', baseline: 37, current: 48 }
  ]);

  readonly schoolPerformance = signal<SchoolPerformanceItem[]>([
    { id: '1', school: 'Navjyoti Public School', students: 112, attendance: 84, learningGain: 11, objectives: 68, meStatus: 'On Track' },
    { id: '2', school: 'RS Vidya School', students: 128, attendance: 78, learningGain: 9, objectives: 63, meStatus: 'On Track' },
    { id: '3', school: 'Tilpat Public School', students: 94, attendance: 86, learningGain: 12, objectives: 72, meStatus: 'Watch' },
    { id: '4', school: 'Shirdi Sai Baba School', students: 166, attendance: 76, learningGain: 8, objectives: 69, meStatus: 'On Track' }
  ]);

  readonly needsAttention = signal<NeedsAttentionItem[]>([
    { id: '1', title: 'Speaking practice (Tilpat)', subtitle: 'Lower participation' },
    { id: '2', title: 'Writing performance (Navjyoti)', subtitle: 'Needs additional support' },
    { id: '3', title: 'Parental engagement (RS Vidya)', subtitle: 'Follow-up pending' },
    { id: '4', title: 'Attendance (Shirdi)', subtitle: 'Irregular in some classes' }
  ]);

  readonly stageMovement = signal<StageDistributionItem[]>([
    { stage: 'Stage 1', percentage: 25 },
    { stage: 'Stage 2', percentage: 24 },
    { stage: 'Stage 3', percentage: 23 },
    { stage: 'Stage 4', percentage: 15 },
    { stage: 'Stage 5', percentage: 5 }
  ]);

  readonly sasDistribution = signal<SasDistributionItem[]>([
    { category: 'Support', percentage: 24, color: '#A8005B' },
    { category: 'Stretch', percentage: 25, color: '#F97316' },
    { category: 'Core', percentage: 51, color: '#10B981' }
  ]);

  readonly objectiveProgress = signal<ObjectiveProgressData>({
    planned: 12,
    completed: 7,
    inProgress: 2,
    upcoming: 3
  });

  readonly engagementMetrics = signal<EngagementMetricItem[]>([
    {
      id: 'e1',
      title: 'Class Participation',
      value: '81%',
      subtitle: '',
      trend: '↑ 7% vs last month',
      isPositive: true,
      icon: 'users-group',
      sparkline: [40, 45, 55, 60, 68, 75, 81]
    },
    {
      id: 'e2',
      title: 'AI/IVRS Active Students',
      value: '64%',
      subtitle: '',
      trend: '↑ 10% vs last month',
      isPositive: true,
      icon: 'headphones',
      sparkline: [30, 35, 42, 50, 55, 60, 64]
    },
    {
      id: 'e3',
      title: 'Parent Engagement',
      value: 221,
      subtitle: '(Parents Reached)',
      trend: '↑ 44% vs last month',
      isPositive: true,
      icon: 'family',
      sparkline: [100, 120, 140, 160, 180, 200, 221]
    },
    {
      id: 'e4',
      title: 'Home Visits',
      value: 147,
      subtitle: 'Completed',
      trend: '↑ 58 students reached',
      isPositive: true,
      icon: 'home',
      sparkline: [50, 70, 85, 100, 120, 135, 147]
    }
  ]);

  readonly teachingCounts = signal<TeachingStatusCounts>({
    planned: 12,
    completed: 7,
    inProgress: 2,
    upcoming: 3
  });

  /**
   * One entry per module column. The leading `true`s of the previous model
   * become `covered`; the module that was hard-coded amber (index 6, the
   * current teaching month) is `in-progress`; the rest are `not-started`.
   */
  readonly teachingMatrix = signal<TeachingMatrixRow[]>([
    { className: '6A', modules: ['covered', 'covered', 'covered', 'covered', 'covered', 'covered', 'in-progress', 'not-started', 'not-started', 'not-started'], coveragePercent: 64 },
    { className: '7A', modules: ['covered', 'covered', 'covered', 'covered', 'covered', 'covered', 'covered', 'not-started', 'not-started', 'not-started'], coveragePercent: 72 },
    { className: '8A', modules: ['covered', 'covered', 'covered', 'covered', 'covered', 'covered', 'in-progress', 'not-started', 'not-started', 'not-started'], coveragePercent: 68 },
    { className: '9A', modules: ['covered', 'covered', 'covered', 'covered', 'covered', 'covered', 'covered', 'covered', 'not-started', 'not-started'], coveragePercent: 76 },
    { className: '10A', modules: ['covered', 'covered', 'covered', 'covered', 'covered', 'in-progress', 'not-started', 'not-started', 'not-started', 'not-started'], coveragePercent: 59 }
  ]);

  readonly financeData = signal<FinanceSummaryData>({
    annualBudget: 4500000,
    spentTillAug: 1820000,
    balance: 2680000,
    categories: [
      { name: 'Human Resources', percentage: 32 },
      { name: 'Travel', percentage: 18 },
      { name: 'Teaching Materials', percentage: 16 },
      { name: 'Technology (AI/IVRS)', percentage: 14 },
      { name: 'Events & Showcase', percentage: 12 },
      { name: 'Others', percentage: 8 }
    ],
    monthlyTrend: [
      { month: 'Apr', amount: 10 },
      { month: 'May', amount: 18 },
      { month: 'Jun', amount: 22 },
      { month: 'Jul', amount: 28 },
      { month: 'Aug', amount: 30 },
      { month: 'Sep', amount: 27 }
    ]
  });

  readonly dashboardState = computed<DashboardData>(() => ({
    kpiMetrics: this.kpiMetrics(),
    learningProgress: this.learningProgress(),
    stageDistribution: this.stageDistribution(),
    overallProgress: this.overallProgress(),
    domainProgress: this.domainProgress(),
    schoolPerformance: this.schoolPerformance(),
    needsAttention: this.needsAttention(),
    stageMovement: this.stageMovement(),
    sasDistribution: this.sasDistribution(),
    objectiveProgress: this.objectiveProgress(),
    engagementMetrics: this.engagementMetrics(),
    teachingCounts: this.teachingCounts(),
    teachingMatrix: this.teachingMatrix(),
    financeData: this.financeData()
  }));

  updateFilter(key: keyof FilterOptions, value: string) {
    this.activeFilters.update(prev => ({
      ...prev,
      [key]: value
    }));
  }
}
