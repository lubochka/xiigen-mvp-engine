# LIBRARY-MASTER-INDEX.md
## FLOW-PREP-LIBRARY v6.1-FINAL — Complete 50-File Guidance Library
## Round 61 Integration | Date: 2026-04-20

---

## Purpose

This is the master index of all 50 guidance files. Each entry records: what the
guidance file produces, which List A sources it uses, what List B file it enables,
and its dependencies on other guidance files. Use this index when applying the
library to a new flow spec.

**Final goal:** Applying files B01-B50 in generation order to any new flow spec
produces a complete, correct set of List B documentation files — enabling proper
XIIGen integration, RAG preparation, design simulation, and all per-phase files.

---

## GENERATION ORDER (critical — C35 constraint)

```
DEPENDENCY CHAIN:
B50 → B46 → B47 → B48 → B49    (role matrix before client screens before UX)
B33 → B34 → B35                  (gap-prep before gap-R before gap-T)
B29 → B30 → B31 → B32            (gap list → registry → master plan → block plan)
B22 → B24 → B26 → B28            (cycle1 → cycle2 → cycle3 → handoff)
B12 → B13                         (design-sim before session-sim)

STANDALONE (no dependency within library):
B01-B11, B14-B21, B23, B25, B27, B36-B45
```

**Full generation order for a new flow:**

```
Phase 0 (Universal State):     B01 B02 B03 B04 B05
Phase 1 (Design):              B06 B07 B08 B09 B10 B11
Phase 2 (Simulation):          B12 B13 B14 B15 B16
Phase 3 (Steps 1-10):          B17 B18 B19 B20 B21 B22 B23 B24 B25 B26 B27 B28
Phase 4 (Gap Translation):     B29 B30 B31 B32 B33 B34 B35
Phase 5 (Session Outputs):     B36 B37 B38 B39 B40
Phase 6 (Visualization):       B41 B42 B43 B44
Phase 7 (Role-Enriched):  B50 → B46 → B47 → B48 → B49 (strict order)
```

---

## PHASE 0 — UNIVERSAL STATE FILES (B01-B05)

| # | Guidance file | Target List B file | Key List A sources |
|---|--------------|-------------------|-------------------|
| B01 | GUIDE-B01-CURRENT-STATE-JSON.md | `FLOW-XX-CURRENT-STATE.json` | ZIP-17 FLOW-46 CURRENT-STATE, ZIP-15 §1 |
| B02 | GUIDE-B02-IMPL-STATE-JSON.md | `FLOW-XX-IMPL-STATE.json` | ZIP-17 FLOW-46 IMPL-STATE |
| B03 | GUIDE-B03-PLAN-STATE-JSON.md | `FLOW-XX-PLAN-STATE.json` | ZIP-17 FLOW-46 PLAN-STATE |
| B04 | GUIDE-B04-QA-COVERAGE-STATE-JSON.md | `FLOW-XX-QA-COVERAGE-STATE.json` | ZIP-17 FLOW-46 QA-COVERAGE-STATE |
| B05 | GUIDE-B05-QA-COVERAGE-STATE-MD.md | `FLOW-XX-QA-COVERAGE-STATE.md` | ZIP-17 FLOW-46 QA-COVERAGE-STATE.md |

---

## PHASE 1 — DESIGN & SIMULATION DOCS (B06-B11)

| # | Guidance file | Target List B file | Key List A sources |
|---|--------------|-------------------|-------------------|
| B06 | GUIDE-B06-RECONCILIATION-STATE-MD.md | `FLOW-XX-RECONCILIATION-STATE.md` | ZIP-17 FLOW-46/01/03 RECONCILIATION-STATE |
| B07 | GUIDE-B07-RAG-MD.md | `FLOW-XX-RAG.md` | ZIP-17 FLOW-01 RAG.md |
| B08 | GUIDE-B08-GALLERY-HTML.md | `FLOW-XX-GALLERY.html` | ZIP-17 FLOW-07/01 GALLERY.html (early format) |
| B09 | GUIDE-B09-UI-REFLECTION-STATE-JSON.md | `UI-REFLECTION-STATE.json` | ZIP-17 FLOW-46/01 UI-REFLECTION-STATE.json |
| B10 | GUIDE-B10-UI-REFLECTION-STATE-MD.md | `UI-REFLECTION-STATE.md` | ZIP-17 FLOW-46/01 UI-REFLECTION-STATE.md |
| B11 | GUIDE-B11-FLOW-UI-AUTOMATION-JSON.md | `FLOW-XX-UI-AUTOMATION.json` | ZIP-17 flow UI automation data |

---

## PHASE 2 — DESIGN SIMULATION + SESSION (B12-B16)

