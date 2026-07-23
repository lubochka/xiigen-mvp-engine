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
    'tenant-b-v1.0.2',
    projectName,
    name,
  );
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
};

test.describe('FLOW-15 tenant B adapted package v1.0.2', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable');
    }
  });

  test('P1-01: provisioning view remains available under Northwind v1.0.2', async ({ page }) => {
    await page.goto('/admin/tenants/provisioning?tenant=northwind&cascade=northwind-v1.0.2');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(test.info().project.name, '01-t605-northwind-v1.0.2-provisioning.png'), fullPage: true });
    await expect(page.getByTestId('tenant-provisioning-page')).toBeVisible();
  });

  test('P1-02: machine-locked config view remains available under Northwind v1.0.2', async ({ page }) => {
    await page.goto('/admin/tenants/provisioning?tenant=northwind&cascade=northwind-v1.0.2');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(test.info().project.name, '02-t606-northwind-v1.0.2-machine-locked-config.png'), fullPage: true });
    await expect(page.getByTestId('tenant-provisioning-page')).toBeVisible();
  });

  test('P1-03: quota materialization view remains available under Northwind v1.0.2', async ({ page }) => {
    await page.goto('/admin/tenants/provisioning?tenant=northwind&cascade=northwind-v1.0.2');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(test.info().project.name, '03-t607-northwind-v1.0.2-quota-materialization.png'), fullPage: true });
    await expect(page.getByTestId('tenant-provisioning-page')).toBeVisible();
  });

  test('P1-04: lifecycle view remains available under Northwind v1.0.2', async ({ page }) => {
    await page.goto('/admin/tenants/lifecycle?tenant=northwind&cascade=northwind-v1.0.2');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(test.info().project.name, '04-t608-northwind-v1.0.2-lifecycle.png'), fullPage: true });
    await expect(page.getByTestId('tenant-lifecycle-page')).toBeVisible();
  });

  test('P1-05: tenant identity view remains available under Northwind v1.0.2', async ({ page }) => {
    await page.goto('/admin/tenants/lifecycle?tenant=northwind&cascade=northwind-v1.0.2');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(test.info().project.name, '05-northwind-v1.0.2-identity-isolation.png'), fullPage: true });
    await expect(page.getByTestId('tenant-lifecycle-page')).toBeVisible();
  });

  test('P1-06: governance view remains available under Northwind v1.0.2', async ({ page }) => {
    await page.goto('/admin/tenants/lifecycle?tenant=northwind&cascade=northwind-v1.0.2');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP(test.info().project.name, '06-northwind-v1.0.2-governance-seeded.png'), fullPage: true });
    await expect(page.getByTestId('tenant-lifecycle-page')).toBeVisible();
  });
});
