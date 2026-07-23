/**
 * FLOW-38 — RAG Quality Feedback Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/rag-quality-feedback/.
 *
 * Mock keys (7): 'feedback-received', 'quality-scored-success', 'quality-scored-wasted',
 *                'pattern-extracted', 'index-updated', 'escalation-required', 'dpo-promoted'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'rag-quality-feedback';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['feedback-received', 1],
  ['quality-scored-success', 2],
  ['quality-scored-wasted', 3],
  ['pattern-extracted', 4],
  ['index-updated', 5],
  ['escalation-required', 6],
  ['dpo-promoted', 7],
];

test.describe('FLOW-38 — RAG Quality Feedback mock states', () => {

  test.setTimeout(60_000);

  test('default: RAG quality screen renders', async ({ page }) => {
    await page.goto(`/admin/${SLUG}?role=platform-admin&hideChrome=1`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId(`page-${SLUG}`)).toBeVisible();
    await expect(page.getByTestId('rag-quality-screen')).toBeVisible();
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
