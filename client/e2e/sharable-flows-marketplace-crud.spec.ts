/**
 * FLOW-32 — Sharable Flows Marketplace Real-CRUD Round-Trip E2E
 *
 * Exercises /api/dynamic/xiigen-sharable-flows-marketplace end-to-end.
 * Requires NestJS (docker compose up or `cd server && npm run start:dev`) + ES.
 * Auto-skipped when server is unreachable.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'sharable-flows-marketplace', name);

const API = 'http://localhost:3000/api';
const INDEX = 'xiigen-sharable-flows-marketplace';
const FLOW_ROUTE = '/admin/sharable-flows-marketplace?role=platform-admin';

async function openAdminCrudPanel(page: import('@playwright/test').Page) {
  await page.goto(FLOW_ROUTE);
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('page-sharable-flows-marketplace')).toBeVisible();

  const createButton = page.getByTestId('sharable-flows-marketplace-create-button');
  if (!(await createButton.isVisible().catch(() => false))) {
    await page.getByTestId('sharable-flows-marketplace-toggle').click();
  }
  await expect(createButton).toBeVisible();
}

test.describe('FLOW-32 — Sharable Flows Marketplace real CRUD', () => {

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
    const name = 'e2e-sample-record';
    const created = await request.post(`${API}/dynamic/${INDEX}`, {
      data: { name, status: 'active', notes: 'created via UI form' },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    const docId = String(createdBody?.data?._id ?? '');
    expect(docId).not.toBe('');

    await openAdminCrudPanel(page);
    await expect(page.getByTestId(`sharable-flows-marketplace-row-${docId}`)).toBeVisible();
    await page.screenshot({
      path: SNAP(`crud-list-with-test-row-${testInfo.project.name}.png`),
      fullPage: true,
    });

    const del = await request.delete(`${API}/dynamic/${INDEX}/${docId}`);
    expect(del.ok()).toBeTruthy();
  });

  test('C-03: UI create form submits + refreshes list', async ({ page, request }, testInfo) => {
    await openAdminCrudPanel(page);
    await page.screenshot({
      path: SNAP(`c-03-before-${testInfo.project.name}.png`),
      fullPage: true,
    });
    await page.getByTestId('sharable-flows-marketplace-create-button').click();
    await expect(page.getByTestId('sharable-flows-marketplace-form')).toBeVisible();

    const name = 'ui-form-record';
    await page.getByTestId('sharable-flows-marketplace-form-name').fill(name);
    await page.getByTestId('sharable-flows-marketplace-form-status').fill('active');
    await page.getByTestId('sharable-flows-marketplace-form-notes').fill('created via UI form');
    const postResponse = page.waitForResponse(
      (r) => r.url().includes(`/api/dynamic/${INDEX}`) && r.request().method() === 'POST',
    );
    await page.getByTestId('sharable-flows-marketplace-form-submit').click();
    const resp = await postResponse;
    expect(resp.ok()).toBeTruthy();

    await expect(page.getByTestId('sharable-flows-marketplace-form')).toBeHidden();
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
    await page.screenshot({
      path: SNAP(`crud-after-create-${testInfo.project.name}.png`),
      fullPage: true,
    });

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
    await openAdminCrudPanel(page);
    await expect
      .poll(async () => {
        const listVisible = await page
          .getByTestId('sharable-flows-marketplace-list')
          .isVisible()
          .catch(() => false);
        const emptyVisible = await page
          .getByTestId('sharable-flows-marketplace-empty')
          .isVisible()
          .catch(() => false);
        return listVisible || emptyVisible;
      })
      .toBe(true);
    await page.screenshot({
      path: SNAP(`crud-initial-load-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });
});
