# Verification Before Completion — Agent Instructions

## The Iron Law
```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

## The Gate Function (run before ANY "done" claim)
1. **IDENTIFY:** What command proves this claim?
2. **RUN:** Execute the FULL command (fresh, complete)
3. **READ:** Full output, check exit code, count failures
4. **VERIFY:** Does output confirm the claim?
5. **ONLY THEN:** Make the claim

## Red Flags — STOP Immediately
- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Done!")
- About to commit/push/PR without verification
- Trusting agent success reports without reading output

## Evidence Requirements

| Claim | Requires | NOT Sufficient |
|-------|----------|----------------|
| Tests pass | Test output: 0 failures | Previous run, "should pass" |
| Build succeeds | Build exit code 0 | Linter passing |
| Bug fixed | Original symptom gone | Code changed, assumed fixed |
| Regression added | Red-green cycle verified | Test passes once |

## Integration with XIIGen
This skill is the enforcement mechanism for Session End Section A.
Every "test counts before/after" claim requires fresh `npm test` output.
Every "zero-regression delta" claim requires fresh test run comparison.
