---
name: dna-compliance-guard-skill
sk_number: SK-418
version: "1.2.0"
load_order: 18
priority: MANDATORY
author: luba
updated: "2026-04-24"
description: >
  9 DNA guard patterns + 5 portability checks + 3 auth checks + D-HIST-001
  for the XIIGen engine. Run pre-commit on any new or modified TypeScript files,
  and at every flow phase close (V9 portability gate, V10 auth gate).
  v1.2.0 adds: A-1..A-3 auth declaration checks (Problem A),
               D-HIST-001 direct SDK import check (from PORTABILITY-TEST-PROTOCOL-v2.0).
  Closes: AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phases 2 (A-1..A-3 + D-HIST-001).
---

# DNA Compliance Guard Skill v1.2

## When to Invoke

- Before committing any new or modified TypeScript file in `server/src/`
- After AF-1 Genesis or AF-7 RAG Update generates a `.ts` file
- When `generated-service-audit.md` detects a potential violation
- During Phase 11 code modifications (mandatory pre-commit gate)
- At every flow phase close (V9 portability gate + V10 auth gate in flow-implementation-guide)
- When GUIDE-B17 Phase G Mobility Gate or Phase H Auth Decoration runs

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

## Portability Guard Patterns (P-1..P-5)

These five checks guard distributability. Run alongside DNA checks at every phase close.
A service that passes all 9 DNA rules can still have all 5 portability gaps open.

| Check | Rule | What it catches |
|-------|------|-----------------|
| P-1 | No ClsService import | GAP-01: tenantId leaks in concurrent Promise.all() |
| P-2 | @connectionType FLOW_SCOPED annotation present | GAP-16a: file invisible to package builder |
| P-3 | All FREEDOM keys use flow-scoped prefix `flow{NN}_` | GAP-09: key collision across tenants |
| P-4 | No local interface clones (IDb, IQueue, IFreedom) | GAP-02: diverges from canonical fabric |
| P-5 | requiredCoInstalls declared for cross-flow reads | GAP-10: runtime failure on second-tenant install |

---

## Auth Guard Patterns (A-1..A-3) — NEW v1.2.0

These three checks guard authorization coverage. Run on every controller file.
Run at phase close alongside DNA and portability checks (feeds V10 auth gate).

A service that passes all 9 DNA rules and all 5 portability checks can still ship
controllers with zero authorization — these checks close that gap.

| Check | Rule | What it catches |
|-------|------|-----------------|
| A-1 | Every @Controller has @UseGuards | Unguarded controller: all routes accept unauthenticated requests |
| A-2 | Every route has @Roles() or @Public() | Route without either: implicit anonymous access (fail-open) |
| A-3 | Every @Public() route is in bypass-paths.registry.ts | Public route not in registry: bypass gate is unaware of the exposure |

**Scope:** A-1 and A-2 apply to all files containing `@Controller(`. A-3 is a
manual/grep cross-check, not automated. Apply A-1/A-2 at pre-commit; verify A-3
when adding or reviewing `@Public()` declarations.

---

## D-HIST-001 — Direct SDK Import Check — NEW v1.2.0

Source: FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 Layer 1 Step 2.

Service files must use fabric interfaces, not direct SDK clients. A service importing
`@elastic/elasticsearch` directly couples itself to the specific ES version and
authentication model of the monorepo — breaking portability when the flow is forked
into a tenant repo that may use different infrastructure.

| Check | Rule | What it catches |
|-------|------|-----------------|
| D-HIST-001 | No direct SDK imports in service files | @elastic, @anthropic, pg, ioredis imported directly instead of via IDatabaseService / IAIService / IQueueService fabric interfaces |

**Scope:** applies to all files in `server/src/engine/flows/{slug}/` with extension `.ts`,
excluding `fabrics/implementations/` subdirectories (where direct SDK use is intentional)
and `.spec.ts` test files.

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

# P-2: @connectionType FLOW_SCOPED annotation (GAP-16a)
P2=$(grep -c "@connectionType FLOW_SCOPED" $FILE 2>/dev/null || echo 0)
echo "P-2 @connectionType annotations: $P2"   # Expected: ≥1 for service files

# P-3: FREEDOM keys are flow-scoped (GAP-09)
P3=$(grep -E "freedom\.get\(|fromConfig\(" $FILE 2>/dev/null | grep -vc "flow[0-9][0-9]*_" || echo 0)
echo "P-3 Unscoped FREEDOM keys: $P3"   # Expected: 0

# P-4: No local interface clones (GAP-02)
P4=$(grep -cE "^interface (IDb|IQueue|IFreedom)" $FILE 2>/dev/null || echo 0)
echo "P-4 Local interface definitions: $P4"   # Expected: 0

# P-5: requiredCoInstalls (whole-flow check, run once per flow not per file)
CROSS_FLOW=$(grep -rE "searchDocuments|storeDocument" $FLOW_DIR \
  --include="*.service.ts" 2>/dev/null | grep "xiigen-" | grep -v "flow[0-9]*-" | wc -l)
