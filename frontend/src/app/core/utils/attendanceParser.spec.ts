import { describe, expect, it } from 'vitest';
import {
  ALLOWED_STATUS_LABEL,
  DayMatrixPivotContext,
  buildIsoDate,
  daysInMonth,
  detectDayMatrixLayout,
  findDayMatrixHeaderRow,
  isValidCalendarContext,
  normalizeAttendanceStatus,
  normalizeMarkCell,
  parseOrdinalDay,
  pivotDayMatrix,
} from './attendanceParser';

const ctx: DayMatrixPivotContext = {
  month: 9,
  year: 2026,
  schoolCode: 'SCH-001',
  className: '6A',
  academicYear: '2026-2027',
};

// ---------------------------------------------------------------------------

describe('parseOrdinalDay', () => {
  it('reads ordinal headers with any suffix', () => {
    expect(parseOrdinalDay('1st')).toBe(1);
    expect(parseOrdinalDay('2nd')).toBe(2);
    expect(parseOrdinalDay('3rd')).toBe(3);
    expect(parseOrdinalDay('4th')).toBe(4);
    expect(parseOrdinalDay('11th')).toBe(11);
    expect(parseOrdinalDay('21st')).toBe(21);
    expect(parseOrdinalDay('31st')).toBe(31);
  });

  it('accepts bare numbers, since Excel often stores the ordinal as a number', () => {
    expect(parseOrdinalDay(7)).toBe(7);
    expect(parseOrdinalDay('07')).toBe(7);
    expect(parseOrdinalDay(' 15th ')).toBe(15);
  });

  it('rejects summary columns and out-of-range values', () => {
    for (const bad of ['Total class - 8', 'Average', 'Student_ID', '', null, undefined, 0, 32, '45th']) {
      expect(parseOrdinalDay(bad), String(bad)).toBeNull();
    }
  });
});

describe('buildIsoDate', () => {
  it('combines the selected month and year with a day column', () => {
    expect(buildIsoDate(2026, 9, 7)).toBe('2026-09-07');
    expect(buildIsoDate(2026, 1, 5)).toBe('2026-01-05');
  });

  it('rejects days the selected month does not have', () => {
    // February 2026 is not a leap year.
    expect(buildIsoDate(2026, 2, 29)).toBeNull();
    expect(buildIsoDate(2026, 2, 31)).toBeNull();
    expect(buildIsoDate(2026, 4, 31)).toBeNull();
    // ...but a leap February does have the 29th.
    expect(buildIsoDate(2028, 2, 29)).toBe('2028-02-29');
  });

  it('rejects an invalid month or year rather than rolling over', () => {
    expect(buildIsoDate(2026, 13, 1)).toBeNull();
    expect(buildIsoDate(2026, 0, 1)).toBeNull();
    expect(buildIsoDate(1899, 1, 1)).toBeNull();
    expect(buildIsoDate(2026, 9, 0)).toBeNull();
  });
});

describe('daysInMonth / isValidCalendarContext', () => {
  it('knows the real length of each month', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 9)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it('gates on an in-range 1-based month', () => {
    expect(isValidCalendarContext({ month: 9, year: 2026 })).toBe(true);
    expect(isValidCalendarContext({ month: 12, year: 2026 })).toBe(true);
    expect(isValidCalendarContext({ month: 13, year: 2026 })).toBe(false);
    expect(isValidCalendarContext({ month: 0, year: 2026 })).toBe(false);
    expect(isValidCalendarContext({ month: 9.5, year: 2026 })).toBe(false);
  });
});
// ---------------------------------------------------------------------------

