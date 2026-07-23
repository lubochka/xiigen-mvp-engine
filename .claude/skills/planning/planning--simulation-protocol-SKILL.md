---
name: simulation-protocol
sk_number: SK-441
version: "2.0.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-03-25"
contexts: ["web-session", "claude-code"]
description: >
  When evaluating whether XIIGen can handle a scenario, trace what the
  ACTUAL handlers do at each step. Produce a step table with handler,
  input availability, and verdict per step. SILENT_FAILURE — the engine
  runs but produces wrong output with no visible signal — is the highest
  priority verdict because it ships to production and corrupts training data.
  Cannot be skipped: "it probably works" is not a verdict.
triggers:
  - "can xiigen handle"
  - "trace what happens when"
  - "simulate this scenario"
  - "what breaks"
  - "does this work end to end"
  - "gap analysis"
  - "will this flow work"
  - "trace the handlers"
  - "what actually happens"
  - "simulate a run"
  - "would this work for wordpress"
  - "what does xiigen do when"
---

# Simulation Protocol Skill v1.0 (SK-441)

## WHEN TO INVOKE

When evaluating whether XIIGen can handle a scenario — any scenario.
Before any flow plan is accepted. Before claiming a stack is "supported."
Before claiming a capability "works."

Do NOT skip simulation by reasoning from theory. Trace what the actual
handlers receive as input and what they produce. If the input is missing,
the handler breaks — regardless of whether it could theoretically handle
the request.

---

## THE STEP TABLE

Produce one step table per scenario, or per sub-scenario in complex cases.

```
| Step | What must happen | Handler | Input ✅/⚠️/❌ | Output expected | Actual | Gap? |
```

### Handler column — valid values only

```
ai-generate.handler         rag-retrieve.handler
validate.handler            score.handler
route.handler               feedback.handler
decompose.handler           [IFabricInterface].method
collect.handler             HUMAN  (explicit manual step — always flag this)
loop.handler                NONE   (nothing handles this — always a gap)
```

Never write "the engine" or "the pipeline." Name the exact component.
If you don't know which component: write NONE and flag as a gap.

### Input column — per EACH piece of data the step needs

```
✅  exists and is accessible to this handler in its current wiring
⚠️  exists somewhere but not accessible (wrong index, wrong format, not wired to handler)
❌  does not exist anywhere in the system
```

Every input the handler needs gets its own symbol. A step with one ❌ input
and four ✅ inputs is BREAKS — not PARTIAL.

### Actual column — five verdicts

```
WORKS          — handler exists, all inputs ✅, output is correct
PARTIAL        — handler exists, some inputs ⚠️, output is degraded but present
BREAKS         — handler is NONE, or any critical input is ❌
WRONG          — handler runs, inputs are present, but output is incorrect
SILENT_FAILURE — WRONG with no observable error signal (highest priority — see below)
```

### Gap column — required for BREAKS and WRONG

```
root_cause:    [one sentence — what doesn't exist that should]
symptom_test:  [if root cause is fixed, does this symptom disappear? yes/no]
fix_class:     CONTENT | INTERFACE | EXTENSION | NEW_HANDLER | INFRASTRUCTURE
```

---

## SILENT_FAILURE — HIGHEST PRIORITY VERDICT

A BLOCKS verdict is visible. Someone sees the error and fixes it.
A SILENT_FAILURE runs to completion, produces output, stores results —
and every downstream component receives wrong data. It corrupts training
data with every execution.

**Test for SILENT_FAILURE:** does the engine continue running after this step?
If yes, AND the output is wrong: verdict is SILENT_FAILURE, not BREAKS.

### Common SILENT_FAILURE patterns in XIIGen

