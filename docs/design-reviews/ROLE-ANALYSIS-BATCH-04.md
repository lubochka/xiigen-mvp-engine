# Role Analysis — Batch 4 of ~10 (FLOW-16 → FLOW-20)

## Date: 2026-04-20 | Branch: claude/pensive-tereshkova-baf347
## Source: XIIGen P1 business-logic inventories + existing page scaffolds + topology + `08-multi tenant deep-research-report` billing cross-refs
## Scope constraint: per Luba, no more than 5 flows per run

---

## Batch 4 scope

Mixed density batch. FLOW-16 (payments) + FLOW-17 (freelancer-marketplace) + FLOW-20 (ads-platform) are consumer/partner-facing with high role density; FLOW-18 (visual-flow-engine) + FLOW-19 (durable-sagas-compliance) are engine-internal admin-heavy.

Existing client scaffolds confirmed (from `client/src/pages/`):

- **FLOW-16 marketplace-payments:** `CheckoutPage.tsx` + `EscrowDashboardPage.tsx`
- **FLOW-17 freelancer-marketplace:** `GigPostingPage.tsx` + `MilestoneDashboardPage.tsx`
- **FLOW-18 visual-flow-engine:** `FlowCanvasPage.tsx` + `FlowPublisherPage.tsx`
- **FLOW-19 durable-sagas-compliance:** `ComplianceAuditPage.tsx` + `SagaDashboardPage.tsx`
- **FLOW-20 ads-platform:** `AdsPlatformPage.tsx` + `AuctionDashboardPage.tsx` + `ConsentGatePage.tsx`

All pages are already routed and covered. Batch 4 upgrades them to role-aware variants where the business logic demands.

---

## Zip-to-XIIGen mapping for batch 4

| Business doc | XIIGen flow | Coverage |
|--------------|-------------|----------|
| (billing sub-sections in `06-marketplace-publishing.md` + `09-event-participation.md`) | **FLOW-16 marketplace-payments** | Partial — payments cut across flows |
| (freelancer sub-section in `07-friend-request-feed-integration.md` + `06-marketplace-publishing.md` cooperator concept) | **FLOW-17 freelancer-marketplace** | Partial |
| (no zip doc) | **FLOW-18 visual-flow-engine** | Inferred — engine internal |
| (no zip doc) | **FLOW-19 durable-sagas-compliance** | Inferred — engine internal |
| (no zip doc — but ads are referenced in `06-marketplace-publishing` "sponsored listings" concept) | **FLOW-20 ads-platform** | Partial via sponsored listings |

---

## FLOW-16 — Marketplace Payments

**Business-logic summary (inferred from P1 inventory + topology focus areas "EP-5 outbox, DNA-9 idempotency, compensation chain, 14 named checks"):** Payment processing for marketplace purchases + tickets + freelancer escrow. Stripe / PayPal integration. Checkout (guest + authenticated), refunds, chargebacks, payout ledger. Every payer AND every payee intersects this flow.

**Entry points:** `POST /checkout` (buyer — guest or authenticated), `GET /checkout/:orderId/status` (buyer), `GET /orders/:id` (buyer — order history), `GET /admin/payments` (tenant-admin), `GET /escrow` (freelancer + business-partner — escrow dashboard), `GET /admin/platform/payments` (platform-admin), `POST /admin/refunds/:id` (tenant-admin).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Guest-checkout path (if tenant enables guest checkout) | Checkout form + "Or sign in to earn referral credit" CTA + simplified account-not-created order-tracking | ✅ YES — guest checkout |
| **`public-marketplace-visitor`** | Arriving at checkout via marketplace-listing share-link | Same as anonymous but with listing-context preserved + discount-tier preview (no redemption without auth) | ✅ YES — checkout landing |
| **`tenant-user`** (buyer) | Primary authenticated checkout + order history | Full checkout with saved payment methods + applied tier discounts + referral-credit balance + order-status tracking | ✅ YES — buyer primary |
| **`tenant-admin`** | Payment-gateway config + refund approval queue + chargeback response | Admin payments console + refund workflow + dispute response | ✅ YES — payments admin |
| **`referral-user`** | Redeeming referral credits at checkout | Checkout + "referral credit applied" line-item + referrer acknowledgement ping | ⚠️ variant of buyer flow with banner |
| **`freelancer`** (payee) | Viewing escrow status + milestone-release payouts from gig work | EscrowDashboardPage — shows funds-held per milestone + release history + dispute-open actions | ✅ YES — freelancer escrow |
| **`business-partner`** (payer for hired gigs) | B2B purchase-order alternative to card checkout + escrow-funding for hired freelancers | B2B checkout with PO number + net-30 terms + escrow-fund confirmation | ✅ YES — B2B partner checkout |
| **`event-organiser`** | Payout for ticketed events — appears as Stripe Connect-style split payments | Organiser payout dashboard (shared component with FLOW-12 event-organiser payouts) | ⚠️ shared with FLOW-12 |
| **`platform-admin`** | Platform fee reconciliation, cross-tenant dispute ops, PCI compliance audit | Cross-tenant payments ops console | ✅ YES — platform payments ops |
| **`platform-support`** | Read-only payment dispute resolution — support tickets reference a specific transaction | Transaction inspector with dispute history + escalation path | ✅ YES — platform support read-only |