describe('normalizeMarkCell', () => {
  it('maps the present/absent tokens case-insensitively', () => {
    expect(normalizeMarkCell('P')).toMatchObject({ status: 'P', remarks: '' });
    expect(normalizeMarkCell('p')).toMatchObject({ status: 'P', remarks: '' });
    expect(normalizeMarkCell('A')).toMatchObject({ status: 'A', remarks: '' });
    expect(normalizeMarkCell('a')).toMatchObject({ status: 'A', remarks: '' });
  });

  it('maps special text and preserves it as remarks', () => {
    expect(normalizeMarkCell('teacher on leave')).toMatchObject({
      status: 'ON_LEAVE',
      remarks: 'teacher on leave',
    });
    expect(normalizeMarkCell('School holiday - tadari')).toMatchObject({
      status: 'CANCELLED',
      remarks: 'School holiday - tadari',
    });
  });

  it('treats a blank cell as not-marked rather than inventing a status', () => {
    for (const blank of ['', '   ', null, undefined]) {
      expect(normalizeMarkCell(blank), JSON.stringify(blank)).toBeNull();
    }
  });

  it('returns null for text it cannot classify', () => {
    expect(normalizeMarkCell('maybe')).toBeNull();
    expect(normalizeMarkCell('PP')).toBeNull();
  });

  it('agrees with the shared status normaliser and the documented vocabulary', () => {
    expect(normalizeAttendanceStatus('P')).toBe('P');
    expect(normalizeAttendanceStatus('half day')).toBe('HALF_DAY');
    expect(normalizeAttendanceStatus('holiday')).toBe('CANCELLED');
    expect(ALLOWED_STATUS_LABEL).toBe('P, A, HALF_DAY, ACTIVITY, ON_LEAVE, CANCELLED');
  });
});

// ---------------------------------------------------------------------------

const headerRow = ['Student_ID', 'Student_Name', '1st', '2nd', '3rd', 'Total class - 8', 'Average'];

describe('detectDayMatrixLayout', () => {
  it('splits day columns from summary columns', () => {
    const layout = detectDayMatrixLayout([headerRow], 0, { month: 9, year: 2026 });
    expect(layout).not.toBeNull();
    expect(layout!.studentIdCol).toBe(0);
    expect(layout!.studentNameCol).toBe(1);
    expect(layout!.dayColumns.map((c) => c.isoDate)).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
  });

  it('reports the ignored columns instead of dropping them silently', () => {
    const layout = detectDayMatrixLayout([headerRow], 0, { month: 9, year: 2026 })!;
    expect(layout.skippedColumns.map((c) => c.header)).toEqual(['Total class - 8', 'Average']);
    expect(layout.skippedColumns[0].reason).toContain('Summary column');
  });

  it('skips an ordinal the selected month is too short to have', () => {
    // April has 30 days, so a 31st column cannot become a real date.
    const layout = detectDayMatrixLayout([['Student_ID', '30th', '31st']], 0, { month: 4, year: 2026 })!;
    expect(layout.dayColumns).toHaveLength(1);
    expect(layout.dayColumns[0].isoDate).toBe('2026-04-30');
    expect(layout.skippedColumns[0].header).toBe('31st');
    expect(layout.skippedColumns[0].reason).toContain('30 days');
  });

  it('returns null when the chosen month has no day columns at all', () => {
    // February 2026 has neither a 30th nor a 31st, so nothing can be pivoted.
    expect(detectDayMatrixLayout([['Student_ID', '30th', '31st']], 0, { month: 2, year: 2026 })).toBeNull();
  });

  it('rejects a duplicate day column rather than double-counting it', () => {
    const layout = detectDayMatrixLayout([['Student_ID', '5th', '5th']], 0, { month: 9, year: 2026 })!;
    expect(layout.dayColumns).toHaveLength(1);
    expect(layout.skippedColumns[0].reason).toContain('Duplicate');
  });

  it('returns null when the header row has no student-id column', () => {
    expect(detectDayMatrixLayout([['Foo', '1st', '2nd']], 0, { month: 9, year: 2026 })).toBeNull();
  });
});

describe('findDayMatrixHeaderRow', () => {
  it('tolerates title rows above the header', () => {
    expect(findDayMatrixHeaderRow([['Attendance Register'], ['September 2026'], headerRow])).toBe(2);
  });

  it('returns -1 for a sheet with no ordinal day columns', () => {
    expect(findDayMatrixHeaderRow([['Student_ID', '2026-01-05']])).toBe(-1);
  });
});

// ---------------------------------------------------------------------------

