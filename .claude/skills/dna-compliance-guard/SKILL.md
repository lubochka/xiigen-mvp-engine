---
name: dna-compliance-guard-skill
sk_number: SK-418
version: "1.1.0"
load_order: 18
priority: MANDATORY
author: luba
updated: "2026-04-23"
description: >
  9 DNA guard patterns + 5 portability checks for the XIIGen engine.
  Run pre-commit on any new or modified TypeScript files, and at every
  flow phase close (V9 portability gate). Closes G-29 from gap mapping.
---

# DNA Compliance Guard Skill v1.1

## When to Invoke

- Before committing any new or modified TypeScript file in `server/src/`
- After AF-1 Genesis or AF-7 RAG Update generates a `.ts` file
- When `generated-service-audit.md` detects a potential violation
- During Phase 11 code modifications (mandatory pre-commit gate)
- At every flow phase close (V9 portability gate in flow-implementation-guide)
- When GUIDE-B17 Phase G Mobility Gate runs

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

## Portability Guard Patterns (P-1..P-5) — NEW v1.1.0

These five checks must pass for any service that will be distributed as part of a
flow package. Run alongside the 9 DNA checks at every phase close.

A service that passes all 9 DNA rules can still have all 5 portability gaps open.
The DNA rules guard production quality. The portability rules guard distributability.

| Check | Rule | What it catches |
|-------|------|-----------------|
| P-1 | No ClsService import | GAP-01: tenantId leaks in concurrent Promise.all() |
| P-2 | @connectionType FLOW_SCOPED annotation present | GAP-16a: file invisible to package builder |
| P-3 | All FREEDOM keys use flow-scoped prefix `flow{NN}_` | GAP-09: key collision across tenants |
| P-4 | No local interface clones (IDb, IQueue, IFreedom) | GAP-02: diverges from canonical fabric |
| P-5 | requiredCoInstalls declared for cross-flow reads | GAP-10: runtime failure on second-tenant install |

---

## Pre-Commit Gate (run on every modified file)

```bash
FILE="<path-to-modified-file>"
FLOW_DIR="<path-to-flow-dir>"  # e.g. server/src/engine/flows/flow-48-i18n/

# ── DNA CHECKS ───────────────────────────────────────────────────────────

# DNA-1: No typed model classes
grep "class [A-Z].*{" $FILE | grep -v "extends\|interface\|abstract"

# DNA-2: No hardcoded field selectors
grep "\.find({" $FILE

# DNA-4: Services extend MicroserviceBase
grep "class.*Service" $FILE | grep -v "extends MicroserviceBase"

# DNA-5: tenantId not constructed as scope prefix
grep -n "tenantId" $FILE
# If tenantId appears as a function parameter → violation
# Also check: scope_id or scopeId construction
grep -n "scope_id\|scopeId" $FILE | grep "tenantId.*:\|:.*tenantId"

# DNA-6: No entity-specific controllers
grep "@Controller(" $FILE

# DNA-9: CloudEvents wrapper on all events
grep "enqueue(" $FILE
# Check each call — must pass CloudEvents-wrapped object

# ── PORTABILITY CHECKS ───────────────────────────────────────────────────

# P-1: No ClsService/nestjs-cls import (GAP-01 — MOST CRITICAL)
P1=$(grep -c "import.*ClsService\|from 'nestjs-cls'\|TENANT_CONTEXT_KEY" $FILE 2>/dev/null || echo 0)
echo "P-1 ClsService imports: $P1"   # Expected: 0
# VIOLATION: tenantId pulled from AsyncLocalStorage leaks in concurrent Promise.all()
# FIX: replace cls.get(TENANT_CONTEXT_KEY) with explicit tenantId from EngineContract input

# P-2: @connectionType FLOW_SCOPED annotation (GAP-16a)
P2=$(grep -c "@connectionType FLOW_SCOPED" $FILE 2>/dev/null || echo 0)
echo "P-2 @connectionType annotations: $P2"   # Expected: ≥1 for service files
# VIOLATION: file cannot be classified for package distribution
# FIX: add JSDoc block before class declaration (see template below)

# P-3: FREEDOM keys are flow-scoped (GAP-09)
P3=$(grep -E "freedom\.get\(|fromConfig\(" $FILE 2>/dev/null | grep -vc "flow[0-9][0-9]*_" || echo 0)
echo "P-3 Unscoped FREEDOM keys: $P3"   # Expected: 0
# VIOLATION: 'myParam' key collides across flow installations
# FIX: rename to 'flow48_myParam' (flow{NN}_ prefix)

# P-4: No local interface clones (GAP-02)
P4=$(grep -cE "^interface (IDb|IQueue|IFreedom)" $FILE 2>/dev/null || echo 0)
echo "P-4 Local interface definitions: $P4"   # Expected: 0
# VIOLATION: local copy diverges from canonical fabric interface over time
# FIX: import from fabrics/interfaces/ or @xiigen/engine-infra-interfaces

# P-5: requiredCoInstalls (whole-flow check, run once per flow not per file)
CROSS_FLOW=$(grep -rE "searchDocuments|storeDocument" $FLOW_DIR \
  --include="*.service.ts" 2>/dev/null | grep "xiigen-" | grep -v "flow[0-9]*-" | wc -l)
DECLARED=$(node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8'))\
  ?.xiigen?.requiredCoInstalls?.length ?? 0" 2>/dev/null || echo 0)
echo "P-5 Cross-flow reads: $CROSS_FLOW | Declared coInstalls: $DECLARED"
# Expected: DECLARED >= CROSS_FLOW

# ── PORTABILITY GATE VERDICT ─────────────────────────────────────────────
if [ "$P1" -gt 0 ] || [ "$P2" -eq 0 ] || [ "$P3" -gt 0 ] || [ "$P4" -gt 0 ]; then
  echo "❌ PORTABILITY GATE FAILED — phase cannot close"
  exit 1
else
  echo "✅ PORTABILITY GATE PASSED"
fi
```