### Cross-role surfaces

- **CheckoutPage** is the densest role-aware page in this batch — **6 primary branches**: anonymous / public-mkt / tenant-user / referral-user (tier banner) / business-partner (B2B) / tenant-admin (config-only view, not buyer).
- **EscrowDashboardPage** is the payee-surface — **3 primary branches**: freelancer (gig milestones) / business-partner (escrow-funded hires) / event-organiser (ticketed event splits).
- **Refund queue** is admin-only — tenant-admin + platform-admin see it; platform-support sees read-only.

### Template implications

1. `CheckoutPage` → role-aware via `<RoleScopedView>` with 6 branches (anonymous guest / public-mkt landing / tenant-user primary / referral-user banner / business-partner B2B / tenant-admin config preview).
2. `EscrowDashboardPage` → role-aware with 3 branches (freelancer payee / business-partner payer / event-organiser split payee).
3. `PaymentsAdminPage` at `/admin/payments` — tenant-admin + platform-admin + platform-support variants.
4. `GuestOrderTrackingPage` at `/orders/guest/:token` — for anonymous post-checkout (new surface).

### Not-relevant roles

- None — FLOW-16 has the broadest role coverage in the fleet.

### ROLE-COVERAGE-MATRIX update for FLOW-16

anon ✅ · public-mkt ✅ · tenant-user ✅ · tenant-admin ✅ · referral ⚠️ (banner) · freelancer ✅ · biz-partner ✅ · event-org ⚠️ (shared with FLOW-12) · platform-admin ✅ · platform-support ✅

(Previously 8 cells ⚠️/✅ mix; now **8 full + 2 partial** cells — promotes to top-5 priority tier.)

---

## FLOW-17 — Freelancer Marketplace

**Business-logic summary (inferred from P1 inventory + topology focus areas "N-step LIFO compensation, escrow ledger, deliverable store"):** Gig posting → bidding → contract → milestone-based escrow → deliverable submission → review. Freelancers post services OR bid on posted gigs; clients post gigs OR browse freelancer profiles. Escrow holds funds per-milestone; deliverables are stored + reviewed; disputes trigger LIFO compensation chain.

**Entry points:** `GET /gigs` (public browse), `GET /gigs/:id` (public detail), `POST /gigs` (client — posting a gig), `POST /gigs/:id/bid` (freelancer — bidding), `GET /my/gigs` (freelancer or client — dashboards diverge), `GET /milestones/:id` (buyer or freelancer — role-forked), `GET /admin/gigs/moderation` (tenant-admin).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Browsing public gigs + freelancer directory | Grid of public gigs + freelancer profile previews + "Sign in to bid / hire" CTAs | ✅ YES — public browse |
| **`public-marketplace-visitor`** | Arriving via shared gig-permalink | Full gig detail + freelancer profile + "Sign in to bid / hire" | ✅ YES — permalink landing |
| **`tenant-user`** (client posting gig) | Primary client persona — posts gig, reviews bids, funds escrow, reviews deliverables, releases milestones | GigPostingPage + bid-review + milestone-dashboard client-side | ✅ YES — client primary |
| **`tenant-admin`** | Moderation of gigs (ToS, scope-of-work validation, freelancer identity verification) + dispute adjudication | Gig moderation queue + identity-verification queue + dispute workflow | ✅ YES — admin moderation |
| **`referral-user`** | "Referred freelancer" badge on profile (referrer gets credit if freelancer is hired via referral) | Standard tenant-user view + referrer-relationship banner on referrals | ⚠️ banner variant |
| **`freelancer`** (bidding + executing) | Primary worker role — posts profile, bids on gigs, submits deliverables, requests milestone releases | Freelancer profile editor + bid composer + milestone-submit + portfolio-builder | ✅ YES — freelancer primary |
| **`business-partner`** (hiring) | B2B hiring — bulk-hires freelancers, sets contract terms, manages freelancer pool, generates 1099s | B2B hiring dashboard + freelancer-pool management + bulk-contract | ✅ YES — B2B partner hirer |
| **`event-organiser`** | — | Not a primary surface — event-organisers may hire freelancers for an event, but they use tenant-user or business-partner flow | — |
| **`platform-admin`** | Cross-tenant freelancer disputes, policy enforcement, cross-tenant freelancer verification, freelancer-trust scoring | Cross-tenant ops console | ✅ YES — platform ops |
| **`platform-support`** | Read-only gig + dispute inspection for support tickets | Single-gig inspector + dispute history | ✅ YES — platform support read-only |

