# Role Coverage Matrix — All 48 Flows
## Date: 2026-04-20 | Branch: claude/pensive-tereshkova-baf347
## Source: Luba C6 (multi-role visibility architecture)
## Scope: canonical mapping of which ViewerRole templates each flow must produce

---

## Why this document exists

Before C6, UI coverage validated **one screen per business-logic phase** — e.g. FLOW-08 marketplace had 5 pages × N mock states, all assuming an authenticated tenant user. After C6, the correct validation is **one screen per (phase × role)** — a marketplace listing may need a public-anonymous view, a tenant-user view, a freelancer view, and a business-partner view of the **same listing state**.

This matrix is the single source of truth for how many role-scoped screens each flow owes. Playwright coverage + PNG evidence + topology visual gates all read from this matrix.

---

## The 10 canonical viewer roles

| Role | Authenticated | Tenant-scoped | Visibility purpose |
|------|:-------------:|:-------------:|--------------------|
| `anonymous` | ❌ | ❌ | Public internet visitor with no identity |
| `public-marketplace-visitor` | ❌ | ❌ | Anonymous browsing a marketplace listing (read-only) |
| `tenant-user` | ✅ | ✅ | Registered user of the tenant (default auth persona) |
| `tenant-admin` | ✅ | ✅ | Administrator of the tenant |
| `referral-user` | ✅ | ✅ | User who joined via a referral link |
| `freelancer` | ✅ | ✅ | User offering services (gigs, milestones) |
| `business-partner` | ✅ | ✅ | Business hiring freelancers or partnering |
| `event-organiser` | ✅ | ✅ | User running events (distinct from attendees) |
| `platform-admin` | ✅ | ❌ | XIIGen platform operator (MASTER_TENANT_ID) |
| `platform-support` | ✅ | ❌ | Platform-level support (read-only cross-tenant) |

Source: `client/src/components/common/ViewerRole.ts`.

---

## Per-flow role matrix

**Column key:**
- ✅ = role is a required template target for this flow
- ⚠️ = role applies conditionally (e.g., tenant-admin visible only when config → admin pages)
- — = role does not apply to this flow's surface
- N/A = entire flow row is not applicable (engine-internal / adapter)

