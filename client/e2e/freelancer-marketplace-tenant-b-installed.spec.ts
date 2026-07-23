/**
 * FLOW-17 Tenant B installed-from-A cascade evidence.
 *
 * Verifies the installed Acme enterprise freelancer marketplace package renders
 * the expected role branches for Northwind after tenant.config.json is rewritten
 * by the fork engine.
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
  'platform-admin',
  'platform-support',
] as const;

const ROLE_EXPECTATIONS: Record<(typeof ROLES)[number], string> = {
  anonymous: 'gig-anon-view',
  'public-marketplace-visitor': 'gig-public-view',
  'tenant-user': 'gig-client-view',
  'tenant-admin': 'gig-admin-view',
  'referral-user': 'gig-client-view',
  freelancer: 'gig-freelancer-view',
  'business-partner': 'gig-client-view',
  'platform-admin': 'gig-platform-admin-view',
  'platform-support': 'gig-platform-support-view',
};

const SNAP = (projectName: string, role: string) => {
  const screenshotPath = path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    'freelancer-marketplace',
    'tenant-b-installed-from-a',
    projectName,
    `${role}.png`,
  );
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  return screenshotPath;
};

function urlFor(role: (typeof ROLES)[number]): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('tenant', 'northwind');
  query.set('installedFrom', 'acme-corp');
  query.set('packageVersion', '1.0.1');
  query.set('hideChrome', '1');
  return `/gigs/post?${query.toString()}`;
}

test.describe('FLOW-17 Tenant B installed from Tenant A adapted package', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable; start docker compose up');
    }
  });

  for (const role of ROLES) {
    test(`${role} installed package branch renders`, async ({ page }, testInfo) => {
      await page.goto(urlFor(role), { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('gig-posting-page')).toBeVisible();
      await expect(page.getByTestId('gig-posting-page')).toHaveAttribute(
        'data-viewer-role',
        role,
      );
      await expect(page.getByTestId(ROLE_EXPECTATIONS[role])).toBeVisible();

      if (role === 'referral-user') {
        await expect(page.getByTestId('gig-referral-banner')).toBeVisible();
      }

      const hasHorizontalOverflow = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        return root.scrollWidth > root.clientWidth + 1 || body.scrollWidth > window.innerWidth + 1;
      });
      expect(hasHorizontalOverflow).toBe(false);

      await page.screenshot({
        path: SNAP(testInfo.project.name, role),
        fullPage: true,
      });
    });
  }
});
