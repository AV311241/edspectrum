import { provide } from 'inversify-binding-decorators';
import { Prisma, Student, StudentClassEnrollment, StudentStatus, EnrollmentStatus } from '@prisma/client';
import { prisma } from '../config/db.config';

export interface StudentFilterOptions {
  schoolId?: number;
  classId?: number;
  status?: StudentStatus;
  search?: string;
}

export interface StudentWithRelations extends Student {
  school?: { id: number; name: string; code: string };
  classSection?: { id: number; name: string; className: string; section: string } | null;
  enrollments?: (StudentClassEnrollment & {
    classSection?: { id: number; name: string } | null;
  })[];
}

export interface IStudentRepository {
  create(data: Prisma.StudentUncheckedCreateInput): Promise<Student>;
  findById(id: number): Promise<StudentWithRelations | null>;
  findBySchoolAndStudentIdCode(schoolId: number, studentIdCode: string): Promise<Student | null>;
  findAll(filters: StudentFilterOptions, limit: number, offset: number): Promise<StudentWithRelations[]>;
  countAll(filters: StudentFilterOptions): Promise<number>;
  update(id: number, data: Prisma.StudentUncheckedUpdateInput): Promise<Student>;
  delete(id: number): Promise<Student>;
  getActiveEnrollment(studentId: number, classSectionId?: number): Promise<StudentClassEnrollment | null>;
  enrollInClassTx(studentId: number, classSectionId: number, schoolId: number): Promise<StudentClassEnrollment>;
  unenrollFromClassTx(studentId: number, classSectionId: number): Promise<StudentClassEnrollment>;
  transferClassTx(
    studentId: number,
    fromClassSectionId: number,
    toClassSectionId: number,
    targetSchoolId: number
  ): Promise<{ previousEnrollment: StudentClassEnrollment; newEnrollment: StudentClassEnrollment }>;
  getEnrollmentHistory(studentId: number): Promise<StudentClassEnrollment[]>;
  /** Bulk lookup of existing student codes for one school, in a single query. */
  findExistingCodesForSchool(schoolId: number, codes: string[]): Promise<Set<string>>;
  /** Bulk create and return the created rows (createMany + reload; MySQL has no RETURNING). */
  createManyAndReturn(data: Prisma.StudentUncheckedCreateInput[]): Promise<Student[]>;
  /** Bulk load students with their relations for a set of ids. */
  findManyWithRelationsByIds(ids: number[]): Promise<StudentWithRelations[]>;
  /** Bulk enrol students, marking any prior active enrolment as transferred. */
  bulkEnroll(entries: { studentId: number; classSectionId: number; schoolId: number }[]): Promise<number>;
  /** Bulk set the status of many students. */
  bulkUpdateStatus(ids: number[], status: StudentStatus): Promise<number>;
}

@provide(StudentRepository)
export class StudentRepository implements IStudentRepository {
  public async create(data: Prisma.StudentUncheckedCreateInput): Promise<Student> {
    return await prisma.student.create({
      data,
    });
  }