### Cross-role surfaces

- **GigPostingPage** is dual-persona: tenant-user (client) authors gigs; freelancer authors service profiles (DIFFERENT pages with shared form scaffold but different field sets — freelancer adds hourly-rate, portfolio-link, availability; client adds budget-range, deadlines, scope-of-work).
- **MilestoneDashboardPage** is role-forked at the SAME URL: freelancer sees "submit deliverable" CTA; client sees "review + release" CTA; admin sees "dispute resolution".
- **Gig-detail page** has 5 primary branches: public (anonymous/public-mkt merged) / tenant-user bidder (if they're a client who's also bidding elsewhere) / freelancer bidder / client-author (post-post view) / admin moderator.

### Template implications

1. `GigPostingPage` → role-aware: tenant-user client-author variant + freelancer service-posting variant (same scaffold, different field schema).
2. `MilestoneDashboardPage` → role-aware: freelancer submitter / client reviewer / tenant-admin arbiter at same URL.
3. `GigDetailPage` at `/gigs/:id` — 5-branch RoleScopedView.
4. `FreelancerDirectoryPage` at `/freelancers` — public browse + business-partner "shortlist" view.
5. `GigModerationQueue` at `/admin/gigs/moderation` — tenant-admin + platform-admin variants.

### Not-relevant roles

- `event-organiser` — no distinct surface; they fall through to tenant-user or business-partner behaviour.

### ROLE-COVERAGE-MATRIX update for FLOW-17

anon ✅ · public-mkt ✅ · tenant-user ✅ · tenant-admin ✅ · referral ⚠️ (banner) · freelancer ✅ · biz-partner ✅ · event-org — · platform-admin ✅ · platform-support ✅

(Previously 8 cells ⚠️/✅ mix; now **8 full + 1 partial** cells — promotes to top-5 priority tier.)

---

## FLOW-18 — Visual Flow Engine (inferred)

**Business-logic summary (inferred from slug + topology):** Visual low-code DAG builder for flow composition. Tenant-admins with FREEDOM-machine access can compose their own flows from task-type atoms; platform-admins compose engine-wide flows. Pre-existing `FlowCanvasPage.tsx` + `FlowPublisherPage.tsx` scaffolds confirmed.

**Entry points:** `GET /admin/flow-builder` (tenant-admin — if FREEDOM-enabled), `GET /admin/platform/flow-builder` (platform-admin), `POST /admin/flows/:id/publish` (publish gate — admin role only).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`tenant-admin`** | Low-code flow builder within tenant scope (only if tenant is FREEDOM-enabled) | ReactFlow canvas + task-type palette + publish gate | ✅ YES — tenant flow builder |
| **`platform-admin`** | Engine-wide flow design, cross-tenant flow registry, FREEDOM config management | Same canvas + cross-tenant flow library + engine-template editor | ✅ YES — platform flow builder |
| **`platform-support`** | Read-only flow visualization for debug ("what does this tenant's custom flow look like?") | Single-flow viewer (read-only) | ⚠️ read-only variant |
| All other roles | — | FREEDOM-machine access is admin-only by design | — |

### Template implications

1. `FlowCanvasPage` → role-forked: tenant-admin (tenant-scoped palette) vs platform-admin (full palette with engine-internal nodes) vs platform-support (read-only).
2. `FlowPublisherPage` → admin-only (no public/user access); same role fork.

### ROLE-COVERAGE-MATRIX update for FLOW-18

anon — · public-mkt — · tenant-user — · tenant-admin ✅ · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 2 cells; now **2 full + 1 partial** cells. +1.)

---

