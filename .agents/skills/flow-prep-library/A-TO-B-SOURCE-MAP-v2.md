# A-TO-B-SOURCE-MAP-v2.md
## All 50 List B Types Mapped to All 17 List A Sources (Including ZIP-17)
## FLOW-48 Registration | C30+C38 Split Updated
## FLOW-PREP-LIBRARY v6.1-FINAL — Round 72 (FINAL) | Phase 9
## Date: 2026-04-20

---

## FINAL GOAL (verbatim — the last time this is re-read):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

**This is the final round. The library is complete.**

---

## WHAT CHANGED FROM v1 (Round 10) → v2 (Round 72)

| Change | v1 | v2 |
|--------|----|----|
| ZIP count | 16 ZIPs (ZIP-01..16) | **17 ZIPs (ZIP-01..17)** |
| Total List A files | 834 | **897** (+63 ZIP-17 files) |
| Flow count | 47 flows | **48 flows** (+FLOW-48 i18n-translation) |
| Source split | C30 (FLOW-01..34 = ZIP-16; FLOW-35..47 = ZIP-09/10/13) | **C30 + C38** (adds: FLOW-48 = ZIP-17 BATCH-10) |
| ZIP-17 rows | Not present | **Added to: B-17, B-35, B-46, B-47, B-48, B-50** |
| FLOW-48 registration | Not present | **Cluster 1 universal, slug `i18n-translation`, ZIP-17 source** |

---

## ZIP DIRECTORY — 17 SOURCES (897 files total)

| ZIP | Physical file | Files | Key contents for library |
|-----|--------------|-------|--------------------------|
| ZIP-01 | `xiigen start session files.zip` | 35 | Governance stack v30: SESSION-LOAD-PLAN, HOW-TO-USE v4.4.0, AUTHORING-GUIDE v1.15, CODE-REVIEW-PROTOCOL v1.7, SK-539, FC-18 |
| ZIP-02 | `flow-lib.zip` | 8 | Flow planning library: LIBRARY-1..7 |
| ZIP-03 | `FLOW-PREP-R0.zip` | 2 | FLOW-PREP-MASTER-PLAN, SESSION-R0-PRECHECK |
| ZIP-04 | `SIMULATION-R0.zip` | 2 | Design simulation master plan + R0 template |
| ZIP-05 | `GAP-PREP-PROCESS-R0.zip` | 10 | Gap prep sessions R0-R7 |
| ZIP-06 | `GAP-TRANSLATE-PROCESS-R0.zip` | 5 | Gap translation T0-T3 templates |
| ZIP-07 | `HISTORY-RAG-INTEGRATION-DESIGN-I1.zip` | 4 | History RAG design I1-I4 |
| ZIP-08 | `R2-hist-rag-patterns-fixtures.zip` | 61 | Architecture + flow-design RAG fixtures |
| ZIP-09 | `R3-hist-dr-fixtures.zip` | 59 | Design-reasoning + engine history fixtures |
| ZIP-10 | `R4a-hist-perflow-fixtures.zip` | 12 | Per-flow D-HIST locked decisions (FLOW-01/03/04) |
| ZIP-11 | `R4b-hist-taxonomy-fixtures.zip` | 53 | Taxonomy fixtures |
| ZIP-12 | `R-BatchL-fixtures.zip` | 16 | Batch-L fixtures |
| ZIP-13 | *(within ZIP-01..12)* | — | Additional fixtures |
| ZIP-14 | `ui-ux-pro-max-skill-main.zip` | 324 | UI/UX Pro-Max 324 files |
| ZIP-15 | `FLOW-PREP-LIBRARY-MASTER-PLAN.zip` | 1 | XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md |
| ZIP-16 | `business_flows.zip` | 234 | Business flow specs FLOW-01..34 |
| **ZIP-17** | `xiigen-mvp-claude-pensive-tereshkova-baf347.zip` | **66** | ROLE-ANALYSIS-BATCH-01..10 (48 flows), FLEET-ROLE-SYNTHESIS, FLEET-VALIDATION v1-v3, UX-REVIEW-ROLLUP, 48× per-flow UX-REVIEW.md |
| **TOTAL** | | **897** | |

---

## FLOW-48 REGISTRATION

**Flow-48 is now a registered flow requiring List B files.**

| Property | Value |
|---------|-------|
| Flow number | FLOW-48 |
| Flow name | i18n Translation |
| Slug | `i18n-translation` |
| Primary List A source | **ZIP-17 ROLE-ANALYSIS-BATCH-10** (not ZIP-16 — no business spec file in ZIP-16) |
| Cluster | **1 — Universal-persona** (all 10 personas active) |
| Cell count | 8 full ✅ + 2 partial ⚠️ = 10 cells |
| Tests | 12/12 Playwright i18n-translation.spec.ts passing |
| Evidence | ZIP-17 FLEET-ROLE-SYNTHESIS §Cluster 1; BATCH-10 §FLOW-48; FLEET-VALIDATION §Gates |
| Key implication | Every guidance file must handle 10-role scenario as real test case (not hypothetical) |

