/**
 * FLOW-22 — CMS Publishing Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/cms-publishing/.
 *
 * Mock keys (8): 'draft', 'review-requested', 'legal-review', 'approved',
 *                'scheduled', 'rejected', 'published', 'archived'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'cms-publishing';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['draft', 1],
  ['review-requested', 2],
  ['legal-review', 3],
  ['approved', 4],
  ['scheduled', 5],
  ['rejected', 6],
  ['published', 7],
  ['archived', 8],
];

test.describe('FLOW-22 — CMS Publishing mock states', () => {

  test('default: page-cms-publishing renders', async ({ page }) => {
    await page.goto(`/${SLUG}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('cms-role-reader-view')).toBeVisible();
    await page.screenshot({ path: SNAP('default.png'), fullPage: true });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`, async ({ page }) => {
      await page.goto(`/${SLUG}?mock=${key}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({ path: SNAP(`state-${idx}-${key}.png`), fullPage: true });
    });
  }
});
