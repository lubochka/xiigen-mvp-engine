---
name: flow-restructure
sk_number: SK-470
version: "2.0.0"
priority: CRITICAL
load_order: 0
category: code-execution
author: luba
updated: "2026-03-25"
contexts: ["web-session", "claude-code"]
description: >
  How to examine an existing flow plan when new infrastructure has been added
  since the plan was written. Produces: a delta analysis (what changed, what
  did not), a document architecture (how many session files, why), and the
  session files themselves. Distinct from flow-examination-SKILL.md which
  creates plans from scratch — this skill restructures plans that already exist.
triggers:
  - "restructure flow"
  - "update flow plan"
  - "flow plan given new infrastructure"
  - "how would you structure FLOW-01 now"
  - "split into sessions"
  - "session split"
  - "examine existing plan"
  - "FLOW-01 restructured"
---

# Flow Restructure Skill v1.0

## WHEN TO INVOKE

When an existing flow plan (SESSION-FLOW-XX-MASTER.md or FLOW-XX-MASTER-PLAN.md)
was written before new infrastructure flows (FLOW-37, FLOW-38, FLOW-39, or similar)
were completed. The plan's content may be correct but it:
- Does not reference the new infrastructure
- Has phases that are too large for a single session
- Does not include new gates (V9, capability gap scan, RAG freshness)
- Does not produce the learning handoff outputs the new infrastructure expects

**Do NOT use this skill for a flow that has no existing plan — use
`code-execution--flow-examination-SKILL.md` instead.**

---

## WHAT THIS SKILL PRODUCES

```
FLOW-XX-RESTRUCTURED-ARCHITECTURE.md   ← not executed; the delta analysis + document map
FLOW-XX-INFRASTRUCTURE-GATE.md         ← executed first; all prerequisite checks
FLOW-XX-SESSION-A.md                   ← Phase A execution
FLOW-XX-SESSION-B.md                   ← Phase B execution (may be the longest)
FLOW-XX-SESSION-C.md                   ← Phase C (may be conditional)
FLOW-XX-SESSION-D.md                   ← Phase D
FLOW-XX-SESSION-E.md                   ← Phase E
FLOW-XX-SESSION-F.md                   ← Phase F + learning handoff
```

Session count and granularity depend on the session split analysis (Step 3).
Some phases may be combined into one session; others may need two.

---

## STEP 1 — READ THE EXISTING PLAN IN FULL

Before writing anything, read the existing plan completely. Read it as if you
are Claude Code about to execute it. While reading, annotate mentally:

```
For each section, ask:
  □ Is this still correct given new infrastructure?
  □ Does this assume something that no longer exists?
  □ Is there a new gate/check that should be here?
  □ Does this produce output that the new learning infrastructure expects?
```

Do not start writing until you have read the complete plan. The most common
error is starting the delta analysis before reading the later phases — a
section that looks fine in Phase A may have downstream assumptions that
break in Phase E.

---

## STEP 2 — THE DELTA ANALYSIS

The delta analysis produces two explicit lists. Write these lists before
touching any session file.

### List 1: What does NOT change

Be explicit and specific. Name each thing. Example:

```
UNCHANGED FROM EXISTING PLAN:
- 53 fixture files and their exact JSON content
- The score bracket decision tree (4 brackets: 0-49, 50-64, 65-79, 80-89)
- Prescriptiveness inspection at bracket 90-100
- PromptPatch formula (one targeted block per failing check, WRONG/CORRECT)
- Phase D behavioral test pattern (assert behavior, not SDK calls)
- Phase E DPO triple format (prompt.system required — GAP-08)
- Phase F cross-flow dependency registration
- The 8-check infrastructure gate (all 8 checks still required)
- pnpm test zero-regression rule at every gate
- ⛔ STOP after every phase
```

Why this list matters: Claude Code reading the session file must know not
to re-examine these things. Writing "unchanged" explicitly prevents
overwriting correct content with "improved" but wrong content.


> **DPO triple required fields (v2.0.0 schema — P17+P18):** `curriculumTier`,
> `modelComparison` (chosen.model ≠ rejected.model), `targetModelFamily` (from
> FREEDOM config), `instructionFormat`, `distillationReadiness`, `prompt.system`.
> Abbreviated references in this file reflect planning context only.
> See `code-execution--learning-signal-capture-SKILL.md` for the full schema.
> (Cross-reference acceptable here — planning-session skill. Not acceptable in
> Claude Code SESSION-N.md files — inline all fields there per FC-28/SK-443.)

### List 2: What changes and exactly where

For each change, identify:
1. Which phase it belongs to
2. Whether it is a new step, a modified gate, or a new output
3. What new infrastructure drives it
4. Whether it is additive (new step) or replacement (replaces an existing step)

