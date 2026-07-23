# Role Analysis — Batch 6 of ~10 (FLOW-26 → FLOW-30)

## Date: 2026-04-20 | Branch: claude/pensive-tereshkova-baf347
## Source: XIIGen P1 business-logic inventories + CLAUDE.md slug semantics + topology + existing page scaffolds
## Scope constraint: per Luba, no more than 5 flows per run

---

## Batch 6 scope

**Engine-heavy batch.** 4 of 5 flows are classified `ENGINE_INTERNAL` in their P1 inventory (FLOW-26, -27, -29, -30). The exception is FLOW-28 blog-cms-modules (`TENANT_FACING`) which tracks closely to FLOW-22 CMS density. Expect low role density overall with one outlier.

P1 inventories for FLOW-26/27/29/30 are DNA-placeholder content (no domain business-logic states parsed) — these flows are self-describing engine substrate. Role analysis is derived from slug + CLAUDE.md + topology context.

Existing client scaffolds confirmed:

- **FLOW-26 meta-flow-engine:** `MetaFlowEnginePage.tsx`
- **FLOW-27 human-interaction-gate:** `HumanInteractionGatePage.tsx`
- **FLOW-28 blog-cms-modules:** `BlogCmsModulesPage.tsx`
- **FLOW-29 adaptive-rag-deep-research:** `AdaptiveRagDeepResearchPage.tsx`
- **FLOW-30 tenant-lifecycle-manager:** `TenantLifecycleManagerPage.tsx`

---

## Zip-to-XIIGen mapping for batch 6

No direct zip documents map to this batch. These flows are engine substrate (FLOW-26/27/29/30) or unimplemented namespace reservations (FLOW-28). Analysis is inferred.

| Business doc | XIIGen flow | Coverage |
|--------------|-------------|----------|
| (no zip doc) | **FLOW-26 meta-flow-engine** | Engine-internal; platform-admin only |
| (no zip doc) | **FLOW-27 human-interaction-gate** | Engine-internal gate surface |
| (no zip doc — CMS/blog concept referenced in `06-marketplace-publishing.md`) | **FLOW-28 blog-cms-modules** | Partial via marketplace publishing cross-ref |
| (no zip doc) | **FLOW-29 adaptive-rag-deep-research** | Engine-internal RAG substrate |
| (no zip doc) | **FLOW-30 tenant-lifecycle-manager** | Engine-internal lifecycle orchestration |

---

## FLOW-26 — Meta Flow Engine

**Business-logic summary (inferred from slug):** The meta-engine that composes flows at runtime. Reads feature flags (FLOW-36 Feature Registry), reads meta-arbitration decisions (FLOW-35), dispatches tasks through the cycle architecture. Pure platform operator surface — tenants never see this directly.

**Entry points (inferred):** `GET /admin/platform/meta-engine` (platform-admin — routing config + live metrics), `GET /admin/platform/meta-engine/decisions/:id` (platform-admin — decision trace), `GET /support/meta-engine/:traceId` (platform-support — debug view).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — manages meta-flow routing config, inspects live dispatches, troubleshoots routing decisions | Meta-engine console with flow-graph + live dispatch stream + config editor | ✅ YES — meta-engine ops primary |
| **`platform-support`** | Read-only debug — "why did this flow route through here?" for support tickets | Per-trace inspector — meta-engine decision log + input/output snapshots | ⚠️ read-only variant |
| All other roles | — | Engine internals — never exposed to tenant or end-user | — |

### Template implications

1. `MetaFlowEnginePage` (existing) → platform-admin primary.
2. `MetaEngineSupportInspectorPage` (`/support/meta-engine/:traceId`) — platform-support read-only.

### ROLE-COVERAGE-MATRIX update for FLOW-26

anon — · public-mkt — · tenant-user — · tenant-admin — · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️ (read-only)

(Previously 1 cell; now **1 full + 1 partial** cells. +1.)

---

## FLOW-27 — Human Interaction Gate