## FLOW-19 — Durable Sagas & Compliance (inferred)

**Business-logic summary (inferred from slug + topology):** Long-running workflow orchestration with compliance audit trail. Saga pattern for multi-step transactions (GDPR delete, account merge, tenant offboard). Compliance audit surfaces SOC2/GDPR state of every ongoing saga. Existing `ComplianceAuditPage.tsx` + `SagaDashboardPage.tsx` scaffolds confirmed.

**Entry points:** `GET /admin/sagas` (tenant-admin — tenant-scoped sagas), `GET /admin/compliance` (tenant-admin), `GET /admin/platform/sagas` (platform-admin), `GET /support/tenant/:id/sagas` (platform-support), `GET /my/data-requests` (tenant-user — GDPR request status).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`tenant-admin`** | Saga orchestration + compliance dashboard for tenant | Per-saga state + compliance score + audit log | ✅ YES — tenant saga admin |
| **`tenant-user`** | Saga-status transparency ("status of my GDPR delete request" / "account merge progress") | Narrow per-user saga tracker — only sagas affecting this user's data | ⚠️ user-visible subset |
| **`platform-admin`** | Cross-tenant saga ops, dead-letter queue, compensation-chain debug, audit-log export | Cross-tenant saga ops console + compliance export | ✅ YES — platform saga ops |
| **`platform-support`** | Read-only saga state + compliance audit for support tickets | Single-saga inspector + audit-log viewer | ✅ YES — platform support |
| All other roles | — | Sagas are system mechanics — consumer roles only see them via tenant-user GDPR slice above | — |

### Cross-role surfaces

- **Saga-status page** at `/my/data-requests/:id` is tenant-user visible with narrow scope; at `/admin/sagas/:id` it's admin visible with full debug view. Same saga, two completely different templates.

### Template implications

1. `SagaDashboardPage` → role-aware: tenant-admin full view / platform-admin cross-tenant / platform-support read-only.
2. `ComplianceAuditPage` → admin-only.
3. `MyDataRequestsPage` at `/my/data-requests` — new surface for tenant-user GDPR/account-merge transparency.

### ROLE-COVERAGE-MATRIX update for FLOW-19

anon — · public-mkt — · tenant-user ⚠️ (GDPR slice) · tenant-admin ✅ · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ✅

(Previously 3 cells; now **3 full + 1 partial** cells. +1.)

---

## FLOW-20 — Ads Platform

**Business-logic summary (inferred from P1 inventory "REQUEST_RESPONSE, spend ledger, dual-gate arbiter" + sponsored-listings concept in `06-marketplace-publishing.md`):** Advertisers (primarily business-partners) buy ad slots, upload creatives, bid in auctions, track spend. Consumers see ads in the marketplace feed but don't have an admin surface — they can only report-ad. Tenant-admins moderate ads shown in their tenant. Platform-admins enforce ad policy.

**Entry points:** `GET /ads/advertiser` (business-partner — advertiser console), `POST /ads/campaigns` (business-partner — create campaign), `GET /admin/ads/moderation` (tenant-admin — review ads showing in tenant), `GET /admin/platform/ads` (platform-admin — policy ops), `POST /ads/:id/report` (any authenticated user — report inappropriate ad), `GET /ads/consent` (any user — consent gate).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Sees ads in marketplace feed, hits consent gate on first-view | Consent banner + "Learn more" link (no admin surface) | ⚠️ consent-gate only |
| **`public-marketplace-visitor`** | Same as anonymous — ads shown in public marketplace listings | Ad cards inline in grid + consent gate | ⚠️ consent-gate only |
| **`tenant-user`** | Sees ads in feed + can report inappropriate ones | Ad card + "report" action | ⚠️ report-action variant |
| **`tenant-admin`** | Moderation of ads shown within tenant + tenant-level ad preferences (e.g., block advertiser) | Ad moderation queue + block-advertiser controls | ✅ YES — tenant ad moderation |
| **`business-partner`** (advertiser) | Primary advertiser — campaign creation, creative upload, auction bidding, spend tracking | AdsPlatformPage + AuctionDashboardPage + campaign CRUD | ✅ YES — advertiser primary |
| **`freelancer`** | Sees ads + can report; may advertise own services (promoted gig posts — crosses into FLOW-17 territory) | Standard tenant-user ad behaviour + "promote this gig" CTA on own gigs | ⚠️ promote-gig variant |
| **`platform-admin`** | Ad policy enforcement, cross-tenant revenue ops, auction-algorithm tuning, sanction actions | Cross-tenant ads ops + policy admin | ✅ YES — platform ads ops |
| **`platform-support`** | Ad dispute resolution — advertiser complains about ad-rejection or charge | Read-only campaign inspector + dispute workflow | ⚠️ support read-only |
| All other roles | — | Ads apply universally; `referral-user` + `event-organiser` merge into tenant-user behaviour | — |

