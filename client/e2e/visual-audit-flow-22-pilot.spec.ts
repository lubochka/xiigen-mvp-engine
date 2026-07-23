import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAP_ROOT = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'e2e-snapshots',
  'visual-audit',
);

const ROLES: Array<{ role: string; expectedTestId: string }> = [
  { role: 'anonymous', expectedTestId: 'cms-role-reader-view' },
  { role: 'public-marketplace-visitor', expectedTestId: 'cms-role-reader-view' },
  { role: 'tenant-user', expectedTestId: 'cms-role-user-view' },
  { role: 'freelancer', expectedTestId: 'cms-role-freelancer-view' },
  { role: 'business-partner', expectedTestId: 'cms-fallback-view' },
  { role: 'event-organiser', expectedTestId: 'cms-fallback-view' },
  { role: 'tenant-admin', expectedTestId: 'cms-role-admin-view' },
  { role: 'platform-admin', expectedTestId: 'cms-role-platform-admin-view' },
  { role: 'platform-support', expectedTestId: 'cms-support-view' },
];

function roleUrl(role: string): string {
  const params = new URLSearchParams();
  params.set('role', role);
  params.set('hideChrome', '1');
  return `/cms-publishing?${params.toString()}`;
}

test.describe('FLOW-22 visual audit pilot', () => {
  test.setTimeout(20_000);

  for (const cell of ROLES) {
    test(`cms-publishing primary ${cell.role}`, async ({ page }, testInfo) => {
      const project = testInfo.project.name;
      const outDir = path.join(SNAP_ROOT, project, 'cms-publishing');
      const file = `primary-${cell.role}.png`;

      await page.goto(roleUrl(cell.role), { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await page.waitForTimeout(800);
      await expect(page.getByTestId(cell.expectedTestId)).toBeVisible();
      await page.screenshot({ path: path.join(outDir, file), fullPage: true });
    });
  }
});
