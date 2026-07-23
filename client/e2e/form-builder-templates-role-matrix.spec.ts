import { expect, test, type Page } from '@playwright/test';
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

const SNAP = (name: string) =>
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    'form-builder-templates',
    'role-matrix',
    name,
  );

const ROLES: Flow23Role[] = [
  'tenant-admin',
  'platform-admin',
  'tenant-user',
  'freelancer',
  'business-partner',
  'platform-support',
];

async function openRole(page: Page, role: Flow23Role) {
  await page.goto(`/form-templates?role=${role}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const pageRoot = page.getByTestId('page-templatebuilder.tsx');
  await expect(pageRoot).toBeVisible({ timeout: 60_000 });
  await expect(pageRoot).toHaveAttribute('data-viewer-role', role);
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
}

test.describe('FLOW-23 form-builder-templates role matrix', () => {
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
    test(`${role} renders the expected template surface`, async ({ page }) => {
      await openRole(page, role);

      if (role === 'tenant-admin' || role === 'platform-admin') {
        await expect(page.getByRole('button', { name: 'Validate template' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Publish version' })).toBeVisible();
      } else {
        await expect(page.getByTestId('fbt-consumer-catalog')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Validate template' })).toHaveCount(0);
      }

      await page.screenshot({ path: SNAP(`${role}-primary.png`), fullPage: true });
    });
  }
});
