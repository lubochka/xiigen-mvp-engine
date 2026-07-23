/**
 * FLOW-34 — Marketplace Plugin Adapter Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/marketplace-plugin-adapter/.
 *
 * Mock keys (8): 'adapter-registered', 'handshake-pending', 'plugin-connected',
 *                'payload-translating', 'payload-translated', 'synced',
 *                'schema-mismatch', 'rate-limited'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'marketplace-plugin-adapter';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['adapter-registered', 1],
  ['handshake-pending', 2],
  ['plugin-connected', 3],
  ['payload-translating', 4],
  ['payload-translated', 5],
  ['synced', 6],
  ['schema-mismatch', 7],
  ['rate-limited', 8],
];

test.describe('FLOW-34 — Marketplace Plugin Adapter mock states', () => {

  test('default: page-marketplace-plugin-adapter renders', async ({ page }) => {
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
