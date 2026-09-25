import { provide } from 'inversify-binding-decorators';
import { Prisma, ClassSection, ClassStatus, Gender, StudentStatus } from '@prisma/client';
import { prisma } from '../config/db.config';

export interface ClassFilterOptions {
  schoolId?: number;
  gradeId?: number;
  status?: ClassStatus;
  academicYear?: string;
  search?: string;
}

export interface ClassWithRelations extends ClassSection {
  school?: { id: number; name: string; code: string };
  grade?: { id: number; name: string; number: number } | null;
  _count?: {
    studentEnrollments?: number;
  };
}

export interface EnrolledStudentDetail {
  id: number;
  studentIdCode: string;
  firstName: string;
  lastName: string;
  gender: Gender | null;
  status: StudentStatus;
  enrolledAt: Date;
}

export interface IClassRepository {
  create(data: Prisma.ClassSectionUncheckedCreateInput): Promise<ClassSection>;
  findById(id: number): Promise<ClassWithRelations | null>;
  findBySchoolGradeSection(schoolId: number, gradeId: number | null, section: string): Promise<ClassSection | null>;
  findAll(filters: ClassFilterOptions, limit: number, offset: number): Promise<ClassWithRelations[]>;
  countAll(filters: ClassFilterOptions): Promise<number>;
  update(id: number, data: Prisma.ClassSectionUncheckedUpdateInput): Promise<ClassSection>;
  delete(id: number): Promise<ClassSection>;
  getEnrolledCount(classSectionId: number): Promise<number>;
  getEnrolledStudents(classSectionId: number, limit: number, offset: number): Promise<{ records: EnrolledStudentDetail[]; total: number }>;
  listActiveEnrolledStudents(classSectionId: number): Promise<EnrolledStudentDetail[]>;
}

@provide(ClassRepository)
export class ClassRepository implements IClassRepository {
  public async create(data: Prisma.ClassSectionUncheckedCreateInput): Promise<ClassSection> {
    return await prisma.classSection.create({
      data,
    });
  }

  public async findById(id: number): Promise<ClassWithRelations | null> {
    return await prisma.classSection.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true, code: true } },
        grade: { select: { id: true, name: true, number: true } },
        _count: {
          select: {
            studentEnrollments: { where: { isCurrent: true } },
          },
        },
      },
    });
  }

  public async findBySchoolGradeSection(
    schoolId: number,
    gradeId: number | null,
    section: string
  ): Promise<ClassSection | null> {
    if (gradeId !== null) {
      return await prisma.classSection.findUnique({
        where: {
          schoolId_gradeId_section: {
            schoolId,
            gradeId,
            section,
          },
        },
      });
    }

    return await prisma.classSection.findFirst({
      where: {
        schoolId,
        gradeId: null,
        section,
      },
    });
  }

  public async findAll(filters: ClassFilterOptions, limit: number, offset: number): Promise<ClassWithRelations[]> {
    const whereClause: Prisma.ClassSectionWhereInput = {};

    if (filters.schoolId) whereClause.schoolId = filters.schoolId;
    if (filters.gradeId) whereClause.gradeId = filters.gradeId;
    if (filters.status) whereClause.status = filters.status;
    if (filters.academicYear) whereClause.academicYear = filters.academicYear;
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search } },
        { className: { contains: filters.search } },
        { section: { contains: filters.search } },
      ];
    }

    return await prisma.classSection.findMany({
      where: whereClause,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        school: { select: { id: true, name: true, code: true } },
        grade: { select: { id: true, name: true, number: true } },
        _count: {
          select: {
            studentEnrollments: { where: { isCurrent: true } },
          },
        },
      },
    });
  }

  public async countAll(filters: ClassFilterOptions): Promise<number> {
    const whereClause: Prisma.ClassSectionWhereInput = {};

    if (filters.schoolId) whereClause.schoolId = filters.schoolId;
    if (filters.gradeId) whereClause.gradeId = filters.gradeId;
    if (filters.status) whereClause.status = filters.status;
    if (filters.academicYear) whereClause.academicYear = filters.academicYear;
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search } },
        { className: { contains: filters.search } },
        { section: { contains: filters.search } },
      ];
    }

    return await prisma.classSection.count({
      where: whereClause,
    });
  }

  public async update(id: number, data: Prisma.ClassSectionUncheckedUpdateInput): Promise<ClassSection> {
    return await prisma.classSection.update({
      where: { id },
      data,
    });
  }

  public async delete(id: number): Promise<ClassSection> {
    return await prisma.classSection.delete({
      where: { id },
    });
  }

  public async getEnrolledCount(classSectionId: number): Promise<number> {
    return await prisma.studentClassEnrollment.count({
      where: {
        classSectionId,
        isCurrent: true,
      },
    });
  }

  public async getEnrolledStudents(
    classSectionId: number,
    limit: number,
    offset: number
  ): Promise<{ records: EnrolledStudentDetail[]; total: number }> {
    const total = await prisma.studentClassEnrollment.count({
      where: { classSectionId, isCurrent: true },
    });

    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: { classSectionId, isCurrent: true },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            studentIdCode: true,
            firstName: true,
            lastName: true,
            gender: true,
            status: true,
          },
        },
      },
    });

    const records: EnrolledStudentDetail[] = enrollments.map((e) => ({
      id: e.student.id,
      studentIdCode: e.student.studentIdCode,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      gender: e.student.gender,
      status: e.student.status,
      enrolledAt: e.createdAt,
    }));

    return { records, total };
  }

  public async listActiveEnrolledStudents(classSectionId: number): Promise<EnrolledStudentDetail[]> {
    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: { classSectionId, isCurrent: true },
      orderBy: { createdAt: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            studentIdCode: true,
            firstName: true,
            lastName: true,
            gender: true,
            status: true,
          },
        },
      },
    });

    return enrollments.map((e) => ({
      id: e.student.id,
      studentIdCode: e.student.studentIdCode,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      gender: e.student.gender,
      status: e.student.status,
      enrolledAt: e.createdAt,
    }));
  }
}
