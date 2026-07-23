# FLOW-PREP-LIBRARY — INTERNAL SKILL INDEX
## Version: 1.0.0 | Date: 2026-04-20
## Load this file to understand the complete library structure

---

## WHAT THIS LIBRARY IS

One library that translates any XIIGen flow specification into the complete
set of `docs/sessions/FLOW-XX/` documentation files. 50 guidance files,
each producing one output type. Three external skill wrappers for UI/UX
design quality. One reference registry for all 48 flows.

**Single entry point:** `FLOW-PREP-LIBRARY-SKILL.md`
**Application prompt:** `prompt-to-claude.md`
**Validated:** 50/50 SELF-SUFFICIENT against FLOW-48 (all 10 personas)

---

## SKILL LOAD ORDER

```
Load order   Skill                                   Fires when
───────────  ──────────────────────────────────────  ──────────────────────────────────
5.3          SK-542 flow-ui-examination-protocol     Screen examination/repair sessions
5.4          SK-540 product-design-context           Before first JSX for any flow
Phase 7 §5   SK-541 screen-craft-audit               After PNGs captured, before FC-18
n/a          business-flows-registry (ref doc)        Grammar + CFI lookup, always
10           GUIDE-B01..B50 (guidance files)          On demand per output file needed
```

The three UI/UX skills have a strict sequence:
```
SK-542 (5.3) → SK-540 (5.4) → SK-539 (5.5) → [build] → SK-541 (Phase 7 §5) → FC-18
```

---

## SKILL FILES IN THIS LIBRARY

### Entry Point

| File | Role |
|------|------|
| `FLOW-PREP-LIBRARY-SKILL.md` | Master entry point and how-to-load guide |
| `flow-prep-library--skill.yaml` | Skill registration for the master library |
| `SKILL-INDEX.md` | This file |
| `prompt-to-claude.md` | Copy-paste prompt for applying the library |

### UI/UX Skills (3 skills + 1 reference document)

| File | SK | Load order | Role |
|------|----|------------|------|
| `flow-ui-examination-protocol-SKILL.md` | SK-542 | 5.3 | Session orchestrator for screen work. Loads companion docs, classifies work, routes to SK-540 or SK-541. |
| `flow-ui-examination-protocol--skill.yaml` | SK-542 | 5.3 | YAML registration |
| `planning--product-design-context-SKILL.md` | SK-540 | 5.4 | Pre-JSX gate. Examination record first, then domain exploration → `.impeccable.md` |
| `planning--product-design-context--skill.yaml` | SK-540 | 5.4 | YAML registration |
| `planning--screen-craft-audit-SKILL.md` | SK-541 | Phase 7 §5 | Four-layer PNG audit. Accessibility + AI slop + Nielsen + grammar verification. |
| `planning--screen-craft-audit--skill.yaml` | SK-541 | Phase 7 §5 | YAML registration |
| `planning--business-flows-registry.md` | ref | always | Grammar + CFI lookup for all 48 flows |
| `planning--business-flows-registry--skill.yaml` | ref | always | YAML registration |

### Governance Documents

| File | Version | What it adds |
|------|---------|-------------|
| `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.16.md` | v1.16 | Q8 (WHO/VERB/GRAMMAR before JSX), SCREEN INTENT SERVED completion gate, Rule 35 Screen Intent Anchor, 7-grammar-type table, Phase 7 Steps 1+5 updated |
| `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.8.md` | v1.8 | Q10 (job-to-be-done — examination record as priority-1 source), Mistake 23 (FLOW-36 canonical example), Q10 artifact in handoff |

### 50 Guidance Files (GUIDE-B01..B50)

Phase 0 — Universal State Files:
`GUIDE-B01` CURRENT-STATE.json · `GUIDE-B02` IMPL-STATE.json ·
`GUIDE-B03` PLAN-STATE.json · `GUIDE-B04` QA-COVERAGE-STATE.json ·
`GUIDE-B05` QA-COVERAGE-STATE.md

Phase 1 — Design & Simulation Docs:
`GUIDE-B06` RECONCILIATION-STATE · `GUIDE-B07` RAG.md ·
`GUIDE-B08` GALLERY.html · `GUIDE-B09` UI-REFLECTION-STATE.json ·
`GUIDE-B10` UI-REFLECTION-STATE.md · `GUIDE-B11` FLOW-UI-AUTOMATION.json

