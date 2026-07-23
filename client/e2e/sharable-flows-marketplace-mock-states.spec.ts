/**
 * FLOW-32 — Sharable Flows Marketplace Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/sharable-flows-marketplace/.
 *
 * Mock keys (8): 'flow-submitted', 'review-pending', 'fraud-flagged', 'approved',
 *                'rejected', 'listed', 'installed', 'rolled-back'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'sharable-flows-marketplace';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['flow-submitted', 1],
  ['review-pending', 2],
  ['fraud-flagged', 3],
  ['approved', 4],
  ['rejected', 5],
  ['listed', 6],
  ['installed', 7],
  ['rolled-back', 8],
];

test.describe('FLOW-32 — Sharable Flows Marketplace mock states', () => {

  test('default: page-sharable-flows-marketplace renders', async ({ page }, testInfo) => {
    await page.goto(`/admin/${SLUG}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('sfm-role-browse-view')).toBeVisible();
    await expect(page.getByTestId('sfm-browse-heading')).toBeVisible();
    await page.screenshot({ path: SNAP(`default-${testInfo.project.name}.png`), fullPage: true });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`, async ({
      page,
    }, testInfo) => {
      await page.goto(`/admin/${SLUG}?mock=${key}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({
        path: SNAP(`state-${idx}-${key}-${testInfo.project.name}.png`),
        fullPage: true,
      });
    });
  }
});
