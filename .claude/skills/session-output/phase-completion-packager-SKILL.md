---
name: phase-completion-packager
sk: SK-427
description: >
  The procedure Claude Code follows at the end of every phase, after the
  gate passes. Produces three artifacts: EXECUTION-LOG (machine-readable),
  PHASE-COMPLETE (human-readable for Luba), and SESSION-BRIEF (structured
  for the next web planning session). Never runs if the gate failed.
  Supports two gate models: absolute (sequential flows) and delta (parallel
  wave flows). Gate model determined by parallel_wave field in STATE.json.
layer: session-output
version: 1.1.0
createdAt: 2026-03-20
updatedAt: 2026-03-20
requires: [SK-426]
complements: [SK-428, SK-429]
---

# PhaseCompletionPackager [SK-427]

## Purpose

When a phase gate passes, Claude Code has all the information needed to
package the session cleanly. This skill defines the exact procedure:
what three files to produce, in what order, what each must contain,
and how to stop cleanly so the next session starts cold from the package.

## Gate Models — Read STATE.json First

Before running any gate check, read `parallel_wave` from STATE.json:

```
parallel_wave: null  → SEQUENTIAL mode (FLOW-01, FLOW-02, infrastructure flows)
                       Gate: npm test total ≥ {absolute_baseline}

parallel_wave: N     → PARALLEL mode (Wave 2+: FLOW-03 through FLOW-24)
                       Gate: jest --testPathPattern=test/flow-XX delta ≥ {expected_delta}
                       Total absolute baseline verified post-merge by CI — not here.
```

**Never apply the absolute gate in parallel mode.** The absolute baseline on
`main` will have moved as other instances merged. Your branch's total count
reflects your changes only — that is the correct gate.

## When to Invoke

After every phase gate passes — specifically after:
```
□ npx tsc --noEmit = 0 errors
□ Gate passes (absolute or delta — per parallel_wave flag)
□ All phase-specific checks from the SESSION file pass
```

Never invoke if any gate check fails.

## Gate Check — Two Models

### Sequential mode (parallel_wave: null)

```bash
cd server && npm test -- --silent 2>&1 | tail -5
# Assert: total passing ≥ {absolute_baseline}
```

### Parallel mode (parallel_wave: N)

```bash
# Check only this flow's test files
cd server && jest --testPathPattern=test/flow-{XX} --silent 2>&1 | tail -5
# Assert: FLOW-XX test files pass all {expected_delta} tests
# (Do NOT assert total baseline — post-merge CI handles that)

# TypeScript compile always runs regardless of mode
cd server && npx tsc --noEmit 2>&1 | tail -3
# Assert: 0 errors
```

## Procedure — Three Files in Order

### File 1: EXECUTION-LOG-{phase}.json (machine-readable)

Write per SK-426 schema to `sessions/FLOW-XX/EXECUTION-LOG-{phase}.json`.
In parallel mode, add `parallel_wave` and `test_delta` fields:

```json
{
  "flow_id": "FLOW-03",
  "phase": "E",
  "parallel_wave": 2,            // null in sequential mode
  "wave_baseline_entry": 4308,   // test count when Wave 2 started
  "test_delta": 28,              // tests added by this flow
  "test_baseline_entry": null,   // not applicable in parallel mode
  "test_baseline_exit": null,    // not applicable in parallel mode
  // ... rest of SK-426 schema
}
```

### File 2: PHASE-COMPLETE-{phase}.md (human-readable — for Luba)

