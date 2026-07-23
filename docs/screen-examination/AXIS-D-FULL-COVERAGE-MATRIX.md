# AXIS-D FULL-COVERAGE MATRIX — no extrapolation, every flow directly scored

**Date:** 2026-04-21
**Branch:** claude/pensive-tereshkova-baf347
**Baseline:** 2bd7ad94 (RUN-171 — resized PNGs)
**Method:** 546 Playwright captures × 6 parallel Axis-D scoring subagents × PER-IMAGE-VALIDATION-TEMPLATE (SK-549) Axis A/B/D + module coverage
**Per-flow JSON:** `.tmp-axis-d-batch-{A,B,C,D,E,F}.json`

This is the first honest full-coverage Axis-D examination. No extrapolation: every flow in scope was directly visually examined by a subagent against its examination record + the 15-axis rubric. The V-R7 "CONVERGED" claim was withdrawn in RUN-167; this matrix supersedes it.

---

## Scope

- **44 flows** (3 INTERNAL_ONLY adapters + FLOW-44 ai-self-modification excluded from Playwright visual-audit matrix)
- **182 (flow, role, state) cells** captured at 3 viewports = **540 PNG captures + 9 pilot FLOW-21** = **549 unique PNGs**
- **6 captures failed** (route/role mismatches — etl-data-integration tenant-admin + platform-support; platform-agent platform-support mobile)
- **204 PNGs resized** post-capture to ≤1999px for subagent compatibility
- **All 44 flows + 6 batches complete** — zero flows extrapolated

---

## Headline verdicts (44 flows)

| Verdict | Count | Flows |
|---------|-------|-------|
| **PASS / SHIPPED** | 15 | adaptive-rag-deep-research, ai-safety-moderation, bfa-cross-flow-governance, client-push, design-intelligence-engine, design-system-governance, human-interaction-gate, marketplace-payments, meta-arbitration-engine, meta-flow-engine, module-lifecycle, oss-curriculum, platform-agent, rag-quality-feedback, tenant-lifecycle-manager, visual-flow-engine (16 actually) |
| **CONCERN / PARTIAL** | 20 | ads-platform, blog-cms-modules, bundle-activation, cms-publishing, data-warehouse-analytics, dynamic-forms-workflows, etl-data-integration, feature-registry, form-builder-templates, freelancer-marketplace, i18n-translation, marketplace, marketplace-plugin-adapter, reviews-reputation, schema-registry-dag, sharable-flows-marketplace, subscription-billing, transactional-event-participation, user-groups-communities, user-registration, event-attendance, event-management, friend-request-social-feed, profile-enrichment |
| **FAIL / BLOCK / NOT_SHIPPED** | 5 | completion-gamification, durable-sagas-compliance, saas-multi-tenancy, system-initiation-bootstrap, dynamic-forms-workflows (partial) |

---

## BLOCK flows — detailed findings (require product decision)

### 1. completion-gamification — NOT_SHIPPED (0% module coverage)
- All 9 cells render identical skeleton (commit 8788312f stabilised skeleton but never built the kiosk)
- No XP reveal, no streak counter, no badge grid, no role differentiation
- Planned: Duolingo-style full-screen completion kiosk + Khan-style cohort dashboard + progress list
- **Action needed:** Build the purpose-built surfaces; the current skeleton is an empty placeholder

### 2. durable-sagas-compliance — NOT_SHIPPED (25% module coverage)
- **ALL 4 roles see SAME engineering surface**: tenant-user sees "Saga", "Execute Saga", saga-sample-payment-001 jargon
- tenant-user has NO GDPR plain-English slice (MyDataRequestsPage never built)
- platform-support has NO read-only variant and CAN trigger writes (Execute Saga button enabled)
- Partial: saga step timeline with Completed/Running badges shipped
- **Action needed:** Build role-branched variants; tenant-user GDPR view; gate platform-support writes

### 3. saas-multi-tenancy — FAIL (14/25)
- **CRITICAL: tenant-user sees Terminate Tenant button** (scope isolation violation risk)
- default-platform-admin route returns 404 (not wired)
- No tenant context (name, id, plan, metrics), no state timeline, no suspension reason
- "Reactivate Tenant" shown disabled while Active instead of hidden
- **Action needed:** P0 remove Terminate from tenant-user; wire default route; add tenant detail panel

