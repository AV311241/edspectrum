import { provide } from 'inversify-binding-decorators';
import { ParentInteraction, Prisma } from '@prisma/client';
import { prisma } from '../config/db.config';
import { ParentInteractionFilterOptions } from '../dtos/parentInteraction.dto';

/**
 * One already-normalised register row, ready for persistence.
 *
 * By the time a value reaches this interface the service has coerced every
 * date to a `Date` and every number to a `number` or `null`, so the repository
 * performs no interpretation of its own.
 */
export interface ParentInteractionCreateInput {
  studentId: string;
  studentName: string;
  class: string;
  parentName: string;
  relation: string | null;
  date: Date;
  mode: string | null;
  visitNo: number | null;
  purpose: string | null;
  parentShared: string | null;
  keyNotes: string | null;
  observation: string | null;
  commitment: string | null;
  nextDate: Date | null;
  nextInteraction: string | null;
  objective: string | null;
  status: string | null;
  photoUrl: string | null;
}

export interface IParentInteractionRepository {
  /** Insert many rows in one statement. Returns the created rows. */
  createMany(records: ParentInteractionCreateInput[]): Promise<ParentInteraction[]>;
  findAll(filters: ParentInteractionFilterOptions): Promise<ParentInteraction[]>;
  countAll(filters: ParentInteractionFilterOptions): Promise<number>;
  findById(id: number): Promise<ParentInteraction | null>;
}

@provide(ParentInteractionRepository)
export class ParentInteractionRepository implements IParentInteractionRepository {
  /**
   * Translate the filter bag into a Prisma `where`.
   *
   * The `date` range is applied to the interaction date rather than `createdAt`,
   * because a register is queried by *when the conversation happened*.
   */
  /**
   * Translate the filter bag into a Prisma `where`.
   *
   * The `date` range is applied to the interaction date rather than `createdAt`,
   * because a register is queried by *when the conversation happened*.
   *
   * **Case-insensitivity** comes from the column collation, not from the query.
   * The table is created `COLLATE utf8mb4_unicode_ci`, so `equals` and `contains`
   * already match case-insensitively. This Prisma version (6.19.3) no longer
   * accepts a `mode: 'insensitive'` key on `StringFilter` - the option was
   * removed from the generated types - so passing one is a compile error, not a
   * runtime one. This also matches `StudentRepository`, which relies on the same
   * collation.
   */
  private buildWhere(filters: ParentInteractionFilterOptions): Prisma.ParentInteractionWhereInput {
    const where: Prisma.ParentInteractionWhereInput = {};

    if (filters.studentId !== undefined) where.studentId = filters.studentId;
    if (filters.class !== undefined) where.class = filters.class;
    if (filters.relation !== undefined) where.relation = filters.relation;
    if (filters.mode !== undefined) where.mode = filters.mode;
    if (filters.status !== undefined) where.status = filters.status;

    // Users type "Ramesh" where the sheet says "RAMESH"; the collation handles it.
    if (filters.parentName !== undefined) {
      where.parentName = filters.parentName;
    }

    if (filters.fromDate || filters.toDate) {
      where.date = {};
      if (filters.fromDate) where.date.gte = filters.fromDate;
      if (filters.toDate) where.date.lte = filters.toDate;
    }

    if (filters.search !== undefined) {
      where.OR = [
        { studentName: { contains: filters.search } },
        { parentName: { contains: filters.search } },
        { studentId: { contains: filters.search } },
        { class: { contains: filters.search } },
      ];
    }

    return where;
  }

  /**
   * Bulk insert via `createMany`, which issues a single multi-row `INSERT`.
   *
   * This is far cheaper than the row-by-row `$transaction` loop used by
   * `AttendanceRepository.upsertStudentRecords`, and is safe here because the
   * register has no natural key to upsert against - every row is a distinct
   * historical event, so a re-uploaded sheet legitimately produces new rows.
   *
   * MySQL's `createMany` does not return the inserted rows, so the caller is
   * given the written slice by reading the auto-increment window that this
   * insert filled. The read runs inside the SAME transaction as the insert so a
   * concurrent upload cannot widen the window and have its rows attributed to
   * this request.
   */
  public async createMany(records: ParentInteractionCreateInput[]): Promise<ParentInteraction[]> {
    if (records.length === 0) {
      return [];
    }

    return await prisma.$transaction(async (tx) => {
      const lastBefore = await tx.parentInteraction.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      const lowerBound = lastBefore?.id ?? 0;

      const { count } = await tx.parentInteraction.createMany({ data: records });
      if (count === 0) {
        return [];
      }

      return await tx.parentInteraction.findMany({
        where: { id: { gt: lowerBound } },
        orderBy: { id: 'asc' },
        take: count,
      });
    });
  }

  public async findAll(filters: ParentInteractionFilterOptions): Promise<ParentInteraction[]> {
    return await prisma.parentInteraction.findMany({
      where: this.buildWhere(filters),
      take: filters.limit,
      skip: (filters.page - 1) * filters.limit,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
  }

  public async countAll(filters: ParentInteractionFilterOptions): Promise<number> {
    return await prisma.parentInteraction.count({
      where: this.buildWhere(filters),
    });
  }

  public async findById(id: number): Promise<ParentInteraction | null> {
    return await prisma.parentInteraction.findUnique({ where: { id } });
  }
}