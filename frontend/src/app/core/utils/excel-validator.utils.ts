import * as XLSX from 'xlsx';
import { CreateBaselineAssessmentInput, DomainScoreInput, OralFlag, BaselineDomain, AssessmentStatus } from '../models/api.models';

export interface ExcelValidationError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ParseExcelResult {
  valid: boolean;
  errors: ExcelValidationError[];
  assessments: CreateBaselineAssessmentInput[];
  totalRows: number;
}

export class ExcelValidator {
  private static readonly DOMAINS: BaselineDomain[] = [
    'Vocabulary', 'Grammar', 'Phrase_Sentence', 'Listening', 'Speaking', 'Reading', 'Writing'
  ];

  private static readonly DOMAIN_PREFIXES: Record<string, string> = {
    Vocabulary: 'V',
    Grammar: 'G',
    Phrase_Sentence: 'P',
    Listening: 'L',
    Speaking: 'S',
    Reading: 'R',
    Writing: 'W'
  };

  private static normalizeKey(str: string): string {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private static parseExcelDate(val: unknown): string {
    if (val === null || val === undefined || String(val).trim() === '') {
      return new Date().toISOString().split('T')[0];
    }
    // Handle Excel numeric date serials (e.g. 45312)
    if (typeof val === 'number') {
      const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toISOString().split('T')[0];
      }
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return '';
  }

  /**
   * Parse Excel File and execute robust client-side validation
   */
  public static async parseAndValidateExcel(file: File): Promise<ParseExcelResult> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return { valid: false, errors: [{ rowNumber: 0, field: 'File', message: 'Excel workbook contains no sheets' }], assessments: [], totalRows: 0 };
    }

    const sheet = workbook.Sheets[firstSheetName];
    // Convert to 2D array of raw values
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

    if (!rows || rows.length === 0) {
      return { valid: false, errors: [{ rowNumber: 0, field: 'File', message: 'Excel sheet is completely empty' }], assessments: [], totalRows: 0 };
    }

