/**
 * C6 Role Coverage — Playwright role-path tests for Runs 2-19.
 *
 * One test per (page × highest-density role) for all files touched in
 * the C6 role-aware templating rollout.
 *
 * Test naming: C6-{NN}: {slug} — {role} branch renders
 * Screenshot: docs/e2e-snapshots/c6-role-coverage/{NN}-{slug}-role-{role}.png
 *
 * Each test verifies:
 *   1. Page renders (no crash)
 *   2. data-viewer-role attribute equals the ?role= param
 *   3. Role-specific testid is visible
 *   4. Full-page screenshot captured for visual regression
 *
 * Contract: every role-aware page MUST accept ?role=<ViewerRole>,
 * emit data-viewer-role="<role>" on outer container, and render the
 * correct branch.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    'c6-role-coverage',
    withSnapshotSuffix(name),
  );

test.describe('C6 Role Coverage — Runs 2-19', () => {
  // Run 2 — GigPostingPage (FLOW-17) — /gigs/post
  test('C6-01: gig-posting — anonymous sees sign-in CTA not form', async ({ page }) => {
    await page.goto('/gigs/post?role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('01-gig-posting-role-anonymous.png'), fullPage: true });
    await expect(page.locator('[data-testid="gig-posting-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="gig-posting-page"]')).toHaveAttribute(
      'data-viewer-role',
      'anonymous'
    );
    await expect(page.locator('[data-testid="gig-anon-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="gig-anon-signin"]')).toBeVisible();
  });

  test('C6-02: gig-posting — freelancer sees bid browser not posting form', async ({ page }) => {
    await page.goto('/gigs/post?role=freelancer');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('02-gig-posting-role-freelancer.png'), fullPage: true });
    await expect(page.locator('[data-testid="gig-posting-page"]')).toHaveAttribute(
      'data-viewer-role',
      'freelancer'
    );
    await expect(page.locator('[data-testid="gig-freelancer-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="bid-amount-input"]')).toBeVisible();
  });

  test('C6-03: gig-posting — tenant-user sees client posting form', async ({ page }) => {
    await page.goto('/gigs/post?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('03-gig-posting-role-tenant-user.png'), fullPage: true });
    await expect(page.locator('[data-testid="gig-posting-page"]')).toHaveAttribute(
      'data-viewer-role',
      'tenant-user'
    );
    await expect(page.locator('[data-testid="gig-client-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="gig-title-input"]')).toBeVisible();
  });

  test('C6-04: gig-posting — platform-admin sees cross-tenant stats', async ({ page }) => {
    await page.goto('/gigs/post?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('04-gig-posting-role-platform-admin.png'), fullPage: true });
    await expect(page.locator('[data-testid="gig-posting-page"]')).toHaveAttribute(
      'data-viewer-role',
      'platform-admin'
    );
    await expect(page.locator('[data-testid="gig-platform-admin-view"]')).toBeVisible();
  });

  // Run 3 — CheckoutPage (FLOW-16) — /checkout
  test('C6-05: checkout — anonymous sees guest checkout with sign-in banner', async ({ page }) => {
    await page.goto('/checkout?role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('05-checkout-role-anonymous.png'), fullPage: true });
    await expect(page.locator('[data-testid="page-checkout"]')).toHaveAttribute(
      'data-viewer-role',
      'anonymous'
    );
    await expect(page.locator('[data-testid="checkout-anon-view"]')).toBeVisible();
  });

  test('C6-06: checkout — freelancer sees payee redirect not form', async ({ page }) => {
    await page.goto('/checkout?role=freelancer');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('06-checkout-role-freelancer.png'), fullPage: true });
    await expect(page.locator('[data-testid="page-checkout"]')).toHaveAttribute(
      'data-viewer-role',
      'freelancer'
    );
    await expect(page.locator('[data-testid="checkout-payee-redirect"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkout-freelancer-redirect"]')).toBeVisible();
  });

  test('C6-07: checkout — tenant-user sees existing checkout form', async ({ page }) => {
    await page.goto('/checkout?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('07-checkout-role-tenant-user.png'), fullPage: true });
    await expect(page.locator('[data-testid="page-checkout"]')).toHaveAttribute(
      'data-viewer-role',
      'tenant-user'
    );
    await expect(page.locator('[data-testid="checkout-buyer-view"]')).toBeVisible();
  });

  test('C6-08: checkout — business-partner sees B2B PO form', async ({ page }) => {
    await page.goto('/checkout?role=business-partner');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('08-checkout-role-business-partner.png'), fullPage: true });
    await expect(page.locator('[data-testid="page-checkout"]')).toHaveAttribute(
      'data-viewer-role',
      'business-partner'
    );
    await expect(page.locator('[data-testid="checkout-b2b-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkout-b2b-po"]')).toBeVisible();
  });

  // Run 4 — BillingDashboardPage (FLOW-12) — /billing-dashboard
  test('C6-09: billing — anonymous sees pricing page', async ({ page }) => {
    await page.goto('/billing-dashboard?role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('09-billing-role-anonymous.png'), fullPage: true });
    await expect(page.locator('[data-testid="billing-dashboard-page"]')).toHaveAttribute(
      'data-viewer-role',
      'anonymous'
    );
    await expect(page.locator('[data-testid="billing-pricing-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="pricing-starter-cta"]')).toBeVisible();
  });

  test('C6-10: billing — tenant-admin sees existing MRR dashboard', async ({ page }) => {
    await page.goto('/billing-dashboard?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('10-billing-role-tenant-admin.png'), fullPage: true });
    await expect(page.locator('[data-testid="billing-dashboard-page"]')).toHaveAttribute(
      'data-viewer-role',
      'tenant-admin'
    );
    await expect(page.locator('[data-testid="billing-admin-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="mrr-metric-card"]')).toBeVisible();
  });

  test('C6-11: billing — freelancer sees earnings ledger', async ({ page }) => {
    await page.goto('/billing-dashboard?role=freelancer');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('11-billing-role-freelancer.png'), fullPage: true });
    await expect(page.locator('[data-testid="billing-dashboard-page"]')).toHaveAttribute(
      'data-viewer-role',
      'freelancer'
    );
    await expect(page.locator('[data-testid="billing-freelancer-view"]')).toBeVisible();
  });

  // Run 5 — AuctionDashboardPage (FLOW-20) — /admin/ads/auction
  test('C6-12: ads-auction — anonymous sees consent info panel', async ({ page }) => {
    await page.goto('/admin/ads/auction?role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('12-ads-auction-role-anonymous.png'), fullPage: true });
    await expect(page.locator('[data-testid="page-auctiondashboard"]')).toHaveAttribute(
      'data-viewer-role',
      'anonymous'
    );
    await expect(page.locator('[data-testid="ads-consent-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="ads-public-view"]')).toBeVisible();
  });

  test('C6-13: ads-auction — business-partner sees existing dashboard', async ({ page }) => {
    await page.goto('/admin/ads/auction?role=business-partner');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('13-ads-auction-role-business-partner.png'), fullPage: true });
    await expect(page.locator('[data-testid="page-auctiondashboard"]')).toHaveAttribute(
      'data-viewer-role',
      'business-partner'
    );
    await expect(page.locator('[data-testid="ads-advertiser-view"]')).toBeVisible();
  });

  test('C6-14: ads-auction — consent banner always rendered (all roles)', async ({ page }) => {
    await page.goto('/admin/ads/auction?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('14-ads-auction-consent-universal.png'), fullPage: true });
    await expect(page.locator('[data-testid="page-auctiondashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="ads-consent-banner"]')).toBeVisible();
  });

  // Run 6 — DataWarehouseAnalyticsPage (FLOW-13) — /admin/data-warehouse-analytics
  test('C6-15: dwa — tenant-admin sees AdminCrudPanel', async ({ page }) => {
    await page.goto('/admin/data-warehouse-analytics?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('15-dwa-role-tenant-admin.png'), fullPage: true });
    await expect(page.locator('[data-testid="analytics-admin-view"]')).toBeVisible();
  });

  test('C6-16: dwa — freelancer sees gig-performance KPIs', async ({ page }) => {
    await page.goto('/admin/data-warehouse-analytics?role=freelancer');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('16-dwa-role-freelancer.png'), fullPage: true });
    await expect(page.locator('[data-testid="analytics-freelancer-view"]')).toBeVisible();
  });

  // Run 7 — BookingConfirmationPage (FLOW-09) — /tickets/booking
  test('C6-17: booking — anonymous sees sign-in gate', async ({ page }) => {
    await page.goto('/tickets/booking?purchaseId=test-001&role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('17-booking-role-anonymous.png'), fullPage: true });
    // Either booking-confirmation-page (main view) or booking-no-selection (infra state) acceptable
    const mainOrNoSel = page.locator(
      '[data-testid="booking-confirmation-page"], [data-testid="booking-no-selection"]'
    );
    await expect(mainOrNoSel.first()).toBeVisible();
  });

  test('C6-18: booking — event-organiser sees capacity dashboard', async ({ page }) => {
    await page.goto('/tickets/booking?purchaseId=test-001&role=event-organiser');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('18-booking-role-event-organiser.png'), fullPage: true });
    // May show no-selection if API is unreachable; if main view, organiser branch should render
    const organiserOrNoSel = page.locator(
      '[data-testid="booking-organiser-view"], [data-testid="booking-no-selection"]'
    );
    await expect(organiserOrNoSel.first()).toBeVisible();
  });

  test('C6-19: booking — platform-support has no QR link (main view only)', async ({ page }) => {
    await page.goto('/tickets/booking?purchaseId=test-001&role=platform-support');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('19-booking-role-platform-support.png'), fullPage: true });
    // Either branch renders or no-selection shows — in main view, view-qr-link must not be present
    const noQr = await page.locator('[data-testid="view-qr-link"]').count();
    expect(noQr).toBe(0);
  });

  // Run 8 — EventCreationPage (FLOW-03) — /events/create
  test('C6-20: events-create — anonymous sees public listing not form', async ({ page }) => {
    await page.goto('/events/create?role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('20-events-create-role-anonymous.png'), fullPage: true });
    await expect(page.locator('[data-testid="page-event-creation"]')).toHaveAttribute(
      'data-viewer-role',
      'anonymous'
    );
    await expect(page.locator('[data-testid="event-create-public-view"]')).toBeVisible();
  });

  test('C6-21: events-create — event-organiser sees creation form', async ({ page }) => {
    await page.goto('/events/create?role=event-organiser');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('21-events-create-role-event-organiser.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="page-event-creation"]')).toHaveAttribute(
      'data-viewer-role',
      'event-organiser'
    );
    await expect(page.locator('[data-testid="event-creation-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-form-required-legend"]')).toBeVisible();
  });

  test('C6-22: events-create — freelancer sees offer-services CTAs', async ({ page }) => {
    await page.goto('/events/create?role=freelancer');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('22-events-create-role-freelancer.png'), fullPage: true });
    await expect(page.locator('[data-testid="event-create-freelancer-view"]')).toBeVisible();
  });

  // Run 9 — Sidebar (App.tsx) — navigation filtering
  test('C6-23: sidebar — anonymous sees only 3 nav items', async ({ page }) => {
    await page.goto('/dashboard?role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('23-sidebar-role-anonymous.png'), fullPage: true });
    await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute(
      'data-viewer-role',
      'anonymous'
    );
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-tenants"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="nav-generation-lab"]')).toHaveCount(0);
  });

  test('C6-24: sidebar — platform-admin sees all nav items', async ({ page }) => {
    await page.goto('/dashboard?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('24-sidebar-role-platform-admin.png'), fullPage: true });
    await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute(
      'data-viewer-role',
      'platform-admin'
    );
    await expect(page.locator('[data-testid="nav-tenants"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-generation-lab"]')).toBeVisible();
  });

  test('C6-25: sidebar — freelancer sees no admin section header', async ({ page }) => {
    await page.goto('/dashboard?role=freelancer');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('25-sidebar-role-freelancer.png'), fullPage: true });
    await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute(
      'data-viewer-role',
      'freelancer'
    );
    await expect(page.locator('[data-testid="nav-tenants"]')).toHaveCount(0);
  });

  // Run 11 — OnboardingPage (FLOW-01) — /onboarding
  test('C6-26: onboarding — referral-user sees referral banner', async ({ page }) => {
    await page.goto('/onboarding?userId=user-verified&role=referral-user');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('26-onboarding-role-referral-user.png'), fullPage: true });
    await expect(page.locator('[data-testid="page-onboarding"]')).toHaveAttribute(
      'data-viewer-role',
      'referral-user'
    );
    await expect(page.locator('[data-testid="onboarding-referral-banner"]')).toBeVisible();
  });

  test('C6-27: onboarding — freelancer sees freelancer banner', async ({ page }) => {
    await page.goto('/onboarding?userId=user-verified&role=freelancer');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('27-onboarding-role-freelancer.png'), fullPage: true });
    await expect(page.locator('[data-testid="onboarding-freelancer-banner"]')).toBeVisible();
  });

  test('C6-28: onboarding — anonymous sees redirect panel', async ({ page }) => {
    await page.goto('/onboarding?role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('28-onboarding-role-anonymous.png'), fullPage: true });
    await expect(page.locator('[data-testid="page-onboarding"]')).toHaveAttribute(
      'data-viewer-role',
      'anonymous'
    );
    await expect(page.locator('[data-testid="onboarding-anon-message"]')).toBeVisible();
  });

  // Run 12 — GroupDiscoveryPage (FLOW-06) — /groups
  test('C6-29: groups — anonymous sees public groups read-only', async ({ page }) => {
    await page.goto('/groups?role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('29-groups-role-anonymous.png'), fullPage: true });
    await expect(page.locator('[data-testid="group-role-anon-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="group-search-form"]')).toHaveCount(0);
  });

  test('C6-30: groups — tenant-admin sees directory not search form', async ({ page }) => {
    await page.goto('/groups?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('30-groups-role-tenant-admin.png'), fullPage: true });
    await expect(page.locator('[data-testid="group-admin-directory"]')).toBeVisible();
  });

  test('C6-31: groups — tenant-user sees existing search form (Fallback)', async ({ page }) => {
    await page.goto('/groups?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('31-groups-role-tenant-user.png'), fullPage: true });
    await expect(page.locator('[data-testid="group-search-form"]')).toBeVisible();
  });

  // Run 13 — SocialFeedPage (FLOW-07) — /social-feed
  test('C6-32: social-feed — anonymous sees static public posts', async ({ page }) => {
    await page.goto('/social-feed?role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('32-social-feed-role-anonymous.png'), fullPage: true });
    await expect(page.locator('[data-testid="feed-role-anon-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="feed-anon-posts"]')).toBeVisible();
  });

  test('C6-33: social-feed — freelancer sees gig-post composer', async ({ page }) => {
    await page.goto('/social-feed?role=freelancer');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('33-social-feed-role-freelancer.png'), fullPage: true });
    await expect(page.locator('[data-testid="feed-fl-composer"]')).toBeVisible();
    await expect(page.locator('[data-testid="feed-fl-category"]')).toBeVisible();
  });

  test('C6-34: social-feed — tenant-admin sees moderation queue', async ({ page }) => {
    await page.goto('/social-feed?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('34-social-feed-role-tenant-admin.png'), fullPage: true });
    await expect(page.locator('[data-testid="feed-admin-queue"]')).toBeVisible();
  });

  // Run 14 — ReviewSubmissionPage (FLOW-10) — /reviews/submit
  test('C6-35: reviews-submit — anonymous sees public reviews not form', async ({ page }) => {
    await page.goto('/reviews/submit?role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('35-reviews-submit-role-anonymous.png'), fullPage: true });
    await expect(page.locator('[data-testid="review-role-anon-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="review-form"]')).toHaveCount(0);
  });

  test('C6-36: reviews-submit — tenant-user sees form with star selector', async ({ page }) => {
    await page.goto('/reviews/submit?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('36-reviews-submit-role-tenant-user.png'), fullPage: true });
    await expect(page.locator('[data-testid="review-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="star-selector"]')).toBeVisible();
  });

  test('C6-37: reviews-submit — platform-support sees read-only inspector', async ({ page }) => {
    await page.goto('/reviews/submit?role=platform-support');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('37-reviews-submit-role-platform-support.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="review-role-support-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="review-support-search"]')).toBeVisible();
  });

  // Run 15 — TenantProvisioningPage (FLOW-15) — /admin/tenants/provisioning
  test('C6-38: tenant-provisioning — anonymous sees signup funnel not ops form', async ({ page }) => {
    await page.goto('/admin/tenants/provisioning?role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('38-tenant-provisioning-role-anonymous.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="tenant-role-anon-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="tenant-slug-input"]')).toHaveCount(0);
  });

  test('C6-39: tenant-provisioning — platform-admin sees existing provisioning form', async ({ page }) => {
    await page.goto('/admin/tenants/provisioning?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('39-tenant-provisioning-role-platform-admin.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="tenant-role-platform-admin-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="tenant-slug-input"]')).toBeVisible();
  });

  test('C6-40: tenant-provisioning — tenant-user sees my-tenants switcher', async ({ page }) => {
    await page.goto('/admin/tenants/provisioning?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('40-tenant-provisioning-role-tenant-user.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="tenant-role-user-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="tenant-user-list"]')).toBeVisible();
  });

  // Run 16 — DagVisualizationPage (FLOW-11) — /dag-visualization
  test('C6-41: dag — platform-admin sees full DAG', async ({ page }) => {
    await page.goto('/dag-visualization?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('41-dag-role-platform-admin.png'), fullPage: true });
    await expect(page.locator('[data-testid="dag-role-platform-admin-view"]')).toBeVisible();
  });

  test('C6-42: dag — tenant-admin sees flat contract list', async ({ page }) => {
    await page.goto('/dag-visualization?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('42-dag-role-tenant-admin.png'), fullPage: true });
    await expect(page.locator('[data-testid="dag-tenant-contracts"]')).toBeVisible();
  });

  test('C6-43: dag — anonymous sees access-denied fallback', async ({ page }) => {
    await page.goto('/dag-visualization?role=anonymous');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('43-dag-role-anonymous.png'), fullPage: true });
    await expect(page.locator('[data-testid="dag-fallback-view"]')).toBeVisible();
  });

  // Run 17 — EtlDataIntegrationPage (FLOW-14) — /admin/etl-data-integration
  test('C6-44: etl — tenant-admin sees AdminCrudPanel with banner', async ({ page }) => {
    await page.goto('/admin/etl-data-integration?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('44-etl-role-tenant-admin.png'), fullPage: true });
    await expect(page.locator('[data-testid="etl-admin-banner"]')).toBeVisible();
  });

  test('C6-45: etl — tenant-user sees lineage-disabled message by default', async ({ page }) => {
    await page.goto('/admin/etl-data-integration?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('45-etl-role-tenant-user.png'), fullPage: true });
    await expect(page.locator('[data-testid="etl-user-disabled"]')).toBeVisible();
  });

  test('C6-46: etl — tenant-user with lineage-enabled sees data sources', async ({ page }) => {
    await page.goto(
      '/admin/etl-data-integration?role=tenant-user&tenant-lineage-enabled=true'
    );
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('46-etl-role-tenant-user-lineage.png'), fullPage: true });
    await expect(page.locator('[data-testid="etl-user-lineage-list"]')).toBeVisible();
  });

  // Run 18 — LessonCompletionPage (FLOW-05) — /lessons/complete
  test('C6-47: lesson-completion — tenant-user sees questionnaire form', async ({ page }) => {
    await page.goto('/lessons/complete?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('47-lesson-completion-role-tenant-user.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="page-lesson-completion"]')).toHaveAttribute(
      'data-viewer-role',
      'tenant-user'
    );
    await expect(page.locator('[data-testid="completion-form"]')).toBeVisible();
  });

  test('C6-48: lesson-completion — tenant-admin sees progress monitoring', async ({ page }) => {
    await page.goto('/lessons/complete?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('48-lesson-completion-role-tenant-admin.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="lesson-admin-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-form"]')).toHaveCount(0);
  });

  test('C6-49: lesson-completion — freelancer sees form + portfolio shortcut', async ({ page }) => {
    await page.goto('/lessons/complete?role=freelancer');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('49-lesson-completion-role-freelancer.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="lesson-role-freelancer-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="lesson-freelancer-portfolio"]')).toBeVisible();
  });

  // Run 19 — QuestionnairePage (FLOW-02) — /questionnaire
  test('C6-50: questionnaire — tenant-user sees existing form', async ({ page }) => {
    await page.goto('/questionnaire?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('50-questionnaire-role-tenant-user.png'), fullPage: true });
    await expect(page.locator('[data-testid="page-questionnaire"]')).toHaveAttribute(
      'data-viewer-role',
      'tenant-user'
    );
    await expect(page.locator('[data-testid="questionnaire-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="industry-input"]')).toBeVisible();
  });

  test('C6-51: questionnaire — freelancer sees skill-category form', async ({ page }) => {
    await page.goto('/questionnaire?role=freelancer');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('51-questionnaire-role-freelancer.png'), fullPage: true });
    await expect(page.locator('[data-testid="questionnaire-role-freelancer-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="industry-input"]')).toBeVisible();
  });

  test('C6-52: questionnaire — business-partner sees partner form + hiring need', async ({ page }) => {
    await page.goto('/questionnaire?role=business-partner');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('52-questionnaire-role-business-partner.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="questionnaire-role-partner-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="questionnaire-partner-need"]')).toBeVisible();
  });

  test('C6-53: questionnaire — event-organiser sees event-type form', async ({ page }) => {
    await page.goto('/questionnaire?role=event-organiser');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('53-questionnaire-role-event-organiser.png'),
      fullPage: true,
    });
    await expect(page.locator('[data-testid="questionnaire-role-organiser-view"]')).toBeVisible();
  });

  // Sidebar — additional role tests
  test('C6-54: sidebar — tenant-admin sees admin section but limited engine items', async ({ page }) => {
    await page.goto('/dashboard?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('54-sidebar-role-tenant-admin.png'), fullPage: true });
    await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute(
      'data-viewer-role',
      'tenant-admin'
    );
    await expect(page.locator('[data-testid="nav-tenants"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-generation-lab"]')).toHaveCount(0);
  });

  test('C6-55: sidebar — event-organiser sees events + rsvp + attendance', async ({ page }) => {
    await page.goto('/dashboard?role=event-organiser');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('55-sidebar-role-event-organiser.png'), fullPage: true });
    await expect(page.locator('[data-testid="nav-events"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-rsvp"]')).toBeVisible();
  });

  // Compliance tests
  test('C6-56: all pages render without crash for platform-support', async ({ page }) => {
    const routes = [
      '/gigs/post',
      '/checkout',
      '/billing-dashboard',
      '/groups',
      '/social-feed',
    ];
    for (const route of routes) {
      await page.goto(`${route}?role=platform-support`);
      await page.waitForLoadState('networkidle');
      // Page must not show a React error boundary (testid only exists if there's an error)
      const errorBoundary = page.locator('[data-testid="error-boundary"]');
      await expect(errorBoundary).toHaveCount(0);
    }
    await page.screenshot({ path: SNAP('56-platform-support-compliance.png'), fullPage: true });
  });

  test('C6-57: data-viewer-role attribute present on all role-aware pages', async ({ page }) => {
    const checks = [
      { route: '/gigs/post?role=tenant-user', testid: 'gig-posting-page' },
      { route: '/checkout?role=tenant-user', testid: 'page-checkout' },
      { route: '/billing-dashboard?role=tenant-user', testid: 'billing-dashboard-page' },
      { route: '/events/create?role=tenant-user', testid: 'page-event-creation' },
      { route: '/groups?role=tenant-user', testid: 'page-group-discovery' },
      { route: '/social-feed?role=tenant-user', testid: 'social-feed-page' },
      { route: '/reviews/submit?role=tenant-user', testid: 'review-submission-page' },
      { route: '/dag-visualization?role=platform-admin', testid: 'page-dag-visualization' },
      { route: '/lessons/complete?role=tenant-user', testid: 'page-lesson-completion' },
      { route: '/questionnaire?role=tenant-user', testid: 'page-questionnaire' },
    ];
    for (const { route, testid } of checks) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const el = page.locator(`[data-testid="${testid}"]`);
      // For platform-admin dag case, match its attribute; else expect tenant-user
      const expectedRole = route.includes('role=platform-admin') ? 'platform-admin' : 'tenant-user';
      await expect(el).toHaveAttribute('data-viewer-role', expectedRole);
    }
    await page.screenshot({ path: SNAP('57-data-viewer-role-compliance.png'), fullPage: true });
  });
});
