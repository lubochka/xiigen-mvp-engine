# No Product Decisions — Language Rules

## How to Identify a Product Decision

Ask: "If I change this, could Luba's engine produce different results for the same input?"

If YES → product decision → stop, log, escalate.

## Language Patterns That Signal Product Decisions

### REJECTED phrases (these mean you're making a product decision):
- "I'll lower the threshold to fix the false positives"
- "The weight should be higher for test_quality"
- "This DNA check is too strict, I'll relax it"
- "AF-9 should skip validation when the score is above X"
- "I'll add X as a required field since it's clearly needed"
- "The current scoring penalizes valid outputs, I'll adjust"

### ALLOWED phrases (these are code defects, not product decisions):
- "The scorer returns NaN when the input is null — fixing null guard"
- "AF-9 reads the wrong task type's contract — fixing the lookup"
- "The DNA check throws instead of returning DataProcessResult — fixing error handling"
- "The threshold comparison uses `>` when the spec says `>=` — fixing operator"
- "The weight calculation overflows for large inputs — fixing arithmetic"

## The Test

Before making any change to scoring/guardrail/contract code, complete this sentence:
"After this change, the engine will produce [SAME / DIFFERENT] output for the same input."

- SAME output → likely a code defect fix. Proceed with caution.
- DIFFERENT output → this is a product decision. STOP.

## Edge Cases

**"The spec says X but the code does Y"** — still a product decision. "The spec" might be outdated. Escalate to Luba to confirm which is correct.

**"This is clearly a bug"** — "clearly" is not a protocol. Write failing tests that prove the bug first. Then show Luba. Then fix.

**"I'm just normalizing the calculation"** — normalization changes relative weights. Product decision.