```markdown
# FLOW-XX Phase {letter} Complete — {phase_title}
## {completed_at}
## Mode: {SEQUENTIAL | PARALLEL Wave N}

## What Was Built
[2–4 sentences in plain English: what the phase produced and why it matters.
Not a list of files — the meaning of the work.]

## Gate Results
| Check | Result | Value |
|-------|--------|-------|
| TypeScript compile | ✅ PASS | 0 errors |
| Test gate | ✅ PASS | {delta} new FLOW-XX tests pass (parallel mode) |
|           |        | OR: {total} passing (+{delta} from {entry}) (sequential mode) |
| [phase-specific checks] | ✅ PASS | ... |

## Artifacts Registered
[Only if artifacts were registered this phase:]
Task types: T47, T48, T49   (from pre-allocated range in STATE.json)
Factories:  F174–F181
BFA rules:  CF-1–CF-8

## Files Changed
[List of files created/modified with one-line summary each.]

## Cost
[Only if AI generation ran:]
Total: ${total_usd:.2f} across {rounds_run} rounds

## What's Next
Phase {next_letter}: {next_phase_title}

## ⛔ STOP — Do not proceed to Phase {next_letter} without approval
```

**Additional rules for parallel mode:**
- State the mode explicitly: "Mode: PARALLEL Wave 2"
- Artifacts Registered must reference pre-allocated ranges from STATE.json
- Gate Results must show delta count, not absolute (prevents confusion when Luba
  sees 28 tests, not 4336, and wonders if something regressed)

**Rules for PHASE-COMPLETE.md (all modes):**
- "What Was Built" is prose — not bullets, not file lists
- Gate results table is exact — no approximations
- "Open Items" section ONLY appears if something genuinely needs Luba's decision
- Last line is always the STOP instruction with the next phase letter

### File 3: SESSION-BRIEF-{phase}.md (structured — for next web session)

Written per SK-428 schema. In parallel mode, SESSION-BRIEF must include:
```
parallel_wave: {N}
wave_baseline_entry: {count when wave started}
pre_allocated_ranges: {from STATE.json — ranges used this flow}
```

### File 4: Git report (append to PHASE-COMPLETE.md)

Run SK-429 PhaseGitReport and append under "## Git Changes".

## Invocation in SESSION Files

Every SESSION file ends with this section:

```markdown
## PHASE GATE

# Determine gate model
# Read parallel_wave from STATE.json
# If null: absolute gate. If N: delta gate.

# TypeScript (always):
cd server && npx tsc --noEmit 2>&1 | tail -3

# Tests (gate model determines which command):
# Sequential: cd server && npm test -- --silent 2>&1 | tail -5
# Parallel:   cd server && jest --testPathPattern=test/flow-XX --silent 2>&1 | tail -5

[phase-specific gate checks]

## PHASE COMPLETION PACKAGE
# Run only after ALL gate checks above pass

# 1. Write execution log (with parallel_wave field if applicable)
[Claude Code writes sessions/FLOW-XX/EXECUTION-LOG-{phase}.json per SK-426]

# 2. Write phase-complete document
[Claude Code writes sessions/FLOW-XX/PHASE-COMPLETE-{phase}.md per SK-427]

# 3. Write web session brief
[Claude Code writes sessions/FLOW-XX/SESSION-BRIEF-{phase}.md per SK-428]

# 4. Append git report
[Claude Code runs SK-429 and appends to PHASE-COMPLETE-{phase}.md]

## ⛔ STOP
Present PHASE-COMPLETE-{phase}.md and wait for explicit approval.
Do NOT proceed to Phase {next} without written "yes".
```

## Positive Example

```
Phase E gate passes in parallel mode (FLOW-03, Wave 2).
STATE.json: parallel_wave = 2, wave_baseline_entry = 4308

Claude Code runs:
  jest --testPathPattern=test/flow-03 → 28 tests pass ✅
  npx tsc --noEmit → 0 errors ✅

Claude Code produces:
  ✅ sessions/FLOW-03/EXECUTION-LOG-E.json  (parallel_wave: 2, test_delta: 28)
  ✅ sessions/FLOW-03/PHASE-COMPLETE-E.md   (Mode: PARALLEL Wave 2, delta shown)
  ✅ sessions/FLOW-03/SESSION-BRIEF-E.md    (parallel context included)

Claude Code presents PHASE-COMPLETE-E.md and stops.
Does NOT start next phase or check absolute test count.
```

