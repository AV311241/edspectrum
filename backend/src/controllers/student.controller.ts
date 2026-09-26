import { Controller, Route, Get, Post, Put, Delete, Body, Path, Query, Tags, SuccessResponse, Response } from 'tsoa';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { StudentService } from '../services/student.service';
import {
  CreateStudentInput,
  UpdateStudentInput,
  EnrollStudentInput,
  UnenrollStudentInput,
  TransferStudentInput,
  StudentResponseDTO,
  PaginatedStudentResponseDTO,
  createStudentSchema,
  updateStudentSchema,
  enrollStudentSchema,
  unenrollStudentSchema,
  transferStudentSchema,
  studentFilterQuerySchema,
} from '../dtos/student.dto';
import { StudentStatus } from '@prisma/client';
import {
  BatchStudentUploadInput,
  BatchStudentUploadResultDTO,
  batchStudentUploadSchema,
} from '../dtos/student-upload.dto';

@Tags('Students')
@Route('students')
@provide(StudentController)
export class StudentController extends Controller {
  constructor(
    @inject(StudentService) private studentService: StudentService
  ) {
    super();
  }

  /**
   * Create a new Student record
   */
  @SuccessResponse('201', 'Created')
  @Response(400, 'Bad Request - Validation Error')
  @Response(409, 'Conflict - Student code already exists or class capacity reached')
  @Post('')
  public async createStudent(
    @Body() requestBody: CreateStudentInput
  ): Promise<StudentResponseDTO> {
    const validated = createStudentSchema.parse(requestBody);
    this.setStatus(201);
    return await this.studentService.createStudent(validated as CreateStudentInput);
  }

  /**
   * Bulk create Students from a code-based Excel upload.
   * Resolves `schoolCode` and `(schoolCode, className, academicYear)` to their
   * primary keys server-side, splits `studentName`, and enrols each student.
   */
  @SuccessResponse('200', 'Success')
  @Response(400, 'Bad Request - Validation Error')
  @Post('batch')
  public async batchUploadStudents(
    @Body() requestBody: BatchStudentUploadInput
  ): Promise<BatchStudentUploadResultDTO> {
    const validated = batchStudentUploadSchema.parse(requestBody);
    return await this.studentService.batchUploadStudents(validated as BatchStudentUploadInput);
  }

  /**
   * List paginated Students with optional filters
   */
  @Get('')
  public async listStudents(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() schoolId?: number,
    @Query() classId?: number,
    @Query() status?: StudentStatus,
    @Query() search?: string
  ): Promise<PaginatedStudentResponseDTO> {
    const validatedQuery = studentFilterQuerySchema.parse({
      page,
      limit,
      schoolId,
      classId,
      status,
      search,
    });
    return await this.studentService.listStudents(validatedQuery);
  }

  /**
   * Get Student details by numeric ID
   */
  @Get('{id}')
  @Response(404, 'Student not found')
  public async getStudentById(@Path() id: number): Promise<StudentResponseDTO> {
    return await this.studentService.getStudentById(id);
  }

  /**
   * Update Student profile by ID
   */
  @Put('{id}')
  @Response(404, 'Student not found')
  @Response(409, 'Conflict - Student code duplicate')
  public async updateStudent(
    @Path() id: number,
    @Body() requestBody: UpdateStudentInput
  ): Promise<StudentResponseDTO> {
    const validated = updateStudentSchema.parse(requestBody);
    return await this.studentService.updateStudent(id, validated as UpdateStudentInput);
  }

  /**
   * Delete Student by ID
   */
  @Delete('{id}')
  @Response(404, 'Student not found')
  public async deleteStudent(@Path() id: number): Promise<{ success: boolean; message: string }> {
    return await this.studentService.deleteStudent(id);
  }

  /**
   * Enroll Student into a Class Section
   */
  @Post('{id}/enroll')
  @Response(400, 'Bad Request - Student or Class inactive')
  @Response(404, 'Student or Class not found')
  @Response(409, 'Conflict - Already enrolled or Class capacity limit reached')
  public async enrollStudent(
    @Path() id: number,
    @Body() requestBody: EnrollStudentInput
  ): Promise<StudentResponseDTO> {
    const validated = enrollStudentSchema.parse(requestBody);
    return await this.studentService.enrollStudent(id, validated.classSectionId);
  }

  /**
   * Unenroll Student from a Class Section
   */
  @Post('{id}/unenroll')
  @Response(400, 'Bad Request - Student not currently enrolled')
  @Response(404, 'Student not found')
  public async unenrollStudent(
    @Path() id: number,
    @Body() requestBody?: UnenrollStudentInput
  ): Promise<StudentResponseDTO> {
    const validated = unenrollStudentSchema.parse(requestBody ?? {});
    return await this.studentService.unenrollStudent(id, validated.classSectionId, validated.reason);
  }

  /**
   * Transfer Student from one Class Section to another
   */
  @Post('{id}/transfer')
  @Response(400, 'Bad Request - Invalid transfer source/target or inactive class')
  @Response(404, 'Student or Target Class not found')
  @Response(409, 'Conflict - Target class capacity limit reached or duplicate enrollment')
  public async transferStudent(
    @Path() id: number,
    @Body() requestBody: TransferStudentInput
  ): Promise<StudentResponseDTO> {
    const validated = transferStudentSchema.parse(requestBody);
    return await this.studentService.transferStudent(
      id,
      validated.fromClassSectionId ?? 0,
      validated.toClassSectionId,
      validated.reason
    );
  }
}
