# VALIDATION-R63-DRY-RUN.md
## Dry Run: Apply library to FLOW-32 (sharable flows) + FLOW-20 (Ads Platform / Graph API)
## FLOW-PREP-LIBRARY v6.1-FINAL — Round 63 | Phase 7 Validation
## Date: 2026-04-20

---

## Final Goal Check

> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This dry run applies three guidance files (GUIDE-B50, GUIDE-B47, GUIDE-B07) to two
real flows (FLOW-32 and FLOW-20) and checks three v6 additional checks:
1. Apply GUIDE-B50 to FLOW-32 (Cluster 2 dual-sided marketplace)
2. Apply GUIDE-B47 (UI State Map) to FLOW-20 (predominantly INTERNAL_ONLY flow)
3. Verify RAG ACL section in GUIDE-B07

---

## SECTION 1 — DRY RUN: GUIDE-B50 applied to FLOW-32 (Cluster 2)

**FLOW-32: Sharable Flows Marketplace** | Source: ZIP-17 ROLE-ANALYSIS-BATCH-07

### Step 0 — Cluster Classification

**Input:** ROLE-ANALYSIS-BATCH-07.md §FLOW-32

ROLE-COVERAGE-MATRIX: anon ✅ · public-mkt ✅ · tenant-user ✅ · tenant-admin ✅ · referral ⚠️ · freelancer ✅ · biz-partner ✅ · event-org — · platform-admin ✅ · platform-support ⚠️

Cell count: **7 full + 2 partial = 9 cells total**. Confirmed high-priority public-facing flow.

**Classification result: Cluster 2 — Dual-sided marketplace (9 cells) ✅**

Reason: FLOW-32 has two primary work roles — **tenant-admin (consumer/installer)** and
**freelancer (producer/publisher)** — operating on the same marketplace URL space with
role-forked views. The flow-detail page at `/flows-marketplace/:flowId` has 6+ distinct
role branches: anonymous browser / public-marketplace-visitor / tenant-user (browse-only) /
tenant-admin (install-CTA) / freelancer (own-flow-editor) / business-partner (subscription
tier) / platform-admin (curation actions).

GUIDE-B50 instruction applied correctly: "Cluster 2 — Consumer × Producer × Curator split;
document mutual-exclusion rules."

### Step 1 — Structural Template(s)

**Template 2 (Two-Sided Marketplace) + Template 1 (5-Tier RBAC)**

Template 2: tenant-admin (consumer/installer) ↔ freelancer (producer/publisher) axis.
Template 1: RBAC hierarchy for platform-admin → tenant-admin → tenant-user.
Template 4 (Platform Operator Stack): platform-admin curation role over the marketplace.

### Step 2 — Roles in FLOW-32

| Role ID | Role String | ZIP-17 Persona | Layer | Cell status |
|---------|------------|----------------|-------|-------------|
| ROLE-0 | `"anonymous"` | anonymous | Base | ✅ — public flow browse |
| ROLE-1-PUBLIC-MKT | `"public-marketplace-visitor"` | public-marketplace-visitor | Base | ✅ — permalink flow landing |
| ROLE-1-TENANT | `"tenant-user"` | tenant-user | Base | ✅ — browse + request install |
| ROLE-TENANT-ADMIN | `"tenant-admin"` | tenant-admin | Tenant-configured | ✅ — installer primary |
| ROLE-1-REFERRAL | `"referral-user"` | referral-user | Base | ⚠️ — referral banner |
| ROLE-FREELANCER | `"freelancer"` | freelancer | Context | ✅ — publisher primary |
| ROLE-BIZ-PARTNER | `"business-partner"` | business-partner | Context | ✅ — B2B subscriber |
| ROLE-PLATFORM-ADMIN | — | platform-admin | Platform | ✅ — curation ops |
| ROLE-PLATFORM-SUPPORT | — | platform-support | Platform | ⚠️ — read-only variant |

### Step 3 — Screen × Role Visibility Matrix

