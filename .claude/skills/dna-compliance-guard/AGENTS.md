# DNA Compliance Guard — Agent Instructions

## When to Invoke

- Before committing any TypeScript file in `server/src/`
- After AF-1 or AF-7 generates a `.ts` file
- Any time a DNA violation is suspected

---

## Pre-Commit Checklist (run on every modified file)

```bash
FILE="<path>"
grep "class [A-Z].*{" $FILE | grep -v "extends\|interface\|abstract"  # DNA-1
grep "\.find({" $FILE                                                    # DNA-2
grep "class.*Service" $FILE | grep -v "extends MicroserviceBase"         # DNA-4
grep "tenantId" $FILE | grep "string\|UUID"                              # DNA-5 (check if param)
grep "@Controller(" $FILE                                                 # DNA-6
grep "@Subscribe(" $FILE                                                  # DNA-7 (check dedup)
grep "enqueue(" $FILE                                                     # DNA-8+9 (order + CloudEvents)
```

All sections must be empty (or reviewed as acceptable) before commit.

---

## Quick Verdict Table

| Symptom | DNA | Fix Location |
|---------|-----|-------------|
| `class OrderModel {}` in service | DNA-1 | Remove class; use Record<string,unknown> or contract types |
| `.find({ field: value })` | DNA-2 | Replace with `BuildSearchFilter(input)` |
| `catch` with if/switch logic | DNA-3 | `catch → DataProcessResult.failure()` only |
| `class XService {}` no extends | DNA-4 | `extends MicroserviceBase` |
| `process(tenantId: string, ...)` | DNA-5 | Remove param; `this.cls.get('tenantId')` |
| `@Controller('orders')` | DNA-6 | Remove; use DynamicController |
| `@Subscribe()` without dedup | DNA-7 | Add `event.id` dedup check |
| `enqueue()` before `storeDocument()` | DNA-8 | Reorder: store → enqueue |
| `enqueue({ raw: payload })` | DNA-9 | Wrap in CloudEvents envelope |

---

## When a Violation Is Found

```
1. Do NOT commit the file
2. Classify bug: CLASS C (output) or CLASS D (traceable to AF station)
3. If generated: fix the AF station (af1-genesis or af7-rag-update), not generated file
4. If hand-written: fix directly
5. Write 3 failing tests before fix (bug-to-tests-skill)
6. Re-run pre-commit gate → confirm clean
7. Commit with fix
```

---

## DNA Numbers Reference

```
DNA-1: No entity model classes
DNA-2: No hardcoded field selectors
DNA-3: No business logic in catch
DNA-4: extends MicroserviceBase
DNA-5: tenantId from context
DNA-6: No entity controllers
DNA-7: Event dedup ID
DNA-8: Store before enqueue
DNA-9: CloudEvents wrapper
```

Full patterns with detection commands: `dna-guard-patterns.md`
