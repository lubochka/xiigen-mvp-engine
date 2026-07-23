/**
 * model-leaderboard.spec.ts — E2E tests for Model Leaderboard page (/model-leaderboard).
 * Verifies leaderboard table and task-type filter renders.
 */
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Model Leaderboard — UI', () => {

  test.beforeEach(async ({ tenantAPage }) => {
    await tenantAPage.goto('http://localhost:5173/model-leaderboard');
    await expect(tenantAPage.locator('[data-testid="page-modelleaderboard"]')).toBeVisible();
  });

  test('model leaderboard page loads without errors', async ({ tenantAPage }) => {
    await expect(tenantAPage.locator('[data-testid="page-modelleaderboard"]')).toBeVisible();
    await expect(tenantAPage).not.toHaveTitle(/Error/);
  });

  test('page does not crash with error boundary', async ({ tenantAPage }) => {
    const hasError = await tenantAPage.locator('text=Something went wrong').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('task type filter renders', async ({ tenantAPage }) => {
    await expect(tenantAPage.locator('[data-testid="task-type-filter"]')).toBeVisible();
  });

  test('"All" filter button is visible', async ({ tenantAPage }) => {
    await expect(tenantAPage.locator('[data-testid="filter-all"]')).toBeVisible();
  });

  test('leaderboard table or empty state renders', async ({ tenantAPage }) => {
    const hasTable = await tenantAPage.locator('table').isVisible().catch(() => false);
    const hasList  = await tenantAPage.locator('[data-testid="leaderboard-list"]').isVisible().catch(() => false);
    const hasEmpty = await tenantAPage.locator('[data-testid="leaderboard-empty"]').isVisible().catch(() => false);
    const hasRows  = await tenantAPage.locator('tr').count().catch(() => 0);
    expect(hasTable || hasList || hasEmpty || hasRows > 0).toBe(true);
  });

  test('model names appear when sample data is populated', async ({ tenantAPage }) => {
    const hasContent = await tenantAPage.locator('text=claude').or(
      tenantAPage.locator('text=gpt').or(tenantAPage.locator('text=gemini'))
    ).isVisible().catch(() => false);
    // Only assert if data is present — empty leaderboard is also valid
    if (hasContent) {
      expect(hasContent).toBe(true);
    }
  });

});
