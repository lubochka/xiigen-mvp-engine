/**
 * FLOW-29 — Adaptive RAG / Deep Research API + topology E2E
 *
 * Exercises /api/dynamic/xiigen-adaptive-rag-deep-research end-to-end.
 * Requires NestJS (docker compose up or `cd server && npm run start:dev`) + ES.
 * Auto-skipped when server is unreachable.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'adaptive-rag-deep-research', name);

const API = 'http://localhost:3000/api';
const INDEX = 'xiigen-adaptive-rag-deep-research';

test.describe('FLOW-29 — Adaptive RAG / Deep Research API + topology', () => {

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

  test('C-02: create -> list -> delete API round-trip, topology page renders', async ({
    page,
    request,
  }) => {
    const name = 'e2e-sample-record';
    const created = await request.post(`${API}/dynamic/${INDEX}`, {
      data: { name, status: 'active', notes: 'created via UI form' },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    const docId = String(createdBody?.data?._id ?? '');
    expect(docId).not.toBe('');

    const list = await request.get(`${API}/dynamic/${INDEX}?name=${name}`);
    expect(list.ok()).toBeTruthy();
    const body = await list.json();
    const rows = (body?.data ?? []) as Array<Record<string, unknown>>;
    expect(rows.some((r) => String(r['_id']) === docId || r['name'] === name)).toBe(true);

    const del = await request.delete(`${API}/dynamic/${INDEX}/${docId}`);
    expect(del.ok()).toBeTruthy();

    await page.goto('/admin/adaptive-rag-deep-research?role=platform-admin', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('page-adaptive-rag-deep-research')).toBeVisible();
    await expect(page.getByTestId('topology-top-bar')).toBeVisible();
    await page.getByTestId('topology-phase-show-all').click();
    await expect(page.getByTestId('node-adaptive-rag-router')).toBeVisible();
    await page.screenshot({ path: SNAP('api-round-trip-topology.png'), fullPage: true });
  });

  test('C-03: platform-admin can inspect topology node details', async ({ page }) => {
    await page.goto('/admin/adaptive-rag-deep-research?role=platform-admin', {
      waitUntil: 'domcontentloaded',
    });
    await page.getByTestId('topology-phase-show-all').click();
    await page.getByTestId('node-adaptive-rag-router').click();
    await expect(page.getByTestId('topology-detail-panel')).toBeVisible();
    await expect(page.getByTestId('topology-detail-description')).toBeVisible();
    await page.screenshot({ path: SNAP('topology-node-detail.png'), fullPage: true });
  });

  test('C-04: support role gets read-only topology view', async ({ page }) => {
    await page.goto('/admin/adaptive-rag-deep-research?role=platform-support', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('page-adaptive-rag-deep-research')).toBeVisible();
    await expect(page.getByTestId('topology-readonly-banner')).toBeVisible();
    await expect(page.getByTestId('topology-canvas-placeholder')).toBeVisible();
    await page.screenshot({ path: SNAP('support-readonly-topology.png'), fullPage: true });
  });
});
