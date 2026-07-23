/**
 * FLOW-18 Tenant B installed-from-A cascade screenshots.
 *
 * Captures the visual-flow canvas role matrix for the Northwind install of
 * Acme's adapted visual-flow package.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROLES = [
  'anonymous',
  'tenant-user',
  'tenant-admin',
  'platform-admin',
  'platform-support',
] as const;

const ROLE_EXPECTATIONS: Record<(typeof ROLES)[number], string> = {
  anonymous: 'fce-fallback-hint',
  'tenant-user': 'fce-fallback-hint',
  'tenant-admin': 'fce-tenant-admin-view',
  'platform-admin': 'fce-platform-admin-view',
  'platform-support': 'fce-support-view',
};

const SNAP = (projectName: string, role: string) => {
  const screenshotPath = path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    'visual-flow-engine',
    'tenant-b-installed-from-a',
    projectName,
    `${role}.png`,
  );
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  return screenshotPath;
};

test.describe('FLOW-18 Tenant B installed from Tenant A', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:33001/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable; start docker compose up');
    }
  });

  for (const role of ROLES) {
    test(`${role} installed-from-A canvas branch renders`, async ({ page }) => {
      await page.goto(`/admin/visual-flow/canvas?role=${encodeURIComponent(role)}`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('flow-canvas-page')).toHaveAttribute(
        'data-viewer-role',
        role,
      );
      await expect(page.getByTestId(ROLE_EXPECTATIONS[role])).toBeVisible();
      await expect(page.getByText(/Unexpected end of JSON input/i)).toHaveCount(0);
      await expect(page.getByText(/Failed to execute 'json'/i)).toHaveCount(0);
      await expect(
        page.locator('[data-testid="topology-viewer-empty"], [data-testid="topology-graph"]'),
      ).toBeVisible();

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