describe('pivotDayMatrix', () => {
  const pivot = (rows: unknown[][]) => {
    const headerIndex = findDayMatrixHeaderRow(rows);
    const layout = detectDayMatrixLayout(rows, headerIndex, ctx)!;
    return pivotDayMatrix(rows, layout, ctx);
  };

  const header = ['Student_ID', 'Student_Name', '1st', '2nd', '3rd', 'Total class - 8', 'Average'];

  it('expands one spreadsheet row into one flat record per marked day', () => {
    const result = pivot([header, ['EDSF 035', 'Abhinav', 'P', 'P', 'A', '12', '40']]);

    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((r) => r.cells['sessionDate'])).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
    expect(result.rows.map((r) => r.cells['status'])).toEqual(['P', 'P', 'A']);
    // Every logical row carries the class context the sheet omitted.
    for (const row of result.rows) {
      expect(row.cells['schoolCode']).toBe('SCH-001');
      expect(row.cells['className']).toBe('6A');
      expect(row.cells['academicYear']).toBe('2026-2027');
      expect(row.cells['studentId']).toBe('EDSF 035');
    }
    // All three share spreadsheet row 2, as a pivot necessarily does.
    expect(result.rows.map((r) => r.rowIndex)).toEqual([2, 2, 2]);
  });

  it('skips blank cells instead of fabricating an attendance mark', () => {
    const result = pivot([header, ['EDSF 035', 'Abhinav', 'P', '', 'A', '10', '33']]);

    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.cells['sessionDate'])).toEqual(['2026-09-01', '2026-09-03']);
    expect(result.blankCellCount).toBe(1);
    expect(result.markedCellCount).toBe(2);
  });

  it('preserves the author wording as remarks for special text', () => {
    const result = pivot([header, ['EDSF 035', 'Abhinav', 'teacher on leave', 'School holiday - tadari', 'P', '', '']]);

    expect(result.rows[0].cells).toMatchObject({
      sessionDate: '2026-09-01',
      status: 'ON_LEAVE',
      remarks: 'teacher on leave',
    });
    expect(result.rows[1].cells).toMatchObject({
      sessionDate: '2026-09-02',
      status: 'CANCELLED',
      remarks: 'School holiday - tadari',
    });
  });

  it('collapses a class-wide day column into one student-less record', () => {
    // Both students report the same holiday on the 2nd. The backend buckets
    // CANCELLED by (class, date), so emitting two rows would overwrite one.
    const result = pivot([
      header,
      ['EDSF 035', 'Abhinav', 'P', 'School holiday - tadari', 'P', '', ''],
      ['EDSF 042', 'Adarsh', 'P', 'School holiday - tadari', 'P', '', ''],
    ]);

    const holidayRows = result.rows.filter((r) => r.cells['sessionDate'] === '2026-09-02');
    expect(holidayRows).toHaveLength(1);
    expect(holidayRows[0].cells).toMatchObject({
      status: 'CANCELLED',
      studentId: '',
      remarks: 'School holiday - tadari',
    });
    expect(result.classWideDates).toEqual(['2026-09-02']);
  });

  it('still emits per-student marks on days that were genuinely held', () => {
    const result = pivot([
      header,
      ['EDSF 035', 'Abhinav', 'P', 'School holiday - tadari', 'P', '', ''],
      ['EDSF 042', 'Adarsh', 'P', 'School holiday - tadari', 'A', '', ''],
    ]);

    const day1 = result.rows.filter((r) => r.cells['sessionDate'] === '2026-09-01');
    expect(day1).toHaveLength(2);
    expect(day1.map((r) => r.cells['studentId'])).toEqual(['EDSF 035', 'EDSF 042']);
  });

  it('keeps unclassifiable text verbatim so validation can flag it', () => {
    const result = pivot([header, ['EDSF 035', 'Abhinav', 'P', 'maybe', 'A', '', '']]);

    const bad = result.rows.find((r) => r.cells['sessionDate'] === '2026-09-02');
    expect(bad?.cells['status']).toBe('maybe');
    // The untouched cell is retained so the rule engine can read it back.
    expect(bad?.rawCells['status']).toBe('maybe');
  });

  it('ignores the summary columns entirely', () => {
    const result = pivot([header, ['EDSF 035', 'Abhinav', 'P', 'P', 'P', '999', '100']]);
    expect(result.rows).toHaveLength(3);
    expect(result.rows.some((r) => r.cells['status'] === '999')).toBe(false);
  });

  it('produces no records when every day cell is blank', () => {
    const result = pivot([header, ['EDSF 035', 'Abhinav', '', '', '', '0', '0']]);
    expect(result.rows).toHaveLength(0);
    expect(result.blankCellCount).toBe(3);
  });
});