**Business-logic summary (inferred from slug + CLAUDE.md execution-order position):** Gate surface for human-in-the-loop interventions on AI-orchestrated flows. When the meta-engine (FLOW-26) or meta-arbitration (FLOW-35) needs human approval on a decision, it routes through FLOW-27. Human approvers (typically platform-admins for engine decisions; tenant-admins for tenant-scoped decisions) resolve the gate. End-users receive status updates when their action is pending gate approval.

**Entry points:** `GET /admin/gates` (tenant-admin — tenant-scoped gates), `POST /admin/gates/:id/approve` (tenant-admin or platform-admin), `GET /admin/platform/gates` (platform-admin — cross-tenant gate queue), `GET /my/pending-approvals` (tenant-user — their pending-gate actions).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`tenant-admin`** | Primary tenant-scope approver — reviews tenant-local gates (content moderation, flow approval, FREEDOM-config change) | Gate queue + decision UI + delegation controls | ✅ YES — tenant gate approver |
| **`tenant-user`** | Receives notifications when their action is pending gate approval; may withdraw the action | "My pending approvals" list + withdraw action | ✅ YES — user-facing pending surface |
| **`platform-admin`** | Cross-tenant gate ops (ToS-critical escalations, fleet-wide policy changes, meta-engine approvals) | Cross-tenant gate queue + priority-escalation + override | ✅ YES — platform gate ops |
| **`platform-support`** | Read-only gate history for support tickets ("why is this action stuck?") | Single-gate inspector + decision timeline | ⚠️ read-only variant |
| All other roles | — | Engine gate mechanic — other personas fall through to tenant-user pending-list | — |

### Cross-role surfaces

- **"My pending approvals" page** is tenant-user's entry point to FLOW-27. The admin queue at `/admin/gates` is the approver-side mirror of the same data.

### Template implications

