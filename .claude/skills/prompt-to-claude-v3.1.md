# Prompt to Claude — How to Apply the Flow-Prep Library to a New Flow Spec

## What This Library Does

This library of 50 guidance files (GUIDE-B01..B50) solves the fragmentation problem:
instead of consulting dozens of separate reference documents to produce XIIGen flow
documentation, you apply one guidance file per output file type. Give Claude Code a
flow specification + the guidance files, and it produces the complete set of 50
List B documentation files for that flow.

**Final goal:** "Taking the produced library — same size as list B — and applying on
new flow specs, we will get proper list B for this flow." ✅ Validated.

---

## The Copy-Paste Prompt

```
# Task: Generate List B documentation for FLOW-[XX] ([slug])

## Sources
- Flow spec: [attach the flow spec file — ZIP-16 spec for FLOW-01..34,
  or existing session files for FLOW-35..47, or ZIP-17 BATCH-10 for FLOW-48]
- Library: GUIDE-B01..B50 (guidance files in this zip)
- Generation order: LIBRARY-GENERATION-ORDER.md

## Rules
1. Read FLOW-PREP-LIBRARY-README.md first — it explains every file type and
   the cluster classification system.
2. For every output file, open the corresponding GUIDE-BNN.md and follow its
   instructions exactly. The guidance file tells you what sources to read,
   what format to produce, and what rules to enforce.
3. CRITICAL — before generating any Phase 7 file (B-46/B-47/B-48/B-50):
   Check docs/screen-examination/{slug}-examination.md for ground truth.
   If absent, run SK-542 → SK-540 to produce docs/design-context/{slug}/.impeccable.md.
   Then generate B-50 (ROLE-SCREEN-MATRIX) first — before B-46, B-47, B-48.
   The role matrix defines which roles exist. Client screens (B-46) and the
   UI state map (B-47) both depend on it AND on the grammar type from .impeccable.md.
4. Apply the domain-screen gate (GUIDE-B46): classify every client screen as
   DOMAIN_SCREEN or CRUD_FALLBACK before authoring. CRUD_FALLBACK + no domain
   alternative = BLOCKER.
5. Apply the ≥3 state requirement (GUIDE-B47): every role needs ≥3 distinct
   visible UI states in the state map. Loading counts as only 1 state.
6. Include Phase 7 (FC-18 UI/UX Compliance) in the implementation plan
   (GUIDE-B17). Phase 7 is mandatory for any flow that produces React pages.
7. PORTABILITY — Include Phase G (Portability Mobility Gate) in the implementation
   plan (GUIDE-B17). Phase G is mandatory for ALL distributable flows.
   Phase G runs AFTER Phase F and checks P-1..P-5 (see GUIDE-B17 §Phase G).
   If a flow is an EXTERNAL_REPO adapter: declare "External adapter — Phase G N/A."
   A plan without Phase G produces a flow that is ACTIVE but NOT MOBILE.

## Source split by flow range
- FLOW-01..34: primary spec = business flow spec from business_flows.zip
- FLOW-35..47: primary spec = existing CURRENT-STATE.json + DESIGN-SIMULATION-R1.md
- FLOW-48: primary spec = ROLE-ANALYSIS-BATCH-10.md (not in business_flows.zip)

## Before Phase 7 — Examination Record + Design Context (NEW — required)

For every flow that will produce React pages, run these three steps BEFORE
generating B-50, B-46, B-47, B-48:

**Step 1:** Check for a prior examination record
```bash
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -20
```
If present → extract WHO / VERB / GRAMMAR directly from the record.
This is the highest authority source (38 flows already examined).

**Step 2:** Check for an existing design context file
```bash
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -5
```
If present → SK-540 is already satisfied for this flow. Skip to Step 3.
If absent → load SK-542 (flow-ui-examination-protocol-SKILL.md) then
SK-540 (planning--product-design-context-SKILL.md) to produce .impeccable.md.
SK-540 runs domain exploration (5+ concepts, color world, signature element,
defaults to reject) and writes docs/design-context/{slug}/.impeccable.md.

**Step 3:** Confirm grammar type from business-flows-registry
```bash
grep "{slug}" planning--business-flows-registry.md
```
The registry pre-declares G1-G7 for every flow. Use it to confirm the grammar
declared in the examination record or derived in SK-540. This grammar becomes
the primary content type for B-46 (client screens) and is enforced by UX-30.

**7 grammar types (G1-G7):**
| Type | User's question | Key flows |
|------|-----------------|-----------|
| G1 PROGRESS_STRIP | "Where is this in its lifecycle?" | FLOW-00, 11, 14, 19, 33, 39, 45, 47 |
| G2 VERDICT_GRID | "What did each evaluator decide?" | FLOW-24(mod), 25, 27, 35, 37 |
| G3 CARD_LIST | "Which items need attention?" | FLOW-06..08, 10, 12, 16, 17, 20, 32, 36, 40 |
| G4 TOPOLOGY_CANVAS | "How do the parts connect?" | FLOW-18, 26, 29, 34 |
| G5 KIOSK | "I have one task" | FLOW-01..05, 09, 22, 24(report) |
| G6 DASHBOARD | "What are my key metrics?" | FLOW-13, 20(admin), 30, 31, 38 |
| G7 SETTINGS_TABS | "Which setting do I need?" | FLOW-15, 21, 23, 48 |

**CFI-12 halt:** FLOW-04, FLOW-09, FLOW-34 have stale F1 spec documents.
Do not write JSX for these three flows until Luba confirms the correct direction.

## Generation order
Phase 7 first (role-enriched — strict order):
  B50 → B46 → B47 → B48 → B45 → B49

Then remaining phases (in order):
  Phase 0: B01 B02 B03 B04 B05
  Phase 1: B06 B07 B08 B09 B10 B11
  Phase 2: B12 B13 B14 B15 B16
  Phase 3: B17 B18 B19 B20 B21 B22 B23 B24 B25 B26 B27 B28
  Phase 4: B29 B30 B31 B32 B33 B34 B35
  Phase 5: B36 B37 B38 B39 B40
  Phase 6: B41 B42 B43 B44

## Output
One file per guidance file. Save all files to docs/sessions/FLOW-[XX]/.
```

