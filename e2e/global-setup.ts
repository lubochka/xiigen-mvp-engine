/**
 * global-setup.ts — Playwright global setup.
 *
 * Runs ONCE before any test file. Lessons from WordPress Playwright:
 * 1. Wait for server health BEFORE tests start — 60s timeout
 * 2. Wait for client serving — 30s timeout
 * 3. Seed test data via API after both are ready
 * 4. Graceful exit in local mode with clear message
 *
 * Server health endpoint: GET /health/live (always returns 200)
 */

import { FullConfig } from '@playwright/test';
import { seedTestData } from './fixtures/seed-data';

const SERVER_URL = process.env['E2E_SERVER_URL'] || 'http://localhost:3000';
const CLIENT_URL = process.env['E2E_BASE_URL'] || 'http://localhost:5173';
const IN_DOCKER = process.env['DOCKER_E2E'] === 'true';

async function globalSetup(_config: FullConfig): Promise<void> {
  console.log(`\n🔍 E2E Setup: server=${SERVER_URL}, client=${CLIENT_URL}`);

  // 1. Wait for server health (GET /health/live always returns 200)
  await waitForHealth(`${SERVER_URL}/health/live`, 60_000, 'Server');

  // 2. Wait for client to be serving
  await waitForHealth(CLIENT_URL, 30_000, 'Client');

  // 3. Seed test data
  await seedTestData(SERVER_URL);

  console.log('✅ E2E Setup complete — all services ready\n');
}

async function waitForHealth(url: string, timeoutMs: number, label: string): Promise<void> {
  const start = Date.now();
  let lastErr = '';

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        console.log(`  ✓ ${label} ready at ${url}`);
        return;
      }
      lastErr = `HTTP ${res.status}`;
    } catch (err) {
      lastErr = String(err);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  // Graceful exit in local mode (W-6 fix)
  if (!IN_DOCKER) {
    console.error(`\n⚠️  ${label} not reachable at ${url} after ${timeoutMs / 1000}s. Last error: ${lastErr}`);
    console.error(`   In local mode, start the server: cd server && npm start`);
    console.error(`   Or use Docker mode: docker compose --profile ui-e2e up -d\n`);
    process.exit(1);
  }

  throw new Error(`${label} health check failed: ${url} not ready after ${timeoutMs}ms. Last error: ${lastErr}`);
}

export default globalSetup;
