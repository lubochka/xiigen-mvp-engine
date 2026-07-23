# GUIDE-B31 — How to Produce `FLOW-XX-GAPS-MASTER-PLAN.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 41 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-GAPS-MASTER-PLAN.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the GAPS-MASTER-PLAN guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance, it will
produce a complete GAPS-MASTER-PLAN that sequences every gap fix into numbered rounds,
defines inter-gap dependencies, and specifies the test gate commands that verify the
fixes were applied correctly.

---

## WHAT THIS FILE IS

`FLOW-XX-GAPS-MASTER-PLAN.md` is the **execution sequencer for gap fixes**. It takes
the canonical gap list from the GAP-REGISTRY.json and organizes it into:

1. **Priority blocks** — grouped by when they must be executed relative to sessions
2. **Round table** — one round per gap (or one round per logical group), ordered
3. **Dependency map** — which gaps must complete before which others can start
4. **Test gate** — the exact test commands that verify the entire block passed

**Position in the gap preparation family:**
```
ENGINE-GAP-LIST.md    → what changes are needed (GUIDE-B29)
GAP-REGISTRY.json     → structured record of all gaps (GUIDE-B30)
GAPS-MASTER-PLAN.md   → this file — execution sequence and dependencies
SESSION-GAP-RN.md     → individual session files that implement each fix
```

**Who produces SESSION-GAP-RN.md:** The GAPS-MASTER-PLAN is what Claude Code uses
to author each SESSION-GAP-RN.md file. The round table entries drive session file
authoring — one SESSION-GAP-RN.md per round.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-17 | PRIMARY | `FLOW-10-GAPS-MASTER-PLAN.md` — richest example (23 gaps, 3 blocks, full dependency map with 7 gates, dependency matrix, safe-parallel groups, per-round targeted test commands) |
| ZIP-17 | PRIMARY | `FLOW-07-GAPS-MASTER-PLAN.md` — 26 gaps, 3 blocks, severity color-coded round table, Block 3 for Wave 2 gaps |
| ZIP-12 | PRIMARY | `FLOW-02-GAPS-MASTER-PLAN.md` — earliest format (17 rounds, 3 blocks with Why-blocking and Why-silent-failure tables) |
| ZIP-12 | REFERENCE | `GAP-PREP-MASTER-PLAN.md` (from GAP-PREP-PROCESS-R0.zip) — fixed prompt reminder format for each SESSION-GAP-RN.md, session type = GAP-TRANSLATE-PROCESS |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/last-phase-testing-plan/FLOW-XX-GAPS-MASTER-PLAN.md`

Same `last-phase-testing-plan/` subdirectory as ENGINE-GAP-LIST and GAP-REGISTRY.

---

## THE THREE PRIORITY BLOCKS

Every GAPS-MASTER-PLAN organizes fixes into exactly three blocks:

| Block | When | What goes here |
|-------|------|---------------|
| Block 1 — BEFORE EXECUTE | Before any teaching session starts | CRITICAL and BLOCKING gaps. If any Block 1 gap is not fixed, Phase A cannot start or produces corrupted output. |
| Block 2 — AFTER INITIAL EXECUTION | After first execution run reveals remaining issues | HIGH and SILENT_FAILURE gaps that become visible only after initial session execution. Also PRODUCT_DECISION gaps that need Luba input. |
| Block 3 — WAVE 2 / SUBSEQUENT FLOWS | Before the next flow in sequence | Systemic gaps that affect future flows but not this one; architecture extensions that unlock next-flow capabilities. |

**Block 3 is often empty.** If all gaps are resolved in Block 1 or Block 2, declare:
```
BLOCK 3 — WAVE 2 / SUBSEQUENT FLOWS (0 gaps)
  [none — all FLOW-XX gaps resolved in Block 1 or Block 2]
```

---

## THE DOCUMENT STRUCTURE

```markdown
# FLOW-XX GAPS MASTER PLAN

**Source:** docs/sessions/FLOW-XX/last-phase-testing-plan/FLOW-XX-ENGINE-GAP-LIST.md
**Goal:** Close all N gaps blocking FLOW-XX ([Flow human name]) execution
**Session type:** GAP-TRANSLATE-PROCESS
**Cadence:** One SESSION-GAP-RN.md file per round; execute Block 1 before any FLOW-XX run;
             Block 2 after initial execution; Block 3 empty/in Wave 2
