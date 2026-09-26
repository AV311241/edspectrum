import { Controller, Route, Get, Post, Put, Delete, Body, Path, Query, Tags, SuccessResponse, Response } from 'tsoa';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { ClassService } from '../services/class.service';
import {
  CreateClassInput,
  UpdateClassInput,
  ClassResponseDTO,
  PaginatedClassResponseDTO,
  EnrolledStudentSummaryDTO,
  createClassSchema,
  updateClassSchema,
  classFilterQuerySchema,
} from '../dtos/class.dto';
import { ClassStatus } from '@prisma/client';
import {
  BatchClassUploadInput,
  BatchClassUploadResultDTO,
  batchClassUploadSchema,
} from '../dtos/class-upload.dto';

@Tags('Classes')
@Route('classes')
@provide(ClassController)
export class ClassController extends Controller {
  constructor(
    @inject(ClassService) private classService: ClassService
  ) {
    super();
  }

  /**
   * Create a new Class Section
   */
  @SuccessResponse('201', 'Created')
  @Response(400, 'Bad Request - Validation Error')
  @Response(404, 'School or Grade not found')
  @Response(409, 'Conflict - Section already exists for School/Grade')
  @Post('')
  public async createClass(
    @Body() requestBody: CreateClassInput
  ): Promise<ClassResponseDTO> {
    const validated = createClassSchema.parse(requestBody);
    this.setStatus(201);
    return await this.classService.createClass(validated as CreateClassInput);
  }

  /**
   * Bulk create Class Sections from a code-based Excel upload.
   * Resolves `schoolCode` to `School.id` server-side and reports row-level
   * failures without aborting the rest of the upload.
   */
  @SuccessResponse('200', 'Success')
  @Response(400, 'Bad Request - Validation Error')
  @Post('batch')
  public async batchUploadClasses(
    @Body() requestBody: BatchClassUploadInput
  ): Promise<BatchClassUploadResultDTO> {
    const validated = batchClassUploadSchema.parse(requestBody);
    return await this.classService.batchUploadClasses(validated as BatchClassUploadInput);
  }

  /**
   * List paginated Class Sections with optional filters
   */
  @Get('')
  public async listClasses(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() schoolId?: number,
    @Query() gradeId?: number,
    @Query() status?: ClassStatus,
    @Query() academicYear?: string,
    @Query() search?: string
  ): Promise<PaginatedClassResponseDTO> {
    const validatedQuery = classFilterQuerySchema.parse({
      page,
      limit,
      schoolId,
      gradeId,
      status,
      academicYear,
      search,
    });
    return await this.classService.listClasses(validatedQuery);
  }

  /**
   * Get Class Section details by numeric ID
   */
  @Get('{id}')
  @Response(404, 'Class Section not found')
  public async getClassById(@Path() id: number): Promise<ClassResponseDTO> {
    return await this.classService.getClassById(id);
  }

  /**
   * Update Class Section by ID
   */
  @Put('{id}')
  @Response(400, 'Bad Request - Reduced capacity below enrolled count')
  @Response(404, 'Class Section not found')
  @Response(409, 'Conflict - Section duplicate')
  public async updateClass(
    @Path() id: number,
    @Body() requestBody: UpdateClassInput
  ): Promise<ClassResponseDTO> {
    const validated = updateClassSchema.parse(requestBody);
    return await this.classService.updateClass(id, validated as UpdateClassInput);
  }

  /**
   * Delete Class Section by ID (Enforces non-empty safeguard)
   */
  @Delete('{id}')
  @Response(404, 'Class Section not found')
  @Response(409, 'Conflict - Cannot delete class with active enrolled students')
  public async deleteClass(@Path() id: number): Promise<{ success: boolean; message: string }> {
    return await this.classService.deleteClass(id);
  }

  /**
   * Get paginated list of active enrolled students in a Class Section
   */
  @Get('{id}/students')
  @Response(404, 'Class Section not found')
  public async getEnrolledStudents(
    @Path() id: number,
    @Query() page?: number,
    @Query() limit?: number
  ): Promise<{ records: EnrolledStudentSummaryDTO[]; total: number; page: number; totalPages: number }> {
    return await this.classService.getEnrolledStudents(id, page ?? 1, limit ?? 20);
  }
}
