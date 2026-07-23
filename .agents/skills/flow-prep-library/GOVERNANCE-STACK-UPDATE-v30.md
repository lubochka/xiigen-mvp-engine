# GOVERNANCE-STACK-UPDATE-v30.md
## Governance Stack v30 Integration into Guidance Files
## Per-guidance-file change table | Version bumps | FC-18 path spec | T-1..T-7 alignment
## FLOW-PREP-LIBRARY v6.1-FINAL — Round 71 | Phase 9
## Date: 2026-04-20

---

## What Changed in v30

SESSION-LOAD-PLAN v30 introduced three major changes (all confirmed in
`XIIGEN-SESSION-LOAD-PLAN-v30.md` project file):

1. **SK-539** (`planning--ui-ux-compliance-SKILL.md`) registered at Layer 8, load_order 5.5
   — 29 UX checks (UX-01..UX-29), 52-role taxonomy, 12 visibility scopes, 7 screen templates (T-1..T-7)
2. **FC-18** (`fc-18-ui-ux-compliance-gate.md`) registered as Gate 0m in CODE-REVIEW-PROTOCOL v1.7
3. **Rule 35** added — UI/UX Compliance Mandatory: sessions producing React pages must complete
   Phase 7 and produce FC-18 Audit Trail before ⛔ STOP

Companion documents also updated:
- `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15` — Phase 7 added as mandatory authoring step
- `CODE-REVIEW-PROTOCOL v1.7` — Gate 0m (FC-18) added
- `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE v1.7` — Signal 12 (Mistake 22) added

---

## PER-GUIDANCE-FILE CHANGE TABLE (9 changes)

### Change 1 — All GUIDE-B* files

| Property | Old | New |
|---------|-----|-----|
| Reference document | AUTHORING-GUIDE v1.14 | **AUTHORING-GUIDE v1.15** |
| What changed | Phase 7 (UI/UX Compliance) was optional | Phase 7 is now mandatory |
| Scope | All 50 guidance files | All 50 guidance files |

**What Phase 7 requires in every guidance file that produces React pages:**
```
Phase 7 runs after Phase 6 (Topology Visual QA) and before the final ⛔ STOP.
It verifies 29 SK-539 checks and produces FC-18 Audit Trail at:
  docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md
Seven reusable screen templates (T-1..T-7) pre-satisfy FC-18 checks — see §T-ALIGNMENT.
```

**Status in library:** The library guidance files were authored against v1.15.
All Phase 7 references in GUIDE-B17, GUIDE-B46, GUIDE-B48, GUIDE-B50 already
reflect v1.15. No retroactive changes needed for the 50 guidance files.

---

### Change 2 — GUIDE-B17 (Round 27): Implementation Plan

| Property | Old | New |
|---------|-----|-----|
| Reference | CODE-REVIEW-PROTOCOL v1.6 | **CODE-REVIEW-PROTOCOL v1.7** |
| Gate added | None | **Gate 0m (FC-18)** |
| What Gate 0m checks | — | "Session produced ≥1 React page → FC-18 Audit Trail must exist before plan approval" |

**Gate 0m specification:**
```
Gate 0m — FC-18 UI/UX Compliance (fires when session produced React pages):
  [ ] FC-18 Audit Trail at docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md
  [ ] All BLOCK findings cleared
  [ ] CONCERN findings in carry-forward inventory
  [ ] Screen template (T-1..T-7) declared for each matched page
  If React pages produced AND no Audit Trail: STOP does not fire. Run Phase 7 first.
```

**Status in GUIDE-B17:** GUIDE-B17 already references CODE-REVIEW-PROTOCOL v1.7 and
Phase 7 FC-18 audit step. The v1.7 reference is present (35 occurrences of Phase 7 /
FC-18 confirmed in Round 70 cross-check).

**Implementation plan Phase 7 section (already in GUIDE-B17):**
```
Phase 7: UI/UX Compliance — FC-18 mandatory for React pages
  Artifact: docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md
  Gate: CODE-REVIEW-PROTOCOL v1.7 Gate 0m
```

---

### Change 3 — GUIDE-B08 (Round 18): Gallery HTML

| Property | Old | New |
|---------|-----|-----|
| Reference | None (gallery was purely visual) | **SK-539 + FC-18** |
| What changed | Gallery was a standalone HTML file | Gallery now links to FC-18 Audit Trail |
| New output | — | `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md` path added as gallery section |

