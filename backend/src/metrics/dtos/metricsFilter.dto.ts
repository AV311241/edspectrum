import { z } from 'zod';
import { MetricsStageCode, SasCategory, MetricsStatusBand, METRICS_STAGE_CODES } from '../constants/metrics.constants';

/**
 * Request filters shared by every metrics endpoint.
 *
 * The Angular dashboard header sends `school` and `className` as *strings* using
 * the sentinel values `__ALL_SCHOOLS__` / `__ALL_CLASSES__` (see
 * `frontend/src/app/core/models/dashboard.model.ts`). The API instead accepts
 * numeric primary keys, because a school can legitimately be named "All Schools"
 * and a name-based selector would then be ambiguous. The frontend maps its
 * sentinel to "omit the query parameter".
 */
export interface MetricsFilterQuery {
  /** e.g. "2026-2027". Omit to span every academic year on record. */
  academicYear?: string;
  /** ISO-ish period start, `YYYY-MM-DD`. */
  fromDate?: string;
  /** ISO-ish period end, `YYYY-MM-DD`. */
  toDate?: string;
  schoolId?: number;
  classId?: number;
  /**
   * Restrict to a single reporting month (1-12). Used for the month-over-month
   * comparisons, which always pair this with the *previous* month.
   */
  month?: number;
  year?: number;
}

export const metricsFilterQuerySchema = z
  .object({
    academicYear: z.string().max(20).optional(),
    fromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'fromDate must be formatted YYYY-MM-DD')
      .optional(),
    toDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'toDate must be formatted YYYY-MM-DD')
      .optional(),
    schoolId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
  })
  .refine(
    (v) => !v.fromDate || !v.toDate || v.fromDate <= v.toDate,
    { message: 'fromDate must be on or before toDate', path: ['fromDate'] }
  )
  .refine((v) => !(v.month && !v.year), {
    message: 'year is required when month is supplied',
    path: ['year'],
  });

/**
 * Every response embeds the resolved filter window so a client can prove which
 * period the figures describe - essential when a dashboard caches sections
 * independently and the user changes a filter mid-session.
 */
export interface MetricsFilterEchoDTO {
  academicYear: string | null;
  fromDate: string;
  toDate: string;
  schoolId: number | null;
  classId: number | null;
  month: number | null;
  year: number | null;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// 1. TOP CORE KPIs
// ---------------------------------------------------------------------------

export type KpiTrendDirection = 'UP' | 'DOWN' | 'FLAT';

export interface KpiDeltaDTO {
  /** Absolute movement against the comparison period, in the metric's own unit. */
  value: number;
  /** Percentage movement, where the comparison base is non-zero. `null` when undefined. */
  percent: number | null;
  /** Signed comparison label, e.g. "vs last month" / "vs last year". */
  comparisonLabel: string;
  direction: KpiTrendDirection;
}

export interface KpiMetricDTO {
  /** Stable machine id, e.g. `students-enrolled`. */
  id: string;
  title: string;
  /**
   * Numeric value. Kept numeric (not a pre-formatted string) so the card can apply
   * its own locale/precision rules; the Angular `KpiMetric.value` union already
   * accepts a number, and `formatTrend` / `unit` cover the presentation.
   */
  value: number;
  unit: string;
  subtext: string;
  delta: KpiDeltaDTO;
  isPositive: boolean;
  icon: string;
  /** Backwards-compatible pre-formatted trend string, e.g. "+8% vs last year". */
  trend: string;
}

export const kpiTrendDirections = ['UP', 'DOWN', 'FLAT'] as const;
export const metricsStatusBands = Object.values(MetricsStatusBand);
export const sasCategories = Object.values(SasCategory);
export const stageCodes: MetricsStageCode[] = [...METRICS_STAGE_CODES];
