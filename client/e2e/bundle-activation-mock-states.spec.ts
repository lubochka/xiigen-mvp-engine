/**
 * FLOW-00 — Bundle Activation Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/bundle-activation/.
 *
 * Mock keys (8): 'validation-pending', 'dry-run-running', 'active', 'degraded', 'restored',
 *                'validation-failed', 'activation-failed', 'bundle-not-found'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'bundle-activation';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['validation-pending', 1],
  ['dry-run-running', 2],
  ['active', 3],
  ['degraded', 4],
  ['restored', 5],
  ['validation-failed', 6],
  ['activation-failed', 7],
  ['bundle-not-found', 8],
];

test.describe('FLOW-00 — Bundle Activation mock states', () => {

  test('default: page-bundle-activation renders', async ({ page }) => {
    await page.goto(`/admin/${SLUG}?role=platform-admin`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId(`page-${SLUG}`)).toBeVisible();
    await page.screenshot({ path: SNAP('default.png'), fullPage: true });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`, async ({ page }) => {
      await page.goto(`/admin/${SLUG}?role=platform-admin&mock=${key}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({ path: SNAP(`state-${idx}-${key}.png`), fullPage: true });
    });
  }
});
