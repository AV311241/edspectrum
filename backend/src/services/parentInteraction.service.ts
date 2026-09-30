import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { ParentInteraction } from '@prisma/client';
import {
  IParentInteractionRepository,
  ParentInteractionRepository,
  ParentInteractionCreateInput,
} from '../repositories/parentInteraction.repository';
import {
  ParentInteractionFilterOptions,
  ParentInteractionResponseDTO,
  ParentInteractionUploadResultDTO,
  PaginatedParentInteractionResponseDTO,
  ParentInteractionUploadRequestBody,
  RowErrorDTO,
} from '../dtos/parentInteraction.dto';
import {
  normaliseInteractionMode,
  normaliseInteractionStatus,
  normaliseParentRelation,
  DEFAULT_PARENT_INTERACTION_STATUS,
} from '../constants/parentInteraction.constants';
import { parseIsoDate, toIsoDateString } from '../utils/date.utils';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';
import { logger } from '../config/logger.config';

/** A register row as it arrives from the transport layer, before normalisation. */
type RawInteractionRow = ParentInteractionUploadRequestBody['records'][number];

/**
 * Excel's day zero is 1899-12-30, not 1899-12-31, because Lotus 1-2-3 treated
 * 1900 as a leap year. Adding the epoch to a serial number therefore lands on
 * the intended calendar day for every date after 1900-03-01.
 */
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** A serial number in this range is a plausible 1990-2090 calendar date. */
const MIN_EXCEL_SERIAL = 32874;
const MAX_EXCEL_SERIAL = 73415;

@provide(ParentInteractionService)
export class ParentInteractionService {
  constructor(
    @inject(ParentInteractionRepository) private parentInteractionRepo: IParentInteractionRepository
  ) {}