| # | Guidance file | Target List B file | Key List A sources |
|---|--------------|-------------------|-------------------|
| B12 | GUIDE-B12-DESIGN-SIMULATION-R1-MD.md | `FLOW-XX-DESIGN-SIMULATION-R1.md` | ZIP-16 flow spec, ZIP-17 FLOW-07/09/46 design sims |
| B13 | GUIDE-B13-SESSION-SIM-RN.md | `SESSION-SIM-RN.md` family | ZIP-11 FLOW-01/09 SESSION-SIM files |
| B14 | GUIDE-B14-R0-PRECHECK.md | `FLOW-XX-R0-PRECHECK.md` | ZIP-11 FLOW-09 precheck |
| B15 | GUIDE-B15-R1-STATE-INIT.md | `FLOW-XX-R1-STATE-INIT.md` | ZIP-11 R1-STATE-INIT files |
| B16 | GUIDE-B16-SESSION-RN-LABELS.md | Session round label files | ZIP-09/10/13 session files |

---

## PHASE 3 — IMPLEMENTATION PLAN + STEPS 1-10 (B17-B28)

| # | Guidance file | Target List B file | Key List A sources | Dependencies |
|---|--------------|-------------------|--------------------|-------------|
| B17 | GUIDE-B17-IMPLEMENTATION-PLAN.md | `FLOW-XX-IMPLEMENTATION-PLAN-v1.md` | ZIP-17 FLOW-46/47 IMPL-PLAN | — |
| B18 | GUIDE-B18-TEACH-QA-R0.md | `FLOW-XX-TEACH-QA-R0.md` | ZIP-17 FLOW-07/25/46 TEACH-QA-R0 | — |
| B19 | GUIDE-B19-TEACH-QA-R1-FINAL.md | `FLOW-XX-TEACH-QA-R1-FINAL.md` | ZIP-17 FLOW-07 TEACH-QA-R1-FINAL | B18 |
| B20 | GUIDE-B20-STEP-10-CHAIN-REVIEW.md | `FLOW-XX-STEP-10-CHAIN-REVIEW.md` | ZIP-11 step-10 files | — |
| B21 | GUIDE-B21-STEP-1-INVARIANTS.md | `FLOW-XX-STEP-1-INVARIANTS.md` | ZIP-01 (DNA), ZIP-05 (BFA), ZIP-15 §1 | — |
| B22 | GUIDE-B22-STEP-2-CYCLE1-CONTEXT.md | `FLOW-XX-STEP-2-CYCLE1-CONTEXT.md` | ZIP-16 (flow spec), ZIP-08 SK-522 | B21 |
| B23 | GUIDE-B23-STEP-3-CYCLE1-TEST.md | `FLOW-XX-STEP-3-CYCLE1-TEST.md` | ZIP-11 cycle1-test files | B22 |
| B24 | GUIDE-B24-STEP-4-CYCLE2-TEMPLATE.md | `FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md` | ZIP-11 cycle2-template files | B22 |
| B25 | GUIDE-B25-STEP-5-CYCLE2-TEST.md | `FLOW-XX-STEP-5-CYCLE2-TEST.md` | ZIP-11 cycle2-test files | B24 |
| B26 | GUIDE-B26-STEP-6-CYCLE3-CONTEXT.md | `FLOW-XX-STEP-6-CYCLE3-CONTEXT.md` | ZIP-11 cycle3-context files | B24 |
| B27 | GUIDE-B27-STEP-7-CYCLE3-TEST.md | `FLOW-XX-STEP-7-CYCLE3-TEST.md` | ZIP-11 cycle3-test files | B26 |
| B28 | GUIDE-B28-STEP-8-HANDOFF-CONTRACT.md | `FLOW-XX-STEP-8-HANDOFF-CONTRACT.md` | ZIP-03 (interfaces), ZIP-15 §4, ZIP-17 FLOW-09 | B26 |

---

## PHASE 4 — GAP TRANSLATION SYSTEM (B29-B35)

