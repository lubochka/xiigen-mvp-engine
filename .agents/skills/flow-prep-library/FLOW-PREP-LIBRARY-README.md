# FLOW-PREP-LIBRARY-README.md
## FLOW-PREP-LIBRARY v6.1-FINAL
## Date: 2026-04-20 | Status: VALIDATED

---

## What This Library Does

> **Final goal (verbatim):** "Taking the produced library as a result of this plan
> run — same size as list B — and applying on new flow specs, we will get proper
> list B for this flow."

This library solves the fragmentation problem: XIIGen previously required dozens of
separate reference documents, skill files, and ad-hoc instructions to produce the
session documentation for a new flow. Now there is one library of 50 guidance files,
each producing exactly one output file type in `docs/sessions/FLOW-XX/`. Apply the
library to any new flow's functional spec and the XIIGen codebase, and you get the
complete set of 50 List B files — integration-ready, RAG-ready, teaching-pipeline-ready,
and role-aware — without consulting any other document.

---

## Final Verification Statement (v6)

> "This library, applied to a new flow's functional spec and the XIIGen codebase,
> produces 50 output file types per FLOW-XX — including a Role-Screen Matrix that
> maps all user roles (144 roles across 8 layers, confirmed in 47-flow analysis +
> 10-persona model confirmed across 48 flows in fleet execution) to their screen
> templates, guard mechanisms, design tokens, Human Gate specs, panel-level
> visibility rules, RAG ACL labels, and special-category handling (minor users,
> anonymous attendees, delegation, AI-blocks-Human patterns).
> FC-18 compliance is enforced at Phase 7 of every implementation plan, preventing
> the 5 fleet failure patterns (CRUD-instead-of-domain, single-state capture,
> missing role-audience declaration, engine-internal exposure, role-blind authoring)
> confirmed across 622 PNGs in 48-flow fleet validation.
> List A coverage: 897/897 files referenced.
> Validation: 50/50 guidance files self-sufficient (tested against FLOW-48,
> the fleet's hardest flow — universal-persona, all 10 roles simultaneously active)."

---

## Library Composition

**50 guidance files in 7 phases:**

| Phase | Files | What it covers |
|-------|-------|----------------|
| Phase 0: Universal State | B01-B05 | Current/Impl/Plan/QA state JSON + MD |
| Phase 1: Design & Sim Docs | B06-B11 | Reconciliation, RAG, Gallery, UI-Reflection |
| Phase 2: Design Sim + Session | B12-B16 | Design simulation, session files, precheck |
| Phase 3: Implementation + Steps 1-10 | B17-B28 | Impl plan, teach-QA, all 10 simulation steps |
| Phase 4: Gap Translation | B29-B35 | Engine gap list → registry → master plan → session files |
| Phase 5: Session Outputs | B36-B40 | Brief, Phase-complete, State.json, Execution log, Live run |
| Phase 6: Visualization | B41-B44 | 4 PNG visualization files (qa-coverage, reconciliation, teach-qa, design-sim) |
| Phase 7: Role-Enriched | B45-B50 | STEP-9-VISIBILITY, client screens, UI state map, UX audit, gallery design system, Role-Screen Matrix |

**Total List A sources: 897 files (ZIP-01..17)**

---

## The Role-Screen Matrix (B-50) — The New Canonical File Type

B-50 (`FLOW-XX-ROLE-SCREEN-MATRIX.md`) is the primary materialization of ZIP-15
(XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE) for a specific flow. It must be generated
**before B-46, B-47, and B-48** because those three files depend on knowing which
roles exist.

What B-50 produces for each flow:
- **Cluster classification** (1-5 or EXEMPT) from ZIP-17 fleet analysis
- **10-persona role table** with cell status (✅/⚠️/—) sourced from ROLE-ANALYSIS-BATCH-01..10
- **Screen × Role Visibility Matrix** with DOMAIN_SCREEN / CRUD_FALLBACK classification
- **Role relationships** (HIERARCHY, CONTEXT, MUTUAL_EXCLUSIVE, DELEGATION)
- **Human gates** (if the flow has approval workflows)
- **Special categories** (minor users §6.1, anonymous attendees §6.2, delegation §6.3)
- **FC-18 pre-check** for all React pages in the flow

---

## FC-18 Compliance — Phase 7 Mandatory

Every implementation plan produced by this library includes **Phase 7: UI/UX Compliance**
as a mandatory step. Phase 7 enforces FC-18 for all React pages produced in that plan,
preventing the 5 fleet failure patterns:

| FP | Failure pattern | Prevention |
|----|----------------|-----------|
| FP-1 | CRUD table instead of domain screen | GUIDE-B46 domain-screen classification gate |
| FP-2 | Byte-identical PNGs — only 1 UI state captured | GUIDE-B47 ≥3 distinct states requirement |
| FP-3 | Missing role-audience declaration | GUIDE-B50 Step 7 FC-18 pre-check |
| FP-4 | Engine-internal content exposed to tenants | GUIDE-B45 INTERNAL_ONLY guard check |
| FP-5 | Role-blind authoring (screens without role matrix) | GUIDE-B50 before GUIDE-B46/B47 dependency |

Evidence: 622 PNGs reviewed across 47 flows — 575 UX findings, 220 BLOCKERS (35%).
Only 5 of 47 flows rated ✅ Shippable without Phase 7 enforcement.

---

## Special Categories

### Minor Users (ZIP-15 §6.1)
Flows serving users under 18 require: parental consent gate before social features,
age-appropriate content filtering, ROLE-PARENT-GUARDIAN consent management screen.
See GUIDE-B50 Step 6, GUIDE-B47 (minor user override field), GUIDE-B48 (audit check).
Reference flow: FLOW-24 (AI Safety Moderation).

### Anonymous Attendees (ZIP-15 §6.2)
Distinct from ROLE-0 (anonymous browser). An anonymous attendee has limited event
participation without identity. Applies to FLOW-09 (transactional event participation).
See GUIDE-B50 Step 6.

### Delegation (ZIP-15 §6.3)
Role B acts on behalf of Role A with declared scope. Applies to B2B marketplace flows
(FLOW-17, FLOW-32). See GUIDE-B50 Step 6 and GUIDE-B28 (guard declarations).

### Human Gate (ZIP-15 §3 Template 5, ZIP-15 §4 types 7/8)
AI-blocks-human pattern. A human actor must approve before the AI pipeline proceeds.
See GUIDE-B17 (Phase B Human Gate pattern), GUIDE-B28 (guard type declarations).

---

## Cluster Classification Guide (from ZIP-17 FLEET-ROLE-SYNTHESIS)

| Cluster | Description | Cell count | Key flows | Design principle |
|---------|-------------|-----------|-----------|-----------------|
| 1 — Universal | All 10 personas active | 10 | FLOW-16, FLOW-48 | Pattern must work at both extremes |
| 2 — Dual-sided | Consumer × Producer × Curator on same URL | 9 | FLOW-08, FLOW-16, FLOW-17, FLOW-32, FLOW-34 | Mutual-exclusion rules required |
| 3 — Substrate | Role-awareness surfaces through host flows | varies | FLOW-25, FLOW-27, FLOW-40 | CONTEXT_BADGE on consumer flows |
| 4 — Standard | 4-8 active cells | 4-8 | 37 flows | ZIP-15 template lookup; 4-6 role branches |
| 5 — Minimal | 1-3 active cells (platform-internal) | 1-3 | 4 flows | INTERNAL_ONLY per role |
| EXEMPT | 0 cells — no user-facing surfaces | 0 | FLOW-41 only | Skip B-50 Steps 1-6 |

---

## Source Split by Flow Range

| Flow range | Primary spec source | Notes |
|-----------|-------------------|-------|
| FLOW-01..34 | ZIP-16 (business flow specs) | 234 files, all FLOW-01..34 covered |
| FLOW-35..47 | ZIP-09/10/13 (session fixtures) + project docs | Session file families already produced |
| FLOW-48 | ZIP-17 ROLE-ANALYSIS-BATCH-10 + FLEET-ROLE-SYNTHESIS | Cluster 1 universal-persona |

---

## Generation Sequence for a New Flow

```
MANDATORY FIRST: Generate B-50 (ROLE-SCREEN-MATRIX) before B-46, B-47, B-48.

Phase 0:   B01 B02 B03 B04 B05    (state files — read flow spec + existing STATE.json)
Phase 1:   B06 B07 B08 B09 B10 B11 (design docs — read spec + fleet evidence)
Phase 2:   B12 B13 B14 B15 B16    (simulation files — read spec + cycle context)
Phase 3:   B17 B18 B19 B20        (impl plan + teach-QA — read spec + ZIP-15)
           B21 B22 B23 B24 B25 B26 B27 B28 (simulation steps — read spec + engine contracts)
Phase 4:   B29 B30 B31 B32 B33 B34 B35 (gap translation — read ENGINE-GAP-LIST)
Phase 5:   B36 B37 B38 B39 B40    (session output — read PHASE-COMPLETE context)
Phase 6:   B41 B42 B43 B44        (PNG visualization — read source MD/JSON files)
Phase 7:   B50 → B46 → B47 → B48 → B45 → B49
           (B50 FIRST: role matrix from ZIP-15 + ZIP-17 BATCH)
           (B46: client screens using B50 role definitions)
           (B47: UI state map using B50 role definitions)
           (B48: UX audit using B50 + B47 results)
           (B45: cycle visibility using B22 cycle context)
           (B49: gallery HTML using B41-B44 PNGs)
```

---

## Validation Summary

| Test | Flow | Result |
|------|------|--------|
| R62 Dry Run | FLOW-17 (Cluster 2 marketplace) + FLOW-24 (minor users) | ✅ PASS |
| R63 Dry Run | FLOW-32 (Cluster 2) + FLOW-20 (INTERNAL_ONLY heavy) | ✅ PASS (2 minor amendments) |
| R64 Integration | ZIP-15 (15 files, 8 sections) + 5 v6 checks | ✅ PASS |
| R65 Final Goal | FLOW-48 (Cluster 1, all 10 personas) | ✅ **50/50 SELF-SUFFICIENT** |

**Library status: VALIDATED AND COMPLETE**

---

*FLOW-PREP-LIBRARY-README.md — Round 66 of 72*
*Version: v6.1-FINAL | 50 guidance files | 897 List A sources covered | Validated*