    // Find Header Row by looking for studentid / student_id column
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const row = rows[i] as unknown[];
      if (row && row.some(cell => {
        const norm = ExcelValidator.normalizeKey(String(cell || ''));
        return norm === 'studentid' || norm === 'studentcode' || norm === 'id';
      })) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return {
        valid: false,
        errors: [{ rowNumber: 1, field: 'Header', message: 'Missing required header column "Student_ID" or "Student ID"' }],
        assessments: [],
        totalRows: 0,
      };
    }

    const rawHeaders = (rows[headerRowIndex] as unknown[]).map(h => String(h || '').trim());
    const dataRows = rows.slice(headerRowIndex + 1);

    const errors: ExcelValidationError[] = [];
    const parsedAssessments: CreateBaselineAssessmentInput[] = [];

    dataRows.forEach((row, idx) => {
      const excelRowNumber = headerRowIndex + 2 + idx;

      // Skip completely empty rows
      if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
        return;
      }

      // Build normalized header lookup map
      const normalizedRowMap = new Map<string, unknown>();
      rawHeaders.forEach((h, colIdx) => {
        if (h) {
          const normKey = ExcelValidator.normalizeKey(h);
          normalizedRowMap.set(normKey, row[colIdx]);
        }
      });

      const getVal = (...possibleKeys: string[]): unknown => {
        for (const k of possibleKeys) {
          const norm = ExcelValidator.normalizeKey(k);
          if (normalizedRowMap.has(norm)) {
            return normalizedRowMap.get(norm);
          }
        }
        return undefined;
      };

      // 1. Validate Student ID
      const studentIdRaw = getVal('Student_ID', 'Student ID', 'StudentID', 'StudentCode', 'ID');
      const studentId = String(studentIdRaw || '').trim();
      if (!studentId) {
        errors.push({ rowNumber: excelRowNumber, field: 'Student_ID', message: 'Student ID is required' });
      }

      // 2. Validate Assessment Date
      const rawDate = getVal('Assessment_Date', 'Assessment Date', 'AssessmentDate', 'Date');
      const assessmentDate = ExcelValidator.parseExcelDate(rawDate);
      if (!assessmentDate) {
        errors.push({ rowNumber: excelRowNumber, field: 'Assessment_Date', message: `Invalid date format "${rawDate}". Expected YYYY-MM-DD` });
      }

      // 3. Validate Assessor Name
      const assessorRaw = getVal('Assessor', 'Assessor_Name', 'Assessor Name', 'AssessorName');
      const assessorName = String(assessorRaw || 'Assessor').trim();

      // 4. Validate Status
      const statusRaw = String(getVal('Status') || 'Present').trim().toLowerCase();
      let status: AssessmentStatus = 'Present';
      if (statusRaw === 'absent' || statusRaw === 'ab') {
        status = 'Absent';
      } else if (statusRaw === 'partial') {
        status = 'Partial';
      } else if (statusRaw !== 'present' && statusRaw !== '') {
        errors.push({ rowNumber: excelRowNumber, field: 'Status', message: `Invalid status "${statusRaw}". Must be Present, Absent, or Partial` });
      }

      // 5. Parse 7 Domain Scores & Rating item values (0 to 4)
      const domainScores: DomainScoreInput[] = [];
      let totalValidItemsCount = 0;

      this.DOMAINS.forEach((domain) => {
        const prefix = this.DOMAIN_PREFIXES[domain];

        const getItemVal = (num: number): number | null => {
          const valRaw = getVal(`${prefix}${num}`);
          if (valRaw === null || valRaw === undefined || String(valRaw).trim() === '' || String(valRaw).trim().toUpperCase() === 'AB') {
            return null;
          }
          const numVal = Number(valRaw);
          if (isNaN(numVal) || !Number.isInteger(numVal) || numVal < 0 || numVal > 4) {
            errors.push({
              rowNumber: excelRowNumber,
              field: `${prefix}${num}`,
              message: `Invalid rating "${valRaw}" for ${domain} Item ${num}. Rating must be an integer between 0 and 4 or 'AB'`,
            });
            return null;
          }
          totalValidItemsCount++;
          return numVal;
        };

        const item1 = getItemVal(1);
        const item2 = getItemVal(2);
        const item3 = getItemVal(3);
        const item4 = getItemVal(4);
        const item5 = getItemVal(5);

        domainScores.push({
          domain,
          item1: status === 'Absent' ? null : item1,
          item2: status === 'Absent' ? null : item2,
          item3: status === 'Absent' ? null : item3,
          item4: status === 'Absent' ? null : item4,
          item5: status === 'Absent' ? null : item5,
        });
      });

      // If status is Present, verify at least some domain ratings exist
      if (status === 'Present' && totalValidItemsCount === 0) {
        errors.push({
          rowNumber: excelRowNumber,
          field: 'DomainScores',
          message: 'Student marked Present but all 35 rating item scores (V1-W5) are empty',
        });
      }

      // 6. Oral Flag
      const oralFlagRaw = String(getVal('Oral_Flag', 'Oral Flag', 'OralFlag') || '').trim().toUpperCase();
      const oralFlag = (['C0', 'C1', 'C2', 'C3'].includes(oralFlagRaw) ? oralFlagRaw : null) as OralFlag | null;

      // 7. Key Support Flag & QC Notes
      const keySupportFlag = String(getVal('Key_Support_Flag', 'Key Support Flag') || '').trim() || null;
      const qcNotes = String(getVal('QC_Notes', 'QC Notes', 'QCNotes', 'Notes') || '').trim() || null;

      parsedAssessments.push({
        studentId,
        assessmentDate,
        assessorName,
        status,
        keySupportFlag,
        oralFlag,
        qcNotes,
        domainScores,
      });
    });

    if (parsedAssessments.length === 0 && errors.length === 0) {
      errors.push({ rowNumber: 0, field: 'Data', message: 'No valid assessment data rows found in Excel sheet' });
    }

    return {
      valid: errors.length === 0,
      errors,
      assessments: parsedAssessments,
      totalRows: parsedAssessments.length,
    };
  }

  /**
   * Export dataset to 75-column Excel sheet matching standard Lumino1 schema
   */
  public static exportToExcel(records: Record<string, unknown>[], filename: string = 'Baseline_Assessments.xlsx'): void {
    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Baseline Assessments');
    XLSX.writeFile(workbook, filename);
  }
}
