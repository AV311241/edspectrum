import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BaselineAssessmentRecord,
  CreateBaselineAssessmentInput,
  UpdateBaselineAssessmentInput,
  PaginatedBaselineAssessmentResponse,
  BulkImportResponse,
} from '../models/api.models';

export type { BaselineAssessmentRecord as BaselineAssessment } from '../models/api.models';
export type { DomainScoreInput as DomainScoreItem } from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class BaselineAssessmentService {
  private readonly apiUrl = `${environment.apiUrl}/baseline-assessments`;

  constructor(private http: HttpClient) {}

  public getAll(page: number = 1, limit: number = 50): Observable<PaginatedBaselineAssessmentResponse> {
    return this.http.get<PaginatedBaselineAssessmentResponse>(`${this.apiUrl}?page=${page}&limit=${limit}`);
  }

  public getById(id: number): Observable<BaselineAssessmentRecord> {
    return this.http.get<BaselineAssessmentRecord>(`${this.apiUrl}/${id}`);
  }

  public getByStudentId(studentId: string): Observable<BaselineAssessmentRecord[]> {
    return this.http.get<BaselineAssessmentRecord[]>(`${this.apiUrl}/student/${encodeURIComponent(studentId)}`);
  }

  public create(assessment: CreateBaselineAssessmentInput): Observable<BaselineAssessmentRecord> {
    return this.http.post<BaselineAssessmentRecord>(this.apiUrl, assessment);
  }

  public bulkImport(assessments: CreateBaselineAssessmentInput[]): Observable<BulkImportResponse> {
    return this.http.post<BulkImportResponse>(`${this.apiUrl}/import`, { assessments });
  }

  public exportFlat(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.apiUrl}/export/flat`);
  }

  public update(id: number, assessment: UpdateBaselineAssessmentInput): Observable<BaselineAssessmentRecord> {
    return this.http.put<BaselineAssessmentRecord>(`${this.apiUrl}/${id}`, assessment);
  }

  public delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }
}
