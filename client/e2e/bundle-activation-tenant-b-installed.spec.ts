import { test, expect } from '@playwright/test';
import fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'bundle-activation';
const CASCADE_SEGMENT = 'tenant-b-installed-from-a';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);

const ROLES = ['tenant-admin', 'platform-admin', 'platform-support'] as const;
const CELLS = [
  { id: 'C2-en-populated', lang: 'en', width: 1280, height: 900 },
  { id: 'C4-he-rtl-populated', lang: 'he', width: 1280, height: 900 },
  { id: 'C6-en-mobile', lang: 'en', width: 375, height: 812 },
] as const;

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

function bundleActivationUrl(role: (typeof ROLES)[number], lang: string): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('hideChrome', '1');
  query.set('cascade', CASCADE_SEGMENT);
  query.set('lang', lang);
  return `/admin/bundle-activation?${query.toString()}`;
}

test.describe('FLOW-00 Tenant B installed Tenant A package visual evidence', () => {
  test.beforeAll(() => {
    fs.mkdirSync(path.join(SNAP_ROOT, CASCADE_SEGMENT), { recursive: true });
  });

  for (const role of ROLES) {
    for (const cell of CELLS) {
      test(`${role} ${cell.id}`, async ({ page }) => {
        await page.setViewportSize({ width: cell.width, height: cell.height });
        await page.goto(bundleActivationUrl(role, cell.lang), { waitUntil: 'domcontentloaded' });
        await page.evaluate((lang) => {
          document.documentElement.lang = lang;
          document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
        }, cell.lang);

        await expect(page.getByTestId('page-bundle-activation')).toBeVisible();
        await expect(page.getByTestId('page-bundle-activation')).toHaveAttribute(
          'data-viewer-role',
          role,
        );
        await expect(page.getByTestId('ba-tenant-adaptation')).toBeVisible();
        await expect(page.getByTestId('ba-tenant-adaptation')).toContainText(
          'Northwind installed launch policy',
        );
        await expect(page.getByTestId('ba-tenant-adaptation-summary')).toContainText(
          'Check bundle readiness',
        );
        await expect(page.getByTestId('ba-tenant-adaptation-summary')).toContainText(
          'Acme launch desk',
        );
        await expect(page.getByTestId('ba-tenant-adaptation-summary')).toContainText(
          'about 9 seconds',
        );
        await expect(page.getByTestId('ba-tenant-adaptation-summary')).toContainText(
          'Installed from Acme launch bundles',
        );

        if (cell.lang === 'he') {
          await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl');
        }

        const bodyText = await page.locator('body').innerText();
        for (const pattern of FORBIDDEN_COPY) {
          expect(bodyText).not.toMatch(pattern);
        }

        const outPath = path.join(SNAP_ROOT, CASCADE_SEGMENT, `${role}-${cell.id}.png`);
        await page.screenshot({ path: outPath, fullPage: true });
      });
    }
  }
});