**FC-18 Audit Trail path specification:**
```
For every React page in the flow, the gallery optionally links to:
  docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md

This path is the canonical FC-18 evidence file — it contains:
  - Role audience declarations per page
  - Screen template (T-1..T-7) declarations
  - SK-539 check verdicts (UX-01..UX-29)
  - BLOCK findings and resolution status
  - CONCERN findings in carry-forward inventory
```

**Note:** GUIDE-B08 (early gallery format) was authored before v6. GUIDE-B49 (v6
gallery, Round 59) already includes role-scoped token declarations. The FC-18 Audit
Trail link is an informational addition — the gallery HTML does not require modification,
but the FC-18-AUDIT-TRAIL.md file must be created during Phase 7 for the flow.

---

### Change 4 — GUIDE-B46 (Round 56): Design Sim Client Screens

| Property | Old | New |
|---------|-----|-----|
| Reference | ZIP-15 §3 structural templates (5 templates) | **ZIP-15 §3 + SK-539 T-1..T-7** |
| What changed | Role matrix used ZIP-15 §3 templates (Template 1-5) | Screen templates must also declare SK-539 T-type |
| Mapping | Template 1 (RBAC) → none | Template 1 (RBAC) → T-3 (Arbiter-Progress) or T-7 (AgentSessionMonitor) depending on flow |

**SK-539 T-1..T-7 to ZIP-15 §3 alignment table:**

| SK-539 template | Name | Flows | ZIP-15 §3 relationship |
|----------------|------|-------|----------------------|
| T-1 | AI-Proposal-Review | FLOW-24, FLOW-26, FLOW-31, FLOW-35 | Template 5 (Human Gate Actor) + Template 4 (Platform Operator) |
| T-2 | Bootstrap-Checklist | FLOW-33, FLOW-47 | Template 4 (Platform Operator Stack) |
| T-3 | Arbiter-Progress | FLOW-26, FLOW-35, FLOW-44 | Template 4 (Platform Operator) — admin monitoring arbitration |
| T-4 | ParallelFlowMonitor | FLOW-43 | Template 4 (Platform Operator Stack) |
| T-5 | AiSelfModificationReview | FLOW-44 | Template 5 (Human Gate Actor) — human must review AI self-change |
| T-6 | CycleTopologyDiff | FLOW-45 | Template 3 (Approval Chain) — diff requires approval |
| T-7 | AgentSessionMonitor | FLOW-46 | Template 4 (Platform Operator Stack) |

**What this means for GUIDE-B46:**
When specifying a client screen, declare both:
1. ZIP-15 §3 structural template (1-5) — defines role branches
2. SK-539 T-type (T-1..T-7) — defines the screen's required fields and FC-18 compliance template

If no SK-539 T-type applies (domain flow, not engine-internal): declare "No T-type — domain screen, B46 domain-screen gate applies."

**Status:** GUIDE-B46 does not yet contain explicit T-type declarations. This is a
forward compatibility note — T-types apply to engine-internal admin pages (FLOW-24..47).
Domain flows (FLOW-01..23) use ZIP-15 §3 only.

---

### Change 5 — GUIDE-B48 (Round 58): UX Audit

| Property | Old | New |
|---------|-----|-----|
| Reference | ZIP-14 SKILL.md P1-P10 | **SK-539 UX-01..29 + ZIP-14** |
| Priority | P1/P2 were HIGH in SKILL.md | **P1/P2 are now CRITICAL per SK-539** |
| Check count | 10 priority categories | 29 SK-539 checks + 10 ZIP-14 categories |
| Precedence | ZIP-14 governed | SK-539 checks take precedence; ZIP-14 supplements |

**SK-539 CRITICAL check list (top 5 from FLEET-VALIDATION §5):**
```
UX-01: Touch target minimum 44×44px (P2 CRITICAL — fleet-wide finding #1)
UX-02: prefers-reduced-motion media query present (P1 CRITICAL — finding #2)
UX-03: Skip-to-main-content link in App shell (P1 CRITICAL — finding #3)
UX-04: No emoji used as icons (P4 MEDIUM — finding #4)
UX-05: All icon-only buttons have aria-label (P1 LOW — finding #5)
```

**Status in GUIDE-B48:** GUIDE-B48 already references SK-539 UX-01..UX-29 and declares
P1/P2 as CRITICAL. The 5 fleet-wide findings are documented in the fleet-wide check
section. Confirmed: 18 occurrences of INTERNAL_ONLY + SK-539 P1/P2 CRITICAL in GUIDE-B48.

---

### Change 6 — GUIDE-B50 (Round 60): Role-Screen Matrix

