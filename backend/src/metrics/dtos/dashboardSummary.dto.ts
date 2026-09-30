import { KpiMetricDTO, MetricsFilterEchoDTO } from './metricsFilter.dto';
import { LearningProgressDTO } from './learningProgress.dto';
import { SchoolPerformanceDTO } from './schoolPerformance.dto';
import { NeedsAttentionDTO } from './needsAttention.dto';
import { EngagementMetricsDTO } from './engagementMetrics.dto';
import { ResourceFinanceDTO } from './resourceFinance.dto';
import { TeachingObjectivesDTO } from './teachingObjectives.dto';

/**
 * Unified payload for `GET /metrics/dashboard`.
 *
 * Deliberately an *interface composition* rather than a type intersection so
 * that tsoa can resolve every referenced model and emit a correct OpenAPI schema
 * (tsoa cannot introspect mapped/conditional types).
 */
export interface DashboardSummaryResponseDTO {
  /** The filter window the figures below were computed over. */
  filter: MetricsFilterEchoDTO;

  /** Aspect 1 - the five KPI cards. */
  kpiMetrics: KpiMetricDTO[];

  /** Aspect 2 - learning progress and outcomes. */
  learningOutcomes: LearningProgressDTO;

  /** Aspect 3 - the school performance matrix. */
  schoolPerformance: SchoolPerformanceDTO[];

  /** Aspect 4 - dynamically generated alerts. */
  needsAttention: NeedsAttentionDTO[];

  /** Aspect 5 - teaching objectives and the class x module coverage matrix. */
  teachingObjectives: TeachingObjectivesDTO;

  /** Aspect 6 - stakeholder engagement. */
  engagement: EngagementMetricsDTO;

  /** Aspect 7 - budget, category split and monthly spend trend. */
  resources: ResourceFinanceDTO;

  /** Aspects 1-3, recomputed across the whole scope rather than per school. */
  derivedInsights: DerivedInsightsDTO;
}

/**
 * Three additional calculated metrics that are not part of the seven core
 * dashboard aspects but are the natural by-product of them.
 */
export interface DerivedInsightsDTO {
  /**
   * Derived metric #1 - composite Risk Level Score for the whole scope, 0-100
   * where higher is healthier. Weighted blend of attendance, objective coverage,
   * learning gain and assessment data completeness.
   */
  overallRiskScore: number;
  overallRiskBand: string;

  /**
   * Derived metric #2 - Class Equity Score, 0-100 where higher is more equitable.
   * Computed as 100 minus the Gini coefficient of the per-class learning spread, so
   * one outlier class measurably drags the programme down.
   */
  classEquityScore: number;
  /** The classes furthest from the programme mean, for the "equity" drill-down. */
  equityOutliers: EquityOutlierDTO[];

  /**
   * Derived metric #3 - month-over-month movement of the headline learning gain,
   * in percentage points, plus an explicit direction so the UI does not have to
   * infer it from the sign of a string.
   */
  learningGainMomDeltaPoints: number;
  learningGainMomDirection: string;

  /** Proportion of in-scope students with at least one assessment, as a data-quality signal. */
  dataCompletenessPercent: number;
}

export interface EquityOutlierDTO {
  classId: number;
  className: string;
  schoolName: string;
  /** The class's mean learning progress %, for comparison against the programme mean. */
  classProgressPercent: number;
  /** Signed gap in percentage points versus the programme mean. */
  gapPoints: number;
}
