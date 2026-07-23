/**
 * FLOW-00 — Bundle Activation operations surface E2E
 *
 * Exercises /api/dynamic/xiigen-bundle-activation end-to-end and verifies the
 * purpose-built operations panel that replaced the raw admin CRUD placeholder.
 * Requires NestJS (docker compose up or `cd server && npm run start:dev`) + ES.
 * Auto-skipped when server is unreachable.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'bundle-activation', name);

const SERVER_BASE =
  process.env['API_BASE_URL'] ?? `http://localhost:${process.env['SERVER_PORT'] ?? '3000'}`;
const API = `${SERVER_BASE}/api`;
const INDEX = 'xiigen-bundle-activation';

test.describe('FLOW-00 — Bundle Activation operations surface', () => {
  test('C-01: list endpoint responds', async ({ request }) => {
    try {
      const health = await request.get(`${SERVER_BASE}/health/live`);
      if (!health.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable');
    }
    const r = await request.get(`${API}/dynamic/${INDEX}?size=10`);
    expect(r.status()).toBeLessThan(500);
  });

  test('C-02: API create → list → delete round-trip with operations panel visible', async ({ page, request }) => {
    try {
      const health = await request.get(`${SERVER_BASE}/health/live`);
      if (!health.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable');
    }
    const name = 'e2e-sample-record';
    const created = await request.post(`${API}/dynamic/${INDEX}`, {
      data: { name, status: 'active', notes: 'created via UI form' },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    const docId = String(createdBody?.data?._id ?? '');
    expect(docId).not.toBe('');

    await page.goto('/admin/bundle-activation?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('page-bundle-activation')).toBeVisible();
    await expect(page.getByTestId('ba-admin-operations-panel')).toBeVisible();
    await expect(page.getByText('Activation operations')).toBeVisible();
    await page.screenshot({ path: SNAP('operations-panel-with-api-roundtrip.png'), fullPage: true });

    const del = await request.delete(`${API}/dynamic/${INDEX}/${docId}`);
    expect(del.ok()).toBeTruthy();
  });

  test('C-03: operations panel exposes validation, dry-run, and activation checkpoints', async ({ page }) => {
    await page.goto('/admin/bundle-activation?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('ba-admin-operations-panel')).toBeVisible();
    await expect(page.getByText('Validation queue')).toBeVisible();
    await expect(page.getByText('Dry runs')).toBeVisible();
    await expect(page.getByText('Activations')).toBeVisible();
    await expect(page.getByText('Run dry-run before full activation for every flow')).toBeVisible();
    await page.screenshot({ path: SNAP('operations-panel-checkpoints.png'), fullPage: true });

  });

  test('C-04: operations panel renders on load', async ({ page }) => {
    await page.goto('/admin/bundle-activation?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('page-bundle-activation')).toBeVisible();
    await expect(page.getByTestId('ba-admin-operations-panel')).toBeVisible();
    await page.screenshot({ path: SNAP('operations-initial-load.png'), fullPage: true });
  });
});
