# GUIDE-B50 — How to Produce `FLOW-XX-ROLE-SCREEN-MATRIX.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 60 | Phase 5 (Role-Screen Matrix Guidance)
## Date: 2026-04-20
## **FINAL GUIDANCE FILE — Completes the 50-file library**

---

## FINAL GOAL (re-read before authoring any FLOW-XX-ROLE-SCREEN-MATRIX.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This is the 50th and final guidance file in the library. When Claude Code applies
this guidance alongside the other 49 files, applying the complete library to any
new flow specification will produce a correct, complete set of List B documentation
— enabling proper XIIGen integration, RAG preparation, design simulation, teaching
infrastructure, and all per-phase files.

---

## WHAT THIS FILE IS

`FLOW-XX-ROLE-SCREEN-MATRIX.md` is the **canonical role-to-screen mapping** for a
flow. It is the new B-50 file type introduced in v6. It is the primary materialization
of ZIP-15 (XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE) for a specific flow.

**GENERATION ORDER NOTE (C35/FP-5):**
B-50 MUST be generated BEFORE B-46, B-47, B-48. The role matrix defines which roles
exist and what they can see — B-46 (client screens) and B-47 (UI state map) both
depend on this information.

**What it produces:**
A per-flow document declaring: which roles exist (from ZIP-15 §1), what screens they
see (from ZIP-15 §2 matrix), which structural template applies (ZIP-15 §3), what role
relationships govern access (ZIP-15 §4), what human gates exist (ZIP-15 §3 Template 5),
what special categories apply (ZIP-15 §6), and the FC-18 pre-check status.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-15 | PRIMARY (ALL) | `XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md` §1-§8 — complete role taxonomy (143 entries, 9 families), confirmed ScopeContext.roles[] strings, 5 structural templates, 6 role relationship types, 4 visibility mechanism levels, 3 special categories, 7-step authoring guide, role matrix template |
| ZIP-16 | PRIMARY | Flow's business spec document — determines which actors interact with the flow (business-facing roles like Buyer/Seller/Organizer derive from here) |
| ZIP-14 | REFERENCE | `ui-reasoning.csv` — per-role product type selection; `nextjs.csv` — guard implementation patterns for Next.js route protection |
| ZIP-17 | PRIMARY | `docs/design-reviews/FLEET-ROLE-SYNTHESIS.md` — 10-persona model, 4 architectural clusters, 234 required cells across 48 flows, 10-role usage counts, rollout priority tiers |
| ZIP-17 | PRIMARY | `docs/design-reviews/ROLE-ANALYSIS-BATCH-01.md` through `BATCH-10.md` — per-flow role analysis for all 48 flows; per-flow "Observable viewer roles" tables and "Template implications" |
| ZIP-17 | REFERENCE | `docs/design-reviews/RUN-01-FINAL-BATCH-5-RECON.md` — BATCH-5 reconciliation with rollout priority tiers and per-flow cell counts |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-ROLE-SCREEN-MATRIX.md`

---

## THE 10-PERSONA MODEL (FROM FLEET-ROLE-SYNTHESIS)

Every ROLE-SCREEN-MATRIX is built from the same 10 standardized personas:

| Persona | Usage | Notes |
|---------|-------|-------|
| `anonymous` | 17 flows | Public registration, marketplaces, CMS, forms |
| `public-marketplace-visitor` | 16 flows | Permalink landings + public browse |
| `tenant-user` | 33 flows | Default authenticated persona (69% of flows) |
| `tenant-admin` | 41 flows | Densest admin role (85% of flows) |
| `referral-user` | 12 flows | Registration, onboarding, credit ledgers |
| `freelancer` | 12 flows | Marketplace/payments/payouts/analytics |
| `business-partner` | 14 flows | B2B hub: payments, freelancer, ads, plugins |
| `event-organiser` | 10 flows | Event flows + payouts + analytics |
| `platform-admin` | 44 flows | Near-universal (92% of flows) |
| `platform-support` | 40 flows | Near-universal audit (83% of flows) |

**Cell status vocabulary:**
- `✅` = full template branch required
- `⚠️` = partial (one or two screen variants only)
- `—` = legitimately not applicable (role doesn't interact with this flow)

---

## THE 5 ARCHITECTURAL CLUSTERS (FROM FLEET-ROLE-SYNTHESIS)

**Step 0 of every ROLE-SCREEN-MATRIX is cluster classification:**

| Cluster | Cell count | Flows | Design principle |
|---------|-----------|-------|-----------------|
| Cluster 1 — Universal-persona | 10 cells | FLOW-16, FLOW-48 | All 10 personas active; full population |
| Cluster 2 — Dual-sided marketplace | 9 cells | FLOW-08, FLOW-16, FLOW-32, FLOW-34 | Consumer × Producer × Curator; mutual-exclusion rules |
| Cluster 3 — Cross-cutting substrate | varies | FLOW-25, FLOW-27, FLOW-41 | Role-awareness flows THROUGH other flows; document as CONTEXT_BADGE on consumer flows |
| Cluster 4 — Standard-coverage | 4-8 cells | 37 flows | Use ZIP-15 template lookup; apply 4-6 role branches |
| Cluster 5 — Minimal-coverage | 1-3 cells | 4 flows | Platform-internal; INTERNAL_ONLY per role |
| EXEMPT | 0 cells | FLOW-41 only | Pure engine-internal CI/CD adapter; skip Steps 1-6 |

---

## ROLLOUT PRIORITY TIERS (C42)

When generating B-50 files across the fleet, use this priority order:

**Tier 1** (9-10 cells each — highest ROI):
FLOW-12 subscription-billing (10), FLOW-16 marketplace-payments (10),
FLOW-03 event-management (9), FLOW-09 transactional-event-participation (9),
FLOW-17 freelancer-marketplace (9)

**Tier 2** (8 cells): FLOW-01, FLOW-10, FLOW-20, FLOW-32, FLOW-48

**Tier 3** (5-7 cells): FLOW-07, FLOW-13, FLOW-04, FLOW-06, FLOW-15, FLOW-02, FLOW-34

**Tier 4** (1-4 cells): all remaining flows

**EXEMPT** — skip entirely: FLOW-41 (0 cells)

---

## THE COMPLETE DOCUMENT STRUCTURE (ZIP-15 §8 template, v6)

```markdown
# FLOW-XX — ROLE-SCREEN-MATRIX
## Generated from: XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE v1.0
##                 + ZIP-16 spec / ZIP-17 ROLE-ANALYSIS-BATCH-{N}
## Flow: FLOW-XX [slug] — [flow human name]
## Date: [YYYY-MM-DD]

