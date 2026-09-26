import { Controller, Route, Get, Post, Put, Delete, Body, Path, Query, Tags, SuccessResponse, Response } from 'tsoa';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { AttendanceService } from '../services/attendance.service';
import {
  BatchUpsertAttendanceInput,
  CancelClassAttendanceInput,
  UncancelClassAttendanceInput,
  UpdateAttendanceInput,
  AttendanceResponseDTO,
  PaginatedAttendanceResponseDTO,
  BatchUpsertAttendanceResponseDTO,
  ClassCancellationResponseDTO,
  DailyRegisterResponseDTO,
  MonthlyAttendanceAnalyticsDTO,
  MutationMessageDTO,
  batchUpsertAttendanceSchema,
  cancelClassAttendanceSchema,
  uncancelClassAttendanceSchema,
  dailyRegisterQuerySchema,
  monthlyAnalyticsQuerySchema,
  riskAnalyticsQuerySchema,
  attendanceFilterQuerySchema,
  updateAttendanceSchema,
} from '../dtos/attendance.dto';
import { AttendanceStatus } from '@prisma/client';
import { AttendanceRiskLevel } from '../constants/attendance.constants';
import {
  BulkAttendanceUploadInput,
  BulkAttendanceUploadResultDTO,
} from '../dtos/attendance-upload.dto';
import {
  BatchAttendanceUploadDTO,
  AttendanceUploadRequestSchema as attendanceUploadRequestSchema,
  isEnvelopeForm,
} from '../schemas/attendance-upload.schema';

/**
 * Route-level body shape for `POST /attendance/batch-upload`.
 *
 * This is deliberately a plain interface rather than the Zod-inferred union:
 * tsoa must be able to resolve the declared parameter type when generating the
 * OpenAPI spec and routes, and it cannot introspect
 * `z.infer<typeof SomeUnionSchema>`. The interface documents both accepted
 * shapes for the spec, while `AttendanceUploadRequestSchema` remains the
 * authoritative runtime gate (it strips unknown keys and coerces types).
 *
 * Both forms are accepted on the one route, discriminated by `classSectionId`:
 *  - envelope form: `{ schoolId, classSectionId, records: [...] }`
 *  - code form:     `{ records: [{ schoolCode, className, academicYear, ... }] }`
 */
export interface AttendanceUploadRequestBody {
  /** Envelope form only: the owning school. */
  schoolId?: number;
  /** Envelope form only. When present, the envelope form is expected. */
  classSectionId?: number;
  records: {
    /** Envelope form matches on the student's code within the school. */
    studentId?: string | number | null;
    sessionDate: string;
    status: string;
    remarks?: string | null;
    /** Code form only. */
    schoolCode?: string;
    /** Code form only. */
    className?: string;
    /** Code form only. */
    academicYear?: string;
  }[];
}

@Tags('Attendance')
@Route('attendance')
@provide(AttendanceController)
export class AttendanceController extends Controller {
  constructor(
    @inject(AttendanceService) private attendanceService: AttendanceService
  ) {
    super();
  }

  /**
   * Bulk upload Daily Attendance from an Excel upload.
   *
   * Accepts two request shapes, discriminated by `classSectionId`:
   *  - envelope form  `{ schoolId, classSectionId, records: [...] }`
   *    the class is named once by primary key
   *  - code form      `{ records: [{ schoolCode, className, academicYear, ... }] }`
   *    each row names its class by human-readable code, so one sheet may span
   *    several classes (this is what the matrix/grid pivot produces)
   *
   * Both are resolved server-side. `CANCELLED` rows become class-wide records
   * (studentId = null) and require `remarks`; every other status requires a
   * `studentId` and is verified against the class's students.
   *
   * Note: `POST /attendance/batch` is the older numeric-FK endpoint for a single
   * session and is intentionally left untouched.
   */
  @SuccessResponse('200', 'Success')
  @Response(400, 'Bad Request - Validation Error')
  @Response(404, 'Class Section not found under the given School')
  @Post('batch-upload')
  public async bulkUploadAttendance(
    @Body() requestBody: AttendanceUploadRequestBody
  ): Promise<BulkAttendanceUploadResultDTO> {
    // Zod is the single validation gate; globalErrorHandler renders any
    // ZodError as a 400 with per-field paths.
    const validated = attendanceUploadRequestSchema.parse(requestBody);

    if (isEnvelopeForm(validated)) {
      return await this.attendanceService.bulkUploadAttendanceByClass(
        validated as BatchAttendanceUploadDTO
      );
    }
    return await this.attendanceService.bulkUploadAttendance(
      validated as unknown as BulkAttendanceUploadInput
    );
  }

