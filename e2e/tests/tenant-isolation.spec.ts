/**
 * tenant-isolation.spec.ts — Browser E2E tests for multi-tenant UI isolation.
 *
 * Proves that tenant-A and tenant-B have fully isolated browser sessions:
 * - Separate BrowserContext objects (no shared localStorage or cookies)
 * - Different X-Tenant-Id headers on API calls (via tenant-input field)
 * - Each tenant's generation results are independent
 * - State changes in one tenant do not affect the other
 *
 * WF-8 applied: No login page — auth is via tenant-input field which populates
 * X-Tenant-Id header on all API requests from the React client.
 *
 * Phase 12 — Commit 16
 */

import { test, expect, TENANT_A, TENANT_B } from '../fixtures/auth.fixture';

test.describe('Multi-Tenant UI Isolation', () => {

  test.describe('Tenant-A session', () => {
    test('tenant-A page loads on generation lab', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="page-generationlab"]')).toBeVisible();
    });

    test('tenant-A input shows correct tenant ID', async ({ tenantAPage }) => {
      const value = await tenantAPage.locator('[data-testid="tenant-input"]').inputValue();
      expect(value).toBe(TENANT_A);
    });

    test('tenant-A can trigger generation without spec errors', async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="spec-load-sample"]').click();
      await tenantAPage.locator('[data-testid="generate-button"]').click();
      await expect(tenantAPage.locator('[data-testid="generate-button"]')).not.toBeDisabled({ timeout: 30_000 });
      // No spec parse error
      await expect(tenantAPage.locator('[data-testid="spec-error"]')).not.toBeVisible();
    });
  });

  test.describe('Tenant-B session (separate browser context)', () => {
    test('tenant-B page loads on generation lab', async ({ tenantBPage }) => {
      await expect(tenantBPage.locator('[data-testid="page-generationlab"]')).toBeVisible();
    });

    test('tenant-B input shows correct tenant ID', async ({ tenantBPage }) => {
      const value = await tenantBPage.locator('[data-testid="tenant-input"]').inputValue();
      expect(value).toBe(TENANT_B);
    });

    test('tenant-B can trigger generation without spec errors', async ({ tenantBPage }) => {
      await tenantBPage.locator('[data-testid="spec-load-sample"]').click();
      await tenantBPage.locator('[data-testid="generate-button"]').click();
      await expect(tenantBPage.locator('[data-testid="generate-button"]')).not.toBeDisabled({ timeout: 30_000 });
      await expect(tenantBPage.locator('[data-testid="spec-error"]')).not.toBeVisible();
    });
  });

  test.describe('Cross-tenant isolation proofs', () => {
    test('tenant-A and tenant-B have different tenant IDs in the input', async ({ tenantAPage, tenantBPage }) => {
      const valueA = await tenantAPage.locator('[data-testid="tenant-input"]').inputValue();
      const valueB = await tenantBPage.locator('[data-testid="tenant-input"]').inputValue();
      expect(valueA).toBe(TENANT_A);
      expect(valueB).toBe(TENANT_B);
      expect(valueA).not.toBe(valueB);
    });

    test('tenant-A localStorage does not leak to tenant-B context', async ({ tenantAPage, tenantBPage }) => {
      // Write a value in tenant-A's browser context
      await tenantAPage.evaluate(() => localStorage.setItem('isolation-probe', 'tenant-A-value'));
      // Tenant-B is a separate BrowserContext — should not see this key
      const tenantBValue = await tenantBPage.evaluate(() => localStorage.getItem('isolation-probe'));
      expect(tenantBValue).toBeNull();
    });

    test('tenant-B generation result does not appear in tenant-A view', async ({ tenantAPage, tenantBPage }) => {
      // Tenant-B generates
      await tenantBPage.locator('[data-testid="spec-load-sample"]').click();
      await tenantBPage.locator('[data-testid="generate-button"]').click();
      await expect(tenantBPage.locator('[data-testid="generated-code-viewer"]')).toBeVisible({ timeout: 30_000 });

      // Tenant-A has not generated — should still show no-results
      await expect(tenantAPage.locator('[data-testid="lab-no-results"]')).toBeVisible();
      await expect(tenantAPage.locator('[data-testid="generated-code-viewer"]')).not.toBeVisible();
    });

    test('concurrent generations from both tenants complete independently', async ({ tenantAPage, tenantBPage }) => {
      // Load sample for both tenants
      await tenantAPage.locator('[data-testid="spec-load-sample"]').click();
      await tenantBPage.locator('[data-testid="spec-load-sample"]').click();

      // Trigger both simultaneously
      await Promise.all([
        tenantAPage.locator('[data-testid="generate-button"]').click(),
        tenantBPage.locator('[data-testid="generate-button"]').click(),
      ]);

      // Both should complete without errors
      await Promise.all([
        expect(tenantAPage.locator('[data-testid="generate-button"]')).not.toBeDisabled({ timeout: 60_000 }),
        expect(tenantBPage.locator('[data-testid="generate-button"]')).not.toBeDisabled({ timeout: 60_000 }),
      ]);

      await expect(tenantAPage.locator('[data-testid="spec-error"]')).not.toBeVisible();
      await expect(tenantBPage.locator('[data-testid="spec-error"]')).not.toBeVisible();
    });
  });

  test.describe('Session state isolation', () => {
    test('changing tenant-A tenant ID does not affect tenant-B', async ({ tenantAPage, tenantBPage }) => {
      // Modify tenant-A's tenant ID
      await tenantAPage.locator('[data-testid="tenant-input"]').fill('modified-tenant');
      // Tenant-B should be unaffected
      const tenantBValue = await tenantBPage.locator('[data-testid="tenant-input"]').inputValue();
      expect(tenantBValue).toBe(TENANT_B);
    });

    test('tenant-B spec change does not affect tenant-A spec', async ({ tenantAPage, tenantBPage }) => {
      // Replace tenant-B's spec with custom content
      await tenantBPage.locator('[data-testid="spec-textarea"]').fill('{"taskTypeId":"T99","test":"isolation-check"}');
      // Tenant-A spec should still have the default T44
      const tenantASpec = await tenantAPage.locator('[data-testid="spec-textarea"]').inputValue();
      expect(tenantASpec).toContain('T44');
      expect(tenantASpec).not.toContain('T99');
    });

    test('tenant-A spec error does not propagate to tenant-B', async ({ tenantAPage, tenantBPage }) => {
      // Cause spec error in tenant-A
      await tenantAPage.locator('[data-testid="spec-textarea"]').fill('{ bad json }');
      await tenantAPage.locator('[data-testid="generate-button"]').click();
      await expect(tenantAPage.locator('[data-testid="spec-error"]')).toBeVisible({ timeout: 3_000 });
      // Tenant-B should have no error
      await expect(tenantBPage.locator('[data-testid="spec-error"]')).not.toBeVisible();
    });

    test('navigation in tenant-A context does not affect tenant-B URL', async ({ tenantAPage, tenantBPage }) => {
      // Navigate tenant-A to the dashboard
      await tenantAPage.locator('[data-testid="nav-dashboard"]').click();
      await expect(tenantAPage).toHaveURL(/\/dashboard/);
      // Tenant-B should still be on generation-lab
      await expect(tenantBPage).toHaveURL(/\/generation-lab/);
    });
  });
});
