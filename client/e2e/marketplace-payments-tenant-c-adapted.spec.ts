/**
 * FLOW-16 Tenant C adapted cascade evidence.
 *
 * Verifies Tessera's own marketplace payments adaptation keeps the expected
 * role-specific checkout surfaces while only changing declared FREEDOM values.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATES = [
  {
    name: 'installed-package',
    role: 'tenant-admin',
    expected: 'checkout-admin-view',
  },
  {
    name: 'buyer-checkout',
    role: 'tenant-user',
    expected: 'checkout-buyer-view',
  },
  {
    name: 'b2b-checkout',
    role: 'business-partner',
    expected: 'checkout-b2b-view',
  },
  {
    name: 'platform-reconciliation',
    role: 'platform-admin',
    expected: 'checkout-platform-admin-view',
  },
  {
    name: 'support-dispute-view',
    role: 'platform-support',
    expected: 'checkout-support-view',
  },
  {
    name: 'payee-escrow-redirect',
    role: 'freelancer',
    expected: 'checkout-payee-redirect',
  },
] as const;

const SNAP = (projectName: string, stateName: string) => {
  const screenshotPath = path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    'marketplace-payments',
    'tenant-c-v1.0.3',
    projectName,
    `${stateName}.png`,
  );
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  return screenshotPath;
};

test.describe('FLOW-16 Tenant C adapted package v1.0.3', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable; start docker compose up');
    }
  });

  for (const state of STATES) {
    test(`${state.name} renders`, async ({ page }) => {
      await page.goto(
        `/checkout?role=${encodeURIComponent(state.role)}&tenant=tessera-collective&cascade=tessera-v1.0.3&package=tessera-community-marketplace-payments`,
      );
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('page-checkout')).toHaveAttribute('data-viewer-role', state.role);
      await expect(page.getByTestId(state.expected)).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        return root.scrollWidth > root.clientWidth + 1 || body.scrollWidth > window.innerWidth + 1;
      });
      expect(hasHorizontalOverflow).toBe(false);

      await page.screenshot({
        path: SNAP(test.info().project.name, state.name),
        fullPage: true,
      });
    });
  }
});