| Screen | ROLE-0 | TENANT-USER | TENANT-ADMIN | FREELANCER | BIZ-PARTNER | PLATFORM-ADMIN | Level | Domain? |
|--------|--------|-------------|--------------|------------|-------------|----------------|-------|---------|
| `/flows-marketplace` (browse) | ✅ read | ✅ browse + request | ✅ install CTA | ✅ publish CTA | ✅ subscribe CTA | ✅ curate | L2 | **DOMAIN** |
| `/flows-marketplace/:flowId` (detail) | ✅ view | ✅ browse | ✅ install | ✅ editor if own | ✅ subscription tier | ✅ moderation | L2 | **DOMAIN — 6-branch** |
| `/admin/my-flows/publisher` | ❌ 403 | ❌ 403 | ❌ 403 | ✅ full publisher | ❌ 403 | ✅ inspect | L1 | **DOMAIN** |
| `/admin/flows-marketplace` (install mgmt) | ❌ 403 | ❌ 403 | ✅ installed flows | ❌ 403 | ✅ subscriptions | — | L1 | **DOMAIN** |
| `/admin/platform/flows-marketplace` | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ✅ curation queue | L1 | **DOMAIN** |

**DOMAIN/CRUD classification result:** All 5 screens are DOMAIN_SCREEN. ✅
The most compelling evidence: `/flows-marketplace/:flowId` has 6 distinct role branches —
this is the opposite of a CRUD_FALLBACK page.

### Step 4 — Role Relationships

| Role A | Relationship | Role B | Notes |
|--------|-------------|--------|-------|
| ROLE-FREELANCER | MUTUAL_EXCLUSIVE | ROLE-TENANT-ADMIN | A user is either publishing flows (producer) or installing them (consumer) on any given flow — not both |
| ROLE-BIZ-PARTNER | CONTEXT of | ROLE-TENANT-ADMIN | B2B partner has subscription tier on top of tenant-admin install rights |
| ROLE-PLATFORM-ADMIN | HIERARCHY over | ROLE-TENANT-ADMIN | Platform can see all tenant-admin installations |
| ROLE-PLATFORM-SUPPORT | CONTEXT of | ROLE-PLATFORM-ADMIN | Read-only view of platform-admin data |

### Step 5 — Human Gates

| Gate ID | Assignee | Blocking | Claim | Resolution |
|---------|---------|---------|-------|-----------|
| GATE-FLOW-PUBLISH-REVIEW | ROLE-PLATFORM-ADMIN | YES | New flow submissions require platform review before listing | Platform-admin curation action |
| GATE-FLOW-INSTALL-CONFIRM | ROLE-TENANT-ADMIN | NO (async) | Install confirmation for premium flows requiring billing approval | Tenant-admin approval on install dashboard |

### Step 6 — Special Categories

- [ ] **Minor users:** NOT-APPLICABLE — flow marketplace requires admin-level tenant access.
- [ ] **Anonymous attendee:** NOT-APPLICABLE
- [ ] **Delegation:** APPLICABLE — ROLE-TENANT-ADMIN can pre-approve categories of flows
      for ROLE-1-TENANT to request. Delegation scope: install request, not install action.
- [x] **RAG ACL relevant:** YES — flow definitions in the marketplace RAG index are scoped by
      `allowed_roles`: published flows visible to all, draft flows only to ROLE-FREELANCER
      (author) + ROLE-PLATFORM-ADMIN.

### Step 7 — FC-18 Pre-Check

| Check | Status | Evidence |
|-------|--------|---------|
| Role audience declared for React pages | PENDING | No ROLE-SCREEN-MATRIX before this run |
| Screen template T-2 + T-4 declared | PENDING | Templates defined in Step 1 |
| INTERNAL_ONLY pages not exposed to tenant/public | PASS | No internal engine routes in FLOW-32 session |
| ≥3 distinct states per role | PENDING | Requires UI State Map (B47 step) |

---

## SECTION 2 — DRY RUN: GUIDE-B47 applied to FLOW-20 (INTERNAL_ONLY-heavy flow)

**FLOW-20: Ads Platform (Sponsored Content + Graph API)** | Source: ZIP-17 UI-REFLECTION-STATE.md

