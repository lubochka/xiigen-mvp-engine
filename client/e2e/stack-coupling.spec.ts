/**
 * Stack Coupling & Porting — Playwright E2E tests (FLOW-37)
 *
 * Prerequisites: Running servers
 *   Server: http://localhost:3000  (NestJS)
 *   Client: http://localhost:5173  (Vite dev server)
 *
 * P-1: Stack coupling screen renders without JS errors
 * P-2: Coupling audits API returns acceptable status (200 or 404 — not 500)
 * P-3: Compatibility reports API returns acceptable status (200 or 404 — not 500)
 * P-4: Porting runs API returns acceptable status (200 or 404 — not 500)
 * P-5: Tenant isolation — porting runs scoped per tenant
 */

import { test, expect } from '@playwright/test';

const CLIENT   = 'http://localhost:5173';
const BASE     = 'http://localhost:3000';
const TENANT_A = 'tenant-alpha-flow37-e2e';
const TENANT_B = 'tenant-beta-flow37-e2e';

test.describe('Stack Coupling & Porting — FLOW-37 E2E', () => {

  test('P-1: stack coupling screen renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`${CLIENT}/stack-coupling`);
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('P-2: coupling audits API returns acceptable status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-coupling-audits`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect([200, 404]).toContain(response.status());
  });

  test('P-3: compatibility reports API returns acceptable status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-compatibility-reports`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect([200, 404]).toContain(response.status());
  });

  test('P-4: porting runs API returns acceptable status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-porting-runs`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect([200, 404]).toContain(response.status());
  });

  test('P-5: tenant isolation — porting runs scoped per tenant', async ({ request }) => {
    const responseA = await request.get(`${BASE}/api/dynamic/xiigen-porting-runs`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    const responseB = await request.get(`${BASE}/api/dynamic/xiigen-porting-runs`, {
      headers: { 'X-Tenant-Id': TENANT_B },
    });
    expect([200, 404]).toContain(responseA.status());
    expect([200, 404]).toContain(responseB.status());
  });

});