---

## Step 0a — Examination Record + Grammar Pre-check (NEW — run before cluster classification)

Before classifying the cluster, check whether this flow already has an examination
record and a pre-declared grammar type. These are higher authority than re-deriving
from batch data:

```bash
# Check per-flow examination record (38 flows have this)
cat docs/screen-examination/{slug}-examination.md 2>/dev/null |   grep -E "## Grammar|## CFI-05|## Roles|Grammar$"
# If present:
#   - Grammar type is ground truth → use directly in Step 2 Screen Matrix
#   - CFI-05 status tells whether a Page rewrite is needed
#   - Roles section names the exact role strings (higher authority than re-deriving)

# Check business-flows-registry for pre-declared grammar + user intent
grep -A 5 "{slug}" planning--business-flows-registry.md 2>/dev/null
# Registry maps every flow to: spec path, role-analysis batch, intent summary, grammar

# Check design-context (produced by SK-540)
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -10
# If present: grammar type is declared — populate Step 2 grammar field directly
```

**If examination record present:** extract the grammar type from it now. The grammar
type is the primary content structure that every screen in Step 2 must implement.
A role-screen matrix that assigns screens without declaring which grammar those screens
use is incomplete — the grammar is how the role uses the screen.

**Grammar type quick reference (for Step 2 entries):**
- G1 PROGRESS_STRIP: phase-strip + per-phase status chip (Vercel, GitHub Actions)
- G2 VERDICT_GRID: row × evaluator matrix with per-cell verdict badge
- G3 CARD_LIST: entity cards each with lifecycle-state badge + role actions
- G4 TOPOLOGY_CANVAS: node-graph with state colour and side panel
- G5 KIOSK: single primary action, minimal chrome
- G6 DASHBOARD: metrics strip + trend chart + recent G3 list
- G7 SETTINGS_TABS: tabbed settings panels (org/tenant/user scopes)

---

## Step 0 — Cluster Classification

**Cluster:** [UNIVERSAL | DUAL-SIDED | SUBSTRATE | STANDARD | MINIMAL | EXEMPT]

