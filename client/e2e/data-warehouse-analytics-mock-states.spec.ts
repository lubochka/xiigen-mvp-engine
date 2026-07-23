/**
 * FLOW-13 — Data Warehouse & Analytics Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/data-warehouse-analytics/.
 *
 * Mock keys (8): 'pipeline-queued', 'ingesting', 'transform-running', 'warehouse-degraded',
 *                'complete', 'failed', 'retention-blocked', 'export-ready'
 */

import { test, expect, type TestInfo } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'data-warehouse-analytics';
const SNAP = (name: string, testInfo: TestInfo) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, `${testInfo.project.name}-${name}`);
const ADMIN_URL = `/admin/${SLUG}?role=tenant-admin`;

const STATES: Array<[string, number]> = [
  ['pipeline-queued', 1],
  ['ingesting', 2],
  ['transform-running', 3],
  ['warehouse-degraded', 4],
  ['complete', 5],
  ['failed', 6],
  ['retention-blocked', 7],
  ['export-ready', 8],
];

test.describe('FLOW-13 — Data Warehouse & Analytics mock states', () => {

  test('default: page-data-warehouse-analytics renders', async ({ page }, testInfo) => {
    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('analytics-admin-view')).toBeVisible();
    await page.screenshot({ path: SNAP('default.png', testInfo), fullPage: true });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`, async ({ page }, testInfo) => {
      await page.goto(`/admin/${SLUG}?mock=${key}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({ path: SNAP(`state-${idx}-${key}.png`, testInfo), fullPage: true });
    });
  }
});
