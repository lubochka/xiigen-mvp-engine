---
name: audit-protocol
version: "1.0.0"
sk_number: SK-427
priority: MANDATORY
load_order: 26
---

# Audit Protocol Skill

Defines what a "deep audit" must cover — a 10-point checklist every audit runs against. Prevents ad-hoc audits that vary by reviewer and time available.

## When to Invoke

- When a cross-model review (Gate B of plan-review-skill) is requested
- When reviewing any reviewer's output
- Before declaring any plan "ready for execution"

## 10-Point Audit Checklist

Every audit must explicitly address all 10 points. Points not checked must be listed in "NOT CHECKED" section with reason.

| # | Check | Skill | Pass Condition |
|---|-------|-------|----------------|
| 1 | **Chain arithmetic** | chain-arithmetic-audit | baseline + Σ(deltas) = final for every metric |
| 2 | **Blast radius tagging** | blast-radius-tagger | every deliverable tagged; PRODUCTION-CI has validation + rollback |
| 3 | **API shape verification** | api-shape-verification | all imports have verified export shape, params, return type |
| 4 | **Commit atomicity** | blast-radius-tagger | GOVERNANCE and PRODUCTION-CI committed before TEST-ONLY |
| 5 | **WF verifiability** | — | every write-time fix has a grep/lint/test to confirm it landed |
| 6 | **Path verification** | — | every file path verified against actual codebase (not assumed) |
| 7 | **Gate thresholds** | — | every pass/fail threshold is explicit — no "~approximately" |
| 8 | **Severity assignment** | — | every finding tagged: 🔴 BLOCKING \| ⚠️ WRITE-TIME \| ℹ️ INFORMATIONAL |
| 9 | **Severity consistency** | — | no finding tagged 🔴 may resolve as "minor" in same review |
| 10 | **Coverage declaration** | — | Section B explicitly lists what was NOT checked and why |

## Severity Definitions

| Tag | Meaning | Required Action |
|-----|---------|----------------|
| 🔴 BLOCKING | Execution cannot proceed without fix | Stop, fix, re-review before proceeding |
| ⚠️ WRITE-TIME | Fix during execution, pre-approved | Document as WF-N entry with verification command |
| ℹ️ INFORMATIONAL | Noted, no action required | Log only, no gate impact |

## Rules

1. Every finding must have exactly ONE severity tag
2. A finding tagged 🔴 BLOCKING that "resolves as minor" is a protocol violation — reclassify or escalate
3. The audit output must end with a "NOT CHECKED" table listing omissions with reasons
4. Gate B of plan-review-skill is not complete until all 10 points are explicitly addressed

## Anti-Pattern

Deep audit (Document 5) tagged Issue 2 as 🔴 then concluded "MINOR — internally consistent." That is a severity inconsistency violation (Rule 2). It wastes reviewer attention on a finding that had no action.

## Integration

- Invoked by plan-review-skill Gate B
- Invokes: chain-arithmetic-audit, blast-radius-tagger, api-shape-verification
- Results feed into the final gate table before ExitPlanMode
