import { describe, expect, it, vi } from 'vitest';
import { seedDefaultAdmin, SeedClient } from './admin.seed';
import { ADMIN_ROLE_CODE } from '../middlewares/auth.middleware';

type Row = Record<string, unknown>;

/**
 * Builds a PrismaClient-shaped fake covering only the three calls the seed
 * makes: `role.upsert`, `user.findUnique`, `user.findFirst`, `user.create`.
 */
function fakeClient(overrides: {
  existingByEmail?: { id: number } | null;
  existingAdmin?: { id: number; email: string } | null;
} = {}): { client: SeedClient; create: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> } {
  const upsert = vi.fn().mockResolvedValue({ id: 7, code: ADMIN_ROLE_CODE, name: 'Administrator' });
  const create = vi.fn().mockResolvedValue({ id: 99 });
  const client = {
    role: { upsert },
    user: {
      findUnique: vi.fn().mockResolvedValue(overrides.existingByEmail ?? null),
      findFirst: vi.fn().mockResolvedValue(overrides.existingAdmin ?? null),
      create,
    },
  } as unknown as SeedClient;
  return { client, create, upsert };
}

describe('seedDefaultAdmin', () => {
  it('creates the ADMIN role and the default admin on a fresh database', async () => {
    const { client, create, upsert } = fakeClient();

    const result = await seedDefaultAdmin(client);

    expect(result).toBe('created');
    // Role must be upserted by its stable code, never assumed to pre-exist.
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: ADMIN_ROLE_CODE } })
    );
    expect(create).toHaveBeenCalledTimes(1);
    const created = create.mock.calls[0][0] as { data: Row };
    expect(created.data.email).toBe('admin@edspectrum.org');
    expect(created.data.roleId).toBe(7);
    expect(created.data.status).toBe('ACTIVE');
    // The plaintext default password must never reach the database.
    expect(created.data.passwordHash).not.toBe('ChangeMe#Admin1');
    expect(String(created.data.passwordHash)).toMatch(/^\$2[aby]\$/);
  });

  it('skips when the default admin email already exists', async () => {
    const { client, create } = fakeClient({ existingByEmail: { id: 42 } });

    const result = await seedDefaultAdmin(client);

    expect(result).toBe('skipped');
    expect(create).not.toHaveBeenCalled();
  });

  it('skips when any other administrator already exists', async () => {
    const { client, create } = fakeClient({
      existingAdmin: { id: 5, email: 'root@edspectrum.org' },
    });

    const result = await seedDefaultAdmin(client);

    expect(result).toBe('skipped');
    expect(create).not.toHaveBeenCalled();
  });

  it('is idempotent - a second run after creation also skips', async () => {
    const { client } = fakeClient();
    await seedDefaultAdmin(client);
    // Simulate the row existing on the next boot.
    (client.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 99 });

    await expect(seedDefaultAdmin(client)).resolves.toBe('skipped');
  });
});