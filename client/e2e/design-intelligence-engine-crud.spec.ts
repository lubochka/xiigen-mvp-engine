/**
 * FLOW-31 — Design Intelligence Engine Real-CRUD Round-Trip E2E
 *
 * Exercises /api/dynamic/xiigen-design-intelligence-engine end-to-end.
 * Requires NestJS (docker compose up or `cd server && npm run start:dev`) + ES.
 * Auto-skipped when server is unreachable.
 */

import { test, expect, type TestInfo } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (testInfo: TestInfo, name: string) =>
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    'design-intelligence-engine',
    `${testInfo.project.name}-${name}`,
  );

const API = 'http://localhost:3000/api';
const INDEX = 'xiigen-design-intelligence-engine';
const MASTER_TENANT_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001';
const ADMIN_ROUTE = '/admin/design-intelligence-engine?role=platform-admin';
const TENANT_HEADERS = { 'X-Tenant-Id': MASTER_TENANT_ID };

test.describe('FLOW-31 — Design Intelligence Engine real CRUD', () => {

  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable — start `docker compose up` before this spec');
    }
  });

  test('C-01: list endpoint responds', async ({ request }) => {
    const r = await request.get(`${API}/dynamic/${INDEX}?size=10`, { headers: TENANT_HEADERS });
    expect(r.status()).toBeLessThan(500);
  });

  test('C-02: create → list → delete round-trip', async ({ page, request }, testInfo) => {
    const name = 'e2e-sample-record';
    const created = await request.post(`${API}/dynamic/${INDEX}`, {
      headers: TENANT_HEADERS,
      data: { name, status: 'active', notes: 'created via UI form' },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    const docId = String(createdBody?.data?._id ?? '');
    expect(docId).not.toBe('');

    await page.goto(ADMIN_ROUTE);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('page-design-intelligence-engine')).toBeVisible();
    await expect(page.getByTestId(`design-intelligence-engine-row-${docId}`)).toBeVisible();
    await page.screenshot({ path: SNAP(testInfo, 'crud-list-with-test-row.png'), fullPage: true });

    const del = await request.delete(`${API}/dynamic/${INDEX}/${docId}`, {
      headers: TENANT_HEADERS,
    });
    expect(del.ok()).toBeTruthy();
  });

  test('C-03: UI create form submits + refreshes list', async ({ page, request }, testInfo) => {
    await page.goto(ADMIN_ROUTE);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(testInfo, 'c-03-before.png'), fullPage: true });
    await page.getByTestId('design-intelligence-engine-create-button').click();
    await expect(page.getByTestId('design-intelligence-engine-form')).toBeVisible();

    const name = 'ui-form-record';
    await page.getByTestId('design-intelligence-engine-form-name').fill(name);
    await page.getByTestId('design-intelligence-engine-form-status').fill('active');
    await page.getByTestId('design-intelligence-engine-form-notes').fill('created via UI form');
    const postResponse = page.waitForResponse(
      (r) => r.url().includes(`/api/dynamic/${INDEX}`) && r.request().method() === 'POST',
    );
    await page.getByTestId('design-intelligence-engine-form-submit').click();
    const resp = await postResponse;
    expect(resp.ok()).toBeTruthy();

    await expect(page.getByTestId('design-intelligence-engine-form')).toBeHidden();
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: SNAP(testInfo, 'crud-after-create.png'), fullPage: true });

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

  test('C-04: list or empty-state renders on load', async ({ page }, testInfo) => {
    await page.goto(ADMIN_ROUTE);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('page-design-intelligence-engine')).toBeVisible();
    const listVisible = await page.getByTestId('design-intelligence-engine-list').isVisible().catch(() => false);
    const emptyVisible = await page.getByTestId('design-intelligence-engine-empty').isVisible().catch(() => false);
    expect(listVisible || emptyVisible).toBe(true);
    await page.screenshot({ path: SNAP(testInfo, 'crud-initial-load.png'), fullPage: true });
  });
});
