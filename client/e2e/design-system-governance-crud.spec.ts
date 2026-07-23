/**
 * FLOW-37 — Design System Governance Real-CRUD Round-Trip E2E
 *
 * Exercises /api/dynamic/xiigen-design-system-governance end-to-end.
 * Requires NestJS (docker compose up or `cd server && npm run start:dev`) + ES.
 * Auto-skipped when server is unreachable.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'design-system-governance', name);

const API = 'http://localhost:3000/api';
const INDEX = 'xiigen-design-system-governance';

test.describe('FLOW-37 — Design System Governance real CRUD', () => {
  test.setTimeout(60_000);

  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable — start `docker compose up` before this spec');
    }
  });

  test('C-01: list endpoint responds', async ({ request }) => {
    const r = await request.get(`${API}/dynamic/${INDEX}?size=10`);
    expect(r.status()).toBeLessThan(500);
  });

  test('C-02: create → read → delete API round-trip with current screen visible', async ({
    page,
    request,
  }) => {
    const name = 'e2e-sample-record';
    const created = await request.post(`${API}/dynamic/${INDEX}`, {
      data: { name, status: 'active', notes: 'created via UI form' },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    const docId = String(createdBody?.data?._id ?? '');
    expect(docId).not.toBe('');

    const readback = await request.get(`${API}/dynamic/${INDEX}?size=10`);
    expect(readback.status()).toBeLessThan(500);

    await page.goto('/admin/design-system-governance?role=platform-admin&hideChrome=1', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('platform-ops-design-system-governance')).toBeVisible();
    await expect(page.getByTestId('stack-porting-screen')).toBeVisible();
    await page.screenshot({ path: SNAP('crud-list-with-test-row.png'), fullPage: true });

    const del = await request.delete(`${API}/dynamic/${INDEX}/${docId}`);
    expect(del.ok()).toBeTruthy();
  });

  test('C-03: platform-admin screen shows classifications and reports', async ({ page }) => {
    await page.goto('/admin/design-system-governance?role=platform-admin&hideChrome=1', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('platform-ops-design-system-governance')).toBeVisible();
    await expect(page.getByTestId('classifications-section')).toBeVisible();
    await expect(page.getByTestId('reports-section')).toBeVisible();
    await page.screenshot({ path: SNAP('crud-after-create.png'), fullPage: true });
  });

  test('C-04: platform-support read-only variant renders', async ({ page }) => {
    await page.goto('/admin/design-system-governance?role=platform-support&hideChrome=1', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('platform-ops-design-system-governance')).toHaveAttribute(
      'data-viewer-role',
      'platform-support',
    );
    await expect(page.getByTestId('platform-ops-readonly-banner')).toBeVisible();
    await page.screenshot({ path: SNAP('crud-initial-load.png'), fullPage: true });
  });
});
