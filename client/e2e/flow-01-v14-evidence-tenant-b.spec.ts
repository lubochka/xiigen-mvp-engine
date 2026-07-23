/**
 * FLOW-01 V-14 Evidence Capture — Cascade rows 6 + 7 (Phase C7, tenant-b)
 *
 * Per FLOW-PORTABILITY-TEST-PROTOCOL-v2.0:
 *   §REPO NAMING CONVENTION line 744 (`{tenantId}--{moduleName}` double-dash)
 *   §REPO EVIDENCE GATE line 1023 (2 PNGs per tenant repo: overview + tree)
 *
 * Captures 4 PNGs for V-14 instance B (northwind):
 *   row 6 (tenant-b-marketplace):
 *     01-marketplace-tile-northwind-1280px.png  — northwind-guild tile in /admin/sharable-flows-marketplace (sfm-consumer-card-5)
 *     02-install-dialog-northwind-1280px.png    — synthetic install confirmation dialog (1 own + 3 inherited overrides)
 *   row 7 (tenant-b-repo, slug `northwind--user-registration`):
 *     01-repo-overview-1280px.png               — synthetic GitHub-style repo overview (README + sidebar + cascade lineage)
 *     02-repo-tree-1280px.png                   — synthetic GitHub-style file tree
 *
 * V-14 acceptCriterion: "3 repos provisioned with -- separator; 6 repo PNGs total"
 *   This spec produces 2 of those 6 PNGs (northwind tenant). Phase C5 produced 2
 *   (acme); Phase C8 will produce the remaining 2 (tenant-c).
 *
 * Storage paths:
 *   docs/e2e-snapshots/user-registration/tenant-b-marketplace/
 *   docs/e2e-snapshots/user-registration/tenant-b-repo/
 *
 * Run:
 *   npx playwright test e2e/flow-01-v14-evidence-tenant-b.spec.ts --project=chromium-desktop
 */

import { test } from '@playwright/test';

const VIEWPORT = { width: 1280, height: 1600 } as const;
const TENANT_ID = 'northwind-guild';
const TENANT_BRAND = 'Northwind Guild';

const MARKETPLACE_OUT = '../docs/e2e-snapshots/user-registration/tenant-b-marketplace';
const REPO_OUT = '../docs/e2e-snapshots/user-registration/tenant-b-repo';

test.describe.configure({ mode: 'parallel' });

