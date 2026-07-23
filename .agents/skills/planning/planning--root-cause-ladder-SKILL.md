---
name: root-cause-ladder
sk_number: SK-432
version: "1.1.0"
priority: HIGH
load_order: 0
category: planning
author: luba
updated: "2026-04-07"
description: >
  Problems arrive at one level but need to be addressed at the right level.
  Ask "why?" three times to locate the root cause. Act at that level — not
  higher (over-engineering) or lower (treating symptoms). v1.1 adds: broader
  triggers covering rejections without stated reason, and a rejection-response
  protocol — when a rejection arrives without explanation, ask one precise
  question and wait rather than generating new theories in the same frame.
triggers:
  - "why is this happening"
  - "what caused this"
  - "is this a bug"
  - "should we fix this"
  - "this keeps breaking"
  - "we've fixed this before"
  - "root cause"
  - "how many sessions do we need"
  - "collapse the gap list"
  - "find the roots"
  - "how many root causes"
  - "this is bad design"
  - "that won't work"
  - "this is wrong"
  - "that's not right"
  - "no"
  - "again"
  - rejection without stated reason
---

# Root Cause Ladder Skill v1.1

## THE THREE-LEVEL STRUCTURE

```
LEVEL 1 — Immediate cause: The specific thing that is wrong right now.
  → Response: MAINTENANCE SESSION. Fix the specific thing.
  → Risk of stopping here: fixes a symptom. The problem recurs.

LEVEL 2 — Structural cause: The pattern or process that allowed the problem.
  → Response: Skill update or template change.
  → Risk of stopping here: process fixed but the design assumption that made
    the process fail is not addressed.

LEVEL 3 — Architectural cause: The design decision that produced the structure.
  → Response: DESIGN DECISION. May require a planning session.
  → Risk of acting here when the problem is Level 1: over-engineering.
```

## THE THREE-LEVEL ASK

Ask "why does this problem exist?" three times before deciding the response level.

---

## EXAMPLES

### Example 1: Stale artifact registry

```
Problem: CLAUDE.md says T567 but T573 is already assigned

Level 1: Update CLAUDE.md to T580.
         → Fixes today's session. Tomorrow it drifts again.

Level 2: No write path from Phase F back to the artifact registry.
         Nothing updates CLAUDE.md after a flow completes.
         → Fix: add ARTIFACT_RANGE seeding step to Phase F gate template
           in flow-implementation-guide-SKILL.md.

Level 3: Self-knowledge lives in a file that humans update manually.
         It will always drift. The correct home is the self-learning RAG.
         → Fix: seed artifact ranges as RAG documents.
           FLOW-38 already manages their lifecycle. No new infrastructure.
```

**Act at:** Level 3 (architectural). Level 1 fix is still needed today.
Level 2 fix prevents recurrence until Level 3 is built.

---

### Example 2: WordPress INCOMPATIBLE verdict

```
Problem: T48 (EmailVerificationWait) classified INCOMPATIBLE for WordPress

Level 1: Add a mitigation note to the contract.
         → Documents the problem. Doesn't change generation behavior.

Level 2: The classification happened at the wrong abstraction level.
         The protocol for checking "mechanism vs design level" doesn't exist.
         → Fix: add to how-to-prepare-a-plan-SKILL.md: before classifying
           INCOMPATIBLE, ask "is this the design or one provider of the design?"

Level 3: NODEs don't exist. Without stack-neutral NODE representations,
         implementation decisions are conflated with design decisions.
         → Fix: convergence.handler needed before FLOW-01.
```

**Act at:** All three. Level 1 now, Level 2 this session, Level 3 planned.

---

### Example 3: A recurring test failure

```
Problem: Test for T47 fails after every merge

Level 1: Fix the test.
         → Unblock the build.

Level 2: The test relies on a fixture that changes between merges.
         Fixture generation is not deterministic.
         → Fix: use a seeded fixture builder, not a snapshot.

Level 3: The test was designed to catch a symptom (output shape) instead
         of the invariant (idempotency check before write).
         → Fix: redesign the test to assert the invariant directly.
```

**Act at:** Level 1 immediately, Level 2 this session, Level 3 in the next
test design review.

---

## WHEN TO ACT AT WHICH LEVEL

```
Level 1 problem only:   fix it now, note that no structural change is needed
Level 2 problem:        fix Level 1 now, schedule Level 2 for this session
Level 3 problem:        fix Level 1 now, schedule Level 2 if blocking,
                        route Level 3 to a planning session

When in doubt: fix Level 1 immediately, plan Level 2 for this session,
flag Level 3 as architectural decision for planning session.
```

---

## ANTI-PATTERNS

```
❌ Acting at Level 1 when the problem is Level 3
   → The artifact registry problem was "fixed" multiple times by updating CLAUDE.md.
   → Each fix lasted until the next flow completed.

❌ Proposing Level 3 redesigns when a Level 2 template change fixes it
   → Adding a seeding step to Phase F is Level 2. It doesn't require a new flow.

❌ Treating all problems as architectural
   → Not every drift problem requires FLOW-38. Some require a one-line gate addition.

❌ Stopping at Level 1 when the problem has already recurred twice
   → Two occurrences = structural. Three occurrences = architectural.
   → If you've fixed this before, you're at Level 2 at minimum.
```

---

## CROSS-GAP CONVERGENCE (applies when gap count > 10)

Use after simulations have produced a cataloged, deduplicated gap list.
Before ordering work into sessions. Pairs with simulation-protocol-SKILL.md output.

