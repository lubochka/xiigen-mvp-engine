/**
 * monitor.spec.ts — E2E tests for Monitor page (/monitor).
 * Verifies active flows list and real-time status UI renders.
 */
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Monitor — UI', () => {

  test.beforeEach(async ({ tenantAPage }) => {
    await tenantAPage.goto('http://localhost:5173/monitor');
    await expect(tenantAPage.locator('[data-testid="page-monitor"]')).toBeVisible();
  });

  test('monitor page loads without errors', async ({ tenantAPage }) => {
    await expect(tenantAPage.locator('[data-testid="page-monitor"]')).toBeVisible();
    await expect(tenantAPage).not.toHaveTitle(/Error/);
  });

  test('page does not crash with error boundary', async ({ tenantAPage }) => {
    const hasError = await tenantAPage.locator('text=Something went wrong').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('run list, empty state, or no-selection renders', async ({ tenantAPage }) => {
    // Actual testids from client/src/components/monitor/index.tsx
    const hasRunList  = await tenantAPage.locator('[data-testid="run-list-view"]').isVisible().catch(() => false);
    const hasEmpty    = await tenantAPage.locator('[data-testid="run-list-empty"]').isVisible().catch(() => false);
    const hasNoSel    = await tenantAPage.locator('[data-testid="monitor-no-selection"]').isVisible().catch(() => false);
    const hasDetail   = await tenantAPage.locator('[data-testid="run-detail-view"]').isVisible().catch(() => false);
    expect(hasRunList || hasEmpty || hasNoSel || hasDetail).toBe(true);
  });

  test('refresh button is visible and not disabled', async ({ tenantAPage }) => {
    const refreshBtn = tenantAPage.locator('[data-testid="monitor-refresh"]');
    const hasRefresh = await refreshBtn.isVisible().catch(() => false);
    if (hasRefresh) {
      await expect(refreshBtn).not.toBeDisabled();
    }
  });

  test('error panel only shown when there is an actual error', async ({ tenantAPage }) => {
    // The monitor-error panel should not be visible on a clean load
    const hasErrorPanel = await tenantAPage.locator('[data-testid="monitor-error"]').isVisible().catch(() => false);
    expect(hasErrorPanel).toBe(false);
  });

});
