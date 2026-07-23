/**
 * FLOW-37 — Design System Governance Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/design-system-governance/.
 *
 * Mock keys (8): 'rule-draft', 'validated', 'published', 'violation-detected',
 *                'enforced', 'conflict-detected', 'impact-critical', 'rule-deprecated'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'design-system-governance';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['rule-draft', 1],
  ['validated', 2],
  ['published', 3],
  ['violation-detected', 4],
  ['enforced', 5],
  ['conflict-detected', 6],
  ['impact-critical', 7],
  ['rule-deprecated', 8],
];

test.describe('FLOW-37 — Design System Governance mock states', () => {
  test.setTimeout(60_000);

  test('default: platform ops stack-porting screen renders', async ({ page }) => {
    await page.goto(`/admin/${SLUG}?role=platform-admin&hideChrome=1`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId(`platform-ops-${SLUG}`)).toBeVisible();
    await expect(page.getByTestId('stack-porting-screen')).toBeVisible();
    await page.screenshot({ path: SNAP('default.png'), fullPage: true });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`, async ({ page }) => {
      await page.goto(`/admin/${SLUG}?mock=${key}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({ path: SNAP(`state-${idx}-${key}.png`), fullPage: true });
    });
  }
});