**Confirmed in R65 final goal test:** All 50 guidance files rated SELF-SUFFICIENT against FLOW-48.

---

## FLOW SOURCE SPLIT — C30 + C38

```
C30 SPLIT (FLOW-01..34):
  Primary spec = ZIP-16 {NN}-{slug}.md
  Example: ZIP-16 "17-freelancer-marketplace.md" for FLOW-17

C30 EXCEPTION — FLOW-35..47:
  Primary spec = List B CURRENT-STATE.json + DESIGN-SIMULATION-R1.md
               + ZIP-08/09 hist_arch/hist_fd fixtures

C38 NEW (FLOW-48):
  Primary spec = ZIP-17 ROLE-ANALYSIS-BATCH-10 §FLOW-48
  Reason: FLOW-48 (i18n-translation) has no business spec in ZIP-16 —
  it was registered after ZIP-16 was compiled.
  Source for all FLOW-48 guidance file generation:
    ZIP-17: ROLE-ANALYSIS-BATCH-10.md (role cells, template implications)
    ZIP-17: FLEET-ROLE-SYNTHESIS.md (Cluster 1 classification)
    Existing session files: FLOW-48-DESIGN-SIMULATION-R1.md (45KB),
      FLOW-48-IMPLEMENTATION-PLAN-v1.md (30KB), FLOW-48-TEACH-QA-R0.md (17KB)
```

---

## A-TO-B SOURCE MAP — ALL 50 ROWS (v2)

**Legend:** P=PRIMARY | R=REFERENCE | S=STRUCTURE | F=FIXTURE | E=EVIDENCE

---

### PHASE 0 — Universal State Files (B-01..B-05)

| B-type | ZIP-01 | ZIP-02 | ZIP-03 | ZIP-09 | ZIP-11 | ZIP-14 | ZIP-16 | **ZIP-17** |
|--------|--------|--------|--------|--------|--------|--------|--------|-----------|
| B-01 CURRENT-STATE.json | P+S | R | — | — | F | — | R | — |
| B-02 IMPL-STATE.json | P+S | P | — | — | F | — | R | — |
| B-03 PLAN-STATE.json | P+S | — | P | — | F | — | — | — |
| B-04 QA-COVERAGE-STATE.json | P+S | — | — | — | F | R | — | — |
| B-05 QA-COVERAGE-STATE.md | P+S | — | — | — | F | — | — | — |

---

### PHASE 1 — Design & Simulation Docs (B-06..B-11)

| B-type | ZIP-01 | ZIP-02 | ZIP-08 | ZIP-09 | ZIP-11 | ZIP-14 | ZIP-15 | ZIP-16 | **ZIP-17** |
|--------|--------|--------|--------|--------|--------|--------|--------|--------|-----------|
| B-06 RECONCILIATION-STATE.md | P+S | — | — | F | F | — | — | R | R |
| B-07 RAG.md | P+S | P | P+F | F | F | — | R (§2 ACL) | R | — |
| B-08 GALLERY.html | P+S | — | — | — | F | P | R (§3) | — | — |
| B-09 UI-REFLECTION-STATE.json | P+S | — | — | — | F | R | R (§1) | — | R |
| B-10 UI-REFLECTION-STATE.md | P+S | — | — | — | F | P | R (§1) | — | **E** |
| B-11 FLOW-UI-AUTOMATION.json | P+S | — | — | — | F | P | — | — | — |

---

### PHASE 2 — Design Simulation + Session (B-12..B-16)

| B-type | ZIP-01 | ZIP-02 | ZIP-04 | ZIP-08 | ZIP-11 | ZIP-14 | ZIP-15 | ZIP-16 | **ZIP-17** |
|--------|--------|--------|--------|--------|--------|--------|--------|--------|-----------|
| B-12 DESIGN-SIMULATION-R1.md | P+S | P | P | F | F | P | P (§2/5/6) | P | **F+E** |
| B-13 SESSION-SIM-RN family | P+S | — | — | — | F | — | — | R | — |
| B-14 R0-PRECHECK | P+S | — | P | — | F | — | — | — | — |
| B-15 R1-STATE-INIT | P+S | — | — | — | F | — | — | — | — |
| B-16 SESSION-RN-LABELS | P+S | — | — | — | F | — | — | — | — |

---

### PHASE 3 — Implementation Plan + Steps 1-10 (B-17..B-28)

