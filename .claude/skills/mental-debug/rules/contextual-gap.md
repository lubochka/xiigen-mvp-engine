# Rule 2: Contextual Gap

## What It Catches

Missing context that the code assumes exists — skill block not injected, tenant header missing, AsyncLocalStorage not populated, required upstream output absent.

## The Problem

Code that works correctly given its assumptions can produce wrong output when those assumptions are not met. The code is not wrong — the context is missing. Debugging the code without noticing the missing context wastes time.

## Common Contextual Gaps in XIIGen

| Missing Context | Where It's Needed | Symptom |
|----------------|-------------------|---------|
| Skill block (SK-DNA, SK-TEST) not injected | AF-1 Genesis | Generated code skips DNA guards — output looks valid but missing patterns |
| `tenantId` not in AsyncLocalStorage | Any fabric call | Wrong tenant data returned; no error raised |
| `qualityScores` not written by AF-4 | AF-9 Judge reads it | AF-9 uses default 0.5 threshold — false pass/fail |
| `taskType` not in StationInput | AF-2 Planning | Planning gate skips type-specific validation |
| BFA registration not in factory contract | BFA Validator | Cross-flow check passes silently for flows it should block |
| `archetype` field absent in StationInput | Skill Advisor selector | Falls through to default skill set — wrong SK-PLAN/SK-TEST selection |

## Checklist

```
☐ What does this code ASSUME is present in its input?
☐ Read the CALLER — does it actually set that field?
☐ Is there a conditional that silently falls back when the context is absent?
☐ Check AsyncLocalStorage: is tenantId set before this call executes?
☐ For AF-4 pipeline: are skill blocks injected before AF-1 runs?
☐ For AF-9: was qualityScores written at top-level (not nested in context)?
☐ For generated code: were the required SK-DNA / SK-TEST blocks active?
```

## Trace Protocol

1. Identify the field the code reads but may not find
2. Search backward through the call chain: which station/provider writes that field?
3. Check if that write is conditional — can it be skipped?
4. Add a log at the write point: confirm the field is actually written in this execution path
5. Add a log at the read point: confirm the value is what was written

## Anti-Pattern

"The code reads `input.qualityScores` correctly — the logic is fine." Without confirming that `qualityScores` was actually written by AF-4 in this execution path, the logic check is incomplete. Context gaps are invisible to static analysis.
