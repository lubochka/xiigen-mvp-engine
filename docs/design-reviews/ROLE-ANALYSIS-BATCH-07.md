# Role Analysis — Batch 7 of ~10 (FLOW-31 → FLOW-35)

## Date: 2026-04-20 | Branch: claude/pensive-tereshkova-baf347
## Source: XIIGen P1 business-logic inventories (placeholder) + CLAUDE.md slug semantics + topology + existing page scaffolds
## Scope constraint: per Luba, no more than 5 flows per run

---

## Batch 7 scope

**Mixed batch — 2 public-facing marketplaces + 3 engine-internal flows.** FLOW-32 sharable-flows-marketplace and FLOW-34 marketplace-plugin-adapter were already flagged as high-priority public-internet flows in the matrix's rollout priority list. FLOW-31/33/35 are engine-internal two-role-minimum.

All 5 P1 inventories are placeholder (no parseable business-logic content). Role analysis derived from slug + CLAUDE.md execution-order position + topology.

Existing client scaffolds confirmed:

- **FLOW-31 design-intelligence-engine:** `DesignIntelligenceEnginePage.tsx`
- **FLOW-32 sharable-flows-marketplace:** `SharableFlowsMarketplacePage.tsx`
- **FLOW-33 system-initiation-bootstrap:** `SystemInitiationBootstrapPage.tsx`
- **FLOW-34 marketplace-plugin-adapter:** `MarketplacePluginAdapterPage.tsx`
- **FLOW-35 meta-arbitration-engine:** `MetaArbitrationEnginePage.tsx`

---

## Zip-to-XIIGen mapping for batch 7

No direct zip documents. These flows are engine substrate (FLOW-31/33/35) or engine-marketplaces (FLOW-32/34). Analysis inferred from slug + architectural position.

---

## FLOW-31 — Design Intelligence Engine

**Business-logic summary (inferred from slug):** AI-driven design intelligence — accepts design briefs, proposes component compositions, validates design-token consistency, analyzes design-system drift. This is the engine's design-side co-pilot for FLOW-37 (design-system-governance). Platform-admin tunes the intelligence; tenant-admin may use a tenant-scoped design console if FREEDOM-enabled.

