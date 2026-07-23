---
name: code-examination-skill
version: "1.1.0"
priority: RECOMMENDED
load_order: 15
author: luba
updated: "2026-04-07"
description: >
  Pre-change analysis discipline with two modes: (1) pre-modification examination —
  read the code, map dependencies, form a hypothesis before touching anything;
  (2) plan-against-codebase verification — before accepting any plan claim about
  current codebase state, verify it against the live code. v1.1 adds mode 2 plus:
  gate adequacy check, already-shipped detection, and automated-vs-manual test
  classification. Prevents fix-by-guess AND review-by-document.
---

# Code Examination Skill v1.1

## The Rule

> **Understand before touching.**
> Never modify a file you have not read and understood in the context of its callers.

---

## When to Invoke

- Before modifying any AF station (`server/src/af-stations/*.ts`)
- Before modifying any fabric provider (`server/src/fabrics/**/*.ts`)
- Before modifying any DNA guard (`server/src/dna/*.ts`)
- Before any Phase 11 code modification gate
- When a bug report references a file you have not read this session
- **When reviewing a plan that makes claims about current codebase state**
  (triggers Mode 2 — Plan-Against-Codebase Verification)
- When a plan says a component "needs to be wired" or "is missing"
- When a plan describes a fix as unaddressed that may already be shipped
- When evaluating whether a gate in a plan actually tests its stated invariant

---

## The Examination Protocol (5 steps)

### Step 1 — Read the file completely

```bash
# Read target file
cat server/src/af-stations/<station>.ts

# Read its interface contract
cat server/src/engine-contracts/<contract>.ts
```

Do not skip lines. Do not scan for the "relevant section." Read the whole file.

### Step 2 — Map upstream callers

```bash
grep -r "<StationName>\|<MethodName>" server/src/ --include="*.ts" -l
```

Identify every caller. A change to an AF station output shape affects all downstream
stations that consume it. A change to a fabric provider method signature affects all
AF stations that call it.

### Step 3 — Map downstream consumers

For AF stations: identify which AF station consumes this station's `DataProcessResult`.
For fabric providers: identify all AF stations that call this provider.

```
af2-planning → af4-rag-context → af9-judge → af11-feedback
                                          ↑ also reads af4 output
```

### Step 4 — Form a hypothesis BEFORE reading tests

State in words: "I believe this code does X because Y. If I change Z, then W will break."

Write it down before looking at tests. Tests confirm or refute your hypothesis.
If your hypothesis is wrong, re-read the code.

### Step 5 — Read the test file

```bash
cat test/af-stations/<station>.spec.ts
```

Verify: does the test match your mental model? If not, your model is wrong — fix the model first.

---


---

## Mode 2 — Plan-Against-Codebase Verification

**Trigger:** A plan makes a claim about the current state of the codebase.

The five failure modes from a 2026-04-07 review session that this mode prevents:
1. Plan assertion accepted as ground truth without codebase check
2. Gate evaluated as "exists" without asking if it can pass while the invariant is violated
3. Phases read in isolation with no cross-reference pass
4. Plan treats already-shipped work as unaddressed
5. Manual `curl` steps classified as automated test gates

### Step A — Extract all codebase claims from the plan

Read the plan and list every sentence that asserts something about the current
state of the code. Examples of claims:

```
❌ "ConvergenceHandler is not registered in engine.module.ts"
❌ "cycle2Traces is empty because rejected NODEs are silently skipped"
❌ "Three providers are called but not independently"
❌ "Phase 0 fixes the silent-skip behaviour — this has not been addressed"
```

Each claim must be verified. A plan reviewer who accepts these as true without
checking is not doing a plan review — they are doing a readability check.

### Step B — Verify each claim against the codebase

For each claim extracted in Step A:

```bash
# Claim: "X is not registered in Y"
grep -n "X\|ClassName" server/src/path/to/Y.ts
# If found: claim is wrong. State the contradiction before proceeding.

# Claim: "cycle2Traces is empty / not populated"
grep -n "cycle2Traces" server/src/ -r --include="*.ts"
# Read every line found. Determine: does the current code push to this array?
# Check recent commits for changes to this behavior.

# Claim: "this fix has not been addressed"
git log --oneline --all | grep -i "keyword from the claimed fix"
# If found: the fix may already be shipped. Verify the commit contents.
git show <commit-hash> -- server/src/path/to/file.ts | head -50
```

**Rule:** If a claim is contradicted by live evidence → state the contradiction
explicitly in the review output before continuing. Do not silently accept the
plan's framing.

### Step C — Gate adequacy check

For every gate in every phase, ask one question:

> **Can this gate pass while the invariant it claims to test is violated?**

```
Gate: "verify all three providers called"
Invariant claimed: three-model independence
Question: can three providers be called sequentially (not independently) and
          still pass this gate?
Answer: yes — sequential calls and independent calls both trigger the same grep.
Verdict: GATE INADEQUATE — does not test independence
Required addition: test must verify each model is called with its OWN output
                   as context, not with another model's output
```

