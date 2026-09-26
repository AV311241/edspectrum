import { Body, Controller, Get, Path, Post, Response, Route, SuccessResponse, Tags } from 'tsoa';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import {
  CreateSchoolClassInput,
  CreateSchoolInput,
  SchoolClassesResponseDTO,
  SchoolClassDTO,
  SchoolSummaryDTO,
  createSchoolClassSchema,
  createSchoolSchema,
} from '../dtos/school.dto';
import { SchoolService } from '../services/school.service';

@Tags('Schools')
@Route('schools')
@provide(SchoolController)
export class SchoolController extends Controller {
  constructor(@inject(SchoolService) private schoolService: SchoolService) {
    super();
  }

  @Get('')
  public async listSchools(): Promise<SchoolSummaryDTO[]> {
    return this.schoolService.listSchools();
  }

  @SuccessResponse('201', 'Created')
  @Response(400, 'Bad Request - Validation Error')
  @Response(409, 'Conflict - School code already exists')
  @Post('')
  public async createSchool(@Body() requestBody: CreateSchoolInput): Promise<SchoolSummaryDTO> {
    const validated = createSchoolSchema.parse(requestBody);
    this.setStatus(201);
    return this.schoolService.createSchool(validated);
  }

  @Get('{schoolId}/classes')
  @Response(404, 'School not found')
  public async getClassesBySchool(
    @Path() schoolId: number
  ): Promise<SchoolClassesResponseDTO> {
    return this.schoolService.getClassesBySchool(schoolId);
  }

  @SuccessResponse('201', 'Created')
  @Response(400, 'Bad Request - Validation Error')
  @Response(404, 'School not found')
  @Response(409, 'Conflict - Class already exists')
  @Post('{schoolId}/classes')
  public async createClass(
    @Path() schoolId: number,
    @Body() requestBody: CreateSchoolClassInput
  ): Promise<SchoolClassDTO> {
    const validated = createSchoolClassSchema.parse(requestBody);
    this.setStatus(201);
    return this.schoolService.createClass(schoolId, validated);
  }
}