**Generated:** YYYY-MM-DD

---

## FIXED PROMPT REMINDER

Every SESSION-GAP-RN.md produced from this plan MUST open with:

```
You are executing Round N of the FLOW-XX GAP-TRANSLATE-PROCESS.
Gap: <GAP_ID> | Block: <BLOCK> | Severity: <SEVERITY>
This file is self-contained. Do not reference other session files.
Apply only the fix described. Run tests after. Report pass/fail counts.
```

No session file may cross-reference another session file. Each file must state the
problem, the exact files to change, the exact change to make, and the test gate
independently.

---

## PRIORITY BLOCKS

```
BLOCK 1 — FLOW-XX BEFORE EXECUTE (N gaps)
  R0   [GAP-ID]  [LAYER]  [SEVERITY]  [Concise description]
  R1   [GAP-ID]  [LAYER]  [SEVERITY]  [Concise description]
  ...

BLOCK 2 — AFTER INITIAL EXECUTION (N gaps)
  RN   [GAP-ID]  [LAYER]  [SEVERITY]  [Concise description]
  ...

BLOCK 3 — WAVE 2 / SUBSEQUENT FLOWS (N gaps)
  RN   [GAP-ID]  [LAYER]  [SEVERITY]  [Concise description]
  ...

DEFERRED: [gap IDs] or none
```

---

## ROUND TABLE

### Block 1 — FLOW-XX BEFORE EXECUTE

| Round | Gap | Layer | One action | Severity |
|-------|-----|-------|------------|---------|
| R0    | [GAP-ID] | [Layer] | [One sentence — what action is taken] | [Severity] |
...

### Block 2 — After Initial Execution

| Round | Gap | Layer | One action | Severity |
|-------|-----|-------|------------|---------|
| RN    | [GAP-ID] | [Layer] | [One sentence] | [Severity] |
...

### Block 3 — Wave 2 / Subsequent Flows

[table or "none" declaration]

---

## DEPENDENCY MAP

```
READINESS GATES
===============

Gate A — [GAP-ID] must PASS before:
  R[N]  ([GAP-ID])  — [reason this dependency exists]
  ...

DEPENDENCY MATRIX
=================
[GAP-ID1]  → [GAP-ID2], [GAP-ID3]
...

SAFE PARALLEL GROUPS (within Block 1, after gates satisfied)
=============================================================
Start immediately (no dependencies):
  [GAP-IDs with no prerequisites]

After R[N] ([GAP-ID]):
  [GAP-IDs that can now run]
...
```

---

## TEST GATE

After completing ALL Block 1 rounds, run:

```bash
cd server && npx jest --verbose 2>&1 | tail -20
# Expected: >= [N] tests passing, 0 failing
# If any test fails: do NOT proceed to FLOW-XX execution

# Targeted verification after individual rounds:
# R[N]  — cd server && npx jest --testPathPattern="[relevant pattern]"
...
```

---

## SELF-CONTAINMENT RULE

This master plan is self-contained. [Standard self-containment text as in FLOW-10 example.]
```

---

## HOW TO PRODUCE THE FILE (STEP BY STEP)

### Step 1 — Read GAP-REGISTRY.json for the gap inventory

```bash
python3 -c "
import json
with open('FLOW-XX-GAP-REGISTRY.json') as f:
    data = json.load(f)

block1 = [g for g in data['gaps'] if g['block'] == 1]
block2 = [g for g in data['gaps'] if g['block'] == 2]
block3 = [g for g in data['gaps'] if g['block'] == 3] if any(g['block']==3 for g in data['gaps']) else []

print(f'Block 1: {len(block1)} gaps')
print(f'Block 2: {len(block2)} gaps')
print(f'Block 3: {len(block3)} gaps')
print()
for g in sorted(block1, key=lambda x: x['round']):
    print(f'  R{g[\"round\"]:2d}  {g[\"ID\"]:12s}  {g[\"severity_normalized\"]:18s}  {g[\"Description\"][:55]}')