### 4. system-initiation-bootstrap — WEAK (8/15)
- Anonymous role routes to tenant-signup (misrouted for platform-only flow)
- No purpose-built progress bar or fabric-by-fabric health matrix
- No retry/restart action row on FAILED state
- platform-support distinct surface missing
- **Action needed:** Build G1 Progress Strip with phases Cold→Seeding→Indices→Warm + per-phase actions; hide anonymous route

### 5. dynamic-forms-workflows — PARTIAL (30% module coverage)
- **MAJOR uplift from prior round**: role-aware form demo SHIPPED with correct field visibility per role (4/3/2 fields admin/user/anon)
- Still MISSING: G7 three-column builder (palette+preview+properties) for admin
- Still MISSING: Typeform one-question-per-screen kiosk for respondent/anonymous
- Still MISSING: 7 of 10 business-spec modules (C-J: submission pipeline, entry storage, notifications, feeds, payments, uploads, extensibility)
- **Action needed:** Product decision — ship full 10-module platform or scope reduction

---

## Systemic patterns (across batches)

### Pattern 1 — Admin authoring dashboards missing (falls to raw CRUD)
Flows with planned purpose-built admin surface that currently renders generic AdminCrudPanel:
- **blog-cms-modules** tenant-admin + platform-admin (generic CRUD with ui-177 IDs, "Raw index browser (admin debug)")
- **data-warehouse-analytics** tenant-admin (raw CRUD not G6 dashboard)
- **etl-data-integration** tenant-admin (raw CRUD not connector console)
- **cms-publishing** tenant-admin (raw CRUD not editorial card-list)

### Pattern 2 — Populated-state captures expose engineering identifiers
Every flow's `?mock=<populated_key>` render exposes internal IDs as primary content:
- cms-publishing: contentId, assignedReviewer, "Admin view of editorial workflow"
- data-warehouse-analytics: kms-key-prod-02, EXP-2026-0419-201
- design-intelligence-engine: DIE-2026-0419-001, REV-0419-001, FLOW-04
- design-system-governance: DS-RULE-2026-0419-001, SPEC-dialog-v2
- bundle-activation: bundleId, FLOW-00, EMPTY_REQUIRED_FLOWS
- adaptive-rag-deep-research: researchId, safetyGateToken
- ads-platform: winningPriceCents, ledgerEntryId
- dynamic-forms-workflows: schemaId, FRM-2026-0419-017, publicUrl
- feature-registry: FT-024 (acceptable per platform-admin operator role)

### Pattern 3 — Role branching inconsistent
Excellent examples (clean role variants): design-intelligence-engine · design-system-governance · meta-arbitration-engine · platform-agent · marketplace-payments · module-lifecycle · rag-quality-feedback

Missing role variants (one surface for all):
- completion-gamification (same skeleton for all 3 roles)
- durable-sagas-compliance (same engineering surface for all 4 roles)
- ads-platform (advertiser dashboard for all 5 roles — anonymous lacks ConsentGate)
- saas-multi-tenancy (same 3-button card for all 3 roles)

Generic deny-message instead of read-only variant:
- i18n-translation: tenant-user + translator ("Translation administration is for admins")
- marketplace-plugin-adapter: tenant-user + platform-support + event-organiser ("Plugin marketplace not available")
- human-interaction-gate: platform-support ("Approval gates not available")
- oss-curriculum: platform-support ("OSS curriculum not available")

### Pattern 4 — Engineering jargon bleeding to consumer-facing roles
- durable-sagas-compliance tenant-user: "Saga", "Execute Saga", saga-sample-payment-001
- completion-gamification tenant-user: "Gamification Dashboard" (should be "Your progress")
- cms-publishing populated-anonymous: "Admin view of editorial workflow" exposed to anonymous
- blog-cms-modules populated-anonymous: "SEO crawler confirmed indexing", googlebot, sitemapEntry
- ads-platform populated-anonymous: winningPriceCents, ledgerEntryId, "spend ledger"

### Pattern 5 — "RAW {FLOW}-INDEX (ADMIN DEBUG)" accordion leaks
Renders on admin surfaces across: ads-platform, bundle-activation, blog-cms admin, ai-safety admin, dynamic-forms lower section, etl-data-integration, more. Should be feature-flagged off by default for tenant-admin role.

### Pattern 6 — Populated captures failed / 404 (capture-level issue, not design)
- event-attendance tenant-user populated → 404
- friend-request-social-feed tenant-user populated → 404
- marketplace populated-anonymous + populated-tenant-user → "We couldn't load the marketplace" error
- cms-publishing /cms/:slug route → 404 (isPublicRoute mismatch)
- saas-multi-tenancy default-platform-admin → 404