### Cross-role surfaces

- **Ad card in feed** — visible to ALL roles with different affordances (anonymous sees consent gate, tenant-user sees report action, business-partner sees "promote similar" CTA if relevant to their campaign, tenant-admin sees "moderate this ad" action).
- **ConsentGatePage** is cross-role — all roles hit it (consent is GDPR-mandated).

### Template implications

1. `AdsPlatformPage` → business-partner primary (advertiser console).
2. `AuctionDashboardPage` → business-partner primary.
3. `AdsModerationQueue` at `/admin/ads/moderation` — tenant-admin primary.
4. `PlatformAdsOpsPage` at `/admin/platform/ads` — platform-admin.
5. `ConsentGatePage` → cross-role, no fork (but different CTA text per role).
6. `ReportAdModal` — shared component; opens from any ad card for any authenticated user.

### ROLE-COVERAGE-MATRIX update for FLOW-20

anon ⚠️ (consent) · public-mkt ⚠️ (consent) · tenant-user ⚠️ (report) · tenant-admin ✅ · referral — · freelancer ⚠️ (promote) · biz-partner ✅ · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 2 cells; now **3 full + 5 partial** cells. +6 surfaces, though most are light-weight variants of ad-card behaviour.)

---

## Consolidated role signals across batch 4

| Role | Flows in batch 4 needing it | Notes |
|------|:---------------------------:|-------|
| `anonymous` | FLOW-16 ✅, FLOW-17 ✅, FLOW-20 ⚠️ | Guest checkout + public gig browse + consent gates |
| `public-marketplace-visitor` | FLOW-16 ✅, FLOW-17 ✅, FLOW-20 ⚠️ | Permalink landings + gig deep-links + consent |
| `tenant-user` | FLOW-16 ✅, FLOW-17 ✅, FLOW-19 ⚠️, FLOW-20 ⚠️ | Buyer + client + GDPR slice + ad-reporting |
| `tenant-admin` | All 5 ✅ | Densest role in batch 4 — every flow has admin surface |
| `referral-user` | FLOW-16 ⚠️, FLOW-17 ⚠️ | Credit redemption + referred-freelancer banners |
| `freelancer` | FLOW-16 ✅ (escrow), FLOW-17 ✅ (primary), FLOW-20 ⚠️ (promote-gig) | Primary in freelancer-marketplace |
| `business-partner` | FLOW-16 ✅ (B2B), FLOW-17 ✅ (hirer), FLOW-20 ✅ (advertiser primary) | Triple-hit — highest partner density in any batch |
| `event-organiser` | FLOW-16 ⚠️ (shared payouts) | Thin — shares payout surface with FLOW-12 |
| `platform-admin` | All 5 ✅ | Universal — ops surface across every flow |
| `platform-support` | FLOW-16 ✅, FLOW-17 ✅, FLOW-18 ⚠️, FLOW-19 ✅, FLOW-20 ⚠️ | Support audit surface everywhere |

### Biggest finding in batch 4

**FLOW-20 ads-platform introduces the first "universal consent gate" surface** — every role must hit the ad consent banner (GDPR-mandated), making it the only flow where all 10 roles have at least a `⚠️` entry. The consent gate is a shared component but its copy + opt-in text vary by role (anonymous → generic; tenant-user → "you can adjust in settings"; business-partner → "you are viewing as advertiser").

**FLOW-16 + FLOW-17 jointly lift business-partner into the densest partner-facing role in the fleet** — B2B checkout + freelancer hiring + ad campaign buying. A unified "business-partner hub" navigation may be warranted.

### Consolidated batch 1 + 2 + 3 + 4 density (per flow)

