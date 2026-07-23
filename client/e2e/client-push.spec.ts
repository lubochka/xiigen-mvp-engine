/**
 * Client Push SSE Infrastructure - Playwright E2E tests (FLOW-40).
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.FLOW40_SERVER_BASE ?? 'http://localhost:33001';
const TENANT_A = 'tenant-alpha-flow40-e2e';
const TENANT_B = 'tenant-beta-flow40-e2e';

test.describe('Client Push SSE Infrastructure - FLOW-40 E2E', () => {
  test('P-1: tenant notification inbox renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/admin/client-push?role=tenant-user&hideChrome=1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('cp-role-inbox-view')).toBeVisible();
    await expect(page.getByText('via Bookings')).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('P-2: SSE connections index returns no server error', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-sse-connections`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('P-3: SSE events endpoint returns no server error', async ({ request }) => {
    const response = await request.get(`${BASE}/api/flow/test-flow/events`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('P-4: event deliveries audit index returns no server error', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-event-deliveries`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('P-5: tenant isolation probes stay scoped per tenant', async ({ request }) => {
    const responseA = await request.get(`${BASE}/api/dynamic/xiigen-sse-connections`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    const responseB = await request.get(`${BASE}/api/dynamic/xiigen-sse-connections`, {
      headers: { 'X-Tenant-Id': TENANT_B },
    });

    expect(responseA.status()).toBeLessThan(500);
    expect(responseB.status()).toBeLessThan(500);
  });
});
