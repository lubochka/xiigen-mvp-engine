import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'durable-sagas-compliance';
const CASCADE_SEGMENT = 'tenant-b-v1.0.2';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);

const ROLES = [
  'anonymous',
  'tenant-user',
  'tenant-admin',
  'platform-admin',
  'platform-support',
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
  return `/admin/compliance/audit?${query.toString()}`;
}

async function assertRoleBranch(page: Page, role: (typeof ROLES)[number]) {
  await expect(page.getByTestId('compliance-audit-page')).toBeVisible();
  await expect(page.getByTestId('compliance-audit-page')).toHaveAttribute(
    'data-viewer-role',
    role,
  );

  if (role === 'platform-admin') {
    await expect(page.getByTestId('ca-admin-view')).toBeVisible();
    await page.getByTestId('search-button').click();
    await expect(page.locator('[data-testid^="audit-record-"]').first()).toBeVisible();
    await expect(page.getByTestId('run-retention-button')).toBeVisible();
    return;
  }

  if (role === 'platform-support') {
    await expect(page.getByTestId('ca-compliance-inspector')).toBeVisible();
    await expect(page.getByTestId('compliance-audit-readonly-notice')).toBeVisible();
    await expect(page.getByTestId('compliance-audit-export')).toBeVisible();
    await expect(page.getByTestId('ca-support-audit-log')).toBeVisible();
    await expect(page.getByTestId('run-retention-button')).toHaveCount(0);
    return;
  }

  await expect(page.getByTestId('ca-not-available')).toBeVisible();
  await expect(page.getByTestId('ca-fallback-hint')).toBeVisible();
}

test.describe('FLOW-19 Tenant B adapted durable sagas package visual evidence', () => {
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
