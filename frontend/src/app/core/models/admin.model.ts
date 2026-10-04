import { ClassListRecord, SchoolRecord } from '../services/school-management.service';

/**
 * View models for the `/admin` control tower.
 *
 * Every shape here mirrors a schema in `backend/src/generated/swagger.yaml`,
 * so switching the admin module from the live API to recorded fixtures (or the
 * other way round) never requires a template change.
 *
 * `SchoolRecord` and `ClassListRecord` are imported from the existing
 * `SchoolManagementService` rather than redeclared, so the schools page and the
 * admin page can never drift apart on what a school or a class section is.
 */

export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED';
export type EnrollmentStatus = 'TRANSFERRED' | 'PRESENT' | 'ABSENT' | 'EXCLUDED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type SchoolStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

/** `EnrollmentRecordDTO` — the student's live class placement, when enrolled. */
export interface EnrollmentRecord {
  id: number;
  studentId: number;
  classSectionId: number;
  schoolId: number | null;
  withdrawnDate: string | null;
  status: EnrollmentStatus;
  isCurrent: boolean;
  createdAt: string;
  className?: string;
}

/**
 * `StudentResponseDTO` as returned by `GET /students`, `GET /students/{id}`
 * and `POST`/`PUT /students`.
 *
 * `phone` / `contactNumber` are declared but **not currently returned** by the
 * API. They are declared so the Phone column and its form control already have
 * a slot to fill the moment the backend grows the field; until then every
 * screen renders the em-dash placeholder.
 */
export interface AdminStudentRecord {
  id: number;
  schoolId: number;
  classId: number | null;
  studentIdCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
  createdById: number;
  schoolName?: string;
  className?: string;
  currentEnrollment?: EnrollmentRecord | null;
  phone?: string | null;
  contactNumber?: string | null;
}

/** Generic paginated envelope used by every list endpoint in the API. */
export interface PaginatedResponse<T> {
  records: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** One row of `GET /parent-interactions`. */
export interface ParentInteractionRecord {
  id: number;
  studentId: string;
  studentName: string;
  class: string;
  parentName: string;
  relation: string | null;
  date: string;
  createdAt: string;
}

/** The parent details the register knows about one student. */
export interface ParentContact {
  parentName: string;
  relation: string | null;
}

/**
 * Monitoring & Evaluation status shown in the table.
 *
 * The API has no dedicated M&E column, so this is derived from the student's
 * live `EnrollmentRecordDTO.status` and falls back to the student's own status
 * when they are not enrolled. Once the backend exposes a real field, change
 * `toMAndEStatus` in the component and nothing else moves.
 */
export type MAndEStatus = 'ENROLLED' | 'TRANSFERRED' | 'EXCLUDED' | 'NOT_ENROLLED';

/**
 * A student joined up with the derived, display-ready fields the table and the
 * profile card render. Keeping derivation here (instead of in the template)
 * means the search dropdown, the table and the profile card always agree.
 */
export interface AdminStudentView {
  record: AdminStudentRecord;
  studentIdCode: string;
  fullName: string;
  classLabel: string;
  status: StudentStatus;
  mAndEStatus: MAndEStatus;
  /** `null` until the parent register is hydrated for the current class. */
  parentName: string | null;
  parentRelation: string | null;
  phone: string | null;
}

export interface StudentFilter {
  schoolId: number | null;
  classId: number | null;
  search?: string;
}

/** Body of `POST /students`. */
export interface CreateStudentPayload {
  schoolId: number;
  studentIdCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  classId?: number | null;
}

/** Body of `PUT /students/{id}` — every field is optional server-side. */
export interface UpdateStudentPayload {
  schoolId?: number;
  studentIdCode?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  classId?: number | null;
  status?: StudentStatus;
}

/**
 * Body of `POST /schools`.
 *
 * The backend only accepts `code` and `name`; `location` has no column yet and
 * is kept here so the form can render it without a rewrite later.
 */
export interface CreateSchoolPayload {
  name: string;
  code: string;
  location?: string;
}

export type { ClassListRecord, SchoolRecord };

/**
 * Derives the M&E status shown in the admin table.
 *
 * The API has no M&E column, so this reads the student's live enrolment: an
 * excluded learner is flagged as such, a transferred one is marked as moved,
 * and anyone without a current enrolment falls back to their record status.
 *
 * This lives with the models rather than in `AdminService` for two reasons: it
 * is a pure function of its input, and keeping it free of any `@angular/common`
 * import means it can be unit-tested without pulling `HttpClient` (and its
 * JIT-compiled `BrowserXhr`) into the test bundle.
 */
export function toMAndEStatus(student: AdminStudentRecord): MAndEStatus {
  const enrollment = student.currentEnrollment;
  if (enrollment?.isCurrent) {
    if (enrollment.status === 'EXCLUDED') return 'EXCLUDED';
    if (enrollment.status === 'TRANSFERRED') return 'TRANSFERRED';
    return 'ENROLLED';
  }
  if (student.status === 'TRANSFERRED') return 'TRANSFERRED';
  return 'NOT_ENROLLED';
}