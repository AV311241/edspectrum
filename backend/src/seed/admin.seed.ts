import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '../config/db.config';
import { envConfig } from '../config/env.config';
import { logger } from '../config/logger.config';
import { ADMIN_ROLE_CODE } from '../middlewares/auth.middleware';

const SALT_ROUNDS = 12;

export type SeedResult = 'created' | 'skipped';

/** Minimal slice of PrismaClient the seed needs - keeps the unit test fakes honest. */
export type SeedClient = Pick<PrismaClient, 'role' | 'user'>;

/**
 * Startup seed for the platform administrator.
 *
 * Runs on every boot and is idempotent by design:
 *   1. Ensures the `ADMIN` role exists (created first on a fresh database so
 *      it receives id 1, matching the historical `roleId === 1` assumption
 *      elsewhere - but nothing here relies on that number).
 *   2. Skips entirely when an administrator already exists - either a user
 *      with the configured default email, or ANY user holding the ADMIN role.
 *   3. Otherwise creates the default admin from the `DEFAULT_ADMIN_*` env
 *      credentials with a bcrypt-hashed password.
 *
 * The client is injectable so the create/skip branches can be unit-tested
 * without a live MySQL instance.
 */
export async function seedDefaultAdmin(client: SeedClient = prisma): Promise<SeedResult> {
  const email = envConfig.DEFAULT_ADMIN_EMAIL;

  // 1. The role is reference data - upsert so a database that has roles but
  //    no ADMIN row still converges to one.
  const adminRole = await client.role.upsert({
    where: { code: ADMIN_ROLE_CODE },
    update: {},
    create: {
      code: ADMIN_ROLE_CODE,
      name: 'Administrator',
      description: 'Full control over user management and platform configuration',
    },
  });

  // 2a. The configured default admin already exists -> nothing to do.
  const byEmail = await client.user.findUnique({ where: { email }, select: { id: true } });
  if (byEmail) {
    logger.info(`[seed] Default admin '${email}' already exists (id=${byEmail.id}) - skipping`);
    return 'skipped';
  }

  // 2b. Some other administrator exists (e.g. created manually) -> still skip,
  //     creating a second admin would defeat the idempotency contract.
  const anyAdmin = await client.user.findFirst({
    where: { roleId: adminRole.id },
    select: { id: true, email: true },
  });
  if (anyAdmin) {
    logger.info(
      `[seed] Administrator '${anyAdmin.email}' already exists (id=${anyAdmin.id}) - skipping default admin creation`
    );
    return 'skipped';
  }

  // 3. Fresh database - create the default administrator.
  if (envConfig.NODE_ENV === 'production' && !process.env.DEFAULT_ADMIN_PASSWORD) {
    logger.warn(
      '[seed] Creating the default admin with the BUILT-IN password in production. ' +
        'Set DEFAULT_ADMIN_PASSWORD before deploying and change the password after first sign-in.'
    );
  }

  const passwordHash = await bcrypt.hash(envConfig.DEFAULT_ADMIN_PASSWORD, SALT_ROUNDS);
  const admin = await client.user.create({
    data: {
      email,
      firstName: envConfig.DEFAULT_ADMIN_FIRST_NAME,
      lastName: envConfig.DEFAULT_ADMIN_LAST_NAME,
      passwordHash,
      roleId: adminRole.id,
      status: 'ACTIVE',
    },
    select: { id: true },
  });

  logger.info(
    `[seed] Created default administrator '${email}' (id=${admin.id}, roleId=${adminRole.id})`
  );
  return 'created';
}