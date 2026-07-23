import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'subscription-billing';
const CASCADE_SEGMENT = 'tenant-c-v1.0.3';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);
const MARKETPLACE_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'marketplace');

const ROLES = [
  'anonymous',
  'public-marketplace-visitor',
  'tenant-user',
  'tenant-admin',
  'referral-user',
  'freelancer',
  'business-partner',
  'event-organiser',
  'platform-admin',
  'platform-support',
] as const;

const CELLS = [
  { id: 'C2-en-populated', lang: 'en', width: 1280, height: 900 },
  { id: 'C4-he-rtl-populated', lang: 'he', width: 1280, height: 900 },
  { id: 'C6-en-mobile', lang: 'en', width: 375, height: 812 },
] as const;

function billingUrl(role: (typeof ROLES)[number], lang: string): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('hideChrome', '1');
  query.set('cascade', CASCADE_SEGMENT);
  query.set('variant', 'tessera-community-billing');
  query.set('lang', lang);
  return `/billing-dashboard?${query.toString()}`;
}

test.describe('FLOW-12 Tenant C adapted visual evidence', () => {
  for (const role of ROLES) {
    for (const cell of CELLS) {
      test(`${role} ${cell.id}`, async ({ page }) => {
        await page.setViewportSize({ width: cell.width, height: cell.height });
        await page.goto(billingUrl(role, cell.lang), { waitUntil: 'domcontentloaded' });
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

        await expect(page.getByTestId('billing-dashboard-page')).toBeVisible();
        await expect(page.getByTestId('billing-dashboard-page')).toHaveAttribute(
          'data-viewer-role',
          role,
        );
        await expect(page.getByTestId('billing-tenant-adaptation')).toBeVisible();
        await expect(page.getByTestId('billing-tenant-adaptation')).toContainText(
          'Tessera community billing',
        );
        await expect(page.getByTestId('billing-tenant-adaptation-summary')).toContainText(
          '28-day trials',
        );
        await expect(page.getByTestId('billing-tenant-adaptation-summary')).toContainText(
          'community-paced recovery',
        );
        await expect(page.getByTestId('billing-tenant-adaptation-summary')).toContainText(
          'preserving Acme and Northwind history',
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

  test('marketplace listing shows Tenant C adapted billing package', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/marketplace?role=tenant-admin&hideChrome=1&showcase=subscription-billing-v1.0.3', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('marketplace-page')).toBeVisible();
    const card = page.getByTestId('marketplace-card-pkg-subscription-billing-tessera-community-billing');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Tessera Community Billing');
    await expect(card).toContainText('28-day trials');
    await expect(card).toContainText('community-paced recovery');
    await expect(card).toContainText('preserving Acme and Northwind history');

    fs.mkdirSync(MARKETPLACE_ROOT, { recursive: true });
    await page.screenshot({
      path: path.join(MARKETPLACE_ROOT, 'subscription-billing-v1.0.3-listing.png'),
      fullPage: true,
    });
  });
});