"
```

### Step 2 — Build the PRIORITY BLOCKS section

List all gaps in block order, then within each block in round order. The format:
```
R[round]  [GAP-ID]  [LAYER]  [SEVERITY]  [Concise description — ≤60 chars]
```

The concise description is not the full `Description` from the registry — it's
a ≤60-character summary of what action the round takes (a verb phrase):
- "VERIFY decision-graph fixture applied" (not "Gap: decision graph missing")
- "Add 4 archetype enum values + tierMap entries" (not "archetypes.ts incomplete")
- "Register 8 named checks in validate.handler" (action, not problem statement)

### Step 3 — Build the ROUND TABLE

For each block, produce the round table using data from GAP-REGISTRY.json:
- `Round`: R[gap.round]
- `Gap`: gap.ID
- `Layer`: gap.Layer
- `One action`: A concise imperative sentence describing exactly what the session does
- `Severity`: gap.severity_normalized (or with emoji for FLOW-07 style)

The "One action" column is the most important: it must be so precise that the SESSION-GAP-RN.md author can read only this line and know exactly what to implement, without consulting the ENGINE-GAP-LIST.

### Step 4 — Build the DEPENDENCY MAP

Derive dependencies from gap registry fields:
- `before` field: if "FLOW-XX Block 2", the gap depends on all Block 1 completing
- Domain knowledge: named check gaps depend on contract files existing
- TypeScript interface gaps: implementations depend on interface declarations

**How to identify gate dependencies:**
For each gap, ask: "What must be true before this fix can be applied?"
- If a gap adds code that reads a new TypeScript interface → the interface declaration must be a prior gap
- If a gap verifies that a fixture exists → the fixture creation must be a prior gap
- If a gap adds session file content → no code dependencies (can parallelize)
- If a gap implements a feature that reads a contract field → the contract must exist first

Format gates as named conditions with lists of dependent gaps:
```
Gate A — [first gap] must PASS before:
  R[N]  ([second gap])  — [why: what field or construct it reads from first gap]
```

### Step 5 — Build the TEST GATE section

Derive targeted test patterns from the file paths in gap registry:
- TypeScript changes to `engine-contracts/archetypes.ts` → `--testPathPattern="archetypes|feedback.handler"`
- Changes to `validate.handler.ts` → `--testPathPattern="validate.handler"`
- Changes to `generic-node-executor.ts` → `--testPathPattern="generic-node-executor"`

The Block 1 final gate command is always:
```bash
cd server && npx jest --verbose 2>&1 | tail -20
# Expected: >= [current passing count] tests passing, 0 failing
```

The passing count threshold comes from the server jest baseline in the session load
plan (currently 10,617 tests). If new tests are added by gaps (spec file creation),
the threshold increases by that count.

---

## THE FIXED PROMPT REMINDER — WHY IT EXISTS

Every SESSION-GAP-RN.md must open with the fixed prompt. This is not optional.

**Why:** The session files are executed by Claude Code across potentially many separate
sessions. If a session file says "see the master plan for context" or "as described in
R7", the next session reading that file has no access to prior context. Each session
file must be independently executable — anyone reading SESSION-GAP-R12.md alone must
be able to:

1. Understand what the gap is (problem statement)
2. Know exactly which files to change
3. Know exactly what to add/change (with code blocks)
4. Know how to verify the fix (test gate command)

The fixed prompt opening enforces this: by stating Gap ID, Block, and Severity at the
top, the session file declares its own context without requiring any other document.

The self-containment rule at the bottom of the master plan repeats this as an explicit
reminder for when SESSION-GAP-RN.md files are being authored.

---

## DEPENDENCY MAP: UNIVERSAL PATTERNS

These dependency patterns appear across all flows:

**Pattern 1 — TypeScript interface before implementation:**
Any gap that creates a fabric interface (IXxxService) must precede any gap that
declares a new flow executor that uses that interface.
```
Gate A — X1-1 (IXxxService declaration) must PASS before:
  R[N]  ([executor gap])  — executor injects IXxxService via @Inject token
```

**Pattern 2 — Contract registration before executor dispatch:**
Any gap that registers new task type contracts in ENGINE_CONTRACTS must precede
any gap that modifies GenericNodeExecutor to dispatch to those task types.
```
Gate B — W1-1 (contract files + ENGINE_CONTRACTS) must PASS before:
  R[N]  (executor gaps)  — executor reads contract.moderationPaths / .aggregation / etc.
```

**Pattern 3 — Fixture creation before verification:**
Any gap that creates a new ES index fixture must precede the VERIFY gap that
confirms the fixture was applied by ensureIndex.
```
Gate C — fixture creation must PASS before:
  R[N]  (H-N verify gap)  — verify fixture applied via ensureIndex