Phase 2 — Design Simulation + Session:
`GUIDE-B12` DESIGN-SIMULATION-R1 · `GUIDE-B13` SESSION-SIM-RN ·
`GUIDE-B14` R0-PRECHECK · `GUIDE-B15` R1-STATE-INIT ·
`GUIDE-B16` SESSION-RN-LABELS

Phase 3 — Implementation Plan + Steps 1-10:
`GUIDE-B17` IMPLEMENTATION-PLAN ★ · `GUIDE-B18` TEACH-QA-R0 ·
`GUIDE-B19` TEACH-QA-R1-FINAL · `GUIDE-B20` STEP-10-CHAIN-REVIEW ·
`GUIDE-B21` STEP-1-INVARIANTS · `GUIDE-B22` STEP-2-CYCLE1-CONTEXT ·
`GUIDE-B23` STEP-3-CYCLE1-TEST · `GUIDE-B24` STEP-4-CYCLE2-TEMPLATE ·
`GUIDE-B25` STEP-5-CYCLE2-TEST · `GUIDE-B26` STEP-6-CYCLE3-CONTEXT ·
`GUIDE-B27` STEP-7-CYCLE3-TEST · `GUIDE-B28` STEP-8-HANDOFF-CONTRACT

Phase 4 — Gap Translation:
`GUIDE-B29..B35`

Phase 5 — Session Output Files:
`GUIDE-B36..B40`

Phase 6 — Visualization:
`GUIDE-B41..B44`

Phase 7 — Role-Enriched ★ (B50 MUST run first):
`GUIDE-B50` ROLE-SCREEN-MATRIX ★ · `GUIDE-B46` DESIGN-SIM-CLIENT-SCREENS ·
`GUIDE-B47` UI-STATE-MAP · `GUIDE-B48` UX-AUDIT ·
`GUIDE-B45` STEP-9-VISIBILITY · `GUIDE-B49` GALLERY-DESIGN-SYSTEM

★ = contains critical v1.16 / UI/UX integration changes

### Library Meta Documents

| File | Purpose |
|------|---------|
| `FLOW-PREP-LIBRARY-README.md` | How to use the library; cluster guide; source split; validation summary |
| `LIBRARY-GENERATION-ORDER.md` | Dependency graph; B50-first constraint; minimum viable subsets |
| `FLOW-PREP-LIBRARY-FINAL-INDEX.md` | Complete status ledger; all 50 files marked FINAL |
| `A-TO-B-SOURCE-MAP-v2.md` | 50 rows × 17 ZIP sources; ZIP-17 rows; FLOW-48 source |
| `UIUX-INTEGRATION-ANALYSIS.md` | How the 17 UI/UX resources integrate; three-stage pipeline; 7 grammar types |

---

## KEY RULES

**1. B50 before B46/B47/B48.** The role-screen matrix defines which roles exist.
All three Phase 7 files that follow depend on it. Generating B46 before B50
= C35 violation.

**2. SK-542 before SK-540 before SK-539.** For screen work: orchestrate (5.3),
then design context (5.4), then compliance (5.5).

**3. Examination record is highest authority.** 38 flows already have ground
truth at `docs/screen-examination/{slug}-examination.md`. Read it before
reading any other spec source. WHO/VERB/GRAMMAR extracted from it directly.

**4. CFI-12 halt for FLOW-04/09/34.** These three flows have stale F1 spec
documents. No UI design work until Luba confirms the correct direction.

**5. Grammar drives content.** Declaring G3 CARD_LIST is not aesthetic
preference — it determines what the page's primary content must be. A page
that declares G3 and renders a generic table fails UX-30 (BLOCK).

**6. One finding per run.** Per REPAIR-GUIDANCE Part 8: fix one finding,
commit, capture PNG, then open a new run for the next finding.

---

## VALIDATION RECORD

| Round | Flow tested | Cluster | Result |
|-------|------------|---------|--------|
| R62 | FLOW-17, FLOW-24 | Cluster 2 + minor users | ✅ PASS |
| R63 | FLOW-32, FLOW-20 | Cluster 2 + INTERNAL_ONLY | ✅ PASS |
| R64 | ZIP-15 integration | All clusters | ✅ PASS (G5/G6 amendments) |
| R65 | FLOW-48 | Cluster 1 — all 10 personas | ✅ **50/50 SELF-SUFFICIENT** |

---

*SKILL-INDEX.md — FLOW-PREP-LIBRARY v1.0.0 | 2026-04-20*
*75 files in library | 50 guidance files | 4 skill files | 5 governance/meta docs*
