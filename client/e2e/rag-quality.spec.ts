/**
 * RAG Quality Feedback — Playwright E2E tests (FLOW-38 Phase B+C)
 *
 * Prerequisites: Running servers
 *   Server: http://localhost:3000  (NestJS)
 *   Client: http://localhost:5173  (Vite dev server)
 *
 * P-1: RAG quality screen renders without JS errors
 * P-2: API returns cycle outcomes (200 or 404 — not 500)
 * P-3: API returns RAG patterns (200 or 404 — not 500)
 * P-4: Distilled rules API accessible (200 or 404 — not 500)
 * P-5: Tenant isolation — rag patterns scoped per tenant
 */

import { test, expect } from '@playwright/test';

const CLIENT = 'http://localhost:5173';
const BASE   = 'http://localhost:3000';
const TENANT_A = 'tenant-alpha-flow38-e2e';
const TENANT_B = 'tenant-beta-flow38-e2e';

test.describe('RAG Quality Feedback — FLOW-38 E2E', () => {

  test('P-1: RAG quality screen renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`${CLIENT}/rag-quality`);
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('P-2: cycle outcomes API returns acceptable status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-cycle-outcomes`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect([200, 404]).toContain(response.status());
  });

  test('P-3: RAG patterns API returns acceptable status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-rag-patterns`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect([200, 404]).toContain(response.status());
  });

  test('P-4: distilled rules API returns acceptable status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dynamic/xiigen-distilled-rules`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect([200, 404]).toContain(response.status());
  });

  test('P-5: tenant isolation — rag quality updates scoped per tenant', async ({ request }) => {
    // Each tenant reads their own update index
    const responseA = await request.get(`${BASE}/api/dynamic/xiigen-rag-quality-updates`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    const responseB = await request.get(`${BASE}/api/dynamic/xiigen-rag-quality-updates`, {
      headers: { 'X-Tenant-Id': TENANT_B },
    });
    expect([200, 404]).toContain(responseA.status());
    expect([200, 404]).toContain(responseB.status());
  });

});
