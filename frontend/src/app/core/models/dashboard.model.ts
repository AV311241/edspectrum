export interface FilterOptions {
  academicYear: string;
  month: string;
  school: string;
  className: string;
}

export interface KpiMetric {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  trend: string;
  isPositive: boolean;
  icon: string;
  badgeBg: string;
  badgeIconColor: string;
}

export interface LearningProgressItem {
  domain: string;
  baseline: number;
  current: number;
}

export interface StageDistributionItem {
  stage: string;
  percentage: number;
}

export interface OverallProgressSummary {
  baseline: number;
  current: number;
  increase: number;
}

export interface SchoolPerformanceItem {
  id: string;
  school: string;
  students: number;
  attendance: number;
  learningGain: number;
  objectives: number;
  meStatus: 'On Track' | 'Watch' | 'Needs Attention';
}

export interface NeedsAttentionItem {
  id: string;
  title: string;
  subtitle: string;
}

export interface SasDistributionItem {
  category: string;
  percentage: number;
  color: string;
}

export interface ObjectiveProgressData {
  planned: number;
  completed: number;
  inProgress: number;
  upcoming: number;
}

export interface EngagementMetricItem {
  id: string;
  title: string;
  value: string | number;
  subtitle: string;
  trend: string;
  isPositive: boolean;
  icon: string;
  sparkline: number[];
}

export interface TeachingStatusCounts {
  planned: number;
  completed: number;
  inProgress: number;
  upcoming: number;
}

export interface TeachingMatrixRow {
  className: string;
  modules: boolean[];
  coveragePercent: number;
}

export interface FinanceSummaryData {
  annualBudget: number;
  spentTillAug: number;
  balance: number;
  categories: { name: string; percentage: number }[];
  monthlyTrend: { month: string; amount: number }[];
}

export interface DashboardData {
  kpiMetrics: KpiMetric[];
  learningProgress: LearningProgressItem[];
  stageDistribution: StageDistributionItem[];
  overallProgress: OverallProgressSummary;
  domainProgress: LearningProgressItem[];
  schoolPerformance: SchoolPerformanceItem[];
  needsAttention: NeedsAttentionItem[];
  stageMovement: StageDistributionItem[];
  sasDistribution: SasDistributionItem[];
  objectiveProgress: ObjectiveProgressData;
  engagementMetrics: EngagementMetricItem[];
  teachingCounts: TeachingStatusCounts;
  teachingMatrix: TeachingMatrixRow[];
  financeData: FinanceSummaryData;
}
