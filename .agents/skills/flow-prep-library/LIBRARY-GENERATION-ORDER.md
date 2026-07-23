# LIBRARY-GENERATION-ORDER.md
## Dependency Chain for FLOW-PREP-LIBRARY v6.1-FINAL
## Round 66 | Date: 2026-04-20

---

## The Central Constraint (C35)

```
B-50 (ROLE-SCREEN-MATRIX) MUST be generated before B-46, B-47, B-48.

B-50 defines which roles exist in the flow and what each role can see.
B-46 (client screens), B-47 (UI state map), and B-48 (UX audit) all need
the role set before they can be authored correctly.

Generating B-46 before B-50 = guessing the role set = C35 violation.
```

---

## Full Dependency Graph

```
INPUT SOURCES
─────────────────────────────────────────────────────────────────────────
ZIP-16 (business spec, FLOW-01..34)
ZIP-09/10/13 (session fixtures, FLOW-35..47)
ZIP-17 BATCH-10 (FLOW-48 role data)
  └─→ GUIDE-B50 (ROLE-SCREEN-MATRIX) ← MUST RUN FIRST in Phase 7
       └─→ GUIDE-B46 (client screens in DESIGN-SIM)
       └─→ GUIDE-B47 (UI state map in STEP-9-VISIBILITY + UI-REFLECTION)
            └─→ GUIDE-B48 (UX audit in UI-REFLECTION)

ZIP-15 (XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE) ─→ B50, B46, B47, B48, B49, B45
ZIP-14 (UI/UX Pro Max library) ─→ B41, B42, B43, B44, B46, B47, B48, B49
ZIP-17 (fleet evidence: UX-REVIEW-ROLLUP, FLEET-VALIDATION, FLEET-ROLE-SYNTHESIS)
  └─→ B46 (FP-1 evidence), B47 (FP-2 evidence), B48 (FP-4 evidence), B50 (cluster data)

Cycle context chain (must follow step order):
  B22 (Cycle 1 context) → B24 (Cycle 2 template) → B26 (Cycle 3 context) → B28 (handoff)
  B22 context package ─→ B45 (STEP-9-VISIBILITY)

Gap translation chain (must follow analysis order):
  B33 (GAP-PREP sessions R0-R8) → B29 (ENGINE-GAP-LIST)
  B29 → B30 (GAP-REGISTRY.json)
  B30 → B31 (GAPS-MASTER-PLAN) + B32 (BLOCK-PLAN.json)
  B31 + B32 → B34 (SESSION-GAP-R files)
  B29 + B30 + B31 + B34 → B35 (SESSION-GAP-T files)

PNG visualization chain:
  Source MD/JSON files → B41 + B42 + B43 + B44 (PNG generators)
  B41 + B42 + B43 + B44 (PNGs exist) → B49 (GALLERY.html)
```

---

## Ordered Generation Steps

```
STEP 1: Read flow spec (ZIP-16 or ZIP-09/10/13 or ZIP-17 BATCH-10)
STEP 2: Read ZIP-15 §1 to identify applicable roles

PHASE 0 — State files (no dependencies)
  Generate: B01 B02 B03 B04 B05

PHASE 1 — Design docs (no dependencies within library)
  Generate: B06 B07 B08 B09 B10 B11

PHASE 2 — Simulation bootstrap (B12 must exist before B13)
  Generate: B12 → B13 B14 B15 B16

PHASE 3 — Steps 1-10 (follow step order strictly)
  Generate: B17 B18 B19 B20 B21
  Generate: B22 → B23
            B22 → B24 → B25
                  B24 → B26 → B27
                        B26 → B28

PHASE 4 — Gap translation (follow analysis order)
  Generate: B33 → B29 → B30 → B31 + B32 → B34 → B35

PHASE 5 — Session outputs (no intra-phase dependency)
  Generate: B36 B37 B38 B39 B40

PHASE 6 — Visualization (requires source docs from Phases 1-3)
  Generate: B41 B42 B43 B44

PHASE 7 — Role-enriched (strict order: B50 FIRST)
  Generate: B50
  Then:     B46 (uses B50 role definitions)
  Then:     B47 (uses B50 role definitions)
  Then:     B48 (uses B50 + B47 results)
  Then:     B45 (uses B22 cycle context)
  Then:     B49 (uses B41-B44 PNGs)
```

---

## Minimum Viable Subset

For flows where only the core simulation pipeline is needed (no UX work yet):

```
MINIMUM: B01 + B03 + B21 + B22 + B28 + B36 + B37
Produces: Invariants → Cycle1 context → Handoff contract → Session brief → Phase complete
```

For flows where role-aware UI work is needed:

```
ROLE-UI: minimum + B50 → B46 → B47
Produces: Role matrix → Client screen specs → UI state map
```

For full fleet documentation:

```
FULL: all 50 files in generation order above
```

---

## Source-to-Guidance Mapping (Condensed)

| Source | Directly feeds |
|--------|---------------|
| ZIP-16 flow spec | B12 (design sim Q0), B22 (cycle1 user intent), B50 (role identification) |
| ZIP-15 §1 role taxonomy | B07, B21, B38, B45, B47, B48, B50 |
| ZIP-15 §2 role strings | B07, B09, B46, B47, B50 |
| ZIP-15 §3 templates | B08, B46, B49, B50 |
| ZIP-15 §4 guard types | B17, B28, B45, B47, B50 |
| ZIP-15 §5 visibility levels | B45, B46, B47, B50 |
| ZIP-15 §6 special categories | B47, B48, B50 |
| ZIP-14 colors.csv | B41, B42, B49 |
| ZIP-14 typography.csv | B43 |
| ZIP-14 design.csv + styles.csv | B44 |
| ZIP-14 SKILL.md (P1-P10) | B48 |
| ZIP-14 token-architecture.md | B49 |
| ZIP-17 UX-REVIEW-ROLLUP | B46 (FP-1), B47 (FP-2), B48 (8-axis rubric) |
| ZIP-17 FLEET-VALIDATION §5 | B48 (5 critical findings) |
| ZIP-17 FLEET-ROLE-SYNTHESIS | B50 (cluster classification, 10-persona model) |
| ZIP-17 ROLE-ANALYSIS-BATCH-01..10 | B50 (cell status per flow) |

---

*LIBRARY-GENERATION-ORDER.md — Round 66 of 72*
