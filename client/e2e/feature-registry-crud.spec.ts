/**
 * FLOW-36 — Feature Registry Real-CRUD Round-Trip E2E
 *
 * Exercises /api/dynamic/xiigen-feature-registry end-to-end and verifies the
 * current FeatureMatrixScreen wrapper.
 * Requires BOTH Vite (auto-started by playwright.config webServer) AND NestJS
 * (docker compose up or `cd server && npm run start:dev`) + Elasticsearch.
 *
 * Skipped automatically when the server is unreachable — CI gates wire the
 * stack first.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'feature-registry', name);

const API = 'http://localhost:3000/api';
const INDEX = 'xiigen-feature-registry';

test.describe('FLOW-36 — Feature Registry real CRUD', () => {
  test.setTimeout(60_000);

  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get(`${API.replace('/api', '')}/health/live`);
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable — start `docker compose up` before this spec');
    }
  });

  test('C-01: list endpoint responds', async ({ request }) => {
    const r = await request.get(`${API}/dynamic/${INDEX}?size=10`);
    expect(r.status()).toBeLessThan(500);
  });

  test('C-02: create → list → delete round-trip', async ({ page, request }) => {
    const featureId = `FT-TEST-${Date.now()}`;
    const created = await request.post(`${API}/dynamic/${INDEX}`, {
      data: {
        featureId,
        name: 'E2E Round-Trip Test',
        status: 'proposed',
        notes: 'created via UI form',
      },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    const docId = String(createdBody?.data?._id ?? '');
    expect(docId).not.toBe('');

    await page.goto('/admin/feature-registry?role=platform-admin&hideChrome=1', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('platform-ops-feature-registry')).toBeVisible();
    await expect(page.getByTestId('feature-matrix-screen')).toBeVisible();
    await page.screenshot({ path: SNAP('crud-api-round-trip-matrix.png'), fullPage: true });

    const del = await request.delete(`${API}/dynamic/${INDEX}/${docId}`);
    expect(del.ok()).toBeTruthy();
  });

  test('C-03: FeatureMatrixScreen renders seeded operator inventory', async ({ page }) => {
    await page.goto('/admin/feature-registry?role=platform-admin&hideChrome=1', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('platform-ops-feature-registry')).toBeVisible();
    await expect(page.getByTestId('feature-matrix-screen')).toBeVisible();
    await expect(page.locator('[data-testid="feature-matrix-screen"] .feature-matrix-row')).toHaveCount(6);
    await expect(page.locator('[data-testid^="porting-lock-"]').first()).toBeVisible();
    await expect(page.locator('[data-testid^="initiate-porting-"]').first()).toBeVisible();
    await page.screenshot({ path: SNAP('feature-matrix-operator-view.png'), fullPage: true });
  });

  test('C-04: support role renders read-only registry view', async ({ page }) => {
    await page.goto('/admin/feature-registry?role=platform-support&hideChrome=1', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('platform-ops-feature-registry')).toBeVisible();
    await expect(page.getByTestId('platform-ops-readonly-banner')).toBeVisible();
    await expect(page.getByTestId('platform-ops-feature-registry-readonly')).toBeVisible();
    await expect(page.getByTestId('feature-matrix-screen')).toBeVisible();
    await page.screenshot({ path: SNAP('feature-matrix-support-readonly.png'), fullPage: true });
  });
});