---

## Minimum Viable Subset (if you don't need all 50 files)

| Priority | Files | Why |
|---------|-------|-----|
| Must-do first | B50 (role matrix) | Prevents all 5 fleet failure patterns |
| High value | B12 (design sim), B17 (impl plan), B07 (RAG) | Core integration files |
| Before any UI | B46 → B47 → B48 | Client screens + state map + UX audit |
| After build | B41-B44 (viz PNGs), B49 (gallery) | Visual documentation |

---

## The 5 Failure Patterns the Library Prevents

| Pattern | What goes wrong | Prevented by |
|---------|---------------|-------------|
| FP-1 | CRUD table instead of domain screen | GUIDE-B46 domain-screen gate |
| FP-2 | Byte-identical screenshots (only loading state captured) | GUIDE-B47 ≥3-state requirement |
| FP-3 | No FC-18 role declaration on React pages | GUIDE-B17 Phase 7 mandatory |
| FP-4 | Engine-internal content shown to tenant users | GUIDE-B45 INTERNAL_ONLY guard |
| FP-5 | Role-blind authoring (no role matrix before screens) | GUIDE-B50 mandatory before B-46/B-47 |
| FP-6 | Flow has no portability gate — ACTIVE but not MOBILE | GUIDE-B17 Phase G mandatory — NEW v3.1 |

Evidence for FP-6: 29 module-separation gaps across 49 flows, all requiring retroactive
remediation sessions, all caused by absence of Phase G in their implementation plans.

---

## Cluster Classification (determines how B-50 structures the role matrix)

| Cluster | Cell count | Key flows | What it means |
|---------|-----------|-----------|---------------|
| 1 — Universal | 10 | FLOW-16, FLOW-48 | All 10 personas active; use full population |
| 2 — Dual-sided | 9 | FLOW-08, FLOW-17, FLOW-32 | Consumer × Producer; document mutual-exclusion rules |
| 3 — Substrate | varies | FLOW-20, FLOW-25 | Role-awareness through host flows; CONTEXT_BADGE |
| 4 — Standard | 4-8 | Most flows (37) | ZIP-15 template lookup; 4-6 role branches |
| 5 — Minimal | 1-3 | FLOW-26, FLOW-35 | Platform-internal; INTERNAL_ONLY per role |
| EXEMPT | 0 | FLOW-41 only | No user surfaces; skip B-50 Steps 1-6 |

---

## Key Files to Attach When Running This Prompt

**Core library (always attach):**
1. `FLOW-PREP-LIBRARY-README.md` — start here; explains everything
2. `LIBRARY-GENERATION-ORDER.md` — dependency graph and generation sequence
3. `GUIDE-B50-ROLE-SCREEN-MATRIX.md` — always run first in Phase 7
4. `GUIDE-B46..B49` — the role-enriched Phase 7 files
5. `GUIDE-B17-IMPLEMENTATION-PLAN.md` — includes Q8 (Rule 35), Phase 7 FC-18 + SK-541

**UI/UX skills (attach when producing React pages):**
6. `flow-ui-examination-protocol-SKILL.md` (SK-542) — session orchestrator; check examination record first
7. `planning--product-design-context-SKILL.md` (SK-540) — domain exploration → .impeccable.md
8. `planning--screen-craft-audit-SKILL.md` (SK-541) — Phase 7 four-layer audit
9. `planning--business-flows-registry.md` — grammar type + CFI notes for all 48 flows

**Governance documents (for implementation sessions):**
10. `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.16.md` — Q8, Rule 35, SCREEN INTENT SERVED
11. `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.8.md` — Q10, Mistake 23, examination record priority
6. The relevant guidance file for whatever specific output you need

---

## Validated Against

- FLOW-17 (Cluster 2 — dual-sided marketplace, 9 cells): ✅ PASS
- FLOW-24 (minor users / parental consent gate): ✅ PASS
- FLOW-32 (Cluster 2 — sharable flows marketplace): ✅ PASS
- FLOW-20 (Cluster 3 — substrate / INTERNAL_ONLY-heavy): ✅ PASS
- FLOW-48 (Cluster 1 — universal-persona, all 10 roles): ✅ 50/50 SELF-SUFFICIENT

Library version: v6.1-FINAL | 50 guidance files | 897/897 List A sources covered
