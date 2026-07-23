/**
 * FLOW-27 — Human Interaction Gate Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/human-interaction-gate/.
 *
 * Mock keys (8): 'request-pending', 'chain-sequential', 'chain-parallel',
 *                'decision-approved', 'decision-rejected', 'timeout-escalated',
 *                'task-delegated', 'request-queued'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'human-interaction-gate';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['request-pending', 1],
  ['chain-sequential', 2],
  ['chain-parallel', 3],
  ['decision-approved', 4],
  ['decision-rejected', 5],
  ['timeout-escalated', 6],
  ['task-delegated', 7],
  ['request-queued', 8],
];

test.describe('FLOW-27 — Human Interaction Gate mock states', () => {

  test('default: page-human-interaction-gate renders', async ({ page }) => {
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