**Entry points (inferred):** `GET /admin/platform/design-intelligence` (platform-admin), `GET /admin/platform/design-intelligence/traces/:id` (platform-admin — decision trace), `GET /admin/design-intelligence` (tenant-admin — FREEDOM-gated tenant design console), `GET /support/design-intelligence/:traceId` (platform-support).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — tune design intelligence, review proposals, manage design-token dictionary | Design intelligence ops console + proposal queue + token editor | ✅ YES — design intelligence ops primary |
| **`platform-support`** | Read-only — inspect AI proposal traces for support tickets | Per-trace inspector | ⚠️ read-only variant |
| **`tenant-admin`** | FREEDOM-gated — tenant-scoped design workflow (propose components for the tenant's design system) | Tenant design console + proposal queue (narrow scope) | ⚠️ FREEDOM-gated |
| All other roles | — | Engine substrate | — |

### Template implications

1. `DesignIntelligenceEnginePage` (existing) → platform-admin primary.
2. `TenantDesignIntelligencePage` (`/admin/design-intelligence`) — tenant-admin FREEDOM-gated.
3. `DesignIntelligenceSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-31

anon — · public-mkt — · tenant-user — · tenant-admin ⚠️ (FREEDOM) · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 1 cell; now **1 full + 2 partial** cells. +2.)

---

## FLOW-32 — Sharable Flows Marketplace

**Business-logic summary (inferred from slug):** Marketplace where tenant-admins publish their custom FREEDOM-flows for OTHER tenants to install. Similar to an "app store" for flows. Freelancers may publish flows-as-a-service; business-partners may subscribe to premium flow bundles; platform-admins curate + promote quality flows.

**Entry points (inferred):** `GET /flows-marketplace` (public browse), `GET /flows-marketplace/:flowId` (public detail), `POST /admin/flows-marketplace/install/:flowId` (tenant-admin install), `POST /admin/flows-marketplace/publish` (tenant-admin or freelancer — publish own flow), `GET /admin/platform/flows-marketplace` (platform-admin curation).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Browses public flow marketplace for discovery | Flow grid + detail preview + "Sign in to install" CTA | ✅ YES — public browse |
| **`public-marketplace-visitor`** | Permalink landing on specific flow | Flow detail + install-count + reviews + auth gate for install | ✅ YES — permalink landing |
| **`tenant-user`** | Browses available flows (install action gated to tenant-admin permission) | Full catalog + "request your admin to install" CTA | ✅ YES — user browse |
| **`tenant-admin`** | Primary installer — picks flows, configures them for tenant, manages installed flows | Flow catalog + install UI + installed-flows dashboard | ✅ YES — admin installer primary |
| **`referral-user`** | Referred to the marketplace by a flow author; "referrer gets credit on install" | Standard browse + referrer-relationship banner | ⚠️ referral banner variant |
| **`freelancer`** | Publishes flows-as-a-service as part of gig offerings | Flow publisher console + earnings from installs | ✅ YES — freelancer publisher |
| **`business-partner`** | Subscribes to premium flow bundles (B2B tier — exclusive flows, priority support) | B2B flow bundle catalog + subscription management | ✅ YES — B2B subscriber |
| **`event-organiser`** | — | No distinct surface — inherits tenant-user browse | — |
| **`platform-admin`** | Marketplace curation — review submissions, promote quality flows, enforce policy, take down violations | Curation queue + promotion gate + policy admin | ✅ YES — platform curation |
| **`platform-support`** | Read-only dispute resolution — flow author or installer reports issues | Single-flow inspector + dispute history | ⚠️ read-only variant |

### Cross-role surfaces

- **Flow detail page** at `/flows-marketplace/:flowId` is the densest role-aware surface in batch 7 — anonymous + public-mkt + tenant-user (browse-only) + tenant-admin (install-CTA) + freelancer (own-flow-editor if they authored it) + business-partner (subscription tier badge) + platform-admin (moderation actions). Six+ branches.

### Template implications

1. `SharableFlowsMarketplacePage` (existing) → role-fork across 6 primary branches.
2. `PublicFlowMarketplaceDetailPage` (`/flows-marketplace/:flowId`) — role-aware detail.
3. `FreelancerFlowPublisherPage` (`/admin/my-flows/publisher`) — freelancer primary.
4. `PlatformFlowMarketplaceCurationPage` — platform-admin.

### ROLE-COVERAGE-MATRIX update for FLOW-32

anon ✅ · public-mkt ✅ · tenant-user ✅ · tenant-admin ✅ · referral ⚠️ (banner) · freelancer ✅ · biz-partner ✅ · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 8 cells; now **7 full + 2 partial** cells = 9 — confirmed high-priority public-facing flow.)

---

## FLOW-33 — System Initiation Bootstrap

**Business-logic summary (inferred from slug + execution-order position "bootstrap boundary"):** The first-run platform bootstrap sequence — initializes schema registry, seeds the first admin user, bootstraps the meta-engine, loads initial arbiters. Usually runs ONCE per environment; re-runs only during platform re-initialization or disaster recovery.

**Entry points (inferred):** `GET /admin/platform/bootstrap` (platform-admin — bootstrap console), `POST /admin/platform/bootstrap/reseed` (platform-admin — rare disaster-recovery action), `GET /setup` (anonymous — one-time first-run setup wizard when platform is fresh).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — bootstrap console, re-initialization triggers, boot-time health check | Bootstrap console + service-dependency graph + init logs | ✅ YES — bootstrap ops primary |
| **`platform-support`** | Read-only audit of boot sequences, boot-time diagnostics | Per-boot log inspector | ⚠️ read-only variant |
| **`anonymous`** | First-ever setup wizard — when platform is fresh (BEFORE the first admin exists) | Bootstrap wizard + admin-creation form + initial-config | ⚠️ first-run wizard (transient) |
| All other roles | — | Bootstrap is the ONE-TIME path — after first-run, tenant-user/admin paths exist; FLOW-33 itself is platform-ops-only post-bootstrap | — |

### Template implications

1. `SystemInitiationBootstrapPage` (existing) → platform-admin primary.
2. `FirstRunSetupWizardPage` (`/setup`) — anonymous one-time wizard (deactivated after first admin exists).
3. `BootstrapSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-33

anon ⚠️ (first-run only) · public-mkt — · tenant-user — · tenant-admin — · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 1 cell; now **1 full + 2 partial** cells. +2.)

---

## FLOW-34 — Marketplace Plugin Adapter

**Business-logic summary (from CLAUDE.md — "feature-aware, reads FT records"; ADMIN_FACING):** Plug-and-play adapter catalog for third-party integrations (Stripe adapter, HubSpot adapter, Slack adapter, etc.). Distinct from FLOW-32 sharable-flows-marketplace which shares CUSTOM FLOWS; FLOW-34 shares INTEGRATION ADAPTERS built by platform or third-party vendors. Business-partners (vendors) publish adapters; tenant-admins install them.

