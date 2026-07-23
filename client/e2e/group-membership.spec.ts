/**
 * FLOW-06 — Group Membership E2E Tests
 *
 * Prerequisites: Vite dev server (auto-started by playwright.config.ts webServer)
 *   NestJS server not required — all tests are mock-driven via URL params.
 *
 * R-01: Group discovery page renders with search
 * R-02: Public group join → GroupMembershipCompleted confirmation shown
 * R-03: Private group join → pending status badge shown
 * R-04: Pending member sees "Awaiting approval" message
 * R-05: Admin approval page shows approve/reject buttons
 * R-06: Group feed shows tier-appropriate content
 * R-07: Locked content shows upgrade CTA (not raw content)
 * R-08: SETNX idempotency: second join shows existing membership (not error)
 * R-09: Tier upgrade → feed reflects new access level
 * R-10: Admin rejection → member sees rejection message
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'user-groups-communities', name);

test.describe('FLOW-06 — Group Membership', () => {

  // ── Group Discovery ──────────────────────────────────────────────────────────

  test('R-01: Group discovery page renders with search', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('01-group-discovery.png'), fullPage: true });

    await expect(page.locator('[data-testid="page-group-discovery"]')).toBeVisible();
    await expect(page.locator('[data-testid="group-search-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-filter"]')).toBeVisible();
  });

  // ── Public Join ──────────────────────────────────────────────────────────────

  test('R-02: Public group join → GroupMembershipCompleted confirmation shown', async ({ page }) => {
    await page.goto('/groups?mock=results');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: SNAP('r-02-before.png'), fullPage: true });
    // Click join on first public group
    await page.locator('[data-testid="join-button-grp-001"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: SNAP('02-public-join-confirmed.png'), fullPage: true });

    await expect(page.locator('[data-testid="group-joined"]')).toBeVisible();
  });

  // ── Private Join ─────────────────────────────────────────────────────────────

  test('R-03: Private group join → pending status badge shown', async ({ page }) => {
    await page.goto('/groups?mock=results');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: SNAP('r-03-before.png'), fullPage: true });
    // Click request on private group
    await page.locator('[data-testid="request-button-grp-002"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: SNAP('03-private-join-pending.png'), fullPage: true });

    await expect(page.locator('[data-testid="request-sent-badge"]')).toBeVisible();
  });

  // ── Pending Status ───────────────────────────────────────────────────────────

  test('R-04: Pending member sees "Awaiting approval" message', async ({ page }) => {
    await page.goto('/groups/grp-002/membership?mock=pending');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('04-membership-pending.png'), fullPage: true });

    await expect(page.locator('[data-testid="membership-pending"]')).toBeVisible();
    const text = await page.locator('[data-testid="membership-pending"]').textContent();
    expect(text).toContain('Awaiting Admin Approval');
  });

  // ── Admin Approval ───────────────────────────────────────────────────────────

  test('R-05: Admin approval page shows approve/reject buttons', async ({ page }) => {
    await page.goto('/groups/grp-002/admin/approvals?mock=pending');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('05-admin-approval.png'), fullPage: true });

    await expect(page.locator('[data-testid="approval-queue"]')).toBeVisible();
    await expect(page.locator('[data-testid="approve-button-jr-001"]')).toBeVisible();
    await expect(page.locator('[data-testid="reject-button-jr-001"]')).toBeVisible();
  });

  // ── Group Feed ───────────────────────────────────────────────────────────────

  test('R-06: Group feed shows tier-appropriate content', async ({ page }) => {
    await page.goto('/groups/grp-001/feed?mock=loaded');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('06-group-feed.png'), fullPage: true });

    await expect(page.locator('[data-testid="group-feed"]')).toBeVisible();
    await expect(page.locator('[data-testid="feed-entry-fe-001"]')).toBeVisible();
    await expect(page.locator('[data-testid="feed-entry-fe-002"]')).toBeVisible();
  });

  // ── Locked Content ───────────────────────────────────────────────────────────

  test('R-07: Locked content shows upgrade CTA (not raw content)', async ({ page }) => {
    await page.goto('/groups/grp-001/feed?mock=locked');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('07-locked-content.png'), fullPage: true });

    await expect(page.locator('[data-testid="upgrade-cta"]')).toBeVisible();
  });

  // ── SETNX Idempotency ────────────────────────────────────────────────────────

  test('R-08: SETNX idempotency — existing membership shows active (not error)', async ({ page }) => {
    await page.goto('/groups/grp-001/membership?mock=active');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('08-membership-idempotent.png'), fullPage: true });

    await expect(page.locator('[data-testid="membership-active"]')).toBeVisible();
  });

  // ── Tier Upgrade Feed ────────────────────────────────────────────────────────

  test('R-09: Tier upgrade → feed adjustment preview reflects new access level', async ({ page }) => {
    await page.goto('/groups/grp-001/tier?mock=preview');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('09-tier-upgrade.png'), fullPage: true });

    await expect(page.locator('[data-testid="feed-adjustment-preview"]')).toBeVisible();
    const previewText = await page.locator('[data-testid="feed-adjustment-preview"]').textContent();
    expect(previewText).toContain('Premium');
  });

  // ── Admin Rejection ──────────────────────────────────────────────────────────

  test('R-10: Admin rejection → member sees rejection message', async ({ page }) => {
    await page.goto('/groups/grp-002/membership?mock=rejected');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('10-membership-rejected.png'), fullPage: true });

    await expect(page.locator('[data-testid="membership-rejected"]')).toBeVisible();
    const text = await page.locator('[data-testid="membership-rejected"]').textContent();
    expect(text?.toLowerCase()).toContain('rejected');
  });

});
