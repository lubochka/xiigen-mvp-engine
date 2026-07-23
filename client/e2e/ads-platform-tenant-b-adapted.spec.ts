import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'ads-platform';
const CASCADE_SEGMENT = 'tenant-b-v1.0.2';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);

const ROLES = [
  'anonymous',
  'tenant-user',
  'tenant-admin',
  'business-partner',
  'platform-admin',
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
  return `/admin/${SLUG}?${query.toString()}`;
}

async function assertRoleBranch(page: Page, role: (typeof ROLES)[number]) {
  await expect(page.getByTestId('ads-platform-page')).toBeVisible();
  await expect(page.getByTestId('ads-platform-page')).toHaveAttribute('data-viewer-role', role);
  await expect(page.getByTestId('page-ads-platform')).toBeVisible();

  if (role === 'anonymous') {
    await expect(page.getByText('Advertise on XIIGen')).toBeVisible();
    return;
  }

  if (role === 'tenant-user') {
    await expect(page.getByText('Ads console is restricted')).toBeVisible();
    return;
  }

  if (role === 'tenant-admin') {
    await expect(page.getByText('Your workspace ad spend')).toBeVisible();
    return;
  }

  if (role === 'business-partner') {
    await expect(page.getByText('Partner advertising')).toBeVisible();
    return;
  }

  await expect(page.getByText('Ads platform')).toBeVisible();
  await expect(page.getByTestId('ads-platform-raw-index-details')).toBeVisible();
}

test.describe('FLOW-20 Tenant B adapted ads platform package visual evidence', () => {
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
