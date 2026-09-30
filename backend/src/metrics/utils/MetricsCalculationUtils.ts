/**
 * Metrics calculation utilities - PURE FUNCTIONS ONLY.
 *
 * Nothing in this file performs I/O, touches Prisma, reads the clock implicitly or
 * mutates its arguments. That is what allows the whole metrics engine to be
 * unit-tested with plain object fixtures and reused from a future job/queue worker
 * without dragging the HTTP stack along.
 *
 * Every function is total: a zero/empty input returns a defined, non-NaN value
 * rather than propagating a division by zero. The existing
 * `attendanceCalculator.utils.ts` established the same `workingDays === 0 ? 100`
 * convention, and these helpers follow it for consistency.
 */

import { toIsoDateString } from '../../utils/date.utils';
import {
  ATTENDANCE_PRESENT_WEIGHT,
  AttendanceStatusValue,
} from '../../constants/attendance.constants';
import { AttendanceRow } from '../models/metrics.models';
import type { KpiDeltaDTO } from '../dtos/metricsFilter.dto';
import {
  METRICS_MOM_THRESHOLDS,
  METRICS_RISK_SCORE_WEIGHTS,
  METRICS_STAGE_CODES,
  METRICS_STAGE_LABELS,
  MetricsStageCode,
  SAS_CATEGORY_COLORS,
  SAS_MEAN_STAGE_THRESHOLDS,
  SasCategory,
  MetricsModuleStatus,
} from '../constants/metrics.constants';

// ---------------------------------------------------------------------------
// BASIC ARITHMETIC
// ---------------------------------------------------------------------------

/** Round to 2dp without the float noise of `toFixed` (e.g. 1.005 -> 1.01). */
export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Clamp into an inclusive range. Guards every percentage this module emits. */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Safe percentage. Returns 0 rather than NaN/Infinity when the base is zero, so a
 * scope with no enrolled students reports "0%", not a broken payload.
 */
export function percentage(numerator: number, denominator: number, decimals = 2): number {
  if (denominator === 0 || !Number.isFinite(denominator) || !Number.isFinite(numerator)) return 0;
  return round((numerator / denominator) * 100, decimals);
}

export function average(values: number[]): number {
  const usable = values.filter((v) => Number.isFinite(v));
  if (usable.length === 0) return 0;
  return round(usable.reduce((sum, v) => sum + v, 0) / usable.length, 2);
}

export function sum(values: number[]): number {
  return round(values.filter((v) => Number.isFinite(v)).reduce((acc, v) => acc + v, 0), 2);
}

/** Count of distinct values in a list, ignoring null/undefined. */
export function distinctCount(values: Array<number | null | undefined>): number {
  const set = new Set<number>();
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) set.add(v);
  }
  return set.size;
}

// ---------------------------------------------------------------------------
// GROWTH / MoM DELTAS
// ---------------------------------------------------------------------------

export interface DeltaResult {
  value: number;
  percent: number | null;
  direction: 'UP' | 'DOWN' | 'FLAT';
}

/**
 * Growth between two absolute counts.
 *
 * `percent` is null when the previous value is 0 - a jump from 0 to 40 is
 * genuinely undefined as a *percentage* ("infinite growth" is a misleading way to
 * present a cold start), so the caller gets `null` and renders "new" instead.
 */
export function growthDelta(current: number, previous: number, decimals = 2): DeltaResult {
  const value = round(current - previous, decimals);
  const percent = previous === 0 ? null : round(((current - previous) / previous) * 100, decimals);
  return { value, percent, direction: directionOf(value) };
}

/**
 * Movement between two percentages, expressed in percentage *points*.
 *
 * This is deliberately not `growthDelta`: for a rate that already lives on a
 * 0-100 scale, "attendance rose 3 points" is the honest statement, whereas
 * "attendance rose 3.7%" would silently mean "rose to 103.7% of its old value".
 */
export function pointDelta(currentPercent: number, previousPercent: number): DeltaResult {
  const value = round(currentPercent - previousPercent, 2);
  return { value, percent: null, direction: directionOf(value) };
}

