import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'data-warehouse-analytics';
const CASCADE_SEGMENT = 'tenant-b-installed-from-a';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);

const ROLES = ['tenant-admin', 'business-partner', 'platform-admin'] as const;
const CELLS = [
  { id: 'C2-en-populated', lang: 'en', width: 1280, height: 900 },
  { id: 'C4-he-rtl-populated', lang: 'he', width: 1280, height: 900 },
  { id: 'C6-en-mobile', lang: 'en', width: 375, height: 812 },
] as const;

function analyticsUrl(role: (typeof ROLES)[number], lang: string): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('hideChrome', '1');
  query.set('cascade', CASCADE_SEGMENT);
  query.set('lang', lang);
  return `/admin/data-warehouse-analytics?${query.toString()}`;
}

test.describe('FLOW-13 Tenant B installed Tenant A analytics package visual evidence', () => {
  for (const role of ROLES) {
    for (const cell of CELLS) {
      test(`${role} ${cell.id}`, async ({ page }) => {
        await page.setViewportSize({ width: cell.width, height: cell.height });
        await page.goto(analyticsUrl(role, cell.lang), { waitUntil: 'domcontentloaded' });
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

        await expect(page.getByTestId('analytics-tenant-adaptation')).toBeVisible();
        await expect(page.getByTestId('analytics-tenant-adaptation')).toContainText(
          'Northwind installed Acme enterprise warehouse analytics',
        );
        await expect(page.getByTestId('analytics-tenant-adaptation-summary')).toContainText(
          '20,000 daily queries',
        );
        await expect(page.getByTestId('analytics-tenant-adaptation-summary')).toContainText(
          '4-hour export links',
        );
        await expect(page.locator('[data-viewer-role]').first()).toHaveAttribute(
          'data-viewer-role',
          role,
        );
        if (cell.lang === 'he') {
          await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl');
        }

        const outDir = path.join(SNAP_ROOT, CASCADE_SEGMENT);
        fs.mkdirSync(outDir, { recursive: true });
        await page.screenshot({
          path: path.join(outDir, `${role}-${cell.id}.png`),
          fullPage: true,
        });
      });
    }
  }
});
