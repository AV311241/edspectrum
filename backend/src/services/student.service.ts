import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { StudentRepository, IStudentRepository, StudentWithRelations } from '../repositories/student.repository';
import { ClassRepository, IClassRepository } from '../repositories/class.repository';
import { prisma } from '../config/db.config';
import {
  CreateStudentInput,
  UpdateStudentInput,
  StudentFilterQuery,
  StudentResponseDTO,
  PaginatedStudentResponseDTO,
  EnrollmentRecordDTO,
} from '../dtos/student.dto';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';
import { logger } from '../config/logger.config';
import { sanitizePII } from '../utils/sanitizer.utils';
import { ClassStatus, StudentStatus } from '@prisma/client';
import {
  BatchStudentUploadInput,
  BatchStudentUploadResultDTO,
} from '../dtos/student-upload.dto';
import { RowErrorDTO } from '../dtos/upload-common.dto';

@provide(StudentService)
export class StudentService {
  constructor(
    @inject(StudentRepository) private studentRepo: IStudentRepository,
    @inject(ClassRepository) private classRepo: IClassRepository
  ) {}

  private mapToDTO(student: StudentWithRelations): StudentResponseDTO {
    const activeEnrollment = student.enrollments && student.enrollments.length > 0 ? student.enrollments[0] : null;

    const currentEnrollmentDTO: EnrollmentRecordDTO | null = activeEnrollment
      ? {
          id: activeEnrollment.id,
          studentId: activeEnrollment.studentId,
          classSectionId: activeEnrollment.classSectionId,
          schoolId: activeEnrollment.schoolId,
          withdrawnDate: activeEnrollment.withdrawnDate ? activeEnrollment.withdrawnDate.toISOString() : null,
          status: activeEnrollment.status,
          isCurrent: activeEnrollment.isCurrent,
          createdAt: activeEnrollment.createdAt.toISOString(),
          className: (activeEnrollment as any).classSection?.name ?? undefined,
        }
      : null;

    return {
      id: student.id,
      schoolId: student.schoolId,
      classId: student.classId,
      studentIdCode: student.studentIdCode,
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split('T')[0] : null,
      gender: student.gender,
      status: student.status,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      createdById: student.createdById,
      schoolName: student.school?.name,
      className: student.classSection?.name,
      currentEnrollment: currentEnrollmentDTO,
    };
  }

  public async createStudent(input: CreateStudentInput): Promise<StudentResponseDTO> {
    const startTime = Date.now();
    logger.info('[StudentService.createStudent] Initiating student creation', {
      payload: sanitizePII(input),
    });

    // 1. Verify school exists
    const school = await prisma.school.findUnique({ where: { id: input.schoolId } });
    if (!school) {
      throw new AppError(`School with ID ${input.schoolId} not found`, HttpStatusCode.NOT_FOUND);
    }

    // 2. Verify studentIdCode unique per school
    const existing = await this.studentRepo.findBySchoolAndStudentIdCode(input.schoolId, input.studentIdCode);
    if (existing) {
      throw new AppError(
        `Student code '${input.studentIdCode}' already exists in school ${input.schoolId}`,
        HttpStatusCode.CONFLICT
      );
    }

    // 3. If classId provided, check existence and capacity
    if (input.classId) {
      const targetClass = await this.classRepo.findById(input.classId);
      if (!targetClass) {
        throw new AppError(`Class with ID ${input.classId} not found`, HttpStatusCode.NOT_FOUND);
      }
      if (targetClass.status !== ClassStatus.ACTIVE) {
        throw new AppError(`Class with ID ${input.classId} is not active`, HttpStatusCode.BAD_REQUEST);
      }

      const enrolledCount = await this.classRepo.getEnrolledCount(input.classId);
      if (enrolledCount >= targetClass.capacity) {
        throw new AppError(
          `Class '${targetClass.name}' has reached its maximum capacity of ${targetClass.capacity} students`,
          HttpStatusCode.CONFLICT
        );
      }
    }

    // 4. Create student
    const createdStudent = await this.studentRepo.create({
      schoolId: input.schoolId,
      studentIdCode: input.studentIdCode,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      gender: input.gender ?? null,
      classId: input.classId ?? null,
      createdById: input.createdById ?? 1,
    });

    // 5. If initial classId was provided, enroll student
    if (input.classId) {
      await this.studentRepo.enrollInClassTx(createdStudent.id, input.classId, input.schoolId);
    }

    const duration = Date.now() - startTime;
    logger.info('[StudentService.createStudent] Student created successfully', {
      studentId: createdStudent.id,
      durationMs: duration,
    });

    const refreshed = await this.studentRepo.findById(createdStudent.id);
    return this.mapToDTO(refreshed!);
  }