Example format:

```
PHASE A — New step A0: Capability gap pre-scan (additive)
  Driven by: FLOW-37A (phase-capability-gate topology)
  Position: before existing A1 (before fixture seeding)
  Action: curl to phase-capability-gate API, read allPresent flag
  On MISSING: read remediation plan from FLOW-37A n5 output

PHASE A — New step A0.5: Calibration memory consultation (additive)
  Driven by: FLOW-38E (CalibrationMemory)
  Position: after A0, before A1
  Action: curl calibration API for this archetype+domain; record in STATE.json
  Result on first run: hasGuidance: false — use constraint + sketch default

PHASE B — Modified B1: Add post-run distillation check (additive to existing loop)
  Driven by: FLOW-39A (knowledge-distillation-extractor)
  Position: after each task type run, before next task type
  Action: check xiigen-distilled-rules count for this task type
  Expected: >= 3 rules per passing run

PHASE B — Modified B2: Known-fix RAG check before bracket diagnosis (additive)
  Driven by: FLOW-38D (KnownFixSeeder)
  Position: before existing bracket diagnosis steps
  Action: query KNOWN_FIX patterns for current violations
  On match: apply known fix, skip bracket diagnosis

PHASE B — Modified B3: V9 gate added (additive to existing gate)
  Driven by: FLOW-39B (v9-teaching-health-gate)
  Position: at end of Phase B gate, after existing checks
  Action: run v9-gate script; V9-001 is BUILD_FAILURE severity
  On V9-001 FAIL: phase completion is BLOCKED

PHASE E — New field: curriculumTier on DPO triples (additive)
  Driven by: FLOW-39C (curriculum-sequencer)
  Position: when recording DPO triples
  Action: add curriculumTier field; FLOW-39C assigns automatically
  Verify: check field is non-null after storage

PHASE F — New step F4: Learning handoff document (additive)
  Driven by: FLOW-39, FLOW-38
  Position: after existing F2 (cross-flow dependency)
  Action: read 4 learning indices, write FLOW-01-LEARNING-HANDOFF.json
  Content: distilledRules, dpoTriples, shadowRunSummary, calibrationRecords
```

---

## STEP 3 — SESSION SPLIT ANALYSIS

This is the most important structural decision. Apply these criteria to each phase:

### Split criterion 1: Context loss risk

A phase needs its own session file if losing context mid-phase would make
it impossible to resume correctly.

```
Phase B of FLOW-01: up to 9 generation calls (3 task types × 3 cycles)
  → Each call produces a trace that feeds the next decision
  → Losing context mid-B means losing which runs scored what, what was patched
  → VERDICT: dedicated session file

Phase A of FLOW-01: 53 deterministic file seedings
  → Each seeding is independent; none depends on the result of a previous one
  → Losing context mid-A: re-read STATE.json, resume from last successful seed
  → VERDICT: one session file is sufficient
```

### Split criterion 2: Decision tree depth

A phase needs its own session file if it contains branching logic that
produces significantly different execution paths.

```
Phase B: 4 score brackets × 3 task types × up to 3 cycles = complex branching
  → The session file must contain all branches concretely
  → VERDICT: dedicated, detailed session file

Phase C (JUDGE/ITERATE): conditional — runs only if patches occurred
  → SHORT: ~60 lines covering the conditional check and what to record
  → Can share a file with Phase D if combined thoughtfully
  → VERDICT: can be combined with D/E/F in one file
```

### Split criterion 3: Execution time and cognitive load

A phase needs its own session file if Claude Code executing it needs to hold
more information in working memory than a fresh session can reliably provide.

```
Phase D (INTEGRATE): writes test files using patterns from FLOW-37 skill set
  → Requires mock-factory patterns, node-testing patterns, module wiring
  → Not as complex as Phase B but has enough specifics to warrant its own file
  → VERDICT: dedicated session file

Phases C + D + E + F: individually manageable
  → Can be one file split by clear section markers
  → SESSION-BRIEF within each section cold-starts the next
  → VERDICT: one combined file
```

### Split criterion 4: Companion document requirement

A phase that produces a companion document for the next web session (SESSION-BRIEF)
needs a clear termination point that is easy to find in the session file.

Every session file must end with:
1. STATE.json update
2. Phase completion package (3 files: EXECUTION-LOG, PHASE-COMPLETE, SESSION-BRIEF)
3. ⛔ STOP

---

## STEP 4 — WRITE THE DOCUMENT ARCHITECTURE

Before writing any session file, write a short document architecture block.
This is the index for the session set.

