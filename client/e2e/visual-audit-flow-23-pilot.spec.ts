import { expect, test } from '@playwright/test';
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

const ROLES = [
  'tenant-admin',
  'platform-admin',
  'tenant-user',
  'freelancer',
  'business-partner',
  'platform-support',
] as const;

function roleUrl(role: (typeof ROLES)[number]): string {
  const params = new URLSearchParams();
  params.set('role', role);
  params.set('hideChrome', '1');
  return `/form-templates?${params.toString()}`;
}

test.describe('FLOW-23 visual audit pilot', () => {
  test.setTimeout(30_000);

  for (const role of ROLES) {
    test(`form-builder-templates primary ${role}`, async ({ page }, testInfo) => {
      const project = testInfo.project.name;
      const outDir = path.join(SNAP_ROOT, project, 'form-builder-templates');
      const file = `primary-${role}.png`;

      await page.goto(roleUrl(role), { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.waitForTimeout(800);
      const pageRoot = page.getByTestId('page-templatebuilder.tsx');
      await expect(pageRoot).toBeVisible();
      await expect(pageRoot).toHaveAttribute('data-viewer-role', role);
      await page.screenshot({ path: path.join(outDir, file), fullPage: true });
    });
  }
});
