---
name: code-examination-skill
version: "1.0.0"
priority: RECOMMENDED
load_order: 15
author: luba
updated: "2026-03-18"
description: >
  Pre-change analysis discipline. Before modifying any AF station, fabric provider,
  DNA guard, or skill block: read the code, understand what it does, map its
  dependencies, and form a hypothesis. Prevents "fix by guess" and mutation of
  code you do not understand.
---

# Code Examination Skill v1.0

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

---

## Integration

```
code-examination-skill (understand)
  → mental-debug-skill (diagnose runtime failure)
  → bug-to-tests-skill (write 3 failing tests)
  → three-level-verification (verify fix at all 3 levels)
```

---

## One-Line Summary

> "Read the whole file. Map callers and consumers. Form a hypothesis.
> Only then touch the code."
