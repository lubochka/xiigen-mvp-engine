---
name: Verification Before Completion
description: Run verification commands and confirm output before claiming success
when_to_use: when about to claim work is complete, fixed, or passing, before committing or creating PRs
version: 1.1.0
languages: all
---

# Verification Before Completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

## Why This Matters

From 24 failure memories:
- your human partner said "I don't believe you" - trust broken
- Undefined functions shipped - would crash
- Missing requirements shipped - incomplete features
- Time wasted on false completion → redirect → rework
- Violates: "Honesty is a core value. If you lie, you'll be replaced."

## When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

## Count / Actor Honesty (universal, from core)

The Iron Law extends past "did it pass" to "how many" and "who did it":

```
NO COUNT CLAIMS WITHOUT COUNT-MATCHING EVIDENCE
NO SUB-AGENT CLAIMS WITHOUT A NAMED SUB-AGENT PACKET
```

Count/actor extension to the Gate Function:

```text
6. COUNT: If claiming N cycles/reviews/passes, show N independent evidence
   records of that exact type. Ledger rows, checklist rows, or a generated
   table are NOT cycles. 50 ledger rows after one real review is one review.
7. ACTOR: If claiming sub-agent work, show the sub-agent id/nickname, work
   order, returned packet, reviewed scope, and parent acceptance/rejection.
   Parent self-review is not a sub-agent review. Otherwise say the parent did
   it, or say the actor is not proven.
```

## XIIGen mvp Stack Commands (Gate-B mapping)

This repo is npm-based (`package-lock.json` in `server/` and `client/`).

| Claim | Command | Passing Evidence |
|-------|---------|-----------------|
| NestJS server tests pass | `npx jest --runInBand` | `Tests: ... 0 failed` |
| React/Vite client e2e | `npx playwright test` | `0 failed` |
| RAG sidecar healthy | `pytest` / FastAPI health probe | `0 failed` / `200 OK` |
| Type-check clean | `npx tsc --noEmit` | exit 0, 0 errors |
| Build succeeds | `npm run build` | exit 0 |
| Service registered (DI) | `rg "@Module\|@Injectable\(\)" server/src` | provider present |

The iron-law sits on the typed Result + these TS commands — `dotnet test` is NOT
the mvp gate. (Skill examples that mention `dotnet` belong to the .NET targets.)

## Runtime Evidence Firewall (universal, from core)

For RAG-quality, multi-SDK, orchestration, or end-to-end capability claims,
`passed: true` is not enough — the verification must prove the same KIND of
thing as the claim. Before any completion claim, REJECT the claim if the
evidence contains:

```text
validation_only: true
metric_type contains static
metric_type contains contract
metric_type contains mixed
cpu_ms: UNKNOWN
ram_mb: UNKNOWN
accuracy: UNKNOWN
build_or_static_contract_check without real runtime/library integration
compatibility_report_ref without an executed compatibility probe
rollback_ref without an executed rollback/load probe
```

Required downgrades (claim only the narrow truth):
- `tsc 0 errors` ≠ jest passes — proves type-check readiness only;
- `npm run build` clean ≠ runtime works — proves build readiness only;
- Playwright headless green ≠ real UX — proves headless scenario only;
- `passed:true` in JSON ≠ end-to-end — proves the JSON row only;
- a report existing ≠ behavior real — proves artifact creation only.

For RAG retrieval quality, a numeric FastAPI eval-scenario run is required, not
"looks better". Fresh evidence must be reproducible from the CURRENT runner /
generator code; if a persisted report would now produce a narrower or different
result, it is stale — mark the claim failed, regenerate, and continue.

## Two-PASS Gate (universal, from core)

There are two legitimate PASS states for a learning/adaptive capability, and
they must NEVER be reported as the same thing:

- **`PASS_AS_HONEST_UNTRAINED_SCAFFOLD`** — the contract/skeleton exists, it
  honestly reports `not_ready`, hides no deterministic shortcut (no regex / BM25
  / dictionary / direct-lookup answer dressed as smart), has no fake
  metrics/checkpoint, and its honesty is PROVEN by tests. A real milestone, not
  a working feature.
- **`PASS_AS_TRAINED_FEATURE`** — the learned capability is real: held-out
  numeric metrics + ablation + fresh-load + continue-training + e2e through the
  real entrypoint.

Reporting a scaffold as a trained feature is the masquerade class — the most
dangerous false positive. (Per R5, common models live in `llm_mvp_core`; mvp
consumes them through manifests/locators — so the trained-feature path here is
typically the consuming/integration evidence, not local model training.)

## Completion Coverage Matrix (universal, from core)

For multi-step plans, fresh verification also means proving the command covers
EVERY literal requirement of the active plan. Before any final completion claim,
require a matrix with: `requirement_id`, `literal_requirement`,
`expected_literal_set`, `actual_artifact`, `actual_value`, `comparison_operator`,
`passed`, `gap`, `next_plan_action`.

Reject completion when:
- a lower-level report says `passed: true` but the matrix lacks the plan's full
  literal set;
- a top-level bucket count is used instead of the required underlying classes;
- "at least one" is used where the plan says "all", "every", or lists exact
  items;
- state says `goal_reached: true` while a matrix row still has a gap.

If any row fails, the only truthful status is `IN_PROGRESS_NEXT_STEP_KNOWN`:
copy the first failed row into `next_action` and continue — do not emit a final
report.

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.
