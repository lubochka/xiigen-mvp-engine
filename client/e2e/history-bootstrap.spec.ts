/**
 * History Bootstrap — Playwright E2E tests (FLOW-45)
 *
 * Prerequisites: Running servers
 *   Server: SERVER_BASE_URL or http://localhost:3000  (NestJS)
 *   Client: CLIENT_BASE_URL or http://localhost:5173  (Vite dev server)
 *
 * P-1: History bootstrap screen renders without JS errors
 * P-2: Architecture philosophy API returns acceptable status (200 or 404 — not 500)
 * P-3: Philosophy summaries API returns acceptable status (200 or 404 — not 500)
 * P-4: Bootstrap completions API returns acceptable status (200 or 404 — not 500)
 * P-5: CF-804 — GLOBAL scope filter accepted by API (200 or 404 — not 500)
 */

import { test, expect } from '@playwright/test';

const CLIENT = process.env['CLIENT_BASE_URL'] ?? 'http://localhost:5173';
const BASE = process.env['SERVER_BASE_URL'] ?? 'http://localhost:3000';
const TENANT = 'tenant-alpha-flow45-e2e';

test.describe('History Bootstrap — FLOW-45 E2E', () => {

  test('P-1: history bootstrap screen renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`${CLIENT}/history-bootstrap`);
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('P-2: architecture philosophy index returns acceptable status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-architecture-philosophy`, {
      headers: { 'X-Tenant-Id': TENANT },
    });
    expect([200, 404]).toContain(response.status());
  });

  test('P-3: philosophy summaries index returns acceptable status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-philosophy-summaries`, {
      headers: { 'X-Tenant-Id': TENANT },
    });
    expect([200, 404]).toContain(response.status());
  });

  test('P-4: bootstrap completions index returns acceptable status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-bootstrap-completions`, {
      headers: { 'X-Tenant-Id': TENANT },
    });
    expect([200, 404]).toContain(response.status());
  });

  test('P-5: CF-804 — GLOBAL scope filter accepted (200 or 404, not 500)', async ({ request }) => {
    const response = await request.get(
      `${BASE}/api/dynamic/xiigen-architecture-philosophy?knowledgeScope=GLOBAL`,
      { headers: { 'X-Tenant-Id': TENANT } },
    );
    expect([200, 404]).toContain(response.status());
  });

});
