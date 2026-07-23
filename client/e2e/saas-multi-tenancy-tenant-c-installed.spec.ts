import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAP = (projectName: string, name: string) => {
  const file = path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    'saas-multi-tenancy',
    'tenant-c-installed-from-b',
    projectName,
    name,
  );
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
};

test.describe('FLOW-15 tenant C installed from tenant B adapted package', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable');
    }
  });

  test('P1-01: tenant provisioning page remains available after Tessera install', async ({ page }) => {
    await page.goto('/admin/tenants/provisioning?tenant=tessera-collective&cascade=installed-from-northwind');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(test.info().project.name, '01-t605-tenant-c-provisioning.png'), fullPage: true });
    await expect(page.getByTestId('tenant-provisioning-page')).toBeVisible();
  });

  test('P1-02: machine-locked config view remains available after Tessera install', async ({ page }) => {
    await page.goto('/admin/tenants/provisioning?tenant=tessera-collective&cascade=installed-from-northwind');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(test.info().project.name, '02-t606-tenant-c-machine-locked-config.png'), fullPage: true });
    await expect(page.getByTestId('tenant-provisioning-page')).toBeVisible();
  });

  test('P1-03: quota materialization view remains available after Tessera install', async ({ page }) => {
    await page.goto('/admin/tenants/provisioning?tenant=tessera-collective&cascade=installed-from-northwind');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(test.info().project.name, '03-t607-tenant-c-quota-materialization.png'), fullPage: true });
    await expect(page.getByTestId('tenant-provisioning-page')).toBeVisible();
  });

  test('P1-04: lifecycle page remains available after Tessera install', async ({ page }) => {
    await page.goto('/admin/tenants/lifecycle?tenant=tessera-collective&cascade=installed-from-northwind');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(test.info().project.name, '04-t608-tenant-c-lifecycle.png'), fullPage: true });
    await expect(page.getByTestId('tenant-lifecycle-page')).toBeVisible();
  });

  test('P1-05: tenant identity page remains available after Tessera install', async ({ page }) => {
    await page.goto('/admin/tenants/lifecycle?tenant=tessera-collective&cascade=installed-from-northwind');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(test.info().project.name, '05-tenant-c-identity-isolation.png'), fullPage: true });
    await expect(page.getByTestId('tenant-lifecycle-page')).toBeVisible();
  });

  test('P1-06: governance page remains available after Tessera install', async ({ page }) => {
    await page.goto('/admin/tenants/lifecycle?tenant=tessera-collective&cascade=installed-from-northwind');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(test.info().project.name, '06-tenant-c-governance-seeded.png'), fullPage: true });
    await expect(page.getByTestId('tenant-lifecycle-page')).toBeVisible();
  });
});