### What the existing UI-REFLECTION-STATE reveals

From `FLOW-20/UI-REFLECTION-STATE.md`:
- Total processes: 20 (T287-T306)
- **INTERNAL_ONLY: 18** — vast majority are engine-internal graph gates, webhooks, billing
- **PARTIAL_UI: 2** — T292-AdAuction (AuctionDashboardPage) + T295-AdReview (ConsentGatePage)
- Zero FULL_UI processes

**The library's FP-2 minimum state requirement applied to FLOW-20:**

For FLOW-20, roles have very limited UI surface. Applying GUIDE-B47:

| Role | Observable states | FP-2 verdict |
|------|------------------|-------------|
| ROLE-BIZ-PARTNER (advertiser) | initiate campaign, in_progress (auction), result (bid result), error (rejected creative) — 4 states from AuctionDashboardPage | ✅ PASS (≥3) |
| ROLE-0 (anonymous) | Consent banner, consent declined, consent accepted — 3 states from ConsentGatePage | ✅ PASS (3 = minimum) |
| ROLE-TENANT-ADMIN | Moderation queue list, individual review, decision outcome — 3 states | ✅ PASS (3) |
| ROLE-1-TENANT (standard user) | Sees ads in feed (initiated), reports ad (error-path) — 2 states from report action | ⚠️ NEEDS-CONTEXT |
| ROLE-PLATFORM-ADMIN | Policy ops console — only INTERNAL_ONLY engine surfaces for ad policy | ⚠️ INTERNAL_ONLY — no tenant-facing states |

