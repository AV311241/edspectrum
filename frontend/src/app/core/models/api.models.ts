/**
 * OpenAPI 3.0 Auto-Generated / Strictly-Typed Frontend Data Models
 * Source: backend/src/generated/swagger.yaml
 */

export type BaselineDomain =
  | 'Vocabulary'
  | 'Grammar'
  | 'Phrase_Sentence'
  | 'Listening'
  | 'Speaking'
  | 'Reading'
  | 'Writing';

export type AssessmentStatus = 'Present' | 'Absent' | 'Partial';

export type OralFlag = 'C0' | 'C1' | 'C2' | 'C3';

export type SuggestedStage = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'Review' | 'AB';

export interface UserResponseDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number;
  /**
   * Stable role code from the backend (`'ADMIN'` for administrators).
   * Optional only because sessions stored before this field existed won't
   * have it - the admin guard falls back to the legacy numeric roleId.
   */
  roleCode?: string;
  status: 'ACTIVE' | 'INACTIVE';
  schoolId: number | null;
  createdAt: string;
}

/** Response body of `POST /auth/login`. */
export interface AuthSessionResponse {
  user: UserResponseDTO;
  token: string;
}

/**
 * Body of `POST /users` - admin-only account creation.
 * The backend hashes `password`; there is no self-registration flow.
 */
export interface CreateUserDTO {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleId: number;
  schoolId?: number | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

/** Body of `PUT /users/{id}` - every field optional (partial update). */
export interface UpdateUserDTO {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  roleId?: number;
  schoolId?: number | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

/** A row from `GET /roles` - the pick-list for user creation. */
export interface RoleRecord {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

/** Response body of `DELETE /users/{id}`. */
export interface DeleteResponseDTO {
  success: boolean;
  message: string;
}

export interface DomainScoreRecord {
  id: number;
  assessmentId: number;
  domain: BaselineDomain;
  item1: number | null;
  item2: number | null;
  item3: number | null;
  item4: number | null;
  item5: number | null;
  domainScore: number;
  suggestedStage: SuggestedStage;
  finalStage: SuggestedStage | null;
  reviewNeeded: boolean;
  createdAt: string;
}

export interface BaselineAssessmentRecord {
  id: number;
  studentId: string;
  assessmentDate: string;
  assessorName: string;
  status: AssessmentStatus;
  keySupportFlag: string | null;
  oralFlag: OralFlag | null;
  qcNotes: string | null;
  createdAt: string;
  updatedAt: string;
  domainScores?: DomainScoreRecord[];
}

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
  records: BaselineAssessmentRecord[];
  total: number;
  page: number;
  totalPages: number;
}

export interface BulkImportResponse {
  importedCount: number;
  records: BaselineAssessmentRecord[];
}