  /**
   * Batch mark or update daily attendance records for a class section
   */
  @SuccessResponse('200', 'Success')
  @Response(400, 'Bad Request - Validation Error or Class is Cancelled')
  @Response(404, 'Class Section not found')
  @Post('batch')
  public async batchUpsertAttendance(
    @Body() requestBody: BatchUpsertAttendanceInput
  ): Promise<BatchUpsertAttendanceResponseDTO> {
    const validated = batchUpsertAttendanceSchema.parse(requestBody);
    return await this.attendanceService.batchUpsertAttendance(validated as BatchUpsertAttendanceInput);
  }

  /**
   * Cancel an entire class session for a specific date
   */
  @Post('cancel-class')
  @Response(400, 'Bad Request - Validation Error')
  @Response(404, 'Class Section not found')
  public async cancelClassSession(
    @Body() requestBody: CancelClassAttendanceInput
  ): Promise<ClassCancellationResponseDTO> {
    const validated = cancelClassAttendanceSchema.parse(requestBody);
    return await this.attendanceService.cancelClassSession(validated as CancelClassAttendanceInput);
  }

  /**
   * Remove class session cancellation flag for a specific date
   */
  @Post('uncancel-class')
  @Response(400, 'Bad Request - Validation Error')
  @Response(404, 'Class Section not found')
  public async uncancelClassSession(
    @Body() requestBody: UncancelClassAttendanceInput
  ): Promise<MutationMessageDTO> {
    const validated = uncancelClassAttendanceSchema.parse(requestBody);
    return await this.attendanceService.uncancelClassSession(validated as UncancelClassAttendanceInput);
  }

  /**
   * Get daily attendance register grid for a class section and date
   */
  @Get('register')
  @Response(400, 'Bad Request - Invalid date format')
  @Response(404, 'Class Section not found')
  public async getDailyRegister(
    @Query() classId: number,
    @Query() sessionDate: string
  ): Promise<DailyRegisterResponseDTO> {
    const validatedQuery = dailyRegisterQuerySchema.parse({ classId, sessionDate });
    return await this.attendanceService.getDailyRegister(validatedQuery.classId, validatedQuery.sessionDate);
  }

  /**
   * Get monthly attendance analytics for a class section
   */
  @Get('monthly-analytics')
  @Response(400, 'Bad Request - Invalid year/month')
  @Response(404, 'Class Section not found')
  public async getMonthlyAnalytics(
    @Query() classId: number,
    @Query() year: number,
    @Query() month: number
  ): Promise<MonthlyAttendanceAnalyticsDTO> {
    const validatedQuery = monthlyAnalyticsQuerySchema.parse({ classId, year, month });
    return await this.attendanceService.getMonthlyAnalytics(validatedQuery);
  }

  /**
   * Get attendance risk analytics filtered by minimum risk level
   */
  @Get('risk-analytics')
  @Response(400, 'Bad Request - Invalid parameters')
  @Response(404, 'Class Section not found')
  public async getRiskAnalytics(
    @Query() classId: number,
    @Query() year: number,
    @Query() month: number,
    @Query() minRiskLevel?: AttendanceRiskLevel
  ): Promise<MonthlyAttendanceAnalyticsDTO> {
    const validatedQuery = riskAnalyticsQuerySchema.parse({ classId, year, month, minRiskLevel });
    return await this.attendanceService.getRiskAnalytics(validatedQuery);
  }

  /**
   * List paginated attendance records with optional filters
   */
  @Get('')
  public async listAttendance(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() classId?: number,
    @Query() studentId?: number,
    @Query() sessionDate?: string,
    @Query() fromDate?: string,
    @Query() toDate?: string,
    @Query() status?: AttendanceStatus
  ): Promise<PaginatedAttendanceResponseDTO> {
    const validatedQuery = attendanceFilterQuerySchema.parse({
      page,
      limit,
      classId,
      studentId,
      sessionDate,
      fromDate,
      toDate,
      status,
    });
    return await this.attendanceService.listAttendance(validatedQuery);
  }

  /**
   * Get individual attendance record by ID
   */
  @Get('{id}')
  @Response(404, 'Attendance record not found')
  public async getAttendanceById(@Path() id: string): Promise<AttendanceResponseDTO> {
    return await this.attendanceService.getAttendanceById(id);
  }

  /**
   * Update individual attendance record by ID
   */
  @Put('{id}')
  @Response(404, 'Attendance record not found')
  public async updateAttendance(
    @Path() id: string,
    @Body() requestBody: UpdateAttendanceInput
  ): Promise<AttendanceResponseDTO> {
    const validated = updateAttendanceSchema.parse(requestBody);
    return await this.attendanceService.updateAttendance(id, validated as UpdateAttendanceInput);
  }

  /**
   * Delete attendance record by ID
   */
  @Delete('{id}')
  @Response(404, 'Attendance record not found')
  public async deleteAttendance(@Path() id: string): Promise<MutationMessageDTO> {
    return await this.attendanceService.deleteAttendance(id);
  }
}
