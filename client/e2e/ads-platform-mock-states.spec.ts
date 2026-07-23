/**
 * FLOW-20 — Ads Platform Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/ads-platform/.
 *
 * Mock keys (8): 'auction-open', 'bid-received', 'consent-missing', 'fraud-checked',
 *                'fraud-detected', 'bid-accepted', 'political-review', 'auction-closed'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'ads-platform';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['auction-open', 1],
  ['bid-received', 2],
  ['consent-missing', 3],
  ['fraud-checked', 4],
  ['fraud-detected', 5],
  ['bid-accepted', 6],
  ['political-review', 7],
  ['auction-closed', 8],
];

test.describe('FLOW-20 — Ads Platform mock states', () => {

  test('default: page-ads-platform renders', async ({ page }) => {
    await page.goto(`/admin/${SLUG}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId(`page-${SLUG}`)).toBeVisible();
    await page.screenshot({ path: SNAP('default.png'), fullPage: true });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`, async ({ page }) => {
      await page.goto(`/admin/${SLUG}?mock=${key}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({ path: SNAP(`state-${idx}-${key}.png`), fullPage: true });
    });
  }
});
