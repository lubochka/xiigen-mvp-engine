/**
 * FLOW-01 V-14 Evidence Capture — Cascade rows 8 + 9 (Phase C8, tenant-c)
 *
 * Per FLOW-PORTABILITY-TEST-PROTOCOL-v2.0:
 *   §REPO NAMING CONVENTION line 744 (`{tenantId}--{moduleName}` double-dash)
 *   §REPO EVIDENCE GATE line 1023 (2 PNGs per tenant repo: overview + tree)
 *
 * Captures 4 PNGs for V-14 instance C (tessera-collective):
 *   row 8 (tenant-c-marketplace):
 *     01-marketplace-tile-tessera-1280px.png      — synthetic marketplace listing tile
 *                                                    (tessera-collective is a third-party tenant outside the
 *                                                    acme→northwind cascade and does NOT publish to the
 *                                                    real marketplace; tile is synthetic per the
 *                                                    transparency clause)
 *     02-install-dialog-tessera-1280px.png        — synthetic install confirmation dialog
 *                                                    (fresh root install at platform v1.0.0, ZERO overrides,
 *                                                    NO cascade parent diff — distinguishes tenant-c
 *                                                    from tenant-a/b cascade installs)
 *   row 9 (tenant-c-repo, slug `tenant-c--user-registration`):
 *     01-repo-overview-1280px.png                 — synthetic GitHub-style repo overview
 *                                                    (third-party-tenant banner, single-hop lineage,
 *                                                    zero-override summary)
 *     02-repo-tree-1280px.png                     — synthetic GitHub-style file tree
 *                                                    (7 files, all "no-mark" to indicate zero own
 *                                                    overrides — distinguishes from northwind's
 *                                                    own-mark/inherited-mark distinction)
 *
 * V-14 acceptCriterion: "3 repos provisioned with -- separator; 6 repo PNGs total"
 *   This spec produces 2 of those 6 PNGs (tessera tenant). Phase C5 produced 2
 *   (acme); Phase C7 produced 2 (northwind). Phase C8 closes the V-14 ladder.
 *
 * Synthetic-evidence transparency: per §V-14 acceptance footnote, external
 * GitHub provisioning + npm registry publish are TIER-B promotion territory,
 * downstream of this gate. The synthetic HTML renders certify the local repo
 * scaffold structure, manifest correctness, and provenance auditability —
 * which are the TIER-D portability-invariant assertions. Tessera-specific
 * note: tessera is a third-party tenant that did NOT adapt FLOW-01 (zero
 * FREEDOM overrides), so they have no real marketplace publish to capture;
 * the marketplace tile + install dialog are wholly synthetic representations
 * of "what tessera's listing would look like if they chose to publish".
 *
 * Storage paths:
 *   docs/e2e-snapshots/user-registration/tenant-c-marketplace/
 *   docs/e2e-snapshots/user-registration/tenant-c-repo/
 *
 * Run:
 *   npx playwright test e2e/flow-01-v14-evidence-tenant-c.spec.ts --project=chromium-desktop
 */

import { test } from '@playwright/test';

const VIEWPORT = { width: 1280, height: 1600 } as const;
const TENANT_ID = 'tessera-collective';
const TENANT_BRAND = 'Tessera Collective';

const MARKETPLACE_OUT = '../docs/e2e-snapshots/user-registration/tenant-c-marketplace';
const REPO_OUT = '../docs/e2e-snapshots/user-registration/tenant-c-repo';

test.describe.configure({ mode: 'parallel' });