```
DOCUMENT ARCHITECTURE:

FLOW-XX-INFRASTRUCTURE-GATE.md
  Purpose: All N prerequisite checks. Initializes STATE.json.
  New vs existing: 8 original checks + M new checks for new infrastructure.
  Ends with: STATE.json initialized. ⛔ STOP.

FLOW-XX-SESSION-A.md
  Purpose: Phase A — INJECT
  New vs existing: N new steps prepended (capability scan, calibration, V9 baseline)
  Existing content: all N fixture seedings unchanged
  Ends with: Phase completion package. ⛔ STOP.

FLOW-XX-SESSION-B.md
  Purpose: Phase B — GENERATE (dedicated — context loss risk, deep branching)
  New vs existing: B0 capability scan, B0.5 freshness, B0.6 shadow verify,
                   known-fix check before bracket, post-run distillation verify,
                   V9 gate at end
  Existing content: B1 run loop, B2 score brackets, B3 gate unchanged
  Ends with: Phase completion package. ⛔ STOP.

FLOW-XX-SESSION-C.md (conditional)
FLOW-XX-SESSION-D.md
FLOW-XX-SESSION-E.md
FLOW-XX-SESSION-F.md
  Combined as FLOW-XX-SESSIONS-C-D-E-F.md (or separate if D is complex)
  Each section ends with phase completion package + ⛔ STOP
```

---

## STEP 5 — WRITE THE INFRASTRUCTURE GATE FILE

The infrastructure gate file extends the existing gate with new infrastructure
checks. Structure:

```
Section 1: Original N checks (unchanged, verbatim if possible)
Section 2: New checks for new infrastructure flows
  - Check: new flow X is ACTIVE
  - Check: new flow Y topology responds
  - Check: new ES indices exist (4 for FLOW-39)
  - Check: FLOW_DESIGN patterns present and tiered
Section 3: On pass: initialize STATE.json with all new fields
```

The STATE.json structure must include all fields the new infrastructure expects:
- `v9_baselines` per phase
- `calibration_consultations`
- `shadow_run_summary`
- `teaching_health` per phase gate

---

## STEP 6 — WRITE SESSION FILES

Each session file follows this template:

```markdown
# FLOW-XX-SESSION-{PHASE}.md
## Phase {N}: {PHASE NAME}
## Claude Code execution document

---

## COLD START
[Read STATE.json, verify previous phase complete, load governance chain]

---

## STEP {N}0 — CAPABILITY GAP SCAN
[If FLOW-37 is active: pre-scan for this phase type]

## STEP {N}1 — [first new step from delta analysis]
[concrete commands, expected outputs]

## STEP {N}2 — [existing step, preserved verbatim or minimally modified]
[concrete commands — no pseudocode]

...

## STEP {N}N — PHASE GATE
[all existing gate checks first, then new checks appended at end]
[V9 gate if applicable]

## UPDATE STATE.json
[jq command updating current_phase and completed_phases]

---

## PHASE COMPLETION PACKAGE
[Write EXECUTION-LOG-{phase}.json]

[Write PHASE-COMPLETE-{phase}.md for Luba]
PHASE-COMPLETE structure (in this order — SK-445 PLACEMENT RULE):
  1. ENGINE PROGRESS (load session-output--mission-progress-SKILL.md SK-445 — FIRST)
  2. Phase gate results (test counts, FC checks, V-gate results)
  3. Files changed
  4. ISSUE INVENTORY (FC-29 format — required before every ⛔ STOP)

ENGINE PROGRESS template (inline — do not reference SK-445 for content):
```markdown
## ENGINE PROGRESS — Phase [X] Complete
| Metric | This Phase | Cumulative | Target | Gap |
|--------|-----------|------------|--------|-----|
| Valid DPO triples | +N | TOTAL | 80 | REMAINING |
| Pending DPO triples | +N | TOTAL | 0 | — |
| Shadow gap T47 (ROUTING/Tier1) | N% / PENDING | N% | <5% | N% |
| Shadow gap T48 (SCHEDULED/Tier5) | N% / PENDING | N% | <5% | N% |
| Prompt versions improved | N | N total | continuous | — |
| Flows to graduation test | — | — | 24 | N remaining |
```

[Write SESSION-BRIEF-{phase}.md for next Claude Code session]

⛔ STOP. [phrase describing what next phase does]. Wait for "yes".
```

### SESSION-BRIEF requirements

Every session file's SESSION-BRIEF must contain:
1. What STATE.json field to check to verify this phase is complete
2. What the next phase's session file is called
3. Key facts Claude Code needs from STATE.json to start the next phase cold
4. What the next phase does in one sentence

Without (3), the next session must re-read all prior output to recover context.
The SESSION-BRIEF is the recovery mechanism.

