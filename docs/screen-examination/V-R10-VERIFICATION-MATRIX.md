# V-R10 VERIFICATION MATRIX — post-RUN-173 fix verification

**Date:** 2026-04-21
**Branch:** claude/pensive-tereshkova-baf347
**Baseline:** RUN-172 AXIS-D-FULL-COVERAGE-MATRIX (b95a4f3c)
**Fix commit:** RUN-173 V-R10 P0+P4 (cdcf739d) — 9 files changed
**Recapture:** RUN-175 (2b686249) — 540 PNGs across 3 viewports
**Method:** 6 parallel V-R10 rescore subagents, ~270s each, all 44 flows directly examined
**Per-batch JSON:** `.tmp-v-r10-batch-{A,B,C,D,E,F}.json`

This is the verification round after RUN-173's P0+P4 fixes landed. No extrapolation: every flow rescored against new PNGs.

---

## Top-line shifts (44 flows)

| Verdict shift | Count | Flows |
|---------------|-------|-------|
| **FAIL → PASS** | 1 | saas-multi-tenancy (P0-1 verified) |
| **BLOCK → PASS** | 1 | system-initiation-bootstrap (P1-style fix landed) |
| **CONCERN → PASS** | 4 | sharable-flows-marketplace, blog-cms-modules, feature-registry, subscription-billing (PASS_with_one_404) |
| **PASS → PASS (held with improvement)** | 6 | adaptive-rag, client-push, design-intelligence, design-system-governance, tenant-lifecycle-manager, user-groups-communities, user-registration, module-lifecycle, platform-agent, rag-quality-feedback, reviews-reputation, marketplace-payments, meta-arbitration-engine, meta-flow-engine, profile-enrichment, schema-registry-dag, visual-flow-engine |
| **CONCERN → CONCERN (improvement, not enough)** | 4 | ads-platform (+6), bundle-activation (+3), marketplace (+1), marketplace-plugin-adapter (+2), dynamic-forms-workflows |
| **PASS → CONCERN (REGRESSED)** | 2 | **ai-safety-moderation, bfa-cross-flow-governance** (newly visible flow-specific raw-index accordions — un-flagged in R172) |
| **CONCERN persistent (no change)** | 4 | cms-publishing, data-warehouse-analytics, durable-sagas-compliance (partial), event-attendance, event-management, etl-data-integration, form-builder-templates, freelancer-marketplace, friend-request-social-feed, human-interaction-gate (already PASS), i18n-translation, transactional-event-participation |
| **NOT_SHIPPED persistent** | 1 | completion-gamification (P1 build deferred) |

---

## Fix verification per RUN-173 task

