import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { AttendanceRepository, IAttendanceRepository, AttendanceWithRelations, StudentAttendanceUpsertInput } from '../repositories/attendance.repository';
import { ClassRepository, IClassRepository } from '../repositories/class.repository';
import {
  BatchUpsertAttendanceInput,
  CancelClassAttendanceInput,
  UncancelClassAttendanceInput,
  UpdateAttendanceInput,
  AttendanceFilterQuery,
  MonthlyAnalyticsQuery,
  RiskAnalyticsQuery,
  AttendanceResponseDTO,
  PaginatedAttendanceResponseDTO,
  BatchUpsertAttendanceResponseDTO,
  ClassCancellationResponseDTO,
  DailyRegisterResponseDTO,
  DailyRegisterEntryDTO,
  MonthlyAttendanceAnalyticsDTO,
  StudentMonthlyAnalyticsDTO,
  MutationMessageDTO,
} from '../dtos/attendance.dto';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';
import { logger } from '../config/logger.config';
import { sanitizePII } from '../utils/sanitizer.utils';
import { parseIsoDate, toIsoDateString, getUtcMonthRange } from '../utils/date.utils';
import { collectWorkingDays, calculateStudentMetrics } from '../utils/attendanceCalculator.utils';
import { AttendanceStatus } from '@prisma/client';
import { AttendanceRiskLevel } from '../constants/attendance.constants';

@provide(AttendanceService)
export class AttendanceService {
  constructor(
    @inject(AttendanceRepository) private attendanceRepo: IAttendanceRepository,
    @inject(ClassRepository) private classRepo: IClassRepository
  ) {}

  private mapToDTO(record: AttendanceWithRelations): AttendanceResponseDTO {
    return {
      id: record.id.toString(),
      classId: record.classSectionId,
      studentId: record.studentId,
      sessionDate: toIsoDateString(record.sessionDate),
      status: record.status,
      remarks: record.remarks,
      createdAt: record.createdAt.toISOString(),
      className: record.classSection?.name,
      student: record.student
        ? {
            id: record.student.id,
            studentIdCode: record.student.studentIdCode,
            firstName: record.student.firstName,
            lastName: record.student.lastName,
          }
        : null,
    };
  }

  public async batchUpsertAttendance(input: BatchUpsertAttendanceInput): Promise<BatchUpsertAttendanceResponseDTO> {
    const startTime = Date.now();
    logger.info('[AttendanceService.batchUpsertAttendance] Marking batch attendance', {
      classId: input.classId,
      sessionDate: input.sessionDate,
      recordCount: input.records.length,
    });

    const cls = await this.classRepo.findById(input.classId);
    if (!cls) {
      throw new AppError(`Class section with ID ${input.classId} not found`, HttpStatusCode.NOT_FOUND);
    }

    const sessionDate = parseIsoDate(input.sessionDate, 'sessionDate');

    const cancellation = await this.attendanceRepo.findClassCancellation(input.classId, sessionDate);
    if (cancellation) {
      throw new AppError(
        `Class session on ${input.sessionDate} is cancelled. Uncancel the session before marking attendance.`,
        HttpStatusCode.BAD_REQUEST
      );
    }

    const upsertInputs: StudentAttendanceUpsertInput[] = input.records.map((r) => ({
      classSectionId: input.classId,
      studentId: r.studentId,
      sessionDate,
      status: r.status as AttendanceStatus,
      remarks: r.remarks ?? null,
    }));

    const results = await this.attendanceRepo.upsertStudentRecords(upsertInputs);

    const duration = Date.now() - startTime;
    logger.info('[AttendanceService.batchUpsertAttendance] Batch attendance marked successfully', {
      classId: input.classId,
      sessionDate: input.sessionDate,
      upsertedCount: results.length,
      durationMs: duration,
    });

    const dtoRecords = results.map((r) => ({
      id: r.id.toString(),
      classId: r.classSectionId,
      studentId: r.studentId,
      sessionDate: toIsoDateString(r.sessionDate),
      status: r.status,
      remarks: r.remarks,
      createdAt: r.createdAt.toISOString(),
      className: cls.name,
    }));

    return {
      classId: input.classId,
      sessionDate: input.sessionDate,
      upserted: results.length,
      records: dtoRecords,
    };
  }