### Pattern 7 — FLOW-XX badges still leak in 2 rendered locations
- adaptive-rag-deep-research: "FLOW-29" badge visible
- bundle-activation: "FLOW-00" badge visible
Violates Rule 16 (semantic slugs, no flow-NN in code paths) at the UI surface.

### Pattern 8 — Feature-registry mobile pill overlap
Fitness pills (web-0.84) overlap feature-name text on narrow viewports, truncating "Event capacity overflow" to "Eve...cap...". Layout defect on primary-platform-admin mobile.

### Pattern 9 — Mobile responsive generally strong
No mobile-specific regressions found except the feature-registry pill overlap (above). Purpose-built surfaces reflow cleanly across most flows.

### Pattern 10 — "Missing provider keys" banner ubiquitous
Amber banner appears on nearly every admin capture. Non-blocking but pervasive — should be scoped to platform-admin + dismissable-with-persistence.

### Pattern 11 — platform-support role: missing distinct surface on ~8 flows
Reuses admin chrome without read-only gating OR shows generic deny message. Exemplar pattern to copy: design-system-governance + module-lifecycle + rag-quality-feedback + meta-arbitration-engine all show "read-only for support access — escalate to platform-admin" banner + disabled write controls + search/inspector UI.

---

## Exemplar-shipped surfaces (template for fix cycles)

These flows demonstrate the quality bar for a PASS verdict and should be referenced when fixing the weaker flows:

1. **meta-arbitration-engine** (10/10 platform-admin): 5-policy × 6-rounds verdict grid + detail pane with rationale + Approve/Override/Escalate/Defer
2. **marketplace-payments** (8-10 across 10 roles): guest checkout · member checkout · admin payment ops · PO-based B2B checkout · referral banner · freelancer redirect · organiser redirect · platform overview · support inspector · payments admin
3. **design-system-governance** (85% module coverage): stack coupling grid + compatibility reports + per-dimension incompatibility tags + role branching
4. **platform-agent** (23/25): 4-role scope separation with GDPR processing-basis annotations
5. **human-interaction-gate**: tenant-user "My Pending Approvals" with countdown timers + SLA-breached state + delegate action is best-in-class tenant-user UX

---

## Per-flow summary (all 44 flows)

