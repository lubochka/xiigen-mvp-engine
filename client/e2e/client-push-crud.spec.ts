/**
 * FLOW-40 - Client Push real API and role-surface E2E.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'client-push', name);

const SERVER_BASE = process.env.FLOW40_SERVER_BASE ?? 'http://localhost:33001';
const API = `${SERVER_BASE}/api`;
const INDEX = 'xiigen-client-push';
const TENANT_HEADERS = { 'X-Tenant-Id': 'acme-corp' };

test.describe('FLOW-40 - Client Push real API and role surfaces', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get(`${SERVER_BASE}/health/live`);
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable - start Docker server before this spec');
    }
  });

  test('C-01: list endpoint responds without server error', async ({ request }) => {
    const r = await request.get(`${API}/dynamic/${INDEX}?size=10`, { headers: TENANT_HEADERS });
    expect(r.status()).toBeLessThan(500);
  });

  test('C-02: create, list, delete round-trip through dynamic API', async ({ request }) => {
    const name = `e2e-sample-record-${Date.now()}`;
    const created = await request.post(`${API}/dynamic/${INDEX}`, {
      headers: TENANT_HEADERS,
      data: { name, status: 'active', notes: 'created by FLOW-40 portability test' },
    });
    expect(created.ok()).toBeTruthy();

    const createdBody = await created.json();
    const docId = String(createdBody?.data?._id ?? createdBody?._id ?? '');
    expect(docId).not.toBe('');

    const listed = await request.get(`${API}/dynamic/${INDEX}?size=20`, {
      headers: TENANT_HEADERS,
    });
    expect(listed.status()).toBeLessThan(500);

    const deleted = await request.delete(`${API}/dynamic/${INDEX}/${docId}`, {
      headers: TENANT_HEADERS,
    });
    expect(deleted.status()).toBeLessThan(500);
  });

  test('C-03: tenant-admin notification controls render and update', async ({ page }) => {
    await page.goto('/admin/client-push?role=tenant-admin&hideChrome=1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('cp-role-admin-view')).toBeVisible();
    await expect(page.getByTestId('cp-admin-config-panel')).toBeVisible();
    await page.screenshot({ path: SNAP('c-03-before.png'), fullPage: true });

    await page.locator('label[for="cp-admin-toggle-weekly-digest"]').click();
    await expect(page.getByTestId('cp-admin-toggle-weekly-digest')).toBeChecked();
    await page.getByTestId('cp-admin-test-send').click();
    await expect(page.getByTestId('cp-admin-test-sent')).toBeVisible();
    await page.screenshot({ path: SNAP('crud-after-create.png'), fullPage: true });
  });

  test('C-04: platform-admin infrastructure view renders on load', async ({ page }) => {
    await page.goto('/admin/client-push?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('cp-role-platform-admin-screen')).toBeVisible();
    await expect(page.getByTestId('client-push-screen')).toBeVisible();
    await page.screenshot({ path: SNAP('crud-initial-load.png'), fullPage: true });
  });
});