```
Named check runs NestJS regex on WordPress code
  → validate.handler fires, returns a result → AF-9 score is wrong
  → correct PHP code is penalized; incorrect PHP may pass
  → DPO triple captures wrong quality signal → learning loop trains on lies

DPO triple stored without prompt.system or targetStack
  → feedback.handler runs, triple written → triple exists and looks correct
  → unusable for supervised fine-tuning; mixed-stack triples corrupt local model

Iron rule references "SETNX" (Redis mechanism) not the concept
  → validate.handler checks for SETNX → WordPress INSERT IGNORE fails check
  → correct WordPress code gets penalized → wrong quality signal stored

Arch pattern codeSnippet contains NestJS TypeScript only
  → rag-retrieve.handler returns the pattern → AF-1 receives NestJS code as
     context for PHP generation → biases output toward NestJS patterns

AF-9 judge prompt references NestJS decorators (@Injectable, @Throttle)
  → score.handler runs, produces score → score appears valid
  → correct PHP scores 0.50 for missing NestJS idioms → metric diverges from reality

Single-model DPO triple stored as valid training data (P17 violation)
  → multi-generate.handler runs ONE provider → feedback.handler stores triple
  → triple has chosen.code but chosen.model === rejected.model (same family)
  → DPO validity gate absent or not enforced
  → Result: fine-tuning trains on intra-model style drift, not genuine quality
    comparison. Local model learns to mimic generator's quirks, not avoid its failures.
  → Silent because: LEARNING-003 passes (chosen/rejected present), test suite passes,
    score looks valid. Corruption only visible when fine-tuned model degrades.

Same-model score.handler producing inflated scores (P17 violation)
  → score.handler calls AI_JUDGE_PROVIDER once for all 5 evaluator dimensions
  → judge has no domain specialization → scores reflect model confidence, not expertise
  → high-confidence wrong scores are stored → DPO triple treats them as correct signal
  → Result: learning loop reinforces bad patterns. Cycle scores improve while code quality
    stays flat or degrades.
  → Silent because: scores are within expected range, test suite passes, no exceptions.
    Only detectable by cross-run comparison showing score-quality divergence.

FLOW-39-not-active masking all teaching quality gates (P18 violation)
  → V9 skip condition "Skip if: FLOW-39 not yet ACTIVE" was present (C-2, now fixed)
  → All DPO triples from FLOW-01..24 stored with curriculumTier: null
  → All shadow run records missing (no xiigen-shadow-runs placeholders)
  → Result: when FLOW-39 activates, it finds 24 flows of useless training data.
    Curriculum cannot be built from null-tier triples. Independence timeline reset.
  → Silent because: flows complete successfully, test counts increase, all gates pass.
    V9 was skipped every phase so no check ever fired. Visible only when FLOW-39 runs.
  → Guard (C-2 now applied): V9 never skips. When FLOW-39 inactive, use interim manual
    path: assign tiers manually, create shadow placeholders. This warning now catches it.
```

**Prioritize SILENT_FAILUREs above all other verdicts in every simulation.**
List them first. Fix them in Phase Zero before any flows run.

---

## DEPTH LEVELS

Choose the depth level based on what question the simulation must answer.

### L1 — Decomposition only

How does this task break into sub-tasks? What handler (or NONE) handles each?

```
Use for:
  - Complex orchestration scenarios where the structure itself is uncertain
  - First pass on a new scenario before committing to full L2 trace
  - Scenarios with >10 steps (decompose first, then L2 per sub-task)

Output: list of sub-tasks with handler or NONE, and gap flag if NONE
```

### L2 — Full handler chain

Trace every step through all handlers. Mark every input. Assign every verdict.

```
Use for:
  - Specific flows where execution correctness is the question
  - Any scenario that passed L1 and needs correctness verification
  - Flow plans before they are submitted for implementation

Output: complete step table, all gaps identified with root cause and fix class
```

### L3 — Full with learning path

L2 plus a trace of what training data is produced at each signal point.

```
Use for:
  - Canonical flows (FLOW-01/02/03) where learning loop quality matters
  - Any scenario where "does this produce correct training data?" is the question
  - Pre-FLOW-01 validation that DPO triples will be usable

Output: step table + learning signal trace (see below)
```

---

## LEARNING PATH TRACE (L3 only)

After the main step table, add a signal table:

```
| Signal | When it fires | Input complete? | Gap if broken |
|--------|--------------|-----------------|---------------|
| DPO triple | feedback.handler completes | prompt.system: ✅/❌ | Fine-tuning unusable |
|            |                           | targetStack: ✅/❌  | Mixed-stack corruption |
| OUTCOME signal | score.handler completes | patternsRetrieved: ✅/❌ | RAG improvement disabled |
| DESIGN_REASONING | Gate C | decision recorded: ✅/❌ | Design loop gets no signal |
| CONVERGENCE_SESSION | convergence.handler | requires Task 7: ✅/❌ | NODE quality untracked |
```

Any signal with a ❌ input is a learning gap. Learning gaps in FLOW-01 compound
across 24 flows — each flow adds more broken or missing training data.

