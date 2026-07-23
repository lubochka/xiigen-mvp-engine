import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'marketplace');
const TENANT_A_DIR = path.join(OUT_DIR, 'tenant-a-v1.0.1');

const roles = ['tenant-admin', 'platform-admin', 'platform-support'] as const;
const cells = [
  {
    id: 'C2-en-populated',
    locale: 'en',
    viewport: { width: 1280, height: 800 },
    dir: 'ltr',
  },
  {
    id: 'C4-he-rtl-populated',
    locale: 'he',
    viewport: { width: 1280, height: 800 },
    dir: 'rtl',
  },
  {
    id: 'C6-en-mobile',
    locale: 'en',
    viewport: { width: 375, height: 812 },
    dir: 'ltr',
  },
] as const;

test.describe('Flow 08 Tenant A adapted marketplace package', () => {
  test.beforeAll(() => {
    fs.mkdirSync(TENANT_A_DIR, { recursive: true });
  });

  test('marketplace listing shows the adapted Acme package', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/marketplace?showcase=marketplace-v1.0.1&role=tenant-admin');

    const card = page.getByTestId('marketplace-card-pkg-marketplace-acme-curated-marketplace').first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Acme Curated Marketplace');
    await expect(card).toContainText('service-first listings');
    await expect(card).toContainText('partner-friendly presentation');
    await expect(card).toContainText('price cap of 5000');
    await expect(card).toContainText('v1.0.1');

    await card.screenshot({
      path: path.join(OUT_DIR, 'marketplace-v1.0.1-listing.png'),
    });
  });

  for (const role of roles) {
    for (const cell of cells) {
      test(`${role} ${cell.id}`, async ({ page }) => {
        await page.setViewportSize(cell.viewport);
        await page.goto(`/marketplace?showcase=marketplace-v1.0.1&role=${role}`);
        await page.evaluate(
          ({ dir, locale }) => {
            document.documentElement.dir = dir;
            document.documentElement.lang = locale;
          },
          { dir: cell.dir, locale: cell.locale },
        );

        const card = page.getByTestId('marketplace-card-pkg-marketplace-acme-curated-marketplace').first();
        await expect(card).toBeVisible();
        await expect(card).toContainText('Acme Curated Marketplace');
        await expect(card).toContainText('price cap of 5000');
        await expect(card).toContainText('Acme');
        await expect(card).toContainText('v1.0.1');

        await page.screenshot({
          path: path.join(TENANT_A_DIR, `${role}-${cell.id}.png`),
          fullPage: true,
        });
      });
    }
  }
});
