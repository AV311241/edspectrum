import { Controller, Route, Get, Post, Put, Delete, Body, Path, Query, Tags, SuccessResponse, Response } from 'tsoa';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { BaselineAssessmentService } from '../services/baselineAssessment.service';
import {
  CreateBaselineAssessmentInput,
  UpdateBaselineAssessmentInput,
  BulkImportBaselineAssessmentInput,
  PaginatedBaselineAssessmentResponse,
} from '../dtos/baselineAssessment.dto';
import { BaselineAssessmentRecord } from '../repositories/baselineAssessment.repository';

@Tags('Baseline Assessments')
@Route('baseline-assessments')
@provide(BaselineAssessmentController)
export class BaselineAssessmentController extends Controller {
  constructor(
    @inject(BaselineAssessmentService) private service: BaselineAssessmentService
  ) {
    super();
  }

  /**
   * Create a new Baseline Assessment
   */
  @SuccessResponse('201', 'Created')
  @Post('')
  public async create(
    @Body() requestBody: CreateBaselineAssessmentInput
  ): Promise<BaselineAssessmentRecord> {
    this.setStatus(201);
    return await this.service.createAssessment(requestBody);
  }

  /**
   * Bulk import Baseline Assessments
   */
  @SuccessResponse('201', 'Bulk Imported')
  @Post('import')
  public async importAssessments(
    @Body() requestBody: BulkImportBaselineAssessmentInput
  ): Promise<{ importedCount: number; records: BaselineAssessmentRecord[] }> {
    this.setStatus(201);
    return await this.service.importAssessments(requestBody.assessments);
  }

  /**
   * Export flat wide matrix for Baseline Assessments
   */
  @Get('export/flat')
  public async exportFlat(): Promise<Record<string, unknown>[]> {
    return this.service.exportFlatAssessments();
  }

  /**
   * List paginated Baseline Assessments
   */
  @Get('')
  public async list(
    @Query() page?: number,
    @Query() limit?: number
  ): Promise<PaginatedBaselineAssessmentResponse> {
    return this.service.listAssessments(page ?? 1, limit ?? 20);
  }

  /**
   * Get Baseline Assessment by numeric ID
   */
  @Get('{id}')
  @Response(404, 'Assessment not found')
  public async getById(@Path() id: number): Promise<BaselineAssessmentRecord> {
    return this.service.getAssessmentById(id);
  }

  /**
   * Get Baseline Assessments by Student ID
   */
  @Get('student/{studentId}')
  public async getByStudentId(
    @Path() studentId: string
  ): Promise<BaselineAssessmentRecord[]> {
    return this.service.getAssessmentsByStudent(studentId);
  }

  /**
   * Update Baseline Assessment by ID
   */
  @Put('{id}')
  @Response(404, 'Assessment not found')
  public async update(
    @Path() id: number,
    @Body() requestBody: UpdateBaselineAssessmentInput
  ): Promise<BaselineAssessmentRecord> {
    return this.service.updateAssessment(id, requestBody);
  }

  /**
   * Delete Baseline Assessment by ID
   */
  @Delete('{id}')
  @Response(404, 'Assessment not found')
  public async deleteAssessment(@Path() id: number): Promise<{ success: boolean }> {
    await this.service.deleteAssessment(id);
    return { success: true };
  }
}