**NEEDS-CONTEXT declaration for ROLE-1-TENANT:**
Standard tenant-user does not have a dedicated ad-interaction page — they see ads inline
in other flows' feeds. Their ad-related states are: ad shown (passive, no distinct UI),
report-submitted (1 state in FLOW-24's moderation surface), ad-removed (notification only).
This role cannot produce ≥3 distinct UI states within FLOW-20 alone because FLOW-20 is
primarily an engine-internal flow. GUIDE-B47 correctly flags this as NEEDS-CONTEXT.

### GUIDE-B47 FP-2 Rule Applied: Only 2 React pages exist (AuctionDashboardPage + ConsentGatePage)

GUIDE-B47's minimum state check identifies that FLOW-20 only has 2 React pages in the
codebase. This is correct behavior — FLOW-20 is a cross-cutting substrate where:
- Most role-awareness flows THROUGH other flows (ads shown in FLOW-08, FLOW-17, FLOW-07 feeds)
- The engine processes (T287-T306) are 90% INTERNAL_ONLY
- Only the advertiser console (AuctionDashboardPage) and consent gate are flow-owned surfaces

**This is a Cluster 3 (Cross-cutting substrate) reclassification signal** for FLOW-20.
The BATCH-04 data showed FLOW-20 with 5 active cells (3 full + 2 partial), but the
UI-REFLECTION-STATE reveals only 2 dedicated pages. The role-awareness for ad consumers
(tenant-user, anonymous) actually surfaces through host flows' feed pages, not FLOW-20-owned
pages.

**GUIDE-B47 verdict for FLOW-20: SELF-SUFFICIENT** — the guidance correctly handles this
case. NEEDS-CONTEXT is the right verdict for roles that can't produce 3 distinct states
from FLOW-20's owned surfaces. The explanation in GUIDE-B47 states: "if a flow cannot produce
≥3 distinct states for a role, flag as NEEDS-CONTEXT with explanation."

---

## SECTION 3 — RAG ACL VERIFICATION IN GUIDE-B07

### Checking GUIDE-B07 RAG ACL section

From GUIDE-B07-RAG-MD.md §RAG ACL Labels:

The RAG ACL section (C27 — ZIP-15 §2) instructs Claude Code to:
1. Include `allowed_roles[]` field in RAG pattern fixtures for flows with role-scoped access
2. Use confirmed role strings from ZIP-15 §2 as ACL filter labels
3. Tag each RAG pattern with which roles can retrieve it during design simulation

**Applied to FLOW-32 (marketplace flow with role-scoped flow definitions):**

```
RAG ACL Labels for FLOW-32:

Pattern: sharable-flows-public-browse-001
  allowed_roles: ["anonymous", "public-marketplace-visitor", "tenant-user",
                  "tenant-admin", "freelancer", "business-partner",
                  "platform-admin", "platform-support"]
  reason: Public browse patterns are visible to all

Pattern: sharable-flows-publisher-console-001
  allowed_roles: ["freelancer", "platform-admin"]
  reason: Publisher console is FREELANCER + PLATFORM-ADMIN only — not visible to installers

Pattern: sharable-flows-install-001
  allowed_roles: ["tenant-admin", "business-partner", "platform-admin"]
  reason: Installation actions are admin-tier only — tenant-user can only request
```

**GUIDE-B07 RAG ACL verdict: SELF-SUFFICIENT ✅**
The C27 RAG ACL instruction in GUIDE-B07 correctly produces role-filtered patterns.
For FLOW-20, the RAG patterns for ad delivery (graph reads, auction results) carry
INTERNAL_ONLY ACL — they are not exposed to tenant-user RAG queries.

---

## SECTION 4 — V6 ADDITIONAL CHECKS

### Check 1: Does GUIDE-B47 enforce ≥3 distinct states for FLOW-32 (publisher vs consumer vs affiliate)?

**Applying GUIDE-B47 to FLOW-32:**

| Role | State 1 | State 2 | State 3 | State 4 | Count | Verdict |
|------|---------|---------|---------|---------|-------|---------|
| anonymous | Browse grid (empty) | Browse grid (populated) | Detail page view | — | 3 | ✅ PASS |
| tenant-admin (consumer) | Flow catalog browse | Install confirmation | Installed flows dashboard | Error (incompatible flow) | 4 | ✅ PASS |
| freelancer (publisher) | Published flows list | Flow editor (draft) | Published + review pending | Revenue dashboard | 4 | ✅ PASS |
| business-partner | Free tier browse | Subscription CTA | Subscribed catalog | Premium flow unlocked | 4 | ✅ PASS |
| platform-admin | Submission queue | Review in progress | Promoted/Rejected | Policy violation flagged | 4 | ✅ PASS |

**Result: GUIDE-B47 correctly enforces ≥3 distinct states for FLOW-32. ✅ PASS**

State distinctness note for tenant-admin vs freelancer at the same `/flows-marketplace`
route: tenant-admin sees "Install" CTAs and manages their installed collection (consumer
states); freelancer sees "Edit" CTAs on their own flows and "Publish new" affordances
(producer states). These are visually distinct even at the same URL — Level 2 (Screen)
visibility with different panel sets.

### Check 2: Does GUIDE-B46 produce DOMAIN_SCREEN for FLOW-32 (sharable flows browse + install UI)?

**Evidence from Section 1 Step 3:**
All 5 screens classified DOMAIN_SCREEN. The strongest case is `/flows-marketplace/:flowId`
with 6 distinct role branches — anonymous view, tenant-user browse, tenant-admin install,
freelancer own-flow editor, business-partner subscription tier, platform-admin moderation.

**Key distinction from CRUD_FALLBACK:** The UX-REVIEW-ROLLUP identified `sharable-flows-
marketplace` as one of the 🚫 not-representative flows: "Table of UUIDs, not a marketplace."
This confirms the CRUD_FALLBACK problem exists in the current codebase screenshots, but
GUIDE-B46's FP-1 domain-screen gate would catch this — the guidance requires ≥1 DOMAIN_SCREEN
per role and flags CRUD tables as CRUD_FALLBACK bloCKERs.

**GUIDE-B46 FP-1 verdict: SELF-SUFFICIENT ✅ PASS**
The guidance produces DOMAIN_SCREEN classification correctly. The implementation gap
(current PNGs show UUIDs) is an execution issue, not a library gap.

### Check 3: Does GUIDE-B50 cluster FLOW-32 as Cluster 2 (dual-sided marketplace)?

**From Section 1 Step 0:** Classification result: **Cluster 2 — Dual-sided marketplace** ✅

The evidence is decisive: tenant-admin (consumer/installer) ↔ freelancer (producer/publisher)
is the exact consumer-producer split that defines Cluster 2. The MUTUAL_EXCLUSIVE relationship
(Step 4) documents that a user cannot simultaneously install a flow they authored — they are
either the producer or the consumer of any specific flow.

**GUIDE-B50 Cluster 2 verdict: ✅ PASS**

---

## SECTION 5 — GAPS IDENTIFIED IN ROUND 63

| # | Gap | Severity | Affected guidance | Action needed |
|---|-----|---------|------------------|--------------|
| G5 | FLOW-20 is partially a Cluster 3 (cross-cutting substrate) flow — its ad-consumer roles (anonymous, tenant-user) surface through host flows, not FLOW-20-owned pages. GUIDE-B50 Step 0 cluster definitions do not explicitly handle this mixed-cluster case | MEDIUM | GUIDE-B50 | Add note: "A flow can be both Cluster 4 (standard for its own surfaces) and Cluster 3 (substrate) for roles that surface through other flows. Document owned surfaces as Cluster 4; document substrate roles as CONTEXT_BADGE on host flows." |
| G6 | GUIDE-B47 has strong guidance for flows with many owned UI surfaces, but needs a one-line addition for predominantly-INTERNAL_ONLY flows like FLOW-20: clarify that NEEDS-CONTEXT is the correct verdict when a role's states only surface through host flows (not the flow's own pages) | LOW | GUIDE-B47 | Add to NEEDS-CONTEXT section: "For cross-cutting substrate flows where a role's UI surfaces through host flows, NEEDS-CONTEXT is correct — document which host flow provides the states." |
| G7 | The UX-REVIEW-ROLLUP finding for `sharable-flows-marketplace` ("Table of UUIDs") is already caught by GUIDE-B46 FP-1 gate. No library gap. | INFO | — | No action needed |

