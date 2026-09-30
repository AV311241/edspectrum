import { AlertSeverity, NeedsAttentionCategory } from '../constants/metrics.constants';

/**
 * Aspect 4 - one dynamically generated alert.
 *
 * These are never persisted. Every call re-derives them from the same figures that
 * feed the KPI tiles, which is what guarantees the alert list can never contradict
 * the numbers shown beside it.
 *
 * `title` / `subtitle` additionally reproduce the Angular `NeedsAttentionItem`
 * shape so the existing list component renders without an adapter.
 */
export interface NeedsAttentionDTO {
  id: string;
  /** Frontend-compatible headline, e.g. "Attendance (Shirdi Sai Baba School)". */
  title: string;
  /** Frontend-compatible supporting line, e.g. "Irregular in some classes". */
  subtitle: string;

  /** e.g. "Speaking Practice", "Attendance", "Parental Engagement". */
  category: NeedsAttentionCategory;
  severity: AlertSeverity;

  schoolId: number | null;
  schoolName: string;
  classSectionId: number | null;
  className: string | null;

  /** Human-readable explanation of what is wrong. */
  issueDescription: string;
  /** What a human should actually do about it. */
  actionNeeded: string;

  /** The measured figure that triggered the alert. */
  observedValue: number;
  /** The threshold it was compared against. */
  thresholdValue: number;
  unit: string;

  /** Percentage points below the programme average, where that is what triggered it. */
  gapPoints: number | null;
}

/** Aspect 4 payload - `GET /metrics/needs-attention`. */
export interface NeedsAttentionResponseDTO {
  alerts: NeedsAttentionDTO[];
  totalAlerts: number;
  /** Alert counts by severity, for the summary chips above the list. */
  bySeverity: AlertSeverityCountsDTO;
  /** Number of alerts suppressed by the `METRICS_MAX_ALERTS` cap. */
  truncatedCount: number;
}

export interface AlertSeverityCountsDTO {
  critical: number;
  warning: number;
  info: number;
}
