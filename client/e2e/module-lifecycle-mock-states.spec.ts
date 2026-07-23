/**
 * FLOW-47 — Module Lifecycle Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/module-lifecycle/.
 *
 * Mock keys (8): 'module-installing', 'module-installed', 'module-active', 'module-suspended',
 *                'module-upgrading', 'module-upgraded', 'module-uninstall-pending', 'module-uninstalled'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'module-lifecycle';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['module-installing', 1],
  ['module-installed', 2],
  ['module-active', 3],
  ['module-suspended', 4],
  ['module-upgrading', 5],
  ['module-upgraded', 6],
  ['module-uninstall-pending', 7],
  ['module-uninstalled', 8],
];

test.describe('FLOW-47 — Module Lifecycle mock states', () => {

  test('default: page-module-lifecycle renders', async ({ page }) => {
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
