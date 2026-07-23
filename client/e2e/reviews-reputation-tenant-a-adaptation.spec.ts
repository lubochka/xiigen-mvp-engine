import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'reviews-reputation';
const CASCADE_SEGMENT = 'tenant-a-v1.0.1';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);
const MARKETPLACE_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'marketplace');

const ROLES = ['anonymous', 'tenant-user', 'tenant-admin', 'freelancer'] as const;
const CELLS = [
  { id: 'C2-en-populated', lang: 'en', width: 1280, height: 900 },
  { id: 'C4-he-rtl-populated', lang: 'he', width: 1280, height: 900 },
  { id: 'C6-en-mobile', lang: 'en', width: 375, height: 812 },
] as const;

function reviewsUrl(role: (typeof ROLES)[number], lang: string): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('hideChrome', '1');
  query.set('cascade', CASCADE_SEGMENT);
  query.set('lang', lang);
  return `/reviews/submit?${query.toString()}`;
}

test.describe('FLOW-10 Tenant A adapted visual evidence', () => {
  for (const role of ROLES) {
    for (const cell of CELLS) {
      test(`${role} ${cell.id}`, async ({ page }) => {
        await page.setViewportSize({ width: cell.width, height: cell.height });
        await page.goto(reviewsUrl(role, cell.lang), { waitUntil: 'domcontentloaded' });
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

        await expect(page.getByTestId('review-submission-page')).toBeVisible();
        await expect(page.getByTestId('review-submission-page')).toHaveAttribute(
          'data-viewer-role',
          role,
        );
        await expect(page.getByTestId('review-tenant-adaptation')).toBeVisible();
        await expect(page.getByTestId('review-tenant-adaptation-summary')).toContainText(
          '92% auto-approve threshold',
        );
        await expect(page.getByTestId('review-tenant-adaptation-summary')).toContainText(
          'stronger recent-review weighting',
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

  test('marketplace listing shows Tenant A adapted package', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/marketplace?role=tenant-admin&hideChrome=1&showcase=reviews-reputation-v1.0.1', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('marketplace-page')).toBeVisible();
    const card = page.getByTestId('marketplace-card-pkg-reviews-reputation-acme-verified-trust-reviews');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Acme Verified-Trust Reviews');
    await expect(card).toContainText('92% auto-approve threshold');
    await expect(card).toContainText('stronger recent-review weighting');

    fs.mkdirSync(MARKETPLACE_ROOT, { recursive: true });
    await page.screenshot({
      path: path.join(MARKETPLACE_ROOT, 'reviews-reputation-v1.0.1-listing.png'),
      fullPage: true,
    });
  });
});
