export enum AttendanceRiskLevel {
  STABLE = 'STABLE',
  WATCH = 'WATCH',
  AT_RISK = 'AT_RISK',
  CRITICAL = 'CRITICAL',
}

/**
 * Present-day weights. CANCELLED is excluded from working-day denominators.
 * ACTIVITY is treated as a full present day (school function / outing).
 */
export const ATTENDANCE_PRESENT_WEIGHT = {
  P: 1,
  ACTIVITY: 1,
  HALF_DAY: 0.5,
  A: 0,
  CANCELLED: 0,
} as const;

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

export const STUDENT_MARKABLE_STATUSES = ['P', 'A', 'HALF_DAY', 'ACTIVITY'] as const;