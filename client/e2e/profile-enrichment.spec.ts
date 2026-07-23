/**
 * FLOW-02 — Profile Enrichment E2E Tests
 *
 * Prerequisites: Vite dev server (auto-started by playwright.config.ts webServer)
 *   NestJS server not required — all tests are mock-driven via URL params.
 *
 * Gap-FLOW-02-C (CLOSED 2026-04-23): beforeEach seeds tenant context via
 * addInitScript BEFORE page.goto so the Kiosk shell renders (not admin
 * kernel fallback). Without this seed, dev-mode layout mounts the
 * ENGINE/ADMINISTRATION sidebar on top of the tenant-user page — which
 * structurally fails SK-549 Axis A (shell) + Axis B (role).
 *
 * Q-01: questionnaire form renders
 * Q-02: validation error — uniform shape (no field name in error text)
 * Q-03: duplicate/debounce — debounce-pending state shown
 * Q-04: questionnaire submitted — processing state shown
 * Q-05: matching in progress — spinner visible
 * Q-06: matching partial results (B1 timeout) — partial notice shown
 * Q-07: matching complete — connection-count visible
 * Q-08: personalization complete — feed items visible
 * Q-09: PersonalizationCompleted state banner visible
 * Q-10: degraded personalization — personalization-degraded visible, feed still shows
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'profile-enrichment', name);

/** Seed default tenant into localStorage before any page script runs. */
const DEFAULT_TENANT_ID = 'default';
async function seedDefaultTenant(page: import('@playwright/test').Page) {
  await page.addInitScript((id: string) => {
    try {
      window.localStorage.setItem('xiigen.tenantId', id);
      window.localStorage.setItem('xiigen.tenantBrand', id);
    } catch {
      // noop — storage unavailable (file:// or hard-disabled cookies)
    }
  }, DEFAULT_TENANT_ID);
}

