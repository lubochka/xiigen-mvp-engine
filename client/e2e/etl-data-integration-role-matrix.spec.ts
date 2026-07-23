import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'etl-data-integration';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'visual-audit');

const ROLE_CASES = [
  { role: 'tenant-admin', testId: 'etl-role-tenant-admin-view' },
  { role: 'tenant-user', testId: 'etl-role-user-view', extra: { 'tenant-lineage-enabled': 'true' } },
  { role: 'platform-admin', testId: 'etl-role-platform-admin-view' },
  { role: 'platform-support', testId: 'etl-role-support-view' },
] as const;

function roleUrl(cell: (typeof ROLE_CASES)[number]): string {
  const query = new URLSearchParams();
  query.set('role', cell.role);
  query.set('hideChrome', '1');
  for (const [key, value] of Object.entries(cell.extra ?? {})) {
    query.set(key, value);
  }
  return `/admin/${SLUG}?${query.toString()}`;
}

test.describe('FLOW-14 ETL role matrix captures', () => {
  for (const cell of ROLE_CASES) {
    test(`primary role cell - ${cell.role}`, async ({ page }, testInfo) => {
      const outDir = path.join(SNAP_ROOT, testInfo.project.name, SLUG);
      fs.mkdirSync(outDir, { recursive: true });

      await page.goto(roleUrl(cell), { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId(cell.testId)).toBeVisible();
      await expect(page.locator('[data-viewer-role]').first()).toHaveAttribute(
        'data-viewer-role',
        cell.role,
      );
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(outDir, `primary-${cell.role}.png`),
        fullPage: true,
      });
    });
  }
});