DECLARED=$(node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8'))\
  ?.xiigen?.requiredCoInstalls?.length ?? 0" 2>/dev/null || echo 0)
echo "P-5 Cross-flow reads: $CROSS_FLOW | Declared coInstalls: $DECLARED"
# Expected: DECLARED >= CROSS_FLOW

# ── AUTH CHECKS — NEW v1.2.0 ─────────────────────────────────────────────
# Run only if FILE contains @Controller( — skip for pure service files

CONTROLLERS=$(grep -c "@Controller(" $FILE 2>/dev/null || echo 0)

if [ "$CONTROLLERS" -gt 0 ]; then
  # A-1: Every @Controller must have @UseGuards
  GUARDS=$(grep -c "@UseGuards" $FILE 2>/dev/null || echo 0)
  echo "A-1 Controllers: $CONTROLLERS | @UseGuards: $GUARDS"
  # Expected: GUARDS >= CONTROLLERS

  # A-2: Every route must have @Roles() or @Public()
  ROUTES=$(grep -cE "@Get\(|@Post\(|@Put\(|@Delete\(|@Patch\(" $FILE 2>/dev/null || echo 0)
  AUTH_DECL=$(grep -cE "@Roles\(|@Public\(\)" $FILE 2>/dev/null || echo 0)
  echo "A-2 Routes: $ROUTES | @Roles/@Public: $AUTH_DECL"
  # Expected: AUTH_DECL >= ROUTES

  # A-3: @Public() routes in bypass-paths.registry.ts (manual check)
  PUBLIC_COUNT=$(grep -c "@Public()" $FILE 2>/dev/null || echo 0)
  if [ "$PUBLIC_COUNT" -gt 0 ]; then
    echo "A-3 Manual check required: $PUBLIC_COUNT @Public() route(s) — verify each is in server/src/auth/bypass-paths.registry.ts"
  fi
fi

# ── D-HIST-001: No direct SDK imports — NEW v1.2.0 ───────────────────────
# Applies to all .ts files in flow dirs, excludes fabrics/implementations and .spec.ts
IS_IMPL=$(echo $FILE | grep -c "fabrics/implementations" || true)
IS_SPEC=$(echo $FILE | grep -c "\.spec\.ts$" || true)

if [ "$IS_IMPL" -eq 0 ] && [ "$IS_SPEC" -eq 0 ]; then
  SDK=$(grep -cE "^import.*from '@elastic|from '@anthropic|from 'pg'|from 'ioredis'" \
    $FILE 2>/dev/null || echo 0)
  echo "D-HIST-001 Direct SDK imports: $SDK"   # Expected: 0
  # VIOLATION: direct SDK import bypasses fabric abstraction layer
  # FIX: use IDatabaseService, IQueueService, IAIService fabric interfaces
fi

# ── GATE VERDICTS ─────────────────────────────────────────────────────────

# Portability gate (blocks phase close)
if [ "$P1" -gt 0 ] || [ "$P2" -eq 0 ] || [ "$P3" -gt 0 ] || [ "$P4" -gt 0 ]; then
  echo "❌ PORTABILITY GATE FAILED — phase cannot close"
  exit 1
else
  echo "✅ PORTABILITY GATE PASSED"
fi

# Auth gate (blocks Phase H close — V10 in flow-implementation-guide v1.3)
if [ "$CONTROLLERS" -gt 0 ]; then
  if [ "$GUARDS" -lt "$CONTROLLERS" ] || [ "$AUTH_DECL" -lt "$ROUTES" ]; then
    echo "❌ AUTH GATE FAILED — add @UseGuards and @Roles/@Public() before closing Phase H"
    echo "   (AUTH_DEFERRED is acceptable if AUTH-PLAN v3 Phases 1-4 not yet deployed)"
    exit 1
  else
    echo "✅ AUTH GATE PASSED"
  fi
fi

# D-HIST-001 gate (blocks portability certification)
if [ "${SDK:-0}" -gt 0 ]; then
  echo "❌ D-HIST-001 FAILED — replace direct SDK imports with fabric interfaces"
  exit 1
fi
```

---

## @connectionType FLOW_SCOPED annotation template (P-2 fix)

```typescript
/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-XX
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped
 */
export class MyFlowService extends MicroserviceBase {
```

---

## Auth Declaration Templates (A-1 + A-2 fix)

```typescript
// Controller with all routes protected (A-1 + A-2 compliant):
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('flow-xx')
export class FlowXxController {

  @Roles(ROLE.TENANT_ADMIN, ROLE.TENANT_USER)
  @Get('items')
  async getItems() { ... }

  @Roles(ROLE.TENANT_ADMIN)
  @Post('items')
  async createItem() { ... }
}

// Controller with a public route (A-2 compliant — must also update bypass-paths.registry.ts):
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('flow-xx')
export class FlowXxController {

  @Public()
  @Get('public-info')
  async getPublicInfo() { ... }   // A-3: add to bypass-paths.registry.ts

  @Roles(ROLE.TENANT_USER)
  @Get('private-data')
  async getPrivateData() { ... }
}
```

---

## D-HIST-001 Fix Pattern

```typescript
// BEFORE (D-HIST-001 violation):
import { Client } from '@elastic/elasticsearch';
import Anthropic from '@anthropic-ai/sdk';

// AFTER (compliant — use fabric interfaces):
// In constructor:
constructor(
  @Inject(FABRIC_TOKENS.DATABASE_SERVICE) private db: IDatabaseService,
  @Inject(FABRIC_TOKENS.AI_SERVICE) private ai: IAIService,
) {}
// Then call: await this.db.searchDocuments(...) instead of esClient.search(...)
// And: await this.ai.complete(...) instead of anthropic.messages.create(...)
```

---

## Quick Verdicts

| Observation | Rule | Class |
|-------------|------|-------|
| `class OrderModel {}` in new service | DNA-1 | C |
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
| `@Controller(` without `@UseGuards` | A-1 | AUTH_BLOCK |
| Route method without `@Roles` or `@Public()` | A-2 | AUTH_BLOCK |
| `@Public()` route not in bypass-paths.registry.ts | A-3 | AUTH_BLOCK (manual) |
| `import.*from '@elastic` in service file | D-HIST-001 | PORTABILITY_BLOCK |
| `import.*from '@anthropic` in service file | D-HIST-001 | PORTABILITY_BLOCK |
| `from 'pg'` or `from 'ioredis'` in service file | D-HIST-001 | PORTABILITY_BLOCK |

---

## When a Violation Is Found

**DNA violations (DNA-1..DNA-9):**
1. Do NOT commit the violating file
2. Classify (engine-qa-skill): CLASS C if in output; CLASS D if traceable to station choice
3. If generated: fix AF station (af1-genesis.ts or af7-rag-update.ts) — not the generated file
4. If hand-written: fix directly
5. Write 3 failing tests before fix (bug-to-tests-skill)
6. Re-run pre-commit gate → must be clean

**Portability violations (P-1..P-5):**
See retroactive-development-SKILL.md (SK-419 v1.2.0) §Portability Fix Propagation.

**Auth violations (A-1..A-3) — NEW v1.2.0:**
1. Do NOT close Phase H with auth violations outstanding
2. Add `@UseGuards(JwtAuthGuard, RolesGuard)` before `@Controller(...)` (A-1)
3. Add `@Roles(...)` or `@Public()` to each route method (A-2)
4. For each `@Public()` added: update `server/src/auth/bypass-paths.registry.ts` (A-3)
5. Re-run A-1/A-2 checks → counts must match
6. If auth infrastructure not yet deployed (AUTH-PLAN v3 Phases 1-4 pending):
   record `"authStatus": "AUTH_DEFERRED"` in STATE.json with reason — do NOT block phase close

**D-HIST-001 violations — NEW v1.2.0:**
1. Replace direct SDK client with the corresponding fabric interface
2. If no fabric interface exists for the SDK in question: raise as GAP to Luba before proceeding
3. Re-run D-HIST-001 check → count must be 0
4. Classify as PORTABILITY_REMEDIATION in self-verification-SKILL.md (v1.2.0)

---

## Integration

```
dna-compliance-guard v1.2.0
  → pre-commit gate → blocks violating commits
  → portability gate → blocks phase close until P-1..P-5 pass
  → auth gate (NEW) → blocks Phase H close until A-1..A-2 pass (or AUTH_DEFERRED)
  → D-HIST-001 gate (NEW) → blocks portability certification
  → generated-service-audit (mental-debug Rule 12) → same checklist, different trigger
  → engine-qa (CLASS C or D classification for DNA; AUTH_BLOCK for A-1..A-3)
  → bug-to-tests → 3 failing tests before fix
  → retroactive-development (SK-419 v1.2.0) → portability + auth fix propagation
  → flow-implementation-guide v1.3.0 → V9 portability gate + V10 auth gate
```

## Changelog

- **v1.0.0** — initial skill. DNA-1..DNA-9 pre-commit gate.
- **v1.1.0** — portability guard patterns P-1..P-5 added (GAP-01/16a/09/02/10).
  @connectionType annotation template. PORTABILITY GATE verdict. Integration with V9.
- **v1.2.0** — auth guard patterns A-1..A-3 added (Problem A from AUTH-ARBITER-SKILLS-
  REMEDIATION-PLAN-v3.0). D-HIST-001 direct SDK import check added (from PORTABILITY-
  TEST-PROTOCOL-v2.0 Layer 1 Step 2). AUTH GATE verdict + D-HIST-001 gate verdict.
  Auth declaration templates. D-HIST-001 fix pattern. Integration with V10 auth gate.