---

## STEP 7 — WRITE THE RESTRUCTURED ARCHITECTURE DOCUMENT

This is NOT a session file. It is the reference document showing:

1. What the original plan got right (unchanged list)
2. What the restructure added and why
3. The document architecture (which file, which phases)
4. How each new step connects to which new infrastructure flow
5. The updated quantitative expectations table

Format the quantitative expectations as a comparison:

```
| Phase | Metric | Original expected | Revised expected |
|-------|--------|------------------|-----------------|
| B     | Score  | 0.80–0.89        | unchanged        |
| B     | DISTILLED_RULEs | (not in original) | >= 3 per passing run |
| E     | DPO triples | >= 3 | unchanged |
| E     | curriculumTier | (not in original) | 100% of triples |
```

The "unchanged" entries are as important as the new ones — they tell the
reader the scope of what was examined and confirmed.

---

## ANTI-PATTERNS

```
❌ Rewriting the entire plan
   → Read the delta list. If something is unchanged, preserve it verbatim.
   → A rewrite introduces errors into things that were correct.

❌ Session files that don't cold-start
   → Every session file opens with: read STATE.json, verify previous phase.
   → If a session file assumes context from the previous session's memory,
     it will fail when Claude Code loads it fresh.

❌ SESSION-BRIEF that says "see previous session for context"
   → The brief must contain the key facts, not a pointer to them.
   → Claude Code cannot "see previous session" reliably across compaction.

❌ Combining phases that have context loss risk
   → Phase B of any generation flow must be its own session file.
   → The branching (score brackets × task types × cycles) cannot be safely
     compressed into a shared file.

❌ Gate checks that are missing new infrastructure
   → Every gate must include the V9 check if FLOW-39 is active.
   → V9-001 is BUILD_FAILURE — omitting it means a phase can "complete"
     with no teaching data produced.

❌ Not writing the unchanged list
   → Without the explicit "these are correct and unchanged" list, Claude Code
     will re-examine and potentially modify correct content.
   → Write it. Name each thing.
```

---

## HOW TO DETERMINE SESSION SPLIT — QUICK REFERENCE

| Phase characteristic | Split decision |
|---------------------|---------------|
| Contains a loop over N task types × M cycles | Dedicated session |
| All steps are deterministic seedings | Can share with adjacent phase |
| Contains conditional logic (Phase C: only if patches occurred) | Can share, clearly marked |
| Produces a companion document for web session review | Must end cleanly with ⛔ STOP |
| Depends on outputs of same-phase earlier steps | Must be one session |
| Steps are independent (each could resume from STATE.json) | Can share |

---

## INTEGRATION

```
Distinct from:  flow-examination-SKILL.md (creates plans from scratch)
Used after:     New infrastructure flows (FLOW-37/38/39) become ACTIVE
Produces:       7+ session files + 1 architecture document
References:     session-output--session-execution-log-SKILL.md (log format)
                session-output--phase-completion-packager-SKILL.md (package format)
                session-output--web-session-handoff-SKILL.md (SESSION-BRIEF format)
```

**Reference implementation:** `FLOW-01-RESTRUCTURED-ARCHITECTURE.md` and
`flow-01-sessions.zip` demonstrate this skill applied to FLOW-01 given
FLOW-37/38/39 ACTIVE. Specifically:
- Delta analysis produced explicit UNCHANGED and CHANGED lists
- Session split: infrastructure gate (13 checks) + Session A + Session B (dedicated,
  9 possible generation calls) + Sessions C-D-E-F (combined)
- 8 new steps added across 4 phases, all tied to specific infrastructure flows
- Learning handoff document added to Phase F
Add these documents to project knowledge as the canonical application example.

---

## TEST SCENARIOS

- Given FLOW-01-MASTER-PLAN-V2.md and FLOW-37/38/39 ACTIVE:
  → Delta analysis finds 8 new steps across 4 phases
  → Session split: B is dedicated (9 possible generation calls), C+D+E+F combined
  → Infrastructure gate gains 5 new checks (checks 9-13)
  → Phase E gains curriculumTier verification
  → Phase F gains learning handoff document

- Given a Phase A that is 200 lines of fixture seedings:
  → No context loss risk (deterministic, resumable from STATE.json)
  → One session file — no split needed
  → But: prepend new pre-phase steps (gap scan, calibration, V9 baseline)

- Given a Phase B with 3 task types and a track record of needing 2-3 cycles each:
  → Context loss risk: HIGH (up to 9 traces, each feeding next decision)
  → Split: dedicated session, 516 lines
  → All 4 score brackets must be concrete bash, not prose descriptions
