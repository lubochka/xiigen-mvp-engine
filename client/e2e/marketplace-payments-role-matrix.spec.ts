/**
 * FLOW-16 Marketplace Payments role matrix.
 *
 * Captures the checkout route for every supported viewer role across the
 * configured desktop, tablet, and mobile Playwright projects.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROLES = [
  'anonymous',
  'public-marketplace-visitor',
  'tenant-user',
  'tenant-admin',
  'referral-user',
  'freelancer',
  'business-partner',
  'event-organiser',
  'platform-admin',
  'platform-support',
] as const;

const ROLE_EXPECTATIONS: Record<(typeof ROLES)[number], string> = {
  anonymous: 'checkout-anon-view',
  'public-marketplace-visitor': 'checkout-public-view',
  'tenant-user': 'checkout-buyer-view',
  'tenant-admin': 'checkout-admin-view',
  'referral-user': 'checkout-buyer-view',
  freelancer: 'checkout-payee-redirect',
  'business-partner': 'checkout-b2b-view',
  'event-organiser': 'checkout-payee-redirect',
  'platform-admin': 'checkout-platform-admin-view',
  'platform-support': 'checkout-support-view',
};

const SNAP = (projectName: string, role: string) => {
  const screenshotPath = path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    'marketplace-payments',
    'role-matrix',
    projectName,
    `${role}.png`,
  );
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  return screenshotPath;
};

test.describe('FLOW-16 marketplace-payments role matrix', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable; start docker compose up');
    }
  });

  for (const role of ROLES) {
    test(`${role} checkout branch renders`, async ({ page }) => {
      await page.goto(`/checkout?role=${encodeURIComponent(role)}`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('page-checkout')).toHaveAttribute('data-viewer-role', role);
      await expect(page.getByTestId(ROLE_EXPECTATIONS[role])).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        return root.scrollWidth > root.clientWidth + 1 || body.scrollWidth > window.innerWidth + 1;
      });
      expect(hasHorizontalOverflow).toBe(false);

      await page.screenshot({
        path: SNAP(test.info().project.name, role),
        fullPage: true,
      });
    });
  }
});
