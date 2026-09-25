import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import {
  IBaselineAssessmentRepository,
  BaselineAssessmentRepository,
  BaselineAssessmentRecord,
  DomainScoreRecord,
} from '../repositories/baselineAssessment.repository';
import { CreateBaselineAssessmentInput, UpdateBaselineAssessmentInput } from '../dtos/baselineAssessment.dto';
import { calculateSuggestedStage } from '../utils/stageCalculator.utils';
import { AssessmentStatus, SuggestedStage } from '../constants/baseline.constants';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';
import { logger } from '../config/logger.config';

@provide(BaselineAssessmentService)
export class BaselineAssessmentService {
  constructor(
    @inject(BaselineAssessmentRepository) private repository: IBaselineAssessmentRepository
  ) {}

  public async createAssessment(input: CreateBaselineAssessmentInput): Promise<BaselineAssessmentRecord> {
    logger.info(`Creating baseline assessment for student ${input.studentId}`);

    const isAbsent = input.status === AssessmentStatus.ABSENT;

    const scoresToCreate: Omit<DomainScoreRecord, 'id' | 'assessmentId' | 'createdAt'>[] = input.domainScores.map((ds) => {
      const item1 = isAbsent ? null : ds.item1 ?? null;
      const item2 = isAbsent ? null : ds.item2 ?? null;
      const item3 = isAbsent ? null : ds.item3 ?? null;
      const item4 = isAbsent ? null : ds.item4 ?? null;
      const item5 = isAbsent ? null : ds.item5 ?? null;

      const domainScore = (item1 ?? 0) + (item2 ?? 0) + (item3 ?? 0) + (item4 ?? 0) + (item5 ?? 0);
      const suggestedStage = calculateSuggestedStage({ item1, item2, item3, item4, item5 }, isAbsent);
      const reviewNeeded = suggestedStage === SuggestedStage.REVIEW;

      return {
        domain: ds.domain,
        item1,
        item2,
        item3,
        item4,
        item5,
        domainScore,
        suggestedStage,
        finalStage: ds.finalStage ?? suggestedStage,
        reviewNeeded,
      };
    });

    const headerData = {
      studentId: input.studentId,
      assessmentDate: input.assessmentDate,
      assessorName: input.assessorName,
      status: input.status ?? AssessmentStatus.PRESENT,
      keySupportFlag: input.keySupportFlag ?? null,
      oralFlag: input.oralFlag ?? null,
      qcNotes: input.qcNotes ?? null,
    };

    return await this.repository.create(headerData, scoresToCreate);
  }

  public async getAssessmentById(id: number): Promise<BaselineAssessmentRecord> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new AppError(`Baseline assessment with ID ${id} not found`, HttpStatusCode.NOT_FOUND);
    }
    return record;
  }

  public async getAssessmentsByStudent(studentId: string): Promise<BaselineAssessmentRecord[]> {
    return await this.repository.findByStudentId(studentId);
  }

  public async listAssessments(page: number = 1, limit: number = 20): Promise<{ records: BaselineAssessmentRecord[]; total: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const { records, total } = await this.repository.findAll(limit, offset);
    return {
      records,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async updateAssessment(id: number, input: UpdateBaselineAssessmentInput): Promise<BaselineAssessmentRecord> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError(`Assessment with ID ${id} not found`, HttpStatusCode.NOT_FOUND);
    }

    const updated = await this.repository.update(id, input as Partial<BaselineAssessmentRecord>);
    if (!updated) {
      throw new AppError(`Failed to update assessment ${id}`, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
    return updated;
  }

  public async deleteAssessment(id: number): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new AppError(`Assessment with ID ${id} not found`, HttpStatusCode.NOT_FOUND);
    }
  }

  public async importAssessments(inputs: CreateBaselineAssessmentInput[]): Promise<{ importedCount: number; records: BaselineAssessmentRecord[] }> {
    logger.info(`Executing bulk import for ${inputs.length} baseline assessments`);
    const createdRecords: BaselineAssessmentRecord[] = [];

    for (const input of inputs) {
      const record = await this.createAssessment(input);
      createdRecords.push(record);
    }

    return {
      importedCount: createdRecords.length,
      records: createdRecords,
    };
  }

  public async exportFlatAssessments(): Promise<Record<string, unknown>[]> {
    logger.info('Executing exportFlat for baseline assessments wide matrix');
    return await this.repository.exportFlat();
  }
}
