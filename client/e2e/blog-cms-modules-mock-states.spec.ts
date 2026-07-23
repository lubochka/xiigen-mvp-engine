/**
 * FLOW-28 — Blog/CMS Modules Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/blog-cms-modules/.
 *
 * Mock keys (7): 'page-draft', 'ai-suggestions', 'moderation-required', 'scheduled',
 *                'published', 'unpublished', 'seo-indexed'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'blog-cms-modules';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['page-draft', 1],
  ['ai-suggestions', 2],
  ['moderation-required', 3],
  ['scheduled', 4],
  ['published', 5],
  ['unpublished', 6],
  ['seo-indexed', 7],
];

test.describe('FLOW-28 — Blog/CMS Modules mock states', () => {

  test('default: page-blog-cms-modules renders', async ({ page }) => {
    await page.goto(`/${SLUG}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId(`page-${SLUG}`)).toBeVisible();
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
