import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { ClassRepository, IClassRepository, ClassWithRelations } from '../repositories/class.repository';
import { prisma } from '../config/db.config';
import {
  CreateClassInput,
  UpdateClassInput,
  ClassFilterQuery,
  ClassResponseDTO,
  PaginatedClassResponseDTO,
  EnrolledStudentSummaryDTO,
} from '../dtos/class.dto';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';
import { logger } from '../config/logger.config';
import { sanitizePII } from '../utils/sanitizer.utils';
import {
  BatchClassUploadInput,
  BatchClassUploadResultDTO,
} from '../dtos/class-upload.dto';
import { RowErrorDTO } from '../dtos/upload-common.dto';

@provide(ClassService)
export class ClassService {
  constructor(
    @inject(ClassRepository) private classRepo: IClassRepository
  ) {}

  private mapToDTO(cls: ClassWithRelations): ClassResponseDTO {
    const enrolledCount = cls._count?.studentEnrollments ?? 0;
    const capacity = cls.capacity ?? 40;
    const availableSeats = Math.max(0, capacity - enrolledCount);

    return {
      id: cls.id,
      schoolId: cls.schoolId,
      gradeId: cls.gradeId,
      className: cls.className,
      section: cls.section,
      name: cls.name,
      academicYear: cls.academicYear,
      status: cls.status,
      assessmentCycle: cls.assessmentCycle,
      capacity,
      enrolledCount,
      availableSeats,
      createdAt: cls.createdAt.toISOString(),
      updatedAt: cls.updatedAt.toISOString(),
      createdById: cls.createdById,
      schoolName: cls.school?.name,
      gradeName: cls.grade?.name,
    };
  }

  public async createClass(input: CreateClassInput): Promise<ClassResponseDTO> {
    const startTime = Date.now();
    logger.info('[ClassService.createClass] Initiating class creation', {
      payload: sanitizePII(input),
    });

    // 1. Verify school exists
    const school = await prisma.school.findUnique({ where: { id: input.schoolId } });
    if (!school) {
      throw new AppError(`School with ID ${input.schoolId} not found`, HttpStatusCode.NOT_FOUND);
    }

    // 2. If gradeId provided, verify grade exists and belongs to the school
    if (input.gradeId) {
      const grade = await prisma.grade.findUnique({ where: { id: input.gradeId } });
      if (!grade) {
        throw new AppError(`Grade with ID ${input.gradeId} not found`, HttpStatusCode.NOT_FOUND);
      }
      if (grade.schoolId !== input.schoolId) {
        throw new AppError(
          `Grade ID ${input.gradeId} does not belong to School ID ${input.schoolId}`,
          HttpStatusCode.BAD_REQUEST
        );
      }
    }

    // 3. Verify unique section per school & grade
    const existing = await this.classRepo.findBySchoolGradeSection(
      input.schoolId,
      input.gradeId ?? null,
      input.section
    );
    if (existing) {
      throw new AppError(
        `Class section '${input.section}' already exists for school ${input.schoolId} and specified grade`,
        HttpStatusCode.CONFLICT
      );
    }

    // 4. Create class
    const createdClass = await this.classRepo.create({
      schoolId: input.schoolId,
      gradeId: input.gradeId ?? null,
      className: input.className,
      section: input.section,
      name: input.name,
      academicYear: input.academicYear ?? null,
      assessmentCycle: input.assessmentCycle ?? 'DEFAULT',
      capacity: input.capacity ?? 40,
      createdById: input.createdById ?? 1,
    });

    const duration = Date.now() - startTime;
    logger.info('[ClassService.createClass] Class section created successfully', {
      classId: createdClass.id,
      durationMs: duration,
    });

    const refreshed = await this.classRepo.findById(createdClass.id);
    return this.mapToDTO(refreshed!);
  }

