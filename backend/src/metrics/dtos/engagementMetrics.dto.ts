import { KpiDeltaDTO } from './metricsFilter.dto';

/**
 * Aspect 6, card 1 - class participation rate.
 *
 * Denominator is the in-scope enrolled roll; numerator is distinct students with
 * at least one COMPLETED `CLASS_PARTICIPATION` activity in the period.
 */
export interface ClassParticipationDTO {
  participatingStudents: number;
  enrolledStudents: number;
  participationRatePercent: number;
  delta: KpiDeltaDTO;
  /** Participation rate per class section, powers the equity score. */
  byClass: ClassParticipationRowDTO[];
}

export interface ClassParticipationRowDTO {
  classSectionId: number;
  className: string;
  schoolName: string;
  participatingStudents: number;
  enrolledStudents: number;
  participationRatePercent: number;
}

/** Aspect 6, card 2 - AI/IVRS + practice active students. */
export interface ActiveStudentsDTO {
  activeStudents: number;
  enrolledStudents: number;
  activeRatePercent: number;
  delta: KpiDeltaDTO;
  /** Split of the active cohort by activity type, so the UI can label the sources. */
  byActivityType: ActivityTypeBreakdownDTO[];
  /** Daily distinct-active counts across the period, for the sparkline. */
  sparkline: number[];
}

export interface ActivityTypeBreakdownDTO {
  activityType: string;
  activeStudents: number;
  /** Share of the *active* cohort, 0-100. */
  percentOfActive: number;
}

/** Aspect 6, card 3 - parents reached. */
export interface ParentEngagementDTO {
  parentsReached: number;
  previousMonthParentsReached: number;
  /** Month-over-month change, as a percentage of the previous month. */
  momPercentChange: number;
  delta: KpiDeltaDTO;
  byChannel: ParentChannelBreakdownDTO[];
  sparkline: number[];
}

export interface ParentChannelBreakdownDTO {
  channel: string;
  count: number;
  percent: number;
}

/** Aspect 6, card 4 - home visits. */
export interface HomeVisitsDTO {
  completedVisits: number;
  previousMonthCompletedVisits: number;
  /** Students reached in the period, summed across completed visits. */
  studentsReached: number;
  previousMonthStudentsReached: number;
  /** `studentsReached` movement against the previous month. */
  studentsReachedDelta: number;
  delta: KpiDeltaDTO;
  sparkline: number[];
}

/**
 * Aspect 6 payload - `GET /metrics/engagement`.
 *
 * Also carries the seven-point sparkline arrays the Angular
 * `EngagementMetricItem.sparkline` component expects, so the cards can be driven
 * directly from the API.
 */
export interface EngagementMetricsDTO {
  classParticipation: ClassParticipationDTO;
  activeStudents: ActiveStudentsDTO;
  parentEngagement: ParentEngagementDTO;
  homeVisits: HomeVisitsDTO;
  /** Composite of the four cards, 0-100. */
  overallEngagementScore: number;
}
