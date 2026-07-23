/**
 * FLOW-05 — Lesson Completion & Gamification E2E Tests
 *
 * Prerequisites: Vite dev server (auto-started by playwright.config.ts webServer)
 *   NestJS server not required — all tests are mock-driven via URL params.
 *
 * R-01: Completion form renders with answer fields
 * R-02: Submit completion → gamification feedback shown (points + level + streak)
 * R-03: Achievement unlocked notification visible after qualifying score
 * R-04: Private learning mode → social share section hidden
 * R-05: Social share enabled → post builder visible after consent toggle
 * R-06: Points breakdown shows itemized formula
 * R-07: Dashboard shows full gamification state (level, streak, achievements)
 * R-08: Performance history renders with classification buckets
 * R-09: Adaptation pending state visible when Branch B async processing
 * R-10: Answer grading form renders for received post
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP_SUFFIX = process.env.E2E_SNAPSHOT_SUFFIX ?? '';
const withSnapshotSuffix = (name: string) => {
  if (!SNAP_SUFFIX) return name;
  const ext = path.extname(name);
  const base = name.slice(0, name.length - ext.length);
  return `${base}${SNAP_SUFFIX}${ext}`;
};
const SNAP = (name: string) =>
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    'completion-gamification',
    withSnapshotSuffix(name),
  );

test.describe('FLOW-05 — Lesson Completion & Gamification', () => {

  // ── Completion Form ──────────────────────────────────────────────────────────

  test('R-01: Completion form renders with answer fields', async ({ page }) => {
    await page.goto('/lessons/complete');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('01-completion-form.png'), fullPage: true });

    await expect(page.locator('[data-testid="page-lesson-completion"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="question-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-completion"]')).toBeVisible();
  });

  // ── Gamification Feedback ────────────────────────────────────────────────────

  test('R-02: Submit completion → gamification feedback shown (points + level + streak)', async ({ page }) => {
    await page.goto('/lessons/complete?mock=submitted');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('02-gamification-feedback.png'), fullPage: true });

    await expect(page.locator('[data-testid="gamification-feedback"]')).toBeVisible();
    await expect(page.locator('[data-testid="points-earned"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-level"]')).toBeVisible();
    await expect(page.locator('[data-testid="streak-count"]')).toBeVisible();
  });

  // ── Achievement Unlocked ─────────────────────────────────────────────────────

  test('R-03: Achievement unlocked notification visible after qualifying score', async ({ page }) => {
    await page.goto('/lessons/complete?mock=achieved');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('03-achievement-unlocked.png'), fullPage: true });

    await expect(page.locator('[data-testid="achievement-unlocked"]')).toBeVisible();
    await expect(page.locator('[data-testid="gamification-feedback"]')).toBeVisible();
  });

  // ── Private Mode ─────────────────────────────────────────────────────────────

  test('R-04: Private learning mode → social share section hidden (data-testid="social-section" absent)', async ({ page }) => {
    await page.goto('/lessons/complete?mock=private');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('04-private-mode.png'), fullPage: true });

    await expect(page.locator('[data-testid="page-lesson-completion"]')).toBeVisible();
    await expect(page.locator('[data-testid="social-section"]')).not.toBeVisible();
  });

  // ── Social Share ─────────────────────────────────────────────────────────────

  test('R-05: Social share enabled → post builder visible after consent toggle', async ({ page }) => {
    await page.goto('/learning/social');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: SNAP('r-05-before.png'), fullPage: true });
    // Toggle consent checkbox
    await page.locator('[data-testid="social-consent-toggle"] input[type="checkbox"]').check();
    await page.waitForTimeout(200);
    await page.screenshot({ path: SNAP('05-social-share.png'), fullPage: true });

    await expect(page.locator('[data-testid="social-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="post-builder"]')).toBeVisible();
  });

  // ── Points Breakdown ─────────────────────────────────────────────────────────

  test('R-06: Points breakdown shows itemized formula', async ({ page }) => {
    await page.goto('/lessons/complete?mock=submitted');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('06-points-breakdown.png'), fullPage: true });

    await expect(page.locator('[data-testid="points-breakdown"]')).toBeVisible();
    const breakdownText = await page.locator('[data-testid="points-breakdown"]').textContent();
    expect(breakdownText).toContain('Base');
  });

  // ── Gamification Dashboard ───────────────────────────────────────────────────

  test('R-07: Dashboard shows full gamification state (level, streak, achievements)', async ({ page }) => {
    await page.goto('/gamification?mock=loaded');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('07-gamification-dashboard.png'), fullPage: true });

    await expect(page.locator('[data-testid="gamification-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-level"]')).toBeVisible();
    await expect(page.locator('[data-testid="streak-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="achievement-gallery"]')).toBeVisible();
    await expect(page.locator('[data-testid="points-history"]')).toBeVisible();
  });

  // ── Performance History ──────────────────────────────────────────────────────

  test('R-08: Performance history renders with classification buckets', async ({ page }) => {
    await page.goto('/learning/progress?mock=loaded');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('08-performance-history.png'), fullPage: true });

    await expect(page.locator('[data-testid="learning-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="performance-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="classification-0"]')).toBeVisible();
  });

  // ── Adaptation Pending ───────────────────────────────────────────────────────

  test('R-09: Adaptation pending state visible when Branch B async processing', async ({ page }) => {
    await page.goto('/learning/progress?mock=pending');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('09-adaptation-pending.png'), fullPage: true });

    await expect(page.locator('[data-testid="adaptation-pending"]')).toBeVisible();
  });

  // ── Answer Grading ───────────────────────────────────────────────────────────

  test('R-10: Answer grading form renders for received post', async ({ page }) => {
    await page.goto('/learning/social?mock=grading');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('10-answer-grading.png'), fullPage: true });

    await expect(page.locator('[data-testid="answer-grading-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="grade-button-A"]')).toBeVisible();
  });

});
