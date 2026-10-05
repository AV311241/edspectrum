import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiIconComponent } from '../../shared/components/ui-icon/ui-icon.component';
import { BaselineAssessmentService } from '../../core/services/baseline-assessment.service';
import { BaselineAssessmentRecord } from '../../core/models/api.models';
import { ExcelValidator, ExcelValidationError } from '../../core/utils/excel-validator.utils';

@Component({
  selector: 'app-baseline-assessment',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  templateUrl: './baseline-assessment.component.html'
})
export class BaselineAssessmentComponent implements OnInit {
  readonly assessments = signal<BaselineAssessmentRecord[]>([]);
  readonly loading = signal<boolean>(false);
  readonly uploading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Client-side Excel validation errors modal/banner state
  readonly validationErrors = signal<ExcelValidationError[]>([]);
  readonly pendingFileAssessments = signal<BaselineAssessmentRecord[]>([]);
  readonly showValidationModal = signal<boolean>(false);

  readonly totalStudents = computed(() => this.assessments().length);
  readonly presentCount = computed(() => this.assessments().filter(a => a.status === 'Present').length);
  readonly absentCount = computed(() => this.assessments().filter(a => a.status === 'Absent').length);

  constructor(private assessmentService: BaselineAssessmentService) { }

  ngOnInit(): void {
    this.loadAssessments();
  }

  loadAssessments(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.assessmentService.getAll(1, 100).subscribe({
      next: (response: any) => {
        this.loading.set(false);
        const records = response?.records || response?.data?.records || (Array.isArray(response) ? response : []);
        this.assessments.set(records);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.error?.message || err?.message || 'Failed to load baseline assessments from server.');
      }
    });
  }

  /**
   * Client-side Typecheck & Upload handler
   */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.validationErrors.set([]);

    try {
      // Execute strict client-side Excel typecheck before sending anything to backend
      const result = await ExcelValidator.parseAndValidateExcel(file);

      if (!result.valid) {
        this.validationErrors.set(result.errors);
        this.showValidationModal.set(true);
        input.value = ''; // Reset file input
        return;
      }

      // If valid, execute bulk upload to backend
      this.pendingFileAssessments.set(result.assessments as any);
      this.executeBulkUpload(result.assessments as any);
    } catch (err) {
      this.errorMessage.set('Failed to process Excel file. Please ensure it is a valid .xlsx file.');
    } finally {
      input.value = '';
    }
  }

  executeBulkUpload(assessments: any[]): void {
    this.uploading.set(true);
    console.log(assessments);
    this.assessmentService.bulkImport(assessments).subscribe({
      next: (res: any) => {
        this.uploading.set(false);
        this.showValidationModal.set(false);
        const count = res?.importedCount ?? res?.data?.importedCount ?? assessments.length;
        this.successMessage.set(`Successfully imported ${count} baseline assessments!`);
        this.loadAssessments();
      },
      error: (err) => {
        this.uploading.set(false);
        this.errorMessage.set(err?.error?.error?.message || err?.message || 'Failed to upload baseline assessments to server.');
      }
    });
  }

  /**
   * Export wider 75-column Excel sheet
   */
  async onDownloadExcel(): Promise<void> {
    this.assessmentService.exportFlat().subscribe({
      next: async (res: any) => {
        const flatData = Array.isArray(res) ? res : (res?.data || []);
        console.log(flatData);
        try {
          if (flatData.length > 0) {
            await ExcelValidator.exportToExcel(flatData, `Baseline_Assessments_${new Date().toISOString().split('T')[0]}.xlsx`);
            this.successMessage.set('Baseline Assessment Excel file generated and downloaded successfully.');
          } else {
            // If server has no records yet, export currently displayed records
            const exportRecords = this.assessments().map(a => ({
              Student_ID: a.studentId,
              Assessment_Date: a.assessmentDate,
              Assessor: a.assessorName,
              Status: a.status,
              Key_Support_Flag: a.keySupportFlag || '',
              Oral_Flag: a.oralFlag || '',
              QC_Notes: a.qcNotes || ''
            }));
            await ExcelValidator.exportToExcel(exportRecords, `Baseline_Assessments_${new Date().toISOString().split('T')[0]}.xlsx`);
            this.successMessage.set('Exported current table view to Excel.');
          }
        } catch {
          this.errorMessage.set('Failed to generate the Excel file.');
        }
      },
      error: () => {
        this.errorMessage.set('Failed to fetch export dataset from server.');
      }
    });
  }

  getDomainScore(assessment: BaselineAssessmentRecord, domainName: string): string {
    const ds = assessment.domainScores?.find(d => d.domain === domainName);
    if (!ds) return '-';
    if (assessment.status === 'Absent') return 'AB';
    return `${ds.domainScore ?? 0}/20 (${ds.finalStage || ds.suggestedStage || 'S1'})`;
  }
}
