/**
 * RUN-65 post-fix PNG regen sweep — gap-verification specs.
 *
 * Captures PNGs for the 7 flows touched in RUN-49/50/52/63/64 so we can
 * visually verify that the rendering gap was actually closed. If any PNG
 * still shows the prior CRUD default / error-as-normal state, the fix
 * needs to be reapplied.
 *
 * Flows + expected verdicts (per the examination records):
 *   FLOW-18 visual-flow-engine: TopologyViewer empty-state (NOT red error)
 *   FLOW-29 adaptive-rag-deep-research: Grammar 4 topology canvas (reference)
 *   FLOW-36 feature-registry: FeatureMatrixScreen with 6 FT records
 *   FLOW-37 design-system-governance: StackPortingScreen with coupling badges
 *   FLOW-38 rag-quality-feedback: RagQualityScreen with patterns + outcomes
 *   FLOW-39 oss-curriculum: OssCurriculumScreen (platform-admin branch)
 *   FLOW-40 client-push: ClientPushScreen (platform-admin branch)
 *   FLOW-45 history-bootstrap: HistoryBootstrapScreen
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'run-65-regen', name);

test.describe('RUN-65 post-fix PNG regen sweep', () => {
  test('FLOW-45 history-bootstrap — platform-admin sees HistoryBootstrapScreen', async ({
    page,
  }) => {
    await page.goto('/admin/history-bootstrap?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');

    // Gap verification: the purpose-built screen is mounted, not AdminCrudPanel
    await expect(page.locator('[data-testid="history-bootstrap-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="bootstrap-status-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="patterns-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="summaries-section"]')).toBeVisible();
    // Seed data renders
    await expect(page.locator('[data-testid="patterns-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="summaries-list"]')).toBeVisible();

    await page.screenshot({
      path: SNAP('flow-45-history-bootstrap-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-36 feature-registry — platform-admin sees FeatureMatrixScreen', async ({ page }) => {
    await page.goto('/admin/feature-registry?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="feature-matrix-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="feature-matrix-list"]')).toBeVisible();
    // 6 seeded FT records
    await expect(
      page.locator('[data-testid="feature-matrix-screen"] .feature-matrix-row'),
    ).toHaveCount(6);

    await page.screenshot({
      path: SNAP('flow-36-feature-registry-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-37 design-system-governance — platform-admin sees StackPortingScreen', async ({
    page,
  }) => {
    await page.goto('/admin/design-system-governance?role=platform-admin&hideChrome=1', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('[data-testid="stack-porting-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="classifications-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="reports-section"]')).toBeVisible();

    await page.screenshot({
      path: SNAP('flow-37-design-system-governance-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-38 rag-quality-feedback — platform-admin sees RagQualityScreen', async ({ page }) => {
    await page.goto('/admin/rag-quality-feedback?role=platform-admin&hideChrome=1', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('[data-testid="rag-quality-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="patterns-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="outcomes-section"]')).toBeVisible();

    await page.screenshot({
      path: SNAP('flow-38-rag-quality-feedback-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-39 oss-curriculum — platform-admin sees OssCurriculumScreen (NOT SAMPLE_COURSES)', async ({
    page,
  }) => {
    await page.goto('/admin/oss-curriculum?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');

    // Verify we're in the platform-admin branch (not contributor/public branches)
    await expect(page.locator('[data-testid="oss-role-platform-view"]')).toBeVisible();
    // Verify the purpose-built screen is mounted (not AdminCrudPanel)
    await expect(page.locator('[data-testid="oss-platform-curriculum-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="oss-curriculum-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="tier-assignments-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="shadow-runs-section"]')).toBeVisible();

    await page.screenshot({
      path: SNAP('flow-39-oss-curriculum-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-40 client-push — platform-admin sees ClientPushScreen', async ({ page }) => {
    await page.goto('/admin/client-push?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');

    // Platform-admin branch active
    await expect(page.locator('[data-testid="cp-role-platform-admin-screen"]')).toBeVisible();
    // Purpose-built screen mounted
    await expect(page.locator('[data-testid="client-push-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="connections-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="events-section"]')).toBeVisible();

    await page.screenshot({
      path: SNAP('flow-40-client-push-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-29 adaptive-rag-deep-research — platform-admin topology canvas still renders (reference)', async ({
    page,
  }) => {
    await page.goto(
      '/admin/adaptive-rag-deep-research?role=platform-admin&run=stalled&select=multi-hop-graph-traversal&hideChrome=1',
    );
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="topology-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="topology-user-intent"]')).toBeVisible();

    await page.screenshot({
      path: SNAP('flow-29-adaptive-rag-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-12 subscription-billing — tenant-user invoice list (RUN-77 before)', async ({
    page,
  }) => {
    await page.goto('/billing-dashboard?role=tenant-user&hideChrome=1');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: SNAP('flow-12-subscription-billing-tenant-user.png'),
      fullPage: true,
    });
  });

  test('RUN-84 batch: FLOW-02 profile questionnaire', async ({ page }) => {
    await page.goto('/questionnaire?role=tenant-user&hideChrome=1');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('flow-02-profile-enrichment-tenant-user.png'),
      fullPage: true,
    });
  });

  test('RUN-84 batch: FLOW-03 event-creation wizard', async ({ page }) => {
    await page.goto('/events/create?role=tenant-user&hideChrome=1');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('flow-03-event-creation-tenant-user.png'), fullPage: true });
  });

  test('RUN-84 batch: FLOW-04 event-attendance RSVP', async ({ page }) => {
    await page.goto('/rsvp?role=tenant-user&hideChrome=1');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('flow-04-event-attendance-rsvp-tenant-user.png'),
      fullPage: true,
    });
  });

  test('RUN-84 batch: FLOW-06 user-groups discovery', async ({ page }) => {
    await page.goto('/groups?role=tenant-user&hideChrome=1');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('flow-06-user-groups-tenant-user.png'), fullPage: true });
  });

  test('RUN-84 batch: FLOW-07 social-feed', async ({ page }) => {
    await page.goto('/social-feed?role=tenant-user&hideChrome=1');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('flow-07-social-feed-tenant-user.png'), fullPage: true });
  });

  test('RUN-84 batch: FLOW-08 marketplace discovery', async ({ page }) => {
    await page.goto('/marketplace/discovery?role=tenant-user&hideChrome=1');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('flow-08-marketplace-discovery-tenant-user.png'),
      fullPage: true,
    });
  });

  test('RUN-84 batch: FLOW-09 ticket purchase', async ({ page }) => {
    await page.goto('/tickets/purchase?role=tenant-user&hideChrome=1');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('flow-09-ticket-purchase-tenant-user.png'),
      fullPage: true,
    });
  });

  test('RUN-84 batch: FLOW-10 review-submission', async ({ page }) => {
    await page.goto('/reviews/submit?role=tenant-user&hideChrome=1');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('flow-10-reviews-submit-tenant-user.png'), fullPage: true });
  });

  test('RUN-84 batch: FLOW-17 freelancer gig posting', async ({ page }) => {
    await page.goto('/gigs/post?role=freelancer&hideChrome=1');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('flow-17-gig-posting-freelancer.png'), fullPage: true });
  });

  test('RUN-84 batch: FLOW-32 sharable-flows marketplace', async ({ page }) => {
    await page.goto('/admin/sharable-flows-marketplace?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('flow-32-sharable-flows-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-05 completion-gamification — tenant-user lesson-complete celebration (RUN-83)', async ({
    page,
  }) => {
    await page.goto('/lessons/complete?role=tenant-user&mock=submitted&hideChrome=1');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="gamification-feedback"]')).toBeVisible();
    await expect(page.locator('[data-testid="streak-count"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('flow-05-completion-gamification-tenant-user.png'),
      fullPage: true,
    });
  });

  test('FLOW-01 user-registration — anonymous signup page (RUN-82)', async ({ page }) => {
    await page.goto('/register?role=anonymous&hideChrome=1');
    await page.waitForLoadState('networkidle');
    // CRITICAL: sidebar hidden for anonymous
    expect(await page.locator('[data-testid="sidebar"]').count()).toBe(0);
    await page.screenshot({
      path: SNAP('flow-01-user-registration-anonymous.png'),
      fullPage: true,
    });
  });

  test('FLOW-28 blog-cms-modules — anonymous public reader (RUN-81, sidebar must be hidden)', async ({
    page,
  }) => {
    await page.goto('/blog-cms-modules?role=anonymous&hideChrome=1');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="blog-role-reader-view"]')).toBeVisible();
    // CRITICAL: sidebar hidden for anonymous
    const sidebarCount = await page.locator('[data-testid="sidebar"]').count();
    expect(sidebarCount).toBe(0);

    await page.screenshot({
      path: SNAP('flow-28-blog-cms-modules-anonymous.png'),
      fullPage: true,
    });
  });

  test('FLOW-22 cms-publishing — anonymous public reader (RUN-80, sidebar must be hidden)', async ({
    page,
  }) => {
    await page.goto('/cms-publishing?role=anonymous&hideChrome=1');
    await page.waitForLoadState('networkidle');

    // Reader view visible
    await expect(page.locator('[data-testid="cms-role-reader-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="cms-article-body"]')).toBeVisible();
    // CRITICAL: sidebar MUST be hidden for anonymous (RUN-49 G3 behaviour)
    const sidebarCount = await page.locator('[data-testid="sidebar"]').count();
    expect(sidebarCount).toBe(0);

    await page.screenshot({
      path: SNAP('flow-22-cms-publishing-anonymous.png'),
      fullPage: true,
    });
  });

  test('FLOW-20 ads-platform — platform-admin campaign dashboard (RUN-79)', async ({ page }) => {
    await page.goto('/admin/ads-platform?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="ads-platform-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="ads-campaign-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="ads-campaign-list"]')).toBeVisible();
    // 5 seeded campaigns
    await expect(page.locator('[data-testid^="ads-campaign-CMP-"]')).toHaveCount(5);
    // Critical: NO "Failed to fetch" visible in default state
    const failedToFetchCount = await page.locator('text=Failed to fetch').count();
    expect(failedToFetchCount).toBe(0);

    await page.screenshot({
      path: SNAP('flow-20-ads-platform-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-16 marketplace-payments — tenant-user Stripe checkout (RUN-78)', async ({ page }) => {
    await page.goto('/checkout?role=tenant-user&hideChrome=1');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="checkout-order-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkout-payment-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkout-total"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkout-pay-button"]')).toBeVisible();
    // Critical: NO visible "Cart ID" label
    const cartIdVisibleLabel = await page.locator('label[for="cartId"]').count();
    expect(cartIdVisibleLabel).toBe(0);

    await page.screenshot({
      path: SNAP('flow-16-marketplace-payments-tenant-user.png'),
      fullPage: true,
    });
  });

  test('FLOW-24 ai-safety-moderation — platform-admin moderator queue (RUN-75)', async ({
    page,
  }) => {
    // FLOW-24 route is /ai-safety-moderation (NOT /admin/) — matches App.tsx
    await page.goto('/ai-safety-moderation?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="asm-role-platform-admin-view"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="asm-platform-moderator-queue-section"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="asm-moderator-queue"]')).toBeVisible();
    await expect(page.locator('[data-testid="asm-queue-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="asm-queue-detail-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="asm-detail-safety-checks"]')).toBeVisible();
    // 5 seeded cases
    await expect(page.locator('[data-testid^="asm-queue-item-"]')).toHaveCount(5);

    await page.screenshot({
      path: SNAP('flow-24-ai-safety-moderation-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-25 bfa-cross-flow-governance — platform-admin conflict scan matrix (RUN-74)', async ({
    page,
  }) => {
    await page.goto('/admin/bfa-cross-flow-governance?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="bfa-admin-conflict-matrix-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="bfa-conflict-scan-matrix"]')).toBeVisible();
    await expect(page.locator('[data-testid="bfa-scan-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="bfa-scan-detail-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="bfa-scan-detail-decision"]')).toBeVisible();
    // 5 seeded registrations
    await expect(page.locator('[data-testid^="bfa-scan-row-"]')).toHaveCount(5);

    await page.screenshot({
      path: SNAP('flow-25-bfa-cross-flow-governance-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-27 human-interaction-gate — platform-admin review queue inbox (RUN-73)', async ({
    page,
  }) => {
    await page.goto('/admin/human-interaction-gate?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="hig-role-platform-admin-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="hig-platform-admin-queue-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="hig-review-queue"]')).toBeVisible();
    await expect(page.locator('[data-testid="hig-queue-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="hig-queue-detail-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="hig-queue-detail-recommendation"]')).toBeVisible();
    // 5 seeded items
    await expect(page.locator('[data-testid^="hig-queue-item-"]')).toHaveCount(5);

    await page.screenshot({
      path: SNAP('flow-27-human-interaction-gate-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-35 meta-arbitration-engine — platform-admin verdict grid (RUN-72)', async ({
    page,
  }) => {
    await page.goto('/admin/meta-arbitration-engine?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="mae-verdict-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="mae-verdict-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="mae-detail-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="mae-detail-rationale"]')).toBeVisible();
    // 6 seeded rounds render as rows
    await expect(page.locator('[data-testid^="mae-round-row-"]')).toHaveCount(6);

    await page.screenshot({
      path: SNAP('flow-35-meta-arbitration-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-34 marketplace-plugin-adapter — platform-admin adapter lifecycle canvas (RUN-70)', async ({
    page,
  }) => {
    await page.goto('/admin/marketplace-plugin-adapter?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="mpa-role-curator-view"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="mpa-curator-adapter-lifecycle-section"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="adapter-lifecycle-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="adapter-detail-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="adapter-detail-panel"]')).toHaveAttribute(
      'data-node-selected',
      'payload-translated',
    );

    await page.screenshot({
      path: SNAP('flow-34-marketplace-plugin-adapter-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-26 meta-flow-engine — platform-admin topology canvas (RUN-69)', async ({ page }) => {
    await page.goto('/admin/meta-flow-engine?role=platform-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');

    // Platform-admin console active
    await expect(page.locator('[data-testid="mfe-admin-console"]')).toBeVisible();
    // Topology section + canvas mounted
    await expect(page.locator('[data-testid="mfe-admin-topology-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="meta-topology-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="meta-detail-panel"]')).toBeVisible();
    // Default selected node is test-code-generator (running state per RUN_STATE seed)
    await expect(page.locator('[data-testid="meta-detail-panel"]')).toHaveAttribute(
      'data-node-selected',
      'test-code-generator',
    );

    await page.screenshot({
      path: SNAP('flow-26-meta-flow-engine-platform-admin.png'),
      fullPage: true,
    });
  });

  test('FLOW-18 visual-flow-engine — tenant-admin n8n layout (+ TopologyViewer empty-state)', async ({
    page,
  }) => {
    await page.goto('/admin/visual-flow/canvas?role=tenant-admin&hideChrome=1');
    await page.waitForLoadState('networkidle');

    // Tenant-admin n8n 3-column layout active
    await expect(page.locator('[data-testid="fce-tenant-admin-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="fce-palette"]')).toBeVisible();
    await expect(page.locator('[data-testid="fce-canvas-column"]')).toBeVisible();
    await expect(page.locator('[data-testid="fce-chat-aside"]')).toBeVisible();

    // RUN-64 gap verification: if TopologyViewer is showing the empty-state
    // (backend not seeded), it should show the neutral grey card, NOT the
    // old red "backend may be unreachable" error. Either outcome is
    // acceptable — what matters is the OLD red error text is gone.
    const oldErrorVisible = await page.locator('text=backend may be unreachable').count();
    expect(oldErrorVisible).toBe(0);

    await page.screenshot({
      path: SNAP('flow-18-visual-flow-engine-tenant-admin.png'),
      fullPage: true,
    });
  });
});
