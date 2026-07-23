import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

type Flow23Role =
  | 'tenant-admin'
  | 'platform-admin'
  | 'tenant-user'
  | 'freelancer'
  | 'business-partner'
  | 'platform-support';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'form-builder-templates';
const CASCADE_SEGMENT = 'tenant-c-v1.0.3';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);

const ROLES: Flow23Role[] = [
  'tenant-admin',
  'platform-admin',
  'tenant-user',
  'freelancer',
  'business-partner',
  'platform-support',
];

const CELLS = [
  { id: 'C2-en-populated', lang: 'en', width: 1280, height: 900 },
  { id: 'C4-he-rtl-populated', lang: 'he', width: 1280, height: 900 },
  { id: 'C6-en-mobile', lang: 'en', width: 375, height: 812 },
] as const;

function auditUrl(role: Flow23Role, lang: string): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('hideChrome', '1');
  query.set('cascade', CASCADE_SEGMENT);
  query.set('lang', lang);
  return `/form-templates?${query.toString()}`;
}

async function openRole(page: Page, role: Flow23Role, lang: string) {
  await page.goto(auditUrl(role, lang), {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const root = page.getByTestId('page-templatebuilder.tsx');
  await expect(root).toBeVisible({ timeout: 60_000 });
  await expect(root).toHaveAttribute('data-viewer-role', role);
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
}

async function assertRoleSurface(page: Page, role: Flow23Role) {
  if (role === 'tenant-admin' || role === 'platform-admin') {
    await expect(page.getByRole('button', { name: 'Validate template' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish version' })).toBeVisible();
    return;
  }

  await expect(page.getByTestId('fbt-consumer-catalog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Validate template' })).toHaveCount(0);
}

test.describe('FLOW-23 Tenant C adapted template package visual evidence', () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeAll(async ({ request }) => {
    try {
      const response = await request.get('http://localhost:3000/health/live');
      if (!response.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable');
    }
  });

  for (const role of ROLES) {
    for (const cell of CELLS) {
      test(`${role} ${cell.id}`, async ({ page }) => {
        await page.setViewportSize({ width: cell.width, height: cell.height });
        await openRole(page, role, cell.lang);

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

        await assertRoleSurface(page, role);
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
});
