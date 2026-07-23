/**
 * FLOW-24 — AI Safety & Moderation Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/ai-safety-moderation/.
 *
 * Mock keys (8): 'content-received', 'moderation-running', 'content-approved',
 *                'content-flagged', 'human-review', 'content-rejected',
 *                'consent-pending', 'consent-granted'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'ai-safety-moderation';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['content-received', 1],
  ['moderation-running', 2],
  ['content-approved', 3],
  ['content-flagged', 4],
  ['human-review', 5],
  ['content-rejected', 6],
  ['consent-pending', 7],
  ['consent-granted', 8],
];

test.describe('FLOW-24 — AI Safety & Moderation mock states', () => {

  test('default: page-ai-safety-moderation renders', async ({ page }) => {
    await page.goto(`/${SLUG}?role=anonymous`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('asm-role-anon-view')).toBeVisible();
    await page.screenshot({ path: SNAP('default.png'), fullPage: true });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`, async ({ page }) => {
      await page.goto(`/${SLUG}?role=platform-admin&mock=${key}`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({ path: SNAP(`state-${idx}-${key}.png`), fullPage: true });
    });
  }
});
