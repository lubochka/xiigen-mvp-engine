/**
 * FLOW-17 Freelancer Marketplace role matrix.
 *
 * FLOW-17 has 8 full role cells plus 1 referral banner variant. The
 * event-organiser role has no distinct FLOW-17 surface per ROLE-ANALYSIS-BATCH-04,
 * so it is intentionally excluded from this matrix.
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

const CONSUMER_SHELL_ROLES = new Set<(typeof ROLES)[number]>([
  'anonymous',
  'public-marketplace-visitor',
  'tenant-user',
  'referral-user',
  'freelancer',
  'business-partner',
]);

const PLAIN_LANGUAGE_BLOCKLIST =
  /\bBFA\b|\bDNA-[1-9]\b|\bAF[- ]station\b|\barbiter\b|FREEDOM config|MACHINE code|DataProcessResult|ENGINE_INTERNAL|\bT[0-9]{3}\b|\bCF-[0-9]{3}\b/i;

const SNAP = (projectName: string, role: string) => {
  const screenshotPath = path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    'freelancer-marketplace',
    'role-matrix',
    projectName,
    `${role}.png`,
  );
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  return screenshotPath;
};

function urlFor(role: (typeof ROLES)[number]): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('hideChrome', '1');
  return `/gigs/post?${query.toString()}`;
}

test.describe('FLOW-17 freelancer-marketplace role matrix', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable; start docker compose up');
    }
  });

  for (const role of ROLES) {
    test(`${role} gig branch renders`, async ({ page }, testInfo) => {
      await page.goto(urlFor(role), { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('gig-posting-page')).toBeVisible();
      await expect(page.getByTestId('gig-posting-page')).toHaveAttribute('data-viewer-role', role);
      await expect(page.getByTestId(ROLE_EXPECTATIONS[role])).toBeVisible();

      if (role === 'referral-user') {
        await expect(page.getByTestId('gig-referral-banner')).toBeVisible();
      }

      if (CONSUMER_SHELL_ROLES.has(role)) {
        await expect(page.locator('aside').filter({ hasText: 'Engine Client' })).toHaveCount(0);
      }

      const visibleText = await page.locator('body').innerText();
      expect(visibleText).not.toMatch(PLAIN_LANGUAGE_BLOCKLIST);

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