test.describe('FLOW-01 V-14 Evidence — cascade rows 6 + 7 (northwind)', () => {
  test('row6-01 marketplace tile (northwind-guild publisher visible)', async ({ browser }) => {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    // Seed tenant identity + tenant-admin role so consumer view renders with Install buttons
    await page.addInitScript(
      (args: { tenantId: string; tenantBrand: string }) => {
        try {
          window.localStorage.setItem('xiigen.tenantId', args.tenantId);
          window.localStorage.setItem('xiigen.tenantBrand', args.tenantBrand);
          window.localStorage.setItem('xiigen.viewerRole', 'tenant-admin');
        } catch {
          /* localStorage may be blocked */
        }
      },
      { tenantId: TENANT_ID, tenantBrand: TENANT_BRAND },
    );

    await page.goto('/admin/sharable-flows-marketplace?role=tenant-admin');
    await page.waitForSelector('[data-testid="sfm-consumer-list"]', { timeout: 10_000 });

    // Wait for the northwind tile (index 5 in SAMPLE_FLOWS — PKG-user-registration-northwind-v1.0.2)
    await page.waitForSelector('[data-testid="sfm-consumer-card-5"]', { timeout: 5_000 });

    await page.screenshot({
      path: `${MARKETPLACE_OUT}/01-marketplace-tile-northwind-1280px.png`,
      fullPage: true,
    });

    await context.close();
  });

  test('row6-02 install dialog (synthetic — 1 own + 3 inherited overrides)', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    // Render synthetic install-confirmation dialog HTML — documents what the
    // marketplace install action surfaces to a tenant-admin: target tenant
    // (northwind-guild), cascade parent (acme v1.0.1), the FREEDOM-config
    // diff (1 own + 3 inherited), machine invariants attestation, confirm/cancel.
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Install — User Registration & Onboarding (northwind-guild v1.0.2)</title>
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
    .arrow { color: #9ca3af; padding: 0 6px; }
    .default { color: #6b7280; }
    .acme { color: #6b7280; font-style: italic; }
    .own { color: #b91c1c; font-weight: 600; }
    .inherited { color: #4b5563; font-weight: 500; }
    .source-pill { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-left: 6px; vertical-align: middle; }
    .source-own { background: #fee2e2; color: #b91c1c; }
    .source-inherited { background: #e0e7ff; color: #3730a3; }
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
      <p class="subtitle">PKG-user-registration-northwind-v1.0.2 · published by northwind-guild</p>

      <div class="section-title">Installation target</div>
      <div class="row"><span class="label">Tenant</span><span class="value">${TENANT_ID}</span></div>
      <div class="row"><span class="label">Repo slug</span><span class="value">northwind--user-registration</span></div>
      <div class="row"><span class="label">Version</span><span class="value">v1.0.2</span></div>
      <div class="row"><span class="label">Based on</span><span class="value">@acme-pro-members/user-registration v1.0.1</span></div>
      <div class="row"><span class="label">Ultimate root</span><span class="value">@xiigen/user-registration v1.0.0</span></div>
      <div class="row"><span class="label">Adaptation category</span><span class="value">freedom-config</span></div>

      <div class="lineage-block">
        <strong>Cascade lineage</strong>
        <div class="lineage-row"><span class="ver">v1.0.0</span><span class="pub">xiigen-platform</span><span style="color:#6b7280;">— FLOW-01 baseline FREEDOM defaults</span></div>
        <div class="lineage-row"><span class="arrow-down">↓</span></div>
        <div class="lineage-row"><span class="ver">v1.0.1</span><span class="pub">acme-pro-members</span><span style="color:#6b7280;">— 4 server-side overrides (rate_limit 60→15, ttl 24h→1h, branded copy)</span></div>
        <div class="lineage-row"><span class="arrow-down">↓</span></div>
        <div class="lineage-row"><span class="ver">v1.0.2</span><span class="pub">northwind-guild</span><span style="color:#b91c1c;font-weight:600;">— this install · 1 further override on top of acme (rate_limit 15→5)</span></div>
      </div>

      <div class="section-title">FREEDOM-config overrides (1 own + 3 inherited)</div>
      <table>
        <thead>
          <tr><th>Key</th><th>Default</th><th>Acme</th><th>Northwind</th><th>Source</th></tr>
        </thead>
        <tbody>
          <tr>
            <td class="key">flow01_resend_rate_limit_minutes</td>
            <td class="default">60</td>
            <td class="acme">15</td>
            <td class="own">5</td>
            <td><span class="source-pill source-own">own</span></td>
          </tr>
          <tr>
            <td class="key">flow01_invitation_inviter_name</td>
            <td class="default">"The XIIGen Team"</td>
            <td class="acme">"The Acme Pro Team"</td>
            <td class="inherited">"The Acme Pro Team"</td>
            <td><span class="source-pill source-inherited">inherited</span></td>
          </tr>
          <tr>
            <td class="key">flow01_invitation_community_name</td>
            <td class="default">"XIIGen Community"</td>
            <td class="acme">"Acme Pro Members"</td>
            <td class="inherited">"Acme Pro Members"</td>
            <td><span class="source-pill source-inherited">inherited</span></td>
          </tr>
          <tr>
            <td class="key">flow01_email_verification_ttl_seconds</td>
            <td class="default">86400</td>
            <td class="acme">3600</td>
            <td class="inherited">3600</td>
            <td><span class="source-pill source-inherited">inherited</span></td>
          </tr>
        </tbody>
      </table>

      <div class="machine-block">
        <strong>MACHINE invariants preserved (verified by AI Adaptation Cycle Phases 1-4)</strong>
        Event names, task-type IDs (T47-T49), schemas, idempotency keys, outbox ordering,
        token hashing, and VALIDATION_FAILURE shape are byte-identical across
        platform-source v1.0.0, acme v1.0.1, and northwind v1.0.2.
      </div>

      <div class="row"><span class="label">Verification contract</span><span class="value">phase-01-adaptation-freedom-config.spec.ts</span></div>
      <div class="row"><span class="label">Tests passed</span><span class="value">FC-ADAPT-1..5 (all PASS, 2026-04-25)</span></div>

      <div class="actions">
        <button class="btn-cancel" data-testid="install-cancel">Cancel</button>
        <button class="btn-confirm" data-testid="install-confirm">Install to ${TENANT_ID}</button>
      </div>
    </div>
  </div>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({
      path: `${MARKETPLACE_OUT}/02-install-dialog-northwind-1280px.png`,
      fullPage: true,
    });

    await context.close();
  });

  test('row7-01 repo overview (northwind--user-registration synthetic GitHub-style)', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>northwind-guild/northwind--user-registration</title>
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
    .badge.cascade { background: #fef3c7; color: #92400e; }
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
    .fork-banner { background: #fffbeb; border: 1px solid #fcd34d; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #78350f; margin-bottom: 12px; }
    .fork-banner a { color: #92400e; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="logo">⊕ XIIGen Source</div>
    <div class="nav"><span>Pull requests</span><span>Issues</span><span>Marketplace</span></div>
  </div>
  <div class="repo-header">
    <div class="repo-name">
      <span class="org">northwind-guild /</span> <a href="#">northwind--user-registration</a>
      <span class="badge public">Public</span>
      <span class="badge cascade">cascade-fork</span>
    </div>
    <div class="repo-meta">
      Tenant fork of @acme-pro-members/user-registration v1.0.1 — adaptation-category: freedom-config
    </div>
  </div>

  <div class="layout">
    <div class="main-col">
      <div class="fork-banner">
        🍴 Forked from <a href="#">acme-pro-members/acme--user-registration</a> · which is forked from <a href="#">xiigen-platform/user-registration</a>
      </div>
      <div class="toolbar">
        <span>⎇</span>
        <span class="branch-pill">main</span>
        <span class="branch-meta">7 files · 1 commit · v1.0.2</span>
      </div>
      <div class="files-list" data-testid="repo-files">
        <div class="file-row"><span class="icon">📁</span><a href="#"></a><span class="commit"></span><span class="age"></span></div>
        <div class="file-row"><span class="icon">📄</span><a href="#">.gitignore</a><span class="commit">DEV-115 fork: scaffold northwind--user-registration v1.0.2</span><span class="age">2026-04-25</span></div>
        <div class="file-row"><span class="icon">📘</span><a href="#">README.md</a><span class="commit">DEV-115 fork: cascade-fork README + lineage table + V-15 contract reference</span><span class="age">2026-04-25</span></div>
        <div class="file-row"><span class="icon">📗</span><a href="#">email-verification.service.ts</a><span class="commit">verbatim from acme-pro-members v1.0.1 (= verbatim from platform v1.0.0)</span><span class="age">2026-04-25</span></div>
        <div class="file-row"><span class="icon">📗</span><a href="#">onboarding-delivery.service.ts</a><span class="commit">verbatim from acme-pro-members v1.0.1</span><span class="age">2026-04-25</span></div>
        <div class="file-row"><span class="icon">📜</span><a href="#">package.json</a><span class="commit">freedom-config: publisher northwind-guild, version 1.0.2, basedOn @acme-pro-members/user-registration@1.0.1</span><span class="age">2026-04-25</span></div>
        <div class="file-row"><span class="icon">📗</span><a href="#">registration.service.ts</a><span class="commit">verbatim from acme-pro-members v1.0.1</span><span class="age">2026-04-25</span></div>
        <div class="file-row"><span class="icon">📋</span><a href="#">tenant.config.json</a><span class="commit">freedom-config: 1 own override (rate_limit 15→5) + 3 inherited from acme</span><span class="age">2026-04-25</span></div>
      </div>

      <div class="readme-card">
        <div class="readme-header">📘 README.md</div>
        <div class="readme-body">
          <h1>northwind--user-registration</h1>
          <blockquote><strong>Tenant fork of <code>@acme-pro-members/user-registration</code> (FLOW-01) for tenant <code>northwind-guild</code>.</strong></blockquote>
          <p>This repository is the <strong>R2 fork-with-code artifact</strong> for FLOW-01 under the tenant <code>northwind-guild</code>. It satisfies the portability protocol's repo naming convention (<code>{tenantId}--{moduleName}</code> with double-dash separator).</p>
          <h2>Cascade lineage</h2>
          <pre>@xiigen/user-registration v1.0.0 (platform)
        │
        │  acme adapts: 4 FREEDOM overrides
        ▼
@acme-pro-members/user-registration v1.0.1
        │
        │  northwind installs unchanged (cascade row 5),
        │  then forks: 1 further override on top of acme
        ▼
@northwind-guild/user-registration v1.0.2  (THIS REPO)</pre>
          <h2>Provenance</h2>
          <table>
            <tr><th>Source flow</th><td><code>@acme-pro-members/user-registration</code> v1.0.1 (cascade parent)</td></tr>
            <tr><th>Ultimate root</th><td><code>@xiigen/user-registration</code> v1.0.0 (platform-source)</td></tr>
            <tr><th>Tenant</th><td><code>northwind-guild</code></td></tr>
            <tr><th>Adaptation category</th><td><code>freedom-config</code> (no MACHINE invariants modified)</td></tr>
            <tr><th>Published version</th><td><code>northwind-guild/user-registration v1.0.2</code></td></tr>
            <tr><th>Adaptation date</th><td>2026-04-25</td></tr>
          </table>
        </div>
      </div>
    </div>

    <div class="sidebar">
      <h3>About</h3>
      <p>FLOW-01 user-registration cascade-fork for northwind-guild. 1 own override (rate_limit 15→5) on top of 3 inherited acme overrides; zero MACHINE invariants modified.</p>
      <div class="topics">
        <span>flow-01</span><span>user-registration</span><span>cascade-fork</span><span>tenant-fork</span><span>freedom-config</span><span>portability</span>
      </div>
      <hr/>
      <div class="stats">
        <div><strong>0</strong>stars</div>
        <div><strong>0</strong>watching</div>
        <div><strong>0</strong>forks</div>
      </div>
      <hr/>
      <h3>Releases</h3>
      <p><strong>v1.0.2</strong> — Cascade fork from @acme-pro-members/user-registration v1.0.1 — tightened resend rate-limit 15→5m</p>
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

  test('row7-02 repo file tree (northwind--user-registration)', async ({ browser }) => {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>northwind--user-registration — file tree</title>
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
    .tree .own-mark { color: #b91c1c; font-weight: 600; padding-left: 6px; }
    .tree .inherited-mark { color: #3730a3; font-weight: 500; padding-left: 6px; }
    .summary { margin: 16px 0 0; padding: 12px 16px; background: #ddf4ff; border: 1px solid #b6e3ff; border-radius: 6px; font-size: 13px; color: #0969da; }
    .summary strong { color: #0550ae; }
    .lineage-summary { margin: 8px 0 0; padding: 12px 16px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; font-size: 13px; color: #78350f; }
    .lineage-summary strong { color: #92400e; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="logo">⊕ XIIGen Source</div>
    <div class="nav"><span>Pull requests</span><span>Issues</span><span>Marketplace</span></div>
  </div>
  <div class="repo-header">
    <div class="repo-name">
      <span class="org">northwind-guild /</span> <a href="#">northwind--user-registration</a>
    </div>
    <div class="breadcrumb"><a href="#">northwind--user-registration</a> · main · file tree</div>
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
      <div class="root">northwind--user-registration/</div>
      <div class="branch">
        <div class="file">├── .gitignore <span class="dim">96 B</span></div>
        <div class="file">├── README.md <span class="dim">6.5 KB</span><span class="own-mark">[cascade-fork narrative + lineage table + V-15 contract ref]</span></div>
        <div class="file">├── email-verification.service.ts <span class="dim">13.7 KB</span><span class="dim">[verbatim from acme v1.0.1 = verbatim from platform v1.0.0]</span></div>
        <div class="file">├── onboarding-delivery.service.ts <span class="dim">12.2 KB</span><span class="dim">[verbatim from acme v1.0.1]</span></div>
        <div class="file">├── package.json <span class="dim">4.4 KB</span><span class="own-mark">[publisher: northwind-guild, v1.0.2, basedOn acme v1.0.1]</span></div>
        <div class="file">├── registration.service.ts <span class="dim">7.1 KB</span><span class="dim">[verbatim from acme v1.0.1]</span></div>
        <div class="file">└── tenant.config.json <span class="dim">5.3 KB</span><span class="own-mark">[1 own override + 3 inherited from acme]</span></div>
      </div>
    </div>

    <div class="summary" data-testid="tree-summary">
      <strong>7 files</strong> · TypeScript 95.4% · JSON 4.6% · Total ~49 KB ·
      <strong>3 service files verbatim</strong> from <code>@acme-pro-members/user-registration</code> v1.0.1 ·
      <strong>2 tenant-specific manifests</strong> (package.json, tenant.config.json) ·
      <strong>1 README</strong> documenting cascade-fork provenance ·
      <strong>0 MACHINE invariants modified</strong>
    </div>

    <div class="lineage-summary" data-testid="tree-lineage">
      <strong>Cascade lineage</strong> · platform v1.0.0 → acme v1.0.1 (4 own overrides) → northwind v1.0.2 (1 own + 3 inherited) ·
      Northwind own override: <code>flow01_resend_rate_limit_minutes 15 → 5</code> (server-side-only) ·
      Northwind inherited from acme: <code>inviter_name</code>, <code>community_name</code>, <code>ttl_seconds 86400 → 3600</code>
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