A gate that can pass while its invariant is violated is not a gate. Flag it.

### Step D — Automated vs manual classification

For every gate check in a phase, classify it:

```
AUTOMATED: runs in the test suite, fails CI if broken
  Examples: npx jest --testPathPattern=..., npx tsc --noEmit
  Verdict: reliable gate

SEMI-AUTOMATED: a shell command that queries live state
  Examples: curl localhost:9200/..., grep -c "..." file.ts
  Verdict: testable but not part of CI — requires Docker running

MANUAL: requires human judgment to evaluate
  Examples: "manually verify the NODE spec contains step-specific constraints"
            "check that round 1 scores are in 6.5–8.0 range"
  Verdict: NOT a gate — a human observation step
```

Any gate marked as a gate that is actually MANUAL must be flagged:
- Either convert to an automated assertion
- Or relabel as "observation step" and remove from the pass/fail criteria

### Step E — Already-shipped detection

For each deliverable in the plan, check whether it already exists:

```bash
# Plan says: "fix cycle2Traces to record rejected NODEs"
git log --oneline --all --grep="cycle2Traces\|rejected" | head -5
# If a commit exists: check what it did
git show <hash> --stat | grep "convergence\|cycle-chain"
# Read the diff for the relevant file
git show <hash> -- server/src/engine/path/to/file.ts | grep "cycle2Traces" | head -10
```

If the work is already shipped:
- State: "This deliverable appears to be complete as of commit [hash]"
- Remove it from the plan scope
- Add it to a "COMPLETED — verify only" section
- Do not re-implement what already exists

---

## Diagnostic Routing Table

When you observe a symptom, apply this table to choose which `mental-debug` rules to invoke:

| Symptom | Apply First | Then |
|---------|-------------|------|
| Generated code has DNA violation | `pattern-recognition-verdicts` → `contextual-gap` | `generated-service-audit` |
| Fabric returns wrong result | `boundary-data-lifecycle` → `fabric-resolution-trace` | `async-local-storage` |
| Tenant isolation broken | `tenant-scope-leak` → `boundary-data-lifecycle` | `loop-state-delta` |
| AF pipeline quality flatlines | `contextual-gap` (skill blocks missing?) | `mental-execution` on feedback→rag chain |
| BFA false positive | `boundary-message-map` → `loop-state-delta` | `sibling-guard-parity` |
| Unexpected silent success (no error but wrong output) | `error-silent-catch` → `mental-execution` | `contextual-gap` |

---

## Anti-Patterns

### AP-1: Grepping for the bug location without reading context
```
grep -r "qualityScores" server/src/  # ← then edit only the matching line
```
**Why wrong:** The matching line may be correct; the caller may be setting the wrong field.
Read the full chain.

### AP-2: Reading tests before reading implementation
Tests describe behavior, not mechanism. Reading tests first gives you a mental model
of the contract, not of the implementation. Read implementation first, tests second.

### AP-3: "I know this file — I don't need to re-read it"
Code changes. Session context does not persist across conversations.
Re-read every file you intend to modify, every session.

### AP-4: Modifying without a written hypothesis
If you cannot state in one sentence what the code does and what your change will affect,
you are not ready to modify it. Write the hypothesis. Then modify.

### AP-5: Accepting plan assertions without codebase verification
A plan says "X is not wired" or "Y is missing." The model reads this and begins
planning how to wire X or add Y — without first checking whether X is already wired
and Y already exists. This produces work that re-implements what already exists, or
fixes a gap that was already closed in a prior commit.
The correct behavior: every plan claim about codebase state is a hypothesis, not a
fact. Verify before accepting.

### AP-6: Evaluating a gate by its existence, not its adequacy
A gate exists. The model notes "gate exists" and moves on. The correct behavior:
ask whether the gate can pass while the invariant it claims to test is violated.
If yes — the gate is inadequate. Flag it before the plan proceeds to Claude Code.

### AP-7: Classifying a curl command as a test gate
A phase gate includes `curl localhost:9200/...`. The model marks the gate as testable.
The correct classification: SEMI-AUTOMATED (requires Docker running, not in CI).
A plan gate that requires a running server to evaluate is not an automated gate.
Flag the distinction so Claude Code knows which gates require prior setup.

---

## Integration

```
Mode 1 — pre-modification:
  code-examination-skill (understand)
    → mental-debug-skill (diagnose runtime failure)
    → bug-to-tests-skill (write 3 failing tests)
    → three-level-verification (verify fix at all 3 levels)

Mode 2 — plan verification:
  code-examination-skill Mode 2 (verify plan claims)
    → plan-review-skill FC-13 (cross-phase consistency)
    → agent-constitution Critique-Response Protocol (when claim is wrong,
      ask one question before proposing a correction)
```

---

## One-Line Summary

> "Read the whole file. Map callers and consumers. Form a hypothesis.
> Only then touch the code."
>
> Mode 2: "Every plan claim about codebase state is a hypothesis.
> Verify before accepting. A gate that can pass while its invariant is
> violated is not a gate."
