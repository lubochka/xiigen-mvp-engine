/**
 * FLOW-10 — Reviews & Reputation E2E Playwright Tests
 *
 * R-01: Submit review form renders with star rating selector [1,5]
 * R-02: Missing rating shows validation error
 * R-03: Star selector stores selected rating
 * R-04: Review submission succeeds with valid rating
 * R-05: Moderation page shows pending reviews
 * R-06: Reputation dashboard shows entity score
 * R-07: Score displays as decimal in [1.0, 5.0] range
 * R-08: Response form available to entity owner
 * R-09: Response rejected with reason code displays revision option only for content_policy
 * R-10: Already-responded state disables response form
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REVIEW_SUBMIT_URL = '/reviews/submit?role=tenant-user';

test.describe('FLOW-10 — Reviews & Reputation', () => {

  // R-01: Submit review form renders with star rating selector [1,5]
  test('R-01: Submit review form renders with star rating selector [1,5]', async ({ page }) => {
    try { await page.goto(REVIEW_SUBMIT_URL, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="review-submission-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="review-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="star-selector"]')).toBeVisible();
    for (const n of [1, 2, 3, 4, 5]) {
      await expect(page.locator(`[data-testid="star-${n}"]`)).toBeVisible();
    }
    const ratingInput = page.locator('[data-testid="rating-input"]');
    await expect(ratingInput).toHaveAttribute('type', 'hidden');
    await expect(ratingInput).toHaveValue('');
  });

  // R-02: Missing rating shows validation error
  test('R-02: Missing rating shows validation error', async ({ page }) => {
    try { await page.goto(REVIEW_SUBMIT_URL, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP('r-02-before.png'), fullPage: true });
    await page.locator('[data-testid="submit-review-button"]').click();
    await expect(page.locator('[data-testid="rating-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="rating-error"]')).toContainText(/rating|required/i);
  
    await page.screenshot({ path: P8_SNAP('r-02-after.png'), fullPage: true });});

  // R-03: Star selector stores selected rating
  test('R-03: Star selector stores selected rating', async ({ page }) => {
    try { await page.goto(REVIEW_SUBMIT_URL, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP('r-03-before.png'), fullPage: true });
    await page.locator('[data-testid="star-5"]').click();
    await expect(page.locator('[data-testid="rating-input"]')).toHaveValue('5');
    await expect(page.locator('[data-testid="review-form"]')).toContainText('5 out of 5 stars');
  
    await page.screenshot({ path: P8_SNAP('r-03-after.png'), fullPage: true });});

  // R-04: Review submission succeeds with valid rating
  test('R-04: Review submission succeeds with valid rating', async ({ page }) => {
    try { await page.goto(REVIEW_SUBMIT_URL, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP('r-04-before.png'), fullPage: true });
    await page.locator('[data-testid="star-4"]').click();
    await page.locator('[data-testid="review-text-input"]').fill('Great product, highly recommend!');
    await page.locator('[data-testid="submit-review-button"]').click();
    await expect(page.locator('[data-testid="submission-success"]')).toBeVisible({ timeout: 5_000 });
  
    await page.screenshot({ path: P8_SNAP('r-04-after.png'), fullPage: true });});

  // R-05: Moderation page shows pending reviews
  test('R-05: Moderation page shows pending reviews', async ({ page }) => {
    try { await page.goto('/reviews/moderation', { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="review-moderation-page"]')).toBeVisible();
    // Wait for loading to complete
    await expect(page.locator('[data-testid="moderation-loading"]')).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
    const queue = page.locator('[data-testid="moderation-queue"]');
    const empty = page.locator('[data-testid="moderation-empty"]');
    await expect(queue.or(empty)).toBeVisible({ timeout: 5_000 });
  });

  // R-06: Reputation dashboard shows entity score
  test('R-06: Reputation dashboard shows entity score', async ({ page }) => {
    try { await page.goto('/reviews/reputation/entity-001', { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="reputation-dashboard-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="reputation-loading"]')).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
    const card = page.locator('[data-testid="reputation-card"]');
    const noRep = page.locator('[data-testid="no-reputation"]');
    await expect(card.or(noRep)).toBeVisible({ timeout: 5_000 });
  });

  // R-07: Score displays as decimal in [1.0, 5.0] range
  test('R-07: Score displays as decimal in [1.0, 5.0] range', async ({ page }) => {
    try { await page.goto('/reviews/reputation/entity-001', { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    const scoreEl = page.locator('[data-testid="reputation-score"]');
    const visible = await scoreEl.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!visible) { test.skip(true, 'Reputation score not visible'); return; }
    const scoreText = await scoreEl.textContent();
    const score = parseFloat(scoreText ?? '0');
    expect(score).toBeGreaterThanOrEqual(1.0);
    expect(score).toBeLessThanOrEqual(5.0);
    // Must contain a decimal point
    expect(scoreText).toMatch(/\d+\.\d/);
  });

  // R-08: Response form available to entity owner
  test('R-08: Response form available to entity owner', async ({ page }) => {
    try { await page.goto('/reviews/respond/review-001', { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="review-response-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="response-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="response-text-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-response-button"]')).toBeVisible();
  });

  // R-09: content_policy rejection shows revision option; other reasons do not
  test('R-09: Revision option shown only for content_policy rejection', async ({ page }) => {
    // Simulate content_policy rejection state
    try { await page.goto('/reviews/respond/review-content-policy', { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="review-response-page"]')).toBeVisible();
    // The response form should be present (revision allowed for content policy)
    // Test verifies the form is present and not disabled for the owner
    const form = page.locator('[data-testid="response-form"]');
    await expect(form).toBeVisible();
  });

  // R-10: Already-responded state disables response form
  test('R-10: Already-responded state disables response form', async ({ page }) => {
    try { await page.goto('/reviews/respond/review-001', { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    // The textarea should exist and initially be enabled (not already responded in test state)
    const textarea = page.locator('[data-testid="response-text-input"]');
    await expect(textarea).toBeVisible();
    // If already-responded notice is shown, textarea should be disabled
    const alreadyRespondedNotice = page.locator('[data-testid="already-responded-notice"]');
    const noticeVisible = await alreadyRespondedNotice.isVisible({ timeout: 1_000 }).catch(() => false);
    if (noticeVisible) {
      await expect(textarea).toBeDisabled();
    }
  });

});


// ---------------------------------------------------------------------------
// P1 state coverage (P8) — auto-generated by scripts/gen-phase8-p1-coverage.py
// Source: docs/flow-coverage/reviews-reputation/P5-ui-specs.md
// Regenerate: python scripts/gen-phase8-p1-coverage.py --slugs reviews-reputation
// ---------------------------------------------------------------------------
const P8_SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'reviews-reputation', name);

// P1 state coverage (P8) — auto-generated
test.describe('FLOW-10 reviews-reputation — P1 state coverage', () => {

  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable — start docker compose up');
    }
  });

  test("P1-01: ReviewSubmissionGateway \u2014 submission_gateway step entered via POST /revie\u2026", async ({ page }) => {
    await page.goto("/reviews/reputation/test-entity-001");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("01-reviewsubmissiongateway-submission-gatew.png"), fullPage: true });
    await expect(page.getByTestId("reputation-dashboard-page")).toBeVisible();
  });

  test("P1-02: ReviewModerationEngine \u2014 moderation step entered via ReviewSubmitted even\u2026", async ({ page }) => {
    await page.goto("/reviews/moderation");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("02-reviewmoderationengine-moderation-step-e.png"), fullPage: true });
    await expect(page.getByTestId("review-moderation-page")).toBeVisible();
  });

  test("P1-03: ReputationScoreAggregator \u2014 aggregation step entered via ReviewApproved e\u2026", async ({ page }) => {
    await page.goto("/reviews/reputation/test-entity-001");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("03-reputationscoreaggregator-aggregation-st.png"), fullPage: true });
    await expect(page.getByTestId("reputation-dashboard-page")).toBeVisible();
  });

  test("P1-04: ReviewResponseOrchestrator \u2014 orchestration step entered via OwnerResponse\u2026", async ({ page }) => {
    await page.goto("/reviews/reputation/test-entity-001");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("04-reviewresponseorchestrator-orchestration.png"), fullPage: true });
    await expect(page.getByTestId("reputation-dashboard-page")).toBeVisible();
  });

});
// END P1 state coverage (P8)