**Entry points (inferred):** `GET /plugins` (public browse catalog), `GET /plugins/:id` (public detail), `POST /admin/plugins/install/:id` (tenant-admin install), `GET /admin/my-plugins` (tenant-admin — installed-plugins dashboard), `GET /admin/platform/plugins` (platform-admin curation), `POST /partner/plugins/publish` (business-partner — vendor publish).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Browses public plugin catalog for discovery (pre-auth vendor evaluation) | Catalog + plugin detail preview + "Sign in to install" | ⚠️ public browse (near-merge with public-mkt) |
| **`public-marketplace-visitor`** | Primary public browser — permalink landings on specific plugins | Plugin detail + installation-count + ratings + auth gate | ✅ YES — public permalink |
| **`tenant-user`** | Browse available plugins (install gated to tenant-admin) | Catalog + "request your admin" CTA on install | ✅ YES — user browse |
| **`tenant-admin`** | Primary installer — picks plugins, configures API keys, manages installed plugins | Catalog + install wizard + installed-plugins dashboard + API-key vault | ✅ YES — admin installer |
| **`freelancer`** | Narrow — may publish a plugin for automating their gig workflow (e.g., Calendly-sync) | Plugin publisher console + gig-plugin earnings | ⚠️ niche publisher |
| **`business-partner`** | Primary vendor — publishes commercial plugins, tracks install metrics, manages support tier | Vendor publisher + metrics dashboard + support-tier controls | ✅ YES — vendor primary |
| **`platform-admin`** | Marketplace curation — vendor verification, plugin policy, security review, promote official plugins | Curation queue + security audit + promotion gate | ✅ YES — platform curation |
| **`platform-support`** | Read-only dispute resolution — vendor/installer issues | Single-plugin inspector + dispute history | ⚠️ read-only variant |
| **`event-organiser` / `referral-user`** | — | Inherit tenant-user browse | — |

### Cross-role surfaces

- **Plugin detail page** is public-facing like FLOW-32's flow-detail — anonymous + public-mkt + tenant-user (browse-only) + tenant-admin (install-CTA) + business-partner (own-plugin-editor if vendor) + platform-admin (moderation). Five+ branches.

### Template implications

1. `MarketplacePluginAdapterPage` (existing) → role-fork.
2. `PublicPluginCatalogPage` (`/plugins`) — anonymous + public-mkt.
3. `PartnerPluginPublisherPage` (`/partner/plugins/publish`) — business-partner vendor.
4. `PlatformPluginCurationPage` — platform-admin.

### ROLE-COVERAGE-MATRIX update for FLOW-34

anon ⚠️ · public-mkt ✅ · tenant-user ✅ · tenant-admin ✅ · referral — · freelancer ⚠️ (niche) · biz-partner ✅ · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 5 cells; now **5 full + 3 partial** cells = 8. +3.)

---

## FLOW-35 — Meta Arbitration Engine

**Business-logic summary (inferred from slug + CLAUDE.md execution-order position after FLOW-31):** The engine that resolves CONFLICTS between arbitrators across flows — when FLOW-24 AI safety disagrees with FLOW-27 human gate, or when two concurrent arbiters produce different verdicts on the same content. Pure governance substrate; no tenant-visible surface.

**Entry points (inferred):** `GET /admin/platform/meta-arbitration` (platform-admin — arbitration console), `GET /admin/platform/meta-arbitration/conflicts/:id` (platform-admin — conflict detail + resolution), `GET /support/meta-arbitration/:conflictId` (platform-support — read-only audit).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — arbitration console, conflict resolution, meta-rule authoring | Full meta-arbitration ops | ✅ YES — meta-arbitration primary |
| **`platform-support`** | Read-only audit — "why was this content blocked in a tie-break?" | Per-conflict inspector | ⚠️ read-only variant |
| All other roles | — | Pure governance substrate | — |

### Template implications