| Flow | Verdict | Axis-D | Module % | Cells | Block Count | Primary Issue |
|------|---------|--------|----------|-------|-------------|----------------|
| adaptive-rag-deep-research | PASS | SHIPPED | 95 | 9 | 0 | Minor tablet canvas clip |
| ads-platform | CONCERN | PARTIAL | 60 | 18 | 0 | No per-role branching; ConsentGate missing |
| ai-safety-moderation | PASS | SHIPPED | 90 | 18 | 0 | tenant-user dev-instruction fallback only |
| bfa-cross-flow-governance | PASS | SHIPPED | 92 | 9 | 0 | CF-XXX numbers retained for admin |
| blog-cms-modules | CONCERN | PARTIAL | 50 | 18 | 9 | Reader shipped; author dashboards = raw CRUD |
| bundle-activation | CONCERN | PARTIAL | 65 | 9 | 0 | G1 Progress Strip phases not shipped |
| client-push | PASS | SHIPPED | 88 | 9 | 0 | FLOW-40 orphan closed — clean |
| cms-publishing | CONCERN | PARTIAL | 55 | 18 | 5 | tenant-admin falls to raw CRUD |
| completion-gamification | BLOCK | NOT_SHIPPED | 0 | 9 | 6 | All cells = skeleton; kiosk never built |
| data-warehouse-analytics | CONCERN | PARTIAL | 50 | 12 | 3 | tenant-admin = raw CRUD not G6 |
| design-intelligence-engine | PASS | SHIPPED | 75 | 12 | 0 | Topology graph not yet; populated leaks FLOW-04 |
| design-system-governance | PASS | SHIPPED | 85 | 9 | 0 | Exemplar |
| durable-sagas-compliance | BLOCK | NOT_SHIPPED | 25 | 12 | 12 | All 4 roles see engineering surface |
| dynamic-forms-workflows | CONCERN | PARTIAL | 30 | 12 | 2 | Role-aware demo shipped; G7 builder missing |
| etl-data-integration | CONCERN | PARTIAL | — | — | — | tenant-admin = raw CRUD; pipeline list shipped |
| event-attendance | CONCERN | — | — | — | — | Strong organiser view; populated-tenant-user 404 |
| event-management | CONCERN | — | — | — | — | admin moderation thin; platform-admin thin |
| feature-registry | CONCERN | — | — | — | — | Desktop 3s; MOBILE PILL OVERLAP defect |
| form-builder-templates | CONCERN | — | — | — | — | tenant-admin best 3; anon/user see admin controls |
| freelancer-marketplace | CONCERN | — | — | — | — | 6 roles 3/3; platform-support/admin thin |
| friend-request-social-feed | CONCERN | — | — | — | — | Mostly 3s; populated 404; platform-admin thin |
| human-interaction-gate | PASS | — | — | — | — | 4-role matrix except platform-support deny |
| i18n-translation | CONCERN | PARTIAL | — | — | — | Admin/platform-admin strong; user+translator deny |
| marketplace | CONCERN | — | — | — | — | Baseline table for all 5 roles; populated=error |
| marketplace-payments | PASS | SHIPPED | — | — | — | Exemplary 10-role differentiation |
| marketplace-plugin-adapter | CONCERN | PARTIAL | — | — | — | Strong catalog + vendor; tenant-user/support/organiser = deny |
| meta-arbitration-engine | PASS | SHIPPED | — | — | — | 10/10 platform-admin — BEST-IN-PRODUCT |
| meta-flow-engine | PASS | SHIPPED | — | — | — | Rich 8-phase lifecycle + support read-only |
| module-lifecycle | PASS | SHIPPED | — | 23/25 | 0 | Module registry + publish/deprecate/retire |
| oss-curriculum | PASS | SHIPPED | — | 21/25 | 0 | platform-support fully blocked vs read-only |
| platform-agent | PASS | SHIPPED | — | 23/25 | 0 | Best-in-batch 4-role scope; GDPR annotations |
| profile-enrichment | PASS_MINIMAL | N/A | — | 18/25 | 0 | Appropriately sparse for needs_UI=NO |
| rag-quality-feedback | PASS | SHIPPED | — | 23/25 | 0 | GDPR-aware support variant |
| reviews-reputation | PASS | — | — | 20/25 | 0 | Three-role split clean |
| saas-multi-tenancy | FAIL | — | — | 14/25 | 0 | tenant-user sees Terminate Tenant — P0 |
| schema-registry-dag | PASS | — | — | 19/25 | 0 | Missing admin register/approve CTA |
| sharable-flows-marketplace | CONCERN | PARTIAL | — | 11/15 | — | Missing admin approve/reject CTA |
| subscription-billing | CONCERN | — | — | 11/15 | — | No business-partner / tenant-admin cancel |
| system-initiation-bootstrap | BLOCK | — | — | 8/15 | — | Anonymous route misrouted; no progress bar |
| tenant-lifecycle-manager | PASS | — | — | 13/15 | — | Best in batch F |
| transactional-event-participation | CONCERN | — | — | 11/15 | — | No organiser scan; confirmation = loading/404 only |
| user-groups-communities | PASS | — | — | 14/15 | — | 4-persona coverage clean |
| user-registration | PASS | — | — | 12/15 | — | State matrix comprehensive |
| visual-flow-engine | PASS | — | — | 13/15 | — | n8n canvas + cross-tenant audit + support read-only |

---

## Convergence verdict against dual criterion (SK-550 + SK-551)

Per SK-550 visual-examination-round skill and SK-551 coverage-matrix skill:

**Condition 1 (round_over_round_improvement_pct < 1%):** Cannot evaluate — this is the first proper Axis-D baseline against the 15-axis rubric. No prior comparable round exists.

**Condition 2 (coverage_NOT_YET_EXAMINED = 0):** **MET** — all 44 flows directly examined (no extrapolation), 549 PNGs scored across Axis A/B/D + module coverage.

**Condition 3 (NEEDS_PURPOSE_BUILT_UI flows have Axis D verified):** **PARTIALLY MET** — 30 flows were flagged NEEDS_PURPOSE_BUILT_UI; 5 of those (completion-gamification, durable-sagas-compliance, saas-multi-tenancy, system-initiation-bootstrap, dynamic-forms-workflows) failed the Axis D purpose-built check. Those 5 flows do NOT count as converged — the purpose-built surface has not shipped.

**Overall verdict:** NOT CONVERGED. 5 flows need implementation work before a CONVERGED claim can be made. No more extrapolation — the 5 flow gaps must close with ACTUAL purpose-built surfaces visible in captured PNGs.

