# Mental Debug Skill — Agent Instructions

## When to Invoke

Apply this skill when:
- A bug is observed but root cause is unclear
- Tests fail with symptom-pointing messages, not cause-pointing messages
- Code looks correct but produces wrong output
- `code-examination-skill` has mapped the call chain and a hypothesis is formed

---

## Diagnostic Routing — Start Here

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

## 14 Rules — Quick Reference

| # | Rule File | What It Catches |
|---|-----------|-----------------|
| 1 | `pattern-recognition-verdicts.md` | Misidentifying bug type — treating data shape bug as logic bug |
| 2 | `contextual-gap.md` | Missing context the code assumes exists (skill block, tenant header) |
| 3 | `mental-execution.md` | Wrong mental model — believing code runs differently than it does |
| 4 | `boundary-data-lifecycle.md` | Data shape changes at AF station or fabric boundaries |
| 5 | `boundary-message-map.md` | Event/queue message schema mismatches between producer and consumer |
| 6 | `loop-off-by-one.md` | Off-by-one errors in AF station iteration or batch processing |
| 7 | `loop-state-delta.md` | State mutation inside loops producing wrong accumulation |
| 8 | `error-silent-catch.md` | Errors swallowed silently — no signal to caller |
| 9 | `sibling-guard-parity.md` | Guard in one station/provider but missing in its sibling |
| 10 | `_sections.md` | Session structure reference |
| 11 | `async-local-storage.md` | AsyncLocalStorage context lost across async boundaries |
| 12 | `generated-service-audit.md` | Generated `.ts` files contain DNA violations |
| 13 | `fabric-resolution-trace.md` | Wrong provider selected due to fabricType case mismatch |
| 14 | `tenant-scope-leak.md` | tenantId lost in Promise.all() or concurrent execution |

---

## Red Flags — Stop and Apply Mental Debug

- Output is wrong but no exception is thrown → Rule 8 (`error-silent-catch`)
- Different behavior between test and production → Rule 2 (`contextual-gap`) or Rule 11 (`async-local-storage`)
- Correct behavior on single tenant, wrong on second tenant → Rule 14 (`tenant-scope-leak`)
- Right result type, wrong data inside it → Rule 4 (`boundary-data-lifecycle`) or Rule 13 (`fabric-resolution-trace`)
- Guard works in AF-1 but same case fails in AF-11 → Rule 9 (`sibling-guard-parity`)
- Generated file passes lint but breaks at runtime → Rule 12 (`generated-service-audit`)
- Loop body runs correctly but accumulator is wrong at end → Rule 7 (`loop-state-delta`)
- Only first or last item in batch is processed correctly → Rule 6 (`loop-off-by-one`)

---

## Session Template (short form)

```
1. Observe:    actual output vs expected output
2. Isolate:    which component boundary is the divergence point?
3. Hypothesize: what assumption does the code make that is wrong?
4. Route:      which rule applies? (use routing table above)
5. Verify:     does the rule checklist confirm the hypothesis?
6. Fix:        engine-level fix — not output patch
7. Test:       3-level verification (unit + simulation + e2e)
```

Full session structure: `rules/_sections.md`

---

## XIIGen-Specific Checklist

Before declaring "no bug found":

```
☐ fabricType checked for case sensitivity? ("ELASTICSEARCH" ≠ "elasticsearch")
☐ tenantId propagated into every Promise.all() child?
☐ AsyncLocalStorage context confirmed across all async hops?
☐ DNA-3/DNA-4/DNA-9 checked in EVERY station that processes this task type?
☐ Generated .ts files audited against DNA-1–9 checklist?
☐ Error handlers propagate DataProcessResult.failure() — not swallow?
☐ Sibling guard parity: if guard in AF-1, is it also in AF-11?
```