export function directionOf(value: number): 'UP' | 'DOWN' | 'FLAT' {
  if (!Number.isFinite(value) || Math.abs(value) < METRICS_MOM_THRESHOLDS.improvingAtOrAbove) {
    return 'FLAT';
  }
  return value > 0 ? 'UP' : 'DOWN';
}

/**
 * Wrap a `DeltaResult` into the transport `KpiDeltaDTO`, attaching the human
 * comparison label the UI renders in the card's trend line.
 *
 * Every MoM / YoY figure in the engagement DTOs flows through here, so the
 * `comparisonLabel` can never be forgotten on one branch of one card.
 */
export function toKpiDelta(delta: DeltaResult, comparisonLabel: string): KpiDeltaDTO {
  return {
    value: delta.value,
    percent: delta.percent,
    comparisonLabel,
    direction: delta.direction,
  };
}

/** Human-readable signed trend string, e.g. "+8% vs last year" / "-2.1 pts vs last month". */
export function formatTrend(
  delta: DeltaResult,
  comparisonLabel: string,
  style: 'PERCENT' | 'POINTS' = 'PERCENT'
): string {
  if (style === 'POINTS') {
    const sign = delta.value > 0 ? '+' : '';
    return `${sign}${delta.value} pts ${comparisonLabel}`;
  }
  if (delta.percent === null) return `new ${comparisonLabel}`;
  const sign = delta.percent > 0 ? '+' : '';
  return `${sign}${delta.percent}% ${comparisonLabel}`;
}

// ---------------------------------------------------------------------------
// STAGE NORMALISATION
// ---------------------------------------------------------------------------

/** Normalise the many spellings of a stage code to the canonical `S1`..`S5`. */
export function normaliseStage(raw: string | null | undefined): MetricsStageCode | null {
  if (!raw) return null;
  const token = raw.trim().toUpperCase();
  if ((METRICS_STAGE_CODES as readonly string[]).includes(token)) {
    return token as MetricsStageCode;
  }
  // Accept "STAGE 3", "Stage3", "3" from legacy spreadsheets and overrides.
  const numeric = token.replace(/^STAGE\s*/, '');
  if (/^[1-5]$/.test(numeric)) return `S${numeric}` as MetricsStageCode;
  return null;
}

/** Convert a stage code to a 0-100 attainment percentage (S1=20 … S5=100). */
export function stageToPercent(stage: MetricsStageCode): number {
  return Number(stage.slice(1)) * 20;
}

export function stageLabel(stage: MetricsStageCode): string {
  return METRICS_STAGE_LABELS[stage];
}

/**
 * Assign an SAS band from a student's mean stage.
 *
 * `Review` and `AB` domain results are excluded upstream, so `meanStage` is always
 * in 1..5 here. See the SAS note in `metrics.constants.ts` for why this is a
 * measurement and not a planning band.
 */
export function classifySas(meanStage: number): SasCategory {
  if (!Number.isFinite(meanStage)) return SasCategory.CORE;
  if (meanStage < SAS_MEAN_STAGE_THRESHOLDS.supportBelow) return SasCategory.SUPPORT;
  if (meanStage >= SAS_MEAN_STAGE_THRESHOLDS.stretchAtOrAbove) return SasCategory.STRETCH;
  return SasCategory.CORE;
}

export function sasColor(category: SasCategory): string {
  return SAS_CATEGORY_COLORS[category];
}

/** Map a Prisma `ObjectiveModuleStatus` onto the dashboard's three-state union. */
export function toModuleStatus(status: string): MetricsModuleStatus {
  switch (status) {
    case 'COVERED':
      return 'covered';
    case 'IN_PROGRESS':
      return 'in-progress';
    default:
      return 'not-started';
  }
}

// ---------------------------------------------------------------------------
// ATTENDANCE
// ---------------------------------------------------------------------------

export interface AttendanceAggregate {
  weightedPresentDays: number;
  /** Distinct session dates that were not class-wide cancellations. */
  workingDays: number;
  cancelledSessions: number;
  unmarkedRecords: number;
  attendancePercent: number;
}

