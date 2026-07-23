---
name: mental-debug-skill
version: "2.0.0"
priority: RECOMMENDED
load_order: 16
author: luba
updated: "2026-03-18"
description: >
  Runtime debugging discipline for the XIIGen engine. 14 rules covering
  pattern recognition, execution tracing, boundary analysis, loop bugs,
  error handling gaps, and XIIGen-specific failure modes (fabric resolution,
  tenant scope leaks, sibling guard gaps, generated service compliance).
---

# Mental Debug Skill v2.0

## When to Invoke

- When a bug is observed but the root cause is unclear
- When tests fail and the failure message points to a symptom, not a cause
- When code looks correct but produces wrong output
- After `code-examination-skill` has mapped the call chain and a hypothesis is formed

---

## The 14 Rules

| # | Rule | What it catches |
|---|------|----------------|
| 1 | `pattern-recognition-verdicts` | Misidentifying what kind of bug this is |
| 2 | `contextual-gap` | Missing context that the code assumes exists |
| 3 | `mental-execution` | Wrong mental model of how code actually runs |
| 4 | `boundary-data-lifecycle` | Data shape changes at component boundaries |
| 5 | `boundary-message-map` | Event/queue message schema mismatches |
| 6 | `loop-off-by-one` | Off-by-one errors in iteration |
| 7 | `loop-state-delta` | State mutation inside loops producing wrong accumulation |
| 8 | `error-silent-catch` | Errors swallowed silently, no signal to caller |
| 9 | `sibling-guard-parity` | Guard exists in one station/provider but not its sibling |
| 10 | `_sections` | Reference: debugging session structure |
| 11 | `async-local-storage` | AsyncLocalStorage not propagated across async boundaries |
| 12 | `generated-service-audit` | Generated `.ts` files contain DNA violations |
| 13 | `fabric-resolution-trace` | Wrong provider selected due to fabricType case mismatch |
| 14 | `tenant-scope-leak` | tenantId lost in Promise.all() or concurrent execution |

---

## Diagnostic Routing

Apply this table when observing a symptom. Start with the first rule; if not resolved, apply the second.

| Symptom | Apply First | Then |
|---------|-------------|------|
| Generated code has DNA violation | `pattern-recognition-verdicts` → `contextual-gap` | `generated-service-audit` |
| Fabric returns wrong result | `boundary-data-lifecycle` → `fabric-resolution-trace` | `async-local-storage` |
| Tenant isolation broken | `tenant-scope-leak` → `boundary-data-lifecycle` | `loop-state-delta` |
| AF pipeline quality flatlines | `contextual-gap` (skill blocks missing?) | `mental-execution` on feedback→rag chain |
| BFA false positive | `boundary-message-map` → `loop-state-delta` | `sibling-guard-parity` |
| Silent wrong output (no error raised) | `error-silent-catch` → `mental-execution` | `contextual-gap` |
| Cross-tenant data visible | `tenant-scope-leak` → `async-local-storage` | `boundary-data-lifecycle` |
| Provider returns wrong shape silently | `fabric-resolution-trace` → `error-silent-catch` | `boundary-data-lifecycle` |

---

## Debugging Session Structure

See `rules/_sections.md` for the full session template.

Short form:
```
1. Observe: what is the actual output vs expected output?
2. Isolate: which component boundary is the divergence point?
3. Hypothesize: what assumption does the code make that is wrong?
4. Route: which mental-debug rule applies?
5. Verify: does the rule's checklist confirm the hypothesis?
6. Fix: engine-level fix (not output patch) — see retroactive-development
7. Test: 3-level verification (see bug-to-tests + three-level-verification)
```

---

## XIIGen-Specific Failure Patterns

### Fabric Resolution (Rule 13: fabric-resolution-trace)
The engine resolves a fabric provider by matching `fabricType` string against the provider registry. Case matters: `"ELASTICSEARCH"` does NOT match `"elasticsearch"`. Silent fallback to in-memory provider.

### Tenant Scope (Rule 14: tenant-scope-leak)
`AsyncLocalStorage` context does NOT propagate into `Promise.all()` children in Node 18.
Any concurrent operation must receive `tenantId` explicitly or use `nestjs-cls` ClsService.

### Sibling Guard Parity (Rule 9)
If DNA-3 is checked in `af1-genesis.ts`, it must also be checked in `af11-feedback.ts` — they process the same task output. A guard in one station but not its sibling creates a coverage gap.

### Generated Service Audit (Rule 12)
When AF-1 or AF-7 generates a TypeScript service file, run the DNA-1–9 checklist against the output before committing. Generated code has no IDE warnings.

---

## Reference

Rules are in `rules/` subdirectory. See each rule file for full checklist and worked examples.
