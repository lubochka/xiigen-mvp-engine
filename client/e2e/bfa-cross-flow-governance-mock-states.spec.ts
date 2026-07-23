/**
 * FLOW-25 — BFA Cross-Flow Governance Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/bfa-cross-flow-governance/.
 *
 * Mock keys (8): 'rule-draft', 'change-ingested', 'blast-radius-computed', 'rule-published',
 *                'violation-detected', 'rule-enforced', 'cross-tenant-guard', 'rule-suspended'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'bfa-cross-flow-governance';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['rule-draft', 1],
  ['change-ingested', 2],
  ['blast-radius-computed', 3],
  ['rule-published', 4],
  ['violation-detected', 5],
  ['rule-enforced', 6],
  ['cross-tenant-guard', 7],
  ['rule-suspended', 8],
];

test.describe('FLOW-25 — BFA Cross-Flow Governance mock states', () => {

  test('default: page-bfa-cross-flow-governance renders', async ({ page }) => {
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
