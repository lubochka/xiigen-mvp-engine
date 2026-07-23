import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVIDENCE_DIR = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'marketplace');

const FORBIDDEN_COPY = [
  /\bBFA\b/,
  /\bDNA-[1-9]\b/,
  /\bAF[- ]station\b/i,
  /\barbiter\b/i,
  /FREEDOM config/,
  /MACHINE code/,
  /DataProcessResult/,
  /ENGINE_INTERNAL/,
  /\bT[0-9]{3}\b/,
  /\bCF-[0-9]{3}\b/,
];

test.describe('FLOW-00 Tenant A marketplace listing evidence', () => {
  test.beforeAll(() => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  });

  test('shows Acme adapted bundle-activation v1.0.1 listing', async ({ page }) => {
    await page.goto('/marketplace?showcase=bundle-activation-v1.0.1&role=tenant-admin');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const card = page.getByTestId('marketplace-card-pkg-bundle-activation-acme-launch-bundles');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Acme Launch Bundles');
    await expect(card).toContainText('v1.0.1');
    await expect(card).toContainText('Acme launch desk');
    await expect(card).toContainText('about 9 seconds');

    const bodyText = await page.locator('body').innerText();
    for (const pattern of FORBIDDEN_COPY) {
      expect(bodyText).not.toMatch(pattern);
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'bundle-activation-v1.0.1-listing.png'),
      fullPage: true,
    });
  });

  test('shows Northwind adapted bundle-activation v1.0.2 listing', async ({ page }) => {
    await page.goto('/marketplace?showcase=bundle-activation-v1.0.2&role=tenant-admin');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const card = page.getByTestId('marketplace-card-pkg-bundle-activation-northwind-launch-bundles');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Northwind Launch Bundles');
    await expect(card).toContainText('v1.0.2');
    await expect(card).toContainText('Northwind branch ops');
    await expect(card).toContainText('about 11 seconds');

    const bodyText = await page.locator('body').innerText();
    for (const pattern of FORBIDDEN_COPY) {
      expect(bodyText).not.toMatch(pattern);
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'bundle-activation-v1.0.2-listing.png'),
      fullPage: true,
    });
  });

  test('shows Tessera adapted bundle-activation v1.0.3 listing', async ({ page }) => {
    await page.goto('/marketplace?showcase=bundle-activation-v1.0.3&role=tenant-admin');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const card = page.getByTestId('marketplace-card-pkg-bundle-activation-tessera-community-bundles');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Tessera Community Bundles');
    await expect(card).toContainText('v1.0.3');
    await expect(card).toContainText('Tessera community ops');
    await expect(card).toContainText('about 12 seconds');

    const bodyText = await page.locator('body').innerText();
    for (const pattern of FORBIDDEN_COPY) {
      expect(bodyText).not.toMatch(pattern);
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'bundle-activation-v1.0.3-listing.png'),
      fullPage: true,
    });
  });
});