[From ZIP-17 FLEET-ROLE-SYNTHESIS §Clusters]
[State cell count: N required cells, N conditional cells]

[If EXEMPT: "Role-template work: NOT APPLICABLE. FLOW-41 has no user-facing surfaces."]

---

## Step 1 — Structural Template(s) Identified

**Template(s):** [number(s) from ZIP-15 §3]

[Template 1: 5-Tier RBAC Hierarchy — applies to: FLOW-10, FLOW-11, FLOW-22, FLOW-28]
[Template 2: Two-Sided Marketplace — applies to: FLOW-03, FLOW-06, FLOW-09, FLOW-16, FLOW-17]
[Template 3: Approval Chain — applies to: FLOW-10, FLOW-12, FLOW-13, FLOW-22, FLOW-28]
[Template 4: Platform Operator Stack — applies to: FLOW-08, FLOW-18, FLOW-19, FLOW-33]
[Template 5: Human Gate Actor — applies to flows with human approval gates]

Most flows use Template 1 (RBAC) + one other template.

---

## Step 2 — Roles in This Flow

| Role ID | Role String (ZIP-15 §2) | ZIP-17 Persona | Layer | Cell status |
|---------|------------------------|----------------|-------|-------------|
| ROLE-0 | `"anonymous"` | `anonymous` | Base | [✅/⚠️/—] |
| ROLE-1 | `"authenticated"` | `tenant-user` | Base | [✅/⚠️/—] |
| ROLE-1-[context] | `"[context string]"` | `[persona]` | Context | [✅/⚠️/—] |
| ROLE-TENANT-ADMIN | `"tenant-admin"` | `tenant-admin` | Tenant-configured | [✅/⚠️/—] |
| ROLE-PLATFORM-ADMIN | — | `platform-admin` | Platform | ✅ |
| ROLE-PLATFORM-SUPPORT | — | `platform-support` | Platform | ⚠️ |
| [flow-specific roles] | [from ZIP-15 §1 cross-reference] | [ZIP-17 persona] | [layer] | [status] |

[Source: ROLE-ANALYSIS-BATCH-{N}.md §FLOW-XX Observable viewer roles table]

---

## Step 3 — Screen × Role Visibility Matrix

| Screen | [ROLE-A] | [ROLE-B] | [ROLE-C] | Visibility Level | Domain/CRUD? |
|--------|----------|----------|----------|-----------------|-------------|
| /[route 1] | [visible/hidden/403] | [visible] | [admin overlay] | [Level 1-4] | [DOMAIN/CRUD] |
| /[route 2] | — | [visible] | [visible] | [Level] | [DOMAIN/CRUD] |

[Level from ZIP-15 §5]
[Domain/CRUD = C31 FP-1 classification: DOMAIN_SCREEN or CRUD_FALLBACK]

---

## Step 4 — Role Relationships

| Role A | Relationship type | Role B | Notes |
|--------|-------------------|--------|-------|
| [ROLE-A] | [HIERARCHY/CONTEXT/TENANT-CONFIG/MUTUAL_EXCLUSIVE/DELEGATION] | [ROLE-B] | [detail] |

[ZIP-15 §4 relationship types:
 HIERARCHY — Role A has all permissions of B plus more
 CONTEXT — same user, different role based on object ownership
 TENANT-CONFIG — role defined per tenant
 MUTUAL_EXCLUSIVE — cannot hold both simultaneously
 DELEGATION — role B acts on behalf of role A]

---

## Step 5 — Human Gates (if applicable)

[If no human gates: "No human gate actors in this flow."]

| Gate ID | Assignee type | Blocking | Claim | Resolution |
|---------|---------------|---------|-------|-----------|
| GATE-[N] | [ROLE-ID] | [Yes/No] | [what requires human action] | [how it resolves] |

[ZIP-15 §3 Template 5 applies when flow contains HUMAN_REVIEW or PENDING_HUMAN_REVIEW states]

---

## Step 6 — Special Categories

- [ ] **Minor users (ZIP-15 §6.1):** [YES — parental consent gate required | NOT-APPLICABLE]
      If YES: ROLE-PARENT-GUARDIAN consent screen + age-appropriate content filtering
- [ ] **Anonymous attendee (ZIP-15 §6.2):** [YES — distinct from ROLE-0 | NOT-APPLICABLE]
      If YES: ROLE-ANON-ATTENDEE has limited participation without identity