### What this does

Running the root cause ladder on one problem finds one root cause.
Running it across 50 problems and grouping by Level 3 root cause reveals
that most problems share a small number of architectural causes.
Fixing one Level 3 root cause closes multiple gaps simultaneously.

### Step 1: Extract Level 3 root cause for EACH gap

Run the three-level ladder on every gap independently.
Record only the Level 3 result — the architectural cause.

```
Example extractions:

Gap: "AF-1 ignores stack parameter"
Level 3: Engine assumes NestJS output everywhere — stack is not a first-class input

Gap: "Named checks use NestJS regex"
Level 3: Engine assumes NestJS output everywhere — validation is NestJS-specific

Gap: "DPO triple has no targetStack field"
Level 3: Engine assumes NestJS output everywhere — training data has no stack tag

Gap: "IScopedMemoryService not defined"
Level 3: Provider name leaked into interface design — IRedisService was never built

Gap: "'php-wordpress' key in stackCoupling"
Level 3: Provider name leaked into interface design — stack-profile thinking survived reframe

Gap: "No fan-out in topology model"
Level 3: Topology model is DAG-only — parallel patterns require NEW_HANDLER

Gap: "No collect.handler"
Level 3: Topology model is DAG-only (same root as above)
```

### Step 2: Group gaps by Level 3 root cause

After extracting all Level 3 roots, group gaps that share the same root:

```
Root A: "Engine assumes NestJS output everywhere"
  → Gaps: A1-G1, A1-G2, A1-G6, A1-G9, A1-G10, F3-G2, F3-G4, A1-G5 (8+ gaps)
  → One Phase Zero session cluster closes all of them

Root B: "Topology model is DAG-only"
  → Gaps: B6-G6 (fan-out), B6-G7 (loops)
  → One Phase Two session pair closes both

Root C: "Provider name leaked into interface design"
  → Gaps: IScopedMemoryService missing, ICodeRepositoryService not built
  → One session (Z-2) closes both

Root D: "No genesis prompts for system intake"
  → Gaps: ARCHITECTURE_SCAN missing, CONVENTION_EXTRACT missing, ...
  → Phase One sessions close this cluster
```

### Step 3: Count root causes vs original gap count

```
Original gap count: N (e.g. 50)
Root cause group count: K (e.g. 5-6)

K = the number of SESSION CLUSTERS needed to close the foundation.
N = what you'd plan if you didn't run this step.

2026-03-24 session result: 50 gaps → 5-6 Level 3 roots → 14 sessions.
Without convergence: 50 gaps might have suggested 50+ sessions.
The collapse is the value of this step.
```

### Step 4: Order root causes by dependency

Some Level 3 roots must be fixed before others can be wired:

```
"Stack is not a first-class API input" (Z-1)
  → must exist before:
  "AF-1 reads stackCoupling" (Z-1 downstream)
  "Named checks use per-stack regex" (Z-3)
  "DPO triples are per-stack tagged" (Z-1 downstream)

"IScopedMemoryService defined" (Z-2)
  → must exist before:
  "T62 analytics generation works" (FLOW-03)

"System intake pipeline built" (Phase One)
  → must exist before:
  "FLOW-01 WordPress generation" (Phase Three)
```

The dependency ordering of root causes produces the session ordering.
This is not the same as ordering by effort or importance — something can be
5 lines and still first because everything downstream requires it.

### The convergence principle

50 gaps → 6 Level 3 roots → 14 sessions.

This collapse happens because problems in a coherent system share
architectural causes. Finding those causes prevents spending sessions on
symptoms that automatically disappear when their root is fixed.

The alternative: plan 50 sessions for 50 gaps, half of which turn out to be
redundant because fixing gap 3 closed gaps 7, 14, and 23 automatically.

---

## WHEN A REJECTION ARRIVES WITHOUT A STATED REASON

This skill also governs the model's response to rejection — not just to named
problems. A rejection is a signal that the model's framing is wrong. The three-
level ladder applies to understanding the rejection itself before responding to it.

**The rejection-response protocol:**

```
Step 1: Do not generate a new theory.
        A rejection means the current frame is wrong, not that a better
        answer in the same frame exists.

Step 2: Ask one precise question.
        "What specifically is wrong?" or "What am I missing about how to
        think about this?" — one question, then wait.

Step 3: Apply the ladder to the answer.
        Once the answer arrives, apply the three levels:
          Level 1: specific fact is wrong → correct the fact
          Level 2: approach is wrong → change the approach
          Level 3: framing is wrong → restate the problem from scratch

Step 4: Escalation rule.
        If the same category of answer has been rejected twice, the frame
        is wrong — not the answer. Do not produce a third answer in the
        same frame. Ask what the correct frame is explicitly.
```

**Why this matters for XIIGen:**

The engine is a complex system. When something is "bad design," the problem
could be at the infrastructure level, the data contract level, the quality
signal level, or the architectural assumption level. Each level requires a
completely different response. Generating a theory before knowing the level
wastes both the session and the context. The one-question pause is the
minimum viable response to a rejection of unknown cause.

---

## INTEGRATION

```
Invoke during: problem-decomposition (Step 1 feeds into this)
               gap analysis (after simulation-protocol-SKILL.md produces gaps)
Produces:      level classification → determines response type and session scope
               root cause map → session ordering and session count estimate
References:    planning--problem-decomposition-SKILL.md
               planning--solution-scope-gate-SKILL.md (SK-434) — fix class per root
               planning--simulation-protocol-SKILL.md (SK-441) — gap input
```
