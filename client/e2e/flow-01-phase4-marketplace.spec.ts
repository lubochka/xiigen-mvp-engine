import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'marketplace');

test('Flow 01 Tenant A marketplace listing shows the adapted package', async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/marketplace?showcase=user-registration-v1.0.1&role=tenant-admin');

  const card = page.getByTestId('marketplace-card-pkg-user-registration-acme-pro-members').first();
  await expect(card).toBeVisible();
  await expect(card).toContainText('Acme Pro Members Registration');
  await expect(card).toContainText('one-hour verification links');
  await expect(card).toContainText('fifteen-minute resend window');
  await expect(card).toContainText('v1.0.1');

  await page.screenshot({
    path: path.join(OUT_DIR, 'user-registration-v1.0.1-listing.png'),
    fullPage: true,
  });
});

test('Flow 01 Tenant B marketplace listing shows the adapted package', async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/marketplace?showcase=user-registration-v1.0.2&role=tenant-admin');

  const card = page.getByTestId('marketplace-card-pkg-user-registration-northwind-guild').first();
  await expect(card).toBeVisible();
  await expect(card).toContainText('Northwind Guild Registration');
  await expect(card).toContainText('Acme Pro Members invitation copy');
  await expect(card).toContainText('five minutes');
  await expect(card).toContainText('v1.0.2');

  await page.screenshot({
    path: path.join(OUT_DIR, 'user-registration-v1.0.2-listing.png'),
    fullPage: true,
  });
});