- [ ] **Delegation (ZIP-15 §6.3):** [YES — ROLE delegates to ROLE | NOT-APPLICABLE]
      If YES: document which roles can delegate + which screens are accessible via delegation
- [ ] **RAG ACL relevant (ZIP-15 §5 RAG-level):** [YES — role restricts RAG access | NOT-APPLICABLE]
      If YES: specify which RAG indices have role-filtered access

---

## Step 7 — FC-18 Pre-Check (v6 addition)

FC-18 governs React pages that belong to this flow:

| Check | Status | Evidence |
|-------|--------|---------|
| Role audience declared for all React pages | [PASS/FAIL/PENDING] | [file:line or "no React pages yet"] |
| Screen template T-1..T-7 declared per matched screen | [PASS/FAIL/PENDING] | [which template per page] |
| INTERNAL_ONLY pages not exposed to tenant/public roles | [PASS/FAIL/N/A] | [FP-4 check result] |
| ≥3 distinct states documented per role | [PASS/FAIL/PENDING] | [C32 FP-2 check result] |

---

## Cross-Role Surface Notes

[From ROLE-ANALYSIS-BATCH-{N} §FLOW-XX Cross-role surfaces and Template implications]

1. **[Surface name]** — [current state; role-aware variant description]
2. **[Surface name]** — [current state; what needs to change per role]

---

## Template Implications

[From ROLE-ANALYSIS-BATCH-{N} §FLOW-XX Template implications]

