import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { prisma } from '../config/db.config';
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
import {
  BulkAttendanceUploadInput,
  BulkAttendanceUploadResultDTO,
  BulkAttendanceUploadRow,
} from '../dtos/attendance-upload.dto';
import { BatchAttendanceUploadDTO } from '../schemas/attendance-upload.schema';
import { RowErrorDTO } from '../dtos/upload-common.dto';

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

  /**
   * Bulk upsert attendance for a single class section, addressed by primary key.
   *
   * Unlike `bulkUploadAttendance` (which resolves per-row codes and may span
   * several classes) this takes the class once in the envelope. Students are
   * verified with a single bulk query, then written with real upserts inside one
   * transaction.
   *
   * `skipDuplicates` / `createMany` is deliberately NOT used: it silently drops
   * conflicting rows instead of updating them, so re-uploading a corrected
   * sheet would leave the old value in place while still reporting success. The
   * unique index on (sessionDate, classSectionId, studentId) makes the upsert
   * target unambiguous.
   */
  public async bulkUploadAttendanceByClass(
    input: BatchAttendanceUploadDTO
  ): Promise<BulkAttendanceUploadResultDTO> {
    const startTime = Date.now();
    const { schoolId, classSectionId, records } = input;
    const errors: RowErrorDTO[] = [];
    let failed = 0;
    let cancellations = 0;

    logger.info('[AttendanceService.bulkUploadAttendanceByClass] Starting per-class bulk upload', {
      classSectionId,
      recordCount: records.length,
    });

    // 1. The class must exist AND belong to the declared school.
    const classSection = await prisma.classSection.findFirst({
      where: { id: classSectionId, schoolId },
      select: { id: true, name: true },
    });
    if (!classSection) {
      throw new AppError(
        `ClassSection ID ${classSectionId} not found under School ID ${schoolId}`,
        HttpStatusCode.NOT_FOUND
      );
    }

    // 2. Verify every referenced student in ONE round-trip, then build an
    //    O(1) studentCode -> primary key lookup.
    const uniqueStudentCodes = Array.from(
      new Set(records.map((r) => r.studentId).filter((id): id is string => Boolean(id)))
    );
    const existingStudents =
      uniqueStudentCodes.length > 0
        ? await prisma.student.findMany({
            where: { schoolId, studentIdCode: { in: uniqueStudentCodes } },
            select: { id: true, studentIdCode: true },
          })
        : [];
    const studentIdByCode = new Map<string, number>(
      existingStudents.map((s) => [s.studentIdCode.trim().toUpperCase(), s.id])
    );

    // 3. Report unresolved students as row-scoped errors so the wizard can
    //    highlight the exact cells instead of aborting the whole batch.
    const writeRows: StudentAttendanceUpsertInput[] = [];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (!record.studentId) continue; // class-wide cancellation, handled below
      const pk = studentIdByCode.get(record.studentId.trim().toUpperCase());
      if (pk === undefined) {
        failed += 1;
        errors.push({
          rowIndex: i + 2,
          columnName: 'studentId',
          invalidValue: record.studentId,
          errorMessage: `Student "${record.studentId}" was not found in school ID ${schoolId}. Upload the Students sheet first.`,
          severity: 'ERROR',
        });
        continue;
      }
      writeRows.push({
        classSectionId,
        studentId: pk,
        sessionDate: parseIsoDate(record.sessionDate, 'sessionDate'),
        status: record.status as AttendanceStatus,
        remarks: record.remarks ?? null,
      });
    }

    // 4. Class-wide cancellations are distinct (class, date) sessions.
    const cancellationByDate = new Map<string, string>();
    for (const record of records) {
      if (record.status !== 'CANCELLED') continue;
      const remarks = record.remarks ?? '';
      if (remarks) cancellationByDate.set(record.sessionDate, remarks);
    }

    // 5. Persist atomically, chunked to stay clear of SQL parameter limits.
    const CHUNK_SIZE = 200;
    let created = 0;

    try {
      await prisma.$transaction(async (tx) => {
        for (let offset = 0; offset < writeRows.length; offset += CHUNK_SIZE) {
          const chunk = writeRows.slice(offset, offset + CHUNK_SIZE);
          for (const row of chunk) {
            await tx.attendance.upsert({
              where: {
                sessionDate_classSectionId_studentId: {
                  sessionDate: row.sessionDate,
                  classSectionId: row.classSectionId,
                  studentId: row.studentId,
                },
              },
              create: row,
              update: { status: row.status, remarks: row.remarks },
            });
            created += 1;
          }
        }

        for (const [sessionDate, remarks] of cancellationByDate) {
          const parsedDate = parseIsoDate(sessionDate, 'sessionDate');
          // Prisma cannot match `studentId: null` in a compound-unique
          // `where`, so the class-wide row is located explicitly and then
          // updated or created. This also keeps us inside the transaction.
          const existingCancellation = await tx.attendance.findFirst({
            where: { classSectionId, sessionDate: parsedDate, studentId: null },
            select: { id: true },
          });

          if (existingCancellation) {
            await tx.attendance.update({
              where: { id: existingCancellation.id },
              data: { status: 'CANCELLED' as AttendanceStatus, remarks },
            });
          } else {
            await tx.attendance.create({
              data: {
                classSectionId,
                studentId: null,
                sessionDate: parsedDate,
                status: 'CANCELLED' as AttendanceStatus,
                remarks,
              },
            });
          }
          cancellations += 1;
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      logger.error('[AttendanceService.bulkUploadAttendanceByClass] Transaction rolled back', {
        classSectionId,
        message,
      });
      // The whole transaction is rolled back, so report honestly.
      throw new AppError(
        `Attendance upload failed and was rolled back in full: ${message}`,
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }

    const duration = Date.now() - startTime;
    logger.info('[AttendanceService.bulkUploadAttendanceByClass] Per-class bulk upload finished', {
      classSectionId,
      totalRows: records.length,
      created,
      cancellations,
      failed,
      durationMs: duration,
    });

    return {
      totalRows: records.length,
      created,
      skipped: 0,
      failed,
      records: [],
      errors,
      cancellations,
      sessionsProcessed: new Set([
        ...writeRows.map((r) => toIsoDateString(r.sessionDate)),
        ...cancellationByDate.keys(),
      ]).size,
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
    let leaveCount = 0;

    const entries: DailyRegisterEntryDTO[] = enrolledStudents.map((stu) => {
      const rec = recordByStudentId.get(stu.id);
      const status: AttendanceStatus | 'UNMARKED' = rec ? rec.status : 'UNMARKED';

      if (rec) {
        markedCount += 1;
        if (rec.status === AttendanceStatus.P) presentCount += 1;
        else if (rec.status === AttendanceStatus.A) absentCount += 1;
        else if (rec.status === AttendanceStatus.HALF_DAY) halfDayCount += 1;
        else if (rec.status === AttendanceStatus.ACTIVITY) activityCount += 1;
        else if (rec.status === AttendanceStatus.ON_LEAVE) leaveCount += 1;
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
      leaveCount,
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

  /** Resolve a code-based Excel row to its numeric class + student foreign keys. */
  private resolveUploadRow(
    row: BulkAttendanceUploadRow,
    rowIndex: number,
    schoolIdByCode: Map<string, number>,
    classIdByKey: Map<string, number>,
    studentIdByKey: Map<string, number>,
    errors: RowErrorDTO[]
  ): { classId: number; sessionDate: string; studentId: number | null; status: AttendanceStatus; remarks: string | null } | null {
    const pushError = (columnName: string, invalidValue: unknown, errorMessage: string) => {
      errors.push({ rowIndex, columnName, invalidValue, errorMessage, severity: 'ERROR' });
    };

    const schoolId = schoolIdByCode.get(row.schoolCode.trim().toUpperCase());
    if (!schoolId) {
      pushError('schoolCode', row.schoolCode, `No school found with code "${row.schoolCode}".`);
      return null;
    }

    const classKey = `${schoolId}|${row.className.trim().toLowerCase()}|${row.academicYear.trim()}`;
    const classId = classIdByKey.get(classKey);
    if (!classId) {
      pushError(
        'className',
        row.className,
        `No class "${row.className}" found for school "${row.schoolCode}" in academic year ${row.academicYear}. Upload the Classes sheet first.`
      );
      return null;
    }

    let studentId: number | null = null;
    if (row.status !== 'CANCELLED') {
      const code = row.studentId?.trim();
      if (!code) {
        pushError('studentId', row.studentId, `studentId is required when status is ${row.status}.`);
        return null;
      }
      const resolved = studentIdByKey.get(`${schoolId}|${code.toUpperCase()}`);
      if (!resolved) {
        pushError('studentId', code, `No student "${code}" found in school "${row.schoolCode}". Upload the Students sheet first.`);
        return null;
      }
      studentId = resolved;
    } else if (!row.remarks?.trim()) {
      pushError('remarks', row.remarks, 'remarks is required when status is CANCELLED (e.g. "School function").');
      return null;
    }

    return {
      classId,
      sessionDate: row.sessionDate.trim(),
      studentId,
      status: row.status as AttendanceStatus,
      remarks: row.remarks?.trim() || null,
    };
  }

  /**
   * Bulk upsert Daily Attendance from a code-based Excel upload.
   *
   * Accepts BOTH the row-based layout and the pivoted form of the Excel
   * matrix/grid layout (the client pivots the grid before dispatching). Resolves
   * `schoolCode`/`className`/`studentId` codes to numeric foreign keys, then
   * groups rows by (class, sessionDate) and reuses the existing
   * `batchUpsertAttendance` / `cancelClassSession` primitives so transactional
   * and cancellation semantics stay in exactly one place.
   *
   * `CANCELLED` rows are routed to `cancelClassSession` (a class-wide record with
   * `studentId = null`) and therefore require `remarks`.
   */
  public async bulkUploadAttendance(input: BulkAttendanceUploadInput): Promise<BulkAttendanceUploadResultDTO> {
    const startTime = Date.now();
    logger.info('[AttendanceService.bulkUploadAttendance] Starting bulk attendance upload', {
      rowCount: input.records.length,
    });

    const errors: RowErrorDTO[] = [];
    const records: AttendanceResponseDTO[] = [];
    let failed = 0;
    let skipped = 0;
    let cancellations = 0;

    // --- Bulk-resolve schools in a single round-trip ---
    const distinctCodes = Array.from(
      new Set(input.records.map((r) => r.schoolCode.trim().toUpperCase()))
    );
    const schools = await prisma.school.findMany({
      where: { code: { in: distinctCodes } },
      select: { id: true, code: true },
    });
    const schoolIdByCode = new Map(schools.map((s) => [s.code.toUpperCase(), s.id]));
    const resolvedSchoolIds = Array.from(new Set(schoolIdByCode.values()));

    // --- Bulk-resolve class sections in a single round-trip ---
    const classSections = await prisma.classSection.findMany({
      where: {
        schoolId: { in: resolvedSchoolIds },
        className: { in: Array.from(new Set(input.records.map((r) => r.className.trim()))) },
      },
      select: { id: true, schoolId: true, className: true, academicYear: true },
    });
    const classIdByKey = new Map(
      classSections.map((c) => [
        `${c.schoolId}|${c.className.toLowerCase()}|${(c.academicYear ?? '').trim()}`,
        c.id,
      ])
    );

    // --- Bulk-resolve student codes in a single round-trip ---
    const distinctStudentCodes = Array.from(
      new Set(
        input.records
          .map((r) => r.studentId?.trim())
          .filter((c): c is string => Boolean(c))
          .map((c) => c.toUpperCase())
      )
    );
    const students = await prisma.student.findMany({
      where: { schoolId: { in: resolvedSchoolIds }, studentIdCode: { in: distinctStudentCodes } },
      select: { id: true, schoolId: true, studentIdCode: true },
    });
    const studentIdByKey = new Map(
      students.map((s) => [`${s.schoolId}|${s.studentIdCode.toUpperCase()}`, s.id])
    );

    // --- Resolve every row, bucketing survivors by (class, sessionDate) ---
    interface MarkedRow { studentId: number; status: AttendanceStatus; remarks: string | null }
    const markBuckets = new Map<string, MarkedRow[]>();
    const cancelBuckets = new Map<string, string>(); // bucketKey -> remarks

    for (let i = 0; i < input.records.length; i++) {
      const row = input.records[i];
      // +2 => 1-based header row + 1-based data row, so this matches Excel.
      const rowIndex = i + 2;

      const resolved = this.resolveUploadRow(
        row, rowIndex, schoolIdByCode, classIdByKey, studentIdByKey, errors
      );
      if (!resolved) {
        failed++;
        continue;
      }

      const bucketKey = `${resolved.classId}|${resolved.sessionDate}`;
      if (resolved.status === 'CANCELLED') {
        cancelBuckets.set(bucketKey, resolved.remarks ?? '');
      } else {
        const bucket = markBuckets.get(bucketKey) ?? [];
        bucket.push({
          studentId: resolved.studentId as number,
          status: resolved.status,
          remarks: resolved.remarks,
        });
        markBuckets.set(bucketKey, bucket);
      }
    }

    const sessionsProcessed = new Set<string>([...markBuckets.keys(), ...cancelBuckets.keys()]).size;

    // --- Class-wide cancellations first, so per-student marks win on conflict ---
    for (const [bucketKey, remarks] of cancelBuckets) {
      const [classIdStr, sessionDate] = bucketKey.split('|');
      const classId = Number(classIdStr);
      try {
        const result = await this.cancelClassSession({ classId, sessionDate, remarks });
        cancellations++;
        records.push(result.record);
      } catch (err) {
        failed++;
        errors.push({
          rowIndex: 0,
          columnName: 'status',
          invalidValue: 'CANCELLED',
          errorMessage: `Failed to cancel session ${sessionDate} for class ID ${classId}: ${
            err instanceof Error ? err.message : 'unknown error'
          }`,
          severity: 'ERROR',
        });
      }
    }

    // --- Per-student marks, chunked to respect the 200-record batch limit ---
    const CHUNK_SIZE = 200;
    for (const [bucketKey, bucketRows] of markBuckets) {
      const [classIdStr, sessionDate] = bucketKey.split('|');
      const classId = Number(classIdStr);

      for (let offset = 0; offset < bucketRows.length; offset += CHUNK_SIZE) {
        const chunk = bucketRows.slice(offset, offset + CHUNK_SIZE);
        try {
          const result = await this.batchUpsertAttendance({
            classId,
            sessionDate,
            records: chunk.map((r) => ({
              studentId: r.studentId,
              status: r.status as 'P' | 'A' | 'HALF_DAY' | 'ACTIVITY',
              remarks: r.remarks,
            })),
          });
          records.push(...result.records);
        } catch (err) {
          failed += chunk.length;
          errors.push({
            rowIndex: 0,
            columnName: 'status',
            invalidValue: chunk.length,
            errorMessage: `Failed to save ${chunk.length} attendance record(s) for class ID ${classId} on ${sessionDate}: ${
              err instanceof Error ? err.message : 'unknown error'
            }`,
            severity: 'ERROR',
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    logger.info('[AttendanceService.bulkUploadAttendance] Bulk attendance upload finished', {
      totalRows: input.records.length,
      saved: records.length,
      cancellations,
      sessionsProcessed,
      failed,
      durationMs: duration,
    });

    return {
      totalRows: input.records.length,
      created: records.length,
      skipped,
      failed,
      records,
      errors,
      cancellations,
      sessionsProcessed,
    };
  }
}
