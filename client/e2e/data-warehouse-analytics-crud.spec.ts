/**
 * FLOW-13 — Data Warehouse & Analytics Real-CRUD Round-Trip E2E
 *
 * Exercises /api/dynamic/xiigen-data-warehouse-analytics end-to-end.
 * Requires NestJS (docker compose up or `cd server && npm run start:dev`) + ES.
 * Auto-skipped when server is unreachable.
 */

import { test, expect, type Page, type TestInfo } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string, testInfo: TestInfo) =>
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    'data-warehouse-analytics',
    `${testInfo.project.name}-${name}`,
  );

const API = 'http://localhost:3000/api';
const INDEX = 'xiigen-data-warehouse-analytics';
const ADMIN_URL = '/admin/data-warehouse-analytics?role=tenant-admin';

async function openRawIndex(page: Page) {
  await page.getByTestId('analytics-admin-raw-details').locator('summary').click();
  await page.getByTestId('data-warehouse-analytics-toggle').click();
  await expect(page.getByTestId('page-data-warehouse-analytics')).toBeVisible();
}

test.describe('FLOW-13 — Data Warehouse & Analytics real CRUD', () => {

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

  test('C-02: create → list → delete round-trip', async ({ page, request }, testInfo) => {
    const name = `e2e-sample-record-${testInfo.project.name}`;
    const created = await request.post(`${API}/dynamic/${INDEX}`, {
      data: { name, status: 'active', notes: 'created via UI form' },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    const docId = String(createdBody?.data?._id ?? '');
    expect(docId).not.toBe('');

    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await openRawIndex(page);
    await expect(page.getByTestId(`data-warehouse-analytics-row-${docId}`)).toBeVisible();
    await page.screenshot({ path: SNAP('crud-list-with-test-row.png', testInfo), fullPage: true });

    const del = await request.delete(`${API}/dynamic/${INDEX}/${docId}`);
    expect(del.ok()).toBeTruthy();
  });

  test('C-03: UI create form submits + refreshes list', async ({ page, request }, testInfo) => {
    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await openRawIndex(page);
    await page.screenshot({ path: SNAP('c-03-before.png', testInfo), fullPage: true });
    await page.getByTestId('data-warehouse-analytics-create-button').click();
    await expect(page.getByTestId('data-warehouse-analytics-form')).toBeVisible();

    const name = `ui-form-record-${testInfo.project.name}-${Date.now()}`;
    await page.getByTestId('data-warehouse-analytics-form-name').fill(name);
    await page.getByTestId('data-warehouse-analytics-form-status').fill('active');
    await page.getByTestId('data-warehouse-analytics-form-notes').fill('created via UI form');
    const postResponse = page.waitForResponse(
      (r) => r.url().includes(`/api/dynamic/${INDEX}`) && r.request().method() === 'POST',
    );
    await page.getByTestId('data-warehouse-analytics-form-submit').click();
    const resp = await postResponse;
    expect(resp.ok()).toBeTruthy();

    await expect(page.getByTestId('data-warehouse-analytics-form')).toBeHidden();
    await expect(page.getByRole('cell', { name, exact: true }).first()).toBeVisible({
      timeout: 5000,
    });
    await page.screenshot({ path: SNAP('crud-after-create.png', testInfo), fullPage: true });

    const list = await request.get(`${API}/dynamic/${INDEX}?name=${name}`);
    expect(list.ok()).toBeTruthy();
    const body = await list.json();
    const rows = (body?.data ?? []) as Array<Record<string, unknown>>;
    const doc = rows.find((r) => r['name'] === name);
    expect(doc).toBeTruthy();
    if (doc) {
      await request.delete(`${API}/dynamic/${INDEX}/${String(doc['_id'])}`);
    }
  });

  test('C-04: list or empty-state renders on load', async ({ page }, testInfo) => {
    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await openRawIndex(page);
    await expect(
      page
        .locator(
          '[data-testid="data-warehouse-analytics-list"], [data-testid="data-warehouse-analytics-empty"]',
        )
        .first(),
    ).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: SNAP('crud-initial-load.png', testInfo), fullPage: true });
  });
});