1. [Specific React component or route + what role-aware change is needed]
2. [Second implication]
```

---

## HOW TO PRODUCE FLOW-XX-ROLE-SCREEN-MATRIX.MD

### Step 1 — Look up the flow in ROLE-ANALYSIS-BATCH-{N}

The 10 batch files in ZIP-17 cover all 48 flows:
- BATCH-01: FLOW-01 to FLOW-05
- BATCH-02: FLOW-06 to FLOW-10
- BATCH-03: FLOW-11 to FLOW-15
- BATCH-04: FLOW-16 to FLOW-20
- BATCH-05: FLOW-21 to FLOW-25
- BATCH-06: FLOW-26 to FLOW-30
- BATCH-07: FLOW-31 to FLOW-35
- BATCH-08: FLOW-36 to FLOW-40
- BATCH-09: FLOW-41 to FLOW-44
- BATCH-10: FLOW-45 to FLOW-48

Read the relevant batch file and find the flow's section for:
- "Observable viewer roles" table → Step 2
- "Cross-role surfaces" → Cross-Role Surface Notes
- "Template implications" → Template Implications
- "ROLE-COVERAGE-MATRIX update" → Step 2 Cell status column

### Step 2 — Read the business spec from ZIP-16

ZIP-16 contains the business flow specifications. The spec confirms which human
actors interact with the flow and in what capacity.

### Step 3 — Classify the cluster

Using FLEET-ROLE-SYNTHESIS §Clusters and the cell count from BATCH-5-RECON:
- Cell count ≥ 9 → check if Cluster 1 (universal) or Cluster 2 (dual-sided)
- 4-8 cells → Cluster 4 (standard)
- 1-3 cells → Cluster 5 (minimal)
- 0 cells → EXEMPT

### Step 4 — Identify structural templates

From ZIP-15 §3, select which of the 5 templates applies by matching the flow's
role pattern to the template descriptions. Most flows: Template 1 (RBAC) + one other.

### Step 5 — Build the role table (Step 2 of document)

Cross-reference three sources:
1. ZIP-15 §1 — canonical Role ID and layer
2. ZIP-15 §2 — confirmed ScopeContext.roles[] string
3. ZIP-17 BATCH — persona match + cell status (✅/⚠️/—)

### Step 6 — Build the Screen × Role Visibility Matrix (Step 3 of document)

List all React routes for this flow. For each route, determine per-role visibility
using ZIP-15 §5 visibility levels (Route/Screen/Panel/Field) and classify as
DOMAIN_SCREEN or CRUD_FALLBACK (C31/FP-1).

### Step 7 — Complete Steps 4-7

Role Relationships (ZIP-15 §4), Human Gates (ZIP-15 §3 Template 5), Special
Categories (ZIP-15 §6), FC-18 Pre-Check.

---

## ACCEPTANCE CRITERIA

Before FLOW-XX-ROLE-SCREEN-MATRIX.md is considered complete:

- [ ] Step 0: Cluster classified (UNIVERSAL/DUAL-SIDED/SUBSTRATE/STANDARD/MINIMAL/EXEMPT)
- [ ] Step 1: Structural template(s) identified by number from ZIP-15 §3
- [ ] Step 2: Role table populated with Role ID, role string, persona, layer, cell status
- [ ] Step 2: Sourced from ROLE-ANALYSIS-BATCH-{N} — not guessed
- [ ] Step 3: Screen × Role Visibility Matrix with Domain/CRUD classification
- [ ] Step 4: Role Relationships declared (or "none" if no cross-role relationships)
- [ ] Step 5: Human Gates declared (or "none" if no human gates)
- [ ] Step 6: All four special category checks completed (YES/NO/NOT-APPLICABLE)
- [ ] Step 7: FC-18 pre-check with PASS/FAIL/PENDING per check
- [ ] EXEMPT flows: single-sentence "NOT APPLICABLE" output only

---

## KEY RULES

**1. B-50 MUST be generated before B-46, B-47, B-48 (C35).**
The role matrix defines which roles exist. B-46 client screens and B-47 UI state
map depend on knowing which roles to document. Generating B-46 before B-50 means
guessing at the role set — a C35 violation.

**2. FLOW-41 is the ONLY EXEMPT flow.**
No other flow has 0 required cells. FLOW-41 (adapter-ci-cd-bridge) is a pure
engine-internal CI/CD adapter with no user-facing surfaces. Its ROLE-SCREEN-MATRIX
contains only "NOT APPLICABLE." All other flows have at least one role cell.

**3. The 10-persona model is fixed — do not invent new personas.**
The FLEET-ROLE-SYNTHESIS established 10 standard personas across all 48 flows.
New flows may use any of these 10, but the model itself does not expand. A new
actor in a flow spec that doesn't match any of the 10 personas should be mapped
to the closest existing persona with a note, not added as an 11th persona.

**4. Cell status derives from the BATCH analysis, not inference.**
ZIP-17 ROLE-ANALYSIS-BATCH-01..10 provides the verified cell status for all 48 flows.
Do not determine cell status by re-reading the spec from scratch — read the batch
analysis for the flow's section and copy its "Observable viewer roles" table.

**5. Cluster 3 (substrate) flows are documented differently.**
FLOW-25 (BFA governance), FLOW-27 (schema registry), FLOW-41 (CI/CD adapter) are
cross-cutting substrates. Their role-awareness appears as CONTEXT_BADGE on the
flows that consume them, not as full template branches in their own matrix. Document
these as: "Role-template work for FLOW-XX surfaces through [list of consumer flows]."

**Mixed Cluster 3+4 flows (NEW — G5, R64):** A flow can simultaneously be Cluster 4
(standard coverage for its own owned surfaces) AND Cluster 3 (substrate) for roles
that only surface through host flows. Example: FLOW-20 (Ads Platform) owns
AuctionDashboardPage (business-partner UI — Cluster 4) but the anonymous and
tenant-user ad-consumer roles surface through FLOW-08/FLOW-17 feeds (Cluster 3 for
those roles). In Step 0, declare: "Cluster 4 for owned surfaces + Cluster 3 (substrate)
for consumer roles: [list of consumer roles and host flows]." In Step 2, mark the
substrate roles with a CONTEXT_BADGE annotation. In Step 3, note which screens belong
to host flows rather than this flow's owned routes.

---

*End of GUIDE-B50 — FLOW-XX-ROLE-SCREEN-MATRIX.md*
*This is the 50th and final guidance file. The library is COMPLETE.*
*List A sources: ZIP-15 ALL SECTIONS (complete role taxonomy, structural templates,*
*visibility levels, special categories, authoring guide, role matrix template),*
*ZIP-16 (business flow specs — actor identification),*
*ZIP-14 (ui-reasoning.csv, nextjs.csv — guard implementation),*
*ZIP-17 (FLEET-ROLE-SYNTHESIS.md — 10-persona model + 4 clusters,*
*ROLE-ANALYSIS-BATCH-01..10 — all 48 flows analyzed,*
*RUN-01-FINAL-BATCH-5-RECON.md — rollout priority tiers)*
*Target B-type: B-50 — FLOW-XX-ROLE-SCREEN-MATRIX.md*
*Round: 60 of 72*
*LIBRARY STATUS: 50/50 guidance files COMPLETE*
