# Role Analysis — Batch 3 of ~10 (FLOW-11 → FLOW-15)

## Date: 2026-04-20 | Branch: claude/pensive-tereshkova-baf347
## Source: XIIGen topology + CLAUDE.md slug semantics + `08-multi tenant deep-research-report 1.md` & `2.md` (FLOW-15 only)
## Scope constraint: per Luba, no more than 5 flows per run

---

## Batch 3 scope shift

Batches 1-2 covered consumer-facing marketplace + social surfaces where role density peaked at 7-9 cells per flow. Batch 3 moves into **engine-internal + admin-heavy** territory. Expected density drops for most rows in this batch (3-6 cells), with one notable exception — FLOW-12 subscription-billing — where every persona that pays or gets paid creates an intersection.

No zip business documents map directly to FLOW-11 / FLOW-13 / FLOW-14. FLOW-12 surfaces partially through billing sub-sections of multiple zip docs. FLOW-15 is covered by `08-multi tenant deep-research-report 1.md` + `08-multi tenant deep-research-report 2.md`. Where zip sources are missing, role analysis is inferred from XIIGen topology + CLAUDE.md slug semantics.

---

## Zip-to-XIIGen mapping for batch 3

| Business doc | XIIGen flow | Coverage |
|--------------|-------------|----------|
| (no zip doc) | **FLOW-11 schema-registry-dag** | Inferred — engine internal |
| (partial — billing sub-sections in multiple docs) | **FLOW-12 subscription-billing** | Partial from marketplace + freelancer zip docs |
| (no zip doc) | **FLOW-13 data-warehouse-analytics** | Inferred — analytics cross-cut |
| (no zip doc) | **FLOW-14 etl-data-integration** | Inferred — engine internal |
| `08-multi tenant deep-research-report 1.md` + `08-multi tenant deep-research-report 2.md` | **FLOW-15 saas-multi-tenancy** | Direct coverage |

---

## FLOW-11 — Schema Registry DAG (inferred)

**Business-logic summary (inferred):** XIIGen's registry of schemas + their DAG dependencies across all 48 flows. This is the system-of-record for "what schemas exist, what tasks emit them, which flows consume which contracts, which schemas are promoted to stable." Platform operators own it. Tenants may view a read-only slice of their own active contracts.

**Entry points (inferred):** `GET /admin/schema-registry` (platform console), `GET /admin/schema-registry/:id` (schema detail + DAG neighbours), `POST /admin/schema-registry/:id/promote` (version lifecycle — platform-admin only), `GET /tenant/schemas` (tenant read-only slice).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Full DAG management — promote/demote schema versions, resolve conflicts, edit contract metadata | Interactive DAG graph + schema editor + version history + promotion gate | ✅ YES — admin DAG console |
| **`platform-support`** | Read-only DAG view across tenants for debug / customer support | Same DAG but no edit actions; cross-tenant filter controls | ✅ YES — support read-only |
| **`tenant-admin`** | Read-only list of contracts active in their tenant ("which flow-contracts am I bound to?") | Flat list scoped to tenant + "request schema extension" CTA | ✅ YES — tenant observability |
| All other roles | — | Schema registry is engine plumbing; not surfaced to consumer roles | — |

### Template implications

1. `SchemaRegistryDAGAdminPage` at `/admin/schema-registry` — platform-admin only. Interactive ReactFlow graph with edit actions.
2. `SchemaRegistryDAGReadOnlyPage` at `/support/schema-registry` — same graph, no actions, cross-tenant filter.
3. `TenantSchemaContractsPage` at `/tenant/schemas` — flat list, tenant scope, "request schema" flow.

### ROLE-COVERAGE-MATRIX update for FLOW-11

anon — · public-mkt — · tenant-user — · tenant-admin ✅ · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ✅

(Previously 2 cells; now **3 active** cells. +1.)

---

## FLOW-12 — Subscription Billing

