import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminStudentRecord,
  ClassListRecord,
  CreateSchoolPayload,
  CreateStudentPayload,
  MAndEStatus,
  PaginatedResponse,
  ParentContact,
  ParentInteractionRecord,
  SchoolRecord,
  StudentFilter,
  UpdateStudentPayload,
} from '../models/admin.model';

/** Largest page the list endpoints accept, so we fetch as few requests as possible. */
const PAGE_SIZE = 100;

/** What the API returns for a successful delete, typed so callers get feedback. */
export interface MutationAck {
  success: boolean;
  message: string;
}

/**
 * Backs the `/admin` control tower with the live NGO API.
 *
 * Two deliberate patterns:
 *  - Every list call returns a **fully de-paginated array**, because the admin
 *    table searches and counts across the whole set rather than one page.
 *  - Nothing here catches errors. Each method lets a failure surface so the
 *    component can choose between a toast, an inline banner, or a silent
 *    fallback — the parent lookup, for instance, degrades to an empty map
 *    rather than blocking the roster.
 *
 * `PUT`/`DELETE /schools/{id}` are not exposed by the backend, so school
 * update/delete are deliberately absent rather than present-and-broken; the
 * admin UI shows a status badge for a school instead of those actions.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  private readonly schoolsUrl = `${environment.apiUrl}/schools`;
  private readonly classesUrl = `${environment.apiUrl}/classes`;
  private readonly studentsUrl = `${environment.apiUrl}/students`;
  private readonly parentsUrl = `${environment.apiUrl}/parent-interactions`;

  /** Page size plus any supplied filters, skipping blanks. */
  private pageParams(extra: Record<string, string | number | undefined> = {}): HttpParams {
    let params = new HttpParams().set('limit', String(PAGE_SIZE));
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  /** Collapses a paginated endpoint into one array, fanning out extra pages. */
  private fetchAllPages<T>(
    url: string,
    extraParams: Record<string, string | number | undefined> = {}
  ): Observable<T[]> {
    const load = (params: HttpParams) => this.http.get<PaginatedResponse<T>>(url, { params });

    return load(this.pageParams({ ...extraParams, page: 1 })).pipe(
      switchMap((initial) => {
        const remaining = Array.from(
          { length: Math.max(0, initial.totalPages - 1) },
          (_, index) => index + 2
        );
        if (remaining.length === 0) return of(initial.records);
        return forkJoin(
          remaining.map((page) => load(this.pageParams({ ...extraParams, page })))
        ).pipe(map((pages) => [initial.records, ...pages.map((p) => p.records)].flat()));
      })
    );
  }

  // ---------------------------------------------------------------- schools --

  getSchools(): Observable<SchoolRecord[]> {
    return this.http.get<SchoolRecord[]>(this.schoolsUrl);
  }

  /** Fails with 409 when the code is already taken. */
  createSchool(payload: CreateSchoolPayload): Observable<SchoolRecord> {
    return this.http.post<SchoolRecord>(this.schoolsUrl, { name: payload.name, code: payload.code });
  }

  // ---------------------------------------------------------------- classes --

  /** Every class section in one school, across all pages. */
  getClassesBySchool(schoolId: number): Observable<ClassListRecord[]> {
    return this.fetchAllPages<ClassListRecord>(this.classesUrl, { schoolId });
  }

  /** Creates a class section inside a school (e.g. `6A`, year `2026-2027`). */
  createClass(
    schoolId: number,
    payload: { className: string; academicYear: string }
  ): Observable<ClassListRecord> {
    return this.http.post<ClassListRecord>(`${this.schoolsUrl}/${schoolId}/classes`, payload);
  }

  updateClass(id: number, payload: { className: string; academicYear: string }): Observable<unknown> {
    return this.http.put(`${this.classesUrl}/${id}`, payload);
  }

  /** Rejected with 409 while the class still has enrolled students. */
  deleteClass(id: number): Observable<MutationAck> {
    return this.http.delete<MutationAck>(`${this.classesUrl}/${id}`);
  }

  // --------------------------------------------------------------- students --

  /** `filter.search` maps to the API's `search`, which matches id code and name. */
  getStudents(filter: StudentFilter): Observable<AdminStudentRecord[]> {
    return this.fetchAllPages<AdminStudentRecord>(this.studentsUrl, {
      schoolId: filter.schoolId ?? undefined,
      classId: filter.classId ?? undefined,
      search: filter.search,
    });
  }

  getStudentById(id: number): Observable<AdminStudentRecord> {
    return this.http.get<AdminStudentRecord>(`${this.studentsUrl}/${id}`);
  }

  createStudent(payload: CreateStudentPayload): Observable<AdminStudentRecord> {
    return this.http.post<AdminStudentRecord>(this.studentsUrl, payload);
  }

  updateStudent(id: number, payload: UpdateStudentPayload): Observable<AdminStudentRecord> {
    return this.http.put<AdminStudentRecord>(`${this.studentsUrl}/${id}`, payload);
  }

  deleteStudent(id: number): Observable<MutationAck> {
    return this.http.delete<MutationAck>(`${this.studentsUrl}/${id}`);
  }

  // -------------------------------------------------------- parent register --

  /**
   * The parent-interaction register is the only source of a parent name, and it
   * is keyed by `studentIdCode` rather than the numeric student id.
   *
   * Returns the **most recent** entry per student: the endpoint documents
   * itself as "newest interaction first", so the first row seen for a code is
   * the current one and any later duplicate is an older visit.
   */
  getParentContacts(className?: string): Observable<Map<string, ParentContact>> {
    return this.fetchAllPages<ParentInteractionRecord>(this.parentsUrl, { className }).pipe(
      map((records) => {
        const byStudent = new Map<string, ParentContact>();
        for (const record of records) {
          if (!byStudent.has(record.studentId)) {
            byStudent.set(record.studentId, {
              parentName: record.parentName,
              relation: record.relation,
            });
          }
        }
        return byStudent;
      })
    );
  }

  /** Class list plus school-wide roster, fetched together so neither step races. */
  getSchoolWorkspace(
    schoolId: number
  ): Observable<{ classes: ClassListRecord[]; students: AdminStudentRecord[] }> {
    return forkJoin({
      classes: this.getClassesBySchool(schoolId),
      students: this.getStudents({ schoolId, classId: null }),
    });
  }
}

/**
 * Re-exported so callers can derive a student's M&E status from the same
 * module they already use for the HTTP calls. The implementation itself lives
 * in `admin.model.ts`, where it stays free of any `@angular/common` import and
 * remains unit-testable on its own.
 */
export { toMAndEStatus } from '../models/admin.model';