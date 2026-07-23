/**
 * FLOW-35 — Meta Arbitration Engine Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/meta-arbitration-engine/.
 *
 * Mock keys (7): 'conflict-detected', 'arbiters-running', 'verdict-approved',
 *                'verdict-needs-revision', 'verdict-rejected', 'override-applied',
 *                'escalated'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'meta-arbitration-engine';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['conflict-detected', 1],
  ['arbiters-running', 2],
  ['verdict-approved', 3],
  ['verdict-needs-revision', 4],
  ['verdict-rejected', 5],
  ['override-applied', 6],
  ['escalated', 7],
];

test.describe('FLOW-35 — Meta Arbitration Engine mock states', () => {

  test('default: page-meta-arbitration-engine renders', async ({ page }) => {
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