| Flow | Slug | anon | public-mkt | tenant-user | tenant-admin | referral | freelancer | biz-partner | event-org | platform-admin | platform-support |
|------|------|:----:|:----------:|:-----------:|:------------:|:--------:|:----------:|:-----------:|:---------:|:--------------:|:----------------:|
| FLOW-00 | bundle-activation | — | — | — | ✅ | — | — | — | — | ✅ | — |
| FLOW-01 | user-registration | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | — | — |
| FLOW-02 | profile-enrichment | — | — | ✅ | ⚠️ | — | ✅ | ✅ | ✅ | — | — |
| FLOW-03 | event-management | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ | — |
| FLOW-04 | event-attendance | ✅ | ⚠️ | ✅ | ✅ | ✅ | — | — | ✅ | — | — |
| FLOW-05 | completion-gamification | — | — | ✅ | ✅ | — | ⚠️ | — | — | — | — |
| FLOW-06 | user-groups-communities | ✅ | ⚠️ | ✅ | ✅ | — | ⚠️ | — | — | ⚠️ | — |
| FLOW-07 | friend-request-social-feed | ✅ | ⚠️ | ✅ | ✅ | — | ✅ | ✅ | — | ⚠️ | — |
| **FLOW-08** | **marketplace** | **✅** | **✅** | **✅** | **✅** | **⚠️** | **✅** | **✅** | **—** | **✅** | **✅** |
| FLOW-09 | transactional-event-participation | ✅ | — | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| FLOW-10 | reviews-reputation | ✅ | ✅ | ✅ | ✅ | — | ⚠️ | ⚠️ | — | ✅ | ✅ |
| FLOW-11 | schema-registry-dag | — | — | — | ✅ | — | — | — | — | ✅ | ✅ |
| **FLOW-12** | **subscription-billing** | **✅** | **✅** | **✅** | **✅** | **⚠️** | **✅** | **✅** | **✅** | **✅** | **✅** |
| FLOW-13 | data-warehouse-analytics | — | — | ⚠️ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| FLOW-14 | etl-data-integration | — | — | ⚠️ | ✅ | — | — | — | — | ✅ | ✅ |
| FLOW-15 | saas-multi-tenancy | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| **FLOW-16** | **marketplace-payments** | **✅** | **✅** | **✅** | **✅** | **⚠️** | **✅** | **✅** | **⚠️** | **✅** | **✅** |
| **FLOW-17** | **freelancer-marketplace** | **✅** | **✅** | **✅** | **✅** | **⚠️** | **✅** | **✅** | **—** | **✅** | **✅** |
| FLOW-18 | visual-flow-engine | — | — | — | ✅ | — | — | — | — | ✅ | ⚠️ |
| FLOW-19 | durable-sagas-compliance | — | — | ⚠️ | ✅ | — | — | — | — | ✅ | ✅ |
| FLOW-20 | ads-platform | ⚠️ | ⚠️ | ⚠️ | ✅ | — | ⚠️ | ✅ | — | ✅ | ⚠️ |
| FLOW-21 | dynamic-forms-workflows | ⚠️ | — | ✅ | ✅ | — | ⚠️ | ⚠️ | ⚠️ | ⚠️ | — |
| **FLOW-22** | **cms-publishing** | **✅** | **✅** | **✅** | **✅** | **—** | **⚠️** | **⚠️** | **⚠️** | **✅** | **⚠️** |
| FLOW-23 | form-builder-templates | — | — | ⚠️ | ✅ | — | ⚠️ | ⚠️ | — | ✅ | ⚠️ |
| FLOW-24 | ai-safety-moderation | ⚠️ | — | ⚠️ | ✅ | — | — | — | — | ✅ | ✅ |
| FLOW-25 | bfa-cross-flow-governance | — | — | — | ⚠️ | — | — | — | — | ✅ | ⚠️ |
| FLOW-26 | meta-flow-engine | — | — | — | — | — | — | — | — | ✅ | ⚠️ |
| FLOW-27 | human-interaction-gate | — | — | ✅ | ✅ | — | — | — | — | ✅ | ⚠️ |
| **FLOW-28** | **blog-cms-modules** | **✅** | **⚠️** | **✅** | **✅** | **—** | **⚠️** | **⚠️** | **⚠️** | **✅** | **⚠️** |
| FLOW-29 | adaptive-rag-deep-research | — | — | — | ⚠️ | — | — | — | — | ✅ | ⚠️ |
| FLOW-30 | tenant-lifecycle-manager | — | — | — | ⚠️ | — | — | — | — | ✅ | ✅ |
| FLOW-31 | design-intelligence-engine | — | — | — | ⚠️ | — | — | — | — | ✅ | ⚠️ |
| **FLOW-32** | **sharable-flows-marketplace** | **✅** | **✅** | **✅** | **✅** | **⚠️** | **✅** | **✅** | **—** | **✅** | **⚠️** |
| FLOW-33 | system-initiation-bootstrap | ⚠️ | — | — | — | — | — | — | — | ✅ | ⚠️ |
| **FLOW-34** | **marketplace-plugin-adapter** | **⚠️** | **✅** | **✅** | **✅** | **—** | **⚠️** | **✅** | **—** | **✅** | **⚠️** |
| FLOW-35 | meta-arbitration-engine | — | — | — | — | — | — | — | — | ✅ | ⚠️ |
| FLOW-36 | feature-registry | — | — | — | ⚠️ | — | — | — | — | ✅ | ⚠️ |
| FLOW-37 | design-system-governance | — | — | — | ✅ | — | — | — | — | ✅ | ⚠️ |
| FLOW-38 | rag-quality-feedback | ⚠️ | — | ⚠️ | — | — | — | — | — | ✅ | ⚠️ |
| FLOW-39 | oss-curriculum | ✅ | ⚠️ | ✅ | ⚠️ | — | — | — | — | ✅ | ⚠️ |
| FLOW-40 | client-push | — | — | ✅ | ✅ | — | — | — | — | ✅ | ⚠️ |
| FLOW-41 | adapter CI/CD bridge | — | — | — | ⚠️ | — | — | — | — | ✅ | ⚠️ |
| FLOW-42 | rag-quality-graph | — | — | — | — | — | — | — | — | ✅ | ⚠️ |
| FLOW-43 | meta-flow-orchestration | — | — | — | — | — | — | — | — | ✅ | ⚠️ |
| FLOW-44 | ai-self-modification | — | — | — | — | — | — | — | — | ✅ | ⚠️ |
| FLOW-45 | cycle-chain-extension | — | — | — | ⚠️ | — | — | — | — | ✅ | ⚠️ |
| FLOW-46 | platform-agent | — | — | — | ⚠️ | — | — | — | — | ✅ | ✅ |
| FLOW-47 | module-lifecycle | — | — | — | ✅ | — | — | — | — | ✅ | ⚠️ |
| **FLOW-48** | **i18n-translation** | **✅** | **✅** | **✅** | **✅** | **✅** | **✅** | **✅** | **✅** | **⚠️** | **⚠️** |

