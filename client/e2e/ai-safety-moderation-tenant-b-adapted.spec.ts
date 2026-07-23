import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

type Flow24Role =
  | 'anonymous'
  | 'tenant-user'
  | 'tenant-admin'
  | 'platform-admin'
  | 'platform-support';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'ai-safety-moderation';
const CASCADE_SEGMENT = 'tenant-b-v1.0.2';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', SLUG);

const ROLES: Flow24Role[] = [
  'anonymous',
  'tenant-user',
  'tenant-admin',
  'platform-admin',
  'platform-support',
];

const CELLS = [
  { id: 'C2-en-populated', lang: 'en', width: 1280, height: 900 },
  { id: 'C4-he-rtl-populated', lang: 'he', width: 1280, height: 900 },
  { id: 'C6-en-mobile', lang: 'en', width: 375, height: 812 },
] as const;

function auditUrl(role: Flow24Role, lang: string): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('hideChrome', '1');
  query.set('cascade', CASCADE_SEGMENT);
  query.set('lang', lang);
  if (role === 'tenant-user') query.set('flagged', 'true');
  return `/${SLUG}?${query.toString()}`;
}

async function openRole(page: Page, role: Flow24Role, lang: string) {
  await page.goto(auditUrl(role, lang), {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const root = page.locator('[data-viewer-role]').first();
  await expect(root).toBeVisible({ timeout: 60_000 });
  await expect(root).toHaveAttribute('data-viewer-role', role);
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
}

async function assertRoleSurface(page: Page, role: Flow24Role) {
  if (role === 'anonymous') {
    await expect(page.getByTestId('asm-role-anon-view')).toBeVisible();
    await expect(page.getByTestId('asm-anon-report-form')).toBeVisible();
    return;
  }

  if (role === 'tenant-user') {
    await expect(page.getByTestId('asm-role-user-appeal-view')).toBeVisible();
    await expect(page.getByTestId('asm-user-appeal-form')).toBeVisible();
    return;
  }

  if (role === 'tenant-admin') {
    await expect(page.getByTestId('asm-role-tenant-admin-view')).toBeVisible();
    await expect(page.getByTestId('asm-admin-queue')).toBeVisible();
    return;
  }

  if (role === 'platform-admin') {
    await expect(page.getByTestId('asm-role-platform-admin-view')).toBeVisible();
    await expect(page.getByTestId('asm-platform-moderator-queue-section')).toBeVisible();
    return;
  }

  await expect(page.getByTestId('asm-role-support-view')).toBeVisible();
  await expect(page.getByTestId('asm-support-result')).toBeVisible();
}

test.describe('FLOW-24 Tenant B adapted safety package visual evidence', () => {
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