  public async cancelClassSession(input: CancelClassAttendanceInput): Promise<ClassCancellationResponseDTO> {
    const startTime = Date.now();
    logger.info('[AttendanceService.cancelClassSession] Cancelling class session', {
      classId: input.classId,
      sessionDate: input.sessionDate,
    });

    const cls = await this.classRepo.findById(input.classId);
    if (!cls) {
      throw new AppError(`Class section with ID ${input.classId} not found`, HttpStatusCode.NOT_FOUND);
    }

    const sessionDate = parseIsoDate(input.sessionDate, 'sessionDate');

    const { cancellation, removedStudentRecords } = await this.attendanceRepo.cancelClassSession(
      input.classId,
      sessionDate,
      input.remarks
    );

    const duration = Date.now() - startTime;
    logger.info('[AttendanceService.cancelClassSession] Class session cancelled successfully', {
      classId: input.classId,
      sessionDate: input.sessionDate,
      removedStudentRecords,
      durationMs: duration,
    });

    const cancellationDTO: AttendanceResponseDTO = {
      id: cancellation.id.toString(),
      classId: cancellation.classSectionId,
      studentId: null,
      sessionDate: toIsoDateString(cancellation.sessionDate),
      status: cancellation.status,
      remarks: cancellation.remarks,
      createdAt: cancellation.createdAt.toISOString(),
      className: cls.name,
    };

    return {
      classId: input.classId,
      sessionDate: input.sessionDate,
      status: cancellation.status,
      remarks: cancellation.remarks,
      removedStudentRecords,
      record: cancellationDTO,
    };
  }

  public async uncancelClassSession(input: UncancelClassAttendanceInput): Promise<MutationMessageDTO> {
    const startTime = Date.now();
    const cls = await this.classRepo.findById(input.classId);
    if (!cls) {
      throw new AppError(`Class section with ID ${input.classId} not found`, HttpStatusCode.NOT_FOUND);
    }

    const sessionDate = parseIsoDate(input.sessionDate, 'sessionDate');
    const count = await this.attendanceRepo.uncancelClassSession(input.classId, sessionDate);

    const duration = Date.now() - startTime;
    logger.info('[AttendanceService.uncancelClassSession] Class session uncancelled', {
      classId: input.classId,
      sessionDate: input.sessionDate,
      removedCancellationRecords: count,
      durationMs: duration,
    });

    return {
      success: true,
      message: `Class session cancellation removed for date ${input.sessionDate}`,
    };
  }

