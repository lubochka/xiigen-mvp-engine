/**
 * FLOW-29 — Adaptive RAG / Deep Research Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/adaptive-rag-deep-research/.
 *
 * Mock keys (7): 'query-received', 'plan-queued', 'search-running', 'sources-gathered',
 *                'synthesis-done', 'search-failed', 'clarification-escalated'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'adaptive-rag-deep-research';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['query-received', 1],
  ['plan-queued', 2],
  ['search-running', 3],
  ['sources-gathered', 4],
  ['synthesis-done', 5],
  ['search-failed', 6],
  ['clarification-escalated', 7],
];

test.describe('FLOW-29 — Adaptive RAG / Deep Research mock states', () => {

  test('default: page-adaptive-rag-deep-research renders', async ({ page }) => {
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