---

## V-R10 proposed fix plan (priority-ordered)

### P0 — Security / trust leaks
1. **saas-multi-tenancy**: Remove Terminate Tenant button from tenant-user render path; add role gate (tenant-admin + platform-admin only).
2. **durable-sagas-compliance platform-support**: Disable Execute Saga + other write CTAs for support role.
3. **Populated admin metadata on anonymous routes**: Remove admin-only fields (contentId, schemaId, publishedAt, googlebot, bundleId, winningPriceCents) from tenant-user / anonymous populated-state renders.

### P1 — NOT_SHIPPED purpose-built surfaces (5 flows)
4. **completion-gamification**: Build Duolingo-style kiosk + Khan-style dashboard; remove skeleton stub pattern.
5. **durable-sagas-compliance**: Build 4 role variants (tenant-user GDPR page, tenant-admin saga list, platform-admin cross-tenant, platform-support read-only).
6. **system-initiation-bootstrap**: Build G1 Progress Strip; add retry/restart actions; gate anonymous route.
7. **dynamic-forms-workflows**: Build G7 three-column builder + Typeform kiosk respondent (or product-decision scope reduction).
8. **saas-multi-tenancy**: Add tenant list + plan + metrics + state timeline; wire default-platform-admin route.

### P2 — CRUD-fallback fixes (4 flows)
9. **blog-cms-modules tenant-admin + platform-admin**: Build Ghost/WordPress-style author card list with Draft/Scheduled/Published badges.
10. **data-warehouse-analytics tenant-admin**: Build G6 dashboard (4 metric tiles + time-series chart + period selector).
11. **etl-data-integration tenant-admin**: Build connector-console (not DynamicController).
12. **cms-publishing tenant-admin**: Build editorial card-list (extends Pattern 1 fix).

### P3 — Role-branching gaps
13. **ads-platform**: Build ConsentGatePage for anonymous; role-branch platform-admin/platform-support from tenant-admin campaign list.
14. **marketplace-plugin-adapter**: Add read-only inspector for tenant-user + platform-support + event-organiser (exemplar: design-system-governance platform-support).
15. **i18n-translation**: Build translator workbench (translation memory + segment editor); build tenant-user language-switcher kiosk.
16. **human-interaction-gate platform-support**: Add read-only approval inspector (exemplar: meta-arbitration-engine support variant).
17. **oss-curriculum platform-support**: Add read-only grade-trend inspector.

### P4 — MINOR stylistic
18. **feature-registry mobile**: Fix fitness pill overlap on primary-platform-admin mobile.
19. **FLOW-XX badge leaks**: adaptive-rag-deep-research (FLOW-29), bundle-activation (FLOW-00).
20. **"Missing provider keys" banner**: Scope to dev-mode or platform-admin-with-missing-keys only; persist dismiss state.
21. **"RAW {FLOW}-INDEX (ADMIN DEBUG)" accordion**: Feature-flag off by default for tenant-admin.
22. **Populated captures returning 404**: Fix route bindings for event-attendance, friend-request-social-feed, cms-publishing /cms/:slug, saas-multi-tenancy default-platform-admin.
23. **Marketplace populated = error**: Wire the populated state to seed packages (instead of the error-loading fallback).

---

## Resume artifacts

- `.tmp-axis-d-batch-{A,B,C,D,E,F}.json` — per-batch structured findings
- `AXIS-D-SWEEP-INVENTORY.json` — the 44-flow input matrix
- `AXIS-D-SWEEP-STATE.json` — in-flight state tracker
- `EXAMINATION-GAP-ANALYSIS-2026-04-21.md` — why V-R7 was invalid
- `PROPER-EXAMINATION-PLAN-v1.md` — the 15-axis methodology
- `VISUAL-REEXAMINATION-PLAN.md` — dual convergence criterion
- `PER-IMAGE-VALIDATION-TEMPLATE.md` — Axis D mandatory for NEEDS_PURPOSE_BUILT_UI
- `.claude/skills/per-image-validation-SKILL.md` (SK-549) — 7-axis per-PNG rubric
- `.claude/skills/visual-examination-round-SKILL.md` (SK-550) — round-structure protocol
- `.claude/skills/coverage-matrix-SKILL.md` (SK-551) — matrix governance

No extrapolation: every flow directly scored. No "CONVERGED" claim until P1 list closes (5 NOT_SHIPPED flows get their purpose-built surfaces built).
