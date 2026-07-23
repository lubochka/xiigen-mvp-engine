# PARALLEL-EXECUTION-PLAN
## Running FLOW-01..24 with Multiple Claude Code Instances
## Version: v1.0 | Date: 2026-03-20
## Tier: 3 — Read before planning any Wave 2 or Wave 3 session

---

## WHY THIS IS POSSIBLE

FLOW-01..24 have a dependency graph, not a linear chain. After FLOW-02 completes,
its dependents (FLOW-03, FLOW-04, FLOW-05, FLOW-07, and others) have no
dependencies on each other. They can execute simultaneously on separate Claude Code
instances, each on its own branch, each producing its own PHASE-COMPLETE output.

The constraint is not technical — it is your review bandwidth. Parallel instances
produce PHASE-COMPLETE files simultaneously. The reading load is the same; the
calendar time is proportionally shorter.

---

## DEPENDENCY WAVES

```
Wave 0 (sequential — strict dependency chain):
  FLOW-01  (User Registration)

Wave 1 (sequential — strict dependency on FLOW-01):
  FLOW-02  (Business Intelligence)

Wave 2 (parallel — all depend only on FLOW-02):
  FLOW-03  (Marketplace)
  FLOW-04  (Event Management)
  FLOW-05  (Connections)
  FLOW-07  (Search & Discovery)
  FLOW-08..N  (Other branches — verify from each flow's reference plan)
  Up to 5 parallel instances

Wave 3 (parallel — depend on Wave 2 flows):
  FLOW-09..12  (Payments, Billing)
  FLOW-13..16  (Content, Media)
  FLOW-17..20  (Analytics, AI)
  FLOW-21..24  (Notifications, Admin)
  Up to 4+ parallel instances
```

**Pre-condition for Wave N to start:**
All flows in Wave N-1 must have status = ACTIVE in the flow-lifecycle index.
No Wave 2 flow may begin Phase A until FLOW-02 Phase E gate passes and is merged.

---

## FIVE COORDINATION ITEMS

### Item 1 — Pre-allocated artifact ranges (pure planning, zero code)

**Problem:** SK-416 queries "next available T" live at session start. In parallel
execution, two instances query simultaneously and get the same answer → collision.

**Fix:** Add `pre_allocated_artifact_ranges` to INFRASTRUCTURE-FLOWS-STATE-v4.json
as an addendum section. Each instance reads its own pre-assigned range — no live
query needed.

```json
"parallel_execution": {
  "pre_allocated_artifact_ranges": {
    "FLOW-01": {
      "T": "T47–T49",    "F": "F174–F181",  "Family": "1",
      "SK": "see FLOW-01 reference plan",
      "CF": "CF-1–CF-8"
    },
    "FLOW-02": {
      "T": "T50–T52",    "F": "F182–F189",  "Family": "19",
      "SK": "see FLOW-02 reference plan",
      "CF": "CF-4–CF-9"
    },
    "FLOW-03": {
      "T": "verify live", "F": "verify live", "Family": "verify live",
      "SK": "verify live",
      "CF": "verify live — assign before Wave 2 starts"
    }
    // Ranges for FLOW-04..24 populated in a planning session
    // before Wave 2 execution begins. See Item 5 for process.
  }
}
```

**Rule for parallel execution:** A parallel instance MUST use its pre-assigned range
from this table. It must NOT query live artifact boundaries. If a conflict is detected
at Phase A (registered artifact already exists), stop and report — do not overwrite.

---

### Item 2 — Delta-based gate model for parallel-wave SESSION files

**Problem:** Current gate model: `npm test ≥ {absolute_baseline}`. If Instance A
(FLOW-03) and Instance B (FLOW-04) both start from baseline 4308 and both add 30
tests, they each see 4338 passing on their branch. On `main`, after Instance A
merges, baseline becomes 4338. Instance B's branch is still at 4308 entry — its
gate check passes on the branch but the absolute baseline on main has moved.

