---
title: Diagnose Before Touching the Mock
impact: CRITICAL
tags: test-integrity, false-positive, mock, nestjs, DNA-compliance
---

## Diagnose Before Touching the Mock

**Impact: CRITICAL**

When a test fails after a code change, there are exactly two possible causes:

**Cause A — The code change is correct; the test mock is outdated.**
The test was written for the old behaviour. The new behaviour is intentional.
The mock needs to be updated to reflect the new contract.

**Cause B — The code change broke something real; the test found it.**
The test is correct. The test is revealing that the code change has a side
effect — usually making a guard path unreachable or bypassing a DNA check.
The code needs to be fixed, not the mock.

The failure mode is treating every Cause B as a Cause A. The mock gets
updated, it passes, and the problem is hidden.

**Diagnostic question:**
> "If I change the @nestjs/testing mock to make this test pass, does the
> guard I care about still execute — or does the new mock bypass it?"

---

## The Audit Procedure

Run these steps before touching any failing test or mock.

### Step 1 — Name the guard the test is supposed to exercise

Write it down explicitly:
```
This test is supposed to exercise: [guard name, e.g. "DNA-1 no-typed-model check"]
The guard lives at: [file + line, e.g. af1-genesis.ts L47]
```

### Step 2 — Trace what guards the test input must pass to reach that assertion

Starting from the AF station entry point, list every condition the input must
satisfy to reach the target assertion:

```
Guard 1: input.taskType is registered in factory registry
Guard 2: DNA-1 check — no typed model class in generated output
Guard 3: fabric.resolve() returns a valid IFabricService instance
Guard 4: DataProcessResult.success is true
```

### Step 3 — Check whether the proposed mock change bypasses any guard

For the current mock AND the proposed modified mock, check each guard:

| Guard | Current mock | Proposed mock |
|-------|-------------|---------------|
| DNA-1 check | → triggers correctly | mock returns pre-validated output → BYPASS |
| fabric.resolve() | real IFabricService | mock always returns success → BYPASS |

If the proposed mock bypasses any guard BEFORE reaching the target assertion:
**the test is not testing that guard. Stop. Go to Step 4.**

If the proposed mock passes all guards and reaches the target assertion:
**this is a legitimate mock update. Proceed.**

### Step 4 — If the mock bypasses the target guard, ask the real question

> "Why does the code produce output that fails the guard?"

This is the real bug. The test failure is a symptom. Options:

**Option A — The code is wrong; the guard is correct.**
The generated output violates a DNA rule. Fix the AF station or skill block
that produces the non-compliant output. Keep the mock strict.

**Option B — The guard is wrong for this input type.**
The guard was designed for a specific pattern but fires incorrectly for a
valid edge case. Fix the guard condition, not the mock.

**Option C — The test fixture is using an invalid contract input.**
The EngineContract fixture in the test has a field combination that the real
engine would never produce. Update the fixture to use a valid contract from
`server/src/engine-contracts/sample-contracts.ts`.

---

## Worked Example — DNA-1 Mock Bypass

**What happened:**

1. AF-1 genesis station adds DNA-1 validation: reject if generated output
   contains a typed model class (`class OrderModel {}`).

2. Test `generates valid service output` fails — generated output contains
   a class declaration that the new check rejects.

3. Attempted fix: mock the DNA validator to return `isValid: true` always.
   Test passes.

**What Step 3 would have revealed:**

| Guard | With mock bypass |
|-------|-----------------|
| DNA-1 check | mock intercepts before check → BYPASS |
| DataProcessResult.success | passes (DNA check never ran) |

Conclusion: the mock is intercepting the DNA check. The test now confirms
"the code runs when DNA check is disabled" — not "the code produces DNA-compliant output."

**The correct fix:**

The skill block injected by AF-4 is producing a service template that
includes a typed model. Fix the skill block template to use `Record<string,unknown>`
instead of typed classes. The DNA-1 guard is correct — the template is wrong.

---

## The Wrong Fix vs The Correct Fix

| Situation | Wrong fix | Correct fix |
|-----------|-----------|-------------|
| Test fails because DNA-1 check rejects output | Mock DNA validator to always pass | Fix AF station or skill template to produce compliant output |
| Fabric.resolve() throws in test | Mock to return any IFabricService | Verify the factory registration and provider binding |
| DataProcessResult shape mismatch | Mock to return expected shape | Fix the station that produces the wrong shape |
| EngineContract fixture has invalid fields | Change mock to accept any input | Use a real contract from `sample-contracts.ts` |

---

## Checklist

Before modifying any failing test or mock:

- [ ] Named the guard this test is supposed to exercise
- [ ] Listed all guards between AF station entry and the target assertion
- [ ] Verified the proposed mock change does NOT bypass any guard
- [ ] If mock bypasses a guard: stopped and asked "why does the code fail the guard?"
- [ ] Selected Option A, B, or C above and documented the decision in DECISIONS.md
