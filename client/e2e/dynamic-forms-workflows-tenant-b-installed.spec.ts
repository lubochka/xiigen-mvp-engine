import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'dynamic-forms-workflows';
const CASCADE_SEGMENT = 'tenant-b-installed-from-a';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);

const ROLES = [
  'anonymous',
  'tenant-user',
  'tenant-admin',
  'freelancer',
  'business-partner',
] as const;

const CELLS = [
  { id: 'C2-en-populated', lang: 'en', width: 1280, height: 900 },
  { id: 'C4-he-rtl-populated', lang: 'he', width: 1280, height: 900 },
  { id: 'C6-en-mobile', lang: 'en', width: 375, height: 812 },
] as const;

function auditUrl(role: (typeof ROLES)[number], lang: string): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('hideChrome', '1');
  query.set('cascade', CASCADE_SEGMENT);
  query.set('lang', lang);
  return `/${SLUG}?${query.toString()}`;
}

async function assertRoleBranch(page: Page, role: (typeof ROLES)[number]) {
  const root = page.locator('[data-testid="page-dynamic-forms-workflows"][data-viewer-role]');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-viewer-role', role);
  await expect(page.getByTestId('dfwf-demo-form')).toBeVisible();
  await expect(page.getByTestId('dfwf-field-full-name')).toBeVisible();
  await expect(page.getByTestId('dfwf-field-email')).toBeVisible();

  if (role === 'anonymous') {
    await expect(page.getByTestId('dfwf-field-company-name')).toHaveCount(0);
    await expect(page.getByTestId('dfwf-field-hourly-rate')).toHaveCount(0);
    await expect(page.getByTestId('dfwf-field-budget')).toHaveCount(0);
    return;
  }

  await expect(page.getByTestId('dfwf-field-company-name')).toBeVisible();

  if (role === 'tenant-admin') {
    await expect(page.getByTestId('dfwf-field-internal-notes')).toBeVisible();
    await expect(page.getByTestId('dfwf-admin-panel')).toBeVisible();
    return;
  }

  await expect(page.getByTestId('dfwf-field-internal-notes')).toHaveCount(0);

  if (role === 'freelancer') {
    await expect(page.getByTestId('dfwf-field-hourly-rate')).toBeVisible();
    return;
  }

  if (role === 'business-partner') {
    await expect(page.getByTestId('dfwf-field-budget')).toBeVisible();
  }
}

test.describe('FLOW-21 Tenant B installed Tenant A dynamic forms package visual evidence', () => {
  for (const role of ROLES) {
    for (const cell of CELLS) {
      test(`${role} ${cell.id}`, async ({ page }) => {
        await page.setViewportSize({ width: cell.width, height: cell.height });
        await page.goto(auditUrl(role, cell.lang), { waitUntil: 'domcontentloaded' });
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

        await assertRoleBranch(page, role);
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
