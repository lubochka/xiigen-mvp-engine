/**
 * FLOW-33 — System Initiation Bootstrap Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/system-initiation-bootstrap/.
 *
 * Mock keys (7): 'engine-cold', 'bootstrap-running', 'seeding-corpus',
 *                'indices-ready', 'engine-warm', 'bootstrap-failed', 'engine-degraded'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'system-initiation-bootstrap';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const screenshotName = (name: string, projectName: string) =>
  `${name}-${projectName}.png`;

const STATES: Array<[string, number]> = [
  ['engine-cold', 1],
  ['bootstrap-running', 2],
  ['seeding-corpus', 3],
  ['indices-ready', 4],
  ['engine-warm', 5],
  ['bootstrap-failed', 6],
  ['engine-degraded', 7],
];

test.describe('FLOW-33 — System Initiation Bootstrap mock states', () => {

  test('default: platform-admin CRUD panel shell renders', async ({ page }, testInfo) => {
    await page.goto(`/admin/${SLUG}?role=platform-admin`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('sib-role-platform-admin-view')).toBeVisible();
    await expect(page.getByTestId(`page-${SLUG}`)).toBeVisible();
    await page.screenshot({
      path: SNAP(screenshotName('default-platform-admin', testInfo.project.name)),
      fullPage: true,
    });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`, async ({ page }, testInfo) => {
      await page.goto(`/admin/${SLUG}?mock=${key}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({
        path: SNAP(screenshotName(`state-${idx}-${key}`, testInfo.project.name)),
        fullPage: true,
      });
    });
  }
});
