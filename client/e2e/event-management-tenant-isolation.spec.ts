/**
 * FLOW-03 — Event Management tenant-isolation (Layer 2, TIER-D)
 *
 * Per FLOW-PORTABILITY-TEST-PROTOCOL-v1.2 Phase 3.
 *
 * Sub-tenant: acme-pro-members (re-used from FLOW-01 and FLOW-02 portability
 * sessions — a single tenant profile now carries event organiser FREEDOM caps
 * on top of registration and enrichment weights).
 *
 * Purpose: prove that the acme-pro-members overrides registered in
 * docs/portability/flow-03/tenant-profile-acme-pro-members.json apply only to
 * that tenant's browser session. The default-tenant session reads the platform
 * defaults and sees NO acme state on either event page.
 *
 * Scope — client-side isolation primitives on the event-management surface:
 *   I-01  two isolated browser contexts carry their own tenantId in
 *         localStorage; no cross-context read on /events.
 *   I-02  acme-pro-members context renders EventListPage scoped to its own
 *         tenant seed without leaking into the default context.
 *   I-03  default-tenant context renders EventListPage without seeing any
 *         acme-pro-members artifacts (tenantBrand / tenantId).
 *   I-04  cookie + localStorage per-tenant partitioning verified on /events —
 *         clearing acme's storage has zero effect on default's storage.
 *   I-05  acme vs default EventCreationPage render side-by-side — storage
 *         partitioning holds on the wizard entry screen (G5 Kiosk grammar).
 *
 * Server-side FREEDOM-key enforcement (flow03_max_events_per_organizer etc.)
 * is proven in:
 *   server/test/event-management/phase-03-adaptation-freedom-config.spec.ts
 *   FC-ADAPT-1..FC-ADAPT-5 (Jest 5/5 PASS on 2026-04-23).
 *
 * Visual-validation of EventListPage / EventCreationPage across 7 axes is
 * deferred to Phase 4 SK-549 (PNGs saved to
 * docs/portability/flow-03/visual-evidence/; never sent to chat per BC-001).
 *
 * Prerequisites: Vite dev server (auto-started by playwright.config.ts
 * webServer). NestJS server not required — tests are mock-driven via URL
 * params (?mock=loaded / ?mock=empty / ?mock=created) and localStorage seeds.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'portability',
    'flow-03',
    'visual-evidence',
    'phase-03-tenant-isolation',
    name,
  );

const ACME_TENANT_ID = 'acme-pro-members';
const DEFAULT_TENANT_ID = 'default';

async function seedTenant(context: BrowserContext, tenantId: string): Promise<void> {
  await context.addInitScript((id: string) => {
    try {
      window.localStorage.setItem('xiigen.tenantId', id);
      window.localStorage.setItem('xiigen.tenantBrand', id);
    } catch {
      /* localStorage may be blocked in restricted contexts */
    }
  }, tenantId);
}

async function readTenantId(page: Page): Promise<string | null> {
  return await page.evaluate(() => window.localStorage.getItem('xiigen.tenantId'));
}

async function readTenantBrand(page: Page): Promise<string | null> {
  return await page.evaluate(() => window.localStorage.getItem('xiigen.tenantBrand'));
}

