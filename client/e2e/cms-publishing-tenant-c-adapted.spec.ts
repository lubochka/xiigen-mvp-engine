import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'cms-publishing';
const CASCADE_SEGMENT = 'tenant-c-v1.0.3';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);

const ROLES = [
  { role: 'anonymous', expectedTestId: 'cms-role-reader-view' },
  { role: 'public-marketplace-visitor', expectedTestId: 'cms-role-reader-view' },
  { role: 'tenant-user', expectedTestId: 'cms-role-user-view' },
  { role: 'freelancer', expectedTestId: 'cms-role-freelancer-view' },
  { role: 'business-partner', expectedTestId: 'cms-fallback-view' },
  { role: 'event-organiser', expectedTestId: 'cms-fallback-view' },
  { role: 'tenant-admin', expectedTestId: 'cms-role-admin-view' },
  { role: 'platform-admin', expectedTestId: 'cms-role-platform-admin-view' },
  { role: 'platform-support', expectedTestId: 'cms-support-view' },
] as const;

const CELLS = [
  { id: 'C2-en-populated', lang: 'en', width: 1280, height: 900 },
  { id: 'C4-he-rtl-populated', lang: 'he', width: 1280, height: 900 },
  { id: 'C6-en-mobile', lang: 'en', width: 375, height: 812 },
] as const;

function auditUrl(role: (typeof ROLES)[number]['role'], lang: string): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('hideChrome', '1');
  query.set('cascade', CASCADE_SEGMENT);
  query.set('lang', lang);
  return `/${SLUG}?${query.toString()}`;
}

async function assertRoleBranch(page: Page, roleCell: (typeof ROLES)[number]) {
  const root = page.locator('[data-viewer-role]').first();
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-viewer-role', roleCell.role);
  await expect(page.getByTestId(roleCell.expectedTestId)).toBeVisible();
}

test.describe('FLOW-22 Tenant C adapted CMS package visual evidence', () => {
  for (const roleCell of ROLES) {
    for (const cell of CELLS) {
      test(`${roleCell.role} ${cell.id}`, async ({ page }) => {
        await page.setViewportSize({ width: cell.width, height: cell.height });
        await page.goto(auditUrl(roleCell.role, cell.lang), {
          waitUntil: 'domcontentloaded',
          timeout: 15_000,
        });

        if (cell.lang === 'he') {
          await page.evaluate(() => {
            document.documentElement.dir = 'rtl';
            document.documentElement.lang = 'he';
          });
        } else {
          await page.evaluate(() => {
            document.documentElement.dir = 'ltr';
            document.documentElement.lang = 'en';
          });
        }

        await assertRoleBranch(page, roleCell);
        if (cell.lang === 'he') {
          await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl');
        }

        const outDir = path.join(SNAP_ROOT, CASCADE_SEGMENT);
        fs.mkdirSync(outDir, { recursive: true });
        await page.screenshot({
          path: path.join(outDir, `${roleCell.role}-${cell.id}.png`),
          fullPage: true,
        });
      });
    }
  }
});