**Business-logic summary:** SaaS billing — subscription plans, invoices, payment methods, dunning (overdue chase), proration on plan change, tax computation. Billing is the densest role surface in batch 3 because every persona that pays the platform or gets paid by the platform creates a separate surface.

**Entry points:** `GET /pricing` (public), `GET /billing` (tenant-admin), `GET /my-subscription` (tenant-user), `GET /partner/invoicing` (business-partner), `GET /freelancer/payouts` (freelancer), `GET /organiser/payouts` (event-organiser), `GET /admin/platform/billing` (platform-admin), `GET /admin/support/billing/:tenantId` (platform-support).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Marketing pricing page, pre-signup | Plan tiers + feature comparison + "Start your tenant" CTA | ✅ YES — public pricing |
| **`public-marketplace-visitor`** | Comparing plans before signup | Same as anonymous + plan comparator | ⚠️ near-merge with anonymous |
| **`tenant-user`** | "My subscription" self-service | Current plan + next bill date + plan-change + payment history (no payment-method edit — belongs to admin) | ✅ YES — my-subscription slice |
| **`tenant-admin`** | Full billing console — plans, invoices, payment methods, dunning actions, tax settings | Billing admin dashboard with CRUD on payment methods and plan | ✅ YES — billing admin primary |
| **`referral-user`** | Referral credit ledger (distinct from general tenant-user — credits appear as negative-balance line items) | "My referral credits" with accrual + redemption history | ⚠️ extension of my-subscription page, banner variant |
| **`freelancer`** | Payout statements (earnings receipts flowing the other direction — freelancer is payee not payer) | 1099-style earnings statement + payout schedule + tax forms | ✅ YES — freelancer payouts |
| **`business-partner`** | Partner invoicing (platform-billed B2B) | Distinct invoice stream — net-30 terms, purchase orders, enterprise contract terms | ✅ YES — partner invoicing |
| **`event-organiser`** | Event-billing slice (Stripe Connect-style payouts for ticketed events they hosted) | Per-event revenue breakdown + platform fee + organiser payout | ✅ YES — organiser payouts |
| **`platform-admin`** | Cross-tenant revenue dashboard, refund override, tax settings, Stripe webhook audit | Cross-tenant revenue view + operational controls | ✅ YES — platform billing ops |
| **`platform-support`** | Read-only billing inspector — support tickets often reference a specific invoice | Single-tenant billing inspector + ticket linkage | ✅ YES — platform billing read-only |

### Cross-role surfaces

- **Pricing page** is a classic public-visible surface — anonymous / public-mkt see it with signup CTA; tenant-user sees it with "upgrade" CTA pre-filled for their tier.
- **Invoice view** is role-forked: tenant-user sees simple receipt; tenant-admin sees full line-items + tax breakdown + download options; business-partner sees PO number + net-terms + contract reference.
- **Payout ledger** is the inverted-direction surface — freelancer + event-organiser are payees; the rest are payers.

### Template implications

1. `PublicPricingPage` — anonymous + public-marketplace-visitor.
2. `TenantBillingAdminPage` — tenant-admin primary.
3. `MySubscriptionPage` — tenant-user self-service.
4. `PartnerInvoicingPage` — business-partner.
5. `FreelancerPayoutsPage` — freelancer.
6. `EventOrganiserPayoutsPage` — event-organiser.
7. `PlatformBillingOpsPage` — platform-admin.
8. `PlatformBillingReadOnlyPage` — platform-support.
9. `ReferralCreditLedgerPage` — referral-user (extension of my-subscription).

### ROLE-COVERAGE-MATRIX update for FLOW-12

anon ✅ · public-mkt ✅ · tenant-user ✅ · tenant-admin ✅ · referral ⚠️ (credit ledger) · freelancer ✅ · biz-partner ✅ · event-org ✅ · platform-admin ✅ · platform-support ✅

(Previously 5 cells; now **9 full + 1 partial** cells. Rivals FLOW-08 marketplace as a density hotspot — flagged for top-5 priority.)

---

## FLOW-13 — Data Warehouse Analytics (inferred)

