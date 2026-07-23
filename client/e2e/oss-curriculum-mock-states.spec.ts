/**
 * FLOW-39 - OSS Curriculum Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param.
 * PNGs land at docs/e2e-snapshots/oss-curriculum/.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'oss-curriculum';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['curriculum-queued', 1],
  ['lesson-generating', 2],
  ['lesson-ready', 3],
  ['published', 4],
  ['plateau-detected', 5],
  ['lesson-deferred', 6],
  ['shadow-pending', 7],
];

test.describe('FLOW-39 - OSS Curriculum mock states', () => {
  test('default: platform-admin curriculum screen renders', async ({ page }) => {
    await page.goto(`/admin/${SLUG}?role=platform-admin&hideChrome=1`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('oss-role-platform-view')).toBeVisible();
    await expect(page.getByTestId('oss-curriculum-screen')).toBeVisible();
    await page.screenshot({ path: SNAP('default.png'), fullPage: true });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`, async ({
      page,
    }) => {
      await page.goto(`/admin/${SLUG}?mock=${key}&role=platform-admin&hideChrome=1`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({ path: SNAP(`state-${idx}-${key}.png`), fullPage: true });
    });
  }
});