  /**
   * Convert a register date cell to a `Date`.
   *
   * Handles the three shapes an Excel export can produce:
   *  - a `Date` (SheetJS parsed the cell as a date),
   *  - an ISO `YYYY-MM-DD` string,
   *  - a raw Excel serial number.
   *
   * Returns `null` for a blank cell so the caller can apply its own
   * required/optional rule.
   *
   * @throws AppError when the value is present but not interpretable.
   */
  private parseRegisterDate(value: unknown, fieldName: string, rowIndex: number): Date | null {
    if (value === null || value === undefined || value === '') return null;

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new AppError(`${fieldName} is not a valid calendar date`, HttpStatusCode.BAD_REQUEST);
      }
      return value;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value) || !Number.isInteger(value)) {
        throw new AppError(
          `${fieldName} must be a whole number of days or a date string`,
          HttpStatusCode.BAD_REQUEST
        );
      }
      if (value < MIN_EXCEL_SERIAL || value > MAX_EXCEL_SERIAL) {
        throw new AppError(
          `${fieldName} value ${value} is outside the supported date range`,
          HttpStatusCode.BAD_REQUEST
        );
      }
      return new Date(EXCEL_EPOCH_UTC + value * MS_PER_DAY);
    }

    const asString = String(value).trim();
    if (asString === '') return null;

    // `parseIsoDate` enforces the YYYY-MM-DD contract and raises a 400 otherwise.
    return parseIsoDate(asString, `${fieldName} (row ${rowIndex})`);
  }

  /**
   * Convert a `visitNo` cell to a positive integer.
   *
   * Field workers write this as `1`, `2nd`, `3RD` or leave it blank, so the
   * ordinal suffix is stripped before parsing. Returns `null` for a blank cell.
   *
   * @throws AppError when the value is present but not a positive integer.
   */
  private parseVisitNumber(value: unknown, rowIndex: number): number | null {
    if (value === null || value === undefined || value === '') return null;

    if (typeof value === 'number') {
      if (!Number.isInteger(value) || value < 1) {
        throw new AppError(
          `visitNo (row ${rowIndex}) must be a positive whole number`,
          HttpStatusCode.BAD_REQUEST
        );
      }
      return value;
    }

    // Strip a trailing ordinal suffix: "2nd" -> "2", "3RD" -> "3".
    const cleaned = String(value).trim().replace(/(\d+)\s*(st|nd|rd|th)\s*$/i, '$1');
    if (cleaned === '') return null;

    const parsed = Number(cleaned);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new AppError(
        `visitNo (row ${rowIndex}) must be a positive whole number, received "${String(value)}"`,
        HttpStatusCode.BAD_REQUEST
      );
    }
    return parsed;
  }
  /** Trim a free-text cell to a `string`, or `null` when it is blank. */
  private toTextOrNull(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
  }

  /**
   * Best-effort mapping from a parse-failure message to a column name.
   *
   * The service throws one message per failure cause ("date is required (row 4)",
   * "visitNo (row 7) must be ..."), and the upload UI highlights the offending
   * cell. Rather than widening every `AppError` into a structured field, the
   * leading identifier of the message is matched against the known columns.
   * Falls back to `row` so the caller always receives a usable label.
   */
  private guessColumnName(message: string): string {
    const KNOWN_COLUMNS = [
      'studentId',
      'studentName',
      'class',
      'parentName',
      'relation',
      'nextDate',
      'nextInteraction',
      'visitNo',
      'date',
    ];
    const found = KNOWN_COLUMNS.find((column) => message.includes(column));
    return found ?? 'row';
  }

  /**
   * Normalise one raw row into the shape the repository persists.
   *
   * This is the single place where the spreadsheet's free text becomes typed
   * data: dates become `Date`, `visitNo` becomes a positive integer, and the
   * closed vocabularies are folded onto their canonical tokens.
   *
   * @throws AppError when a required cell is missing or a cell is unparseable.
   */
  private toCreateInput(row: RawInteractionRow, rowIndex: number): ParentInteractionCreateInput {
    const date = this.parseRegisterDate(row.date, 'date', rowIndex);
    if (date === null) {
      // `date` is NOT NULL in the schema and is the one genuinely required cell.
      throw new AppError(`date is required (row ${rowIndex})`, HttpStatusCode.BAD_REQUEST);
    }

    const nextDate = this.parseRegisterDate(row.nextDate, 'nextDate', rowIndex);

    // Guard the ordering the register relies on for its follow-up reminder list.
    if (nextDate !== null && nextDate.getTime() < date.getTime()) {
      throw new AppError(
        `nextDate (row ${rowIndex}) ${toIsoDateString(nextDate)} is earlier than the interaction date ${toIsoDateString(date)}`,
        HttpStatusCode.BAD_REQUEST
      );
    }

    return {
      studentId: row.studentId.trim(),
      studentName: row.studentName.trim(),
      class: row.class.trim(),
      parentName: row.parentName.trim(),
      relation: normaliseParentRelation(this.toTextOrNull(row.relation)),
      date,
      mode: normaliseInteractionMode(this.toTextOrNull(row.mode)),
      visitNo: this.parseVisitNumber(row.visitNo, rowIndex),
      purpose: this.toTextOrNull(row.purpose),
      parentShared: this.toTextOrNull(row.parentShared),
      keyNotes: this.toTextOrNull(row.keyNotes),
      observation: this.toTextOrNull(row.observation),
      commitment: this.toTextOrNull(row.commitment),
      nextDate,
      nextInteraction: this.toTextOrNull(row.nextInteraction),
      objective: this.toTextOrNull(row.objective),
      status: normaliseInteractionStatus(
        this.toTextOrNull(row.status),
        DEFAULT_PARENT_INTERACTION_STATUS
      ),
      photoUrl: this.toTextOrNull(row.photoUrl),
    };
  }

  /** Map a persisted row to the API response shape. */
  private mapToDTO(record: ParentInteraction): ParentInteractionResponseDTO {
    return {
      id: record.id,
      studentId: record.studentId,
      studentName: record.studentName,
      class: record.class,
      parentName: record.parentName,
      relation: record.relation,
      date: toIsoDateString(record.date),
      mode: record.mode,
      visitNo: record.visitNo,
      purpose: record.purpose,
      parentShared: record.parentShared,
      keyNotes: record.keyNotes,
      observation: record.observation,
      commitment: record.commitment,
      nextDate: record.nextDate ? toIsoDateString(record.nextDate) : null,
      nextInteraction: record.nextInteraction,
      objective: record.objective,
      status: record.status,
      photoUrl: record.photoUrl,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
  /**
   * Bulk-upload the Parent Interaction register.
   *
   * Partial success is the model, matching `AttendanceService.bulkUploadAttendance`:
   * each row is normalised independently and a row that cannot be parsed is
   * reported as a `RowErrorDTO` without aborting the batch. Only rows that
   * survive normalisation reach the single bulk `INSERT`.
   */
  public async uploadInteractions(
    input: ParentInteractionUploadRequestBody
  ): Promise<ParentInteractionUploadResultDTO> {
    const startTime = Date.now();
    logger.info('[ParentInteractionService.uploadInteractions] Starting bulk register upload', {
      rowCount: input.records.length,
    });

    const errors: RowErrorDTO[] = [];
    const staged: ParentInteractionCreateInput[] = [];

    for (let i = 0; i < input.records.length; i++) {
      const row = input.records[i];
      // +2 => 1-based header row + 1-based data row, so this matches Excel.
      const rowIndex = i + 2;

      try {
        staged.push(this.toCreateInput(row, rowIndex));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error while parsing row';
        errors.push({
          rowIndex,
          columnName: this.guessColumnName(message),
          invalidValue: null,
          errorMessage: message,
          severity: 'ERROR',
        });
      }
    }

    const created = staged.length > 0 ? await this.parentInteractionRepo.createMany(staged) : [];
    const records = created.map((r) => this.mapToDTO(r));
    const failed = errors.filter((e) => e.severity === 'ERROR').length;
    const skipped = errors.filter((e) => e.severity === 'WARNING').length;

    const duration = Date.now() - startTime;
    logger.info('[ParentInteractionService.uploadInteractions] Bulk register upload finished', {
      totalRows: input.records.length,
      created: records.length,
      skipped,
      failed,
      durationMs: duration,
    });

    return {
      totalRows: input.records.length,
      created: records.length,
      skipped,
      failed,
      records,
      errors,
    };
  }

  /**
   * List register entries, newest interaction first.
   *
   * The `relation` / `mode` / `status` filters are normalised with the same
   * helpers the upload path uses, so a caller can filter with the same free text
   * they uploaded ("Phone call") and still get an exact match.
   */
  public async listInteractions(
    filters: ParentInteractionFilterOptions
  ): Promise<PaginatedParentInteractionResponseDTO> {
    const resolved: ParentInteractionFilterOptions = {
      ...filters,
      relation: normaliseParentRelation(filters.relation) ?? undefined,
      mode: normaliseInteractionMode(filters.mode) ?? undefined,
      status:
        filters.status === undefined
          ? undefined
          : normaliseInteractionStatus(filters.status, DEFAULT_PARENT_INTERACTION_STATUS),
    };

    const [rows, total] = await Promise.all([
      this.parentInteractionRepo.findAll(resolved),
      this.parentInteractionRepo.countAll(resolved),
    ]);

    return {
      records: rows.map((r) => this.mapToDTO(r)),
      total,
      page: resolved.page,
      limit: resolved.limit,
      totalPages: Math.max(1, Math.ceil(total / resolved.limit)),
    };
  }

  /** Fetch a single register entry, or `null` when the id does not exist. */
  public async getInteractionById(id: number): Promise<ParentInteractionResponseDTO | null> {
    const record = await this.parentInteractionRepo.findById(id);
    return record ? this.mapToDTO(record) : null;
  }
}