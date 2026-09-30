import { Controller, Route, Get, Post, Body, Path, Query, Tags, SuccessResponse, Response } from 'tsoa';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { ParentInteractionService } from '../services/parentInteraction.service';
import {
  ParentInteractionUploadRequestBody,
  ParentInteractionUploadResultDTO,
  ParentInteractionResponseDTO,
  PaginatedParentInteractionResponseDTO,
  ParentInteractionUploadInput,
  parentInteractionUploadSchema,
  parentInteractionFilterQuerySchema,
} from '../dtos/parentInteraction.dto';
import { parseIsoDate } from '../utils/date.utils';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';

@Tags('Parent Interactions')
@Route('parent-interactions')
@provide(ParentInteractionController)
export class ParentInteractionController extends Controller {
  constructor(
    @inject(ParentInteractionService) private parentInteractionService: ParentInteractionService
  ) {
    super();
  }

  /**
   * Bulk upload the Parent Interaction register from an Excel sheet.
   *
   * Accepts `{ records: [...] }` and returns the shared `BatchUploadResultDTO`.
   * Rows are validated and normalised independently, so a single unparseable row
   * is reported in `errors` without aborting the rest of the batch.
   *
   * Date cells accept an ISO `YYYY-MM-DD` string, a raw Excel serial number or a
   * JSON date; `visitNo` accepts `2`, `"2"` or `"2nd"`.
   */
  @SuccessResponse('200', 'Success')
  @Response(400, 'Bad Request - Validation Error')
  @Post('upload')
  public async uploadParentInteractions(
    @Body() requestBody: ParentInteractionUploadRequestBody
  ): Promise<ParentInteractionUploadResultDTO> {
    const validated = parentInteractionUploadSchema.parse(requestBody);
    return await this.parentInteractionService.uploadInteractions(
      validated as ParentInteractionUploadInput
    );
  }

  /**
   * List parent interaction register entries, newest interaction first.
   *
   * Supports pagination plus optional filters on student, class, parent name,
   * relation, mode, status and an inclusive `fromDate` / `toDate` range.
   * `relation`, `mode` and `status` accept the same free text used at upload
   * time and are normalised to the canonical vocabulary server-side.
   */
  @Get('')
  @Response(400, 'Bad Request - Invalid filter')
  public async listParentInteractions(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() studentId?: string,
    @Query() className?: string,
    @Query() parentName?: string,
    @Query() relation?: string,
    @Query() mode?: string,
    @Query() status?: string,
    @Query() fromDate?: string,
    @Query() toDate?: string,
    @Query() search?: string
  ): Promise<PaginatedParentInteractionResponseDTO> {
    const validated = parentInteractionFilterQuerySchema.parse({
      page,
      limit,
      studentId,
      class: className,
      parentName,
      relation,
      mode,
      status,
      fromDate,
      toDate,
      search,
    });

    return await this.parentInteractionService.listInteractions({
      page: validated.page,
      limit: validated.limit,
      studentId: validated.studentId,
      class: validated.class,
      parentName: validated.parentName,
      relation: validated.relation,
      mode: validated.mode,
      status: validated.status,
      // Range bounds are inclusive and applied to the interaction date.
      fromDate: validated.fromDate ? parseIsoDate(validated.fromDate, 'fromDate') : undefined,
      toDate: validated.toDate ? parseIsoDate(validated.toDate, 'toDate') : undefined,
      search: validated.search,
    });
  }

  /**
   * Get a single parent interaction register entry by ID.
   */
  @Get('{id}')
  @Response(400, 'Bad Request - Invalid id')
  @Response(404, 'Parent interaction not found')
  public async getParentInteractionById(@Path() id: string): Promise<ParentInteractionResponseDTO> {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId < 1) {
      throw new AppError(`Invalid parent interaction id: "${id}"`, HttpStatusCode.BAD_REQUEST);
    }

    const record = await this.parentInteractionService.getInteractionById(numericId);
    if (!record) {
      throw new AppError(`Parent interaction ${numericId} not found`, HttpStatusCode.NOT_FOUND);
    }
    return record;
  }
}