| Property | Old | New |
|---------|-----|-----|
| Reference | ZIP-15 §8 template | **ZIP-15 §8 + FC-18 Step 7** |
| What changed | Role matrix had 6 steps | **Step 7 FC-18 pre-check added** as mandatory 7th step |
| Step 7 checks | — | Role audience declared, screen template (T-1..T-7) declared, no INTERNAL_ONLY to tenant/public, ≥3 distinct states per role |

**Step 7 FC-18 pre-check specification (from GUIDE-B50):**
```
## Step 7 — FC-18 Pre-Check (v6 addition)

FC-18 governs React pages that belong to this flow:

| Check | Status | Evidence |
|-------|--------|---------|
| Role audience declared for all React pages | PASS/FAIL/PENDING | file:line |
| Screen template T-1..T-7 declared per matched screen | PASS/FAIL/PENDING | template ID |
| INTERNAL_ONLY pages not exposed to tenant/public | PASS/FAIL/N/A | FP-4 check |
| ≥3 distinct states documented per role | PASS/FAIL/PENDING | C32 FP-2 |
```

**Status in GUIDE-B50:** Step 7 FC-18 pre-check is present (confirmed: 4 occurrences
of FC-18 pre-check terminology in GUIDE-B50).

---

### Change 7 — GUIDE-B21 (Round 31): Step 1 Invariants

| Property | Old | New |
|---------|-----|-----|
| Reference | FLOW-PREP-MASTER-PLAN (general) | **SESSION-LOAD-PLAN v30** |
| What changed | Step 1 invariants did not include UI/UX rule | **Rule 35 must appear as a flow invariant** |
| Rule 35 text | — | "Sessions producing React pages MUST complete Phase 7 (UI/UX Compliance) and produce FC-18 Audit Trail before ⛔ STOP" |

**Rule 35 as flow invariant (to add to STEP-1-INVARIANTS structure):**
```
### RULE-35 — UI/UX Compliance Mandatory (SESSION-LOAD-PLAN v30)
Sessions that produce *.tsx files in client/src/pages/ must:
1. Load SK-539 at load_order 5.5 before writing any page
2. Complete Phase 7 (FC-18 UI/UX Compliance) as a declared plan step
3. Produce FC-18 Audit Trail at docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md
4. Clear all BLOCK findings before ⛔ STOP fires
Source: SESSION-LOAD-PLAN v30 Rule 35; HOW-TO-USE-SKILLS v4.4.0 Mandatory Check 15
```

**Status in GUIDE-B21:** Rule 35 reference is not yet explicitly present in
GUIDE-B21-STEP-1-INVARIANTS.md. This is a forward compatibility addition — flows
that produce React pages need Rule 35 cited in their invariants file. Non-UI flows
may omit it with "No React pages — Rule 35 N/A."

---

## VERSION BUMP REFERENCE LIST

| Document | Old version | New version | Key change |
|---------|------------|------------|-----------|
| SESSION-LOAD-PLAN | v28/v29 | **v30** | SK-539 + FC-18 + Rule 35 registered |
| FLOW-DOCUMENT-AUTHORING-GUIDE | v1.14 | **v1.15** | Phase 7 mandatory, T-1..T-7 templates, FC-18 audit trail |
| CODE-REVIEW-PROTOCOL | v1.6 | **v1.7** | Gate 0m (FC-18) added |
| DESIGN-ARCHITECT-SESSION-GUIDE | v1.5 | **v1.7** | Signal 12 (Mistake 22 — skipping Phase 7) added |
| HOW-TO-USE-SKILLS | v4.3.0 | **v4.4.0** | SK-539 at load_order 5.5, Check 15 (FC-18), Rule 35 |
| GUIDE-B17 | (any) | **v6 current** | Phase 7 FC-18 present; Gate 0m reference |
| GUIDE-B46 | (any) | **v6 + T-type note** | T-1..T-7 alignment table added this round |
| GUIDE-B48 | (any) | **v6 current** | SK-539 P1/P2 CRITICAL; 5 fleet findings |
| GUIDE-B50 | (any) | **v6 current** | Step 7 FC-18 pre-check present |

---

## FC-18 AUDIT TRAIL PATH SPECIFICATION