**Bold rows** = flows with public-internet visibility (marketplace/freelancer/sharable/adapter/billing). These are the highest-priority targets for RoleScopedView adoption.

---

## Role-target counts (rows per role) — revised after batch 4

| Role | Flows requiring this role's template | Notes |
|------|------:|------|
| `anonymous` | ~11 (FLOW-01/08/12/15/16/17/22/28/32/39/48 + ⚠️ FLOW-20 consent) | Every public-registration / pricing / public-marketplace / consent surface |
| `public-marketplace-visitor` | ~11 (FLOW-08/10/12/15/16/17/22/32/34/48 + ⚠️ FLOW-20) | Marketplace + pricing + tenant directory + review surfaces |
| `tenant-user` | ~27 | Default authenticated persona; includes narrow GDPR/lineage slices in FLOW-13/14/19 |
| `tenant-admin` | ~25 | Admin + moderation + config surfaces across almost every flow |
| `referral-user` | ~10 | Registration + onboarding + credit-ledger + marketplace banners |
| `freelancer` | ~8 | Marketplace + payments + analytics + billing payouts + ad-promotion |
| `business-partner` | ~10 | Marketplace/ads/payments/billing/freelancer-hiring — 4-flow B2B hub |
| `event-organiser` | ~6 | Event flows + billing payouts |
| `platform-admin` | ~31 | Every engine-internal + cross-tenant admin surface |
| `platform-support` | ~13 | Read-only audit scope; universal in engine-internal batches |

**Total role-template targets across 48 flows: ~234** (FINAL after batch-10 — all 10 batches DONE). Batches 1-10 accumulated: 9 + 20 + 18 + 7 + 18 + 9 + 9 + 8 + 7 + 3 = 108 cells over initial pass. **FLOW-48 i18n-translation ties FLOW-16 marketplace-payments at 10 cells** — the two universal-persona flows (transactional universal × presentational universal). Current RoleScopedView adoption: **1 flow (FLOW-08 EventDiscoveryPage — pilot)**. Implementation is the next work front after analysis completion.