1. `MetaArbitrationEnginePage` (existing) → platform-admin primary.
2. `MetaArbitrationSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-35

anon — · public-mkt — · tenant-user — · tenant-admin — · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 1 cell; now **1 full + 1 partial** cells. +1.)

---

## Consolidated role signals across batch 7

| Role | Flows in batch 7 needing it | Notes |
|------|:---------------------------:|-------|
| `anonymous` | FLOW-32 ✅, FLOW-33 ⚠️ (first-run), FLOW-34 ⚠️ | Marketplace browse + one-time bootstrap |
| `public-marketplace-visitor` | FLOW-32 ✅, FLOW-34 ✅ | Primary public browsers for flow + plugin catalogs |
| `tenant-user` | FLOW-32 ✅, FLOW-34 ✅ | Browse catalogs (install-gated) |
| `tenant-admin` | FLOW-31 ⚠️, FLOW-32 ✅, FLOW-34 ✅ | Primary installer of flows + plugins |
| `referral-user` | FLOW-32 ⚠️ | Referrer-credit banner |
| `freelancer` | FLOW-32 ✅ (publisher), FLOW-34 ⚠️ (niche publisher) | Flow + plugin publishers |
| `business-partner` | FLOW-32 ✅ (B2B), FLOW-34 ✅ (vendor) | Subscriber + vendor across two marketplaces |
| `event-organiser` | — | No dedicated surface in batch 7 |
| `platform-admin` | All 5 ✅ | Universal |
| `platform-support` | All 5 ⚠️ | Universal read-only audit |

### Biggest finding in batch 7

**FLOW-32 + FLOW-34 confirm the "engine marketplace" density pattern.** Both flows have 8-9 cells because they expose public CONSUMER browsing, tenant INSTALLER actions, vendor PUBLISHER workflows, AND platform CURATOR oversight — four distinct personas on the same marketplace URL. This mirrors FLOW-08 (consumer marketplace) but with vendor + curator additions.

**These two flows + FLOW-08 + FLOW-16 are the fleet's four "dual-sided marketplaces":**
- FLOW-08 marketplace — consumers × sellers
- FLOW-16 marketplace-payments — buyers × payees
- FLOW-32 sharable-flows-marketplace — installers × flow authors
- FLOW-34 marketplace-plugin-adapter — installers × plugin vendors

All four need RoleScopedView on their detail pages as the highest-priority rollouts after the FLOW-08 pilot.

### Consolidated batch 1..7 density (per flow, top 15)

| Flow | Active role cells | Density rank |
|------|------------------:|-------------:|
| FLOW-16 marketplace-payments | 10 | #1 |
| FLOW-08 marketplace | 9 | #2 |
| FLOW-12 subscription-billing | 9 | #2 |
| FLOW-17 freelancer-marketplace | 9 | #2 |
| FLOW-22 cms-publishing | 9 | #2 |
| FLOW-28 blog-cms-modules | 9 | #2 |
| FLOW-32 sharable-flows-marketplace | 9 | #2 |
| FLOW-09 transactional-event-participation | 8 | #8 |
| FLOW-03 event-management | 8 | #8 |
| FLOW-20 ads-platform | 8 | #8 |
| FLOW-34 marketplace-plugin-adapter | 8 (5 full + 3 partial) | #8 |
| FLOW-21 dynamic-forms-workflows | 7 | #12 |
| FLOW-01 user-registration | 7 | #12 |
| FLOW-07 friend-request-social-feed | 7 | #12 |
| FLOW-10 reviews-reputation | 7 | #12 |

---

## Fleet-wide plan validation status (end of batch 7)

| Plan | 48-flow coverage |
|------|---|
| P14b FLOW-SESSION-VISUALIZATION-v2 | ✅ 164 PNGs |
| UX-FIX-THREE-TRACK | ✅ |
| UX-FIX-EXECUTION (7-task v2) | ✅ |
| P14-EXECUTION (P1-14 test coverage) | ✅ |
| FLOW-UI-COVERAGE-PLAN-UNIFIED | ✅ |
| FLOW-48-PLAN-P1-P14 (i18n) | ✅ 12/12 + 14 PNGs |
| ui-ux-pro-max-skill-main | ✅ baseline; 43 pages pending useTranslation |
| **C6 role-aware templating** | 🟡 scaffold + FLOW-08 pilot; **7 of 10 batches DONE** — 35 of 48 flows deeply reviewed (73%) |

**Overall gate:** 7 of 8 plans GREEN. C6 rollout analysis at **73% complete**.

---

## Running coverage target

- Initial: ~135
- After batch 1: +9 → 144
- After batch 2: +20 → 155
- After batch 3: +18 → 173
- After batch 4: +7 → 180
- After batch 5: +18 → 198
- After batch 6: +9 → 207
- **After batch 7: +9 → 216**

Fleet target on track — remaining 3 batches (FLOW-36..48 = 13 flows) will add an estimated 10-15 more cells (mostly engine-internal two-role minimum), for a final target in the 225-230 band.

**Top-rollout priority (after batch 7):** The seven-way tie at 9 cells now makes FLOW-08 pilot pattern the template for 6 other flows, plus FLOW-16 marketplace-payments at 10 cells sits alone at #1.

---

## Next batch

Batch 8 target: **FLOW-36 → FLOW-40** (feature-registry, design-system-governance, rag-quality-feedback, oss-curriculum, client-push). Mostly admin-narrow engine flows with FLOW-39 oss-curriculum as a lighter public-surface exception.

Produces: `docs/design-reviews/ROLE-ANALYSIS-BATCH-08.md` on the next run.

---

## Footer

Produces artifact at: `docs/design-reviews/ROLE-ANALYSIS-BATCH-07.md`.
Companion: `docs/design-reviews/ROLE-COVERAGE-MATRIX.md` (matrix rows 31..35 updated).
Prior batches: `ROLE-ANALYSIS-BATCH-01.md` through `-06.md`.
Fleet verdict context: `docs/design-reviews/FLEET-VALIDATION-v2.md`.