  public async getStudentById(id: number): Promise<StudentResponseDTO> {
    const student = await this.studentRepo.findById(id);
    if (!student) {
      throw new AppError(`Student with ID ${id} not found`, HttpStatusCode.NOT_FOUND);
    }
    return this.mapToDTO(student);
  }

  public async listStudents(query: StudentFilterQuery): Promise<PaginatedStudentResponseDTO> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const [students, total] = await Promise.all([
      this.studentRepo.findAll(query, limit, offset),
      this.studentRepo.countAll(query),
    ]);

    return {
      records: students.map((s) => this.mapToDTO(s)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async updateStudent(id: number, input: UpdateStudentInput): Promise<StudentResponseDTO> {
    const startTime = Date.now();
    const existing = await this.studentRepo.findById(id);
    if (!existing) {
      throw new AppError(`Student with ID ${id} not found`, HttpStatusCode.NOT_FOUND);
    }

    if (input.schoolId && input.schoolId !== existing.schoolId) {
      const school = await prisma.school.findUnique({ where: { id: input.schoolId } });
      if (!school) {
        throw new AppError(`School with ID ${input.schoolId} not found`, HttpStatusCode.NOT_FOUND);
      }
    }

    if (input.studentIdCode && input.studentIdCode !== existing.studentIdCode) {
      const schoolId = input.schoolId ?? existing.schoolId;
      const duplicate = await this.studentRepo.findBySchoolAndStudentIdCode(schoolId, input.studentIdCode);
      if (duplicate) {
        throw new AppError(
          `Student code '${input.studentIdCode}' already exists in school ${schoolId}`,
          HttpStatusCode.CONFLICT
        );
      }
    }

    const updateData: any = {};
    if (input.schoolId !== undefined) updateData.schoolId = input.schoolId;
    if (input.studentIdCode !== undefined) updateData.studentIdCode = input.studentIdCode;
    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.dateOfBirth !== undefined)
      updateData.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
    if (input.gender !== undefined) updateData.gender = input.gender;
    if (input.status !== undefined) updateData.status = input.status;

    await this.studentRepo.update(id, updateData);

    const duration = Date.now() - startTime;
    logger.info('[StudentService.updateStudent] Student updated successfully', {
      studentId: id,
      durationMs: duration,
    });

    const refreshed = await this.studentRepo.findById(id);
    return this.mapToDTO(refreshed!);
  }

  public async deleteStudent(id: number): Promise<{ success: boolean; message: string }> {
    const existing = await this.studentRepo.findById(id);
    if (!existing) {
      throw new AppError(`Student with ID ${id} not found`, HttpStatusCode.NOT_FOUND);
    }

    await this.studentRepo.delete(id);

    logger.info('[StudentService.deleteStudent] Student deleted', { studentId: id });
    return { success: true, message: `Student ${id} deleted successfully` };
  }

  public async enrollStudent(studentId: number, classSectionId: number): Promise<StudentResponseDTO> {
    const startTime = Date.now();
    logger.info('[StudentService.enrollStudent] Processing enrollment', { studentId, classSectionId });

    // 1. Verify student exists and is active
    const student = await this.studentRepo.findById(studentId);
    if (!student) {
      throw new AppError(`Student with ID ${studentId} not found`, HttpStatusCode.NOT_FOUND);
    }
    if (student.status === StudentStatus.INACTIVE) {
      throw new AppError(`Cannot enroll inactive student ID ${studentId}`, HttpStatusCode.BAD_REQUEST);
    }

    // 2. Verify target class exists and is active
    const targetClass = await this.classRepo.findById(classSectionId);
    if (!targetClass) {
      throw new AppError(`Class with ID ${classSectionId} not found`, HttpStatusCode.NOT_FOUND);
    }
    if (targetClass.status !== ClassStatus.ACTIVE) {
      throw new AppError(`Class '${targetClass.name}' is inactive and cannot accept enrollments`, HttpStatusCode.BAD_REQUEST);
    }

    // 3. Duplicate enrollment check
    const currentEnrollment = await this.studentRepo.getActiveEnrollment(studentId, classSectionId);
    if (currentEnrollment) {
      throw new AppError(
        `Student ID ${studentId} is already actively enrolled in class '${targetClass.name}'`,
        HttpStatusCode.CONFLICT
      );
    }

    // 4. Capacity limit check
    const currentEnrolledCount = await this.classRepo.getEnrolledCount(classSectionId);
    if (currentEnrolledCount >= targetClass.capacity) {
      throw new AppError(
        `Class '${targetClass.name}' has reached its maximum capacity of ${targetClass.capacity} students`,
        HttpStatusCode.CONFLICT
      );
    }

    // 5. Atomic enrollment transaction
    await this.studentRepo.enrollInClassTx(studentId, classSectionId, targetClass.schoolId);

    const duration = Date.now() - startTime;
    logger.info('[StudentService.enrollStudent] Enrollment completed atomically', {
      studentId,
      classSectionId,
      schoolId: targetClass.schoolId,
      durationMs: duration,
    });

    const refreshed = await this.studentRepo.findById(studentId);
    return this.mapToDTO(refreshed!);
  }

  public async unenrollStudent(
    studentId: number,
    classSectionId?: number,
    reason?: string
  ): Promise<StudentResponseDTO> {
    const startTime = Date.now();
    logger.info('[StudentService.unenrollStudent] Processing unenrollment', { studentId, classSectionId, reason });

    const student = await this.studentRepo.findById(studentId);
    if (!student) {
      throw new AppError(`Student with ID ${studentId} not found`, HttpStatusCode.NOT_FOUND);
    }

    const targetClassId = classSectionId ?? student.classId;
    if (!targetClassId) {
      throw new AppError(`Student ID ${studentId} is not currently enrolled in any class`, HttpStatusCode.BAD_REQUEST);
    }

    const activeEnrollment = await this.studentRepo.getActiveEnrollment(studentId, targetClassId);
    if (!activeEnrollment) {
      throw new AppError(
        `Student ID ${studentId} does not have an active enrollment in class ${targetClassId}`,
        HttpStatusCode.BAD_REQUEST
      );
    }

    await this.studentRepo.unenrollFromClassTx(studentId, targetClassId);

    const duration = Date.now() - startTime;
    logger.info('[StudentService.unenrollStudent] Unenrollment completed atomically', {
      studentId,
      classSectionId: targetClassId,
      durationMs: duration,
    });

    const refreshed = await this.studentRepo.findById(studentId);
    return this.mapToDTO(refreshed!);
  }

  public async transferStudent(
    studentId: number,
    fromClassSectionId: number,
    toClassSectionId: number,
    reason?: string
  ): Promise<StudentResponseDTO> {
    const startTime = Date.now();
    logger.info('[StudentService.transferStudent] Initiating student transfer', {
      studentId,
      fromClassSectionId,
      toClassSectionId,
      reason,
    });

    if (fromClassSectionId === toClassSectionId) {
      throw new AppError('Source class and target class must be different for a transfer', HttpStatusCode.BAD_REQUEST);
    }

    // 1. Verify student exists
    const student = await this.studentRepo.findById(studentId);
    if (!student) {
      throw new AppError(`Student with ID ${studentId} not found`, HttpStatusCode.NOT_FOUND);
    }

    // 2. Verify active enrollment in source class
    const sourceEnrollment = await this.studentRepo.getActiveEnrollment(studentId, fromClassSectionId);
    if (!sourceEnrollment) {
      throw new AppError(
        `Student ID ${studentId} is not currently enrolled in source class ID ${fromClassSectionId}`,
        HttpStatusCode.BAD_REQUEST
      );
    }

    // 3. Verify target class exists and is ACTIVE
    const targetClass = await this.classRepo.findById(toClassSectionId);
    if (!targetClass) {
      throw new AppError(`Target class with ID ${toClassSectionId} not found`, HttpStatusCode.NOT_FOUND);
    }
    if (targetClass.status !== ClassStatus.ACTIVE) {
      throw new AppError(`Target class '${targetClass.name}' is inactive`, HttpStatusCode.BAD_REQUEST);
    }

    // 4. Duplicate enrollment check in target class
    const targetEnrollment = await this.studentRepo.getActiveEnrollment(studentId, toClassSectionId);
    if (targetEnrollment) {
      throw new AppError(
        `Student ID ${studentId} is already enrolled in target class '${targetClass.name}'`,
        HttpStatusCode.CONFLICT
      );
    }

    // 5. Capacity limit check on target class
    const targetEnrolledCount = await this.classRepo.getEnrolledCount(toClassSectionId);
    if (targetEnrolledCount >= targetClass.capacity) {
      throw new AppError(
        `Target class '${targetClass.name}' has reached its maximum capacity of ${targetClass.capacity} students`,
        HttpStatusCode.CONFLICT
      );
    }

    // 6. Execute atomic transfer transaction
    await this.studentRepo.transferClassTx(
      studentId,
      fromClassSectionId,
      toClassSectionId,
      targetClass.schoolId
    );

    const duration = Date.now() - startTime;
    logger.info('[StudentService.transferStudent] Transfer completed atomically', {
      studentId,
      fromClassSectionId,
      toClassSectionId,
      targetSchoolId: targetClass.schoolId,
      durationMs: duration,
    });

    const refreshed = await this.studentRepo.findById(studentId);
    return this.mapToDTO(refreshed!);
  }

  /**
   * Split a free-form "studentName" into the NOT NULL firstName/lastName pair.
   * Single-word names become the first name with an empty last name, which the
   * Student model permits.
   */
  private splitStudentName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts[parts.length - 1],
    };
  }

  /**
   * Bulk create Students from a code-based Excel upload.
   *
   * Resolves `schoolCode` -> `School.id` and
   * `(schoolCode, className, academicYear)` -> `ClassSection.id`, splits
   * `studentName` into first/last name, and maps `isActive` onto `StudentStatus`.
   * Each row is processed independently so one bad row cannot abort the upload.
   */
  public async batchUploadStudents(input: BatchStudentUploadInput): Promise<BatchStudentUploadResultDTO> {
    const startTime = Date.now();
    logger.info('[StudentService.batchUploadStudents] Starting bulk student upload', {
      rowCount: input.students.length,
    });

    const createdById = input.createdById ?? 1;
    const errors: RowErrorDTO[] = [];
    const records: StudentResponseDTO[] = [];
    let failed = 0;
    let skipped = 0;

    // --- Bulk-resolve schools in a single round-trip ---
    const distinctCodes = Array.from(
      new Set(input.students.map((s) => s.schoolCode.trim().toUpperCase()))
    );
    const schools = await prisma.school.findMany({
      where: { code: { in: distinctCodes } },
      select: { id: true, code: true },
    });
    const schoolIdByCode = new Map(schools.map((s) => [s.code.toUpperCase(), s.id]));

    // --- Bulk-resolve class sections in a single round-trip ---
    const resolvedSchoolIds = input.students
      .map((s) => schoolIdByCode.get(s.schoolCode.trim().toUpperCase()))
      .filter((id): id is number => typeof id === 'number');
    const classSections = await prisma.classSection.findMany({
      where: {
        schoolId: { in: Array.from(new Set(resolvedSchoolIds)) },
        className: { in: Array.from(new Set(input.students.map((s) => s.className.trim()))) },
      },
      select: { id: true, schoolId: true, className: true, academicYear: true, status: true },
    });
    const classKey = (schoolId: number, className: string, academicYear: string) =>
      `${schoolId}|${className.toLowerCase()}|${academicYear}`;
    const classIdByKey = new Map(
      classSections.map((c) => [
        classKey(c.schoolId, c.className, c.academicYear ?? ''),
        { id: c.id, status: c.status },
      ])
    );

    for (let i = 0; i < input.students.length; i++) {
      const row = input.students[i];
      // +2 => 1-based header row + 1-based data row, so this matches Excel.
      const rowIndex = i + 2;

      try {
        const schoolId = schoolIdByCode.get(row.schoolCode.trim().toUpperCase());
        if (!schoolId) {
          failed++;
          errors.push({
            rowIndex,
            columnName: 'schoolCode',
            invalidValue: row.schoolCode,
            errorMessage: `No school found with code "${row.schoolCode}". Upload the Classes sheet first.`,
            severity: 'ERROR',
          });
          continue;
        }

        const key = classKey(schoolId, row.className.trim(), row.academicYear.trim());
        const classMatch = classIdByKey.get(key);
        if (!classMatch) {
          failed++;
          errors.push({
            rowIndex,
            columnName: 'className',
            invalidValue: row.className,
            errorMessage: `No class "${row.className}" found for school "${row.schoolCode}" in academic year ${row.academicYear}. Upload the Classes sheet first.`,
            severity: 'ERROR',
          });
          continue;
        }
        if (classMatch.status !== ClassStatus.ACTIVE) {
          failed++;
          errors.push({
            rowIndex,
            columnName: 'className',
            invalidValue: row.className,
            errorMessage: `Class "${row.className}" is archived and cannot accept new students.`,
            severity: 'ERROR',
          });
          continue;
        }

        const duplicate = await this.studentRepo.findBySchoolAndStudentIdCode(
          schoolId,
          row.studentId.trim()
        );
        if (duplicate) {
          skipped++;
          errors.push({
            rowIndex,
            columnName: 'studentId',
            invalidValue: row.studentId,
            errorMessage: `Student "${row.studentId}" already exists in school "${row.schoolCode}". Row skipped.`,
            severity: 'WARNING',
          });
          continue;
        }

        const { firstName, lastName } = this.splitStudentName(row.studentName);
        const isActive = row.isActive ?? true;

        const createdStudent = await this.studentRepo.create({
          schoolId,
          studentIdCode: row.studentId.trim(),
          firstName,
          lastName,
          dateOfBirth: null,
          gender: null,
          classId: classMatch.id,
          createdById,
        });

        // Enrol the freshly created student into the resolved class section.
        await this.studentRepo.enrollInClassTx(createdStudent.id, classMatch.id, schoolId);

        if (!isActive) {
          await this.studentRepo.update(createdStudent.id, { status: StudentStatus.INACTIVE });
        }

        const refreshed = await this.studentRepo.findById(createdStudent.id);
        if (refreshed) records.push(this.mapToDTO(refreshed));
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : 'Unexpected error while creating student';
        errors.push({
          rowIndex,
          columnName: 'studentId',
          invalidValue: row.studentId,
          errorMessage: message,
          severity: 'ERROR',
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('[StudentService.batchUploadStudents] Bulk student upload finished', {
      totalRows: input.students.length,
      created: records.length,
      skipped,
      failed,
      durationMs: duration,
    });

    return {
      totalRows: input.students.length,
      created: records.length,
      skipped,
      failed,
      records,
      errors,
    };
  }
}