1. `HumanInteractionGatePage` (existing) → tenant-admin + platform-admin primary.
2. `MyPendingApprovalsPage` (`/my/pending-approvals`) — tenant-user.
3. `GateSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-27

anon — · public-mkt — · tenant-user ✅ · tenant-admin ✅ · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 3 cells; now **3 full + 1 partial** cells. +1.)

---

## FLOW-28 — Blog/CMS Modules

**Business-logic summary (from CLAUDE.md — "Blog/CMS Modules — namespace reserved F1129-F1175, T423-T440; not yet implemented"):** Plug-and-play blog/CMS modules — sub-domain of FLOW-22 CMS. Offers pre-built blog templates, commenting widgets, subscription feeds, paywall modules. Tenants install modules into their CMS; readers consume via FLOW-22 runtime. Very similar density pattern to FLOW-22 with module-level admin surface on top.

**Entry points (inferred):** `GET /blog` (public index), `GET /blog/:slug` (public article — overlaps FLOW-22), `GET /admin/blog-modules` (tenant-admin — install/configure modules), `GET /admin/platform/blog-modules` (platform-admin — marketplace of blog modules).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Primary reader of blog content | Blog index + article + comment section + subscribe-CTA | ✅ YES — public reader |
| **`public-marketplace-visitor`** | Permalink landing (near-merge with anonymous) | Same as anonymous | ⚠️ permalink variant |
| **`tenant-user`** (author) | Drafts blog posts using installed modules | Module-aware blog editor | ✅ YES — author |
| **`tenant-admin`** (module installer) | Installs + configures blog modules for tenant (paywall, commenting, subscriber management) | Module install UI + module config + subscriber-list management | ✅ YES — admin installer |
| **`freelancer`** | Hired content author (similar to FLOW-22 cross-cut) | Author view + gig-association breadcrumb | ⚠️ gig-context |
| **`business-partner`** (advertorial/sponsored content sponsor) | Sponsored blog posts | Author view + "sponsored" flag + disclosure | ⚠️ advertorial variant |
| **`event-organiser`** | Event-related blog posts | Author view + event-cross-link | ⚠️ event-cross-link variant |
| **`platform-admin`** | Marketplace of blog modules (cross-tenant) + policy enforcement | Module-marketplace admin + cross-tenant blog policy | ✅ YES — platform blog-module ops |
| **`platform-support`** | Read-only blog-state inspector for support tickets | Single-post inspector + module install history | ⚠️ read-only variant |
| **`referral-user`** | — | Inherits tenant-user | — |

### Cross-role surfaces

- **Blog article page** = FLOW-22 article page + optional module components (comments, paywall, subscription). FLOW-28's contribution is the MODULES visible on the article page.
- **Subscription/paywall** surfaces introduce `tenant-user` vs `anonymous` affordance differences (subscribe CTA is visible to all; redemption/unlock is auth-required).

### Template implications

1. `BlogCmsModulesPage` (existing) → tenant-admin module installer primary.
2. `PublicBlogIndexPage` (`/blog`) — anonymous + public-mkt.
3. `PublicBlogArticlePage` (`/blog/:slug`) — anonymous primary with module components.
4. `PlatformBlogModuleMarketplacePage` (`/admin/platform/blog-modules`) — platform-admin.

### ROLE-COVERAGE-MATRIX update for FLOW-28

anon ✅ · public-mkt ⚠️ · tenant-user ✅ · tenant-admin ✅ · referral — · freelancer ⚠️ (gig-context) · biz-partner ⚠️ (advertorial) · event-org ⚠️ (event-cross-link) · platform-admin ✅ · platform-support ⚠️ (read-only)

(Previously 3 cells; now **4 full + 5 partial** cells. +6 surfaces — tracks FLOW-22 density closely as predicted.)

---

## FLOW-29 — Adaptive RAG / Deep Research

**Business-logic summary (inferred from slug + CLAUDE.md execution-order position):** Adaptive retrieval + deep-research substrate. The engine's research assistant — it performs iterative retrieval, graph-walks knowledge (FLOW-42 rag-quality-graph feeder), and answers complex questions across the tenant's corpus. Primary audience is platform-admins tuning retrieval quality; tenants may have a tenant-scoped "deep research" console if FREEDOM-enabled.

**Entry points (inferred):** `GET /admin/platform/rag` (platform-admin — retrieval quality tuning + model config), `GET /admin/platform/rag/traces/:id` (platform-admin — retrieval trace), `GET /admin/rag` (tenant-admin — tenant-scoped RAG console, if FREEDOM-enabled), `GET /support/tenant/:id/rag` (platform-support — retrieval-trace audit).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — tune retrieval quality, inspect traces, configure embedders, A/B test retrievers | Full RAG ops console + trace viewer + config editor | ✅ YES — RAG ops primary |
| **`platform-support`** | Read-only trace inspector for support tickets ("why did RAG miss this document?") | Per-trace inspector | ⚠️ read-only |
| **`tenant-admin`** | Tenant-scoped deep-research console — query tenant's own corpus (if FREEDOM-enabled) | Research console + query history + saved-searches | ⚠️ FREEDOM-gated |
| All other roles | — | Engine substrate | — |

### Template implications

1. `AdaptiveRagDeepResearchPage` (existing) → platform-admin primary.
2. `TenantRagConsolePage` (`/admin/rag`) — tenant-admin FREEDOM-gated.
3. `RagSupportInspectorPage` (`/support/tenant/:id/rag`) — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-29

anon — · public-mkt — · tenant-user — · tenant-admin ⚠️ (FREEDOM-gated) · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 1 cell + 1 partial; now **1 full + 2 partial** cells. +1.)

---

## FLOW-30 — Tenant Lifecycle Manager (engine)

**Business-logic summary (inferred from slug):** The ENGINE's tenant lifecycle orchestrator — provisioning steps, health checks, offboarding workflows. Distinct from FLOW-15 `saas-multi-tenancy` which is the USER-FACING side (signup forms, tenant directory). FLOW-30 is the behind-the-scenes orchestration that FLOW-15 kicks off.

**Entry points (inferred):** `GET /admin/platform/tenant-lifecycle` (platform-admin), `GET /admin/platform/tenant-lifecycle/:tenantId` (platform-admin), `GET /support/tenant/:id/lifecycle` (platform-support), `GET /admin/my-tenant/lifecycle` (tenant-admin — own tenant's lifecycle status page).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Full provisioning orchestration — launch new tenant, health-check, offboard, bulk ops | Full lifecycle console | ✅ YES — platform lifecycle ops |
| **`platform-support`** | Read-only lifecycle state inspector for support tickets | Per-tenant lifecycle history + event timeline | ✅ YES — platform lifecycle audit |
| **`tenant-admin`** | Own-tenant lifecycle status ("my tenant is 80% provisioned" / "offboarding in 30 days") | Narrow per-tenant status page — no engine controls | ⚠️ status-only |
| All other roles | — | Engine orchestration; not exposed to end-users | — |

### Template implications

1. `TenantLifecycleManagerPage` (existing) → platform-admin primary.
2. `TenantLifecycleSupportInspectorPage` — platform-support.
3. `MyTenantLifecycleStatusPage` (`/admin/my-tenant/lifecycle`) — tenant-admin status-only.

### ROLE-COVERAGE-MATRIX update for FLOW-30

anon — · public-mkt — · tenant-user — · tenant-admin ⚠️ (status-only) · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ✅

(Previously 3 cells; now **2 full + 1 partial** cells. Refinement — tenant-admin demoted from ✅ to ⚠️ since they see only status, not controls. Net 0 change in cell count.)

---

## Consolidated role signals across batch 6

| Role | Flows in batch 6 needing it | Notes |
|------|:---------------------------:|-------|
| `anonymous` | FLOW-28 ✅ | Blog reader only |
| `public-marketplace-visitor` | FLOW-28 ⚠️ | Permalink landings |
| `tenant-user` | FLOW-27 ✅, FLOW-28 ✅ | Gate notifications + blog author |
| `tenant-admin` | FLOW-27 ✅, FLOW-28 ✅, FLOW-29 ⚠️, FLOW-30 ⚠️ | Gate approver + module installer + FREEDOM consoles |
| `referral-user` | — | No dedicated surface in this batch |
| `freelancer` | FLOW-28 ⚠️ | Hired content author |
| `business-partner` | FLOW-28 ⚠️ | Advertorial |
| `event-organiser` | FLOW-28 ⚠️ | Event-promo blog posts |
| `platform-admin` | All 5 ✅ | Universal — densest role in batch 6 |
| `platform-support` | All 5 ⚠️ or ✅ | Universal read-only audit surface |

### Biggest finding in batch 6

**Batch 6 confirms the engine-internal template pattern:** platform-admin + platform-support is the TWO-ROLE minimum for every engine flow (FLOW-26, -29, -30). The human-interaction-gate (FLOW-27) is the notable exception that bridges engine-internal into tenant-visible territory because human-in-the-loop gates REQUIRE tenant-user awareness ("your action is pending review").

**FLOW-28 blog-cms-modules confirms the FLOW-22 CMS density pattern** with a module-level admin surface added on top. Total 9 cells — ties the public-content-publishing cluster at the #5 rollout priority slot.

### Consolidated batch 1..6 density (per flow, top 20)

| Flow | Active role cells | Density rank |
|------|------------------:|-------------:|
| FLOW-16 marketplace-payments | 10 | #1 |
| FLOW-08 marketplace | 9 | #2 |
| FLOW-12 subscription-billing | 9 | #2 |
| FLOW-17 freelancer-marketplace | 9 | #2 |
| FLOW-22 cms-publishing | 9 | #2 |
| FLOW-28 blog-cms-modules | 9 (4 full + 5 partial) | #2 |
| FLOW-09 transactional-event-participation | 8 | #7 |
| FLOW-03 event-management | 8 | #7 |
| FLOW-20 ads-platform | 8 | #7 |
| FLOW-21 dynamic-forms-workflows | 7 | #10 |
| FLOW-01 user-registration | 7 | #10 |
| FLOW-07 friend-request-social-feed | 7 | #10 |
| FLOW-10 reviews-reputation | 7 | #10 |
| FLOW-23 form-builder-templates | 6 | #14 |
| FLOW-13 data-warehouse-analytics | 6 | #14 |
| FLOW-06 user-groups-communities | 6 | #14 |
| FLOW-15 saas-multi-tenancy | 6 | #14 |
| FLOW-24 ai-safety-moderation | 5 | #18 |
| FLOW-04 event-attendance | 5 | #18 |
| FLOW-27 human-interaction-gate | 4 (3 full + 1 partial) | #20 |

---

## Fleet-wide plan validation status (end of batch 6)

| Plan | 48-flow coverage | Tested | UI/UX examined | Business-state evident |
|------|------------------|--------|----------------|------------------------|
| P14b FLOW-SESSION-VISUALIZATION-v2 | ✅ 48/48 — 164 PNGs | ✅ | ✅ | ✅ |
| UX-FIX-THREE-TRACK | ✅ | ✅ | ✅ | ✅ |
| UX-FIX-EXECUTION (7-task v2) | ✅ | ✅ | ✅ | n/a |
| P14-EXECUTION (P1-14 test coverage) | ✅ | ✅ | ✅ | ✅ |
| FLOW-UI-COVERAGE-PLAN-UNIFIED | ✅ all 48 | ✅ | ✅ | ✅ |
| FLOW-48-PLAN-P1-P14 (i18n) | ✅ | ✅ 12/12 Playwright | ✅ 14 PNGs w/ Hebrew | ✅ |
| ui-ux-pro-max-skill-main | ✅ baseline; 43 pages pending useTranslation wiring | partial | ✅ | ✅ |
| **C6 role-aware templating** | 🟡 scaffold + FLOW-08 pilot; 47 flows pending rollout — **207-cell target** | 🟡 1 flow × 7 roles | 🟡 | 🟡 |

**Overall gate:** 7 of 8 plans GREEN. C6 rollout analysis at **6 of 10 batches** (30 of 48 flows deeply reviewed, 62.5%).

---

## Running coverage target

- Initial: ~135 cells
- After batch 1: +9 → 144
- After batch 2: +20 → 155
- After batch 3: +18 → 173
- After batch 4: +7 → 180
- After batch 5: +18 → 198
- **After batch 6: +9 → 207**

Fleet target trajectory confirms the 200-220 band predicted in batch 4. Remaining 4 batches (FLOW-31..48 = 18 flows) will add an estimated 15-25 more cells, nearly all platform-admin + platform-support universal-admin surfaces.

**Top-5 rollout priority (after batch 6):** Expanded — FLOW-28 joins the 9-cell tier, creating a 5-flow tie for #2 after FLOW-16.

---

## Next batch

Batch 7 target: **FLOW-31 → FLOW-35** (design-intelligence-engine, sharable-flows-marketplace, system-initiation-bootstrap, marketplace-plugin-adapter, meta-arbitration-engine). Mixed: FLOW-32 + FLOW-34 are public-facing marketplaces (already flagged as high-priority); rest are engine-internal.

Produces: `docs/design-reviews/ROLE-ANALYSIS-BATCH-07.md` on the next run.

---

## Footer

Produces artifact at: `docs/design-reviews/ROLE-ANALYSIS-BATCH-06.md`.
Companion: `docs/design-reviews/ROLE-COVERAGE-MATRIX.md` (matrix rows 26..30 updated).
Prior batches: `ROLE-ANALYSIS-BATCH-01.md` through `-05.md`.
Fleet verdict context: `docs/design-reviews/FLEET-VALIDATION-v2.md`.
