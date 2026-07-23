/**
 * FLOW-39 - OSS Curriculum API and role-aware screen E2E.
 *
 * Exercises /api/dynamic/xiigen-oss-curriculum end-to-end, then verifies
 * the current purpose-built platform-admin and anonymous UI branches.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'oss-curriculum', name);

const SERVER = process.env.FLOW39_SERVER_BASE ?? 'http://localhost:33001';
const API = `${SERVER}/api`;
const INDEX = 'xiigen-oss-curriculum';

test.describe('FLOW-39 - OSS Curriculum API and role-aware screen', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get(`${SERVER}/health/live`);
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable - start the Docker/Vault certification server');
    }
  });

  test('C-01: list endpoint responds', async ({ request }) => {
    const r = await request.get(`${API}/dynamic/${INDEX}?size=10`);
    expect(r.status()).toBeLessThan(500);
  });

  test('C-02: create -> list -> delete API round-trip and platform screen renders', async ({
    page,
    request,
  }) => {
    const name = `e2e-sample-record-${Date.now()}`;
    const created = await request.post(`${API}/dynamic/${INDEX}`, {
      data: { name, status: 'active', notes: 'created via API round trip' },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    const docId = String(createdBody?.data?._id ?? '');
    expect(docId).not.toBe('');

    const listed = await request.get(`${API}/dynamic/${INDEX}?size=10`);
    expect(listed.ok()).toBeTruthy();

    await page.goto('/admin/oss-curriculum?role=platform-admin&hideChrome=1', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('oss-role-platform-view')).toBeVisible();
    await expect(page.getByTestId('oss-curriculum-screen')).toBeVisible();
    await page.screenshot({ path: SNAP('crud-list-with-test-row.png'), fullPage: true });

    const del = await request.delete(`${API}/dynamic/${INDEX}/${docId}`);
    expect(del.ok()).toBeTruthy();
  });

  test('C-03: platform-admin purpose-built curriculum screen renders core sections', async ({
    page,
  }) => {
    await page.goto('/admin/oss-curriculum?role=platform-admin&hideChrome=1', {
      waitUntil: 'domcontentloaded',
    });
    await page.screenshot({ path: SNAP('c-03-before.png'), fullPage: true });
    await expect(page.getByTestId('oss-platform-curriculum-screen')).toBeVisible();
    await expect(page.getByTestId('tier-assignments-section')).toBeVisible();
    await expect(page.getByTestId('shadow-runs-section')).toBeVisible();
    await page.screenshot({ path: SNAP('crud-after-create.png'), fullPage: true });
  });

  test('C-04: anonymous public catalogue renders on load', async ({ page }) => {
    await page.goto('/admin/oss-curriculum?role=anonymous&hideChrome=1', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('oss-role-public-view')).toBeVisible();
    await expect(page.getByTestId('oss-public-catalogue')).toBeVisible();
    await page.screenshot({ path: SNAP('crud-initial-load.png'), fullPage: true });
  });
});
