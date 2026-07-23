/**
 * FLOW-46 — Platform Agent Real-CRUD Round-Trip E2E
 *
 * Exercises /api/dynamic/xiigen-platform-agent end-to-end.
 * Requires NestJS (docker compose up or `cd server && npm run start:dev`) + ES.
 * Auto-skipped when server is unreachable.
 */

import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'platform-agent', name);

const SERVER_BASE = process.env.SERVER_BASE_URL ?? 'http://localhost:3000';
const API = `${SERVER_BASE}/api`;
const INDEX = 'xiigen-platform-agent';
const MASTER_TENANT_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001';
const PAGE_URL = '/admin/platform-agent?role=platform-admin';
const TENANT_HEADERS = { 'X-Tenant-Id': MASTER_TENANT_ID };

async function openRawIndex(page: Page) {
  await page.goto(PAGE_URL);
  await page.waitForLoadState('networkidle');
  await expect(
    page.locator('[data-testid="page-platform-agent"][data-viewer-role="platform-admin"]'),
  ).toBeVisible();
  await expect(page.getByTestId('agent-admin-console')).toBeVisible();

  await page.getByTestId('agent-admin-raw-details').locator('summary').click();
  const toggle = page.getByTestId('platform-agent-toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  await expect(page.getByTestId('platform-agent-create-button')).toBeVisible();
}

test.describe('FLOW-46 — Platform Agent real CRUD', () => {

  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get(`${SERVER_BASE}/health/live`);
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable — start `docker compose up` before this spec');
    }
  });

  test('C-01: list endpoint responds', async ({ request }) => {
    const r = await request.get(`${API}/dynamic/${INDEX}?size=10`, { headers: TENANT_HEADERS });
    expect(r.status()).toBeLessThan(500);
  });

  test('C-02: create → list → delete round-trip', async ({ page, request }) => {
    const name = 'e2e-sample-record';
    const created = await request.post(`${API}/dynamic/${INDEX}`, {
      headers: TENANT_HEADERS,
      data: { name, status: 'active', notes: 'created via UI form' },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    const docId = String(createdBody?.data?._id ?? '');
    expect(docId).not.toBe('');

    try {
      await openRawIndex(page);
      await expect(page.getByTestId(`platform-agent-row-${docId}`)).toBeVisible();
      await page.screenshot({ path: SNAP('crud-list-with-test-row.png'), fullPage: true });
    } finally {
      const del = await request.delete(`${API}/dynamic/${INDEX}/${docId}`, {
        headers: TENANT_HEADERS,
      });
      expect(del.ok()).toBeTruthy();
    }
  });

  test('C-03: UI create form submits + refreshes list', async ({ page, request }) => {
    await openRawIndex(page);
    await page.screenshot({ path: SNAP('c-03-before.png'), fullPage: true });
    await page.getByTestId('platform-agent-create-button').click();
    await expect(page.getByTestId('platform-agent-form')).toBeVisible();

    const name = 'ui-form-record';
    await page.getByTestId('platform-agent-form-name').fill(name);
    await page.getByTestId('platform-agent-form-status').fill('active');
    await page.getByTestId('platform-agent-form-notes').fill('created via UI form');
    const postResponse = page.waitForResponse(
      (r) => r.url().includes(`/api/dynamic/${INDEX}`) && r.request().method() === 'POST',
    );
    await page.getByTestId('platform-agent-form-submit').click();
    const resp = await postResponse;
    expect(resp.ok()).toBeTruthy();

    await expect(page.getByTestId('platform-agent-form')).toBeHidden();
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: SNAP('crud-after-create.png'), fullPage: true });

    const list = await request.get(`${API}/dynamic/${INDEX}?name=${name}`, {
      headers: TENANT_HEADERS,
    });
    expect(list.ok()).toBeTruthy();
    const body = await list.json();
    const rows = (body?.data ?? []) as Array<Record<string, unknown>>;
    const doc = rows.find((r) => r['name'] === name);
    expect(doc).toBeTruthy();
    if (doc) {
      await request.delete(`${API}/dynamic/${INDEX}/${String(doc['_id'])}`, {
        headers: TENANT_HEADERS,
      });
    }
  });

  test('C-04: list or empty-state renders on load', async ({ page }) => {
    await openRawIndex(page);
    await expect
      .poll(async () => {
        const listVisible = await page.getByTestId('platform-agent-list').isVisible().catch(() => false);
        const emptyVisible = await page.getByTestId('platform-agent-empty').isVisible().catch(() => false);
        return listVisible || emptyVisible;
      })
      .toBe(true);
    await page.screenshot({ path: SNAP('crud-initial-load.png'), fullPage: true });
  });
});