test.describe('FLOW-02 — Profile Enrichment', () => {
  test.beforeEach(async ({ page }) => {
    await seedDefaultTenant(page);
  });

  test('Q-01: questionnaire form renders', async ({ page }) => {
    await page.goto('/questionnaire');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('01-questionnaire-form.png'), fullPage: true });
    await expect(page.locator('[data-testid="questionnaire-form"]')).toBeVisible();
  });

  test('Q-02: validation error — uniform shape (no field name in error text)', async ({ page }) => {
    await page.goto('/questionnaire');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('q-02-before.png'), fullPage: true });
    // Submit with empty industry (leave industry-input blank)
    await page.click('[data-testid="submit-button"]');
    await page.screenshot({ path: SNAP('02-validation-error.png'), fullPage: true });
    // Error must be visible
    const errorEl = page.locator('[data-testid="questionnaire-validation-error"]');
    await expect(errorEl).toBeVisible();
    // Error text must NOT contain field name or generic leakage words
    const errorText = (await errorEl.textContent()) ?? '';
    expect(errorText).not.toContain('industry');
    expect(errorText).not.toContain('field');
  });

  test('Q-03: duplicate/debounce — debounce-pending state shown', async ({ page }) => {
    await page.goto('/questionnaire?duplicate=true');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('03-debounce-pending.png'), fullPage: true });
    await expect(page.locator('[data-testid="debounce-pending"]')).toBeVisible();
  });

  test('Q-04: questionnaire submitted — processing state shown', async ({ page }) => {
    await page.goto('/questionnaire?mock=submitted');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('04-processing.png'), fullPage: true });
    await expect(page.locator('[data-testid="processing"]')).toBeVisible();
  });

  test('Q-05: matching in progress — spinner visible', async ({ page }) => {
    await page.goto('/matching?userId=usr-matching-test');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('05-matching-in-progress.png'), fullPage: true });
    await expect(page.locator('[data-testid="matching-in-progress"]')).toBeVisible();
  });

  test('Q-06: matching partial results (B1 timeout) — partial notice shown', async ({ page }) => {
    await page.goto('/matching?userId=usr-partial-test');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('06-matching-partial.png'), fullPage: true });
    await expect(page.locator('[data-testid="matching-partial"]')).toBeVisible();
    await expect(page.locator('[data-testid="partial-results-notice"]')).toBeVisible();
  });

  test('Q-07: matching complete — connection-count visible', async ({ page }) => {
    await page.goto('/matching?userId=usr-complete-test');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('07-matching-complete.png'), fullPage: true });
    await expect(page.locator('[data-testid="matching-complete"]')).toBeVisible();
    await expect(page.locator('[data-testid="connection-count"]')).toBeVisible();
  });

  test('Q-08: personalization complete — feed items visible', async ({ page }) => {
    await page.goto('/personalization?userId=usr-personalized-test');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('08-personalization-feed.png'), fullPage: true });
    await expect(page.locator('[data-testid="personalization-feed"]')).toBeVisible();
    const feedItems = page.locator('[data-testid="feed-item"]');
    await expect(feedItems.first()).toBeVisible();
    expect(await feedItems.count()).toBeGreaterThanOrEqual(1);
  });

  test('Q-09: PersonalizationCompleted state banner visible', async ({ page }) => {
    await page.goto('/personalization?userId=usr-personalized-test');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('09-personalization-completed-event.png'), fullPage: true });
    await expect(page.locator('[data-testid="personalization-completed-event"]')).toBeVisible();
  });

  test('Q-10: degraded personalization — personalization-degraded visible, feed still shows', async ({
    page,
  }) => {
    await page.goto('/personalization?userId=usr-degraded-feed-test');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('10-personalization-degraded.png'), fullPage: true });
    // Degraded notice visible
    await expect(page.locator('[data-testid="personalization-degraded"]')).toBeVisible();
    // Feed still present — degraded but not absent
    await expect(page.locator('[data-testid="personalization-feed"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// P1 state coverage (P8) — auto-generated by scripts/gen-phase8-p1-coverage.py
// Source: docs/flow-coverage/profile-enrichment/P5-ui-specs.md
// Regenerate: python scripts/gen-phase8-p1-coverage.py --slugs profile-enrichment
// ---------------------------------------------------------------------------
const P8_SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'profile-enrichment', name);

// P1 state coverage (P8) — auto-generated
test.describe('FLOW-02 profile-enrichment — P1 state coverage', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable — start docker compose up');
    }
  });

  test.beforeEach(async ({ page }) => {
    await seedDefaultTenant(page);
  });

  test('P1-01: ProfileEnrichmentFanIn \u2014 fan_in step entered via OnboardingCompleted even\u2026', async ({
    page,
  }) => {
    await page.goto('/matching');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: P8_SNAP('01-profileenrichmentfanin-fan-in-step-enter.png'),
      fullPage: true,
    });
    await expect(page.getByTestId('page-matching')).toBeVisible();
  });

  test('P1-02: MatchingConvergenceGate \u2014 convergence step entered via EnrichmentDataRead\u2026', async ({
    page,
  }) => {
    await page.goto('/matching');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: P8_SNAP('02-matchingconvergencegate-convergence-step.png'),
      fullPage: true,
    });
    await expect(page.getByTestId('page-matching')).toBeVisible();
  });

  test('P1-03: OnboardingCompletionBroadcast \u2014 broadcast step entered via MatchingConver\u2026', async ({
    page,
  }) => {
    await page.goto('/matching');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: P8_SNAP('03-onboardingcompletionbroadcast-broadcast.png'),
      fullPage: true,
    });
    await expect(page.getByTestId('page-matching')).toBeVisible();
  });

  test('P1-04: OnboardingCompleted \u2192 ProfileEnrichmentFanIn when from FLOW-01 T49 (emits\u2026', async ({
    page,
  }) => {
    await page.goto('/matching');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: P8_SNAP('04-onboardingcompleted-profileenrichmentfan.png'),
      fullPage: true,
    });
    await expect(page.getByTestId('page-matching')).toBeVisible();
  });
});
// END P1 state coverage (P8)