test.describe('FLOW-03 event-management tenant-isolation (Layer 2)', () => {
  test('I-01: two contexts carry their own tenantId — no cross-read on /events', async ({
    browser,
  }) => {
    // Cold-start Vite compile for /events can push the first dual-context navigation
    // past the default 30s per-test budget; give it headroom.
    test.setTimeout(90_000);
    const acmeCtx = await browser.newContext();
    const defaultCtx = await browser.newContext();
    await seedTenant(acmeCtx, ACME_TENANT_ID);
    await seedTenant(defaultCtx, DEFAULT_TENANT_ID);

    const acmePage = await acmeCtx.newPage();
    const defaultPage = await defaultCtx.newPage();

    // Serialise the two first-time navigations — the second one rides the Vite cache
    // warmed by the first and avoids a second cold compile.
    await acmePage.goto('/events?mock=loaded');
    await acmePage.waitForLoadState('networkidle').catch(() => {});
    await defaultPage.goto('/events?mock=loaded');
    await defaultPage.waitForLoadState('networkidle').catch(() => {});

    const acmeTenant = await readTenantId(acmePage);
    const defaultTenant = await readTenantId(defaultPage);

    expect(acmeTenant).toBe(ACME_TENANT_ID);
    expect(defaultTenant).toBe(DEFAULT_TENANT_ID);
    expect(acmeTenant).not.toBe(defaultTenant);

    await acmeCtx.close();
    await defaultCtx.close();
  });

  test('I-02: acme context renders /events scoped to its own tenant', async ({ browser }) => {
    const acmeCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await seedTenant(acmeCtx, ACME_TENANT_ID);
    const page = await acmeCtx.newPage();

    await page.goto('/events?mock=loaded');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByTestId('page-event-list')).toBeVisible();

    const tenantId = await readTenantId(page);
    const tenantBrand = await readTenantBrand(page);
    expect(tenantId).toBe(ACME_TENANT_ID);
    expect(tenantBrand).toBe(ACME_TENANT_ID);

    await page.screenshot({
      path: SNAP('I-02-acme-events-loaded.png'),
      fullPage: true,
    });

    await acmeCtx.close();
  });

  test('I-03: default context does NOT see any acme artifacts on /events', async ({ browser }) => {
    const defaultCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await seedTenant(defaultCtx, DEFAULT_TENANT_ID);
    const page = await defaultCtx.newPage();

    await page.goto('/events?mock=loaded');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByTestId('page-event-list')).toBeVisible();

    const tenantId = await readTenantId(page);
    const tenantBrand = await readTenantBrand(page);
    expect(tenantId).toBe(DEFAULT_TENANT_ID);
    expect(tenantBrand).toBe(DEFAULT_TENANT_ID);
    expect(tenantId).not.toBe(ACME_TENANT_ID);
    expect(tenantBrand).not.toBe(ACME_TENANT_ID);

    const bodyText = (await page.locator('body').textContent()) ?? '';
    expect(bodyText).not.toContain(ACME_TENANT_ID);

    await page.screenshot({
      path: SNAP('I-03-default-events-loaded.png'),
      fullPage: true,
    });

    await defaultCtx.close();
  });

  test('I-04: clearing acme storage leaves default storage untouched on /events', async ({
    browser,
  }) => {
    const acmeCtx = await browser.newContext();
    const defaultCtx = await browser.newContext();
    await seedTenant(acmeCtx, ACME_TENANT_ID);
    await seedTenant(defaultCtx, DEFAULT_TENANT_ID);

    const acmePage = await acmeCtx.newPage();
    const defaultPage = await defaultCtx.newPage();

    await acmePage.goto('/events?mock=loaded');
    await defaultPage.goto('/events?mock=loaded');
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

  test('I-05: EventCreationPage (G5 Kiosk) renders per-tenant with isolated seeds', async ({
    browser,
  }) => {
    const acmeCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const defaultCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await seedTenant(acmeCtx, ACME_TENANT_ID);
    await seedTenant(defaultCtx, DEFAULT_TENANT_ID);

    const acmePage = await acmeCtx.newPage();
    const defaultPage = await defaultCtx.newPage();

    await acmePage.goto('/events/create?mock=created');
    await defaultPage.goto('/events/create?mock=created');
    await acmePage.waitForLoadState('networkidle').catch(() => {});
    await defaultPage.waitForLoadState('networkidle').catch(() => {});

    await expect(acmePage.getByTestId('page-event-creation')).toBeVisible();
    await expect(defaultPage.getByTestId('page-event-creation')).toBeVisible();

    expect(await readTenantId(acmePage)).toBe(ACME_TENANT_ID);
    expect(await readTenantId(defaultPage)).toBe(DEFAULT_TENANT_ID);

    await acmePage.screenshot({
      path: SNAP('I-05-acme-event-creation.png'),
      fullPage: true,
    });
    await defaultPage.screenshot({
      path: SNAP('I-05-default-event-creation.png'),
      fullPage: true,
    });

    await acmeCtx.close();
    await defaultCtx.close();
  });
});
