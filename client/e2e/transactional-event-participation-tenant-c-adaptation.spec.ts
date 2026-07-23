import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'transactional-event-participation';
const CASCADE_SEGMENT = 'tenant-c-v1.0.3';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);
const MARKETPLACE_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'marketplace');

const ROLES = ['anonymous', 'tenant-user', 'event-organiser', 'platform-admin'] as const;
const CELLS = [
  { id: 'C2-en-populated', lang: 'en', width: 1280, height: 900 },
  { id: 'C4-he-rtl-populated', lang: 'he', width: 1280, height: 900 },
  { id: 'C6-en-mobile', lang: 'en', width: 375, height: 812 },
] as const;

function ticketingUrl(role: (typeof ROLES)[number], lang: string): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('hideChrome', '1');
  query.set('cascade', CASCADE_SEGMENT);
  query.set('lang', lang);
  return `/tickets/purchase?${query.toString()}`;
}

test.describe('FLOW-09 Tenant C adapted visual evidence', () => {
  for (const role of ROLES) {
    for (const cell of CELLS) {
      test(`${role} ${cell.id}`, async ({ page }) => {
        await page.setViewportSize({ width: cell.width, height: cell.height });
        await page.goto(ticketingUrl(role, cell.lang), { waitUntil: 'domcontentloaded' });
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

        await expect(page.getByTestId('ticket-purchase-page')).toBeVisible();
        await expect(page.getByTestId('ticket-purchase-page')).toHaveAttribute(
          'data-viewer-role',
          role,
        );
        await expect(page.getByTestId('ticket-tenant-adaptation')).toBeVisible();
        await expect(page.getByTestId('ticket-tenant-adaptation-summary')).toContainText(
          '5-minute seat holds',
        );
        await expect(page.getByTestId('ticket-tenant-adaptation-summary')).toContainText(
          '96-hour refunds',
        );
        await expect(page.getByTestId('ticket-tenant-adaptation-summary')).toContainText(
          'steward-led same-day capacity updates',
        );
        if (cell.lang === 'he') {
          await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl');
        }

        await page.screenshot({
          path: path.join(SNAP_ROOT, CASCADE_SEGMENT, `${role}-${cell.id}.png`),
          fullPage: true,
        });
      });
    }
  }

  test('marketplace listing shows Tenant C adapted package', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(
      '/marketplace?role=tenant-admin&hideChrome=1&showcase=transactional-event-participation-v1.0.3',
      { waitUntil: 'domcontentloaded' },
    );
    await expect(page.getByTestId('marketplace-page')).toBeVisible();
    const card = page.getByTestId(
      'marketplace-card-pkg-transactional-event-participation-tessera-community-ticketing',
    );
    await expect(card).toBeVisible();
    await expect(card).toContainText('Tessera Community Ticketing');
    await expect(card).toContainText('5-minute seat holds');
    await expect(card).toContainText('96-hour refunds');
    await page.screenshot({
      path: path.join(MARKETPLACE_ROOT, 'transactional-event-participation-v1.0.3-listing.png'),
      fullPage: true,
    });
  });
});
