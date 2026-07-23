---
name: wave-assignment
sk_number: SK-455
version: "1.0.0"
priority: HIGH
load_order: 0.5
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Before any flow is planned, assign it to the correct wave. Wave assignment
  determines execution order, parallelism, gate type, and cost trajectory.
  Wrong wave assignments compound: FLOW-02 error affects FLOW-03 through FLOW-24.
  The decision rules are codified here: infrastructure test (N>2 rule),
  sequential vs parallel criteria, gate type selection, and cost impact calculation.
triggers:
  - "what wave is this"
  - "wave assignment"
  - "wave -1"
  - "wave 0"
  - "should this run in parallel"
  - "when does this flow run"
  - "execution order"
  - "flow sequencing"
  - "before FLOW-01"
  - "infrastructure flow"
  - "which wave"
---

# Wave Assignment Skill (SK-455) v1.0

## WHEN TO INVOKE

Before any flow is planned. Wave assignment is an input to planning, not an output.
If a flow's wave is unknown when planning starts, the dependency graph cannot be
correctly designed and the test gate type cannot be selected.

---

## THE WAVE STRUCTURE

```
Wave -1:  Infrastructure flows
          Run once, before any Wave 0 flows start.
          Other flows depend on these — not the other way around.
          Examples: SSE push (FLOW-40), Human Approval Gate (FLOW-27)

Wave 0:   First-generation user flows
          Run sequentially — one at a time.
          No prior pattern data. Absolute test gate (failures === 0).
          Examples: FLOW-01 (user registration), FLOW-02 (profile enrichment)

Wave 1:   Second-generation user flows
          Run sequentially. Some pattern data available from Wave 0.
          Absolute test gate.
          Examples: FLOW-03 (payment), FLOW-04 (content creation)

Wave 2+:  Mature user flows
          May run in parallel (up to 5 instances).
          Sufficient pattern data for delta gate.
          Delta gate: test count must not decrease (not absolute failures === 0).
          Examples: FLOW-05 through FLOW-24
```

---

## RULE 1: THE INFRASTRUCTURE TEST (Wave -1)

A flow belongs at Wave -1 when:

> **More than 2 other flows depend on this flow's output.**

Apply this test literally. Count the downstream dependents.

```
FLOW-40 (SSE push):      23 flows need push capability → Wave -1
FLOW-27 (Human gate):    Every flow with a human approval step needs this → Wave -1
FLOW-38 (Learning loop): FLOW-39 depends on it + all AF pipeline flows → Wave -1
FLOW-37 (Self-awareness): FLOW-38 depends on it + self-improvement loop → Wave -1

FLOW-01 (User registration): Only FLOW-02 depends on it → Wave 0, not Wave -1
```

The rule prevents the wrong dependency direction: a user-facing flow should not become
infrastructure because another user-facing flow happens to share some patterns.

**Edge case:** what if a flow starts with 1 dependent but will grow to 8?

Assign the final expected wave, not the current wave. Wave reassignment is expensive
(requires replanning). Plan for the intended architecture, not the immediate state.

---

## RULE 2: SEQUENTIAL VS PARALLEL (Wave 2+ only)

Wave 2+ flows may run in parallel. The decision:

```
Run in parallel when:
  □ At least 3 flows of prior wave have completed (pattern data available)
  □ No cross-flow dependency between the parallel flows
  □ The delta gate is acceptable (no existing test failures in the current codebase)
  □ Review bandwidth exists for simultaneous PHASE-COMPLETE reviews

Run sequentially when:
  □ Fewer than 3 prior flows have completed
  □ Any cross-flow dependency exists between candidate parallel flows
  □ Existing test failures (delta gate unreliable until absolute gate passes)
```

**The pattern availability argument:**
Parallel execution is only efficient when RAG patterns from prior flows reduce cycle count.
Without patterns, parallel execution is 5 simultaneous wave-0 experiences — no compound benefit.
The threshold of 3 prior flows comes from the observation that pattern transfer
reaches ~57% after FLOW-03 and continues compounding. Below 3, the compound benefit
doesn't justify the review overhead.

---

## RULE 3: GATE TYPE SELECTION

| Wave | Gate type | Why |
|------|-----------|-----|
| -1 | Absolute (failures === 0) | Infrastructure — any failure blocks all downstream flows |
| 0 | Absolute (failures === 0) | First flows — no baseline for delta comparison |
| 1 | Absolute (failures === 0) | Still early — establishing the baseline |
| 2+ sequential | Absolute | Sequential is safe to apply absolute gate |
| 2+ parallel | Delta (test count must not decrease) | Parallel runs share test infrastructure; absolute gate causes false conflicts |