**Fix:** For parallel-wave SESSION files, gate is delta-based:
```
Standard (sequential) gate:
  cd server && npm test -- --silent 2>&1 | tail -5
  Assert: total passing ≥ {absolute_baseline}

Parallel-wave gate (when parallel_wave: true in STATE.json):
  cd server && jest --testPathPattern=test/flow-{XX} --silent 2>&1 | tail -5
  Assert: FLOW-XX test files pass all {expected_delta} new tests
  Assert: npx tsc --noEmit = 0 errors
  (Total baseline verified post-merge by CI — not by the instance)
```

The `parallel_wave` flag in STATE.json tells Claude Code which model to apply.
Sequential flows (FLOW-01, FLOW-02) always use the absolute model.
Parallel waves use the delta model during execution, absolute model post-merge.

---

### Item 3 — CAS write on flow-lifecycle Phase A status update

**Problem:** Two parallel instances could both see a flow as NOT_STARTED and both
attempt to transition it to GENERATED. The second write would silently overwrite
the first.

**Fix:** Phase A status update uses Compare-And-Swap (CAS), not blind write:

```
Phase A gate item (for parallel flows):
  □ CAS write: flow-lifecycle status NOT_STARTED → GENERATED
    If CAS succeeds: continue to Phase B
    If CAS fails (status is not NOT_STARTED): STOP — another instance claimed this flow
    Do NOT overwrite. Report the conflict and await instruction.
```

`IFlowLifecycleService.updateStatus()` must support an `expectedCurrentStatus`
parameter for optimistic locking. Add this to the interface spec in FLOW-35 Phase A:

```typescript
interface IFlowLifecycleService {
  updateStatus(
    flowId: string,
    tenantId: string,
    newStatus: FlowStatus,
    metadata?: Record<string, unknown>,
    expectedCurrentStatus?: FlowStatus  // NEW — for CAS semantics
  ): Promise<{ success: boolean; actualStatus: FlowStatus }>
}
```

If `expectedCurrentStatus` is provided and the current status doesn't match,
`success: false` is returned and no write occurs.

---

### Item 4 — `parallel_wave` flag in STATE.json

**Problem:** Without a flag, Claude Code cannot distinguish sequential from
parallel execution and doesn't know whether to apply absolute or delta gate model.

**Fix:** Add `parallel_wave` field to STATE.json for each parallel flow session:

```json
{
  "flow_id": "FLOW-03",
  "current_phase": "A",
  "parallel_wave": 2,               // null for sequential flows
  "wave_baseline_entry": 4308,      // test count when Wave 2 started
  "pre_allocated_ranges": {
    "T": "verify from parallel_execution table",
    "F": "verify from parallel_execution table",
    "SK": "verify from parallel_execution table",
    "CF": "verify from parallel_execution table"
  }
}
```

When `parallel_wave` is not null: Claude Code uses delta gate model (Item 2).
When `parallel_wave` is null: Claude Code uses absolute gate model (standard).

---

### Item 5 — Pre-allocation session (one web session before Wave 2 starts)

**Problem:** Artifact ranges for FLOW-03..24 are not yet assigned. They must be
assigned before Wave 2 begins, not during it.

**Fix:** Run one planning web session after FLOW-02 completes and before any Wave 2
instance starts. In that session:

```
1. Read live artifact boundaries from live canonical docs (SK-416 startup)
2. Read all FLOW-03..24 reference plans → extract task type counts per flow
3. Build pre_allocated_artifact_ranges table for FLOW-03..24
4. Update INFRASTRUCTURE-FLOWS-STATE-v4.json addendum section
5. Lock ranges in DECISIONS-LOCKED.md as D-PARALLEL-WAVE2
6. Produce N STATE.json files (one per Wave 2 flow) with parallel_wave: 2
7. You approve — then Wave 2 begins
```

This session takes ~1 hour. It is the prerequisite gate before any parallel instance
can start. Ranges assigned here are immutable — no instance may deviate.

---

## PRACTICAL EXECUTION MODEL

### Wave 0–1 (sequential)

```
You: approve FLOW-01 Phase A → Claude Code Instance 1 executes
     approve FLOW-01 Phase B–E → Instance 1 continues
     approve each phase individually (standard pattern)
     FLOW-01 Phase E merges to main

You: approve FLOW-02 Phase A → Instance 1 (or new instance) executes
     approve FLOW-02 Phase B–E → continues
     FLOW-02 Phase E merges to main
```

