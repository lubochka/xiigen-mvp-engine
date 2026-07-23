---
name: dna-compliance-guard-skill
sk_number: SK-418
version: "1.0.0"
load_order: 18
priority: RECOMMENDED
author: luba
updated: "2026-03-18"
description: >
  9 DNA guard patterns for the XIIGen engine. Each pattern has a detection
  command, example violation, fix pattern, and test template. Run pre-commit
  on any new or modified TypeScript files.
---

# DNA Compliance Guard Skill v1.0

## When to Invoke

- Before committing any new or modified TypeScript file in `server/src/`
- After AF-1 Genesis or AF-7 RAG Update generates a `.ts` file
- When `generated-service-audit.md` detects a potential violation
- During Phase 11 code modifications (mandatory pre-commit gate)

---

## The 9 DNA Guard Patterns

See `dna-guard-patterns.md` for full detection commands, violation examples, fix patterns, and test templates.

| DNA | Rule | Detection |
|-----|------|-----------|
| DNA-1 | No entity-specific model classes | `grep "class [A-Z].*{" server/src/` excl. kernel/, interfaces/ |
| DNA-2 | No hardcoded field selectors | `grep "\.find({" server/src/` |
| DNA-3 | No business logic in error handlers | inspect catch blocks — must return DataProcessResult.failure() only |
| DNA-4 | All services extend MicroserviceBase | `grep "class.*Service" server/src/` — check for extends |
| DNA-5 | tenantId from context, not parameter | `grep "tenantId" server/src/` — check if it's a param |
| DNA-6 | No entity-specific controllers | `grep "@Controller(" server/src/` — check for entity specificity |
| DNA-7 | Event subscriptions have dedup ID | `grep "@Subscribe(" server/src/` — check dedup field |
| DNA-8 | Document stored before queued | enqueue() calls — check storeDocument() precedes them |
| DNA-9 | CloudEvents wrapper on all events | `grep "enqueue(" server/src/` — check CloudEvents wrapper |

---

## Pre-Commit Gate (run on every modified file)

```bash
FILE="<path-to-modified-file>"

# DNA-1
grep "class [A-Z].*{" $FILE | grep -v "extends\|interface\|abstract"

# DNA-2
grep "\.find({" $FILE

# DNA-4
grep "class.*Service" $FILE | grep -v "extends MicroserviceBase"

# DNA-5
grep -n "tenantId" $FILE
# If tenantId appears as a function parameter → violation

# DNA-6
grep "@Controller(" $FILE
# If controller maps to entity-specific route → review

# DNA-9
grep "enqueue(" $FILE
# Check each call — must pass CloudEvents-wrapped object
```

Expected: all sections empty for a clean file.

---

## Quick Verdicts

| Observation | DNA Rule | Class |
|-------------|----------|-------|
| `class OrderModel {}` in new service | DNA-1 | C (+ D if from generation) |
| `.find({ userId: input.userId })` | DNA-2 | C |
| `catch (e) { if (e.type) { ... } }` | DNA-3 | C |
| `class OrderService {}` (no extends) | DNA-4 | C |
| `async process(tenantId: string, ...)` | DNA-5 | C |
| `@Controller('orders')` | DNA-6 | C |
| `@Subscribe('order.completed')` without dedup | DNA-7 | C |
| `enqueue(event)` before `storeDocument()` | DNA-8 | C |
| `enqueue({ orderId, type })` (no CloudEvents) | DNA-9 | C |

---

## When a Violation Is Found

1. Do NOT commit the violating file
2. Classify the bug (engine-qa-skill): CLASS C if violation in output; CLASS D if traceable to station choice
3. If generated code: fix the AF station (af1-genesis.ts or af7-rag-update.ts) — not the generated file
4. If hand-written code: fix directly
5. Write 3 failing tests before fix (bug-to-tests-skill)
6. Re-run pre-commit gate → must be clean

---

## Integration

```
dna-compliance-guard
  → pre-commit gate → blocks violating commits
  → generated-service-audit (mental-debug Rule 12) → same checklist, different trigger
  → engine-qa (CLASS C or D classification)
  → bug-to-tests → 3 failing tests before fix
```
