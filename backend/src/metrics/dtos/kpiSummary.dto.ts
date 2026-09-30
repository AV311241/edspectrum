import { KpiMetricDTO, KpiDeltaDTO, MetricsFilterEchoDTO } from './metricsFilter.dto';
import { ObjectiveProgressDTO } from './teachingObjectives.dto';
import { ActiveStudentsDTO } from './engagementMetrics.dto';

/**
 * The five headline cards, itemised.
 *
 * Each interface below also re-exposes `id`, `value`, `unit`, `subtext` and
 * `delta` in the same shape the Angular `KpiMetric` card expects, so a single
 * serialised object can drive either the typed card or the raw KPI ribbon.
 */
export interface StudentsEnrolledDTO {
  id: string;
  value: number;
  unit: string;
  subtext: string;
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  transferredStudents: number;
  /** Growth against the same period one academic year earlier. */
  delta: KpiDeltaDTO;
  schoolsCount: number;
  classesCount: number;
}

export interface AttendanceRateDTO {
  id: string;
  value: number;
  unit: string;
  subtext: string;
  attendancePercent: number;
  /** Weighted present-days over working days across the whole scope. */
  weightedPresentDays: number;
  workingDays: number;
  cancelledSessions: number;
  unmarkedRecords: number;
  /** Month-over-month movement in percentage points. */
  delta: KpiDeltaDTO;
}

export interface LearningGainDTO {
  id: string;
  value: number;
  unit: string;
  subtext: string;
  /** Mean attainment gain in percentage points across assessed students. */
  gainPoints: number;
  baselinePercent: number;
  currentPercent: number;
  studentsWithBothAssessments: number;
  /** Strongest and weakest domains by gain, for the "what moved" callout. */
  strongestDomain: string | null;
  weakestDomain: string | null;
  delta: KpiDeltaDTO;
}

export interface ObjectivesCoveredDTO {
  id: string;
  value: number;
  unit: string;
  subtext: string;
  /** Per-objective completion, as shown on the KPI card. */
  completionPercent: number;
  /** Per-cell class x module coverage, as shown on the matrix summary. */
  coveragePercent: number;
  totals: ObjectiveProgressDTO;
  delta: KpiDeltaDTO;
}

export interface ActiveStudentsKpiDTO {
  id: string;
  value: number;
  unit: string;
  subtext: string;
  activeRatePercent: number;
  activeStudents: number;
  enrolledStudents: number;
  delta: KpiDeltaDTO;
  detail: ActiveStudentsDTO;
}

/** Aspect 1 payload - `GET /metrics/kpis`. */
export interface KpiSummaryResponseDTO {
  filter: MetricsFilterEchoDTO;
  studentsEnrolled: StudentsEnrolledDTO;
  attendanceRate: AttendanceRateDTO;
  averageLearningGain: LearningGainDTO;
  objectivesCovered: ObjectivesCoveredDTO;
  activeStudents: ActiveStudentsKpiDTO;
  /** The same five figures flattened for the KPI ribbon component. */
  kpiMetrics: KpiMetricDTO[];
}
