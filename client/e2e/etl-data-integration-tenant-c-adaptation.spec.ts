import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'etl-data-integration';
const CASCADE_SEGMENT = 'tenant-c-v1.0.3';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);

const ROLE_CASES = [
  { role: 'tenant-admin', testId: 'etl-role-tenant-admin-view' },
  { role: 'tenant-user', testId: 'etl-role-user-view', extra: { 'tenant-lineage-enabled': 'true' } },
  { role: 'platform-admin', testId: 'etl-role-platform-admin-view' },
  { role: 'platform-support', testId: 'etl-role-support-view' },
] as const;

const CELLS = [
  { id: 'C2-en-populated', lang: 'en', width: 1280, height: 900 },
  { id: 'C4-he-rtl-populated', lang: 'he', width: 1280, height: 900 },
  { id: 'C6-en-mobile', lang: 'en', width: 375, height: 812 },
] as const;

function etlUrl(roleCase: (typeof ROLE_CASES)[number], lang: string): string {
  const query = new URLSearchParams();
  query.set('role', roleCase.role);
  query.set('hideChrome', '1');
  query.set('cascade', CASCADE_SEGMENT);
  query.set('lang', lang);
  for (const [key, value] of Object.entries(roleCase.extra ?? {})) {
    query.set(key, value);
  }
  return `/admin/${SLUG}?${query.toString()}`;
}

test.describe('FLOW-14 Tenant C adapted data integration visual evidence', () => {
  for (const roleCase of ROLE_CASES) {
    for (const cell of CELLS) {
      test(`${roleCase.role} ${cell.id}`, async ({ page }) => {
        await page.setViewportSize({ width: cell.width, height: cell.height });
        await page.goto(etlUrl(roleCase, cell.lang), { waitUntil: 'domcontentloaded' });
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

        await expect(page.getByTestId('etl-tenant-adaptation')).toBeVisible();
        await expect(page.getByTestId('etl-tenant-adaptation')).toContainText(
          'Tessera community ETL data integration package',
        );
        await expect(page.getByTestId('etl-tenant-adaptation-summary')).toContainText(
          'consent-aware sync pages',
        );
        await expect(page.getByTestId('etl-tenant-adaptation-summary')).toContainText(
          'member programs',
        );
        await expect(page.getByText('Tessera v1.0.3')).toBeVisible();
        await expect(page.getByTestId(roleCase.testId)).toBeVisible();
        await expect(page.locator('[data-viewer-role]').first()).toHaveAttribute(
          'data-viewer-role',
          roleCase.role,
        );
        if (cell.lang === 'he') {
          await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl');
        }

        const outDir = path.join(SNAP_ROOT, CASCADE_SEGMENT);
        fs.mkdirSync(outDir, { recursive: true });
        await page.screenshot({
          path: path.join(outDir, `${roleCase.role}-${cell.id}.png`),
          fullPage: true,
        });
      });
    }
  }
});
