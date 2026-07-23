---
name: flow-restructure
sk_number: SK-447
version: "1.0.0"
priority: IMPORTANT
author: luba
updated: "2026-03-24"
description: >
  Method for restructuring an existing flow plan: delta-first analysis that
  preserves what is already correct before modifying anything, then produces
  a split session file set matched to branching depth and context loss risk.
  Complements flow-examination (which creates plans from scratch).
  flow-restructure takes an existing plan and produces delta analysis + split
  session files. The key distinction: restructure is delta-first, examination
  is creation-first.
triggers:
  - "restructure the flow"
  - "update the session files"
  - "split the plan"
  - "revise FLOW-XX plan"
  - "update the architecture"
  - "plan has changed"
  - "delta analysis"
  - "what changed vs what stays"
---

# flow-restructure

## Purpose

Takes an existing SESSION-FLOW-XX-MASTER.md or plan document and produces:
1. A delta analysis (WHAT DOES NOT CHANGE + WHAT CHANGES)
2. A restructured architecture document naming all new session files
3. Split session files matched to branching depth and context loss risk

The complementary skill is **flow-examination**, which creates plans from scratch.
This skill updates them. The difference: examination produces, restructure preserves-then-modifies.

---

## Relation to flow-examination

| | flow-examination | flow-restructure |
|--|--|--|
| Input | Reference plan (new flow) | Existing session files (already examined flow) |
| First action | Extract everything from reference plan | Read existing plan in full, identify delta |
| Output | SESSION-FLOW-XX-MASTER.md (one file) | Architecture doc + split session files (N files) |
| Key principle | Completeness — capture all 34 extraction items | Delta-first — preserve correct before modifying |

---

## Step 1 — Read the entire existing plan before writing anything

Read the full existing SESSION-FLOW-XX-MASTER.md or equivalent plan document.
For long documents, explicitly request the truncated sections before forming any conclusions.

**Do NOT:**
- Make judgments about Phase D/E before reading lines covering those phases
- Start writing until the full document is read
- Assume the first section represents the whole

---

## Step 2 — Delta analysis: write WHAT DOES NOT CHANGE first

Before identifying what changes, produce the explicit "WHAT DOES NOT CHANGE" list:
- Score bracket tree and scoring weights
- Fixture file count and seeding sequence
- DPO triple format and capture mechanism
- Behavioral test patterns (pass criteria per node)
- Confirmed-correct phase gates

**Why this order matters:** writing the stable list first prevents the natural drift toward
"improving" things that were already correct. The changes list is written second, after
the stable baseline is confirmed.

The changes list then identifies additions/modifications tied to specific infrastructure
flows or gap resolutions (e.g., FLOW-37A for gap scan, FLOW-38E for calibration).

---

## Step 3 — Session split: match split boundary to branching depth + context loss risk

**High branching = own session file.**

Phase B gets its own session file when it can span multiple generation cycles per task type
(e.g., 3 task types × 3 possible cycles = 9 possible generation calls). Context that compacts
mid-Phase B cannot reconstruct which runs scored what, what was patched, what bracket
decisions were made.

**Decision rule for session boundaries:**

| Condition | Action |
|-----------|--------|
| Phase can span N×M branching calls where M>2 | Own session file |
| Phase is linear but has substantial new pre-steps | Own session file |
| Phase is conditional (short path if previous passes) | Combine with adjacent phase |
| Phase has clear boundary but not branching depth | Can combine in one file |

**Example split for FLOW-01:**
- `SESSION-FLOW-01-A.md` — Phase A (linear, but new pre-steps: gap scan, calibration, V9 baseline)
- `SESSION-FLOW-01-B.md` — Phase B (own file: 3 task types × 3 cycles = 9 possible generation calls)
- `SESSION-FLOW-01-CDEF.md` — Phases C/D/E/F (C is conditional-short; D/E/F have clear boundaries, no branching depth)

---

## Step 4 — Produce architecture document BEFORE writing session files

`FLOW-XX-RESTRUCTURED-ARCHITECTURE.md` names all session files and their scope
before any session file is written.

Contents:
- Table: session file → phase(s) → scope description
- What changed from previous architecture
- What is preserved unchanged
- Session count and estimated effort

**Why first:** Without the architecture document, session files are written without knowing
what the overall set looks like. The architecture doc is the map; session files are the territory.

---

## Step 5 — Session file template

Every session file:

**Opens with:**
```
## Cold Start Check
Read STATE.json. Verify:
- status: [expected status]
- [key fields that must be set before this phase]
If any field is missing: STOP, do not proceed until resolved.
```

**Closes with:**
```
## Phase Completion Package
Produce 3 output files:
1. EXECUTION-LOG-[PHASE].json — exact numbers: test delta, files, costs, run IDs, scores
2. PHASE-COMPLETE-[PHASE].md — prose summary for Luba: gate table, ⛔ STOP
3. SESSION-BRIEF-[PHASE].md — cold-start doc for next session: 4 required items below

⛔ STOP — await Luba approval before next phase.
```

**SESSION-BRIEF must contain these 4 items:**
1. What to check in STATE.json at the start of the next session
2. The exact filename of the next session file
3. Key facts needed for cold start (scores, run IDs, patch versions, etc.)
4. One-sentence description of what the next phase does

---

## Step 6 — Cross-reference with flow-examination skill

The restructured session files must pass the same infrastructure gate checks that
**flow-examination** defines (7 guards):
1. FLOW-NN prerequisites ACTIVE
2. ES indices present (12 pre-FLOW-01 + flow-specific)
3. Named check registry loaded (GAP-NEW-35/77)
4. GenericNodeExecutor capabilities for this flow's entry types
5. PromptLibraryStation 3-tier resolution
6. FlowStateSnapshot write/read path
7. PromptOps loop active in feedback.handler

Any guard that fails is a BLOCKER — add to Phase A pre-steps.

---

## Hard Rules

- NEVER skip the delta analysis — start with what does NOT change
- NEVER write session files before the architecture document
- NEVER combine Phase B with other phases when task count ≥ 3 (branching depth)
- NEVER omit the cold-start STATE.json check from the opening of any session file
- NEVER omit SESSION-BRIEF from the closing of any session file
