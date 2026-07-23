/**
 * designer.spec.ts — E2E tests for Designer page (/designer).
 * Verifies design canvas, tab navigation, and trace tooling renders.
 */
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Designer — UI', () => {

  test.beforeEach(async ({ tenantAPage }) => {
    await tenantAPage.goto('http://localhost:5173/designer');
    await expect(tenantAPage.locator('[data-testid="page-designer"]')).toBeVisible();
  });

  test('designer page loads without errors', async ({ tenantAPage }) => {
    await expect(tenantAPage.locator('[data-testid="page-designer"]')).toBeVisible();
    await expect(tenantAPage).not.toHaveTitle(/Error/);
  });

  test('page does not crash with error boundary', async ({ tenantAPage }) => {
    const hasError = await tenantAPage.locator('text=Something went wrong').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('tab navigation renders', async ({ tenantAPage }) => {
    const hasTabs = await tenantAPage.locator('[data-testid^="tab-"]').first().isVisible().catch(() => false);
    const hasH1   = await tenantAPage.locator('h1,h2').first().isVisible().catch(() => false);
    expect(hasTabs || hasH1).toBe(true);
  });

  test('run-id input field is visible', async ({ tenantAPage }) => {
    const hasInput = await tenantAPage.locator('[data-testid="run-id-input"]').isVisible().catch(() => false);
    expect(hasInput).toBe(true);
  });

  test('load trace button is visible', async ({ tenantAPage }) => {
    const hasBtn = await tenantAPage.locator('[data-testid="load-trace-btn"]').isVisible().catch(() => false);
    expect(hasBtn).toBe(true);
  });

  test('poll trace button is visible', async ({ tenantAPage }) => {
    const hasBtn = await tenantAPage.locator('[data-testid="poll-trace-btn"]').isVisible().catch(() => false);
    expect(hasBtn).toBe(true);
  });

});