```

**Pattern 4 — Extended DPO format before calibration triple:**
Any gap that extends the DPO triple format (adding fields) must precede any
gap that authors a calibration DPO triple using those new fields.
```
Gate G — F1-1 (DPO extended format) must PASS before:
  R[N]  (D1-1 calibration triple)  — triple uses conflictsWith annotation
```

**Pattern 5 — Product decision before implementation:**
Any PRODUCT_DECISION gap must precede any gap that implements the decided feature.
```
Gate F — P1-1_FXX product decision must be made before:
  R[N]  (implementation gap)  — implementation requires knowing the decided strategy
```

---

## KEY RULES

**1. One round per gap — one action per session file.**
The round table and the session files it generates follow the same rule: one gap per
round. The SESSION-GAP-RN.md produced from round R[N] applies exactly one fix.
Exception: "VERIFY" rounds may group 2-3 closely related verification checks.

**2. Block 1 gaps must be fixed before any teaching session starts.**
No FLOW-XX session (Session-A, Session-B, etc.) may start with any Block 1 gap open.
The Block 1 final test gate is the gate that must pass before any session runs.

**3. The self-containment rule is absolute.**
No SESSION-GAP-RN.md produced from this plan may say "see the master plan" or
reference another session file. Every session file is independently executable.

**4. Safe parallel groups identify parallelization opportunities.**
When multiple gaps have no dependencies on each other, they can be implemented
in parallel by different Claude Code sessions or in the same session back-to-back.
Declaring safe parallel groups reduces the critical path length for large gap lists.

**5. Test gate thresholds must be specific.**
"Tests pass" is not a test gate. The gate must state the minimum expected passing
count and confirm 0 failures. The count comes from the project baseline in the
session load plan.

**6. Deferred gaps must be named.**
If any gap was deferred (tagged `advisory_deferred` in the registry), it must be
listed explicitly in the DEFERRED section. "None" is acceptable only if the registry
`advisory_deferred` array is empty.

---

## ACCEPTANCE CRITERIA FOR GAPS-MASTER-PLAN

Before the GAPS-MASTER-PLAN is considered complete:

- [ ] Header has: Source (ENGINE-GAP-LIST path), Goal (N gaps + flow name), Session type, Cadence, Generated date
- [ ] FIXED PROMPT REMINDER section is present verbatim (not paraphrased)
- [ ] PRIORITY BLOCKS section: all 3 blocks declared (Block 3 may have 0 gaps)
- [ ] Round count in PRIORITY BLOCKS matches `total_gaps` in GAP-REGISTRY.json
- [ ] ROUND TABLE has one row per round in Block 1 (and per-block tables for 2/3)
- [ ] "One action" column is an imperative verb phrase ≤70 characters
- [ ] DEPENDENCY MAP has readiness gates for all cross-gap dependencies
- [ ] DEPENDENCY MATRIX lists all non-trivial dependencies
- [ ] SAFE PARALLEL GROUPS identify which gaps can run concurrently
- [ ] TEST GATE has Block 1 final gate + targeted per-round commands for TypeScript changes
- [ ] SELF-CONTAINMENT RULE section is present
- [ ] DEFERRED section lists deferred gap IDs or declares "none"

---

## RELATIONSHIP TO SESSION FILES

Each row in the ROUND TABLE corresponds to one SESSION-GAP-RN.md file. The master plan
defines:
- What the session file fixes (One action)
- Which gap ID it closes (Gap column)
- What layer it touches (Layer column)
- What severity it addresses (Severity column)

The SESSION-GAP-RN.md files are the actual implementation artifacts — they contain
the exact TypeScript, JSON, bash commands, and test verification that apply the fix.
They are produced by executing the GAPS-MASTER-PLAN round by round.

See GUIDE-B34 for how to produce SESSION-GAP-R family files.

---

*End of GUIDE-B31 — FLOW-XX-GAPS-MASTER-PLAN.md*
*List A sources: ZIP-17 (FLOW-02/07/10 GAPS-MASTER-PLAN.md examples),*
*ZIP-12 GAP-PREP-PROCESS-R0.zip (GAP-PREP-MASTER-PLAN.md — process reference,*
*fixed prompt reminder, session type = GAP-TRANSLATE-PROCESS)*
*Target B-type: B-31 — FLOW-XX-GAPS-MASTER-PLAN.md*
*Round: 41 of 72*