**Delta gate definition:** test count at end of phase >= test count at start of phase.
A delta gate does not pass if tests were deleted to eliminate failures.

**The delta gate risk:** a delta gate can pass with 3 new failures if 4 new tests were
also added. This is why it's restricted to Wave 2+ parallel where the baseline is stable.
For sequential flows, always use absolute gate.

---

## COST IMPACT OF WAVE ASSIGNMENT

Wave assignment directly affects cost trajectory:

```
FLOW-39 activation at Wave 2 (correct):
  → Curriculum ordering is active before FLOW-05 runs
  → Local model switch triggers at FLOW-07 (enough curriculum-ordered triples)
  → FLOW-07 through FLOW-24: ~$0.10/flow instead of ~$0.60/flow
  → Savings: ~$10 per project

FLOW-39 activation delayed to Wave 3 (wrong):
  → Local model switch triggers at FLOW-12 (late)
  → FLOW-07 through FLOW-11: still at $0.60/flow (5 extra expensive flows)
  → Loss: ~$3 per project × every project

Wave -1 flows not run before Wave 0:
  → FLOW-01 Phase B runs without SSE push capability
  → FLOW-01 cannot be fully tested — no push notification path
  → FLOW-01 must be re-run after FLOW-40 completes
  → Re-run cost: equivalent to running FLOW-01 twice
```

Document the cost impact in the wave assignment decision for every infrastructure flow.

---

## THE WAVE ASSIGNMENT RECORD

For every flow, record the wave assignment with reasoning in `ARCHITECTURE-DECISIONS.json`:

```json
{
  "decisionId": "D-XX-N",
  "type": "WAVE_ASSIGNMENT",
  "question": "Should FLOW-40 (SSE push) be Wave -1 or Wave 1?",
  "reasoning": "FLOW-01 through FLOW-24 all have SLA-bearing waiting steps that require push notification. That is 24 downstream dependents — well above the N>2 infrastructure threshold. Placing SSE in FLOW-01 would create wrong dependency direction: 23 flows depending on FLOW-01's domain. FLOW-01 should depend on SSE infrastructure, not the reverse.",
  "principle": "Wave -1 infrastructure rule: if N > 2 flows depend on capability X, X is infrastructure at Wave -1",
  "outcome": "FLOW-40 at Wave -1. FLOW-01 through FLOW-24 declare FLOW-40 as prerequisite."
}
```

---

## PREREQUISITE CHAIN FORMAT

Every flow must declare its prerequisites explicitly. The prerequisites define the
wave implicitly — if a flow's prerequisite is Wave -1, the flow is at least Wave 0.

```typescript
// In flow STATE.json:
{
  "flow_id": "FLOW-01",
  "wave": 0,
  "hard_prerequisite": "FLOW-40",  // Wave -1 — must be ACTIVE before FLOW-01 starts
  "downstream": ["FLOW-02"],        // FLOW-02 depends on FLOW-01 being ACTIVE
}
```

The BFA system validates prerequisites at flow lifecycle transition. A flow cannot
become ACTIVE if its `hard_prerequisite` is not ACTIVE.

---

## ANTI-PATTERNS

```
❌ Assigning a wave without counting dependents
   → "This seems like infrastructure" is not the wave assignment protocol
   → Count the downstream flows. If > 2: Wave -1. Otherwise: Wave 0+.

❌ Delaying infrastructure flows to keep the critical path shorter
   → FLOW-40 "can run alongside FLOW-01" only if both are independent
   → If FLOW-01 needs FLOW-40's output before Phase B: FLOW-40 is a hard prerequisite
   → Hard prerequisites cannot run "alongside" — they must complete first

❌ Assigning Wave 2+ parallel without checking cross-flow dependencies
   → FLOW-05 and FLOW-06 running in parallel is safe if they share no contracts
   → If FLOW-06 consumes an event from FLOW-05: they are sequential, not parallel

❌ Using delta gate for Wave 0 flows
   → No baseline exists for delta comparison in Wave 0
   → Delta gate is undefined when test count baseline = 0
   → Always use absolute gate for Wave 0 and Wave 1
```

---

## INTEGRATION

```
Invoke before:  any flow planning session starts
Invoke when:    a new capability is identified that may be infrastructure
Produces:       wave assignment + prerequisite chain + gate type selection
Feeds into:     flow STATE.json wave field
                ARCHITECTURE-DECISIONS.json (WAVE_ASSIGNMENT type)
                planning--bootstrap-boundary-SKILL.md (SK-426) — bootstrap vs flow decision
References:     planning--flow-vs-service-gate-SKILL.md (SK-427) — FLOW vs service decision
                session-output--mission-progress-SKILL.md (SK-445) — cost trajectory tracking
```
