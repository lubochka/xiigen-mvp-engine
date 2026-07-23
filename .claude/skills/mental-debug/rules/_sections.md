# Debugging Session Structure

## Full Session Template

Use this template for every debugging session where the root cause is not immediately obvious.

---

### Section 1: Observation

```
Actual output:    [what the system produced]
Expected output:  [what it should have produced]
First seen:       [commit / phase / test name where it appeared]
Reproducible:     [always / sometimes / only in production]
Tenant:           [which tenantId shows the bug, or "all"]
```

### Section 2: Isolation

```
Divergence point: [which component boundary produces the wrong value]
Last correct:     [the last station/provider that had correct data]
First wrong:      [the first station/provider that had wrong data]
Boundary:         [AF station → AF station | station → fabric | fabric → queue | ...]
```

### Section 3: Hypothesis

```
Assumed true by code: [what the code assumed was true about its input]
Actually true:        [what was actually true]
Gap:                  [the difference between assumption and reality]
```

### Section 4: Rule Routing

```
Symptom:   [one-sentence description of the observed symptom]
Rule:      [which of the 14 rules applies — see SKILL.md routing table]
Rationale: [why this rule matches this symptom]
```

### Section 5: Verification

```
Checklist item:  [specific checklist item from the rule that confirmed hypothesis]
Evidence:        [log line / test failure / code path that confirmed it]
Eliminated:      [rules that were considered but eliminated, and why]
```

### Section 6: Fix

```
Engine change:   [file:line of the fix — not the output, the engine]
What changed:    [exact description of the code change]
Why this fixes:  [how this change closes the gap between assumption and reality]
DNA affected:    [DNA-N if any pattern is involved, or N/A]
BFA affected:    [FLOW-XX if any BFA flow is involved, or N/A]
```

### Section 7: Test

```
BUG-ENGINE-NN:  [file this bug using engine-qa/SKILL.md FIX template]
Level 1 unit:   [test file:line — must PASS after fix]
Level 2 sim:    [test file:line — must PASS after fix]
Level 3 e2e:    [test file:line — must PASS after fix]
Regression:     [zero new failures vs session-start baseline]
```

---

## Short Form (for simple bugs)

```
Observe:    actual vs expected
Isolate:    boundary where divergence occurs
Hypothesize: what assumption is wrong
Route:      which rule applies
Verify:     does rule checklist confirm it
Fix:        engine-level change
Test:       3-level verification
```

---

## Session State

If a debugging session spans multiple messages or is interrupted, save progress here:

```json
{
  "bug": "BUG-ENGINE-NN (or TBD)",
  "hypothesis": "...",
  "ruleApplied": "rule-name",
  "evidenceFound": "...",
  "fixPlan": "...",
  "testsNeeded": ["L1: file", "L2: file", "L3: file"]
}
```
