import { describe, expect, it } from 'vitest';
import { isAdminUser } from './admin.guard';
import { UserResponseDTO } from '../models/api.models';

function user(overrides: Partial<UserResponseDTO> = {}): UserResponseDTO {
  return {
    id: 1,
    email: 'someone@edspectrum.org',
    firstName: 'Some',
    lastName: 'One',
    roleId: 2,
    status: 'ACTIVE',
    schoolId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('isAdminUser', () => {
  it('rejects a missing session', () => {
    expect(isAdminUser(null)).toBe(false);
  });

  it('accepts the stable ADMIN role code', () => {
    expect(isAdminUser(user({ roleCode: 'ADMIN' }))).toBe(true);
  });

  it('rejects non-admin role codes even when roleId is 1', () => {
    // The role CODE wins over the legacy numeric id so a database whose first
    // role is not ADMIN cannot leak admin UI to a teacher.
    expect(isAdminUser(user({ roleCode: 'TEACHER', roleId: 1 }))).toBe(false);
  });

  it('falls back to the legacy roleId for sessions stored before roleCode existed', () => {
    expect(isAdminUser(user({ roleId: 1 }))).toBe(true);
    expect(isAdminUser(user({ roleId: 2 }))).toBe(false);
  });
});