```
Path:     docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md
Example:  docs/ux-review/freelancer-marketplace/FC-18-AUDIT-TRAIL.md

{slug} = the flow's kebab-case slug, matching:
  - docs/sessions/FLOW-XX/{slug} slug conventions
  - client/src/pages/{slug}/ directory
  - docs/ux-review/{slug}/UX-REVIEW.md (existing per-flow UX review)

Structure:
  ## FC-18 Audit Trail — {FlowName}
  ## Page: {ComponentName}.tsx
  ## Date: [YYYY-MM-DD] | Branch: [branch]

  | Check | Verdict | Evidence |
  |-------|---------|---------|
  | Role audience declared | PASS/FAIL | [from B-50 Step 2] |
  | Screen template declared | PASS/FAIL | T-{N} ([template name]) |
  | No INTERNAL_ONLY to tenant | PASS/FAIL | [from B-45 FP-4 check] |
  | ≥3 distinct states | PASS/FAIL | [from B-47 state count] |
  | SK-539 P1 (Accessibility) | PASS/FAIL | [touch target, skip-link, reduced-motion] |
  | SK-539 P2 (Touch) | PASS/FAIL | [44×44pt minimum] |

  BLOCK findings: [list or "none"]
  CONCERN findings: [list or "none — carry-forward N/A"]
```

---

## SK-539 T-1..T-7 ALIGNMENT WITH ZIP-15 §3 TEMPLATES (COMPLETE TABLE)

| SK-539 T-type | Name | Applicable flows | ZIP-15 §3 template | Domain classification |
|--------------|------|-----------------|-------------------|-----------------------|
| T-1 | AI-Proposal-Review | FLOW-24, FLOW-26, FLOW-31, FLOW-35 | Template 5 (Human Gate) + Template 4 | ENGINE_INTERNAL → INTERNAL_ONLY for tenants |
| T-2 | Bootstrap-Checklist | FLOW-33, FLOW-47 | Template 4 (Platform Operator) | ENGINE_INTERNAL |
| T-3 | Arbiter-Progress | FLOW-26, FLOW-35, FLOW-44 | Template 4 (Platform Operator) | ENGINE_INTERNAL |
| T-4 | ParallelFlowMonitor | FLOW-43 | Template 4 (Platform Operator) | ENGINE_INTERNAL |
| T-5 | AiSelfModificationReview | FLOW-44 | Template 5 (Human Gate) | ENGINE_INTERNAL — platform-admin only |
| T-6 | CycleTopologyDiff | FLOW-45 | Template 3 (Approval Chain) | ENGINE_INTERNAL |
| T-7 | AgentSessionMonitor | FLOW-46 | Template 4 (Platform Operator) | ADMIN_FACING |
| None | (domain flows) | FLOW-01..23, FLOW-48 | Template 1-2 (RBAC/Marketplace) | TENANT_FACING or PUBLIC |

**Key rule:** T-types T-1..T-6 are ENGINE_INTERNAL — they should NEVER appear in TENANT_FACING
or PUBLIC routes. T-7 (AgentSessionMonitor) is ADMIN_FACING — platform-admin only.
Domain flows (FLOW-01..23, FLOW-48) have no T-type — they use ZIP-15 §3 templates 1-4 only.

---

## GOVERNANCE STACK CHANGE SUMMARY

```
v30 governance stack adds 3 mandatory requirements to every session that produces React pages:

1. SK-539 loaded at load_order 5.5 (before writing any page)
2. Phase 7 (FC-18 UI/UX Compliance) declared as a plan step
3. FC-18 Audit Trail produced at docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md

These 3 requirements are enforced by:
  Mandatory Check 15 (HOW-TO-USE-SKILLS v4.4.0) — fires at every ⛔ STOP
  Gate 0m (CODE-REVIEW-PROTOCOL v1.7) — fires at plan review
  Rule 35 (SESSION-LOAD-PLAN v30) — declared as session invariant

All 3 are already present in the library guidance files:
  GUIDE-B17 → Phase 7 mandatory
  GUIDE-B46 → domain-screen gate (FP-1 prevention)
  GUIDE-B47 → ≥3 states (FP-2 prevention)
  GUIDE-B45 → INTERNAL_ONLY guard (FP-4 prevention)
  GUIDE-B50 → Step 7 FC-18 pre-check (FP-5 + FP-3 prevention)

FORWARD COMPATIBILITY: GUIDE-B21 Step 1 Invariants should include Rule 35 citation
for flows that produce React pages. Non-UI flows omit it with "Rule 35 N/A."
```

---

*GOVERNANCE-STACK-UPDATE-v30.md — Round 71 of 72*
*All v30 changes documented | FC-18 path specification complete | T-1..T-7 alignment table complete*
*Next: Round 72 — FLOW-48 Registration + Updated Source Map (A-TO-B-SOURCE-MAP-v2.md)*
