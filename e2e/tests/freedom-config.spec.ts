/**
 * freedom-config.spec.ts — Browser E2E tests for FREEDOM Config UI.
 *
 * WF-14 SCOPE ADJUSTMENT: No dedicated admin panel route exists in the client.
 * FREEDOM config is exposed via /ledger (LedgerPage) which has two tabs:
 *   - "FREEDOM Config" tab: config section editor with search, save, reset
 *   - "Audit Trail" tab: ledger entries with category filter
 *
 * Tests validate the LedgerPage UI interactions — not the actual config values,
 * which are tenant-specific and loaded from the server at runtime.
 *
 * Phase 13 — Commit 17
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('FREEDOM Config — UI (LedgerPage)', () => {

  test.describe('Ledger page navigation', () => {
    test('sidebar nav link to ledger is visible', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="nav-ledger"]')).toBeVisible();
    });

    test('ledger page loads after clicking nav link', async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="nav-ledger"]').click();
      await expect(tenantAPage.locator('[data-testid="page-ledger"]')).toBeVisible();
    });

    test('no error boundary triggered on ledger page load', async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="nav-ledger"]').click();
      await expect(tenantAPage.locator('[data-testid="page-ledger"]')).toBeVisible();
      await expect(tenantAPage.locator('[data-testid="error-boundary"]')).not.toBeVisible();
    });
  });

  test.describe('Config tab', () => {
    test.beforeEach(async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="nav-ledger"]').click();
      await expect(tenantAPage.locator('[data-testid="page-ledger"]')).toBeVisible();
      // Ensure config tab is selected (it's default)
      await tenantAPage.locator('[data-testid="tab-config"]').click();
      await tenantAPage.waitForTimeout(1_000); // allow async load
    });

    test('FREEDOM Config tab button is visible', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="tab-config"]')).toBeVisible();
    });

    test('config tab shows toolbar or empty state (not a blank crash)', async ({ tenantAPage }) => {
      const hasToolbar = await tenantAPage.locator('[data-testid="config-toolbar"]').isVisible();
      const hasEmpty = await tenantAPage.locator('[data-testid="config-empty"]').isVisible();
      const hasLoadingSpinner = await tenantAPage.locator('[data-testid="loading-state"]').isVisible();
      expect(hasToolbar || hasEmpty || hasLoadingSpinner).toBeTruthy();
    });

    test('config search input is functional when toolbar is present', async ({ tenantAPage }) => {
      const toolbar = tenantAPage.locator('[data-testid="config-toolbar"]');
      if (!await toolbar.isVisible()) {
        test.skip(); // no config loaded — empty state
        return;
      }
      const searchInput = tenantAPage.locator('[data-testid="config-search"]');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('batch_size');
      await tenantAPage.waitForTimeout(300);
      // Clear search — no crash
      await searchInput.fill('');
    });

    test('save button visible in config toolbar', async ({ tenantAPage }) => {
      if (!await tenantAPage.locator('[data-testid="config-toolbar"]').isVisible()) {
        test.skip();
        return;
      }
      await expect(tenantAPage.locator('[data-testid="config-save"]')).toBeVisible();
    });

    test('reset button visible in config toolbar', async ({ tenantAPage }) => {
      if (!await tenantAPage.locator('[data-testid="config-toolbar"]').isVisible()) {
        test.skip();
        return;
      }
      await expect(tenantAPage.locator('[data-testid="config-reset"]')).toBeVisible();
    });
  });

  test.describe('Audit Trail tab', () => {
    test.beforeEach(async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="nav-ledger"]').click();
      await expect(tenantAPage.locator('[data-testid="page-ledger"]')).toBeVisible();
      await tenantAPage.locator('[data-testid="tab-audit"]').click();
      await tenantAPage.waitForTimeout(1_000);
    });

    test('audit trail tab button is visible and clickable', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="tab-audit"]')).toBeVisible();
    });

    test('audit tab shows entries or empty state (not a crash)', async ({ tenantAPage }) => {
      const hasEntries = (await tenantAPage.locator('[data-testid^="ledger-entry-"]').count()) > 0;
      const hasEmpty = await tenantAPage.locator('[data-testid="ledger-empty"]').isVisible();
      const hasLoadingSpinner = await tenantAPage.locator('[data-testid="loading-state"]').isVisible();
      expect(hasEntries || hasEmpty || hasLoadingSpinner).toBeTruthy();
    });

    test('ledger filter bar renders in audit tab', async ({ tenantAPage }) => {
      const hasFilterBar = await tenantAPage.locator('[data-testid="ledger-filter-bar"]').isVisible();
      const hasEmpty = await tenantAPage.locator('[data-testid="ledger-empty"]').isVisible();
      expect(hasFilterBar || hasEmpty).toBeTruthy();
    });
  });

  test.describe('Tab switching', () => {
    test.beforeEach(async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="nav-ledger"]').click();
      await expect(tenantAPage.locator('[data-testid="page-ledger"]')).toBeVisible();
    });

    test('switching from config to audit tab works without error', async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="tab-config"]').click();
      await tenantAPage.locator('[data-testid="tab-audit"]').click();
      await expect(tenantAPage.locator('[data-testid="error-boundary"]')).not.toBeVisible();
    });

    test('switching back to config tab after audit tab works', async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="tab-audit"]').click();
      await tenantAPage.locator('[data-testid="tab-config"]').click();
      // Config tab content should render again
      await tenantAPage.waitForTimeout(500);
      const hasToolbar = await tenantAPage.locator('[data-testid="config-toolbar"]').isVisible();
      const hasEmpty = await tenantAPage.locator('[data-testid="config-empty"]').isVisible();
      const hasLoadingSpinner = await tenantAPage.locator('[data-testid="loading-state"]').isVisible();
      expect(hasToolbar || hasEmpty || hasLoadingSpinner).toBeTruthy();
    });
  });

  test.describe('Per-tenant ledger access', () => {
    test('tenant-A can access ledger page', async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="nav-ledger"]').click();
      await expect(tenantAPage.locator('[data-testid="page-ledger"]')).toBeVisible();
    });

    test('tenant-B can access ledger page independently', async ({ tenantBPage }) => {
      await tenantBPage.locator('[data-testid="nav-ledger"]').click();
      await expect(tenantBPage.locator('[data-testid="page-ledger"]')).toBeVisible();
    });
  });
});
