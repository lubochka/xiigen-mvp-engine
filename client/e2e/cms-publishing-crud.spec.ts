/**
 * FLOW-22 — CMS Publishing Real-CRUD Round-Trip E2E
 *
 * Exercises /api/dynamic/xiigen-cms-publishing end-to-end.
 * Requires NestJS (docker compose up or `cd server && npm run start:dev`) + ES.
 * Auto-skipped when server is unreachable.
 */

import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'cms-publishing', name);

const API = 'http://localhost:3000/api';
const INDEX = 'xiigen-cms-publishing';

async function openAdminRawIndex(page: Page) {
  await page.goto('/cms-publishing?role=tenant-admin');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('cms-role-admin-view')).toBeVisible();
  await page.getByTestId('cms-admin-raw-details').evaluate((node) => {
    (node as HTMLDetailsElement).open = true;
  });
  await expect(page.getByTestId('page-cms-publishing')).toBeVisible();
  await expect(page.getByTestId('cms-publishing-create-button')).toBeVisible();
}

test.describe('FLOW-22 — CMS Publishing real CRUD', () => {

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

  test('C-02: create → list → delete round-trip', async ({ page, request }) => {
    const name = 'e2e-sample-record';
    const created = await request.post(`${API}/dynamic/${INDEX}`, {
      data: { name, status: 'active', notes: 'created via UI form' },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    const docId = String(createdBody?.data?._id ?? '');
    expect(docId).not.toBe('');

    await openAdminRawIndex(page);
    await expect(page.getByTestId('page-cms-publishing')).toBeVisible();
    await expect(page.getByTestId(`cms-publishing-row-${docId}`)).toBeVisible();
    await page.screenshot({ path: SNAP('crud-list-with-test-row.png'), fullPage: true });

    const del = await request.delete(`${API}/dynamic/${INDEX}/${docId}`);
    expect(del.ok()).toBeTruthy();
  });

  test('C-03: UI create form submits + refreshes list', async ({ page, request }) => {
    await openAdminRawIndex(page);
    await page.screenshot({ path: SNAP('c-03-before.png'), fullPage: true });
    await page.getByTestId('cms-publishing-create-button').click();
    await expect(page.getByTestId('cms-publishing-form')).toBeVisible();

    const name = 'ui-form-record';
    await page.getByTestId('cms-publishing-form-name').fill(name);
    await page.getByTestId('cms-publishing-form-status').fill('active');
    await page.getByTestId('cms-publishing-form-notes').fill('created via UI form');
    const postResponse = page.waitForResponse(
      (r) => r.url().includes(`/api/dynamic/${INDEX}`) && r.request().method() === 'POST',
    );
    await page.getByTestId('cms-publishing-form-submit').click();
    const resp = await postResponse;
    expect(resp.ok()).toBeTruthy();

    await expect(page.getByTestId('cms-publishing-form')).toBeHidden();
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: SNAP('crud-after-create.png'), fullPage: true });

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

  test('C-04: list or empty-state renders on load', async ({ page }) => {
    await openAdminRawIndex(page);
    await expect(page.getByTestId('page-cms-publishing')).toBeVisible();
    const dataState = page.locator(
      '[data-testid="cms-publishing-list"], [data-testid="cms-publishing-empty"]',
    );
    await expect(dataState.first()).toBeAttached();
    expect(await dataState.count()).toBeGreaterThan(0);
    await page.screenshot({ path: SNAP('crud-initial-load.png'), fullPage: true });
  });
});
