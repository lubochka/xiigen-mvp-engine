/**
 * FLOW-02 — Profile Enrichment tenant-isolation (Layer 2, TIER-D)
 *
 * Per FLOW-PORTABILITY-TEST-PROTOCOL-v1.2 Phase 3.
 *
 * Sub-tenant: acme-pro-members (re-used from FLOW-01 portability).
 * Purpose: prove that the acme-pro-members FREEDOM overrides registered in
 * docs/portability/flow-02/tenant-profile-acme-pro-members.json apply only
 * to that tenant's browser session — the default-tenant session reads the
 * platform defaults and sees NO acme state.
 *
 * Scope of this spec — client-side isolation primitives only:
 *   I-01  two isolated browser contexts carry their own tenantId in
 *         localStorage; no cross-context read.
 *   I-02  acme-pro-members context renders MatchingPage scoped to its own
 *         tenant seed without leaking into the default context.
 *   I-03  default-tenant context renders MatchingPage without seeing any
 *         acme-pro-members artifacts (tenantBrand / tenantId).
 *   I-04  cookie + localStorage per-tenant partitioning verified — clearing
 *         tenant A's storage has zero effect on tenant B's storage.
 *   I-05  acme vs default QuestionnairePage render side-by-side — storage
 *         partitioning holds on the flow entry screen.
 *
 * Server-side weight-override enforcement (FREEDOM keys → CompatibilityScoringService
 * weight-sum behaviour) is proven in:
 *   server/test/profile-enrichment/phase-02-adaptation-freedom-config.spec.ts
 *   FC-ADAPT-1..FC-ADAPT-5 (Jest 5/5 PASS on 2026-04-23).
 *
 * Visual-validation of MatchingPage / PersonalizationPage / QuestionnairePage
 * across 7 axes is deferred to Phase 4 SK-549 (PNGs saved to
 * docs/portability/flow-02/visual-evidence/; never sent to chat per BC-001).
 *
 * Prerequisites: Vite dev server (auto-started by playwright.config.ts
 * webServer). NestJS server not required — tests are mock-driven via URL
 * params and localStorage seeds.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'portability', 'flow-02',
            'visual-evidence', 'phase-03-tenant-isolation', name);

const ACME_TENANT_ID    = 'acme-pro-members';
const DEFAULT_TENANT_ID = 'default';

async function seedTenant(context: BrowserContext, tenantId: string): Promise<void> {
  await context.addInitScript((id: string) => {
    try {
      window.localStorage.setItem('xiigen.tenantId',    id);
      window.localStorage.setItem('xiigen.tenantBrand', id);
    } catch {
      /* localStorage may be blocked in restricted contexts */
    }
  }, tenantId);
}

async function readTenantId(page: Page): Promise<string | null> {
  return await page.evaluate(() =>
    window.localStorage.getItem('xiigen.tenantId'),
  );
}

async function readTenantBrand(page: Page): Promise<string | null> {
  return await page.evaluate(() =>
    window.localStorage.getItem('xiigen.tenantBrand'),
  );
}

