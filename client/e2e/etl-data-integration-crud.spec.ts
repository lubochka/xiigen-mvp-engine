/**
 * FLOW-14 ETL Data Integration API and role-surface E2E.
 *
 * Exercises /api/dynamic/xiigen-etl-data-integration and the current
 * role-aware ETL page. The product page no longer exposes the raw CRUD panel
 * by default, so UI assertions anchor to role branches.
 */

import { test, expect, type TestInfo } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAP = (name: string, testInfo: TestInfo) =>
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    'etl-data-integration',
    `${testInfo.project.name}-${name}`,
  );

const API = 'http://localhost:3000/api';
const INDEX = 'xiigen-etl-data-integration';
const MASTER_TENANT_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001';
const HEADERS = { 'x-tenant-id': MASTER_TENANT_ID };
const TENANT_ADMIN_URL = '/admin/etl-data-integration?role=tenant-admin';
const PLATFORM_ADMIN_URL = '/admin/etl-data-integration?role=platform-admin';

test.describe('FLOW-14 ETL Data Integration API and role surface', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable; start docker compose up before this spec');
    }
  });

  test('C-01: list endpoint responds', async ({ request }) => {
    const r = await request.get(`${API}/dynamic/${INDEX}?size=10`, { headers: HEADERS });
    expect(r.status()).toBeLessThan(500);
  });

  test('C-02: create -> list -> delete API round-trip', async ({ page, request }, testInfo) => {
    const name = `e2e-sample-record-${testInfo.project.name}`;
    const created = await request.post(`${API}/dynamic/${INDEX}`, {
      headers: HEADERS,
      data: { name, status: 'active', notes: 'created via FLOW-14 e2e' },
    });
    const createdText = await created.text();
    expect(created.ok(), `POST ${created.status()}: ${createdText}`).toBeTruthy();
    const createdBody = JSON.parse(createdText);
    const docId = String(createdBody?.data?._id ?? '');
    expect(docId).not.toBe('');

    const list = await request.get(`${API}/dynamic/${INDEX}?name=${name}`, { headers: HEADERS });
    expect(list.ok()).toBeTruthy();
    const body = await list.json();
    const rows = (body?.data ?? []) as Array<Record<string, unknown>>;
    expect(rows.some((row) => row['_id'] === docId || row['name'] === name)).toBe(true);

    await page.goto(TENANT_ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('etl-role-tenant-admin-view')).toBeVisible();
    await expect(page.getByTestId('etl-admin-catalog')).toBeVisible();
    await page.screenshot({ path: SNAP('api-round-trip-tenant-admin.png', testInfo), fullPage: true });

    const del = await request.delete(`${API}/dynamic/${INDEX}/${docId}`, { headers: HEADERS });
    expect(del.ok()).toBeTruthy();
  });

  test('C-03: platform-admin ops surface renders pipeline evidence', async ({ page }, testInfo) => {
    await page.goto(PLATFORM_ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('etl-role-platform-admin-view')).toBeVisible();
    await expect(page.getByTestId('etl-platform-runs')).toBeVisible();
    await page.screenshot({ path: SNAP('platform-admin-ops-surface.png', testInfo), fullPage: true });
  });

  test('C-04: tenant-admin connector catalog renders on load', async ({ page }, testInfo) => {
    await page.goto(TENANT_ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('etl-role-tenant-admin-view')).toBeVisible();
    await expect(page.getByTestId('etl-admin-kpis')).toBeVisible();
    await page.screenshot({ path: SNAP('tenant-admin-catalog.png', testInfo), fullPage: true });
  });
});
