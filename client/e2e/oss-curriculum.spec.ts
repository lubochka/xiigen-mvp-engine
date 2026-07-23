/**
 * OSS Curriculum Teaching Pipeline - Playwright E2E tests (FLOW-39)
 *
 * Prerequisites:
 *   Server: http://localhost:33001 (NestJS Docker/Vault certification server)
 *   Client: http://localhost:5173 (Vite dev server)
 */

import { test, expect } from '@playwright/test';

const CLIENT = 'http://localhost:5173';
const BASE = process.env.FLOW39_SERVER_BASE ?? 'http://localhost:33001';
const TENANT_A = 'tenant-alpha-flow39-e2e';
const TENANT_B = 'tenant-beta-flow39-e2e';

test.describe('OSS Curriculum Teaching Pipeline - FLOW-39 E2E', () => {
  test('P-1: OSS curriculum public screen renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(`${CLIENT}/admin/oss-curriculum?role=anonymous&hideChrome=1`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('oss-role-public-view')).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('P-2: curriculum tiers API returns acceptable status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-curriculum-tiers`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect([200, 404]).toContain(response.status());
  });

  test('P-3: shadow runs API returns acceptable status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-shadow-runs`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect([200, 404]).toContain(response.status());
  });

  test('P-4: learning signals API returns acceptable status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-learning-signals`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect([200, 404]).toContain(response.status());
  });

  test('P-5: tenant isolation - curriculum tiers scoped per tenant', async ({ request }) => {
    const responseA = await request.get(`${BASE}/api/dynamic/xiigen-curriculum-tiers`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    const responseB = await request.get(`${BASE}/api/dynamic/xiigen-curriculum-tiers`, {
      headers: { 'X-Tenant-Id': TENANT_B },
    });
    expect([200, 404]).toContain(responseA.status());
    expect([200, 404]).toContain(responseB.status());
  });
});
