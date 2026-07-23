/**
 * FLOW-21 — Dynamic Forms & Workflows Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/dynamic-forms-workflows/.
 *
 * Mock keys (8): 'form-draft', 'no-fields', 'published', 'occ-conflict',
 *                'submission-received', 'submission-rejected', 'automation-triggered',
 *                'analytics-updated'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'dynamic-forms-workflows';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['form-draft', 1],
  ['no-fields', 2],
  ['published', 3],
  ['occ-conflict', 4],
  ['submission-received', 5],
  ['submission-rejected', 6],
  ['automation-triggered', 7],
  ['analytics-updated', 8],
];

test.describe('FLOW-21 — Dynamic Forms & Workflows mock states', () => {

  test('default: page-dynamic-forms-workflows renders', async ({ page }) => {
    await page.goto(`/${SLUG}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId(`page-${SLUG}`)).toBeVisible();
    await page.screenshot({ path: SNAP('default.png'), fullPage: true });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`, async ({ page }) => {
      await page.goto(`/${SLUG}?mock=${key}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({ path: SNAP(`state-${idx}-${key}.png`), fullPage: true });
    });
  }
});