| Flow | Active role cells | Density rank |
|------|------------------:|-------------:|
| FLOW-08 marketplace | 9 | #1 |
| FLOW-12 subscription-billing | 9 | #1 (tied) |
| FLOW-16 marketplace-payments | 10 (8 full + 2 partial) | #1 (new tie — broadest coverage) |
| FLOW-17 freelancer-marketplace | 9 (8 full + 1 partial) | #4 |
| FLOW-09 transactional-event-participation | 8 | #5 |
| FLOW-03 event-management | 8 | #5 (tied) |
| FLOW-20 ads-platform | 8 (3 full + 5 partial) | #7 |
| FLOW-01 user-registration | 7 | #8 |
| FLOW-07 friend-request-social-feed | 7 | #8 |
| FLOW-10 reviews-reputation | 7 | #8 |
| FLOW-13 data-warehouse-analytics | 6 | #11 |
| FLOW-06 user-groups-communities | 6 | #11 |
| FLOW-15 saas-multi-tenancy | 6 | #11 |
| FLOW-04 event-attendance | 5 | #14 |
| FLOW-19 durable-sagas-compliance | 4 (3 full + 1 partial) | #15 |
| FLOW-02 profile-enrichment | 4 | #15 |
| FLOW-18 visual-flow-engine | 3 (2 full + 1 partial) | #17 |
| FLOW-14 etl-data-integration | 3 | #17 |
| FLOW-11 schema-registry-dag | 3 | #17 |
| FLOW-05 completion-gamification | 3 | #17 |

**Fleet-level top-5 rollout priority (revised after batch 4):**

1. **FLOW-16 marketplace-payments — 10 cells** · NEW #1 — every payer + every payee intersects (broadest coverage in fleet)
2. FLOW-08 marketplace — 9 cells · pilot complete
3. FLOW-12 subscription-billing — 9 cells
4. FLOW-17 freelancer-marketplace — 9 cells · already routed, needs role-branching
5. FLOW-03 event-management — 8 cells / FLOW-09 transactional-event-participation — 8 cells (tied)

---

## Fleet-wide plan validation status (end of batch 4)

| Plan | 48-flow coverage | Tested | UI/UX examined | Business-state evident |
|------|------------------|--------|----------------|------------------------|
| P14b FLOW-SESSION-VISUALIZATION-v2 | ✅ 48/48 — 164 PNGs regenerated | ✅ | ✅ | ✅ |
| UX-FIX-THREE-TRACK | ✅ | ✅ | ✅ | ✅ |
| UX-FIX-EXECUTION (7-task v2) | ✅ | ✅ | ✅ | n/a |
| P14-EXECUTION (P1-14 test coverage) | ✅ | ✅ | ✅ | ✅ |
| FLOW-UI-COVERAGE-PLAN-UNIFIED | ✅ all 48 | ✅ | ✅ | ✅ |
| FLOW-48-PLAN-P1-P14 (i18n) | ✅ | ✅ 12/12 Playwright | ✅ 14 PNGs w/ Hebrew | ✅ |
| ui-ux-pro-max-skill-main | ✅ baseline; 43 pages pending useTranslation wiring | partial | ✅ | ✅ |
| **C6 role-aware templating** | 🟡 **scaffold + FLOW-08 pilot shipped; 47 flows pending rollout — 180-cell target (revised)** | 🟡 1 flow × 7 roles | 🟡 | 🟡 |

**Overall gate:** 7 of 8 plans GREEN across 48 flows. The C6 role-aware plan is the open front — rollout progressing in 5-flow batches (4 of 10 batches DONE).

---

## Running coverage target

- Initial: ~135 cells
- After batch 1: +9 → 144
- After batch 2: +20 → 155
- After batch 3: +18 → 173
- After batch 4: +7 → **180**

Fleet-wide target is converging. Remaining batches 5-10 will cover flows that are mostly engine-internal (FLOW-21..48) with expected low-to-medium density, likely adding another 20-40 cells for a final fleet target in the 200-220 range.

---

## Next batch

Batch 5 target: **FLOW-21 → FLOW-25** (dynamic-forms-workflows, cms-publishing, form-builder-templates, ai-safety-moderation, bfa-cross-flow-governance). Mixed density: FLOW-22 CMS is public-facing (publishers + readers + admins); FLOW-24 + FLOW-25 are platform-admin heavy engine-internal.

Produces: `docs/design-reviews/ROLE-ANALYSIS-BATCH-05.md` on the next run.

---

## Footer

Produces artifact at: `docs/design-reviews/ROLE-ANALYSIS-BATCH-04.md`.
Companion: `docs/design-reviews/ROLE-COVERAGE-MATRIX.md` (matrix rows 16..20 updated).
Prior batches: `ROLE-ANALYSIS-BATCH-01.md`, `-02.md`, `-03.md`.
Fleet verdict context: `docs/design-reviews/FLEET-VALIDATION-v2.md`.
