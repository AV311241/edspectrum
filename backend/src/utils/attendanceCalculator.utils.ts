import { AttendanceStatus } from '@prisma/client';
import {
  ATTENDANCE_PRESENT_WEIGHT,
  ATTENDANCE_RISK_THRESHOLDS,
  AttendanceRiskLevel,
} from '../constants/attendance.constants';
import { toIsoDateString } from './date.utils';

export interface DailyStatusPoint {
  sessionDate: Date;
  status: AttendanceStatus;
}

export interface StudentAttendanceMetrics {
  presentDays: number;
  absentDays: number;
  halfDays: number;
  activityDays: number;
  leaveDays: number;
  unmarkedDays: number;
  workingDays: number;
  attendancePercent: number;
  consecutiveAbsences: number;
  maxConsecutiveAbsences: number;
  riskLevel: AttendanceRiskLevel;
}

function presentWeight(status: AttendanceStatus): number {
  // `ATTENDANCE_PRESENT_WEIGHT` is typed as a total `Record` over
  // `AttendanceStatusValue`, so this lookup is exhaustively checked at compile
  // time. The `?? 0` is belt-and-braces: a future status that slipped through
  // would otherwise turn every percentage into NaN and silently classify the
  // student as STABLE.
  return ATTENDANCE_PRESENT_WEIGHT[status] ?? 0;
}

function isAbsentForStreak(status: AttendanceStatus | 'UNMARKED'): boolean {
  // ON_LEAVE is authorised leave, not an absence: it must not extend a
  // consecutive-absence streak, otherwise a student on approved medical leave
  // would be escalated to AT_RISK/CRITICAL purely for taking leave.
  return status === AttendanceStatus.A || status === 'UNMARKED';
}

/**
 * Working days are distinct session dates that are not class-wide cancellations.
 */
export function collectWorkingDays(
  records: Array<{ sessionDate: Date; status: AttendanceStatus; studentId: number | null }>
): string[] {
  const cancelledDates = new Set<string>();
  const allDates = new Set<string>();

  for (const record of records) {
    const key = toIsoDateString(record.sessionDate);
    allDates.add(key);
    if (record.status === AttendanceStatus.CANCELLED && record.studentId === null) {
      cancelledDates.add(key);
    }
  }

  return [...allDates]
    .filter((date) => !cancelledDates.has(date))
    .sort();
}

export function calculateConsecutiveAbsences(
  workingDayKeys: string[],
  statusByDate: Map<string, AttendanceStatus>
): { current: number; max: number } {
  let current = 0;
  let max = 0;
  let trailing = 0;

  for (const day of workingDayKeys) {
    const status = statusByDate.get(day) ?? 'UNMARKED';
    if (isAbsentForStreak(status)) {
      current += 1;
      trailing = current;
      if (current > max) max = current;
    } else {
      current = 0;
    }
  }

  return { current: trailing, max };
}

export function resolveRiskLevel(attendancePercent: number, maxConsecutiveAbsences: number): AttendanceRiskLevel {
  const { attendancePercent: pct, consecutiveAbsences } = ATTENDANCE_RISK_THRESHOLDS;

  if (attendancePercent < pct.criticalBelow || maxConsecutiveAbsences >= consecutiveAbsences.criticalAtOrAbove) {
    return AttendanceRiskLevel.CRITICAL;
  }
  if (attendancePercent < pct.atRiskBelow || maxConsecutiveAbsences >= consecutiveAbsences.atRiskAtOrAbove) {
    return AttendanceRiskLevel.AT_RISK;
  }
  if (attendancePercent < pct.watchBelow) {
    return AttendanceRiskLevel.WATCH;
  }
  return AttendanceRiskLevel.STABLE;
}

export function calculateStudentMetrics(
  workingDayKeys: string[],
  studentRecords: DailyStatusPoint[]
): StudentAttendanceMetrics {
  const statusByDate = new Map<string, AttendanceStatus>();
  for (const point of studentRecords) {
    if (point.status === AttendanceStatus.CANCELLED) continue;
    statusByDate.set(toIsoDateString(point.sessionDate), point.status);
  }

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let activityDays = 0;
  let leaveDays = 0;
  let unmarkedDays = 0;
  let weightedPresent = 0;

  for (const day of workingDayKeys) {
    const status = statusByDate.get(day);
    if (!status) {
      unmarkedDays += 1;
      continue;
    }
    weightedPresent += presentWeight(status);
    if (status === AttendanceStatus.P) presentDays += 1;
    else if (status === AttendanceStatus.A) absentDays += 1;
    else if (status === AttendanceStatus.HALF_DAY) halfDays += 1;
    else if (status === AttendanceStatus.ACTIVITY) activityDays += 1;
    else if (status === AttendanceStatus.ON_LEAVE) leaveDays += 1;
  }

  const workingDays = workingDayKeys.length;
  const attendancePercent = workingDays === 0 ? 100 : Number(((weightedPresent / workingDays) * 100).toFixed(2));
  const streaks = calculateConsecutiveAbsences(workingDayKeys, statusByDate);

  return {
    presentDays,
    absentDays,
    halfDays,
    activityDays,
    leaveDays,
    unmarkedDays,
    workingDays,
    attendancePercent,
    consecutiveAbsences: streaks.current,
    maxConsecutiveAbsences: streaks.max,
    riskLevel: resolveRiskLevel(attendancePercent, streaks.max),
  };
}

export function roundPercent(value: number): number {
  return Number(value.toFixed(2));
}