| B-type | ZIP-01 | ZIP-02 | ZIP-03 | ZIP-11 | ZIP-14 | ZIP-15 | ZIP-16 | **ZIP-17** |
|--------|--------|--------|--------|--------|--------|--------|--------|-----------|
| **B-17 IMPL-PLAN** | P+S | P | P | F | P (nextjs) | P (§4) | P | **E (FP-3)** |
| B-18 TEACH-QA-R0 | P+S | P | — | F | — | — | R | — |
| B-19 TEACH-QA-R1-FINAL | P+S | P | — | F | — | — | — | — |
| B-20 STEP-10-CHAIN-REVIEW | P+S | P | P | F | — | — | — | — |
| B-21 STEP-1-INVARIANTS | P+S | — | P | F | P | P (§1) | P | — |
| B-22 STEP-2-CYCLE1-CONTEXT | P+S | — | — | F | — | — | P | — |
| B-23 STEP-3-CYCLE1-TEST | P+S | — | — | F | — | — | — | — |
| B-24 STEP-4-CYCLE2-TEMPLATE | P+S | P | — | F | — | — | — | — |
| B-25 STEP-5-CYCLE2-TEST | P+S | P | — | F | — | — | — | — |
| B-26 STEP-6-CYCLE3-CONTEXT | P+S | P | — | F | — | — | — | — |
| B-27 STEP-7-CYCLE3-TEST | P+S | P | — | F | — | — | — | — |
| B-28 STEP-8-HANDOFF-CONTRACT | P+S | P | — | F | — | P (§4) | — | — |

---

### PHASE 4 — Gap Translation System (B-29..B-35)

| B-type | ZIP-01 | ZIP-05 | ZIP-06 | ZIP-09 | ZIP-11 | ZIP-14 | ZIP-16 | **ZIP-17** |
|--------|--------|--------|--------|--------|--------|--------|--------|-----------|
| B-29 ENGINE-GAP-LIST | P+S | P | — | F | F | — | R | — |
| B-30 GAP-REGISTRY.json | P+S | P | — | F | F | — | — | — |
| B-31 GAPS-MASTER-PLAN | P+S | P | P | F | F | — | R | — |
| B-32 BLOCK-PLAN.json | P+S | — | P | — | F | — | — | — |
| B-33 SESSION-GAP-PREP-RN | P+S | P | — | F | F | — | — | — |
| B-34 SESSION-GAP-R | P+S | P | P | F | F | — | — | — |
| **B-35 SESSION-GAP-T** | P+S | — | P | F | F | — | — | **F** |

---

### PHASE 5 — Session Output Files (B-36..B-40)

| B-type | ZIP-01 | ZIP-02 | ZIP-11 | ZIP-14 | ZIP-15 | ZIP-16 | **ZIP-17** |
|--------|--------|--------|--------|--------|--------|--------|-----------|
| B-36 SESSION-BRIEF | P+S | — | F | — | — | R | R |
| B-37 PHASE-COMPLETE | P+S | P | F | — | — | — | R |
| B-38 STATE.json | P+S | P | F | — | P (§1) | R | R |
| B-39 EXECUTION-LOG | P+S | P | F | — | — | — | R |
| B-40 LIVE-RUN | P+S | — | F | — | — | — | R |

---

### PHASE 6 — Visualization Files (B-41..B-44)

| B-type | ZIP-01 | ZIP-09 | ZIP-11 | ZIP-14 | ZIP-15 | ZIP-16 | **ZIP-17** |
|--------|--------|--------|--------|--------|--------|--------|-----------|
| B-41 viz/qa-coverage-state.png | — | — | F | P (colors, charts) | — | — | F |
| B-42 viz/reconciliation-state.png | — | — | F | P (colors) | — | — | F |
| B-43 viz/teach-qa-r0.png | — | — | F | P (typography) | — | — | F |
| B-44 viz/design-simulation-r1.png | — | — | F | P (design, styles) | — | — | F |

---

### PHASE 7 — Role-Enriched Files (B-45..B-50)

| B-type | ZIP-01 | ZIP-08 | ZIP-11 | ZIP-14 | ZIP-15 | ZIP-16 | **ZIP-17** |
|--------|--------|--------|--------|--------|--------|--------|-----------|
| B-45 STEP-9-VISIBILITY | P+S | — | F | P (states) | P (§4/5) | R | **E (FP-4)** |
| **B-46 CLIENT SCREENS** | P+S | — | F | P (ui-reason) | P (§2/3/5) | P | **E (FP-1)** |
| **B-47 UI STATE MAP** | P+S | — | F | P (states/ux) | P (§3/4/5) | R | **E (FP-2)** |
| **B-48 UX AUDIT** | P+S | — | F | P (SKILL.md) | P (§1/2/6) | R | **E (all FPs)** |
| B-49 GALLERY.html | — | — | F | P (tokens) | P (§3) | R | F |
| **B-50 ROLE-SCREEN-MATRIX** | P+S | — | — | R | P (ALL §) | P | **P (BATCH, SYNTHESIS)** |

