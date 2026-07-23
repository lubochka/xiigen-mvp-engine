---
name: parallel-wave-coordinator
sk: SK-434
description: >
  Governs Claude Code's behavior when executing a parallel-wave flow
  (Wave 2+). Reads parallel_wave from STATE.json and switches gate model,
  artifact sourcing, and lifecycle write strategy accordingly. Prevents
  the three failure modes of parallel execution: artifact collision,
  absolute gate misuse, and CAS write race.
layer: planning
version: 1.0.0
createdAt: 2026-03-20
requires: [SK-416]
complements: [SK-418, SK-427]
---

# ParallelWaveCoordinator [SK-434]

## Purpose

Sequential and parallel flows look identical from the outside — both have
Phase A through Phase E, both produce PHASE-COMPLETE and SESSION-BRIEF.
The difference is entirely in three behaviors that must switch when
`parallel_wave` is not null:

1. Artifact sourcing — read from pre-allocation table, not live query
2. Gate model — delta, not absolute
3. Lifecycle CAS write — check expected status, not blind write

Without this skill, Claude Code running a Wave 2 flow will query live
artifact boundaries (collision), run the absolute gate (false pass on
branch, real failure on merge), and blindly write lifecycle status
(race condition if two instances start simultaneously).

## When AF-4 RAG Retrieves This Skill

- STATE.json contains `parallel_wave: N` (N not null)
- "Wave 2", "parallel execution", "parallel instance"
- Phase A start of any Wave 2+ flow
- Any gate check in a parallel-wave session

## Pattern — Three Questions at Session Start

Read STATE.json. Answer these before any Phase A action:

### Question 1: Am I in parallel mode?

```
parallel_wave: null   → SEQUENTIAL mode
  Use absolute gate, live artifact boundaries, blind lifecycle write.
  Normal execution. This skill is dormant.

parallel_wave: N (any number)  → PARALLEL mode
  Switch all three behaviors below. This skill is active.
```

### Question 2: What are my artifact ranges?

```
PARALLEL mode ONLY:

1. Find flow in INFRASTRUCTURE-FLOWS-STATE-v4.json →
   parallel_execution.pre_allocated_artifact_ranges.FLOW-XX

2. If FLOW-XX has no entry:
   ⛔ STOP — pre-allocation session has not run for this wave.
   Do NOT query live boundaries. Do NOT estimate ranges.
   Report: "FLOW-XX has no pre-allocated ranges. Run pre-Wave-N
   planning session first."

3. If entry exists: use those T/F/SK/CF ranges exclusively.
   Do NOT verify against live docs. The ranges are immutable (D-PARALLEL-1).

4. If a conflict is detected during Phase A registration
   (artifact ID already exists):
   ⛔ STOP — report conflict. Do not overwrite. Await instruction.
```

### Question 3: Have I run the prerequisite wave check?

```
PARALLEL mode ONLY (Phase A, before any other action):

Read wave_prerequisite from STATE.json.
If present: GET /lifecycle/flows/{prerequisiteFlowId}
  If status != ACTIVE:
    ⛔ STOP — prerequisite flow is not yet ACTIVE.
    Report which flow is blocking. Do not proceed.
  If status == ACTIVE: continue.

Example:
  FLOW-03 STATE.json: { "wave": 2, "prerequisite": "FLOW-02" }
  Check: FLOW-02 must be ACTIVE before FLOW-03 Phase A starts.
```

## Behavior Changes in Parallel Mode

### Gate model (Phase E and all intermediate gates)

```
SEQUENTIAL (parallel_wave: null):
  cd server && npm test -- --silent
  Assert: total passing ≥ {absolute_baseline}

PARALLEL (parallel_wave: N):
  cd server && jest --testPathPattern=test/flow-{XX} --silent
  Assert: FLOW-XX test files show {expected_delta} new tests passing
  Total baseline is NOT checked here — CI verifies it post-merge.
```

### Lifecycle CAS write (Phase A)

```
SEQUENTIAL (parallel_wave: null):
  updateStatus(flowId, tenantId, "GENERATED")  ← blind write, no check

PARALLEL (parallel_wave: N):
  updateStatus(flowId, tenantId, "GENERATED", {}, "NOT_STARTED")
    ← expectedCurrentStatus = "NOT_STARTED" (CAS semantics)
  If { success: false }: ⛔ STOP — another instance claimed this flow.
    Report conflict. Do not proceed. Await instruction.
  If { success: true }: continue.
```

### EXECUTION-LOG fields (for SK-426/SK-427)

In parallel mode, EXECUTION-LOG must include:
```json
{
  "parallel_wave": 2,
  "wave_baseline_entry": 4308,
  "test_delta": 28,
  "test_baseline_exit": null
}
```
`test_baseline_exit` is null in parallel mode — the total is unknown until
post-merge. `test_delta` is the count this flow added.

## Positive Example

```
STATE.json: { "flow_id": "FLOW-03", "parallel_wave": 2, "wave": 2,
              "wave_baseline_entry": 4308, "prerequisite": "FLOW-02" }

CORRECT Phase A sequence:
  1. Read STATE.json → parallel_wave = 2 → PARALLEL mode
  2. Check FLOW-02 lifecycle → status = ACTIVE → proceed
  3. Read pre-allocated ranges for FLOW-03 from STATE-v4.json table
  4. CAS write: FLOW-03 NOT_STARTED → GENERATED
     { success: true } → continue
  5. Register T526 (not T+anything from live query)
  6. Phase gate: jest --testPathPattern=test/flow-03 → +12 tests pass ✅
```

## Negative Example

```
WRONG (parallel mode, using sequential behaviors):

  1. Read STATE.json → parallel_wave = 2
  2. Query live: GET /engine/next-task-type → returns T540 (already claimed
     by another instance running simultaneously)
  3. Register T540 → COLLISION with FLOW-04's T540
  → Corrupted canonical registry

  WRONG (absolute gate in parallel mode):
  npm test → 4338 passing, 4308 baseline → passes on branch
  Same test after FLOW-04 merges → 4338 baseline now, FLOW-03 needs 4338+28
  → Gate that "passed" is now stale

  In both cases: pre-allocation (Item 1) and delta gate (Item 2) from
  PARALLEL-EXECUTION-PLAN.md prevent these failures.
```

## Integration

```
requires:    SK-416 (reads STATE.json — parallel_wave field set here)
complements: SK-418 (FlowCompletenessChecker — checks V16 wave assignment)
             SK-427 (PhaseCompletionPackager — reads parallel_wave for log format)
```

## Test

```
Given: STATE.json with parallel_wave: null
Expected: this skill is dormant — sequential behaviors apply

Given: STATE.json with parallel_wave: 2, no pre-allocated ranges for FLOW-XX
Expected: STOP at Question 2 — pre-allocation session not run

Given: STATE.json with parallel_wave: 2, ranges present, FLOW-02 status=ACTIVE
Expected: ranges used, CAS write attempted, delta gate applied

Given: CAS returns { success: false }
Expected: STOP — conflict reported, no further Phase A actions
```