## Negative Examples

```
WRONG: Running absolute gate in parallel mode
  cd server && npm test  ← sees 4336 total, not 28 delta
  → Another instance may have merged since wave started. Baseline has moved.
  → Use delta gate when parallel_wave is set.

WRONG: Writing completion package before gate passes
  → Gate must pass first. Always.

WRONG: Chaining into next phase
  → The package ends with ⛔ STOP. Stop means stop.

WRONG: Missing parallel_wave in EXECUTION-LOG
  → Post-merge CI uses this field to identify parallel-mode phases.
  → Always include parallel_wave from STATE.json.

WRONG: Showing absolute test count in PHASE-COMPLETE for parallel mode
  "3,336 tests passing"
  → Luba doesn't know if this is correct without knowing the baseline.
  → Show: "28 new FLOW-03 tests pass (parallel mode — absolute verified by CI)"
```

## Universal Additions (from core)

The `⛔ STOP — wait for approval` above is the contract for a **product-session
flow phase** (FLOW-XX sequential/parallel work that ends at a human approval
boundary). The following universal rules QUALIFY it for other plan shapes — they
do not delete it.

### Continuous-Plan Exception (gate pass = checkpoint, not STOP)

When the active plan is a **continuous multi-step plan** with a STATE file that
says `goal_reached=false`, `stop_allowed=false`, and a non-empty `next_action`,
a passing phase gate is a CHECKPOINT, not a user-facing STOP. The packager still
writes the three artifacts, but the next action is to execute `next_action`, not
to wait for approval. Soft-stop wording ("I can continue", "next step is…",
"checkpoint committed") used as a final pause in that state is a violation.

How to tell which contract applies:
- product flow phase ending at a human decision → keep the `⛔ STOP`;
- continuous plan with `next_action` set → checkpoint, continue the loop;
- a commit/push is a checkpoint boundary, never a STOP, in either case.

### Two-PASS Gate (do not report a scaffold as a feature)

When the phase delivers a learning/adaptive capability, the PHASE-COMPLETE must
state which PASS it reached, and they are NOT interchangeable:
- **`PASS_AS_HONEST_UNTRAINED_SCAFFOLD`** — contract/skeleton exists, honestly
  reports `not_ready`, hides no deterministic shortcut, has no fake metrics, and
  its honesty is proven by tests. A real milestone, not a working feature.
- **`PASS_AS_TRAINED_FEATURE`** — real held-out numeric metrics + ablation +
  fresh-load + continue-training + e2e through the real entrypoint.

(R5: common models live in `llm_mvp_core`; in mvp the trained-feature path is the
consuming/integration evidence, not local model training.)

### Target Outcome Completion (close Luba's named outcome, not a narrow packet)

If Luba named a final outcome (e.g. "RAG quality improves", "the flow is fully
functional"), the packaging target is that literal outcome. A PHASE-COMPLETE that
proves only a narrower truthful packet, or whose matrix marks a binding target
`NOT_PROVEN`, is a false-completion signal — set `IN_PROGRESS_NEXT_STEP_KNOWN`
and continue the review/fix floor, unless Luba explicitly accepted the narrower
scope.

### Review/Fix Floor + count honesty

If the plan asked for N review/fix cycles, the package counts only N independent
inspectable before/after records. N ledger rows after one real review is one
review. Parent self-review is not a sub-agent review.

## Integration

```
requires:    SK-426 (ExecutionLog — written first, feeds Files 2 and 3)
complements: SK-428 (WebSessionHandoff — defines SESSION-BRIEF format)
             SK-429 (GitReport — appended to PHASE-COMPLETE)
reads:       STATE.json → parallel_wave field (determines gate model)
             STATE.json → goal_reached / stop_allowed / next_action (continuous-plan exception)
```
