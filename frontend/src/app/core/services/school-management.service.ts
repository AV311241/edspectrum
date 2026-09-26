import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SchoolRecord {
  id: number;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

export interface ClassRecord {
  id: number;
  className: string;
  academicYear: string | null;
  totalStudents: number;
  createdAt: string;
}

export interface StudentRecord {
  id: number;
  studentIdCode: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'INACTIVE';
  enrolledAt: string;
}

interface SchoolClassesResponse {
  school: Pick<SchoolRecord, 'id' | 'code' | 'name'>;
  classes: ClassRecord[];
}

interface RosterPage {
  records: StudentRecord[];
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class SchoolManagementService {
  private readonly http = inject(HttpClient);
  private readonly schoolsUrl = `${environment.apiUrl}/schools`;
  private readonly classesUrl = `${environment.apiUrl}/classes`;

  listSchools(): Promise<SchoolRecord[]> {
    return firstValueFrom(this.http.get<SchoolRecord[]>(this.schoolsUrl));
  }

  createSchool(input: { code: string; name: string }): Promise<SchoolRecord> {
    return firstValueFrom(this.http.post<SchoolRecord>(this.schoolsUrl, input));
  }

  getClasses(schoolId: number): Promise<SchoolClassesResponse> {
    return firstValueFrom(
      this.http.get<SchoolClassesResponse>(`${this.schoolsUrl}/${schoolId}/classes`)
    );
  }

  createClass(
    schoolId: number,
    input: { className: string; academicYear: string }
  ): Promise<ClassRecord> {
    return firstValueFrom(
      this.http.post<ClassRecord>(`${this.schoolsUrl}/${schoolId}/classes`, input)
    );
  }

  updateClass(id: number, input: { name: string; academicYear: string }): Promise<unknown> {
    return firstValueFrom(this.http.put(`${this.classesUrl}/${id}`, input));
  }

  deleteClass(id: number): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${this.classesUrl}/${id}`));
  }

  async getClassStudents(classId: number): Promise<StudentRecord[]> {
    const firstPage = await firstValueFrom(
      this.http.get<RosterPage>(`${this.classesUrl}/${classId}/students`, {
        params: { page: 1, limit: 100 },
      })
    );
    const otherPages = await Promise.all(
      Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
        firstValueFrom(
          this.http.get<RosterPage>(`${this.classesUrl}/${classId}/students`, {
            params: { page: index + 2, limit: 100 },
          })
        )
      )
    );
    return [firstPage, ...otherPages].flatMap((page) => page.records);
  }

  updateStudent(
    id: number,
    input: { firstName: string; lastName: string; status: StudentRecord['status'] }
  ): Promise<unknown> {
    return firstValueFrom(this.http.put(`${environment.apiUrl}/students/${id}`, input));
  }

  transferStudent(
    id: number,
    fromClassSectionId: number,
    toClassSectionId: number
  ): Promise<unknown> {
    return firstValueFrom(
      this.http.post(`${environment.apiUrl}/students/${id}/transfer`, {
        fromClassSectionId,
        toClassSectionId,
      })
    );
  }
}