**Top rollout priority** (FINAL — post-batch-10 — two flows tied at #1, six at #3):

1. **FLOW-16 marketplace-payments — 10 cells** · transactional universal (every payer × every payee)
1. **FLOW-48 i18n-translation — 10 cells** · presentational universal (every user sees translated UI)
3. FLOW-08 marketplace — 9 cells · pilot complete, extend to listing detail
3. FLOW-12 subscription-billing — 9 cells · every persona intersects pricing/billing/payouts
3. FLOW-17 freelancer-marketplace — 9 cells · client + freelancer + B2B hirer + admin on same URL
3. FLOW-22 cms-publishing — 9 cells · public reader is highest-traffic anon surface after marketplace
3. FLOW-28 blog-cms-modules — 9 cells · module-level CMS; tracks FLOW-22 density
3. FLOW-32 sharable-flows-marketplace — 9 cells · flows "app store"

**Dual-sided marketplace cluster (the four fleet flows with consumers × producers on same URL):** FLOW-08, FLOW-16, FLOW-32, FLOW-34 — all need full RoleScopedView on detail pages.

**Cross-cutting substrates (components, not pages):** FLOW-38 rag-quality-feedback widget, FLOW-40 client-push notifications, FLOW-44 ai-self-modification compliance audit, FLOW-48 i18n translation pipeline — these flow their role-awareness through EVERY host flow they embed in.

---

## Priority rollout — "top 8 public-internet flows"

The 8 flows with public-internet visibility are the highest-value role-templating targets. Fleet-coverage gate for them is non-optional.

| Priority | Flow | Public roles needed | Notes |
|---------:|------|---------------------|-------|
| 1 | **FLOW-16 marketplace-payments** | anonymous + public-mkt + tenant + admin + referral + freelancer + biz + event-org + platform-admin + platform-support | **NEW #1** — broadest coverage; 10 cells; rollout CheckoutPage + EscrowDashboardPage |
| 2 | FLOW-08 marketplace | anonymous + public-mkt + tenant + referral + freelancer + biz + org | **Pilot complete** — EventDiscoveryPage; extend to MarketplaceListingDetailPage |
| 3 | **FLOW-12 subscription-billing** | anonymous + public-mkt + tenant + admin + referral + freelancer + biz + event-org + platform-admin + platform-support | New density peer — 9 cells; every persona intersects pricing/billing/payouts |
| 4 | FLOW-17 freelancer-marketplace | anonymous + public-mkt + tenant + freelancer + biz + admin + platform | GigPostingPage + MilestoneDashboardPage — role-fork at same URL |
| 5 | FLOW-10 reviews-reputation | public-mkt + tenant + freelancer + biz | Public review browsing vs authenticated review authoring |
| 6 | FLOW-32 sharable-flows-marketplace | anonymous + public-mkt + tenant + admin + freelancer + biz | Already has business-state view; needs role-branching of actions |
| 7 | FLOW-34 marketplace-plugin-adapter | public-mkt + tenant + admin + biz | Plugin catalog — public preview, tenant install, admin wire |
| 8 | FLOW-22 cms-publishing | anonymous + public-mkt + tenant + admin | Public reader vs authenticated author vs admin moderator |
| 9 | FLOW-28 blog-cms-modules | anonymous + tenant + admin | Public reader vs author/editor |
| 10 | FLOW-15 saas-multi-tenancy | anonymous + public-mkt + tenant + admin + platform-admin + platform-support | Signup + directory + switcher + provisioning surfaces |

---

## Accessibility implications per role (UI/UX Pro Max lens)

Each role introduces different accessibility considerations:

- **`anonymous` / `public-marketplace-visitor`:** NO auth-gated UI widgets in the base render. Forms that need auth must redirect to `/register?return=...` rather than disable themselves silently (P1 accessibility — clear path forward for keyboard-only users).
- **`freelancer`:** Mobile-first is critical (freelancers browse gigs from phones). Priority 5 (Layout & Responsive) touchpoint.
- **`business-partner`:** Desktop-first is appropriate (B2B workflows); tables can assume 1024+ width.
- **`tenant-admin` / `platform-admin`:** Data density is acceptable (admins tolerate denser tables); but Priority 2 touch-target still applies since some admins are on iPads.
- **`event-organiser`:** Calendar + capacity controls need colour-not-only status (Priority 1 #color-not-only).

---

## Testability contract

Every role-aware page MUST:

1. Accept `?role=<ViewerRole>` query param (read via `useViewerRole`).
2. Emit `data-viewer-role="<role>"` on the outer container.
3. Have one Playwright test per role it supports — each captures a PNG suffixed `-role-<role>.png`.
4. Have an MD companion to its PNG set documenting which role sees what.

Minimum coverage for bold (public-internet) flows: **≥ 4 role PNGs per page** (anonymous + tenant-user + one specialised + one admin).

---

## Batch review log

Deep per-flow role analysis is being produced in batches of ≤5 flows per run (per Luba constraint). Each batch commits a `ROLE-ANALYSIS-BATCH-NN.md` document and back-ports its findings into the matrix above.

| Batch | Flows | Status | Artifact |
|-------|-------|--------|----------|
| 1 | FLOW-01, -02, -03, -04, -05 | ✅ DONE 2026-04-20 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-01.md` |
| 2 | FLOW-06, -07, -08, -09, -10 | ✅ DONE 2026-04-20 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-02.md` |
| 3 | FLOW-11, -12, -13, -14, -15 | ✅ DONE 2026-04-20 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-03.md` |
| 4 | FLOW-16, -17, -18, -19, -20 | ✅ DONE 2026-04-20 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-04.md` |
| 5 | FLOW-21, -22, -23, -24, -25 | ✅ DONE 2026-04-20 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-05.md` |
| 6 | FLOW-26, -27, -28, -29, -30 | ✅ DONE 2026-04-20 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-06.md` |
| 7 | FLOW-31, -32, -33, -34, -35 | ✅ DONE 2026-04-20 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-07.md` |
| 8 | FLOW-36, -37, -38, -39, -40 | ✅ DONE 2026-04-20 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-08.md` |
| 9 | FLOW-41, -42, -43, -44, -45 | ✅ DONE 2026-04-20 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-09.md` |
| 10 | FLOW-46, -47, -48 | ✅ DONE 2026-04-20 — **FINAL** | `docs/design-reviews/ROLE-ANALYSIS-BATCH-10.md` |

**All 10 batches complete. All 48 flows analyzed. Matrix is now authoritative.**

---

## Implementation status (updated Run 10)

| Batch/Run | Flows | Plan Status |
|-----------|-------|-------------|
| FLOW-08 pilot | FLOW-08 | ✅ IMPLEMENTED (pilot) |
| Run 2 | FLOW-17 | ✅ IMPLEMENTED — GigPostingPage (commit ad5f5d7c) |
| Run 3 | FLOW-16 | ✅ IMPLEMENTED — CheckoutPage (commit f671a100) |
| Run 4 | FLOW-12 | ✅ IMPLEMENTED — BillingDashboardPage (commit 98f2d548) |
| Run 5 | FLOW-20 | ✅ IMPLEMENTED — AuctionDashboardPage (commit 7856f8a3) |
| Run 6 | FLOW-13 | ✅ IMPLEMENTED — DataWarehouseAnalyticsPage (commit 4843f6e7) |
| Run 7 | FLOW-09 | ✅ IMPLEMENTED — BookingConfirmationPage (commit 60506dca) |
| Run 8 | FLOW-03 | ✅ IMPLEMENTED — EventCreationPage (commit f4d578a1) |
| Run 9 | ALL (cross-cutting) | ✅ IMPLEMENTED — Sidebar NAV_VISIBILITY (commit 0112cd23) |
| Runs 11-24 | Remaining Tier 1/2 flows + Playwright + CMS cluster | ⏳ QUEUED / IN-PROGRESS |
| Runs 25-46 | FLOW-21..48 non-pilot + engine-internal | ⏳ QUEUED |

Pattern registry: **C6-BRANCH** · **C6-PRESERVE** · **C6-GATE** · **C6-CONSENT** · **C6-E** · **C6-NAV**

Fleet implementation percentage (cells by density weight): ~30% as of Run 9 commit.

## Footer

Produces artifact at: `docs/design-reviews/ROLE-COVERAGE-MATRIX.md`.
Companion: `docs/design-reviews/FLEET-VALIDATION-v3.md` (latest fleet verdict).
Scaffold: `client/src/components/common/{ViewerRole.ts, RoleScopedView.tsx}` + `client/src/hooks/useViewerRole.ts`.
Pilot: `client/src/pages/marketplace/EventDiscoveryPage.tsx`.
Per-batch analyses: `docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md` (one per batch of ≤5 flows).
