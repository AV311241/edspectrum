import 'reflect-metadata';
import { createApp } from './src/index';

/**
 * Smoke test: boots the Express app WITHOUT a database and verifies the
 * auth gate wiring:
 *   - /health must be public (200)
 *   - /docs/swagger.json must be public (200)
 *   - /students without a token must be 401
 *   - /students with a garbage token must be 401
 */
async function main(): Promise<void> {
  const app = createApp();
  const server = app.listen(0, async () => {
    try {
      const address = server.address();
      if (address === null || typeof address === 'string') throw new Error('no port');
      const base = `http://127.0.0.1:${address.port}`;

      const health = await fetch(`${base}/health`);
      const docs = await fetch(`${base}/docs/swagger.json`);
      const protectedNoToken = await fetch(`${base}/students`);
      const protectedBadToken = await fetch(`${base}/students`, {
        headers: { Authorization: 'Bearer not-a-real-token' },
      });
      const loginPage = await fetch(`${base}/auth/login`, { method: 'POST' });

      console.log('health             =', health.status, '(expect 200)');
      console.log('docs swagger.json  =', docs.status, '(expect 200)');
      console.log('students no token  =', protectedNoToken.status, '(expect 401)');
      console.log('students bad token =', protectedBadToken.status, '(expect 401)');
      console.log('login POST no body =', loginPage.status, '(expect 400 validation, NOT 401 gate)');

      const noTokenBody = await protectedNoToken.json().catch(() => null);
      console.log('401 body           =', JSON.stringify(noTokenBody));

      const ok =
        health.status === 200 &&
        docs.status === 200 &&
        protectedNoToken.status === 401 &&
        protectedBadToken.status === 401 &&
        loginPage.status !== 401;
      console.log(ok ? 'SMOKE PASS' : 'SMOKE FAIL');
    } catch (error) {
      console.error('SMOKE ERROR', error);
    } finally {
      server.close(() => process.exit(0));
    }
  });
}

void main();