/**
 * Aggregate attendance rows into a single weighted rate.
 *
 * The weighting and the CANCELLED exclusion are delegated to
 * `ATTENDANCE_PRESENT_WEIGHT` from the existing attendance constants, so the
 * dashboard and `GET /attendance/monthly-analytics` can never disagree about what
 * a HALF_DAY or an ON_LEAVE is worth.
 *
 * Working days are the distinct session dates present in the data, minus any date
 * carrying a class-wide CANCELLED row (`studentId IS NULL`). A class with no
 * attendance rows at all contributes zero rather than a fabricated 0%, so an
 * un-marker school is surfaced by the data-gap alert instead of silently dragging
 * the programme average down.
 */
export function aggregateAttendance(rows: AttendanceRow[]): AttendanceAggregate {
  const cancelledDates = new Set<string>();
  const allDates = new Set<string>();

  for (const row of rows) {
    const key = toIsoDateString(row.sessionDate);
    allDates.add(key);
    if (row.status === 'CANCELLED' && row.studentId === null) cancelledDates.add(key);
  }

  const workingDayCount = [...allDates].filter((d) => !cancelledDates.has(d)).length;
  const cancelledSessions = cancelledDates.size;

  let weightedPresentDays = 0;
  let unmarkedRecords = 0;

  for (const row of rows) {
    // A class-wide cancellation is not a student mark and must not be counted as one.
    if (row.status === 'CANCELLED' && row.studentId === null) continue;
    // CANCELLED can only be class-wide per the attendance schema, but a stray
    // per-student CANCELLED must not silently count as full presence.
    if (row.status === 'CANCELLED') {
      unmarkedRecords += 1;
      continue;
    }
    if (row.studentId === null) {
      unmarkedRecords += 1;
      continue;
    }
    weightedPresentDays += ATTENDANCE_PRESENT_WEIGHT[row.status as AttendanceStatusValue] ?? 0;
  }

  return {
    weightedPresentDays: round(weightedPresentDays),
    workingDays: workingDayCount,
    cancelledSessions,
    unmarkedRecords,
    attendancePercent: percentage(weightedPresentDays, workingDayCount),
  };
}

/** Split rows by class and aggregate each independently. */
export function aggregateAttendanceByClass(
  rows: AttendanceRow[]
): Map<number, AttendanceAggregate> {
  const grouped = new Map<number, AttendanceRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.classSectionId) ?? [];
    bucket.push(row);
    grouped.set(row.classSectionId, bucket);
  }
  const result = new Map<number, AttendanceAggregate>();
  for (const [classId, bucket] of grouped) {
    result.set(classId, aggregateAttendance(bucket));
  }
  return result;
}

// ---------------------------------------------------------------------------
// DERIVED METRIC #1 - RISK LEVEL SCORE
// ---------------------------------------------------------------------------

export interface RiskScoreInput {
  attendancePercent: number;
  objectivesCoveredPercent: number;
  learningGainPoints: number;
  /** Share of in-scope students with at least one assessment, 0-100. */
  dataCompletenessPercent: number;
}

/** Learning gain is a point delta that can legitimately be negative; map to 0-100. */
const GAIN_TO_SCORE_SCALE = 10;

/**
 * Composite Risk Level Score, 0-100 where HIGHER IS HEALTHIER.
 *
 * A weighted blend of the four signals a school is actually judged on, using
 * `METRICS_RISK_SCORE_WEIGHTS`. A component with no data contributes 0 rather than
 * being dropped from the average, so a school nobody has assessed scores badly and
 * surfaces in the alerts rather than looking deceptively healthy.
 */
