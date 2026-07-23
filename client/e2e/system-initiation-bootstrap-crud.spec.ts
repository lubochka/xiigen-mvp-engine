/**
 * FLOW-33 — System Initiation Bootstrap Real-CRUD Round-Trip E2E
 *
 * Exercises /api/dynamic/xiigen-system-initiation-bootstrap end-to-end.
 * Requires NestJS (docker compose up or `cd server && npm run start:dev`) + ES.
 * Auto-skipped when server is unreachable.
 */

import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'system-initiation-bootstrap', name);

const API = 'http://localhost:3000/api';
const INDEX = 'xiigen-system-initiation-bootstrap';
const PAGE_URL = '/admin/system-initiation-bootstrap?role=platform-admin';

const screenshotName = (name: string, projectName: string) =>
  `${name}-${projectName}.png`;

async function openCrudPanel(page: Page) {
  await page.goto(PAGE_URL);
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('sib-role-platform-admin-view')).toBeVisible();
  await expect(page.getByTestId('page-system-initiation-bootstrap')).toBeVisible();
  const toggle = page.getByTestId('system-initiation-bootstrap-toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

test.describe('FLOW-33 — System Initiation Bootstrap real CRUD', () => {

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

    await openCrudPanel(page);
    await expect(page.getByTestId(`system-initiation-bootstrap-row-${docId}`)).toBeVisible();
    await page.screenshot({
      path: SNAP(screenshotName('crud-list-with-test-row', test.info().project.name)),
      fullPage: true,
    });

    const del = await request.delete(`${API}/dynamic/${INDEX}/${docId}`);
    expect(del.ok()).toBeTruthy();
  });

  test('C-03: UI create form submits + refreshes list', async ({ page, request }) => {
    await openCrudPanel(page);
    await page.screenshot({
      path: SNAP(screenshotName('c-03-before', test.info().project.name)),
      fullPage: true,
    });
    await page.getByTestId('system-initiation-bootstrap-create-button').click();
    await expect(page.getByTestId('system-initiation-bootstrap-form')).toBeVisible();

    const name = 'ui-form-record';
    await page.getByTestId('system-initiation-bootstrap-form-name').fill(name);
    await page.getByTestId('system-initiation-bootstrap-form-status').fill('active');
    await page.getByTestId('system-initiation-bootstrap-form-notes').fill('created via UI form');
    const postResponse = page.waitForResponse(
      (r) => r.url().includes(`/api/dynamic/${INDEX}`) && r.request().method() === 'POST',
    );
    await page.getByTestId('system-initiation-bootstrap-form-submit').click();
    const resp = await postResponse;
    expect(resp.ok()).toBeTruthy();

    await expect(page.getByTestId('system-initiation-bootstrap-form')).toBeHidden();
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
    await page.screenshot({
      path: SNAP(screenshotName('crud-after-create', test.info().project.name)),
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

  test('C-04: list or empty-state renders on load', async ({ page }) => {
    await openCrudPanel(page);
    const listVisible = await page.getByTestId('system-initiation-bootstrap-list').isVisible().catch(() => false);
    const emptyVisible = await page.getByTestId('system-initiation-bootstrap-empty').isVisible().catch(() => false);
    expect(listVisible || emptyVisible).toBe(true);
    await page.screenshot({
      path: SNAP(screenshotName('crud-initial-load', test.info().project.name)),
      fullPage: true,
    });
  });
});