  public async getClassById(id: number): Promise<ClassResponseDTO> {
    const cls = await this.classRepo.findById(id);
    if (!cls) {
      throw new AppError(`Class section with ID ${id} not found`, HttpStatusCode.NOT_FOUND);
    }
    return this.mapToDTO(cls);
  }

  public async listClasses(query: ClassFilterQuery): Promise<PaginatedClassResponseDTO> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const [classes, total] = await Promise.all([
      this.classRepo.findAll(query, limit, offset),
      this.classRepo.countAll(query),
    ]);

    return {
      records: classes.map((c) => this.mapToDTO(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async updateClass(id: number, input: UpdateClassInput): Promise<ClassResponseDTO> {
    const startTime = Date.now();
    const existing = await this.classRepo.findById(id);
    if (!existing) {
      throw new AppError(`Class section with ID ${id} not found`, HttpStatusCode.NOT_FOUND);
    }

    const targetSchoolId = input.schoolId ?? existing.schoolId;
    const targetGradeId = input.gradeId !== undefined ? input.gradeId : existing.gradeId;
    const targetSection = input.section ?? existing.section;

    if (
      targetSchoolId !== existing.schoolId ||
      targetGradeId !== existing.gradeId ||
      targetSection !== existing.section
    ) {
      const duplicate = await this.classRepo.findBySchoolGradeSection(
        targetSchoolId,
        targetGradeId,
        targetSection
      );
      if (duplicate && duplicate.id !== id) {
        throw new AppError(
          `Class section '${targetSection}' already exists for school ${targetSchoolId}`,
          HttpStatusCode.CONFLICT
        );
      }
    }

    // Capacity safeguard: if decreasing capacity below current enrolled count
    if (input.capacity !== undefined) {
      const currentEnrolledCount = await this.classRepo.getEnrolledCount(id);
      if (input.capacity < currentEnrolledCount) {
        throw new AppError(
          `Cannot reduce class capacity to ${input.capacity} because ${currentEnrolledCount} students are currently enrolled`,
          HttpStatusCode.BAD_REQUEST
        );
      }
    }

    const updateData: any = {};
    if (input.schoolId !== undefined) updateData.schoolId = input.schoolId;
    if (input.gradeId !== undefined) updateData.gradeId = input.gradeId;
    if (input.className !== undefined) updateData.className = input.className;
    if (input.section !== undefined) updateData.section = input.section;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.academicYear !== undefined) updateData.academicYear = input.academicYear;
    if (input.assessmentCycle !== undefined) updateData.assessmentCycle = input.assessmentCycle;
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    if (input.status !== undefined) updateData.status = input.status;

    await this.classRepo.update(id, updateData);

    const duration = Date.now() - startTime;
    logger.info('[ClassService.updateClass] Class section updated successfully', {
      classId: id,
      durationMs: duration,
    });

    const refreshed = await this.classRepo.findById(id);
    return this.mapToDTO(refreshed!);
  }

  public async deleteClass(id: number): Promise<{ success: boolean; message: string }> {
    const existing = await this.classRepo.findById(id);
    if (!existing) {
      throw new AppError(`Class section with ID ${id} not found`, HttpStatusCode.NOT_FOUND);
    }

    // Safeguard: Check if class section has active enrolled students
    const enrolledCount = await this.classRepo.getEnrolledCount(id);
    if (enrolledCount > 0) {
      throw new AppError(
        `Cannot delete class section ID ${id} because it currently has ${enrolledCount} active enrolled students. Unenroll or transfer students first.`,
        HttpStatusCode.CONFLICT
      );
    }

    await this.classRepo.delete(id);

    logger.info('[ClassService.deleteClass] Class section deleted', { classId: id });
    return { success: true, message: `Class section ${id} deleted successfully` };
  }

  public async getEnrolledStudents(
    classSectionId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ records: EnrolledStudentSummaryDTO[]; total: number; page: number; totalPages: number }> {
    const existing = await this.classRepo.findById(classSectionId);
    if (!existing) {
      throw new AppError(`Class section with ID ${classSectionId} not found`, HttpStatusCode.NOT_FOUND);
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const { records, total } = await this.classRepo.getEnrolledStudents(classSectionId, safeLimit, offset);

    const summaryList: EnrolledStudentSummaryDTO[] = records.map((r) => ({
      id: r.id,
      studentIdCode: r.studentIdCode,
      firstName: r.firstName,
      lastName: r.lastName,
      gender: r.gender,
      status: r.status,
      enrolledAt: r.enrolledAt.toISOString(),
    }));

    return {
      records: summaryList,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  /**
   * Bulk create Class Sections from a code-based Excel upload.
   *
   * Unlike `createClass`, this accepts human-facing `schoolCode` values and
   * resolves them to `School.id` internally. Each row is processed
   * independently so a single bad row never aborts the whole upload — failures
   * are collected as row-scoped errors and returned to the client for display in
   * the same error matrix used for client-side validation failures.
   */
  public async batchUploadClasses(input: BatchClassUploadInput): Promise<BatchClassUploadResultDTO> {
    const startTime = Date.now();
    logger.info('[ClassService.batchUploadClasses] Starting bulk class upload', {
      rowCount: input.classes.length,
    });

    const createdById = input.createdById ?? 1;
    const errors: RowErrorDTO[] = [];
    const records: ClassResponseDTO[] = [];
    let failed = 0;
    let skipped = 0;

    // Resolve every distinct schoolCode in one round-trip instead of N queries.
    const distinctCodes = Array.from(new Set(input.classes.map((c) => c.schoolCode)));
    const schools = await prisma.school.findMany({
      where: { code: { in: distinctCodes } },
      select: { id: true, code: true, name: true },
    });
    const schoolIdByCode = new Map(schools.map((s) => [s.code.toUpperCase(), s]));

    for (let i = 0; i < input.classes.length; i++) {
      const row = input.classes[i];
      // +2 => 1-based header row + 1-based data row, so this matches Excel.
      const rowIndex = i + 2;

      try {
        const school = schoolIdByCode.get(row.schoolCode.trim().toUpperCase());
        if (!school) {
          failed++;
          errors.push({
            rowIndex,
            columnName: 'schoolCode',
            invalidValue: row.schoolCode,
            errorMessage: `No school found with code "${row.schoolCode}". Create the school first, then re-upload.`,
            severity: 'ERROR',
          });
          continue;
        }

        // `section` and `name` are NOT NULL in the schema but are not part of the
        // spreadsheet contract, so derive sensible defaults.
        const section = row.section?.trim() || 'A';
        const name = row.name?.trim() || `${school.code} ${row.className.trim()}`;

        const existing = await this.classRepo.findBySchoolGradeSection(school.id, null, section);
        if (existing) {
          skipped++;
          errors.push({
            rowIndex,
            columnName: 'className',
            invalidValue: row.className,
            errorMessage: `A class section "${section}" already exists for school "${school.code}". Row skipped.`,
            severity: 'WARNING',
          });
          continue;
        }

        const created = await this.classRepo.create({
          schoolId: school.id,
          gradeId: null,
          className: row.className.trim(),
          section,
          name,
          academicYear: row.academicYear.trim(),
          assessmentCycle: 'DEFAULT',
          capacity: row.capacity ?? 40,
          createdById,
        });

        const refreshed = await this.classRepo.findById(created.id);
        if (refreshed) records.push(this.mapToDTO(refreshed));
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : 'Unexpected error while creating class';
        errors.push({
          rowIndex,
          columnName: 'className',
          invalidValue: row.className,
          errorMessage: message,
          severity: 'ERROR',
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('[ClassService.batchUploadClasses] Bulk class upload finished', {
      totalRows: input.classes.length,
      created: records.length,
      skipped,
      failed,
      durationMs: duration,
    });

    return {
      totalRows: input.classes.length,
      created: records.length,
      skipped,
      failed,
      records,
      errors,
    };
  }
}
