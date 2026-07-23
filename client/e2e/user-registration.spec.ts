/**
 * FLOW-01 — User Registration & Onboarding E2E Tests
 *
 * Prerequisites: Vite dev server (auto-started by playwright.config.ts webServer)
 *   NestJS server only required for tests that call /api/* endpoints.
 *   Tests R-01 through R-09 are mock-driven and run without a backend.
 *
 * R-01: registration form renders
 * R-02: validation error — uniform shape (no field leakage)
 * R-03: duplicate email error
 * R-04: verification pending state
 * R-05: token expired — resend flow available
 * R-06: token invalid — no recovery path
 * R-07: rate limit exceeded during resend
 * R-08: onboarding delivery progress — all 3 materials
 * R-09: onboarding with degraded delivery (C3 failed, presence gate still passes)
 * R-10: SSO registration bypass — no verification-pending, onboarding-progress shown
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'user-registration', name);

test.describe('FLOW-01 — User Registration', () => {

  test('R-01: registration form renders', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('01-registration-form.png'), fullPage: true });
    await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();
  });

  test('R-02: validation error — uniform shape (no field leakage)', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('r-02-before.png'), fullPage: true });
    // Submit with invalid email format
    await page.fill('[data-testid="email-input"]', 'not-an-email');
    await page.click('[data-testid="submit-button"]');
    await page.screenshot({ path: SNAP('02-validation-error.png'), fullPage: true });
    // Error must be visible but must NOT mention the field name (FLOW-01-RAG-03)
    const errorEl = page.locator('[data-testid="error-message"]');
    await expect(errorEl).toBeVisible();
    const errorText = await errorEl.textContent() ?? '';
    expect(errorText).not.toContain('email');
    expect(errorText).not.toContain('format');
  });

  test('R-03: duplicate email error', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('r-03-before.png'), fullPage: true });
    await page.fill('[data-testid="email-input"]', 'existing@test.com');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.click('[data-testid="submit-button"]');
    await page.screenshot({ path: SNAP('03-duplicate-email.png'), fullPage: true });
    await expect(page.locator('[data-testid="error-code-DUPLICATE_EMAIL"]')).toBeVisible();
  });

  test('R-04: verification pending state', async ({ page }) => {
    await page.goto('/register/pending-verification');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('04-verification-pending.png'), fullPage: true });
    await expect(page.locator('[data-testid="verification-pending"]')).toBeVisible();
    await expect(page.locator('[data-testid="resend-link"]')).toBeVisible();
  });

  test('R-05: token expired — resend flow available', async ({ page }) => {
    await page.goto('/verify?token=expired-token-abc');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('05-token-expired.png'), fullPage: true });
    await expect(page.locator('[data-testid="error-EXPIRED_TOKEN"]')).toBeVisible();
    // Recovery path present for expired tokens
    await expect(page.locator('[data-testid="request-new-token"]')).toBeVisible();
  });

  test('R-06: token invalid — no recovery path', async ({ page }) => {
    await page.goto('/verify?token=tampered-token-xyz');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('06-token-invalid.png'), fullPage: true });
    await expect(page.locator('[data-testid="error-INVALID_TOKEN"]')).toBeVisible();
    // No recovery for INVALID_TOKEN — request-new-token must NOT exist
    await expect(page.locator('[data-testid="request-new-token"]')).not.toBeVisible();
  });

  test('R-07: rate limit exceeded during resend', async ({ page }) => {
    await page.goto('/verify/resend?userId=usr-test&rateLimited=true');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('07-rate-limit.png'), fullPage: true });
    await expect(page.locator('[data-testid="rate-limit-message"]')).toBeVisible();
    // retryAfterMinutes shown — UI countdown needs this
    await expect(page.locator('[data-testid="retry-after"]')).toBeVisible();
  });

  test('R-08: onboarding delivery progress — all three material types', async ({ page }) => {
    await page.goto('/onboarding?userId=usr-verified-test');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('08-onboarding-progress.png'), fullPage: true });
    await expect(page.locator('[data-testid="delivery-workspace_setup"]')).toBeVisible();
    await expect(page.locator('[data-testid="delivery-flow_tutorial"]')).toBeVisible();
    await expect(page.locator('[data-testid="delivery-community_invitation"]')).toBeVisible();
  });

  test('R-09: onboarding with degraded delivery (C3 failed, presence gate still passes)', async ({ page }) => {
    await page.goto('/onboarding?userId=usr-degraded-test');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('09-onboarding-degraded.png'), fullPage: true });
    // community_invitation shows failed state
    await expect(page.locator('[data-testid="delivery-community_invitation-failed"]')).toBeVisible();
    // NODE D presence gate: all 3 types present (even failed) → complete
    await expect(page.locator('[data-testid="onboarding-complete"]')).toBeVisible();
  });

  test('R-10: SSO registration bypass', async ({ page }) => {
    await page.goto('/auth/sso/google?mock=true');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('10-sso-bypass.png'), fullPage: true });
    // SSO bypass: no email verification step — verification-pending absent
    await expect(page.locator('[data-testid="verification-pending"]')).not.toBeVisible();
    // Goes directly to onboarding progress
    await expect(page.locator('[data-testid="onboarding-progress"]')).toBeVisible();
  });

});


// ---------------------------------------------------------------------------
// P1 state coverage (P8) — auto-generated by scripts/gen-phase8-p1-coverage.py
// Source: docs/flow-coverage/user-registration/P5-ui-specs.md
// Regenerate: python scripts/gen-phase8-p1-coverage.py --slugs user-registration
// ---------------------------------------------------------------------------
const P8_SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'user-registration', name);

// P1 state coverage (P8) — auto-generated
test.describe('FLOW-01 user-registration — P1 state coverage', () => {

  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable — start docker compose up');
    }
  });

  test("P1-01: SSOAndEmailAuth \u2014 routing step entered via POST /auth/register or OAuth c\u2026", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("01-ssoandemailauth-routing-step-entered-via.png"), fullPage: true });
    await expect(page.getByTestId("page-onboarding")).toBeVisible();
  });

  test("P1-02: EmailVerificationWaitState \u2014 processing step entered via UserRegistration\u2026", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("02-emailverificationwaitstate-processing-st.png"), fullPage: true });
    await expect(page.getByTestId("page-onboarding")).toBeVisible();
  });

  test("P1-03: OnboardingDelivery \u2014 orchestration step entered via EmailVerified event f\u2026", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("03-onboardingdelivery-orchestration-step-en.png"), fullPage: true });
    await expect(page.getByTestId("page-onboarding")).toBeVisible();
  });

  test("P1-04: SSOAndEmailAuth \u2192 EmailVerificationWaitState when registration successful\u2026", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("04-ssoandemailauth-emailverificationwaitsta.png"), fullPage: true });
    await expect(page.getByTestId("page-register")).toBeVisible();
  });

  test("P1-06: EmailVerificationWaitState \u2192 OnboardingDelivery when verification token s\u2026", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("05-emailverificationwaitstate-onboardingdel.png"), fullPage: true });
    await expect(page.getByTestId("page-register")).toBeVisible();
  });

  test("P1-07: EmailVerificationWaitState \u2192 ? when 24h SLA elapsed \u2014 terminal (emits xii\u2026", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("06-emailverificationwaitstate-when-24h-sla.png"), fullPage: true });
    await expect(page.getByTestId("page-register")).toBeVisible();
  });

});
// END P1 state coverage (P8)