**@connectionType FLOW_SCOPED annotation template (for P-2 fix):**
```typescript
/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-XX
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped
 */
export class MyFlowService extends MicroserviceBase {
```

---

## Quick Verdicts

| Observation | Rule | Class |
|-------------|------|-------|
| `class OrderModel {}` in new service | DNA-1 | C (+ D if from generation) |
| `.find({ userId: input.userId })` | DNA-2 | C |
| `catch (e) { if (e.type) { ... } }` | DNA-3 | C |
| `class OrderService {}` (no extends) | DNA-4 | C |
| `async process(tenantId: string, ...)` | DNA-5 | C |
| `@Controller('orders')` | DNA-6 | C |
| `@Subscribe('order.completed')` without dedup | DNA-7 | C |
| `enqueue(event)` before `storeDocument()` | DNA-8 | C |
| `enqueue({ orderId, type })` (no CloudEvents) | DNA-9 | C |
| `import { ClsService }` in service file | P-1 | GAP-01 |
| Missing `@connectionType` JSDoc | P-2 | GAP-16a |
| `freedom.get('myParam')` without flow prefix | P-3 | GAP-09 |
| `interface IDb {` defined in flow file | P-4 | GAP-02 |
| Cross-flow index read without requiredCoInstalls | P-5 | GAP-10 |

---

## When a Violation Is Found

**DNA violations (DNA-1..DNA-9):**
1. Do NOT commit the violating file
2. Classify the bug (engine-qa-skill): CLASS C if violation in output; CLASS D if traceable to station choice
3. If generated code: fix the AF station (af1-genesis.ts or af7-rag-update.ts) — not the generated file
4. If hand-written code: fix directly
5. Write 3 failing tests before fix (bug-to-tests-skill)
6. Re-run pre-commit gate → must be clean

**Portability violations (P-1..P-5):**
See retroactive-development-SKILL.md (SK-419 v1.1.0) §Portability Fix Propagation for
which engine component to fix and how to verify the fix is generative.

---

## Integration

```
dna-compliance-guard
  → pre-commit gate → blocks violating commits
  → portability gate → blocks phase close until P-1..P-5 pass
  → generated-service-audit (mental-debug Rule 12) → same checklist, different trigger
  → engine-qa (CLASS C or D classification)
  → bug-to-tests → 3 failing tests before fix
  → retroactive-development (SK-419 v1.1.0) → portability fix propagation
```