**Business-logic summary (inferred):** OLAP cube / analytics warehouse that aggregates events across all 48 flows into dashboards. Heavy tenant-admin + platform-admin usage; some tenant-user self-service; role-specific cross-cut dashboards for event-organisers, freelancers, business-partners.

**Entry points (inferred):** `GET /analytics/tenant` (tenant-admin), `GET /analytics/my-activity` (tenant-user), `GET /organiser/analytics` (event-organiser), `GET /freelancer/analytics` (freelancer), `GET /partner/analytics` (business-partner), `GET /admin/platform/analytics` (platform-admin), `GET /support/tenant/:id/analytics` (platform-support).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`tenant-admin`** | Tenant analytics dashboard — all modules, full range | Full dashboard with tenant-scoped queries + drill-down | ✅ YES — tenant analytics primary |
| **`tenant-user`** | Self-service "my activity" slice — if tenant enables it | Narrow personal dashboard: my purchases, my events attended, my gigs bid | ⚠️ optional tenant-config-gated |
| **`event-organiser`** | Event-specific analytics — attendance funnels, ticket conversion | Event dashboard with capacity / revenue / attendance curves | ✅ YES — organiser analytics |
| **`freelancer`** | Gig-performance analytics — bids won/lost, earnings/hour, rating trend | Freelancer dashboard with performance KPIs | ✅ YES — freelancer analytics |
| **`business-partner`** | Partner dashboard — hires made, freelancer ROI, campaign attribution | Partner analytics with hiring funnel + ad ROI | ✅ YES — partner analytics |
| **`platform-admin`** | Cross-tenant warehouse queries, query performance, cube refresh schedules | Ops console + cross-tenant aggregate view | ✅ YES — platform analytics ops |
| **`platform-support`** | Read-only cross-tenant dashboards for debug | Same data as platform-admin without edit | ⚠️ read-only variant |
| `anonymous` / `public-marketplace-visitor` / `referral-user` | — | No analytics surface for public/referral — they're not payers of the analytics product | — |

### Template implications

1. `TenantAnalyticsDashboardPage` — tenant-admin primary.
2. `MyActivityAnalyticsPage` — tenant-user self-service (optional per tenant config).
3. `EventOrganiserAnalyticsPage` — cross-cut with FLOW-03 / FLOW-09.
4. `FreelancerAnalyticsPage` — cross-cut with FLOW-17.
5. `BusinessPartnerAnalyticsPage` — cross-cut with FLOW-20 ads + FLOW-17 hires.
6. `PlatformAnalyticsOpsPage` — platform-admin.
7. `PlatformAnalyticsReadOnlyPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-13

anon — · public-mkt — · tenant-user ⚠️ · tenant-admin ✅ · referral — · freelancer ✅ · biz-partner ✅ · event-org ✅ · platform-admin ✅ · platform-support ⚠️

(Previously 3 cells; now **6 full + 2 partial** cells. +4.)

---

## FLOW-14 — ETL Data Integration (inferred)

**Business-logic summary (inferred):** ETL jobs + external source connectors (Stripe sync, HubSpot sync, webhook ingestion, CSV upload). Tenant-admin configures connectors; platform-admin manages the ETL runtime + dead-letter queue. Occasionally tenant-user needs data-lineage transparency for compliance.

**Entry points (inferred):** `GET /admin/integrations` (tenant-admin), `GET /admin/integrations/:id` (connector detail), `GET /lineage/my-data` (tenant-user — optional), `GET /admin/platform/etl` (platform-admin), `GET /support/tenant/:id/etl` (platform-support).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`tenant-admin`** | Connector configuration + mapping + sync schedule + error console | Full connector CRUD + field-mapping UI + sync run history | ✅ YES — tenant ETL admin |
| **`tenant-user`** | Data-lineage transparency ("where does my data come from?") — optional compliance surface | Read-only lineage diagram showing sources of personal fields | ⚠️ optional compliance-driven |
| **`platform-admin`** | ETL platform ops — job-queue depth, dead-letter queue, re-drive, connector health | Cross-tenant ETL ops console | ✅ YES — platform ETL ops |
| **`platform-support`** | Read-only ETL state for support debug — "why did your data not sync?" | Single-tenant ETL inspector with sync-run trace | ✅ YES — platform ETL read-only |
| All other roles | — | Not surfaced | — |

### Template implications

1. `TenantConnectorAdminPage` — tenant-admin.
2. `DataLineagePage` — tenant-user (optional tenant-config-gated).
3. `PlatformETLOpsPage` — platform-admin.
4. `PlatformETLReadOnlyPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-14

