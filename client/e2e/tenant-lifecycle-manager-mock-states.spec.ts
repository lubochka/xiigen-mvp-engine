/**
 * FLOW-30 — Tenant Lifecycle Manager Mock-State Coverage
 *
 * Covers every UX-2-derived business state via ?mock=<key> query param against the stub page.
 * PNGs land at docs/e2e-snapshots/tenant-lifecycle-manager/.
 *
 * Mock keys (8): 'tenant-created', 'provisioning', 'onboarding', 'active',
 *                'quota-exceeded', 'policy-violation', 'suspended', 'offboarded'
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SLUG = 'tenant-lifecycle-manager';
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG, name);

const STATES: Array<[string, number]> = [
  ['tenant-created', 1],
  ['provisioning', 2],
  ['onboarding', 3],
  ['active', 4],
  ['quota-exceeded', 5],
  ['policy-violation', 6],
  ['suspended', 7],
  ['offboarded', 8],
];

test.describe('FLOW-30 — Tenant Lifecycle Manager mock states', () => {

  test('default: page-tenant-lifecycle-manager renders', async ({ page }) => {
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
