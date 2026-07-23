---
name: chain-arithmetic-audit
version: "1.0.0"
sk_number: SK-424
priority: MANDATORY
load_order: 24
---

# Chain Arithmetic Audit Skill

Verifies that `baseline + Σ(phase deltas) = final` for every tracked metric across all sessions and phases. FC-1 checks single-document consistency; this skill checks end-to-end chain math.

## When to Invoke

- At FC-1 check time — extends FC-1 from "do documents agree" to "does the math work end-to-end"
- At session end when writing Section A — verify "Before" equals the previous session's "After"
- Any time a plan spans multiple sessions or phases with incremental counts

## Rules

1. Extract all count references from STATE.json, REFERENCE-PLAN, and every SESSION file
2. Build directed graph: `baseline → S1 delta → S2 delta → ... → final`
3. Verify every edge: `node[n].after == node[n+1].before`
4. Verify terminal: `baseline + Σ(all deltas) == final_expected`
5. Any gap or mismatch = **FC-1 FAIL** with exact location and value

## Detection

```bash
# Extract all count transitions
grep -n "before\|after\|delta\|expected\|baseline\|tests_after\|spec_files_after" STATE.json

# For each session A → B: verify A.after == B.before
# Example chain for XIIGen test coverage plan:
# 2365 (Phase 11) → +18 (S1) = 2383 → +10 (S3) = 2393 → +N (S4) = final
```

## Verification Table Format

| Transition | Before | Delta | After | Verified |
|-----------|--------|-------|-------|---------|
| Phase 11 → S1 | 2365 | +18 | 2383 | ✅ |
| S1 → S2 | 2383 | +0 (server) | 2383 | ✅ |
| S2 → S3 | 2383 | +10 | 2393 | ✅ |
| S3 → S4 | 2393 | +N | 2393+N | TBD |

## Anti-Pattern

Plan 1 said `final_expected_counts: 103` but phase totals summed to 105. FC-1 passed (individual documents agreed). Chain arithmetic failed. This skill catches what FC-1 misses.

## Integration

- Extends `plan-review-skill` FC-1
- Invoked by `infrastructure-discovery` Gate 0 Step 3
- Results feed into Section A "zero-regression delta" at session end