---

## ZIP-17 ROW DETAILS

The six B-types that use ZIP-17:

| B-type | ZIP-17 role | Specific files used |
|--------|------------|---------------------|
| B-46 | E (FP-1 evidence) | UX-REVIEW-ROLLUP.md §3; `marketplace/UX-REVIEW.md` (14/14 identical); `freelancer-marketplace/UX-REVIEW.md` |
| B-47 | E (FP-2 evidence) | UX-REVIEW-ROLLUP.md §1 root cause; `bundle-activation/UX-REVIEW.md` (20/25); `transactional-event-participation/UX-REVIEW.md` (18/32) |
| B-48 | E (all FPs) | UX-REVIEW-ROLLUP.md (all sections); FLEET-VALIDATION-v1.md §5 (7 ranked findings); all 48 per-flow UX-REVIEW.md files |
| B-50 | P (BATCH + SYNTHESIS) | ROLE-ANALYSIS-BATCH-01..10 (cell status for all 48 flows); FLEET-ROLE-SYNTHESIS.md (10-persona model, 5 clusters); RUN-01-FINAL-BATCH-5-RECON.md (rollout priority tiers) |
| B-17 | E (FP-3 evidence) | UX-REVIEW-ROLLUP.md (29/47 flows 🚫 = Phase 7 absent); FLEET-VALIDATION-v1.md |
| B-35 | F (fixture examples) | FLOW-42/44 SESSION-GAP-T0..T3 files (gap translation pipeline examples) |

---

## FINAL PLAN EXECUTION SUMMARY

**72 rounds completed across 9 phases:**

| Phase | Rounds | Deliverables |
|-------|--------|-------------|
| 1 — List A Inventory | 1-5 | ZIP-01..16 inventory (834 → 897 with ZIP-17) |
| 2 — List B Catalog | 6-9 | B-01..B-50 file type catalog |
| 3 — Source Map | 10 | A-TO-B-SOURCE-MAP v1 |
| 4 — Guidance Files | 11-60 | GUIDE-B01 through GUIDE-B50 (50 files) |
| 5 — Integration | 61 | LIST-A-COVERAGE-VERIFICATION + LIBRARY-MASTER-INDEX |
| 6 — Validation | 62-65 | 4 dry runs + final goal test (50/50 SELF-SUFFICIENT) |
| 7 — Packaging | 66 | README + GENERATION-ORDER + FINAL-INDEX |
| 8 — ZIP-17 Integration | 67-70 | 4 coverage reports + amendment map |
| 9 — Finalization | 71-72 | Governance stack update + source map v2 |

**Final goal verified:** 50/50 guidance files SELF-SUFFICIENT against FLOW-48 (R65).
**List A coverage:** 897/897 files referenced (0 UNCOVERED).
**Validation score:** 50/50 — exceeds ≥45/50 acceptance threshold.

---

## COMPLETE DOCUMENT LIST — ALL DELIVERABLES

**50 guidance files:** GUIDE-B01..B50 (B01-B12 in round1_22_files, B13-B50 in outputs)

**Phase 5-9 documents:**
1. LIST-A-COVERAGE-VERIFICATION.md
2. LIBRARY-MASTER-INDEX.md
3. VALIDATION-R62-DRY-RUN.md
4. VALIDATION-R63-DRY-RUN.md
5. VALIDATION-R64-AMENDMENTS.md
6. VALIDATION-R65-FINAL-GOAL-TEST.md
7. FLOW-PREP-LIBRARY-README.md
8. LIBRARY-GENERATION-ORDER.md
9. FLOW-PREP-LIBRARY-FINAL-INDEX.md
10. LIST-A-COVERAGE-REPORT-ZIP17.md
11. LIST-A-COVERAGE-REPORT-ZIP17-PART2.md
12. LIST-A-COVERAGE-REPORT-ZIP17-PART3.md
13. A-TO-B-AMENDMENT-MAP-ZIP17.md
14. GOVERNANCE-STACK-UPDATE-v30.md
15. A-TO-B-SOURCE-MAP-v2.md ← **this document (Round 72 final)**

**Total library outputs: 50 guidance + 15 integration documents = 65 files**

---

*A-TO-B-SOURCE-MAP-v2.md — Round 72 of 72 — THE FINAL ROUND*
*FLOW-PREP-LIBRARY v6.1-FINAL — COMPLETE*
*
*50 guidance files | 15 integration documents | 897/897 List A files covered*
*48 flows registered (FLOW-01..48) | FLOW-48 registered as Cluster 1 universal*
*Validated: 50/50 SELF-SUFFICIENT against FLOW-48 (R65)*
*
*"Taking the produced library as a result of this plan run — same size as list B —*
*and applying on new flow specs, we will get proper list B for this flow."*
*✅ ACHIEVED*