anon — · public-mkt — · tenant-user ⚠️ · tenant-admin ✅ · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ✅

(Previously 2 cells; now **3 full + 1 partial** cells. +2.)

---

## FLOW-15 — SaaS Multi-Tenancy

**Business-logic summary (from `08-multi tenant deep-research-report 1.md` + `2.md`):** Tenant lifecycle — create tenant, switch tenant (for multi-tenant users), configure tenant-scoped settings (branding, domain, SAML/SSO, policy), offboard tenant. Public-facing at the signup edge; platform-operator-facing at the provisioning edge. User may belong to multiple tenants (employee of one, customer of another, freelancer in a third).

**Entry points:** `GET /signup` (anonymous — new tenant signup), `GET /tenants` (public directory), `GET /admin/tenant` (tenant-admin settings), `GET /my/tenants` (tenant-user tenant-switcher), `GET /admin/platform/tenants` (platform-admin provisioning), `GET /support/tenant/:id` (platform-support audit).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Public tenant-signup funnel — "Start your XIIGen tenant" | Signup form with plan picker, domain claim, admin invite | ✅ YES — public signup |
| **`public-marketplace-visitor`** | Tenant directory — browsing which tenants exist (for marketplace discovery) | Searchable directory of public tenants + "Sign in to join" CTA on private tenants | ✅ YES — tenant directory |
| **`tenant-admin`** | Full tenant settings — branding, domain, SAML/SSO, member invitations, offboarding policy | Full tenant admin console | ✅ YES — tenant admin primary |
| **`tenant-user`** | "My tenants" switcher — user belongs to multiple tenants and needs to switch contexts | Switcher list with role-per-tenant badge + recent-activity hints | ✅ YES — multi-tenant switcher |
| **`platform-admin`** | Tenant provisioning console — force-offboard, tenant-health override, pending-approval queue | Full provisioning + ops controls cross-tenant | ✅ YES — platform tenant ops |
| **`platform-support`** | Read-only tenant directory, billing-state, health metrics per tenant | Per-tenant inspector; read-only | ✅ YES — platform tenant read-only |
| All other roles (`referral-user`, `freelancer`, `business-partner`, `event-organiser`) | — | They inherit `tenant-user` behaviour here; no role-specific tenant-switcher view needed | — |

### Cross-role surfaces

- **Tenant directory** is the marketing-adjacent surface — public-mkt sees it, tenant-user sees it with "my tenants pinned", platform-admin sees it with admin-override indicators.
- **Tenant switcher** is tenant-user specific; other authenticated roles reuse the same UI.

### Template implications