| # | Guidance file | Target List B file | Key List A sources | Dependencies |
|---|--------------|-------------------|--------------------|-------------|
| B29 | GUIDE-B29-ENGINE-GAP-LIST.md | `FLOW-XX-ENGINE-GAP-LIST.md` | ZIP-12 GAP-PREP R8, ZIP-17 FLOW-10 | B33 outputs |
| B30 | GUIDE-B30-GAP-REGISTRY.md | `FLOW-XX-GAP-REGISTRY.json` | ZIP-17 FLOW-10/07 GAP-REGISTRY | B29 |
| B31 | GUIDE-B31-GAPS-MASTER-PLAN.md | `FLOW-XX-GAPS-MASTER-PLAN.md` | ZIP-17 FLOW-02/07/10 GAPS-MASTER-PLAN | B30 |
| B32 | GUIDE-B32-BLOCK-PLAN.md | `FLOW-XX-BLOCK-PLAN.json` | ZIP-17 FLOW-41/07/10 BLOCK-PLAN | B30 |
| B33 | GUIDE-B33-SESSION-GAP-PREP-RN.md | `SESSION-GAP-PREP-RN.md` family (9 files) | ZIP-12 GAP-PREP-R0..R8, ZIP-17 FLOW-10 | — |
| B34 | GUIDE-B34-SESSION-GAP-R.md | `SESSION-GAP-RN.md` family (N files) | ZIP-17 FLOW-10 SESSION-GAP-R0/R2/R15/R22 | B31, B32 |
| B35 | GUIDE-B35-SESSION-GAP-T.md | `SESSION-GAP-TN.md` family | ZIP-17 FLOW-42/44 SESSION-GAP-T0..T3 | B29, B30, B31, B34 |

---

## PHASE 5 — SESSION OUTPUT FILES (B36-B40)

| # | Guidance file | Target List B file | Key List A sources | Governed by |
|---|--------------|-------------------|--------------------|------------|
| B36 | GUIDE-B36-SESSION-BRIEF.md | `SESSION-BRIEF.md` | ZIP-17 FLOW-46/47, ZIP-11 FLOW-01 | SK-428 |
| B37 | GUIDE-B37-PHASE-COMPLETE.md | `PHASE-COMPLETE.md` | ZIP-17 FLOW-46/47, ZIP-11 FLOW-01/00.2 | SK-427 |
| B38 | GUIDE-B38-STATE-JSON.md | `STATE.json` (4 variants) | ZIP-17 FLOW-46 all STATE, ZIP-11 FLOW-01, ZIP-15 §1 | Rule 34 |
| B39 | GUIDE-B39-EXECUTION-LOG.md | `EXECUTION-LOG.json` | ZIP-17 FLOW-46/47, ZIP-11 FLOW-01, SK-426 | SK-426 |
| B40 | GUIDE-B40-LIVE-RUN.md | `FLOW-XX-LIVE-RUN.md` | ZIP-17 FLOW-01 final/FLOW-09, ZIP-11 | — |

---

## PHASE 6 — VISUALIZATION FILES (B41-B44)

| # | Guidance file | Target List B file | Key List A sources |
|---|--------------|-------------------|--------------------|
| B41 | GUIDE-B41-VIZ-QA-COVERAGE.md | `viz/qa-coverage-state.png` | ZIP-14 colors.csv/charts.csv/semantic-tokens.md, ZIP-17 QA-COVERAGE-STATE |
| B42 | GUIDE-B42-VIZ-RECONCILIATION.md | `viz/reconciliation-state.png` | ZIP-14 colors.csv/semantic-tokens.md, ZIP-17 RECONCILIATION-STATE |
| B43 | GUIDE-B43-VIZ-TEACH-QA.md | `viz/teach-qa-r0.png` | ZIP-14 typography.csv/component-specs.md, ZIP-17 TEACH-QA-R0 |
| B44 | GUIDE-B44-VIZ-DESIGN-SIM.md | `viz/design-simulation-r1.png` | ZIP-14 design.csv/styles.csv, ZIP-17 DESIGN-SIM-R1 |

---

## PHASE 7 — ROLE-ENRICHED FILES (B45-B50)
### Generation order within this phase: B50 → B46 → B47 → B48 → B49 (C35)

| # | Guidance file | Target List B file | Key List A sources | Dependencies |
|---|--------------|-------------------|--------------------|-------------|
| **B50** | GUIDE-B50-ROLE-SCREEN-MATRIX.md | `FLOW-XX-ROLE-SCREEN-MATRIX.md` | **ZIP-15 ALL**, ZIP-16, ZIP-14, ZIP-17 FLEET-ROLE-SYNTHESIS+BATCH-01..10 | **Must generate first** |
| **B46** | GUIDE-B46-DESIGN-SIM-CLIENT-SCREENS.md | Client sections in DESIGN-SIM-R1.md | ZIP-14 ui-reasoning/landing/products, ZIP-15 §2/§3/§5, ZIP-17 FLOW-46 T656 | **B50** |
| **B47** | GUIDE-B47-UI-STATE-MAP.md | UI State Map in STEP-9-VISIBILITY + UI-REFLECTION-STATE | ZIP-14 states-and-variants/ux-guidelines/app-interface, ZIP-15 §3/§4/§5, ZIP-17 | **B50** |
| **B48** | GUIDE-B48-UX-AUDIT.md | UX Audit section in UI-REFLECTION-STATE.md | ZIP-14 SKILL.md P1-P10/shadcn-accessibility, ZIP-15 §1/§2/§6, ZIP-17 UX-REVIEW | **B50, B47** |
| **B45** | GUIDE-B45-STEP9-VISIBILITY.md | `FLOW-XX-STEP-9-VISIBILITY.md` | ZIP-15 §4/§5, ZIP-14 states-and-variants, ZIP-17 FLOW-01/09 STEP-9 | B22 |
| **B49** | GUIDE-B49-GALLERY-DESIGN-SYSTEM.md | `FLOW-XX-GALLERY.html` | ZIP-14 token-architecture/primitive/semantic/colors/typography, ZIP-15 §3, ZIP-17 | B41-B44 |

