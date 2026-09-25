import { provide } from 'inversify-binding-decorators';
import { Attendance, AttendanceStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/db.config';

export interface AttendanceFilterOptions {
  classId?: number;
  studentId?: number;
  sessionDate?: Date;
  fromDate?: Date;
  toDate?: Date;
  status?: AttendanceStatus;
}

export interface AttendanceWithRelations extends Attendance {
  classSection?: { id: number; name: string; className: string; section: string };
  student?: { id: number; studentIdCode: string; firstName: string; lastName: string } | null;
}

export interface StudentAttendanceUpsertInput {
  classSectionId: number;
  studentId: number;
  sessionDate: Date;
  status: AttendanceStatus;
  remarks: string | null;
}

export interface IAttendanceRepository {
  findById(id: bigint): Promise<AttendanceWithRelations | null>;
  findAll(filters: AttendanceFilterOptions, limit: number, offset: number): Promise<AttendanceWithRelations[]>;
  countAll(filters: AttendanceFilterOptions): Promise<number>;
  findByClassAndDate(classSectionId: number, sessionDate: Date): Promise<AttendanceWithRelations[]>;
  findClassCancellation(classSectionId: number, sessionDate: Date): Promise<Attendance | null>;
  findInDateRange(classSectionId: number, start: Date, end: Date): Promise<Attendance[]>;
  update(id: bigint, data: Prisma.AttendanceUncheckedUpdateInput): Promise<Attendance>;
  delete(id: bigint): Promise<Attendance>;
  upsertStudentRecords(records: StudentAttendanceUpsertInput[]): Promise<Attendance[]>;
  cancelClassSession(
    classSectionId: number,
    sessionDate: Date,
    remarks: string
  ): Promise<{ cancellation: Attendance; removedStudentRecords: number }>;
  uncancelClassSession(classSectionId: number, sessionDate: Date): Promise<number>;
}

@provide(AttendanceRepository)
export class AttendanceRepository implements IAttendanceRepository {
  private buildWhere(filters: AttendanceFilterOptions): Prisma.AttendanceWhereInput {
    const where: Prisma.AttendanceWhereInput = {};

    if (filters.classId) where.classSectionId = filters.classId;
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.status) where.status = filters.status;

    if (filters.sessionDate) {
      where.sessionDate = filters.sessionDate;
    } else if (filters.fromDate || filters.toDate) {
      where.sessionDate = {};
      if (filters.fromDate) where.sessionDate.gte = filters.fromDate;
      if (filters.toDate) where.sessionDate.lte = filters.toDate;
    }

    return where;
  }

  public async findById(id: bigint): Promise<AttendanceWithRelations | null> {
    return await prisma.attendance.findUnique({
      where: { id },
      include: {
        classSection: { select: { id: true, name: true, className: true, section: true } },
        student: { select: { id: true, studentIdCode: true, firstName: true, lastName: true } },
      },
    });
  }

  public async findAll(
    filters: AttendanceFilterOptions,
    limit: number,
    offset: number
  ): Promise<AttendanceWithRelations[]> {
    return await prisma.attendance.findMany({
      where: this.buildWhere(filters),
      take: limit,
      skip: offset,
      orderBy: [{ sessionDate: 'desc' }, { id: 'desc' }],
      include: {
        classSection: { select: { id: true, name: true, className: true, section: true } },
        student: { select: { id: true, studentIdCode: true, firstName: true, lastName: true } },
      },
    });
  }

  public async countAll(filters: AttendanceFilterOptions): Promise<number> {
    return await prisma.attendance.count({
      where: this.buildWhere(filters),
    });
  }

  public async findByClassAndDate(classSectionId: number, sessionDate: Date): Promise<AttendanceWithRelations[]> {
    return await prisma.attendance.findMany({
      where: { classSectionId, sessionDate },
      include: {
        classSection: { select: { id: true, name: true, className: true, section: true } },
        student: { select: { id: true, studentIdCode: true, firstName: true, lastName: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  public async findClassCancellation(classSectionId: number, sessionDate: Date): Promise<Attendance | null> {
    return await prisma.attendance.findFirst({
      where: {
        classSectionId,
        sessionDate,
        studentId: null,
        status: AttendanceStatus.CANCELLED,
      },
    });
  }

  public async findInDateRange(classSectionId: number, start: Date, end: Date): Promise<Attendance[]> {
    return await prisma.attendance.findMany({
      where: {
        classSectionId,
        sessionDate: { gte: start, lte: end },
      },
      orderBy: { sessionDate: 'asc' },
    });
  }

  public async update(id: bigint, data: Prisma.AttendanceUncheckedUpdateInput): Promise<Attendance> {
    return await prisma.attendance.update({
      where: { id },
      data,
    });
  }

  public async delete(id: bigint): Promise<Attendance> {
    return await prisma.attendance.delete({
      where: { id },
    });
  }

  public async upsertStudentRecords(records: StudentAttendanceUpsertInput[]): Promise<Attendance[]> {
    return await prisma.$transaction(async (tx) => {
      const upserted: Attendance[] = [];

      for (const record of records) {
        const existing = await tx.attendance.findFirst({
          where: {
            sessionDate: record.sessionDate,
            classSectionId: record.classSectionId,
            studentId: record.studentId,
          },
        });

        if (existing) {
          const updated = await tx.attendance.update({
            where: { id: existing.id },
            data: {
              status: record.status,
              remarks: record.remarks,
            },
          });
          upserted.push(updated);
        } else {
          const created = await tx.attendance.create({
            data: {
              sessionDate: record.sessionDate,
              classSectionId: record.classSectionId,
              studentId: record.studentId,
              status: record.status,
              remarks: record.remarks,
            },
          });
          upserted.push(created);
        }
      }

      return upserted;
    });
  }

  public async cancelClassSession(
    classSectionId: number,
    sessionDate: Date,
    remarks: string
  ): Promise<{ cancellation: Attendance; removedStudentRecords: number }> {
    return await prisma.$transaction(async (tx) => {
      const deleted = await tx.attendance.deleteMany({
        where: {
          classSectionId,
          sessionDate,
          studentId: { not: null },
        },
      });

      const existingCancellation = await tx.attendance.findFirst({
        where: {
          classSectionId,
          sessionDate,
          studentId: null,
        },
      });

      const cancellation = existingCancellation
        ? await tx.attendance.update({
            where: { id: existingCancellation.id },
            data: {
              status: AttendanceStatus.CANCELLED,
              remarks,
            },
          })
        : await tx.attendance.create({
            data: {
              classSectionId,
              sessionDate,
              studentId: null,
              status: AttendanceStatus.CANCELLED,
              remarks,
            },
          });

      return { cancellation, removedStudentRecords: deleted.count };
    });
  }

  public async uncancelClassSession(classSectionId: number, sessionDate: Date): Promise<number> {
    const result = await prisma.attendance.deleteMany({
      where: {
        classSectionId,
        sessionDate,
        studentId: null,
        status: AttendanceStatus.CANCELLED,
      },
    });
    return result.count;
  }
}