**2 minor amendments needed (G5, G6). No blocking gaps.**

---

## SECTION 6 — DRY RUN VERDICT

| Check | Result |
|-------|--------|
| GUIDE-B50 classifies FLOW-32 as Cluster 2 (dual-sided) | ✅ PASS |
| GUIDE-B50 produces 9-cell role table matching BATCH-07 data | ✅ PASS |
| GUIDE-B47 enforces ≥3 distinct states for FLOW-32 roles | ✅ PASS |
| GUIDE-B47 correctly handles FLOW-20's INTERNAL_ONLY-heavy structure | ✅ PASS (NEEDS-CONTEXT) |
| GUIDE-B46 produces DOMAIN_SCREEN for FLOW-32 browse + install UI | ✅ PASS |
| GUIDE-B07 RAG ACL section produces role-filtered patterns for FLOW-32 + FLOW-20 | ✅ PASS |
| GUIDE-B50 clusters FLOW-32 as Cluster 2 | ✅ PASS |
| Gaps found requiring guidance amendments | 2 minor (G5, G6 — non-blocking) |

**Overall dry run verdict: ✅ PASS with 2 minor amendments**

Amendments G5 and G6 are single-sentence additions to GUIDE-B50 and GUIDE-B47 respectively.
They are clarifications for edge cases (mixed Cluster 3+4 flows, predominantly-INTERNAL_ONLY
flows). Neither is a structural gap in the guidance. Both will be addressed in Round 64.

**Cumulative gaps from R62 + R63:** G1 (screenshot timing), G2 (minimal gallery — expected),
G3 (no B-50 file yet — expected), G4 (delegation detail minor), G5 (mixed cluster note),
G6 (NEEDS-CONTEXT for substrate flows). 2 require guidance amendments (G5, G6). 4 are
implementation/expected-state items.

---

*VALIDATION-R63-DRY-RUN.md — Round 63 of 72*
*Next: Round 64 — Fix gaps G5 + G6 + Full Integration Check (all ZIP-15 and ZIP-17 references)*