  public async getDailyRegister(classId: number, sessionDateStr: string): Promise<DailyRegisterResponseDTO> {
    const cls = await this.classRepo.findById(classId);
    if (!cls) {
      throw new AppError(`Class section with ID ${classId} not found`, HttpStatusCode.NOT_FOUND);
    }

    const sessionDate = parseIsoDate(sessionDateStr, 'sessionDate');

    const cancellation = await this.attendanceRepo.findClassCancellation(classId, sessionDate);
    const { records: enrolledStudents } = await this.classRepo.getEnrolledStudents(classId, 1000, 0);
    const attendanceRecords = await this.attendanceRepo.findByClassAndDate(classId, sessionDate);

    const recordByStudentId = new Map<number, AttendanceWithRelations>();
    for (const r of attendanceRecords) {
      if (r.studentId !== null) {
        recordByStudentId.set(r.studentId, r);
      }
    }

    let markedCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let activityCount = 0;

    const entries: DailyRegisterEntryDTO[] = enrolledStudents.map((stu) => {
      const rec = recordByStudentId.get(stu.id);
      const status: AttendanceStatus | 'UNMARKED' = rec ? rec.status : 'UNMARKED';

      if (rec) {
        markedCount += 1;
        if (rec.status === AttendanceStatus.P) presentCount += 1;
        else if (rec.status === AttendanceStatus.A) absentCount += 1;
        else if (rec.status === AttendanceStatus.HALF_DAY) halfDayCount += 1;
        else if (rec.status === AttendanceStatus.ACTIVITY) activityCount += 1;
      }

      return {
        studentId: stu.id,
        studentIdCode: stu.studentIdCode,
        firstName: stu.firstName,
        lastName: stu.lastName,
        status,
        remarks: rec?.remarks ?? null,
        attendanceId: rec ? rec.id.toString() : null,
      };
    });

    return {
      classId,
      className: cls.name,
      sessionDate: sessionDateStr,
      cancelled: !!cancellation,
      cancellationRemarks: cancellation?.remarks ?? null,
      enrolledCount: enrolledStudents.length,
      markedCount,
      presentCount,
      absentCount,
      halfDayCount,
      activityCount,
      entries: sanitizePII(entries),
    };
  }

  public async getMonthlyAnalytics(query: MonthlyAnalyticsQuery): Promise<MonthlyAttendanceAnalyticsDTO> {
    const cls = await this.classRepo.findById(query.classId);
    if (!cls) {
      throw new AppError(`Class section with ID ${query.classId} not found`, HttpStatusCode.NOT_FOUND);
    }

    const { start, end } = getUtcMonthRange(query.year, query.month);
    const records = await this.attendanceRepo.findInDateRange(query.classId, start, end);
    const { records: enrolledStudents } = await this.classRepo.getEnrolledStudents(query.classId, 1000, 0);

    const rawRecords = records.map((r) => ({
      sessionDate: r.sessionDate,
      status: r.status,
      studentId: r.studentId,
    }));

    const workingDayKeys = collectWorkingDays(rawRecords);

    const cancelledDates = new Set<string>();
    for (const r of records) {
      if (r.status === AttendanceStatus.CANCELLED && r.studentId === null) {
        cancelledDates.add(toIsoDateString(r.sessionDate));
      }
    }

    const recordsByStudent = new Map<number, Array<{ sessionDate: Date; status: AttendanceStatus }>>();
    for (const r of records) {
      if (r.studentId !== null) {
        if (!recordsByStudent.has(r.studentId)) {
          recordsByStudent.set(r.studentId, []);
        }
        recordsByStudent.get(r.studentId)!.push({
          sessionDate: r.sessionDate,
          status: r.status,
        });
      }
    }

    let totalAttendancePctSum = 0;
    let atRiskCount = 0;

    const studentSummaries: StudentMonthlyAnalyticsDTO[] = enrolledStudents.map((stu) => {
      const studentPoints = recordsByStudent.get(stu.id) ?? [];
      const metrics = calculateStudentMetrics(workingDayKeys, studentPoints);

      totalAttendancePctSum += metrics.attendancePercent;
      if (
        metrics.riskLevel === AttendanceRiskLevel.AT_RISK ||
        metrics.riskLevel === AttendanceRiskLevel.CRITICAL
      ) {
        atRiskCount += 1;
      }

      return {
        studentId: stu.id,
        studentIdCode: stu.studentIdCode,
        firstName: stu.firstName,
        lastName: stu.lastName,
        ...metrics,
      };
    });

    const classAveragePercent =
      enrolledStudents.length === 0
        ? 100
        : Number((totalAttendancePctSum / enrolledStudents.length).toFixed(2));

    return {
      classId: query.classId,
      className: cls.name,
      year: query.year,
      month: query.month,
      workingDays: workingDayKeys.length,
      cancelledDays: cancelledDates.size,
      classAveragePercent,
      atRiskCount,
      students: sanitizePII(studentSummaries),
    };
  }