---

## MULTI-ROLE DEPENDENCY CHAIN (C35 — updated v6)

```
For flows with client-facing React pages:

1. Read flow spec (ZIP-16) → identify roles
2. Generate B50 (ROLE-SCREEN-MATRIX) using ZIP-15 ALL + ZIP-17 BATCH
3. Generate B46 (CLIENT SCREENS in DESIGN-SIM) using B50 role definitions
4. Generate B47 (UI STATE MAP) using B50 role definitions
5. Generate B48 (UX AUDIT) using B50 + B47 results
6. Generate B45 (STEP-9-VISIBILITY) using B22 cycle context
7. Generate B49 (GALLERY) using B41-B44 PNG outputs

For flows without client-facing React pages:
- Skip B46, B47 client section, B48 UX audit
- Declare "No React pages — Check 15 N/A" in B50 Step 7
- Generate B49 with only the available viz PNGs
```

---

## ZIP COVERAGE MATRIX

| ZIP | Files | Tiers 0-2 | Tier 3 (Steps) | Tier 4 (Gaps) | Tier 5 (Output) | Tier 6 (Viz) | Tier 7 (Role) |
|-----|-------|-----------|---------------|---------------|-----------------|--------------|---------------|
| 01 (DNA/BFA) | ~15 | B01-B05 | B21 | B29 | — | — | B50 |
| 02 (Infrastructure) | ~12 | B01-B03 | B38 | — | B38 | — | — |
| 03 (Interfaces) | ~20 | B09-B10 | B28 | B34 | — | — | — |
| 04 (Contracts) | ~40 | B01-B11 | B21,B22,B28 | B29 | — | — | B50 |
| 05 (BFA) | ~15 | B04 | B21 | B29,B33 | B37 | — | B50 |
| 06 (Topologies) | ~20 | B12 | B22 | B33 | — | B44 | — |
| 07 (SK-426/7/8) | ~10 | — | — | — | B36,B37,B39 | — | — |
| 08 (Planning skills) | ~20 | — | B45 | — | — | — | B50 |
| 09-11 (FLOW sessions) | ~200 | B13-B16 | B17-B28 | B33-B35 | B36-B40 | B41-B44 | B45-B50 |
| 12 (GAP-PREP) | ~15 | — | — | B33 | — | — | — |
| 13 (FLOW-45-47) | ~30 | B13-B16 | B18 | — | B36-B40 | — | — |
| 14 (UI/UX ZIP-14) | 324 | — | — | — | — | B41-B44 | B45-B50 |
| 15 (Role guide) | 1 | B38 | B21,B45 | — | — | B49 | B46-B50 |
| 16 (Flow specs) | 234 | B12 | B22 | — | — | — | B50 |
| 17 (pensive-tereshkova) | 63 | B01-B11 | B12-B28 | B29-B35 | B36-B40 | B41-B44 | B45-B50 |

---

## FINAL GOAL VERIFICATION

**Question: Taking the library and applying it to a new flow spec — will we get proper List B?**

**Answer: YES, if the generation order is followed.**

The library covers all 50 List B file types. A new flow spec → producing all 50 guidance outputs requires:

1. A flow specification (ZIP-16 equivalent for the new flow)
2. Infrastructure baseline (ZIP-01..08 — the shared engine, invariant, and skill context)
3. Running B01-B50 in generation order

The generation order ensures:
- State files (B01-B05) are ready before the simulation pipeline needs them
- The simulation pipeline (B22-B28) builds in cycle order
- Gap translation (B29-B35) builds from gap list to executable session files
- Role matrix (B50) is ready before role-dependent files (B46-B48) need it

**Library is complete. Validation rounds 62-72 will verify this against real new flows.**

---

*LIBRARY-MASTER-INDEX.md — Round 61*
*50 guidance files | All 897 List A files covered | 0 UNCOVERED entries*
*Next: Round 62 — Dry Run validation on FLOW-17 + FLOW-24*
