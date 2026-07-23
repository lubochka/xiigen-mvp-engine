# Baseline Regression Check — XIIGen

Run this protocol BEFORE any change to `guardrails/`, `learning/`, or `engine-contracts/`.

## Step 1 — Record the Baseline

```bash
# Capture current StationOutput shapes for the affected contract
grep -r "StationOutput\|qualityScore\|dnaCompliance\|bfaStatus\|promotionScore" \
  server/src/guardrails/ server/src/learning/ \
  | grep -v ".spec.ts" \
  | grep -v "node_modules"

# Record current test pass count
cd server && npx jest --verbose 2>&1 | tail -5
```

Save output as `BASELINE-[date].txt` or paste into DECISIONS.md entry.

## Step 2 — Identify Flow Blast Radius

```bash
# Which task types reference the file you're modifying?
grep -r "quality-scorer\|qualityScorer\|QualityScorer" \
  server/src/af-stations/ server/src/engine/ \
  | grep -v "spec.ts"

# Which existing FLOW-XX entries reference those task types?
grep -r "FLOW-0[1-9]\|FLOW-[12][0-9]\|FLOW-3[01]" \
  server/src/engine-contracts/ server/src/factories/
```

If a FLOW-01 through FLOW-31 contract references the modified file: **this change has cross-flow blast radius.**

## Step 3 — Categorize the Change

| Change type | Protocol |
|-------------|----------|
| Code defect (null guard, wrong operator, crash) | Write failing test first, then fix, verify baseline unchanged |
| Product decision (threshold, weight, criteria) | STOP — log in DECISIONS.md — escalate to Luba |
| Structural refactor (no behavior change) | Write before/after comparison tests, verify StationOutput shapes identical |
| New field (additive) | Requires Luba approval — contract changes affect all flows |

## Step 4 — Post-Change Verification

After the change:
```bash
cd server && npx jest --verbose 2>&1 | tail -5
# Count must be ≥ pre-change count

# Verify existing flows still produce same shapes
grep -r "expect(result" test/af-stations/ test/guardrails/ | wc -l
# Zero failing assertions on existing tests
```

If test count dropped or existing flow assertions fail: **ROLLBACK before proceeding.**

## The FIX-27 Pattern — What to Watch For

A change is "FIX-27 style" if:
- It touches a numeric constant in `quality-scorer.ts`, `dna-validator.ts`, or `bfa-registry.ts`
- The justification is "the old value was wrong" (vs "the old value caused a crash")
- No failing test existed before the change
- The change would cause previously-passing flows to fail

All four conditions together = guaranteed product decision. Escalate immediately.
