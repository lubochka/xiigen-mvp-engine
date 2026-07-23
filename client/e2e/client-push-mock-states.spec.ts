/**
 * FLOW-40 - Client Push mock-state coverage.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'client-push';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['subscription-active', 1],
  ['event-queued', 2],
  ['payload-dispatched', 3],
  ['delivery-confirmed', 4],
  ['connection-expired', 5],
  ['cross-tenant-blocked', 6],
  ['keepalive-sent', 7],
  ['delivery-failed', 8],
];

test.describe('FLOW-40 - Client Push mock states', () => {
  test('default: platform-admin client-push screen renders', async ({ page }) => {
    await page.goto(`/admin/${SLUG}?role=platform-admin&hideChrome=1`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('client-push-screen')).toBeVisible();
    await page.screenshot({ path: SNAP('default.png'), fullPage: true });
  });

  for (const [key, idx] of STATES) {
    test(`state-${idx} (${key}): ${SLUG}-state-${idx} visible with status badge`, async ({
      page,
    }) => {
      await page.goto(`/admin/${SLUG}?mock=${key}&hideChrome=1`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId(`${SLUG}-state-${idx}`)).toBeVisible();
      await expect(page.getByTestId(`${SLUG}-status-badge`)).toBeVisible();
      await page.screenshot({ path: SNAP(`state-${idx}-${key}.png`), fullPage: true });
    });
  }
});
