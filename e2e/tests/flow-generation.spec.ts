/**
 * flow-generation.spec.ts — Browser E2E tests for the Generation Lab.
 *
 * Tests the core workflow: open Generation Lab → set tenant → load spec →
 * click Generate → see results (AF timeline, code viewer, quality card, feedback).
 *
 * Runs against the real NestJS server (AI_PROVIDER=mock) + React client (nginx).
 * Uses the auth fixture which navigates to /generation-lab and sets tenant-input.
 *
 * Phase 11 — Commit 15
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Flow Generation — browser E2E', () => {

  test.describe('Contract Submission UI', () => {
    test('landing page loads without errors', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="page-generationlab"]')).toBeVisible();
      await expect(tenantAPage.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(tenantAPage.locator('[data-testid="main-content"]')).toBeVisible();
    });

    test('sidebar navigation to generation lab is active', async ({ tenantAPage }) => {
      const navLink = tenantAPage.locator('[data-testid="nav-generation-lab"]');
      await expect(navLink).toBeVisible();
      // Active nav item has blue-600 background class
      await expect(navLink).toHaveClass(/bg-blue-600/);
    });

    test('spec textarea contains default T44 contract JSON', async ({ tenantAPage }) => {
      const textarea = tenantAPage.locator('[data-testid="spec-textarea"]');
      await expect(textarea).toBeVisible();
      const content = await textarea.inputValue();
      expect(content).toContain('T44');
      expect(content).toContain('taskTypeId');
      expect(content).toContain('DATA_PIPELINE');
    });

    test('load-sample button populates spec with T44 template', async ({ tenantAPage }) => {
      // Replace contents with empty JSON
      await tenantAPage.locator('[data-testid="spec-textarea"]').fill('{}');
      // Click the load-sample link
      await tenantAPage.locator('[data-testid="spec-load-sample"]').click();
      const content = await tenantAPage.locator('[data-testid="spec-textarea"]').inputValue();
      expect(content).toContain('T44');
      expect(content).toContain('DATA_PIPELINE');
    });

    test('tenant-id field is pre-populated by auth fixture', async ({ tenantAPage }) => {
      const tenantInput = tenantAPage.locator('[data-testid="tenant-input"]');
      await expect(tenantInput).toBeVisible();
      const value = await tenantInput.inputValue();
      expect(value).toBe('e2e-tenant-A');
    });

    test('invalid JSON spec shows inline validation error', async ({ tenantAPage }) => {
      // Enter malformed JSON
      await tenantAPage.locator('[data-testid="spec-textarea"]').fill('{ invalid json }');
      await tenantAPage.locator('[data-testid="generate-button"]').click();
      // JSON parse error displayed inline
      await expect(tenantAPage.locator('[data-testid="spec-error"]')).toBeVisible({ timeout: 3_000 });
    });
  });

  test.describe('Generation in progress state', () => {
    test('generate button shows loading text while request is in flight', async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="spec-load-sample"]').click();
      // Click but don't await completion
      tenantAPage.locator('[data-testid="generate-button"]').click();
      // Button text flips to "⏳ Generating…" while generating=true
      await expect(tenantAPage.locator('[data-testid="generate-button"]')).toContainText('Generating', { timeout: 5_000 });
    });

    test('AF station timeline is present on the page', async ({ tenantAPage }) => {
      // The timeline renders regardless of generation state
      await expect(tenantAPage.locator('[data-testid="af-station-timeline"]')).toBeVisible();
    });

    test('no-results placeholder shown before any generation', async ({ tenantAPage }) => {
      // Fresh fixture page — no generation triggered yet
      await expect(tenantAPage.locator('[data-testid="lab-no-results"]')).toBeVisible();
    });
  });

  test.describe('Generation Result Display', () => {
    test.beforeEach(async ({ tenantAPage }) => {
      // Load the default T44 spec and trigger generation
      await tenantAPage.locator('[data-testid="spec-load-sample"]').click();
      await tenantAPage.locator('[data-testid="generate-button"]').click();
      // Wait for generation to complete (button re-enables)
      await expect(tenantAPage.locator('[data-testid="generate-button"]')).not.toBeDisabled({ timeout: 30_000 });
    });

    test('generated code viewer appears after successful generation', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="generated-code-viewer"]')).toBeVisible();
    });

    test('code length metric is displayed in output panel', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="code-length"]')).toBeVisible();
    });

    test('factory count is displayed in output panel', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="factory-count"]')).toBeVisible();
    });

    test('flow ID is displayed in output panel', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="flow-id"]')).toBeVisible();
    });

    test('quality score card appears after generation', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="quality-score-card"]')).toBeVisible();
    });

    test('feedback panel appears after generation', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="feedback-panel"]')).toBeVisible();
    });
  });

  test.describe('Error Handling UI', () => {
    test('generate button disabled while generating', async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="spec-load-sample"]').click();
      // Click without awaiting result
      tenantAPage.locator('[data-testid="generate-button"]').click();
      // Should become disabled immediately
      await expect(tenantAPage.locator('[data-testid="generate-button"]')).toBeDisabled({ timeout: 3_000 });
    });

    test('feedback submit is disabled until a rating is selected', async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="spec-load-sample"]').click();
      await tenantAPage.locator('[data-testid="generate-button"]').click();
      await expect(tenantAPage.locator('[data-testid="feedback-panel"]')).toBeVisible({ timeout: 30_000 });
      // Submit should be disabled — no rating selected
      await expect(tenantAPage.locator('[data-testid="feedback-submit"]')).toBeDisabled();
    });

    test('feedback submission shows thank-you confirmation', async ({ tenantAPage }) => {
      await tenantAPage.locator('[data-testid="spec-load-sample"]').click();
      await tenantAPage.locator('[data-testid="generate-button"]').click();
      await expect(tenantAPage.locator('[data-testid="feedback-panel"]')).toBeVisible({ timeout: 30_000 });
      // Select good rating and submit
      await tenantAPage.locator('[data-testid="feedback-good"]').click();
      await tenantAPage.locator('[data-testid="feedback-submit"]').click();
      await expect(tenantAPage.locator('[data-testid="feedback-submitted"]')).toBeVisible();
    });

    test('error boundary does not trigger on valid generation page', async ({ tenantAPage }) => {
      await expect(tenantAPage.locator('[data-testid="error-boundary"]')).not.toBeVisible();
    });
  });
});
