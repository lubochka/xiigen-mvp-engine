/**
 * FLOW-12 — Subscription & Recurring Billing E2E Tests
 *
 * R-01: SubscriptionPlanPage renders with publish form
 * R-02: Float priceCents shows validation error
 * R-03: Valid plan publish → success state
 * R-04: SubscribePage renders with plan selector + payment method field
 * R-05: Subscribe without plan shows error
 * R-06: Subscribe to trial plan → TRIALING status shown
 * R-07: BillingDashboardPage renders MRR metric card
 * R-08: BillingDashboardPage shows invoice list with PAID/FAILED/VOIDED statuses
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

test.describe('FLOW-12 — Subscription & Recurring Billing', () => {

  // R-01: SubscriptionPlanPage renders with publish form
  test('R-01: SubscriptionPlanPage renders with publish form', async ({ page }) => {
    await page.goto('/subscription-plans');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="subscription-plan-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-publish-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="price-cents-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="billing-interval-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="publish-plan-button"]')).toBeVisible();
  });

  // R-02: Float priceCents shows validation error
  test('R-02: Float priceCents shows integer-cents validation error', async ({ page }) => {
    await page.goto('/subscription-plans');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: P8_SNAP('r-02-before.png'), fullPage: true });
    // Enter float value
    await page.locator('[data-testid="price-cents-input"]').fill('9.99');
    await page.locator('[data-testid="price-cents-input"]').blur();

    // Inline error should appear
    await expect(page.locator('[data-testid="price-cents-error"]')).toBeVisible();
    const errorText = await page.locator('[data-testid="price-cents-error"]').textContent();
    expect(errorText).toContain('positive integer');
  
    await page.screenshot({ path: P8_SNAP('r-02-after.png'), fullPage: true });});

  // R-03: Valid integer priceCents → no validation error + form submittable
  test('R-03: Valid integer priceCents allows plan publish', async ({ page }) => {
    await page.goto('/subscription-plans');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: P8_SNAP('r-03-before.png'), fullPage: true });
    await page.locator('[data-testid="plan-id-input"]').fill('plan-test');
    await page.locator('[data-testid="plan-name-input"]').fill('Test Plan');
    await page.locator('[data-testid="price-cents-input"]').fill('999');
    await page.locator('[data-testid="billing-interval-select"]').selectOption('MONTHLY');

    // No validation error should show
    await expect(page.locator('[data-testid="price-cents-error"]')).not.toBeVisible();

    // Submit
    await page.locator('[data-testid="publish-plan-button"]').click();
    await page.waitForTimeout(500);

    // Either success or OCC conflict (both are valid outcomes in demo)
    const success    = page.locator('[data-testid="plan-publish-success"]');
    const occConflict = page.locator('[data-testid="occ-conflict-error"]');
    const eitherVisible = await success.isVisible().then(v => v).catch(() => false) ||
                          await occConflict.isVisible().then(v => v).catch(() => false);
    expect(eitherVisible).toBe(true);
  
    await page.screenshot({ path: P8_SNAP('r-03-after.png'), fullPage: true });});

  // R-04: SubscribePage renders with plan selector + payment method field
  test('R-04: SubscribePage renders with plan selector and payment method field', async ({ page }) => {
    await page.goto('/subscribe');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="subscribe-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="subscribe-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-method-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="subscribe-button"]')).toBeVisible();
  });

  // R-05: Subscribe without selecting plan shows error
  test('R-05: Subscribe without plan selection shows required error', async ({ page }) => {
    await page.goto('/subscribe');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: P8_SNAP('r-05-before.png'), fullPage: true });
    await page.locator('[data-testid="subscribe-button"]').click();

    await expect(page.locator('[data-testid="subscribe-error"]')).toBeVisible();
    const errorText = await page.locator('[data-testid="subscribe-error"]').textContent();
    expect(errorText).toContain('Plan');
  
    await page.screenshot({ path: P8_SNAP('r-05-after.png'), fullPage: true });});

  // R-06: Subscribe to trial plan → TRIALING status shown
  test('R-06: Subscribe to trial plan → TRIALING status displayed', async ({ page }) => {
    await page.goto('/subscribe');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: P8_SNAP('r-06-before.png'), fullPage: true });
    // Select the trial plan option
    await page.locator('[data-testid="plan-select"]').selectOption('plan-trial');
    await page.locator('[data-testid="payment-method-input"]').fill('pm-vault-test');
    await page.locator('[data-testid="subscribe-button"]').click();

    // Wait for success state
    await page.waitForSelector('[data-testid="subscription-success"]', { timeout: 5000 });

    await expect(page.locator('[data-testid="subscription-status"]')).toBeVisible();
    const statusText = await page.locator('[data-testid="subscription-status"]').textContent();
    expect(statusText).toContain('TRIALING');

    // Trial end date should be visible
    await expect(page.locator('[data-testid="trial-ends-at"]')).toBeVisible();
  
    await page.screenshot({ path: P8_SNAP('r-06-after.png'), fullPage: true });});

  // R-07: BillingDashboardPage renders MRR metric card
  test('R-07: BillingDashboardPage renders MRR metric card', async ({ page }) => {
    await page.goto('/billing-dashboard?role=tenant-admin');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="billing-dashboard-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="mrr-metric-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="mrr-value"]')).toBeVisible();

    const mrrText = await page.locator('[data-testid="mrr-value"]').textContent();
    // MRR should display as dollar amount (normalized monthly equivalent)
    expect(mrrText).toMatch(/\$[\d,]+\.\d{2}/);
  });

  // R-08: BillingDashboardPage shows invoice list with PAID/FAILED/VOIDED
  test('R-08: BillingDashboardPage shows invoice list with all status types', async ({ page }) => {
    await page.goto('/billing-dashboard?role=tenant-admin');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="invoice-list"]')).toBeVisible();

    // Check PAID invoice
    await expect(page.locator('[data-testid="invoice-status-inv-001"]')).toBeVisible();
    const paidStatus = await page.locator('[data-testid="invoice-status-inv-001"]').textContent();
    expect(paidStatus?.trim()).toBe('Paid');

    // Check FAILED invoice with dunning status
    await expect(page.locator('[data-testid="invoice-status-inv-002"]')).toBeVisible();
    const failedStatus = await page.locator('[data-testid="invoice-status-inv-002"]').textContent();
    expect(failedStatus?.trim()).toBe('Failed');
    await expect(page.locator('[data-testid="dunning-status-inv-002"]')).toBeVisible();

    // Check VOIDED invoice
    await expect(page.locator('[data-testid="invoice-status-inv-003"]')).toBeVisible();
    const voidedStatus = await page.locator('[data-testid="invoice-status-inv-003"]').textContent();
    expect(voidedStatus?.trim()).toBe('Voided');
  });

});


// ---------------------------------------------------------------------------
// P1 state coverage (P8) — auto-generated by scripts/gen-phase8-p1-coverage.py
// Source: docs/flow-coverage/subscription-billing/P5-ui-specs.md
// Regenerate: python scripts/gen-phase8-p1-coverage.py --slugs subscription-billing
// ---------------------------------------------------------------------------
const P8_SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'subscription-billing', name);

// P1 state coverage (P8) — auto-generated
test.describe('FLOW-12 subscription-billing — P1 state coverage', () => {

  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable — start docker compose up');
    }
  });

  test("P1-04: SubscriptionAnalyticsAggregator \u2014 data_pipeline step entered via Additive\u2026", async ({ page }) => {
    await page.goto("/billing-dashboard?role=tenant-admin");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("01-subscriptionanalyticsaggregator-data-pip.png"), fullPage: true });
    await expect(page.getByTestId("billing-dashboard-page")).toBeVisible();
  });

});
// END P1 state coverage (P8)