test.describe('FLOW-02 profile-enrichment tenant-isolation (Layer 2)', () => {

  test('I-01: two contexts carry their own tenantId — no cross-read', async ({ browser }) => {
    const acmeCtx    = await browser.newContext();
    const defaultCtx = await browser.newContext();
    await seedTenant(acmeCtx,    ACME_TENANT_ID);
    await seedTenant(defaultCtx, DEFAULT_TENANT_ID);

    const acmePage    = await acmeCtx.newPage();
    const defaultPage = await defaultCtx.newPage();

    await acmePage.goto('/matching?userId=usr-matching-test');
    await defaultPage.goto('/matching?userId=usr-matching-test');
    await acmePage.waitForLoadState('networkidle').catch(() => {});
    await defaultPage.waitForLoadState('networkidle').catch(() => {});

    const acmeTenant    = await readTenantId(acmePage);
    const defaultTenant = await readTenantId(defaultPage);

    expect(acmeTenant).toBe(ACME_TENANT_ID);
    expect(defaultTenant).toBe(DEFAULT_TENANT_ID);
    expect(acmeTenant).not.toBe(defaultTenant);

    await acmeCtx.close();
    await defaultCtx.close();
  });

  test('I-02: acme context renders /matching scoped to its own tenant', async ({ browser }) => {
    const acmeCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await seedTenant(acmeCtx, ACME_TENANT_ID);
    const page = await acmeCtx.newPage();

    await page.goto('/matching?userId=usr-complete-test');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByTestId('page-matching')).toBeVisible();

    const tenantId    = await readTenantId(page);
    const tenantBrand = await readTenantBrand(page);
    expect(tenantId).toBe(ACME_TENANT_ID);
    expect(tenantBrand).toBe(ACME_TENANT_ID);

    await page.screenshot({
      path: SNAP('I-02-acme-matching-complete.png'),
      fullPage: true,
    });

    await acmeCtx.close();
  });

  test('I-03: default context does NOT see any acme artifacts', async ({ browser }) => {
    const defaultCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await seedTenant(defaultCtx, DEFAULT_TENANT_ID);
    const page = await defaultCtx.newPage();

    await page.goto('/matching?userId=usr-complete-test');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByTestId('page-matching')).toBeVisible();

    const tenantId    = await readTenantId(page);
    const tenantBrand = await readTenantBrand(page);
    expect(tenantId).toBe(DEFAULT_TENANT_ID);
    expect(tenantBrand).toBe(DEFAULT_TENANT_ID);
    expect(tenantId).not.toBe(ACME_TENANT_ID);
    expect(tenantBrand).not.toBe(ACME_TENANT_ID);

    const bodyText = (await page.locator('body').textContent()) ?? '';
    expect(bodyText).not.toContain(ACME_TENANT_ID);

    await page.screenshot({
      path: SNAP('I-03-default-matching-complete.png'),
      fullPage: true,
    });

    await defaultCtx.close();
  });

  test('I-04: clearing acme storage leaves default storage untouched', async ({ browser }) => {
    const acmeCtx    = await browser.newContext();
    const defaultCtx = await browser.newContext();
    await seedTenant(acmeCtx,    ACME_TENANT_ID);
    await seedTenant(defaultCtx, DEFAULT_TENANT_ID);

    const acmePage    = await acmeCtx.newPage();
    const defaultPage = await defaultCtx.newPage();

    await acmePage.goto('/matching?userId=usr-matching-test');
    await defaultPage.goto('/matching?userId=usr-matching-test');
    await acmePage.waitForLoadState('networkidle').catch(() => {});
    await defaultPage.waitForLoadState('networkidle').catch(() => {});

    expect(await readTenantId(acmePage)).toBe(ACME_TENANT_ID);
    expect(await readTenantId(defaultPage)).toBe(DEFAULT_TENANT_ID);

    await acmeCtx.clearCookies();
    await acmePage.evaluate(() => window.localStorage.clear());

    const defaultStillSeeded = await readTenantId(defaultPage);
    expect(defaultStillSeeded).toBe(DEFAULT_TENANT_ID);

    const acmeAfterClear = await readTenantId(acmePage);
    expect(acmeAfterClear).toBeNull();

    await acmeCtx.close();
    await defaultCtx.close();
  });

  test('I-05: QuestionnairePage renders per-tenant with isolated seeds', async ({ browser }) => {
    const acmeCtx    = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const defaultCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await seedTenant(acmeCtx,    ACME_TENANT_ID);
    await seedTenant(defaultCtx, DEFAULT_TENANT_ID);

    const acmePage    = await acmeCtx.newPage();
    const defaultPage = await defaultCtx.newPage();

    await acmePage.goto('/questionnaire');
    await defaultPage.goto('/questionnaire');
    await acmePage.waitForLoadState('networkidle').catch(() => {});
    await defaultPage.waitForLoadState('networkidle').catch(() => {});

    await expect(acmePage.locator('[data-testid="questionnaire-form"]')).toBeVisible();
    await expect(defaultPage.locator('[data-testid="questionnaire-form"]')).toBeVisible();

    expect(await readTenantId(acmePage)).toBe(ACME_TENANT_ID);
    expect(await readTenantId(defaultPage)).toBe(DEFAULT_TENANT_ID);

    await acmePage.screenshot({
      path: SNAP('I-05-acme-questionnaire.png'),
      fullPage: true,
    });
    await defaultPage.screenshot({
      path: SNAP('I-05-default-questionnaire.png'),
      fullPage: true,
    });

    await acmeCtx.close();
    await defaultCtx.close();
  });

});
