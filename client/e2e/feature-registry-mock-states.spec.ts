/**
 * FLOW-36 — Feature Registry Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/feature-registry/.
 *
 * Mock keys (7): 'feature-registered', 'decision-pending', 'feature-verified',
 *                'feature-active', 'feature-blocked', 'feature-deprecated', 'feature-removed'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'feature-registry';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['feature-registered', 1],
  ['decision-pending', 2],
  ['feature-verified', 3],
  ['feature-active', 4],
  ['feature-blocked', 5],
  ['feature-deprecated', 6],
  ['feature-removed', 7],
];

test.describe('FLOW-36 — Feature Registry mock states', () => {
  test.setTimeout(60_000);

  test(`default: page-${SLUG} renders`, async ({ page }) => {
    await page.goto(`/admin/${SLUG}?role=platform-admin&hideChrome=1`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId(`platform-ops-${SLUG}`)).toBeVisible();
    await expect(page.getByTestId('feature-matrix-screen')).toBeVisible();
    await page.screenshot({ path: SNAP('default.png'), fullPage: true, timeout: 20_000 });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`, async ({ page }) => {
      await page.goto(`/admin/${SLUG}?mock=${key}&role=platform-admin&hideChrome=1`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({
        path: SNAP(`state-${idx}-${key}.png`),
        fullPage: true,
        timeout: 20_000,
      });
    });
  }
});