1. `PublicTenantSignupPage` — anonymous.
2. `TenantDirectoryPage` — public-marketplace-visitor primary; tenant-user sees "my tenants pinned" variant.
3. `TenantAdminSettingsPage` — tenant-admin.
4. `MyTenantsSwitcherPage` — tenant-user.
5. `PlatformTenantOpsPage` — platform-admin.
6. `PlatformTenantReadOnlyPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-15

anon ✅ · public-mkt ✅ · tenant-user ✅ · tenant-admin ✅ · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ✅

(Previously 3 cells; now **6 active** cells. +3.)

---

## Consolidated role signals across batch 3

| Role | Flows in batch 3 needing it | Notes |
|------|:---------------------------:|-------|
| `anonymous` | FLOW-12 ✅, FLOW-15 ✅ | Pricing + tenant signup |
| `public-marketplace-visitor` | FLOW-12 ✅, FLOW-15 ✅ | Pricing comparator + tenant directory |
| `tenant-user` | FLOW-12 ✅, FLOW-13 ⚠️, FLOW-14 ⚠️, FLOW-15 ✅ | Self-service slices |
| `tenant-admin` | FLOW-11, -12, -13, -14, -15 all ✅ | Admin is densest role in batch 3 |
| `referral-user` | FLOW-12 ⚠️ (credit ledger) | Thin banner variant |
| `freelancer` | FLOW-12 ✅ (payouts), FLOW-13 ✅ (analytics) | Payee + self-analytics |
| `business-partner` | FLOW-12 ✅ (invoicing), FLOW-13 ✅ (analytics) | Invoicing + partner analytics |
| `event-organiser` | FLOW-12 ✅ (payouts), FLOW-13 ✅ (analytics) | Payee + event analytics |
| `platform-admin` | All 5 flows ✅ | Cross-tenant ops surface everywhere |
| `platform-support` | FLOW-11 ✅, -12 ✅, -13 ⚠️, -14 ✅, -15 ✅ | Read-only audit surface |

### Biggest finding in batch 3

**FLOW-12 subscription-billing has 9 primary role templates (plus 1 referral-extension)** — ties FLOW-08 marketplace as the densest role-template surface in the fleet to date. Billing is unique because *every persona intersects it* — payers, payees, admins, support, and public pricing comparators all touch the same flow.

### Consolidated batch 1 + 2 + 3 density (per flow)

| Flow | Active role cells | Density rank |
|------|------------------:|-------------:|
| FLOW-08 marketplace | 9 | #1 |
| FLOW-12 subscription-billing | 9 | #1 (tied) |
| FLOW-09 transactional-event-participation | 8 | #3 |
| FLOW-03 event-management | 8 | #3 (tied) |
| FLOW-01 user-registration | 7 | #5 |
| FLOW-07 friend-request-social-feed | 7 | #5 |
| FLOW-10 reviews-reputation | 7 | #5 |
| FLOW-13 data-warehouse-analytics | 6 | #8 |
| FLOW-06 user-groups-communities | 6 | #8 |
| FLOW-15 saas-multi-tenancy | 6 | #8 |
| FLOW-04 event-attendance | 5 | #11 |
| FLOW-02 profile-enrichment | 4 | #12 |
| FLOW-14 etl-data-integration | 3 | #13 |
| FLOW-11 schema-registry-dag | 3 | #13 |
| FLOW-05 completion-gamification | 3 | #13 |

**Fleet-level top-5 rollout priority (revised after batch 3):**

1. FLOW-08 marketplace — 9 cells · pilot complete, rollout pattern proven
2. **FLOW-12 subscription-billing — 9 cells** · NEW TIE — every persona intersects billing
3. FLOW-03 event-management — 8 cells
4. FLOW-09 transactional-event-participation — 8 cells
5. FLOW-01 user-registration — 7 cells

---

## Next batch

Batch 4 target: **FLOW-16 → FLOW-20** (marketplace-payments, freelancer-marketplace, visual-flow-engine, durable-sagas-compliance, ads-platform). Mixed density expected: FLOW-16 + FLOW-17 + FLOW-20 are public-mkt / partner-facing (high density); FLOW-18 + FLOW-19 are engine-internal admin-heavy.

Produces: `docs/design-reviews/ROLE-ANALYSIS-BATCH-04.md` on the next run.

---

## Footer

Produces artifact at: `docs/design-reviews/ROLE-ANALYSIS-BATCH-03.md`.
Companion: `docs/design-reviews/ROLE-COVERAGE-MATRIX.md` (matrix rows 11..15 updated).
Prior batches: `docs/design-reviews/ROLE-ANALYSIS-BATCH-01.md`, `ROLE-ANALYSIS-BATCH-02.md`.
Fleet verdict context: `docs/design-reviews/FLEET-VALIDATION-v2.md`.
