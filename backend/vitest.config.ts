import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the backend.
 *
 * Tests live next to the code they cover (`src/**\/*.spec.ts`) and run in a
 * plain Node environment - no DOM, no database. Anything that needs Prisma
 * should be tested through its repository interface with a hand-written fake
 * rather than a live MySQL connection.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    restoreMocks: true,
    // The cache module logs and schedules timers; keep the console readable.
    silent: true,
  },
});