export function calculateRiskScore(input: RiskScoreInput): number {
  const attendance = clamp(input.attendancePercent, 0, 100);
  const objectives = clamp(input.objectivesCoveredPercent, 0, 100);
  // A gain of +10 points or better is full marks; 0 is neutral; negative is bad.
  const gain = clamp(input.learningGainPoints * GAIN_TO_SCORE_SCALE, 0, 100);
  const completeness = clamp(input.dataCompletenessPercent, 0, 100);

  const score =
    attendance * METRICS_RISK_SCORE_WEIGHTS.attendance +
    objectives * METRICS_RISK_SCORE_WEIGHTS.objectives +
    gain * METRICS_RISK_SCORE_WEIGHTS.learningGain +
    completeness * METRICS_RISK_SCORE_WEIGHTS.dataCompleteness;

  return round(score, 2);
}

/** Map a risk score onto the four-band health vocabulary the UI understands. */
export function riskBand(score: number): 'HEALTHY' | 'STABLE' | 'AT_RISK' | 'CRITICAL' {
  if (score >= 75) return 'HEALTHY';
  if (score >= 60) return 'STABLE';
  if (score >= 45) return 'AT_RISK';
  return 'CRITICAL';
}

// ---------------------------------------------------------------------------
// DERIVED METRIC #2 - CLASS EQUITY SCORE (Gini-based)
// ---------------------------------------------------------------------------

/**
 * Gini coefficient of a set of non-negative values, 0 (identical) to 1 (maximally
 * unequal). Uses the sorted-rank formulation with the standard shift.
 */
export function giniCoefficient(values: number[]): number {
  const usable = values.filter((v) => Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
  const n = usable.length;
  if (n === 0) return 0;
  if (n === 1) return 0;

  const total = usable.reduce((acc, v) => acc + v, 0);
  if (total === 0) return 0;

  let weightedSum = 0;
  for (let i = 0; i < n; i += 1) {
    // (i + 1) is the 1-based rank of the i-th smallest value.
    weightedSum += (i + 1) * usable[i];
  }

  const gini = (2 * weightedSum) / (n * total) - (n + 1) / n;
  return clamp(gini, 0, 1);
}

/**
 * Class Equity Score, 0-100 where HIGHER IS MORE EQUITABLE.
 *
 * One minus the Gini of the per-class values, scaled to 100. Every class performing
 * identically scores 100; a single outlier class measurably drags the programme
 * down, which is the signal the NGO actually acts on.
 */
export function calculateEquityScore(classValues: number[]): number {
  const gini = giniCoefficient(classValues);
  return round((1 - gini) * 100, 2);
}

// ---------------------------------------------------------------------------
// DERIVED METRIC #3 - MoM TREND
// ---------------------------------------------------------------------------

/** Monthly counts as a sparkline series, zero-filling months with no data. */
export function buildMonthlySeries(
  monthlyCounts: Map<string, number>,
  year: number,
  months: number[]
): number[] {
  return months.map((m) => round(monthlyCounts.get(`${year}-${m}`) ?? 0, 2));
}

// ---------------------------------------------------------------------------
// DISTRIBUTION BUILDERS
// ---------------------------------------------------------------------------

export interface DistributionBucket {
  code: string;
  label: string;
  count: number;
  percentage: number;
}

/** Percentage distribution of stage codes across S1..S5, always 5 buckets long. */
export function buildStageDistribution(stages: MetricsStageCode[]): DistributionBucket[] {
  const counts = new Map<MetricsStageCode, number>(METRICS_STAGE_CODES.map((s) => [s, 0]));
  for (const stage of stages) counts.set(stage, (counts.get(stage) ?? 0) + 1);
  const total = stages.length;

  return METRICS_STAGE_CODES.map((code) => ({
    code,
    label: METRICS_STAGE_LABELS[code],
    count: counts.get(code) ?? 0,
    percentage: percentage(counts.get(code) ?? 0, total),
  }));
}

/** Percentage split of a set of values across named categories. */
export function buildCategoryDistribution<T extends string>(
  values: T[],
  categories: readonly T[]
): Array<{ category: T; count: number; percentage: number }> {
  const total = values.length;
  return categories.map((category) => {
    const count = values.filter((v) => v === category).length;
    return { category, count, percentage: percentage(count, total) };
  });
}

/** Mean of a numeric sample, rounded; 0 for an empty sample. */
export function mean(values: number[]): number {
  return average(values);
}
