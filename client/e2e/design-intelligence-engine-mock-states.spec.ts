/**
 * FLOW-31 — Design Intelligence Engine Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/design-intelligence-engine/.
 *
 * Mock keys (6): 'proposal-drafted', 'confidence-scored', 'proposal-approved',
 *                'proposal-rejected', 'proposal-applied', 'proposal-rolled-back'
 */

import { test, expect, type TestInfo } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'design-intelligence-engine';
const SNAP = (testInfo: TestInfo, name: string) =>
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    SLUG,
    `${testInfo.project.name}-${name}`,
  );

const STATES: Array<[string, number]> = [
  ['proposal-drafted', 1],
  ['confidence-scored', 2],
  ['proposal-approved', 3],
  ['proposal-rejected', 4],
  ['proposal-applied', 5],
  ['proposal-rolled-back', 6],
];

test.describe('FLOW-31 — Design Intelligence Engine mock states', () => {

  test(`default: page-${SLUG} renders`, async ({ page }, testInfo) => {
    await page.goto(`/admin/${SLUG}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId(`page-${SLUG}`)).toBeVisible();
    await page.screenshot({ path: SNAP(testInfo, 'default.png'), fullPage: true });
  });

  for (const [key, idx] of STATES) {
    test(
      `state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`,
      async ({ page }, testInfo) => {
        await page.goto(`/admin/${SLUG}?mock=${key}`);
        await page.waitForLoadState('networkidle');
        await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
        await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
        await page.screenshot({
          path: SNAP(testInfo, `state-${idx}-${key}.png`),
          fullPage: true,
        });
      },
    );
  }
});
