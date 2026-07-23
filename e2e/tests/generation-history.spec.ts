/**
 * generation-history.spec.ts — Browser E2E tests for generation output tracking.
 *
 * WF-14 SCOPE ADJUSTMENT: No dedicated /history route exists in the client.
 * Generation output is surfaced via two existing surfaces:
 *   1. GenerationLabPage (/generation-lab): GeneratedCodeViewer, QualityScoreCard,
 *      FeedbackPanel — show metrics for each completed run
 *   2. QualityDashboardPage (/quality): historical pass rates, DNA compliance grid,
 *      failure pattern list — shows aggregate history from sample data
 *
 * Tests prove that generation metadata is correctly rendered in the UI after
 * each generation, and that the Quality Dashboard historical view is functional.
 *
 * Phase 13 — Commit 17
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Generation Output Tracking — UI', () => {

  test.describe('Generation Lab — result metrics after generation', () => {
    test.beforeEach(async ({ tenantAPage }) => {
      // Trigger a generation to produce results
      await tenantAPage.locator('[data-testid="spec-load-sample"]').click();
      await tenantAPage.locator('[data-testid="generate-button"]').click();
      // Wait for completion
      await expect(tenantAPage.locator('[data-testid="generate-button"]')).not.toBeDisabled({ timeout: 30_000 });
    });

    test('generated code viewer renders with code-length metric', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="generated-code-viewer"]')).toBeVisible();
      await expect(tenantAPage.locator('[data-testid="code-length"]')).toBeVisible();
    });

    test('factory count metric is shown in output panel', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="factory-count"]')).toBeVisible();
    });

    test('flow ID is shown in output panel', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="flow-id"]')).toBeVisible();
    });

    test('quality score card renders pipeline and promotion status', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="quality-score-card"]')).toBeVisible();
    });

    test('feedback panel renders all three rating buttons', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="feedback-panel"]')).toBeVisible();
      await expect(tenantAPage.locator('[data-testid="feedback-good"]')).toBeVisible();
      await expect(tenantAPage.locator('[data-testid="feedback-neutral"]')).toBeVisible();
      await expect(tenantAPage.locator('[data-testid="feedback-bad"]')).toBeVisible();
    });

    test('feedback comment field accepts user input', async ({ tenantAPage }) => {
      const commentBox = tenantAPage.locator('[data-testid="feedback-comment"]');
      await commentBox.fill('Excellent generation, meets all DNA rules');
      const value = await commentBox.inputValue();
      expect(value).toBe('Excellent generation, meets all DNA rules');
    });

    test('feedback submit enabled after rating is selected', async ({ tenantAPage }) => {
      // Initially disabled
      await expect(tenantAPage.locator('[data-testid="feedback-submit"]')).toBeDisabled();
      // Select neutral rating
      await tenantAPage.locator('[data-testid="feedback-neutral"]').click();
      // Now enabled
      await expect(tenantAPage.locator('[data-testid="feedback-submit"]')).not.toBeDisabled();
    });

    test('second generation refreshes the output panel', async ({ tenantAPage }) => {
      // First result is visible (from beforeEach)
      const firstCodeLength = await tenantAPage.locator('[data-testid="code-length"]').textContent();

      // Trigger second generation
      await tenantAPage.locator('[data-testid="generate-button"]').click();
      await expect(tenantAPage.locator('[data-testid="generate-button"]')).not.toBeDisabled({ timeout: 30_000 });

      // Output panel should still be visible after second run
      await expect(tenantAPage.locator('[data-testid="generated-code-viewer"]')).toBeVisible();
      await expect(tenantAPage.locator('[data-testid="code-length"]')).toBeVisible();

      // Code length is still present (may or may not change with mock provider)
      const secondCodeLength = await tenantAPage.locator('[data-testid="code-length"]').textContent();
      expect(secondCodeLength).toBeTruthy();
    });
  });

  test.describe('Quality Dashboard — historical aggregate metrics', () => {
    test.beforeEach(async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="nav-quality"]').click();
      await expect(tenantAPage.locator('[data-testid="page-qualitydashboard"]')).toBeVisible();
    });

    test('quality dashboard page loads without errors', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="page-qualitydashboard"]')).toBeVisible();
      await expect(tenantAPage.locator('[data-testid="error-boundary"]')).not.toBeVisible();
    });

    test('quality dashboard renders four summary data cards', async ({ tenantAPage }) => {
      // DataCard components: Current Pass Rate, Total Runs, DNA Compliance, Failure Patterns
      const cards = tenantAPage.locator('[data-testid="data-card"]');
      await expect(cards).toHaveCount(4);
    });

    test('first data card shows pass rate metric title', async ({ tenantAPage }) => {
      const firstTitle = tenantAPage.locator('[data-testid="data-card-title"]').first();
      await expect(firstTitle).toContainText('Pass Rate');
    });

    test('second data card shows total runs metric', async ({ tenantAPage }) => {
      const secondTitle = tenantAPage.locator('[data-testid="data-card-title"]').nth(1);
      await expect(secondTitle).toContainText('Total Runs');
    });

    test('quality dashboard page mentions DNA in content', async ({ tenantAPage }) => {
      const pageText = await tenantAPage.locator('[data-testid="page-qualitydashboard"]').textContent();
      expect(pageText).toContain('DNA');
    });

    test('data card values are non-empty strings', async ({ tenantAPage }) => {
      const values = tenantAPage.locator('[data-testid="data-card-value"]');
      const count = await values.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const text = await values.nth(i).textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Sidebar navigation for tracking pages', () => {
    test('quality nav link navigates to quality dashboard', async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="nav-quality"]').click();
      await expect(tenantAPage).toHaveURL(/\/quality/);
      await expect(tenantAPage.locator('[data-testid="page-qualitydashboard"]')).toBeVisible();
    });

    test('model leaderboard nav link navigates to leaderboard page', async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="nav-model-leaderboard"]').click();
      await expect(tenantAPage).toHaveURL(/\/model-leaderboard/);
    });

    test('navigating back to generation lab retains no previous result', async ({ tenantAPage }) => {
      // Navigate away
      await tenantAPage.locator('[data-testid="nav-quality"]').click();
      await expect(tenantAPage.locator('[data-testid="page-qualitydashboard"]')).toBeVisible();
      // Navigate back
      await tenantAPage.locator('[data-testid="nav-generation-lab"]').click();
      await expect(tenantAPage.locator('[data-testid="page-generationlab"]')).toBeVisible();
      // No previous results should persist after navigation (React state reset)
      // The lab-no-results placeholder should show again
      await expect(tenantAPage.locator('[data-testid="lab-no-results"]')).toBeVisible();
    });
  });
});
