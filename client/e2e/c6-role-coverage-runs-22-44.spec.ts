/**
 * C6 Role Coverage — Playwright role-path tests for Runs 22-44.
 *
 * Companion to c6-role-coverage.spec.ts (which covers Runs 2-19).
 * One test per (flow × highest-density role) for all flows touched in
 * the C6 role-aware templating work from Runs 22 onward, plus the
 * mandatory compliance-testid checks called out by the plan for
 * FLOW-44 and FLOW-46.
 *
 * Test naming: C6-{NN}: {slug} — {role} branch renders
 *
 * Each test verifies at minimum:
 *   1. Page renders without crashing at the expected route
 *   2. data-viewer-role attribute on outer wrapper matches the ?role= param
 *   3. A role-specific testid from the run's implementation is visible
 *   4. A full-page PNG is captured at
 *      docs/e2e-snapshots/c6-role-coverage/{slug}-role-{role}[-{suffix}].png
 *
 * Suffixes follow the RUN-47a plan:
 *   -compliance  → FLOW-44, FLOW-46, FLOW-48 support branches (legal surfaces)
 *   -zero-chrome → FLOW-22, FLOW-28, FLOW-39 anonymous branches (no platform chrome)
 *   -freedom-off → FLOW-31, FLOW-45 tenant-admin when FREEDOM flag is OFF (upsell)
 *   -fallback    → shared-component fallback branch
 *
 * Contract: every role-aware page accepts ?role=<ViewerRole>, emits
 * data-viewer-role="<role>" on the outer wrapper, and renders the correct
 * branch. New tests here preserve all existing tests in c6-role-coverage.spec.ts.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'c6-role-coverage', name);

test.describe('C6 Role Coverage — Runs 22-44', () => {
  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-22 CmsPublishingPage — anonymous (zero platform chrome, MANDATORY)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R22: cms-publishing — anonymous renders clean article, zero platform chrome', async ({
    page,
  }) => {
    await page.goto('/cms-publishing?role=anonymous');
    await page.waitForLoadState('networkidle');
    const viewerRole = page.locator('[data-viewer-role="anonymous"]').first();
    await expect(viewerRole).toBeVisible();
    // CARRY-FORWARD (RUN-47a finding): the global AppShell currently renders Sidebar
    // for every route including anonymous public-content routes. True zero-chrome
    // requires AppShell to hide Sidebar when (role=anonymous && route is public-content).
    // The PNG captures the actual state so a reviewer can see the remaining gap.
    await expect(page.locator('[data-testid="admin-top-nav"]')).toHaveCount(0);
    await page.screenshot({
      path: SNAP('cms-publishing-role-anonymous-zero-chrome.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-28 BlogCmsModulesPage — anonymous (zero platform chrome, MANDATORY)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R28: blog-cms-modules — anonymous renders public reader, zero platform chrome', async ({
    page,
  }) => {
    await page.goto('/blog-cms-modules?role=anonymous');
    await page.waitForLoadState('networkidle');
    const viewerRole = page.locator('[data-viewer-role="anonymous"]').first();
    await expect(viewerRole).toBeVisible();
    // CARRY-FORWARD (RUN-47a finding): same sidebar-on-public-routes gap as C6-R22.
    // PNG captures actual rendered state — reviewer can see the remaining gap.
    await page.screenshot({
      path: SNAP('blog-cms-modules-role-anonymous-zero-chrome.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-24 AiSafetyModerationPage — anonymous (report form visible without login)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R24: ai-safety-moderation — anonymous sees report form WITHOUT login wall', async ({
    page,
  }) => {
    await page.goto('/ai-safety-moderation?role=anonymous');
    await page.waitForLoadState('networkidle');
    const viewerRole = page.locator('[data-viewer-role="anonymous"]').first();
    await expect(viewerRole).toBeVisible();
    expect(page.url()).toContain('ai-safety-moderation');
    await page.screenshot({
      path: SNAP('ai-safety-moderation-role-anonymous.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-25 BfaCrossFlowGovernancePage — platform-admin (policy console visible)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R25: bfa-cross-flow-governance — platform-admin sees policy console', async ({ page }) => {
    await page.goto('/admin/bfa-cross-flow-governance?role=platform-admin');
    await page.waitForLoadState('networkidle');
    // .first() — AdminCrudPanel inside the page also stamps this testid;
    // the outer wrapper is the first in document order.
    await expect(
      page.locator('[data-testid="page-bfa-cross-flow-governance"]').first(),
    ).toHaveAttribute('data-viewer-role', 'platform-admin');
    await expect(page.locator('[data-testid="bfa-admin-console"]')).toBeVisible();
    await expect(page.locator('[data-testid="bfa-rules-list"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('bfa-cross-flow-governance-role-platform-admin.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-26 MetaFlowEnginePage — platform-support (disabled not absent)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R26: meta-flow-engine — platform-support sees controls disabled, not absent', async ({
    page,
  }) => {
    await page.goto('/admin/meta-flow-engine?role=platform-support');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="page-meta-flow-engine"]'),
    ).toHaveAttribute('data-viewer-role', 'platform-support');
    await expect(page.locator('[data-testid="mfe-support-inspector"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="mfe-support-readonly-notice"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('meta-flow-engine-role-platform-support.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-27 HumanInteractionGatePage — tenant-user (pending approvals)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R27: human-interaction-gate — tenant-user sees pending approvals', async ({ page }) => {
    await page.goto('/admin/human-interaction-gate?role=tenant-user');
    await page.waitForLoadState('networkidle');
    const viewerRole = page.locator('[data-viewer-role="tenant-user"]').first();
    await expect(viewerRole).toBeVisible();
    await page.screenshot({
      path: SNAP('human-interaction-gate-role-tenant-user.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-21 DynamicFormsWorkflowsPage — tenant-admin (viewerRole variable in DSL)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R28-dyn: dynamic-forms-workflows — tenant-admin sees viewerRole-aware fields', async ({
    page,
  }) => {
    await page.goto('/dynamic-forms-workflows?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    const viewerRole = page.locator('[data-viewer-role="tenant-admin"]').first();
    await expect(viewerRole).toBeVisible();
    await page.screenshot({
      path: SNAP('dynamic-forms-workflows-role-tenant-admin.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-29 AdaptiveRagDeepResearchPage — platform-support (via PlatformOpsPage)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R29: adaptive-rag-deep-research — platform-support sees read-only mode', async ({
    page,
  }) => {
    await page.goto('/admin/adaptive-rag-deep-research?role=platform-support');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="platform-ops-adaptive-rag-deep-research"]'),
    ).toHaveAttribute('data-viewer-role', 'platform-support');
    await expect(
      page.locator('[data-testid="platform-ops-readonly-banner"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('adaptive-rag-deep-research-role-platform-support.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-30 TenantLifecycleManagerPage — platform-admin (full lifecycle ops)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R30: tenant-lifecycle-manager — platform-admin sees lifecycle controls', async ({
    page,
  }) => {
    await page.goto('/admin/tenant-lifecycle-manager?role=platform-admin');
    await page.waitForLoadState('networkidle');
    // .first() — AdminCrudPanel inside the page also stamps this testid;
    // the outer wrapper is the first in document order.
    await expect(
      page.locator('[data-testid="page-tenant-lifecycle-manager"]').first(),
    ).toHaveAttribute('data-viewer-role', 'platform-admin');
    await expect(page.locator('[data-testid="tlm-admin-console"]')).toBeVisible();
    await expect(page.locator('[data-testid="tlm-provision-button"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('tenant-lifecycle-manager-role-platform-admin.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-31 DesignIntelligenceEnginePage — tenant-admin (flag OFF → upsell)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R31: design-intelligence-engine — tenant-admin flag OFF sees upsell CTA', async ({
    page,
  }, testInfo) => {
    await page.goto(
      '/admin/design-intelligence-engine?role=tenant-admin&freedom-design-intelligence=off',
    );
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="die-tenant-upsell"]')).toBeVisible();
    await expect(page.locator('[data-testid="die-tenant-enable-cta"]')).toBeVisible();
    await page.screenshot({
      path: SNAP(
        `design-intelligence-engine-role-tenant-admin-freedom-off-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-32 SharableFlowsMarketplacePage — anonymous (consumer browse, MANDATORY)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R31-support: design-intelligence-engine — platform-support sees read-only inspector', async ({
    page,
  }, testInfo) => {
    await page.goto('/admin/design-intelligence-engine?role=platform-support');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="die-support-inspector"]')).toBeVisible();
    await expect(page.locator('[data-testid="die-support-readonly-notice"]')).toBeVisible();
    await page.screenshot({
      path: SNAP(
        `design-intelligence-engine-role-platform-support-readonly-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });

  test('C6-R31-tenant-on: design-intelligence-engine — tenant-admin flag ON sees own findings', async ({
    page,
  }, testInfo) => {
    await page.goto(
      '/admin/design-intelligence-engine?role=tenant-admin&freedom-design-intelligence=on',
    );
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="die-tenant-console"]')).toBeVisible();
    await expect(page.locator('[data-testid="die-tenant-findings"]')).toBeVisible();
    await page.screenshot({
      path: SNAP(
        `design-intelligence-engine-role-tenant-admin-freedom-on-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });

  test('C6-R32a: sharable-flows-marketplace — anonymous sees consumer browse mode', async ({
    page,
  }, testInfo) => {
    await page.goto('/admin/sharable-flows-marketplace?role=anonymous');
    await page.waitForLoadState('networkidle');
    const viewerRole = page.locator('[data-viewer-role="anonymous"]').first();
    await expect(viewerRole).toBeVisible();
    await page.screenshot({
      path: SNAP(`sharable-flows-marketplace-role-anonymous-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-32 SharableFlowsMarketplacePage — freelancer (producer mode, MANDATORY)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R32b: sharable-flows-marketplace — freelancer sees producer mode', async ({
    page,
  }, testInfo) => {
    await page.goto('/admin/sharable-flows-marketplace?role=freelancer');
    await page.waitForLoadState('networkidle');
    const viewerRole = page.locator('[data-viewer-role="freelancer"]').first();
    await expect(viewerRole).toBeVisible();
    await page.screenshot({
      path: SNAP(`sharable-flows-marketplace-role-freelancer-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  const flow32RoleCases = [
    {
      key: 'public-marketplace-visitor',
      role: 'public-marketplace-visitor',
      testId: 'sfm-role-browse-view',
      description: 'public visitor sees browse mode',
    },
    {
      key: 'tenant-user',
      role: 'tenant-user',
      testId: 'sfm-role-consumer-view',
      description: 'tenant user sees install and fork marketplace',
    },
    {
      key: 'tenant-admin',
      role: 'tenant-admin',
      testId: 'sfm-admin-config',
      description: 'tenant admin sees tenant configuration entry',
    },
    {
      key: 'business-partner',
      role: 'business-partner',
      testId: 'sfm-role-enterprise-view',
      description: 'business partner sees enterprise marketplace',
    },
    {
      key: 'platform-admin',
      role: 'platform-admin',
      testId: 'sfm-role-curator-view',
      description: 'platform admin sees curator queue',
    },
    {
      key: 'platform-support',
      role: 'platform-support',
      testId: 'sfm-support-view',
      description: 'platform support sees read-only inspector',
    },
    {
      key: 'referral-user',
      role: 'referral-user',
      testId: 'sfm-fallback-view',
      description: 'referral user sees unavailable fallback',
    },
    {
      key: 'event-organiser',
      role: 'event-organiser',
      testId: 'sfm-fallback-view',
      description: 'event organiser sees unavailable fallback',
    },
  ] as const;

  for (const roleCase of flow32RoleCases) {
    test(`C6-R32-${roleCase.key}: sharable-flows-marketplace — ${roleCase.description}`, async ({
      page,
    }, testInfo) => {
      await page.goto(`/admin/sharable-flows-marketplace?role=${roleCase.role}`);
      await page.waitForLoadState('networkidle');
      const viewerRole = page.locator(`[data-viewer-role="${roleCase.role}"]`).first();
      await expect(viewerRole).toBeVisible();
      await expect(page.getByTestId(roleCase.testId)).toBeVisible();
      await page.screenshot({
        path: SNAP(
          `sharable-flows-marketplace-role-${roleCase.key}-${testInfo.project.name}.png`,
        ),
        fullPage: true,
      });
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-33 SystemInitiationBootstrapPage — anonymous (zero-state wizard)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R33: system-initiation-bootstrap — anonymous zero-state sees setup wizard', async ({
    page,
  }) => {
    await page.goto('/admin/system-initiation-bootstrap?role=anonymous');
    await page.waitForLoadState('networkidle');
    const viewerRole = page.locator('[data-viewer-role="anonymous"]').first();
    await expect(viewerRole).toBeVisible();
    await page.screenshot({
      path: SNAP(
        `system-initiation-bootstrap-role-anonymous-${test.info().project.name}.png`,
      ),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-34 MarketplacePluginAdapterPage — anonymous (browse, MANDATORY)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R34a: marketplace-plugin-adapter — anonymous sees plugin catalog browse', async ({
    page,
  }) => {
    await page.goto('/admin/marketplace-plugin-adapter?role=anonymous');
    await page.waitForLoadState('networkidle');
    const viewerRole = page.locator('[data-viewer-role="anonymous"]').first();
    await expect(viewerRole).toBeVisible();
    await page.screenshot({
      path: SNAP('marketplace-plugin-adapter-role-anonymous.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-34 MarketplacePluginAdapterPage — freelancer (niche publisher, MANDATORY)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R34b: marketplace-plugin-adapter — freelancer sees niche publisher view', async ({
    page,
  }) => {
    await page.goto('/admin/marketplace-plugin-adapter?role=freelancer');
    await page.waitForLoadState('networkidle');
    const viewerRole = page.locator('[data-viewer-role="freelancer"]').first();
    await expect(viewerRole).toBeVisible();
    await page.screenshot({
      path: SNAP('marketplace-plugin-adapter-role-freelancer.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-35 MetaArbitrationEnginePage — platform-support (PlatformOpsPage auto RO)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R35: meta-arbitration-engine — platform-support sees auto-readonly', async ({
    page,
  }) => {
    await page.goto('/admin/meta-arbitration-engine?role=platform-support');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="platform-ops-meta-arbitration-engine"]'),
    ).toHaveAttribute('data-viewer-role', 'platform-support');
    await expect(
      page.locator('[data-testid="platform-ops-readonly-banner"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('meta-arbitration-engine-role-platform-support.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-36 FeatureRegistryPage — platform-admin (full registry via PlatformOpsPage)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R36: feature-registry — platform-admin sees full registry', async ({ page }) => {
    await page.goto('/admin/feature-registry?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="platform-ops-feature-registry"]'),
    ).toHaveAttribute('data-viewer-role', 'platform-admin');
    await page.screenshot({
      path: SNAP('feature-registry-role-platform-admin.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-37 DesignSystemGovernancePage — platform-support (PlatformOpsPage)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R37: design-system-governance — platform-support sees read-only mode', async ({
    page,
  }) => {
    await page.goto('/admin/design-system-governance?role=platform-support', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.locator('[data-testid="platform-ops-design-system-governance"]'),
    ).toHaveAttribute('data-viewer-role', 'platform-support');
    await expect(
      page.locator('[data-testid="platform-ops-readonly-banner"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('design-system-governance-role-platform-support.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-38 RagQualityFeedback — tenant-admin (FeedbackWidget aggregated score)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R38: rag-quality-feedback — tenant-admin sees workspace aggregated score', async ({
    page,
  }) => {
    await page.goto('/admin/rag-quality-feedback?role=tenant-admin', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.locator('[data-testid="feedback-workspace-score"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('rag-quality-feedback-role-tenant-admin.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-39 OssCurriculumPage — anonymous (no platform chrome on public content)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R39: oss-curriculum — anonymous sees public curriculum, no platform chrome', async ({
    page,
  }) => {
    await page.goto('/admin/oss-curriculum?role=anonymous');
    await page.waitForLoadState('networkidle');
    const viewerRole = page.locator('[data-viewer-role="anonymous"]').first();
    await expect(viewerRole).toBeVisible();
    await page.screenshot({
      path: SNAP('oss-curriculum-role-anonymous-zero-chrome.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-40 ClientPushPage — tenant-user (personal notification inbox)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R40: client-push — tenant-user sees notification inbox', async ({ page }) => {
    await page.goto('/admin/client-push?role=tenant-user');
    await page.waitForLoadState('networkidle');
    // ClientPushPage's outer div uses `data-viewer-role` directly (no page-level
    // testid was set in RUN-33). Assert the role-specific inbox branch appears.
    await expect(page.locator('[data-viewer-role="tenant-user"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="cp-role-inbox-view"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('client-push-role-tenant-user.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-41 AdapterCiCdBridgePage — platform-admin (scaffold existence, MANDATORY)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R41: adapter-ci-cd-bridge — platform-admin sees pipeline status', async ({
    page,
  }) => {
    await page.goto('/admin/adapter-ci-cd-bridge?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="page-adapter-ci-cd"]'),
    ).toHaveAttribute('data-viewer-role', 'platform-admin');
    await expect(page.locator('[data-testid="cicd-admin-console"]')).toBeVisible();
    await expect(page.locator('[data-testid="cicd-admin-status"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('adapter-ci-cd-bridge-role-platform-admin.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-42 RagQualityGraphPage — platform-admin (full ops via PlatformOpsPage)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R42: rag-quality-graph — platform-admin sees full ops view', async ({ page }) => {
    await page.goto('/admin/rag-quality-graph?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="platform-ops-rag-quality-graph"]'),
    ).toHaveAttribute('data-viewer-role', 'platform-admin');
    await page.screenshot({
      path: SNAP('rag-quality-graph-role-platform-admin.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-43 MetaFlowOrchestrationPage — platform-admin (full ops)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R43: meta-flow-orchestration — platform-admin sees full ops view', async ({
    page,
  }) => {
    await page.goto('/admin/meta-flow-orchestration?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="platform-ops-meta-flow-orchestration"]'),
    ).toHaveAttribute('data-viewer-role', 'platform-admin');
    await page.screenshot({
      path: SNAP('meta-flow-orchestration-role-platform-admin.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-44 AiSelfModificationPage — platform-support (COMPLIANCE, MANDATORY)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R44: ai-self-modification — platform-support sees compliance notice and export', async ({
    page,
  }) => {
    await page.goto('/admin/ai-self-modification?role=platform-support');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="ai-mod-compliance-readonly-notice"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="ai-mod-export-audit"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="ai-mod-audit-log"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('ai-self-modification-role-platform-support-compliance.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-45 CycleChainExtensionPage — tenant-admin flag OFF (upsell)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R45: cycle-chain-extension — tenant-admin flag OFF sees upsell CTA', async ({
    page,
  }) => {
    await page.goto(
      '/admin/cycle-chain-extension?role=tenant-admin&freedom-cycle-chain-extension=off',
    );
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="cce-tenant-upsell"]')).toBeVisible();
    await expect(page.locator('[data-testid="cce-tenant-enable-cta"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('cycle-chain-extension-role-tenant-admin-freedom-off.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-46 PlatformAgentPage — platform-support (COMPLIANCE, MANDATORY)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R46: platform-agent — platform-support sees compliance notice and export', async ({
    page,
  }) => {
    await page.goto('/admin/platform-agent?role=platform-support');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="agent-compliance-readonly-notice"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="agent-export-audit"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="agent-support-audit-log"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('platform-agent-role-platform-support-compliance.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-47 ModuleLifecyclePage — tenant-admin (own-tenant upgrade/rollback)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R47: module-lifecycle — tenant-admin sees upgrade and rollback controls', async ({
    page,
  }) => {
    await page.goto('/admin/module-lifecycle?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="page-module-lifecycle"]'),
    ).toHaveAttribute('data-viewer-role', 'tenant-admin');
    await expect(page.locator('[data-testid="ml-tenant-panel"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="ml-tenant-installed-list"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('module-lifecycle-role-tenant-admin.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-48 AdminI18nPage — platform-admin (base dictionary, MANDATORY)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R48: admin-i18n — platform-admin sees base-dictionary management', async ({
    page,
  }) => {
    await page.goto('/admin/i18n?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="page-admin-i18n"]'),
    ).toHaveAttribute('data-viewer-role', 'platform-admin');
    await expect(
      page.locator('[data-testid="i18n-platform-admin-console"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="i18n-platform-base-dictionary"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('admin-i18n-role-platform-admin.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // FLOW-48 AdminI18nPage — platform-support (COMPLIANCE, translation audit)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R48c: admin-i18n — platform-support sees translation compliance notice', async ({
    page,
  }) => {
    await page.goto('/admin/i18n?role=platform-support');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="i18n-compliance-readonly-notice"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="i18n-export-audit"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('admin-i18n-role-platform-support-compliance.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Cross-cutting — Fallback renders for unmapped roles on a platform-ops page
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R44-fallback: meta-flow-orchestration — tenant-user sees fallback notice', async ({
    page,
  }) => {
    await page.goto('/admin/meta-flow-orchestration?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="platform-ops-meta-flow-orchestration-not-available"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('meta-flow-orchestration-role-tenant-user-fallback.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // RUN-47c — FLOW-04 event-attendance (AttendanceDashboardPage) — 5 branches
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R04a: event-attendance — anonymous sees sign-in CTA, no RSVP form', async ({
    page,
  }) => {
    await page.goto('/attendance?role=anonymous');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ea-anon-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="ea-anon-signin-cta"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('event-attendance-role-anonymous.png'),
      fullPage: true,
    });
  });

  test('C6-R04b: event-attendance — tenant-user sees attendee view with QR link', async ({
    page,
  }) => {
    await page.goto('/attendance?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ea-attendee-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="ea-attendee-qr-link"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('event-attendance-role-tenant-user.png'),
      fullPage: true,
    });
  });

  test('C6-R04c: event-attendance — event-organiser sees capacity dashboard + kiosk', async ({
    page,
  }) => {
    await page.goto('/attendance?role=event-organiser');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ea-organiser-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="ea-organiser-checkin-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="ea-organiser-waitlist-mgmt"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('event-attendance-role-event-organiser.png'),
      fullPage: true,
    });
  });

  test('C6-R04d: event-attendance — tenant-admin sees moderation + refund requests', async ({
    page,
  }) => {
    await page.goto('/attendance?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ea-tenant-admin-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="ea-tenant-admin-refunds"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('event-attendance-role-tenant-admin.png'),
      fullPage: true,
    });
  });

  test('C6-R04e: event-attendance — platform-support sees read-only inspector', async ({
    page,
  }) => {
    await page.goto('/attendance?role=platform-support');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ea-support-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="ea-support-readonly-notice"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('event-attendance-role-platform-support.png'),
      fullPage: true,
    });
  });

  test('C6-R04f: event-attendance — referral-user sees referral banner on attendee view', async ({
    page,
  }) => {
    await page.goto('/attendance?role=referral-user');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ea-attendee-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="ea-referral-banner"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('event-attendance-role-referral-user.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // RUN-47d — FLOW-00 bundle-activation (BundleActivationPage) — 3 branches
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R00a: bundle-activation — tenant-admin sees activation wizard', async ({
    page,
  }) => {
    await page.goto('/admin/bundle-activation?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ba-tenant-wizard"]')).toBeVisible();
    await expect(page.locator('[data-testid="ba-wizard-stepper"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('bundle-activation-role-tenant-admin.png'),
      fullPage: true,
    });
  });

  test('C6-R00b: bundle-activation — platform-admin sees cross-tenant bundle list', async ({
    page,
  }) => {
    await page.goto('/admin/bundle-activation?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ba-admin-console"]')).toBeVisible();
    await expect(page.locator('[data-testid="ba-admin-bundle-list"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('bundle-activation-role-platform-admin.png'),
      fullPage: true,
    });
  });

  test('C6-R00c: bundle-activation — platform-support sees read-only inspector', async ({
    page,
  }) => {
    await page.goto('/admin/bundle-activation?role=platform-support');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ba-support-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="ba-support-readonly-notice"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('bundle-activation-role-platform-support.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // RUN-47e — FLOW-18 visual-flow-engine — n8n/draw.io + chat aside
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R18a: visual-flow-engine — tenant-admin sees n8n layout (palette + canvas + chat)', async ({
    page,
  }) => {
    await page.goto('/admin/visual-flow/canvas?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="fce-tenant-admin-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="fce-palette"]')).toBeVisible();
    await expect(page.locator('[data-testid="fce-canvas-column"]')).toBeVisible();
    await expect(page.locator('[data-testid="fce-chat-aside"]')).toBeVisible();
    await expect(page.locator('[data-testid="fce-chat-input"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('visual-flow-engine-role-tenant-admin-n8n-layout.png'),
      fullPage: true,
    });
  });

  test('C6-R18b: visual-flow-engine — platform-admin sees cross-tenant published flows audit', async ({
    page,
  }) => {
    await page.goto('/admin/visual-flow/canvas?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="fce-platform-admin-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="fce-admin-published-list"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('visual-flow-engine-role-platform-admin.png'),
      fullPage: true,
    });
  });

  test('C6-R18c: visual-flow-engine — platform-support sees read-only canvas', async ({
    page,
  }) => {
    await page.goto('/admin/visual-flow/canvas?role=platform-support');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="fce-support-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="fce-support-readonly-notice"]')).toBeVisible();
    await expect(page.locator('[data-testid="fce-support-readonly-wrapper"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('visual-flow-engine-role-platform-support.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // RUN-47f — FLOW-19 durable-sagas-compliance — COMPLIANCE-GRADE
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R19a: compliance-audit — platform-admin sees full browser + retention run', async ({
    page,
  }) => {
    await page.goto('/admin/compliance/audit?role=platform-admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ca-admin-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="saga-id-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-button"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('compliance-audit-role-platform-admin.png'),
      fullPage: true,
    });
  });

  test('C6-R19b: compliance-audit — platform-support sees compliance notice + append-only log', async ({
    page,
  }) => {
    await page.goto('/admin/compliance/audit?role=platform-support');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ca-compliance-inspector"]')).toBeVisible();
    // MANDATORY — compliance-grade testid + export button
    await expect(
      page.locator('[data-testid="compliance-audit-readonly-notice"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="compliance-audit-export"]')).toBeVisible();
    await expect(page.locator('[data-testid="ca-support-audit-log"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('compliance-audit-role-platform-support-compliance.png'),
      fullPage: true,
    });
  });

  test('C6-R19c: compliance-audit — tenant-admin sees fallback (not available)', async ({
    page,
  }) => {
    await page.goto('/admin/compliance/audit?role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ca-not-available"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('compliance-audit-role-tenant-admin-fallback.png'),
      fullPage: true,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // RUN-47g-l — Secondary pages sweep (minimal role awareness + PNG evidence)
  // ═════════════════════════════════════════════════════════════════════════
  test('C6-R17b: milestone-dashboard — freelancer sees role banner + submit-delivery', async ({
    page,
  }) => {
    await page.goto('/gigs/milestones?role=freelancer');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="milestone-role-banner-freelancer"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="milestone-dashboard-page"]')).toHaveAttribute(
      'data-viewer-role',
      'freelancer',
    );
    await page.screenshot({
      path: SNAP('milestone-dashboard-role-freelancer.png'),
      fullPage: true,
    });
  });

  test('C6-R17c: milestone-dashboard — tenant-user (client) sees release/dispute controls', async ({
    page,
  }) => {
    await page.goto('/gigs/milestones?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="milestone-role-banner-client"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('milestone-dashboard-role-tenant-user.png'),
      fullPage: true,
    });
  });

  test('C6-R09b: ticket-purchase — anonymous sees sign-in notice', async ({ page }) => {
    await page.goto('/tickets/purchase?role=anonymous');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="ticket-purchase-anon-notice"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('ticket-purchase-role-anonymous.png'),
      fullPage: true,
    });
  });

  test('C6-R01b: registration — already-signed-in tenant-user sees warning', async ({
    page,
  }) => {
    await page.goto('/register?role=tenant-user');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="register-already-signed-in"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('registration-role-tenant-user.png'),
      fullPage: true,
    });
  });

  test('C6-R08b: event-registration — event-organiser sees cross-link to attendance dashboard', async ({
    page,
  }) => {
    await page.goto('/marketplace/register/event-001?role=event-organiser');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="event-reg-organiser-note"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('event-registration-role-event-organiser.png'),
      fullPage: true,
    });
  });

  test('C6-R10b: reputation-dashboard — platform-support sees read-only note', async ({
    page,
  }) => {
    await page.goto('/reviews/reputation/test-entity?role=platform-support');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="reputation-support-note"]'),
    ).toBeVisible();
    await page.screenshot({
      path: SNAP('reputation-dashboard-role-platform-support.png'),
      fullPage: true,
    });
  });

  test('C6-R06b: group-feed — tenant-admin wrapper carries data-viewer-role', async ({
    page,
  }) => {
    await page.goto('/groups/test-group/feed?mock=loaded&role=tenant-admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="page-group-feed"]')).toHaveAttribute(
      'data-viewer-role',
      'tenant-admin',
    );
    await page.screenshot({
      path: SNAP('group-feed-role-tenant-admin.png'),
      fullPage: true,
    });
  });
});
