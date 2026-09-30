import { MetricsStageCode, SasCategory } from '../constants/metrics.constants';

/** One domain's baseline vs current attainment, as a percentage. */
export interface DomainProgressDTO {
  /** Human domain name, e.g. "Speaking". */
  domain: string;
  /** Mean stage converted to a 0-100 scale (S1=20 … S5=100). */
  baseline: number;
  current: number;
  /** `current - baseline`, in percentage points. */
  gain: number;
  /** Number of students with a usable baseline row; 0 means the domain is unreported. */
  baselineStudents: number;
  currentStudents: number;
}

export interface OverallProgressSummaryDTO {
  baseline: number;
  current: number;
  /** `current - baseline` in percentage points - the dashboard's "+12%" tile. */
  increase: number;
  baselineStudents: number;
  currentStudents: number;
}

export interface StageDistributionItemDTO {
  stage: string;
  stageCode: MetricsStageCode;
  studentCount: number;
  percentage: number;
}

/**
 * Stage *movement* - the same distribution at baseline versus current, plus the
 * per-stage movement, so the UI can render a slope or a delta bar.
 */
export interface StageMovementItemDTO {
  stage: string;
  stageCode: MetricsStageCode;
  /** Distribution at the student's baseline assessment. */
  baselinePercentage: number;
  /** Distribution at the student's most recent assessment. */
  currentPercentage: number;
  /** `current - baseline`, in percentage points. Positive = cohort moved up. */
  deltaPoints: number;
}

export interface SasDistributionItemDTO {
  category: SasCategory;
  percentage: number;
  studentCount: number;
  /** Akshara palette colour for the donut segment. */
  color: string;
}

/**
 * Aspect 2 - `GET /metrics/learning-outcomes`.
 *
 * `domainProgress` covers every one of the seven baseline domains
 * (Vocabulary, Grammar, Phrase_Sentence, Listening, Speaking, Reading, Writing).
 * The four "core skill" domains the chart card renders - Listening, Speaking,
 * Reading, Writing - are additionally pre-isolated in `learningProgress` so the
 * card does not have to filter client-side.
 */
export interface LearningProgressDTO {
  overallProgress: OverallProgressSummaryDTO;
  /** The four core-skill domains, in display order. */
  learningProgress: DomainProgressDTO[];
  /** All seven baseline domains, in canonical order. */
  domainProgress: DomainProgressDTO[];
  /** Stage distribution of students at their *current* stage. */
  stageDistribution: StageDistributionItemDTO[];
  /** Baseline vs current stage distribution, with movement. */
  stageMovement: StageMovementItemDTO[];
  /** SAS (Student Achievement Status) split: Support vs Core vs Stretch. */
  sasDistribution: SasDistributionItemDTO[];
  /** Students with at least one usable stage in either period. */
  studentsAssessed: number;
}
