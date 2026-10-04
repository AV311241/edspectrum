import { describe, expect, it } from 'vitest';
import { AdminStudentRecord, toMAndEStatus } from '../models/admin.model';

/** Minimal StudentResponseDTO with the fields the status logic reads. */
function student(overrides: Partial<AdminStudentRecord> = {}): AdminStudentRecord {
  return {
    id: 1,
    schoolId: 1,
    classId: 10,
    studentIdCode: 'STU-0001',
    firstName: 'Aarav',
    lastName: 'Sharma',
    dateOfBirth: null,
    gender: null,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    createdById: 1,
    ...overrides,
  };
}

describe('toMAndEStatus', () => {
  it('reports a learner with a current enrolment as enrolled', () => {
    const result = toMAndEStatus(
      student({
        currentEnrollment: {
          id: 5,
          studentId: 1,
          classSectionId: 10,
          schoolId: 1,
          withdrawnDate: null,
          status: 'PRESENT',
          isCurrent: true,
          createdAt: '2026-01-01T00:00:00Z',
        },
      })
    );

    expect(result).toBe('ENROLLED');
  });

  it('flags an excluded learner even while their record stays ACTIVE', () => {
    const result = toMAndEStatus(
      student({
        status: 'ACTIVE',
        currentEnrollment: {
          id: 5,
          studentId: 1,
          classSectionId: 10,
          schoolId: 1,
          withdrawnDate: '2026-03-01',
          status: 'EXCLUDED',
          isCurrent: true,
          createdAt: '2026-01-01T00:00:00Z',
        },
      })
    );

    expect(result).toBe('EXCLUDED');
  });

  it('marks a transferred learner as transferred', () => {
    const result = toMAndEStatus(
      student({
        currentEnrollment: {
          id: 5,
          studentId: 1,
          classSectionId: 11,
          schoolId: 1,
          withdrawnDate: '2026-02-01',
          status: 'TRANSFERRED',
          isCurrent: true,
          createdAt: '2026-01-01T00:00:00Z',
        },
      })
    );

    expect(result).toBe('TRANSFERRED');
  });

  it('falls back to the student status when there is no current enrolment', () => {
    expect(toMAndEStatus(student({ status: 'ACTIVE', currentEnrollment: null }))).toBe(
      'NOT_ENROLLED'
    );
    expect(toMAndEStatus(student({ status: 'TRANSFERRED', currentEnrollment: null }))).toBe(
      'TRANSFERRED'
    );
  });

  it('ignores a stale enrolment that is no longer current', () => {
    const result = toMAndEStatus(
      student({
        status: 'INACTIVE',
        currentEnrollment: {
          id: 5,
          studentId: 1,
          classSectionId: 10,
          schoolId: 1,
          withdrawnDate: '2026-02-01',
          status: 'PRESENT',
          isCurrent: false,
          createdAt: '2026-01-01T00:00:00Z',
        },
      })
    );

    expect(result).toBe('NOT_ENROLLED');
  });
});