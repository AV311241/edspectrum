import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { prisma } from '../config/db.config';
import { ClassService } from './class.service';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';
import {
  CreateSchoolClassInput,
  CreateSchoolInput,
  SchoolClassesResponseDTO,
  SchoolClassDTO,
  SchoolSummaryDTO,
} from '../dtos/school.dto';

@provide(SchoolService)
export class SchoolService {
  constructor(@inject(ClassService) private classService: ClassService) {}

  public async listSchools(): Promise<SchoolSummaryDTO[]> {
    return prisma.school.findMany({
      select: { id: true, code: true, name: true, status: true },
      orderBy: { name: 'asc' },
    });
  }

  public async createSchool(input: CreateSchoolInput): Promise<SchoolSummaryDTO> {
    const creator = await prisma.user.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    if (!creator) {
      throw new AppError('An active user is required to create a school', HttpStatusCode.BAD_REQUEST);
    }

    return prisma.school.create({
      data: {
        code: input.code,
        name: input.name,
        createdById: creator.id,
      },
      select: { id: true, code: true, name: true, status: true },
    });
  }

  public async getClassesBySchool(schoolId: number): Promise<SchoolClassesResponseDTO> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, code: true, name: true },
    });
    if (!school) {
      throw new AppError(`School with ID ${schoolId} not found`, HttpStatusCode.NOT_FOUND);
    }

    const classes = await prisma.classSection.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        academicYear: true,
        createdAt: true,
        _count: { select: { studentEnrollments: { where: { isCurrent: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    return {
      school,
      classes: classes.map((classSection): SchoolClassDTO => ({
        id: classSection.id,
        className: classSection.name,
        academicYear: classSection.academicYear,
        totalStudents: classSection._count.studentEnrollments,
        createdAt: classSection.createdAt.toISOString(),
      })),
    };
  }

  public async createClass(
    schoolId: number,
    input: CreateSchoolClassInput
  ): Promise<SchoolClassDTO> {
    const schoolExists = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });
    if (!schoolExists) {
      throw new AppError(`School with ID ${schoolId} not found`, HttpStatusCode.NOT_FOUND);
    }

    const normalized = input.className.trim();
    const gradeAndSection = normalized.match(/^(\d+)\s*[- ]?\s*([A-Za-z0-9]{1,10})$/);
    let gradeId: number | null = null;
    let className = normalized;
    let section = normalized.slice(0, 10);

    if (gradeAndSection) {
      const gradeNumber = Number(gradeAndSection[1]);
      const grade = await prisma.grade.upsert({
        where: { schoolId_number: { schoolId, number: gradeNumber } },
        create: { schoolId, number: gradeNumber, name: `Grade ${gradeNumber}` },
        update: {},
        select: { id: true },
      });
      gradeId = grade.id;
      className = String(gradeNumber);
      section = gradeAndSection[2].toUpperCase();
    }

    const created = await this.classService.createClass({
      schoolId,
      gradeId,
      className,
      section,
      name: normalized,
      academicYear: input.academicYear,
    });

    return {
      id: created.id,
      className: created.name,
      academicYear: created.academicYear,
      totalStudents: created.enrolledCount,
      createdAt: created.createdAt,
    };
  }
}