### Pre-Wave 2 planning session (~1 hour)

```
Web session: assign artifact ranges for FLOW-03..24
             produce STATE.json per parallel flow (parallel_wave: 2)
             update STATE-v4.json pre_allocated_artifact_ranges
```

### Wave 2 (parallel — up to 5 instances simultaneously)

```
Instance 1: FLOW-03 Phase A → E  (branch: flow/flow-03/...)
Instance 2: FLOW-04 Phase A → E  (branch: flow/flow-04/...)
Instance 3: FLOW-05 Phase A → E  (branch: flow/flow-05/...)
Instance 4: FLOW-07 Phase A → E  (branch: flow/flow-07/...)
Instance 5: FLOW-08 Phase A → E  (branch: flow/flow-08/...)

You: review PHASE-COMPLETE files as they arrive
     approve each PR independently as it passes Phase E gate
     merge PRs in any order — CI verifies absolute baseline post-merge
```

### Your review bandwidth

Each parallel instance runs ~5 phases. Each phase produces a PHASE-COMPLETE.md
(~1 page). With 5 parallel instances × 5 phases = 25 PHASE-COMPLETE files across
~3 days rather than 25 sequential files across ~10 days. Reading load is identical;
calendar time is 3× shorter. The bottleneck is your approval bandwidth, not technical.

---

## GATE ITEMS ADDED TO PARALLEL SESSION FILES

Every SESSION file for a parallel-wave flow (Wave 2+) must include:

### Phase A gate additions (parallel only):
```
□ Read pre-assigned ranges from parallel_execution table in STATE-v4.json
  Do NOT query live boundaries — use table values only
  If table has no entry for this flow: STOP and report before proceeding

□ CAS write: flow-lifecycle NOT_STARTED → GENERATED
  If CAS fails: STOP — report conflict, await instruction

□ flow-lifecycle record: status = GENERATED, parallel_wave = {N} set
```

### Phase E gate additions (parallel only):
```
□ Delta gate (not absolute):
  jest --testPathPattern=test/flow-{XX} verifies flow-specific delta only
  Total baseline verified post-merge by CI

□ Cross-flow edge test stubs for this flow's outbound edges:
  All stubs present (real implementations in downstream flows' Phase E)

□ PR description includes:
  - pre_allocated_ranges used
  - test_delta (not absolute)
  - wave_baseline_entry reference
```

---

## DECISIONS TO LOCK

```
D-PARALLEL-1: pre_allocated_artifact_ranges are immutable once assigned
  A parallel instance may not deviate from its pre-assigned T/F/SK/CF ranges.
  If a range conflict is detected, stop and escalate — never overwrite.

D-PARALLEL-2: parallel_wave flag governs gate model
  null → absolute gate (Sequential: FLOW-01, FLOW-02)
  2    → delta gate    (Wave 2 parallel flows)
  3    → delta gate    (Wave 3 parallel flows)
  Absolute baseline check happens post-merge via CI — not during instance execution.

D-PARALLEL-3: pre-allocation session required before each wave
  No Wave N instance may start Phase A before the pre-allocation session
  for Wave N has completed and been approved.
```

---

## DOCUMENTS TO UPDATE

When this plan is integrated:

```
INFRASTRUCTURE-FLOWS-STATE-v4.json
  → Add addendum.parallel_execution section with pre_allocated_artifact_ranges
    (FLOW-01/FLOW-02 entries populated now; FLOW-03..24 populated before Wave 2)

FLOW-35-REFERENCE-PLAN-v2.md → Phase A
  → IFlowLifecycleService.updateStatus() must support expectedCurrentStatus (CAS)

SK-427-SKILL.md
  → Add parallel gate model section (see updated version)

DECISIONS-LOCKED.md
  → D-PARALLEL-1 through D-PARALLEL-3

HOW-TO-USE-SKILLS-v5_2.md
  → Add Scenario 9: running parallel wave execution
  → Update execution order note: Waves 0–1 sequential, Wave 2+ parallel
```