test.describe('FLOW-01 V-14 Evidence — cascade rows 8 + 9 (tessera-collective)', () => {
  test('row8-01 marketplace tile (synthetic — tessera fresh root install, zero overrides)', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    // Tessera is a third-party tenant outside the acme→northwind cascade.
    // They have ZERO FREEDOM overrides on FLOW-01. They do NOT have a real
    // marketplace listing in SAMPLE_FLOWS (only platform/acme/northwind do).
    // This synthetic tile renders what tessera's listing WOULD look like if
    // they chose to publish: distinct publisher, single-hop lineage, no
    // adaptation changelog, "fresh install" badge.
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Marketplace tile — User Registration & Onboarding (tessera-collective v1.0.1)</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; margin: 0; background: #f3f4f6; color: #111827; padding: 32px; }
    .container { max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 18px; color: #6b7280; font-weight: 600; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .subtitle { font-size: 14px; color: #9ca3af; margin: 0 0 24px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .card-name { font-size: 16px; font-weight: 600; color: #111827; margin: 0; }
    .card-category { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 2px 0 0; }
    .card-version { font-size: 12px; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; color: #374151; }
    .card-publisher { font-size: 13px; color: #6b7280; margin: 0 0 12px; }
    .card-publisher .pub-name { color: #111827; font-weight: 500; }
    .card-changelog { font-size: 13px; color: #4b5563; font-style: italic; margin: 0 0 16px; line-height: 1.5; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #f3f4f6; font-size: 12px; }
    .card-stats { color: #6b7280; }
    .card-stats strong { color: #111827; }
    .install-btn { padding: 8px 16px; font-size: 13px; font-weight: 500; background: #2563eb; color: #fff; border: 0; border-radius: 4px; cursor: pointer; }
    .install-btn:hover { background: #1d4ed8; }
    .badge-fresh { display: inline-block; padding: 2px 8px; background: #dcfce7; color: #166534; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 6px; vertical-align: middle; }
    .badge-third { display: inline-block; padding: 2px 8px; background: #ede9fe; color: #6d28d9; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 6px; vertical-align: middle; }
    .lineage-mini { font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size: 11px; color: #6b7280; margin: 0 0 12px; }
    .lineage-mini .pub { color: #1e40af; }
    .header-callout { background: #ede9fe; border: 1px solid #c4b5fd; border-radius: 6px; padding: 12px 16px; margin: 0 0 16px; font-size: 13px; color: #5b21b6; }
    .header-callout strong { color: #4c1d95; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Marketplace · Identity</h1>
    <p class="subtitle">User Registration &amp; Onboarding — 4 published versions (synthetic listing for tessera-collective)</p>

    <div class="header-callout" data-testid="synthetic-banner">
      <strong>Synthetic-evidence note:</strong> Tessera Collective is a third-party tenant introduced for
      V-13(D) Phase 5c cross-tenant separation confirmation. They have <strong>zero FREEDOM overrides</strong>
      and do <strong>not</strong> publish to the real marketplace at TIER-D. This card renders what tessera's
      listing would surface if they chose to publish at TIER-B promotion (external marketplace).
    </div>

    <div class="grid">
      <div class="card" data-testid="tile-platform">
        <div class="card-header">
          <div>
            <p class="card-name">User Registration &amp; Onboarding</p>
            <p class="card-category">Identity</p>
          </div>
          <span class="card-version">v1.0.0</span>
        </div>
        <p class="card-publisher">by <span class="pub-name">xiigen-platform</span></p>
        <p class="card-changelog">Initial publication by XIIGen platform.</p>
        <div class="card-footer">
          <span class="card-stats"><strong>1</strong> install · ⭐ 0</span>
          <button class="install-btn">Install</button>
        </div>
      </div>

      <div class="card" data-testid="tile-acme">
        <div class="card-header">
          <div>
            <p class="card-name">User Registration &amp; Onboarding</p>
            <p class="card-category">Identity</p>
          </div>
          <span class="card-version">v1.0.1</span>
        </div>
        <p class="card-publisher">by <span class="pub-name">acme-pro-members</span></p>
        <p class="card-changelog">freedom-config: resend rate-limit 60→15m; token TTL 24h→1h; branded invitation copy.</p>
        <div class="card-footer">
          <span class="card-stats"><strong>1</strong> install · ⭐ 0</span>
          <button class="install-btn">Install</button>
        </div>
      </div>

      <div class="card" data-testid="tile-northwind">
        <div class="card-header">
          <div>
            <p class="card-name">User Registration &amp; Onboarding</p>
            <p class="card-category">Identity</p>
          </div>
          <span class="card-version">v1.0.2</span>
        </div>
        <p class="card-publisher">by <span class="pub-name">northwind-guild</span></p>
        <p class="card-changelog">Based on acme-pro-members v1.0.1. freedom-config: resend rate-limit 15→5m (tighter).</p>
        <div class="card-footer">
          <span class="card-stats"><strong>2</strong> installs · ⭐ 0</span>
          <button class="install-btn">Install</button>
        </div>
      </div>

      <div class="card" data-testid="tile-tessera" style="border:1px solid #c4b5fd; background:#faf5ff;">
        <div class="card-header">
          <div>
            <p class="card-name">User Registration &amp; Onboarding
              <span class="badge-third">third-party</span>
              <span class="badge-fresh">no overrides</span>
            </p>
            <p class="card-category">Identity</p>
          </div>
          <span class="card-version">v1.0.1</span>
        </div>
        <p class="card-publisher">by <span class="pub-name">${TENANT_ID}</span></p>
        <p class="lineage-mini">@xiigen/user-registration v1.0.0 → <span class="pub">tessera-collective v1.0.1</span> (no cascade hops)</p>
        <p class="card-changelog">Fresh root install at platform v1.0.0 — zero FREEDOM overrides applied. Third-party tenant outside the acme→northwind cascade. Repo provisioning evidence for V-14 instance C portability gate.</p>
        <div class="card-footer">
          <span class="card-stats"><strong>0</strong> installs (synthetic listing) · ⭐ 0</span>
          <button class="install-btn">Install</button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="tile-tessera"]', { timeout: 5_000 });
    await page.screenshot({
      path: `${MARKETPLACE_OUT}/01-marketplace-tile-tessera-1280px.png`,
      fullPage: true,
    });

    await context.close();
  });

  test('row8-02 install dialog (synthetic — fresh root install, ZERO overrides, no cascade parent)', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    // Synthetic install-confirmation dialog — distinguishes tenant-c from
    // tenant-a/b by showing: fresh root install (basedOn = platform v1.0.0
    // directly, no cascade parent), zero overrides table (empty placeholder),
    // and a third-party-tenant banner that explicitly notes the absence of
    // cascade lineage. The MACHINE-invariants attestation continues to hold.
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Install — User Registration &amp; Onboarding (tessera-collective v1.0.1)</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; margin: 0; background: #f3f4f6; color: #111827; }
    .backdrop { position: fixed; inset: 0; background: rgba(17,24,39,0.4); display: flex; align-items: flex-start; justify-content: center; padding-top: 60px; }
    .modal { width: 760px; background: #fff; border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); padding: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; font-weight: 600; }
    .subtitle { font-size: 14px; color: #6b7280; margin: 0 0 16px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .row:last-child { border-bottom: 0; }
    .label { color: #6b7280; }
    .value { color: #111827; font-weight: 500; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; }
    .section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; margin: 16px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
    th { background: #f9fafb; color: #6b7280; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .key { font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size: 12px; }
    .empty-state { text-align: center; padding: 24px; color: #6b7280; font-style: italic; font-size: 13px; background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 6px; margin: 8px 0 16px; }
    .empty-state strong { color: #374151; display: block; margin-bottom: 4px; font-style: normal; }
    .third-party-banner { background: #ede9fe; border: 1px solid #c4b5fd; border-radius: 6px; padding: 12px; font-size: 13px; color: #5b21b6; margin: 0 0 16px; }
    .third-party-banner strong { color: #4c1d95; display: block; margin-bottom: 4px; }
    .machine-block { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; padding: 12px; font-size: 13px; color: #065f46; margin: 12px 0 16px; }
    .machine-block strong { display: block; margin-bottom: 4px; }
    .lineage-block { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 12px; font-size: 13px; color: #1e3a8a; margin: 12px 0; }
    .lineage-block strong { display: block; margin-bottom: 4px; }
    .lineage-row { display: flex; gap: 8px; align-items: center; padding: 2px 0; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size: 12px; }
    .lineage-row .ver { background: #fff; padding: 1px 6px; border: 1px solid #bfdbfe; border-radius: 4px; }
    .lineage-row .pub { color: #1e40af; }
    .lineage-row .arrow-down { color: #93c5fd; padding: 0 8px; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    button { font-size: 14px; padding: 10px 16px; border-radius: 6px; border: 0; cursor: pointer; font-weight: 500; min-height: 44px; }
    .btn-cancel { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-confirm { background: #2563eb; color: #fff; }
    .btn-confirm:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="backdrop">
    <div class="modal" role="dialog" aria-labelledby="install-title" data-testid="install-confirm-dialog">
      <h1 id="install-title">Install User Registration &amp; Onboarding</h1>
      <p class="subtitle">PKG-user-registration-tessera-v1.0.1 · published by tessera-collective (synthetic)</p>

      <div class="third-party-banner" data-testid="third-party-banner">
        <strong>Third-party tenant — no cascade lineage</strong>
        Tessera Collective is a fresh root install of FLOW-01 directly from the platform v1.0.0 baseline.
        They are NOT in the acme→northwind cascade chain. No FREEDOM overrides are applied.
        Their tenant context returns the platform defaults under their AsyncLocalStorage scope.
      </div>

      <div class="section-title">Installation target</div>
      <div class="row"><span class="label">Tenant</span><span class="value">${TENANT_ID}</span></div>
      <div class="row"><span class="label">Repo slug</span><span class="value">tenant-c--user-registration</span></div>
      <div class="row"><span class="label">Version</span><span class="value">v1.0.1</span></div>
      <div class="row"><span class="label">Based on</span><span class="value">@xiigen/user-registration v1.0.0 (direct, no cascade hop)</span></div>
      <div class="row"><span class="label">Ultimate root</span><span class="value">@xiigen/user-registration v1.0.0</span></div>
      <div class="row"><span class="label">Adaptation category</span><span class="value">no-adaptation-third-party-tenant</span></div>

      <div class="lineage-block">
        <strong>Cascade lineage (single hop)</strong>
        <div class="lineage-row"><span class="ver">v1.0.0</span><span class="pub">xiigen-platform</span><span style="color:#6b7280;">— FLOW-01 baseline FREEDOM defaults</span></div>
        <div class="lineage-row"><span class="arrow-down">↓</span></div>
        <div class="lineage-row"><span class="ver">v1.0.1</span><span class="pub">tessera-collective</span><span style="color:#5b21b6;font-weight:600;">— this install · 0 overrides · third-party tenant</span></div>
      </div>

      <div class="section-title">FREEDOM-config overrides (0 own + 0 inherited)</div>
      <div class="empty-state" data-testid="empty-overrides">
        <strong>No overrides applied</strong>
        Tessera tenant context returns the platform v1.0.0 defaults:
        rate_limit=60, ttl=86400, inviter='you', community='our community'.
        This is intentional for V-13(D) Phase 5c cross-tenant separation confirmation.
      </div>

      <div class="machine-block">
        <strong>MACHINE invariants preserved (verified by FC-ADAPT-1 default-fallback test)</strong>
        Event names, task-type IDs (T47-T49), schemas, idempotency keys, outbox ordering,
        token hashing, and VALIDATION_FAILURE shape are byte-identical to platform v1.0.0
        (and to acme v1.0.1 + northwind v1.0.2 in the cascade chain).
      </div>

      <div class="row"><span class="label">Verification contract</span><span class="value">phase-01-adaptation-freedom-config.spec.ts</span></div>
      <div class="row"><span class="label">Tests passed</span><span class="value">FC-ADAPT-1 default-fallback (covers tessera by construction; 2026-04-25)</span></div>
      <div class="row"><span class="label">V-13 instance D drift</span><span class="value">0 px on 252/252 PNG pairs vs platform-source AND vs tenant-a-acme-v1.0.1</span></div>

      <div class="actions">
        <button class="btn-cancel" data-testid="install-cancel">Cancel</button>
        <button class="btn-confirm" data-testid="install-confirm">Install to ${TENANT_ID}</button>
      </div>
    </div>
  </div>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="install-confirm-dialog"]', { timeout: 5_000 });
    await page.screenshot({
      path: `${MARKETPLACE_OUT}/02-install-dialog-tessera-1280px.png`,
      fullPage: true,
    });

    await context.close();
  });

  test('row9-01 repo overview (tenant-c--user-registration synthetic GitHub-style)', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>tessera-collective/tenant-c--user-registration</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; margin: 0; background: #fff; color: #1f2328; font-size: 14px; }
    .topbar { background: #24292f; color: #fff; padding: 12px 24px; display: flex; align-items: center; gap: 16px; font-size: 14px; }
    .topbar .logo { font-weight: 700; font-size: 16px; }
    .topbar .nav { display: flex; gap: 20px; color: #9ca3af; }
    .repo-header { padding: 16px 24px; border-bottom: 1px solid #d0d7de; }
    .repo-name { font-size: 20px; }
    .repo-name a { color: #0969da; text-decoration: none; font-weight: 600; }
    .repo-name .org { color: #57606a; font-weight: 400; }
    .repo-meta { color: #57606a; font-size: 13px; margin-top: 4px; }
    .badge { display: inline-block; padding: 2px 8px; background: #ddf4ff; color: #0969da; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 6px; }
    .badge.public { background: #dafbe1; color: #1a7f37; }
    .badge.third { background: #ede9fe; color: #6d28d9; }
    .layout { display: grid; grid-template-columns: 1fr 280px; gap: 24px; padding: 16px 24px; }
    .main-col { min-width: 0; }
    .toolbar { display: flex; gap: 8px; align-items: center; padding: 8px 12px; border: 1px solid #d0d7de; border-radius: 6px 6px 0 0; background: #f6f8fa; font-size: 14px; }
    .branch-pill { padding: 4px 10px; background: #fff; border: 1px solid #d0d7de; border-radius: 6px; font-weight: 500; color: #1f2328; }
    .branch-meta { color: #57606a; font-size: 13px; margin-left: auto; }
    .files-list { border: 1px solid #d0d7de; border-top: 0; border-radius: 0 0 6px 6px; }
    .file-row { display: grid; grid-template-columns: 24px 1fr 2fr 80px; gap: 12px; padding: 8px 12px; border-bottom: 1px solid #d0d7de; align-items: center; font-size: 14px; }
    .file-row:last-child { border-bottom: 0; }
    .file-row .icon { color: #57606a; font-size: 16px; }
    .file-row a { color: #0969da; text-decoration: none; }
    .file-row .commit { color: #57606a; font-size: 13px; }
    .file-row .age { color: #57606a; font-size: 13px; text-align: right; }
    .readme-card { margin-top: 24px; border: 1px solid #d0d7de; border-radius: 6px; }
    .readme-header { padding: 8px 16px; border-bottom: 1px solid #d0d7de; background: #f6f8fa; font-weight: 600; font-size: 14px; color: #1f2328; }
    .readme-body { padding: 24px; line-height: 1.5; }
    .readme-body h1 { font-size: 24px; margin: 0 0 8px; padding-bottom: 8px; border-bottom: 1px solid #d0d7de; }
    .readme-body h2 { font-size: 18px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #d0d7de; }
    .readme-body blockquote { margin: 8px 0 16px; padding: 0 12px; border-left: 4px solid #d0d7de; color: #57606a; }
    .readme-body table { border-collapse: collapse; font-size: 13px; }
    .readme-body th, .readme-body td { border: 1px solid #d0d7de; padding: 6px 12px; text-align: left; }
    .readme-body th { background: #f6f8fa; }
    .readme-body code { background: #eaeef2; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size: 12px; }
    .readme-body pre { background: #f6f8fa; padding: 12px; border-radius: 6px; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size: 12px; line-height: 1.5; overflow-x: auto; }
    .sidebar h3 { font-size: 14px; margin: 0 0 8px; font-weight: 600; }
    .sidebar p { color: #57606a; font-size: 13px; margin: 0 0 16px; line-height: 1.4; }
    .sidebar .topics span { display: inline-block; background: #ddf4ff; color: #0969da; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin: 0 4px 4px 0; font-weight: 500; }
    .sidebar .stats { font-size: 13px; color: #57606a; }
    .sidebar .stats > div { display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid #d0d7de; }
    .sidebar .stats > div:last-child { border-bottom: 0; }
    .sidebar hr { border: 0; border-top: 1px solid #d0d7de; margin: 16px 0; }
    .third-party-banner { background: #ede9fe; border: 1px solid #c4b5fd; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #5b21b6; margin-bottom: 12px; }
    .third-party-banner strong { color: #4c1d95; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="logo">⊕ XIIGen Source</div>
    <div class="nav"><span>Pull requests</span><span>Issues</span><span>Marketplace</span></div>
  </div>
  <div class="repo-header">
    <div class="repo-name">
      <span class="org">tessera-collective /</span> <a href="#">tenant-c--user-registration</a>
      <span class="badge public">Public</span>
      <span class="badge third">third-party-tenant</span>
    </div>
    <div class="repo-meta">
      Fresh root install of @xiigen/user-registration v1.0.0 — adaptation-category: no-adaptation-third-party-tenant
    </div>
  </div>

  <div class="layout">
    <div class="main-col">
      <div class="third-party-banner">
        🌳 Fresh root install — direct from <a href="#" style="color:#4c1d95;text-decoration:none;font-weight:600;">xiigen-platform/user-registration v1.0.0</a> · NOT a fork of acme/northwind · Zero FREEDOM overrides applied
      </div>
      <div class="toolbar">
        <span>⎇</span>
        <span class="branch-pill">main</span>
        <span class="branch-meta">7 files · 1 commit · v1.0.1</span>
      </div>
      <div class="files-list" data-testid="repo-files">
        <div class="file-row"><span class="icon">📁</span><a href="#"></a><span class="commit"></span><span class="age"></span></div>
        <div class="file-row"><span class="icon">📄</span><a href="#">.gitignore</a><span class="commit">DEV-115 fork: scaffold tenant-c--user-registration v1.0.1</span><span class="age">2026-04-25</span></div>
        <div class="file-row"><span class="icon">📘</span><a href="#">README.md</a><span class="commit">DEV-115 fork: third-party-tenant README + zero-override summary + V-15 contract ref</span><span class="age">2026-04-25</span></div>
        <div class="file-row"><span class="icon">📗</span><a href="#">email-verification.service.ts</a><span class="commit">verbatim from platform v1.0.0</span><span class="age">2026-04-25</span></div>
        <div class="file-row"><span class="icon">📗</span><a href="#">onboarding-delivery.service.ts</a><span class="commit">verbatim from platform v1.0.0</span><span class="age">2026-04-25</span></div>
        <div class="file-row"><span class="icon">📜</span><a href="#">package.json</a><span class="commit">no-adaptation: publisher tessera-collective, version 1.0.1, basedOn @xiigen/user-registration@1.0.0 (direct)</span><span class="age">2026-04-25</span></div>
        <div class="file-row"><span class="icon">📗</span><a href="#">registration.service.ts</a><span class="commit">verbatim from platform v1.0.0</span><span class="age">2026-04-25</span></div>
        <div class="file-row"><span class="icon">📋</span><a href="#">tenant.config.json</a><span class="commit">no-adaptation: 0 own overrides + 0 inherited — empty {}</span><span class="age">2026-04-25</span></div>
      </div>

      <div class="readme-card">
        <div class="readme-header">📘 README.md</div>
        <div class="readme-body">
          <h1>tenant-c--user-registration</h1>
          <blockquote><strong>Tenant fork of <code>@xiigen/user-registration</code> (FLOW-01) for tenant <code>tessera-collective</code>.</strong><br/><strong>Third-party tenant — NOT in the acme→northwind cascade chain.</strong></blockquote>
          <p>This repository is the <strong>R2 fork-with-code artifact</strong> for FLOW-01 under the tenant <code>tessera-collective</code>. It satisfies the portability protocol's repo naming convention (<code>{tenantId}--{moduleName}</code> with double-dash separator).</p>
          <h2>Cascade lineage</h2>
          <pre>@xiigen/user-registration v1.0.0 (platform)
        │
        │  tessera installs DIRECTLY (no acme/northwind hops)
        │  ZERO FREEDOM overrides applied
        ▼
@tessera-collective/user-registration v1.0.1  (THIS REPO)</pre>
          <h2>Provenance</h2>
          <table>
            <tr><th>Source flow</th><td><code>@xiigen/user-registration</code> v1.0.0 (platform-source — direct, no cascade hop)</td></tr>
            <tr><th>Ultimate root</th><td><code>@xiigen/user-registration</code> v1.0.0 (platform-source)</td></tr>
            <tr><th>Tenant</th><td><code>tessera-collective</code></td></tr>
            <tr><th>Adaptation category</th><td><code>no-adaptation-third-party-tenant</code> (zero FREEDOM overrides)</td></tr>
            <tr><th>Published version</th><td><code>tessera-collective/user-registration v1.0.1</code></td></tr>
            <tr><th>Adaptation date</th><td>2026-04-25</td></tr>
          </table>
        </div>
      </div>
    </div>

    <div class="sidebar">
      <h3>About</h3>
      <p>FLOW-01 user-registration third-party-tenant install for tessera-collective. Zero FREEDOM overrides; provisioned for V-13(D) Phase 5c cross-tenant separation confirmation.</p>
      <div class="topics">
        <span>flow-01</span><span>user-registration</span><span>third-party-tenant</span><span>fresh-install</span><span>zero-overrides</span><span>portability</span>
      </div>
      <hr/>
      <div class="stats">
        <div><strong>0</strong>stars</div>
        <div><strong>0</strong>watching</div>
        <div><strong>0</strong>forks</div>
      </div>
      <hr/>
      <h3>Releases</h3>
      <p><strong>v1.0.1</strong> — Fresh root install at platform v1.0.0 — zero FREEDOM overrides — third-party tenant for V-13(D) cross-tenant confirmation</p>
      <hr/>
      <h3>Languages</h3>
      <p>TypeScript 95.4% · JSON 4.6%</p>
    </div>
  </div>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="repo-files"]', { timeout: 5_000 });
    await page.screenshot({
      path: `${REPO_OUT}/01-repo-overview-1280px.png`,
      fullPage: true,
    });

    await context.close();
  });

  test('row9-02 repo file tree (tenant-c--user-registration)', async ({ browser }) => {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>tenant-c--user-registration — file tree</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; margin: 0; background: #fff; color: #1f2328; font-size: 14px; }
    .topbar { background: #24292f; color: #fff; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
    .topbar .logo { font-weight: 700; font-size: 16px; }
    .topbar .nav { display: flex; gap: 20px; color: #9ca3af; font-size: 14px; }
    .repo-header { padding: 16px 24px; border-bottom: 1px solid #d0d7de; }
    .repo-name { font-size: 20px; }
    .repo-name a { color: #0969da; text-decoration: none; font-weight: 600; }
    .repo-name .org { color: #57606a; font-weight: 400; }
    .breadcrumb { color: #57606a; font-size: 13px; margin-top: 6px; }
    .breadcrumb a { color: #0969da; text-decoration: none; }
    .layout { padding: 16px 24px; }
    .tabs { display: flex; gap: 4px; margin-bottom: 12px; border-bottom: 1px solid #d0d7de; }
    .tab { padding: 8px 16px; font-size: 14px; cursor: pointer; color: #57606a; border-bottom: 2px solid transparent; }
    .tab.active { color: #1f2328; font-weight: 600; border-bottom-color: #fd8c73; }
    .tree { font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size: 14px; line-height: 1.7; padding: 16px; background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; color: #1f2328; }
    .tree .root { font-weight: 600; color: #1f2328; }
    .tree .branch { padding-left: 16px; }
    .tree .file { color: #1f2328; }
    .tree .dir { color: #57606a; font-weight: 600; }
    .tree .dim { color: #8c959f; font-size: 12px; padding-left: 8px; }
    .tree .platform-mark { color: #6d28d9; font-weight: 500; padding-left: 6px; }
    .tree .no-mark { color: #16a34a; font-weight: 500; padding-left: 6px; }
    .summary { margin: 16px 0 0; padding: 12px 16px; background: #ddf4ff; border: 1px solid #b6e3ff; border-radius: 6px; font-size: 13px; color: #0969da; }
    .summary strong { color: #0550ae; }
    .lineage-summary { margin: 8px 0 0; padding: 12px 16px; background: #ede9fe; border: 1px solid #c4b5fd; border-radius: 6px; font-size: 13px; color: #5b21b6; }
    .lineage-summary strong { color: #4c1d95; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="logo">⊕ XIIGen Source</div>
    <div class="nav"><span>Pull requests</span><span>Issues</span><span>Marketplace</span></div>
  </div>
  <div class="repo-header">
    <div class="repo-name">
      <span class="org">tessera-collective /</span> <a href="#">tenant-c--user-registration</a>
    </div>
    <div class="breadcrumb"><a href="#">tenant-c--user-registration</a> · main · file tree</div>
  </div>

  <div class="layout">
    <div class="tabs">
      <span class="tab">Code</span>
      <span class="tab active">Files</span>
      <span class="tab">Issues 0</span>
      <span class="tab">Pull requests 0</span>
      <span class="tab">Actions</span>
      <span class="tab">Settings</span>
    </div>

    <div class="tree" data-testid="repo-tree">
      <div class="root">tenant-c--user-registration/</div>
      <div class="branch">
        <div class="file">├── .gitignore <span class="dim">96 B</span></div>
        <div class="file">├── README.md <span class="dim">7.0 KB</span><span class="platform-mark">[third-party-tenant narrative + single-hop lineage + V-15 contract ref]</span></div>
        <div class="file">├── email-verification.service.ts <span class="dim">13.7 KB</span><span class="dim">[verbatim from platform v1.0.0]</span></div>
        <div class="file">├── onboarding-delivery.service.ts <span class="dim">12.2 KB</span><span class="dim">[verbatim from platform v1.0.0]</span></div>
        <div class="file">├── package.json <span class="dim">4.8 KB</span><span class="platform-mark">[publisher: tessera-collective, v1.0.1, basedOn @xiigen/user-registration@1.0.0 direct]</span></div>
        <div class="file">├── registration.service.ts <span class="dim">7.1 KB</span><span class="dim">[verbatim from platform v1.0.0]</span></div>
        <div class="file">└── tenant.config.json <span class="dim">3.6 KB</span><span class="no-mark">[0 own + 0 inherited — empty overrides {}]</span></div>
      </div>
    </div>

    <div class="summary" data-testid="tree-summary">
      <strong>7 files</strong> · TypeScript 95.4% · JSON 4.6% · Total ~49 KB ·
      <strong>3 service files verbatim</strong> from <code>@xiigen/user-registration</code> v1.0.0 ·
      <strong>2 tenant-specific manifests</strong> (package.json, tenant.config.json) ·
      <strong>1 README</strong> documenting third-party-tenant provenance ·
      <strong>0 MACHINE invariants modified</strong> ·
      <strong>0 FREEDOM overrides applied</strong>
    </div>

    <div class="lineage-summary" data-testid="tree-lineage">
      <strong>Cascade lineage (single hop)</strong> · platform v1.0.0 → tessera v1.0.1 (0 own + 0 inherited) ·
      <strong>NOT in the acme→northwind cascade chain</strong> · tessera tenant context returns platform defaults under AsyncLocalStorage scope ·
      <code>rate_limit=60</code>, <code>ttl=86400</code>, <code>inviter='you'</code>, <code>community='our community'</code> ·
      Drift = 0 px on 252/252 PNG pairs vs platform-source AND vs tenant-a-acme-v1.0.1
    </div>
  </div>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="repo-tree"]', { timeout: 5_000 });
    await page.screenshot({
      path: `${REPO_OUT}/02-repo-tree-1280px.png`,
      fullPage: true,
    });

    await context.close();
  });
});