---

## THE PER-STACK RULE

**Always simulate at least two stacks** for any generation scenario.

NestJS WORKS does not mean the scenario works.
WordPress BREAKS means the scenario does NOT work.

The stacks diverge at the point where stack-specific content is first needed.
This is typically:
- Step 5: AF-1 genesis prompt assembly (reads stackCoupling or PROJECT_UNDERSTANDING)
- Step 7: AF-9 judge scoring (uses stack-specific or concept-neutral criteria)
- Step 9: validate.handler named checks (regex variants or concept checks)

For scenarios with no alternative stack simulation, the verdict is PARTIAL
at best — not WORKS. Mark as incomplete and note which stack was not traced.

---

## GAP FORMAT

Every gap found during simulation must be recorded in this format:

```
GAP ID:      [scenario-code]-G[number]  (e.g. A1-G3, F3-G4)
NAME:        [short name — max 8 words]
FOUND IN:    [scenario where first observed]
ALSO HITS:   [other scenarios with the same root cause — fill in during dedup]

ROOT CAUSE:  [one sentence — what doesn't exist that should]

SYMPTOM:     [what you observe in the step table]
ROOT:        [what is actually missing from the engine]
SYMPTOM_TEST: [if root is fixed, does symptom disappear? yes/no]

FIX CLASS:   CONTENT | INTERFACE | EXTENSION | NEW_HANDLER | INFRASTRUCTURE
PRIORITY:    SILENT_FAILURE → BREAKS → WRONG → PARTIAL
```

---

## SCENARIO GROUPS

Use these groups when selecting scenarios to simulate. Each group covers
different gap classes.

```
Group A — Flow execution:
  Existing flow plans (FLOW-01, FLOW-02, FLOW-03) against NestJS + one alternative stack.
  Best at finding: SILENT_FAILURE gaps, per-stack training data corruption.

Group B — Product scenarios:
  User-facing scenarios from the founding brief (diet app, Figma intake, content pipeline).
  Best at finding: ORCHESTRATION gaps (missing handlers), TOOL gaps (fabric interfaces).

Group C — Operational scenarios:
  Deploy-test-integrate, monitoring, regression.
  Best at finding: LEARNING gaps (training data quality), IDeploymentService.

Group D — Domain intake:
  Arbitrary user codebase or system description.
  Best at finding: intake pipeline gaps, PROJECT_UNDERSTANDING gaps.
```

For a comprehensive gap catalog before FLOW-01: simulate at least one scenario
from each group. Diminishing returns beyond two per group.

---

## ANTI-PATTERNS

```
❌ "The engine can probably handle this" — probably is not a verdict
   → Name the handler or write NONE. Trace the inputs. Assign a verdict.

❌ Simulating only NestJS and calling the scenario complete
   → NestJS WORKS + WordPress BREAKS = the scenario does NOT work
   → Always run at least one alternative stack trace

❌ Marking BREAKS when the correct verdict is SILENT_FAILURE
   → Ask: does the engine continue running after this step?
   → If yes and output is wrong: SILENT_FAILURE, not BREAKS
   → BREAKS is visible and gets fixed. SILENT_FAILURE ships.

❌ Reasoning from theoretical handler capability
   → "ai-generate.handler can do this" is not a verdict
   → Trace what it receives as input. If any critical input is ❌: BREAKS.

❌ Stopping at the first BREAKS without completing the table
   → SILENT_FAILUREs downstream of a BREAKS are still SILENT_FAILUREs
   → Complete the table even when early steps break

❌ Treating all gaps as independent
   → Before planning, run cross-gap convergence (see root-cause-ladder-SKILL.md)
   → 50 gaps often have 5-6 root causes → session count collapses dramatically
```

---

## INTEGRATION

```
Invoke before: any claim that a capability "works" or a stack is "supported"
Invoke during: flow plan review, pre-FLOW planning sessions
Produces:      step tables → feed into gap catalog
               gaps → feed into solution-scope-gate-SKILL.md (classify + deduplicate)
               gaps → feed into root-cause-ladder-SKILL.md (cross-gap convergence)
References:    planning--solution-scope-gate-SKILL.md (SK-434) — gap classification
               planning--root-cause-ladder-SKILL.md (SK-432) — root cause + convergence
               code-execution--flow-design-check-catalog.md — handler reference
```