| Fix ID | Description | Verification |
|--------|-------------|--------------|
| **P0-1** | saas-multi-tenancy tenant-user Terminate-Tenant gate | ✅ **VERIFIED** — tenant-user now sees "Workspace Status" informational card, no destructive buttons |
| **P0-2** | durable-sagas platform-support read-only | ✅ **VERIFIED** for platform-support (lock banner + disabled Execute Saga + Escalate) |
| **P0-2 NEW GAP** | durable-sagas tenant-user + tenant-admin can still Execute Saga | 🚨 **NEW P0** — only platform-support was gated; other roles need same treatment |
| **P0-3** | BusinessStateCard metadata redaction (component-level) | ⚠️ **PARTIAL** — landed on cms-publishing, data-warehouse-analytics, blog-cms-modules, sharable-flows, ads-platform populated-anonymous; **MISSED on dynamic-forms-workflows** (still leaks schemaId/version/publishedAt/publicUrl to anon+tenant-user) |
| **P4-1** | feature-registry mobile pill overlap | ✅ **VERIFIED** — FT-024 + FT-031 pills stack below title on mobile, no overlap |
| **P4-2** | FLOW-NN badge removal (adaptive-rag, bundle-activation) | ⚠️ **PARTIAL** — adaptive-rag clean; bundle-activation populated clean BUT active/failed MOCK_STATES routes still leak FLOW-00 |
| **P4-3** | populated 404 routes audit | ✅ **AUDIT NO-OP** — all 5 routes already wired; not real defects |
| **P4-4** | marketplace populated error | ⚠️ **PARTIAL** — primary 3-package fallback works; populated routes still error (capture pre-RUN-173 timestamps) |
| **P4-5** | provider-keys banner via hideChrome=1 | ✅ **VERIFIED** on primary + populated; FAILS on bundle-activation MOCK_STATES routes (capture-harness gap — those routes don't pass hideChrome=1) |
| **P4-6** | raw-index AdminCrudPanel suppression via hideChrome=1 | ⚠️ **PARTIAL** — works on AdminCrudPanel-shared flows; **FAILS on flow-specific debug accordions on ads-platform, ai-safety-moderation, bfa-cross-flow-governance** (these have their own raw-index components, not AdminCrudPanel) |

---

## NEW issues surfaced this round

| ID | Severity | Flow | Issue |
|----|----------|------|-------|
| **V-R10-NEW-01** | **P0** | dynamic-forms-workflows | BusinessStateCard P0-3 redaction did NOT land — schemaId/publicUrl still visible on populated-anonymous + populated-tenant-user across all 3 viewports |
| **V-R10-NEW-02** | **P0** | durable-sagas-compliance | tenant-user + tenant-admin still see active Execute Saga button. Only platform-support was gated by P0-2 |
| **V-R10-NEW-03** | **P0** | ads-platform | RAW ADS-PLATFORM INDEX (ADMIN DEBUG) accordion visible to ANONYMOUS users on primary route across all 3 viewports — information-disclosure to unauthenticated visitors |
| **V-R10-NEW-04** | P1 | ai-safety-moderation | RAW MODERATION INDEX (ADMIN DEBUG) on platform-admin primary across 3 viewports — un-flagged in R172, regressed status |
| **V-R10-NEW-05** | P1 | bfa-cross-flow-governance | RAW GOVERNANCE INDEX (ADMIN DEBUG) on platform-admin primary across 3 viewports — un-flagged in R172, regressed status |
| **V-R10-NEW-06** | P2 | bundle-activation | active-platform-admin + failed-platform-admin MOCK_STATES routes still leak FLOW-00 + amber banner (capture-harness gap, not client code) |
| **V-R10-NEW-07** | P2 | data-warehouse-analytics | tenant-admin populated export card renders full encryptionKey 'kms-key-prod-02' — should mask to kms-***-02 |
| **V-R10-NEW-08** | P2 | design-intelligence-engine | Populated admin card displays raw 'FLOW-04' as targetFlow value — should humanize to 'Event attendance' |
| **V-R10-NEW-09** | P3 | freelancer-marketplace | tenant-user (not just business-partner) can post gigs — role gating may be missing |
| **V-R10-NEW-10** | P3 | schema-registry-dag | platform-support indistinguishable from platform-admin (no read-only banner) |
| **V-R10-NEW-11** | P3 | schema-registry-dag | tenant-admin sees cross-tenant schemas — copy says "registered on this tenant" but content is global |
| **V-R10-NEW-12** | P3 | subscription-billing | populated-tenant-admin renders 404 (BillingDashboardPage populated route not wired) |
| **V-R10-NEW-13** | P3 | transactional-event-participation | All 4 roles render same Checkout. No organiser scan / platform-admin settlement / tenant-user wallet (P3 deferred from R173) |
| **V-R10-NEW-14** | P4 | cms-publishing | reader-anonymous.png renders 404 — capture artifact or route alias regression |
| **V-R10-NEW-15** | P4 | saas-multi-tenancy | default-platform-admin route still 404 (P4 polish, not regression) |

---

## Aggregate progress: V-R7 → R172 → V-R10

| Round | BLOCKER | MAJOR | MINOR | Notes |
|-------|---------|-------|-------|-------|
| V-R7 (claimed converged) | 0 | 0 | 24 | Withdrawn — surface quality only |
| R172 (Axis-D full) | 2 | 7 | many | First honest baseline |
| **V-R10 (this round)** | **0** | **5** | many | P0/P4 fixes landed; 5 new MAJOR issues surfaced |

**MAJOR breakdown after V-R10 (5 issues):**
1. dynamic-forms-workflows P0-3 redaction miss
2. durable-sagas tenant-user + tenant-admin Execute Saga
3. ads-platform anonymous RAW INDEX leak
4. ai-safety-moderation platform-admin RAW INDEX leak
5. bfa-cross-flow-governance platform-admin RAW INDEX leak

**Common root cause for 3 of 5:** flow-specific raw-index accordion components on ads-platform, ai-safety-moderation, bfa-cross-flow-governance — these are NOT the shared AdminCrudPanel pattern, so the P4-6 fix doesn't catch them. Need targeted per-flow fixes OR a shared <RawIndexAccordion> component that all 3 migrate to.

---

## V-R11 fix plan (next round)

### P0 (security/trust — 3 issues)
1. **V-R10-NEW-01**: Verify and re-apply P0-3 redaction to dynamic-forms-workflows. Likely: page invokes BusinessStateCard with classification that bypasses redaction filter. Confirm useViewerRole is reaching the component instance.
2. **V-R10-NEW-02**: Extend P0-2 platform-support read-only pattern to tenant-user + tenant-admin on durable-sagas-compliance. tenant-user should not see saga internals at all (redirect to lightweight "Your in-flight operations" surface). tenant-admin should be tenant-scoped read-only.
3. **V-R10-NEW-03**: Highest priority — gate ads-platform RAW INDEX accordion behind role===platform-admin || role===platform-support OR remove from anonymous render path entirely.

### P1 (raw-index suppression on flow-specific accordions)
4. Migrate ai-safety-moderation, bfa-cross-flow-governance, ads-platform to a shared `<RawIndexAccordion>` component that respects hideChrome=1 (same pattern as AdminCrudPanel). Or apply per-flow suppression at the page level.

### P2 (capture-harness + minor leaks)
5. Add hideChrome=1 to bundle-activation active/failed MOCK_STATES capture URLs (Playwright spec edit).
6. Mask encryptionKey on data-warehouse-analytics tenant-admin populated card.
7. Humanize FLOW-04 to 'Event attendance' on design-intelligence-engine populated card.

### P3 (deferred from V-R10)
8. Build read-only inspectors for: human-interaction-gate/platform-support, marketplace-plugin-adapter/platform-support + event-organiser, oss-curriculum/platform-support.
9. Build i18n-translation translator workbench + tenant-user kiosk.
10. Wire subscription-billing populated route.
11. Build transactional-event-participation 4-role split (anon/user buyer; organiser scanner; platform-admin settlement).

### P1 (NOT_SHIPPED — needs product decision)
12. completion-gamification: build celebratory kiosk + cohort dashboard (Duolingo/Khan reference)
13. dynamic-forms-workflows: build G7 three-column builder + Typeform kiosk respondent (or scope reduction)

---

## Convergence verdict

**NOT CONVERGED.** V-R10 closed 1 BLOCKER + several CONCERNs but surfaced 3 new P0 issues + 2 regressions. Per SK-550 dual criterion (score-delta < 1% AND coverage_NOT_YET_EXAMINED = 0):
- ✅ Coverage condition met (44/44 flows directly rescored)
- ❌ Score condition not met (3 new P0 issues, 5 new MAJOR issues — net delta is positive but new high-severity items emerged)

V-R11 must address V-R10-NEW-01/02/03 + the P1 raw-index migration before another convergence claim is possible.

---

## Resume artifacts

`.tmp-v-r10-batch-{A,B,C,D,E,F}.json` for per-batch detailed findings.
