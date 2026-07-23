# Rule 1: Pattern Recognition Verdicts

## What It Catches

Misidentifying what kind of bug this is — treating a data shape bug as a logic bug, or a config bug as a code bug.

## The Problem

The first classification of a bug determines every subsequent debugging step. Wrong classification → wrong fix path → wasted time or an incomplete fix that recurs.

## XIIGen Bug Taxonomy (use this to classify first)

| Pattern | Correct Class | Wrong Classification |
|---------|---------------|---------------------|
| Provider returns `{ hits: [] }` instead of `DataProcessResult<SearchResult>` | Class A — Fabric Provider | "Logic bug in AF-4" |
| SQS consumer processes same event twice | Class B — Queue Coordination | "AF-9 judge is wrong" |
| Generated service has `class OrderModel {}` | Class C — DNA Pattern | "AF-1 prompt needs updating" |
| AF-9 reads quality score from wrong field path | Class D — AF Pipeline | "Quality scorer is broken" |
| Two flows publish `order.completed` — duplicates | Class E — BFA Conflict | "Consumer is processing twice" |
| F1339 missing `bfaRegistration.events` | Class F — Engine Contract | "BFA validator bug" |

## Checklist

```
☐ Is the wrong value coming from a fabric provider return shape? → Class A
☐ Is the wrong value an event being processed multiple times? → Class B
☐ Is the wrong value in GENERATED code (output of AF-1/AF-7)? → Class C
☐ Is the wrong value passed between AF stations (wrong field path)? → Class D
☐ Is the wrong value caused by two flows using the same event/entity? → Class E
☐ Is the wrong value caused by a missing/wrong field in a factory contract? → Class F
☐ None of the above → escalate to Luba before guessing
```

## Common Misclassification Traps

**Trap 1: Blaming the wrong station**
Bug appears at AF-9 (judge) but the wrong data was written at AF-4 (RAG context). AF-9 is the symptom; AF-4 is the cause. Classify as Class D, fix at AF-4.

**Trap 2: Output bug vs engine bug**
Generated file has a DNA violation. Do NOT fix the generated file — fix the AF station (AF-1 or AF-7) that generated it. Classify as Class C if violation is in output; Class D if traceable to specific station choice. See `engine-qa/SKILL.md` for Phase 8 resolution.

**Trap 3: Config vs code**
`fabricType: "Elasticsearch"` in contract does NOT match `"elasticsearch"` in provider registry. This is a Class F (contract) bug — not a Class A (provider logic) bug. Fix the contract, not the provider.

## Anti-Pattern

"The output is wrong so I'll fix the output." → REJECT. Identify the engine-level cause first. Fix the engine.