  public async getRiskAnalytics(query: RiskAnalyticsQuery): Promise<MonthlyAttendanceAnalyticsDTO> {
    const fullAnalytics = await this.getMonthlyAnalytics(query);

    const targetRiskLevels = new Set<AttendanceRiskLevel>();
    if (query.minRiskLevel) {
      if (query.minRiskLevel === AttendanceRiskLevel.CRITICAL) {
        targetRiskLevels.add(AttendanceRiskLevel.CRITICAL);
      } else if (query.minRiskLevel === AttendanceRiskLevel.AT_RISK) {
        targetRiskLevels.add(AttendanceRiskLevel.AT_RISK);
        targetRiskLevels.add(AttendanceRiskLevel.CRITICAL);
      } else if (query.minRiskLevel === AttendanceRiskLevel.WATCH) {
        targetRiskLevels.add(AttendanceRiskLevel.WATCH);
        targetRiskLevels.add(AttendanceRiskLevel.AT_RISK);
        targetRiskLevels.add(AttendanceRiskLevel.CRITICAL);
      } else {
        targetRiskLevels.add(AttendanceRiskLevel.STABLE);
        targetRiskLevels.add(AttendanceRiskLevel.WATCH);
        targetRiskLevels.add(AttendanceRiskLevel.AT_RISK);
        targetRiskLevels.add(AttendanceRiskLevel.CRITICAL);
      }
    } else {
      targetRiskLevels.add(AttendanceRiskLevel.AT_RISK);
      targetRiskLevels.add(AttendanceRiskLevel.CRITICAL);
    }

    const filteredStudents = fullAnalytics.students.filter((s) => targetRiskLevels.has(s.riskLevel));

    return {
      ...fullAnalytics,
      students: filteredStudents,
    };
  }

  public async getAttendanceById(idStr: string): Promise<AttendanceResponseDTO> {
    const id = BigInt(idStr);
    const record = await this.attendanceRepo.findById(id);
    if (!record) {
      throw new AppError(`Attendance record with ID ${idStr} not found`, HttpStatusCode.NOT_FOUND);
    }
    return this.mapToDTO(record);
  }

  public async listAttendance(query: AttendanceFilterQuery): Promise<PaginatedAttendanceResponseDTO> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 50));
    const offset = (page - 1) * limit;

    const filterOptions = {
      classId: query.classId,
      studentId: query.studentId,
      sessionDate: query.sessionDate ? parseIsoDate(query.sessionDate, 'sessionDate') : undefined,
      fromDate: query.fromDate ? parseIsoDate(query.fromDate, 'fromDate') : undefined,
      toDate: query.toDate ? parseIsoDate(query.toDate, 'toDate') : undefined,
      status: query.status,
    };

    const [records, total] = await Promise.all([
      this.attendanceRepo.findAll(filterOptions, limit, offset),
      this.attendanceRepo.countAll(filterOptions),
    ]);

    return {
      records: records.map((r) => this.mapToDTO(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async updateAttendance(idStr: string, input: UpdateAttendanceInput): Promise<AttendanceResponseDTO> {
    const id = BigInt(idStr);
    const existing = await this.attendanceRepo.findById(id);
    if (!existing) {
      throw new AppError(`Attendance record with ID ${idStr} not found`, HttpStatusCode.NOT_FOUND);
    }

    const updated = await this.attendanceRepo.update(id, input as any);
    const refreshed = await this.attendanceRepo.findById(updated.id);
    return this.mapToDTO(refreshed!);
  }

  public async deleteAttendance(idStr: string): Promise<MutationMessageDTO> {
    const id = BigInt(idStr);
    const existing = await this.attendanceRepo.findById(id);
    if (!existing) {
      throw new AppError(`Attendance record with ID ${idStr} not found`, HttpStatusCode.NOT_FOUND);
    }

    await this.attendanceRepo.delete(id);
    return {
      success: true,
      message: `Attendance record ${idStr} deleted successfully`,
    };
  }
}
