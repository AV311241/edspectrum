import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';
import { AttendanceRiskLevel } from '../constants/attendance.constants';

const isoDate = z
  .string({ required_error: 'sessionDate is required' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted YYYY-MM-DD');

const markableStatus = z.enum(['P', 'A', 'HALF_DAY', 'ACTIVITY']);

export interface AttendanceRecordInput {
  studentId: number;
  status: 'P' | 'A' | 'HALF_DAY' | 'ACTIVITY';
  remarks?: string | null;
}

export interface BatchUpsertAttendanceInput {
  classId: number;
  sessionDate: string;
  records: AttendanceRecordInput[];
}

export interface CancelClassAttendanceInput {
  classId: number;
  sessionDate: string;
  remarks: string;
}

export interface UncancelClassAttendanceInput {
  classId: number;
  sessionDate: string;
}

export interface UpdateAttendanceInput {
  status?: AttendanceStatus;
  remarks?: string | null;
}

export interface AttendanceFilterQuery {
  page?: number;
  limit?: number;
  classId?: number;
  studentId?: number;
  sessionDate?: string;
  fromDate?: string;
  toDate?: string;
  status?: AttendanceStatus;
}

export interface MonthlyAnalyticsQuery {
  classId: number;
  year: number;
  month: number;
}

export interface RiskAnalyticsQuery {
  classId: number;
  year: number;
  month: number;
  minRiskLevel?: AttendanceRiskLevel;
}

export interface AttendanceStudentSummaryDTO {
  id: number;
  studentIdCode: string;
  firstName: string;
  lastName: string;
}

export interface AttendanceResponseDTO {
  id: string;
  classId: number;
  studentId: number | null;
  sessionDate: string;
  status: AttendanceStatus;
  remarks: string | null;
  createdAt: string;
  className?: string;
  student?: AttendanceStudentSummaryDTO | null;
}

export interface PaginatedAttendanceResponseDTO {
  records: AttendanceResponseDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BatchUpsertAttendanceResponseDTO {
  classId: number;
  sessionDate: string;
  upserted: number;
  records: AttendanceResponseDTO[];
}

export interface ClassCancellationResponseDTO {
  classId: number;
  sessionDate: string;
  status: AttendanceStatus;
  remarks: string | null;
  removedStudentRecords: number;
  record: AttendanceResponseDTO;
}

export interface DailyRegisterEntryDTO {
  studentId: number;
  studentIdCode: string;
  firstName: string;
  lastName: string;
  status: AttendanceStatus | 'UNMARKED';
  remarks: string | null;
  attendanceId: string | null;
}

export interface DailyRegisterResponseDTO {
  classId: number;
  className: string;
  sessionDate: string;
  cancelled: boolean;
  cancellationRemarks: string | null;
  enrolledCount: number;
  markedCount: number;
  presentCount: number;
  absentCount: number;
  halfDayCount: number;
  activityCount: number;
  entries: DailyRegisterEntryDTO[];
}

export interface StudentMonthlyAnalyticsDTO {
  studentId: number;
  studentIdCode: string;
  firstName: string;
  lastName: string;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  activityDays: number;
  unmarkedDays: number;
  workingDays: number;
  attendancePercent: number;
  consecutiveAbsences: number;
  maxConsecutiveAbsences: number;
  riskLevel: AttendanceRiskLevel;
}

export interface MonthlyAttendanceAnalyticsDTO {
  classId: number;
  className: string;
  year: number;
  month: number;
  workingDays: number;
  cancelledDays: number;
  classAveragePercent: number;
  atRiskCount: number;
  students: StudentMonthlyAnalyticsDTO[];
}

export interface MutationMessageDTO {
  success: boolean;
  message: string;
}

export const batchUpsertAttendanceSchema = z.object({
  classId: z.number({ required_error: 'classId is required' }).int().positive('classId must be positive'),
  sessionDate: isoDate,
  records: z
    .array(
      z.object({
        studentId: z.number({ required_error: 'studentId is required' }).int().positive(),
        status: markableStatus,
        remarks: z.string().max(2000).nullable().optional(),
      })
    )
    .min(1, 'At least one attendance record is required')
    .max(200, 'A single batch cannot exceed 200 records'),
});

export const cancelClassAttendanceSchema = z.object({
  classId: z.number({ required_error: 'classId is required' }).int().positive('classId must be positive'),
  sessionDate: isoDate,
  remarks: z
    .string({ required_error: 'remarks is required for class-wide cancellation' })
    .min(1, 'remarks is required for class-wide cancellation')
    .max(2000),
});

export const uncancelClassAttendanceSchema = z.object({
  classId: z.number({ required_error: 'classId is required' }).int().positive('classId must be positive'),
  sessionDate: isoDate,
});

export const updateAttendanceSchema = z
  .object({
    status: z.nativeEnum(AttendanceStatus).optional(),
    remarks: z.string().max(2000).nullable().optional(),
  })
  .refine((value) => value.status !== undefined || value.remarks !== undefined, {
    message: 'At least one of status or remarks must be provided',
  });

export const attendanceFilterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  classId: z.coerce.number().int().positive().optional(),
  studentId: z.coerce.number().int().positive().optional(),
  sessionDate: isoDate.optional(),
  fromDate: isoDate.optional(),
  toDate: isoDate.optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
});

export const dailyRegisterQuerySchema = z.object({
  classId: z.coerce.number({ required_error: 'classId is required' }).int().positive(),
  sessionDate: isoDate,
});

export const monthlyAnalyticsQuerySchema = z.object({
  classId: z.coerce.number({ required_error: 'classId is required' }).int().positive(),
  year: z.coerce.number({ required_error: 'year is required' }).int().min(2000).max(2100),
  month: z.coerce.number({ required_error: 'month is required' }).int().min(1).max(12),
});

export const riskAnalyticsQuerySchema = monthlyAnalyticsQuerySchema.extend({
  minRiskLevel: z.nativeEnum(AttendanceRiskLevel).optional(),
});
