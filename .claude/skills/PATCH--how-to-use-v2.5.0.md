# PATCH: HOW-TO-USE-SKILLS → v2.5.0
## Date: 2026-03-26
## Applies to: HOW-TO-USE-SKILLS-v2.4.0.md → produces v2.5.0

---

## HEADER UPDATE

Replace:
  # HOW TO USE XIIGEN SKILLS — v2.4.0
  ## Supersedes: v2.3.0 (2026-03-26)
  ## What changed: Added 3 session-setup skills (SK-458..SK-460) ...

With:
  # HOW TO USE XIIGEN SKILLS — v2.5.0
  ## Supersedes: v2.4.0 (2026-03-26)
  ## What changed: Added 7 flow-planning + capability-audit skills (SK-461..SK-467)

---

## ADDITION: 5 new rows in SKILL ACTIVATION TRIGGERS — Flow design table

Add after the existing `planning--wave-assignment-SKILL.md` row:

| When | Load |
|------|------|
| **Before writing session files for any new flow** | **`planning--difficulty-prediction-SKILL.md` (SK-461)** ← NEW v2.5.0 |
| **After SK-461 — before Phase B section design** | **`planning--adaptation-map-SKILL.md` (SK-462)** ← NEW v2.5.0 |
| **During Phase F session file authoring** | **`planning--cross-flow-dependency-design-SKILL.md` (SK-463)** ← NEW v2.5.0 |
| **After last sequential flow ACTIVE, before Wave 2** | **`planning--flow-retrospective-SKILL.md` (SK-464)** ← NEW v2.5.0 |

Add to Investigation and analysis table:

| When | Load |
|------|------|
| **Start of any capability audit session** | **`code-execution--capability-measurement-SKILL.md` (SK-465)** ← NEW v2.5.0 |
| **After SK-465 — audit learning signals specifically** | **`code-execution--learning-path-audit-SKILL.md` (SK-467)** ← NEW v2.5.0 |
| **After SK-432 root-cause output — translate to session plan** | **`planning--remediation-session-design-SKILL.md` (SK-466)** ← NEW v2.5.0 |

---

## ADDITION: Planning pipeline additions

In THE PLANNING PIPELINE — STEP ORDER, after step ⓪.5b (wave-assignment), add:

```
⓪.5c   difficulty-prediction (SK-461)   ← NEW — cycle budgets before session files
⓪.5d   adaptation-map (SK-462)          ← NEW — expected failure modes per archetype
```

After the Gate C block, add:

```
Phase F → cross-flow-dependency-design (SK-463)  ← NEW — design event registration
```

After the ANALYSIS PIPELINE block, add:

```
RETROSPECTIVE PIPELINE (after last sequential flow, before Wave 2):
①  flow-retrospective (SK-464)    measure 4 dimensions vs predictions
②  R-1 calibration adjustments    update SK-461 if MAE > 1.0
③  wave2ClearToProceed = true     gate before Wave 2 pre-allocation

CAPABILITY AUDIT PIPELINE:
①  capability-measurement (SK-465)   static code score + paired runtime checks
②  learning-path-audit (SK-467)      5 signal types: fires? complete? corruption class?
③  remediation-session-design (SK-466) SK-432 root causes → ordered session plan
```

---

## ADDITION: WHAT CHANGED IN v2.5.0 section

Add before "WHAT CHANGED IN v2.4.0":

## WHAT CHANGED IN v2.5.0

Source: PHASE-THREE-PREPARATION-GUIDE analysis + codebase gap measurement session (2026-03-26)

| Change | What it adds |
|--------|-------------|
| NEW SK-461 | difficulty-prediction: cycle budget formula with clarity discount (T64=1 not 2) |
| NEW SK-462 | adaptation-map: per-archetype expected failure modes + score bracket → action |
| NEW SK-463 | cross-flow-dependency-design: POINT_TO_POINT vs WAVE_GATE rule + BUG-3 fix |
| NEW SK-464 | flow-retrospective: R-1 measurement + calibration + wave2ClearToProceed gate |
| NEW SK-465 | capability-measurement: static code score + paired runtime checks for 22 capabilities |
| NEW SK-466 | remediation-session-design: SK-432 output → ordered session plan (3 steps, not 5) |
| NEW SK-467 | learning-path-audit: 5 signal types audited; "generating but not learning" verdict |

**SK number collision resolved:**
Doc transcripts from other sessions assigned SK-458/459/460 to capability-measurement,
remediation-session-design, and learning-path-audit. This session's SK-458/459/460 are
session-setup skills (prerequisite-chain, session-state-crystallization, session-scope-resolution).
The capability/remediation/learning-audit skills are renumbered to SK-465/466/467 to avoid collision.

---

## ADDITION: WHAT EACH SKILL PREVENTS table (v2.5.0 rows)

Add to existing table:

| Skill | What it prevents |
|-------|-----------------|
| difficulty-prediction (SK-461) | T51=2 instead of 3; T64=2 instead of 1; empty STATE.json taskTypeCycleBudgets (BUG-4); Wave 2 on wrong calibration |
| adaptation-map (SK-462) | Phase B starting blind; score-0 escalated prematurely (T65 cycle 1); wrong remediation action per bracket |
| cross-flow-dependency-design (SK-463) | BUG-3 (3-event pattern misapplied to FLOW-02); broken Wave 2 dependency graph |
| flow-retrospective (SK-464) | Wave 2 running on stale calibration; 6 parallel flows compounding wrong cycle budgets |
| capability-measurement (SK-465) | Re-deriving inspection methodology per audit; missing "wired but not triggering" failure class |
| remediation-session-design (SK-466) | Inconsistent blast-radius isolation; wrong session type assignments; 20-session plan instead of 4 |
| learning-path-audit (SK-467) | "Generating but not learning" verdict missed; 80 triples all corrupted undetected; graduation date permanently unknown |

---

## ADDITION: FILE INVENTORY — v2.5.0 additions

Add to FILE INVENTORY:

**New in v2.5.0 (7 skills):**
- `planning--difficulty-prediction-SKILL.md` (SK-461)
- `planning--adaptation-map-SKILL.md` (SK-462)
- `planning--cross-flow-dependency-design-SKILL.md` (SK-463)
- `planning--flow-retrospective-SKILL.md` (SK-464)
- `code-execution--capability-measurement-SKILL.md` (SK-465)
- `planning--remediation-session-design-SKILL.md` (SK-466)
- `code-execution--learning-path-audit-SKILL.md` (SK-467)

Update: **Next available SK number: SK-468**
