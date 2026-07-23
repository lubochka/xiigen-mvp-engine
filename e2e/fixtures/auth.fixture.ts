/**
 * auth.fixture.ts — Playwright auth fixture for XIIGen.
 *
 * WF-8 applied: The client has NO login page (no /login route).
 * Auth is handled via X-Tenant-Id header on every API request.
 * Browser tests set tenantId via:
 *   1. The tenant-input field on GenerationLab page
 *   2. Storage state carrying the tenant context
 *
 * This fixture creates isolated browser contexts per tenant,
 * sets up the tenant-id cookie/localStorage, and navigates
 * to the Generation Lab page ready for testing.
 */

import { test as base, Page, BrowserContext } from '@playwright/test';

export const TENANT_A = 'e2e-tenant-A';
export const TENANT_B = 'e2e-tenant-B';

export type AuthFixtures = {
  /** Page logged in as tenant-A, on the Generation Lab. */
  tenantAPage: Page;
  /** Page logged in as tenant-B, on the Generation Lab. */
  tenantBPage: Page;
  /** Context for tenant-A (for multi-page tests). */
  tenantAContext: BrowserContext;
  /** Context for tenant-B (for multi-page tests). */
  tenantBContext: BrowserContext;
};

export const test = base.extend<AuthFixtures>({
  tenantAPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setupTenantPage(page, TENANT_A);
    await use(page);
    await context.close();
  },

  tenantBPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setupTenantPage(page, TENANT_B);
    await use(page);
    await context.close();
  },

  tenantAContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },

  tenantBContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';

/**
 * Navigate to the Generation Lab page and set the tenant-id input.
 * Since there's no login page, tenant context is established via the
 * tenant-input field (which controls the X-Tenant-Id header on API calls).
 */
async function setupTenantPage(page: Page, tenantId: string): Promise<void> {
  await page.goto('/generation-lab');
  await page.waitForSelector('[data-testid="page-generationlab"]', { timeout: 10_000 });

  // Set the tenant-id via the tenant-input field
  const tenantInput = page.locator('[data-testid="tenant-input"]');
  await tenantInput.clear();
  await tenantInput.fill(tenantId);

  // Store tenantId in localStorage for cross-navigation persistence
  await page.evaluate((id) => {
    localStorage.setItem('e2e-tenant-id', id);
  }, tenantId);
}

/**
 * Navigate page to a route with the tenant set in localStorage.
 */
export async function navigateWithTenant(page: Page, route: string, tenantId: string): Promise<void> {
  await page.goto(route);
  await page.evaluate((id) => {
    localStorage.setItem('e2e-tenant-id', id);
  }, tenantId);
}
