export enum AttendanceRiskLevel {
  STABLE = 'STABLE',
  WATCH = 'WATCH',
  AT_RISK = 'AT_RISK',
  CRITICAL = 'CRITICAL',
}

/**
 * Single source of truth for the attendance status vocabulary.
 *
 * Every other status list in the codebase (Zod enums, the upload DTOs, the
 * frontend templates) is derived from this tuple so a new status cannot be
 * added in one place and forgotten in another.
 */
export const ATTENDANCE_STATUS_VALUES = [
  'P',
  'A',
  'HALF_DAY',
  'ACTIVITY',
  'ON_LEAVE',
  'CANCELLED',
] as const;

export type AttendanceStatusValue = (typeof ATTENDANCE_STATUS_VALUES)[number];

/** Statuses that describe a whole session rather than one student. */
export const ATTENDANCE_CLASS_WIDE_STATUSES = ['CANCELLED'] as const;

/** Statuses a teacher can mark against an individual enrolled student. */
export const STUDENT_MARKABLE_STATUSES = [
  'P',
  'A',
  'HALF_DAY',
  'ACTIVITY',
  'ON_LEAVE',
] as const;

export type StudentMarkableStatus = (typeof STUDENT_MARKABLE_STATUSES)[number];

/**
 * Present-day weights used to compute attendance percentages.
 *
 * - CANCELLED is excluded from working-day denominators entirely.
 * - ACTIVITY is a full present day (school function / outing).
 * - ON_LEAVE is authorised leave: not a present day (weight 0) but also not an
 *   absence, so it never inflates a consecutive-absence streak.
 *
 * The `Record<AttendanceStatusValue, number>` annotation is a deliberate
 * compile-time exhaustiveness guard. `presentWeight()` indexes this table
 * directly, so a missing key yields `undefined`, which poisons the running
 * weighted-present sum into `NaN`; `resolveRiskLevel(NaN, ...)` then falls
 * through every threshold comparison and returns STABLE, i.e. the healthiest
 * risk band. Adding a status without adding its weight would therefore silently
 * mis-report every affected student. This type makes that a build error.
 */
export const ATTENDANCE_PRESENT_WEIGHT: Record<AttendanceStatusValue, number> = {
  P: 1,
  ACTIVITY: 1,
  HALF_DAY: 0.5,
  A: 0,
  ON_LEAVE: 0,
  CANCELLED: 0,
};

export const ATTENDANCE_RISK_THRESHOLDS = {
  attendancePercent: {
    criticalBelow: 60,
    atRiskBelow: 75,
    watchBelow: 85,
  },
  consecutiveAbsences: {
    criticalAtOrAbove: 5,
    atRiskAtOrAbove: 3,
  },
} as const;