  public async findById(id: number): Promise<StudentWithRelations | null> {
    return await prisma.student.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true, code: true } },
        classSection: { select: { id: true, name: true, className: true, section: true } },
        enrollments: {
          where: { isCurrent: true },
          include: { classSection: { select: { id: true, name: true } } },
        },
      },
    });
  }

  public async findBySchoolAndStudentIdCode(schoolId: number, studentIdCode: string): Promise<Student | null> {
    return await prisma.student.findUnique({
      where: {
        schoolId_studentIdCode: {
          schoolId,
          studentIdCode,
        },
      },
    });
  }

  public async findAll(filters: StudentFilterOptions, limit: number, offset: number): Promise<StudentWithRelations[]> {
    const whereClause: Prisma.StudentWhereInput = {};

    if (filters.schoolId) whereClause.schoolId = filters.schoolId;
    if (filters.classId) whereClause.classId = filters.classId;
    if (filters.status) whereClause.status = filters.status;
    if (filters.search) {
      whereClause.OR = [
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
        { studentIdCode: { contains: filters.search } },
      ];
    }

    return await prisma.student.findMany({
      where: whereClause,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        school: { select: { id: true, name: true, code: true } },
        classSection: { select: { id: true, name: true, className: true, section: true } },
      },
    });
  }

  public async countAll(filters: StudentFilterOptions): Promise<number> {
    const whereClause: Prisma.StudentWhereInput = {};

    if (filters.schoolId) whereClause.schoolId = filters.schoolId;
    if (filters.classId) whereClause.classId = filters.classId;
    if (filters.status) whereClause.status = filters.status;
    if (filters.search) {
      whereClause.OR = [
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
        { studentIdCode: { contains: filters.search } },
      ];
    }

    return await prisma.student.count({
      where: whereClause,
    });
  }

  public async update(id: number, data: Prisma.StudentUncheckedUpdateInput): Promise<Student> {
    return await prisma.student.update({
      where: { id },
      data,
    });
  }

  public async delete(id: number): Promise<Student> {
    return await prisma.student.delete({
      where: { id },
    });
  }

  public async getActiveEnrollment(studentId: number, classSectionId?: number): Promise<StudentClassEnrollment | null> {
    const whereClause: Prisma.StudentClassEnrollmentWhereInput = {
      studentId,
      isCurrent: true,
    };
    if (classSectionId) {
      whereClause.classSectionId = classSectionId;
    }
    return await prisma.studentClassEnrollment.findFirst({
      where: whereClause,
    });
  }

  public async enrollInClassTx(
    studentId: number,
    classSectionId: number,
    schoolId: number
  ): Promise<StudentClassEnrollment> {
    return await prisma.$transaction(async (tx) => {
      // 1. Mark active previous enrollments as non-current / TRANSFERRED
      await tx.studentClassEnrollment.updateMany({
        where: {
          studentId,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
          withdrawnDate: new Date(),
          status: EnrollmentStatus.TRANSFERRED,
        },
      });

      // 2. Upsert enrollment record to avoid unique constraint collisions
      const enrollment = await tx.studentClassEnrollment.upsert({
        where: {
          studentId_classSectionId: {
            studentId,
            classSectionId,
          },
        },
        update: {
          isCurrent: true,
          withdrawnDate: null,
          status: EnrollmentStatus.PRESENT,
          schoolId,
        },
        create: {
          studentId,
          classSectionId,
          schoolId,
          isCurrent: true,
          status: EnrollmentStatus.PRESENT,
        },
      });

      // 3. Update Student current class reference
      await tx.student.update({
        where: { id: studentId },
        data: {
          classId: classSectionId,
          schoolId,
          status: StudentStatus.ACTIVE,
        },
      });

      return enrollment;
    });
  }

  public async unenrollFromClassTx(studentId: number, classSectionId: number): Promise<StudentClassEnrollment> {
    return await prisma.$transaction(async (tx) => {
      // 1. Update enrollment record
      const enrollment = await tx.studentClassEnrollment.update({
        where: {
          studentId_classSectionId: {
            studentId,
            classSectionId,
          },
        },
        data: {
          isCurrent: false,
          withdrawnDate: new Date(),
          status: EnrollmentStatus.EXCLUDED,
        },
      });

      // 2. Update Student classId to null if currently assigned to this class
      const currentStudent = await tx.student.findUnique({
        where: { id: studentId },
        select: { classId: true },
      });

      if (currentStudent?.classId === classSectionId) {
        await tx.student.update({
          where: { id: studentId },
          data: {
            classId: null,
          },
        });
      }

      return enrollment;
    });
  }

  public async transferClassTx(
    studentId: number,
    fromClassSectionId: number,
    toClassSectionId: number,
    targetSchoolId: number
  ): Promise<{ previousEnrollment: StudentClassEnrollment; newEnrollment: StudentClassEnrollment }> {
    return await prisma.$transaction(async (tx) => {
      // 1. Mark previous enrollment as TRANSFERRED and non-current
      const previousEnrollment = await tx.studentClassEnrollment.update({
        where: {
          studentId_classSectionId: {
            studentId,
            classSectionId: fromClassSectionId,
          },
        },
        data: {
          isCurrent: false,
          withdrawnDate: new Date(),
          status: EnrollmentStatus.TRANSFERRED,
        },
      });

      // 2. Upsert new enrollment record for target class
      const newEnrollment = await tx.studentClassEnrollment.upsert({
        where: {
          studentId_classSectionId: {
            studentId,
            classSectionId: toClassSectionId,
          },
        },
        update: {
          isCurrent: true,
          withdrawnDate: null,
          status: EnrollmentStatus.PRESENT,
          schoolId: targetSchoolId,
        },
        create: {
          studentId,
          classSectionId: toClassSectionId,
          schoolId: targetSchoolId,
          isCurrent: true,
          status: EnrollmentStatus.PRESENT,
        },
      });

      // 3. Update student record with new class and school
      await tx.student.update({
        where: { id: studentId },
        data: {
          classId: toClassSectionId,
          schoolId: targetSchoolId,
          status: StudentStatus.ACTIVE,
        },
      });

      return { previousEnrollment, newEnrollment };
    });
  }

  public async getEnrollmentHistory(studentId: number): Promise<StudentClassEnrollment[]> {
    return await prisma.studentClassEnrollment.findMany({
      where: { studentId },
      include: {
        classSection: { select: { id: true, name: true, className: true, section: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findExistingCodesForSchool(schoolId: number, codes: string[]): Promise<Set<string>> {
    if (codes.length === 0) return new Set<string>();
    const rows = await prisma.student.findMany({
      where: { schoolId, studentIdCode: { in: codes } },
      select: { studentIdCode: true },
    });
    return new Set(rows.map((r) => r.studentIdCode));
  }

  public async createManyAndReturn(data: Prisma.StudentUncheckedCreateInput[]): Promise<Student[]> {
    if (data.length === 0) return [];
    // MySQL has no RETURNING clause, so `createManyAndReturn` is unavailable on
    // this connector. Insert in one statement, then reload the rows via the
    // (schoolId, studentIdCode) unique key - still O(1) queries for the batch.
    await prisma.student.createMany({ data });

    const keys = data.map((d) => ({
      schoolId: d.schoolId as number,
      studentIdCode: d.studentIdCode as string,
    }));
    const rows = await prisma.student.findMany({
      where: { OR: keys },
    });
    const byKey = new Map(rows.map((r) => [`${r.schoolId}|${r.studentIdCode}`, r]));
    return keys
      .map((k) => byKey.get(`${k.schoolId}|${k.studentIdCode}`))
      .filter((r): r is Student => r !== undefined);
  }

  public async findManyWithRelationsByIds(ids: number[]): Promise<StudentWithRelations[]> {
    if (ids.length === 0) return [];
    return await prisma.student.findMany({
      where: { id: { in: ids } },
      include: {
        school: { select: { id: true, name: true, code: true } },
        classSection: { select: { id: true, name: true, className: true, section: true } },
        enrollments: {
          where: { isCurrent: true },
          include: { classSection: { select: { id: true, name: true } } },
        },
      },
    });
  }

  /**
   * Bulk enrol in one transaction: first retire any current enrolments for the
   * affected students, then upsert the new ones, then point each student row at
   * its new class. Batching replaces the per-row `enrollInClassTx` fan-out.
   */
  public async bulkEnroll(
    entries: { studentId: number; classSectionId: number; schoolId: number }[]
  ): Promise<number> {
    if (entries.length === 0) return 0;
    const studentIds = [...new Set(entries.map((e) => e.studentId))];

    return await prisma.$transaction(async (tx) => {
      // 1. Retire any current enrolment so each student has at most one active class.
      await tx.studentClassEnrollment.updateMany({
        where: { studentId: { in: studentIds }, isCurrent: true },
        data: {
          isCurrent: false,
          withdrawnDate: new Date(),
          status: EnrollmentStatus.TRANSFERRED,
        },
      });

      // 2. Upsert the target enrolment for every entry.
      await Promise.all(
        entries.map((e) =>
          tx.studentClassEnrollment.upsert({
            where: {
              studentId_classSectionId: { studentId: e.studentId, classSectionId: e.classSectionId },
            },
            update: {
              isCurrent: true,
              withdrawnDate: null,
              status: EnrollmentStatus.PRESENT,
              schoolId: e.schoolId,
            },
            create: {
              studentId: e.studentId,
              classSectionId: e.classSectionId,
              schoolId: e.schoolId,
              isCurrent: true,
              status: EnrollmentStatus.PRESENT,
            },
          })
        )
      );

      // 3. Point each student at its new class. Status is intentionally NOT set
      //    here so an upload that created INACTIVE students keeps that status.
      await Promise.all(
        entries.map((e) =>
          tx.student.update({
            where: { id: e.studentId },
            data: { classId: e.classSectionId, schoolId: e.schoolId },
          })
        )
      );

      return entries.length;
    });
  }

  public async bulkUpdateStatus(ids: number[], status: StudentStatus): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await prisma.student.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    return result.count;
  }
}
