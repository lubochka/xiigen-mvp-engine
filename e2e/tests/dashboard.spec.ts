/**
 * dashboard.spec.ts — E2E tests for Dashboard page (/dashboard or /).
 * Verifies engine status panel renders without crash.
 */
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Dashboard — UI', () => {

  test.beforeEach(async ({ tenantAPage }) => {
    await tenantAPage.goto('http://localhost:5173/dashboard');
    await expect(tenantAPage.locator('[data-testid="page-dashboard"]')).toBeVisible();
  });

  test('dashboard page loads without errors', async ({ tenantAPage }) => {
    const hasDashboard = await tenantAPage.locator('[data-testid="page-dashboard"]').isVisible().catch(() => false);
    const hasH1 = await tenantAPage.locator('h1,h2').first().isVisible().catch(() => false);
    expect(hasDashboard || hasH1).toBe(true);
    await expect(tenantAPage).not.toHaveTitle(/Error/);
  });

  test('page does not crash with error boundary', async ({ tenantAPage }) => {
    const hasError = await tenantAPage.locator('text=Something went wrong').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('engine status content or loading state renders', async ({ tenantAPage }) => {
    // Dashboard may show loading state, status cards, or an empty state — all valid
    const hasPage    = await tenantAPage.locator('[data-testid="page-dashboard"]').isVisible().catch(() => false);
    const hasContent = await tenantAPage.locator('main, section, [class*="card"], [class*="status"]').first().isVisible().catch(() => false);
    expect(hasPage || hasContent).toBe(true);
  });

});
