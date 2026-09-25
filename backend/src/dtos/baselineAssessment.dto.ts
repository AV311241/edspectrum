import { z } from 'zod';
import { BaselineDomain, AssessmentStatus, OralFlag, SuggestedStage } from '../constants/baseline.constants';

export interface DomainScoreInput {
  domain: BaselineDomain;
  item1?: number | null;
  item2?: number | null;
  item3?: number | null;
  item4?: number | null;
  item5?: number | null;
  domainScore?: number | null;
  suggestedStage?: SuggestedStage | null;
  finalStage?: SuggestedStage | null;
  reviewNeeded?: boolean | null;
}

export interface CreateBaselineAssessmentInput {
  studentId: string;
  assessmentDate: string;
  assessorName: string;
  status?: AssessmentStatus;
  keySupportFlag?: string | null;
  oralFlag?: OralFlag | null;
  qcNotes?: string | null;
  domainScores: DomainScoreInput[];
}

export interface UpdateBaselineAssessmentInput {
  studentId?: string;
  assessmentDate?: string;
  assessorName?: string;
  status?: AssessmentStatus;
  keySupportFlag?: string | null;
  oralFlag?: OralFlag | null;
  qcNotes?: string | null;
  domainScores?: DomainScoreInput[];
}

export interface BulkImportBaselineAssessmentInput {
  assessments: CreateBaselineAssessmentInput[];
}

export interface PaginatedBaselineAssessmentResponse {
  records: any[];
  total: number;
  page: number;
  totalPages: number;
}

// Zod schemas for runtime validation
const scoreItemSchema = z.number().int().min(0).max(4).nullable().optional();

export const domainScoreItemSchema = z.object({
  domain: z.nativeEnum(BaselineDomain),
  item1: scoreItemSchema,
  item2: scoreItemSchema,
  item3: scoreItemSchema,
  item4: scoreItemSchema,
  item5: scoreItemSchema,
  domainScore: z.number().nullable().optional(),
  suggestedStage: z.nativeEnum(SuggestedStage).nullable().optional(),
  finalStage: z.nativeEnum(SuggestedStage).nullable().optional(),
  reviewNeeded: z.boolean().nullable().optional(),
});

export const createBaselineAssessmentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted YYYY-MM-DD'),
  assessorName: z.string().min(1, 'Assessor Name is required'),
  status: z.nativeEnum(AssessmentStatus).default(AssessmentStatus.PRESENT),
  keySupportFlag: z.string().nullable().optional(),
  oralFlag: z.nativeEnum(OralFlag).nullable().optional(),
  qcNotes: z.string().nullable().optional(),
  domainScores: z.array(domainScoreItemSchema).min(1, 'At least one domain score must be provided'),
});

export const updateBaselineAssessmentSchema = createBaselineAssessmentSchema.partial();

export const bulkImportBaselineAssessmentSchema = z.object({
  assessments: z.array(createBaselineAssessmentSchema).min(1, 'At least one assessment must be provided for bulk import'),
});
