import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVIDENCE_DIR = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'marketplace');
const ACME_SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'completion-gamification-v1.0.1-listing.png');
const NORTHWIND_SCREENSHOT_PATH = path.join(
  EVIDENCE_DIR,
  'completion-gamification-v1.0.2-listing.png',
);

test.describe('FLOW-05 Tenant A marketplace listing evidence', () => {
  test.beforeAll(() => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  });

  test('shows Acme adapted completion-gamification v1.0.1 listing', async ({ page }) => {
    await page.goto('/marketplace?showcase=completion-gamification-v1.0.1&role=tenant-admin');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const card = page.getByTestId('marketplace-card-pkg-completion-gamification-acme-learning-rewards');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Acme Learning Rewards');
    await expect(card).toContainText('v1.0.1');
    await expect(card).toContainText('fifteen base points');
    await expect(card).toContainText('ten bonus points');
    await expect(card).toContainText('High-score bonus');

    const bodyText = await page.locator('body').innerText();
    const forbidden = [
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

    for (const pattern of forbidden) {
      expect(bodyText).not.toMatch(pattern);
    }

    await page.screenshot({ path: ACME_SCREENSHOT_PATH, fullPage: true });
  });

  test('shows Northwind adapted completion-gamification v1.0.2 listing', async ({ page }) => {
    await page.goto('/marketplace?showcase=completion-gamification-v1.0.2&role=tenant-admin');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const card = page.getByTestId(
      'marketplace-card-pkg-completion-gamification-northwind-momentum-rewards',
    );
    await expect(card).toBeVisible();
    await expect(card).toContainText('Northwind Momentum Rewards');
    await expect(card).toContainText('v1.0.2');
    await expect(card).toContainText('preserves Acme Learning Rewards');
    await expect(card).toContainText('four-hour streak grace window');
    await expect(card).toContainText('Four-hour grace');

    const bodyText = await page.locator('body').innerText();
    const forbidden = [
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

    for (const pattern of forbidden) {
      expect(bodyText).not.toMatch(pattern);
    }

    await page.screenshot({ path: NORTHWIND_SCREENSHOT_PATH, fullPage: true });
  });
});
