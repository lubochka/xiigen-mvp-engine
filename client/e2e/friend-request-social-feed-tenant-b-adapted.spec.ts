import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'friend-request-social-feed';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);
const MARKETPLACE_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'marketplace');
const CASCADE_SEGMENT = 'tenant-b-v1.0.2';

const ROLES = [
  'anonymous',
  'public-marketplace-visitor',
  'tenant-user',
  'freelancer',
  'business-partner',
  'tenant-admin',
  'platform-admin',
] as const;

const CELLS = [
  { id: 'C2-en-populated', lang: 'en', width: 1280, height: 900 },
  { id: 'C4-he-rtl-populated', lang: 'he', width: 1280, height: 900 },
  { id: 'C6-en-mobile', lang: 'en', width: 375, height: 812 },
] as const;

function socialFeedUrl(role: (typeof ROLES)[number], lang: string): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('hideChrome', '1');
  query.set('cascade', CASCADE_SEGMENT);
  query.set('lang', lang);
  return `/social-feed?${query.toString()}`;
}

test.describe('FLOW-07 Tenant B adapted visual evidence', () => {
  for (const role of ROLES) {
    for (const cell of CELLS) {
      test(`${role} ${cell.id}`, async ({ page }) => {
        await page.setViewportSize({ width: cell.width, height: cell.height });
        await page.goto(socialFeedUrl(role, cell.lang), { waitUntil: 'domcontentloaded' });
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

        await expect(page.getByTestId('social-feed-page')).toBeVisible();
        await expect(page.getByTestId('social-feed-page')).toHaveAttribute('data-viewer-role', role);
        await expect(page.getByTestId('feed-tenant-adaptation')).toBeVisible();
        await expect(page.getByTestId('feed-tenant-adaptation-summary')).toContainText('0.35');
        await expect(page.getByTestId('feed-tenant-adaptation-summary')).toContainText('12 updates');
        await expect(page.getByTestId('feed-tenant-adaptation-summary')).toContainText('0.65 recency');
        await expect(page.getByTestId('feed-tenant-adaptation-summary')).toContainText('0.25 relationship');
        await expect(page.getByTestId('feed-tenant-adaptation-summary')).toContainText('0.10 activity');
        if (cell.lang === 'he') {
          await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl');
        }

        const outPath = path.join(SNAP_ROOT, CASCADE_SEGMENT, `${role}-${cell.id}.png`);
        await page.screenshot({ path: outPath, fullPage: true });
      });
    }
  }

  test('marketplace listing shows Tenant B adapted package', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/marketplace?role=tenant-admin&hideChrome=1&showcase=friend-request-social-feed-v1.0.2', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('marketplace-page')).toBeVisible();
    const card = page.getByTestId('marketplace-card-pkg-friend-request-social-feed-northwind-fresh-trust-feed');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Northwind Fresh Trust Feed');
    await expect(card).toContainText('0.35');
    await expect(card).toContainText('12 updates');
    await expect(card).toContainText('0.65 recency');
    await page.screenshot({
      path: path.join(MARKETPLACE_ROOT, 'friend-request-social-feed-v1.0.2-listing.png'),
      fullPage: true,
    });
  });
});
