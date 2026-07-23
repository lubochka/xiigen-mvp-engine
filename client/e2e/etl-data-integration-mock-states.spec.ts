/**
 * FLOW-14 ETL Data Integration mock-state coverage.
 *
 * PNGs land at docs/e2e-snapshots/etl-data-integration/.
 */

import { test, expect, type TestInfo } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'etl-data-integration';
const SNAP = (name: string, testInfo: TestInfo) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, `${testInfo.project.name}-${name}`);
const ADMIN_URL = `/admin/${SLUG}?role=tenant-admin`;

const STATES: Array<[string, number]> = [
  ['source-connected', 1],
  ['extraction-running', 2],
  ['rate-limited', 3],
  ['blackout-window', 4],
  ['transform-applied', 5],
  ['loaded', 6],
  ['error', 7],
  ['peer-inactive', 8],
];

test.describe('FLOW-14 ETL Data Integration mock states', () => {
  test('default: tenant-admin connector catalog renders', async ({ page }, testInfo) => {
    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('etl-role-tenant-admin-view')).toBeVisible();
    await page.screenshot({ path: SNAP('default.png', testInfo), fullPage: true });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): visible with status badge`, async ({ page }, testInfo) => {
      await page.goto(`/admin/${SLUG}?mock=${key}&role=tenant-admin`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({ path: SNAP(`state-${idx}-${key}.png`, testInfo), fullPage: true });
    });
  }
});
