import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOT_DIR = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'e2e-snapshots',
  'marketplace',
);

test.describe('Event management adapted marketplace listing', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  });

  test('Tenant A adapted listing shows Acme event policy', async ({ page }) => {
    await page.goto('/admin/sharable-flows-marketplace?role=tenant-admin');
    await page.waitForLoadState('networkidle');

    const card = page.locator('[data-package-id="PKG-event-management-acme-v1.0.1"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Acme Curated Events');
    await expect(card).toContainText('v1.0.1');
    await expect(card).toContainText('acme-corp');
    await expect(card).toContainText('10 attendee cap');
    await expect(card).toContainText('in-app promotion only');

    await card.screenshot({
      path: path.join(SNAPSHOT_DIR, 'event-management-v1.0.1-listing.png'),
    });
  });

  test('Tenant B adapted listing shows Northwind sponsor forum policy', async ({ page }) => {
    await page.goto('/admin/sharable-flows-marketplace?role=tenant-admin');
    await page.waitForLoadState('networkidle');

    const card = page.locator('[data-package-id="PKG-event-management-northwind-v1.0.2"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Northwind Sponsor Forums');
    await expect(card).toContainText('v1.0.2');
    await expect(card).toContainText('northwind');
    await expect(card).toContainText('Based on Acme v1.0.1');
    await expect(card).toContainText('12-partner sponsor review waitlist');
    await expect(card).toContainText('10 attendee cap');
    await expect(card).toContainText('in-app promotion');

    await card.screenshot({
      path: path.join(SNAPSHOT_DIR, 'event-management-v1.0.2-listing.png'),
    });
  });
});
