---
name: generated-code-review
sk_number: SK-474
version: "1.2.0"
priority: HIGH
load_order: 3
category: code-execution
author: luba
updated: "2026-04-24"
contexts: ["claude-code"]
description: >
  Systematic five-layer human inspection of generated service code.
  Layer 2 extended: D-HIST-001 direct SDK import check added (from
  PORTABILITY-TEST-PROTOCOL-v2.0 Layer 1 Step 2).
  Layer 5 added: auth declaration check — controllers without @UseGuards
  or routes without @Roles/@Public() are rejected before DPO capture.
  v1.2.0 closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 3.
---

# Generated Code Review Skill (SK-474) v1.2

## WHAT THIS SKILL PREVENTS

**Original purpose — T65 class:** `config.get('qrTokenTtl', 60)` compiles, passes all
functional tests, scores 0.90, and teaches every future generation that configurable
security TTLs are correct. Without this review, that pattern enters the training corpus
as `chosen` and degrades all future security-sensitive generation.

**v1.1 addition — GAP-01 class:** `this.cls.get(TENANT_CONTEXT_KEY)` compiles, passes
all tests, scores 0.90, and teaches every future generation that ClsService dependency
is correct. In concurrent Promise.all() calls, this leaks tenantId across tenant
boundaries. The original DNA-5 check (scope_id grep) does NOT catch this.

**v1.1 addition — D2-F1 class:** `expect(result.success).toBe(true)` is a stub test.
It proves the service ran without crashing. It does not prove tenant isolation, domain
correctness, or event emission. Stub tests contaminate the DPO corpus as "code with
passing tests" — the most dangerous silent failure class.

**v1.2 addition — D-HIST-001 class:** `import { Client } from '@elastic/elasticsearch'`
in a service file couples the flow to the monorepo's specific SDK version and auth model.
When the flow is forked into a tenant repo, this import breaks. Generated code with
direct SDK imports teaches every future generation the wrong dependency pattern.

**v1.2 addition — AUTH class:** A `@Controller` without `@UseGuards`, or a route without
`@Roles`/`@Public()`, compiles and scores well. It teaches every future generation that
unguarded routes are correct. Generated code without auth declarations should never
become a DPO `chosen` candidate — it installs the "fail-open" pattern into training data.

---

## WHEN TO RUN

After Phase B produces any service file that will become a DPO triple.
Specifically: after cycle-1 scores come back ≥ 0.65 and the code is a candidate
for `chosen` — before Phase E capture.

**All 5 layers must PASS before code becomes DPO chosen candidate.**

---

## LAYER 1 — SEMANTIC REVIEW

Does the code communicate what it does?

```bash
cat server/src/engine/flows/FLOW-XX/t47-*.service.ts
```

Checks:
- Function names match their behavior (not generic: `processEvent` → `registerMember`)
- Variable names are concept-level: `memberRecord`, not `obj` or `data`
- Error messages identify the failure: `"Registration duplicate: email already verified"`, not `"Error"`
- Comments reference the iron rule being enforced, not implementation mechanics

**Pass condition:** A developer unfamiliar with the flow can understand what the
function does and why from reading the code alone.

---

## LAYER 2 — DNA COMPLIANCE + PORTABILITY (v1.2 extended)

Nine DNA patterns must hold. P-1 ClsService check replaces the original DNA-5 scope_id
check. D-HIST-001 direct SDK import check added in v1.2.

```bash
# D-HIST-001: No direct SDK imports in service files (NEW v1.2)
# Services must use fabric interfaces — direct imports break tenant fork repos
grep -n "^import.*from '@elastic\|from '@anthropic\|from 'pg'\|from 'ioredis'" \
  server/src/engine/flows/FLOW-XX/t47-*.service.ts \
  | grep -v "fabrics/implementations"
# Expected: 0 hits
# SILENT_FAILURE class: fork repo has no @elastic SDK — import breaks at npm install
# FIX: use IDatabaseService, IAIService, IQueueService fabric interfaces

# DNA-6 (broader): No other SDK imports (redis, aws-sdk, openai family)
grep -n "import.*redis\|import.*ioredis\|import.*elasticsearch\|import.*pg\|import.*aws-sdk\|import.*anthropic\|import.*openai" \
  server/src/engine/flows/FLOW-XX/t47-*.service.ts
# Expected: 0 hits

# P-1 + DNA-5: No ClsService import AND no scope_id construction (v1.1 — FIXED)
# THE ORIGINAL CHECK WAS: grep -n "scope_id|scopeId" — THIS MISSES GAP-01
# ClsService import is the actual violation. A service using cls.get() has zero
# scope_id references and passed the old check silently.
grep -n "import.*ClsService\|from 'nestjs-cls'\|TENANT_CONTEXT_KEY\|cls\.get(" \
  server/src/engine/flows/FLOW-XX/t47-*.service.ts
# Expected: 0 hits
# SILENT_FAILURE class: concurrent tenantId leaks without any test failure signal
# FIX: replace cls.get(TENANT_CONTEXT_KEY) with explicit tenantId from EngineContract input

# Keep original scope_id check too (catches a different violation):
grep -n "scope_id\|scopeId" server/src/engine/flows/FLOW-XX/t47-*.service.ts \
  | grep "tenantId.*:\|:.*tenantId"
# Expected: 0 hits (no scope prefix construction)

# DNA-8: Store before emit (outbox-before-queue pattern)
grep -n "queue\|emit\|publish\|sendMessage\|produce" server/src/engine/flows/FLOW-XX/t47-*.service.ts
# These lines must come AFTER the database write lines in the same function

# DNA-7: Idempotency key present for all queue operations
grep -n "idempotencyKey\|idempotency_key\|messageDeduplicationId" \
  server/src/engine/flows/FLOW-XX/t47-*.service.ts
# Expected: at least 1 hit per queue operation

# DNA-4: DataProcessResult used (not raw throw)
grep -n "throw\|reject(" server/src/engine/flows/FLOW-XX/t47-*.service.ts
# Top-level throw is a DNA-4 violation (should be DataProcessResult.failure())
```

**Pass condition:** 0 D-HIST-001 SDK imports, 0 other SDK imports, 0 ClsService imports,
no scope prefix construction, store-before-emit holds, idempotency keys present,
no top-level throws.

---

## LAYER 3 — SILENT FAILURE CHECK (highest priority)

This layer finds code that LOOKS correct but teaches the wrong pattern.

**The MACHINE constant test:**

For every value in the generated code that is a number, string constant, or
threshold — apply the security-break test:

> "If a tenant sets this value to the maximum reasonable value, does a security
> guarantee break?"

```bash
grep -n "[0-9]\{2,\}\|'[a-zA-Z_-]\+'" server/src/engine/flows/FLOW-XX/t47-*.service.ts \
  | grep -v "import\|\/\/"
```

For each extracted constant, classify using SK-451 (freedom-machine-classification):

| Constant | Security-break test | Classification | Correct code |
|----------|--------------------|-----------------|-|
| `60` (QR TTL) | Tenant sets 600 → replay window destroyed | MACHINE | `const QR_TOKEN_TTL_SECONDS = 60` |
| `0.80` (confidence) | Tenant sets 0.30 → lower-quality matching | FREEDOM | `config.get('matchingThreshold', 0.80)` |
| `86400` (verification TTL) | Tenant sets 604800 → longer window, no security break | FREEDOM | `config.get('verificationTtlSeconds', 86400)` |
| `3` (max attempts) | Tenant sets 100 → brute force possible | MACHINE | `const MAX_LOGIN_ATTEMPTS = 3` |

**CRITICAL:** Any MACHINE constant that appears as `config.get(...)` is a SILENT_FAILURE.

**Also check FREEDOM key naming (P-3):**
```bash
# FREEDOM keys must use flow-scoped prefix flow{NN}_
grep -n "freedom\.get\|fromConfig" server/src/engine/flows/FLOW-XX/t47-*.service.ts \
  | grep -v "flow[0-9][0-9]*_"
# Expected: 0 hits (all FREEDOM keys flow-scoped)
# VIOLATION: 'myParam' without flow prefix → collides across installations
```

---

## LAYER 4 — BEHAVIORAL ASSERTION CHECK (D2-F1)

This layer catches stub tests — tests that prove the service ran but not that it did
the right thing. Stub tests enter the DPO corpus as "valid" code with "passing" tests,
contaminating training data with a pattern that has zero behavioral proof.

**Detection — stub test patterns:**
```bash
STUBS=$(grep -cE "expect\(true\)\.toBe\(true\)|expect\(true\)\.toEqual\(true\)|expect\(result\.success\)\.toBe\(true\)$" \
  server/src/engine/flows/FLOW-XX/*.spec.ts 2>/dev/null || echo 0)
echo "Stub assertions: $STUBS"   # Expected: 0

BEHAVIORAL=$(grep -cE "result\.data\['|result\.data\.|\.toMatchObject|toHaveBeenCalledWith|\.toContain|toHaveProperty" \
  server/src/engine/flows/FLOW-XX/*.spec.ts 2>/dev/null || echo 0)
echo "Behavioral assertions: $BEHAVIORAL"   # Expected: >0 per service
```

**Three required behavioral assertions per service:**
1. **Tenant isolation:** `expect(result.data['tenantId']).toBe('test-tenant-001')` — proves tenantId scoped correctly
2. **Domain status:** `expect(result.data['status']).toBe('EXPECTED_STATUS')` — proves correct state written
3. **Side effect:** `expect(mockQueue.enqueue).toHaveBeenCalledWith(...)` — proves correct event emitted

**Minimum acceptable test:**
```typescript
it('should [domain verb] and emit [domain event]', async () => {
  // Arrange — explicit tenantId, not from CLS
  const input = { ...validInput, tenantId: 'test-tenant-001' };

  // Act
  const result = await service.execute(input);

  // Assert — ALL THREE required:
  expect(result.success).toBe(true);
  expect(result.data['tenantId']).toBe('test-tenant-001');           // 1. Tenant scope
  expect(result.data['status']).toBe('EXPECTED_DOMAIN_STATUS');      // 2. Domain outcome
  expect(mockQueue.enqueue).toHaveBeenCalledWith(                    // 3. Side effect
    expect.any(String),
    expect.objectContaining({ type: 'domain.event.name' }),
    expect.any(String)
  );
});
```

**LAYER 4 VERDICT:**
- `stubs === 0 AND behavioral > 0 per service` → **PASS**
- `stubs > 0` → **REJECT** — stub assertions must be replaced before DPO capture
- `behavioral === 0 for any service` → **REJECT** — add domain-outcome assertions

---

## LAYER 5 — AUTH DECLARATION CHECK — NEW v1.2.0

This layer catches controllers and routes without authorization declarations. Generated
code without `@UseGuards` / `@Roles` / `@Public()` is syntactically valid, tests pass,
and it scores well — but it teaches every future generation that unguarded routes are
the correct pattern. Unguarded code must never become a DPO `chosen` candidate.

**Detection — auth declaration check:**
```bash
CONTROLLERS=$(grep -c "@Controller(" \
  server/src/engine/flows/FLOW-XX/t47-*.controller.ts 2>/dev/null || echo 0)

if [ "$CONTROLLERS" -gt 0 ]; then
  # A-1: Every @Controller must have @UseGuards
  GUARDS=$(grep -c "@UseGuards" \
    server/src/engine/flows/FLOW-XX/t47-*.controller.ts 2>/dev/null || echo 0)
  echo "A-1 Controllers: $CONTROLLERS | @UseGuards declarations: $GUARDS"
  # Expected: GUARDS >= CONTROLLERS

  # A-2: Every route must have @Roles() or @Public()
  ROUTES=$(grep -cE "@Get\(|@Post\(|@Put\(|@Delete\(|@Patch\(" \
    server/src/engine/flows/FLOW-XX/t47-*.controller.ts 2>/dev/null || echo 0)
  AUTH_DECL=$(grep -cE "@Roles\(|@Public\(\)" \
    server/src/engine/flows/FLOW-XX/t47-*.controller.ts 2>/dev/null || echo 0)
  echo "A-2 Routes: $ROUTES | @Roles/@Public declarations: $AUTH_DECL"
  # Expected: AUTH_DECL >= ROUTES
else
  echo "Layer 5: No controllers in this file — N/A"
fi
```

**AUTH_DEFERRED exception:**
If `AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4` are not yet deployed to the target
environment, controllers may be generated without guards. Record the exception:

```bash
# Check if auth infrastructure is present:
AUTH_MODULE=$(ls server/src/auth/auth.module.ts 2>/dev/null | wc -l)
if [ "$AUTH_MODULE" -eq 0 ]; then
  echo "⚠️  AUTH_DEFERRED: auth.module.ts absent — Layer 5 check skipped"
  echo "    Code is candidate for chosen but carries AUTH_DEFERRED label"
  echo "    DPO triple must include authStatus=AUTH_DEFERRED in metadata"
  # Do NOT block DPO capture — but mark the triple so it can be upgraded later
fi
```

**When auth infra IS present and violations exist:**
Generated code with `@Controller` but no `@UseGuards`, or routes with no `@Roles`/`@Public()`,
is a DPO REJECT. Fix before capture:

```typescript
// REJECT pattern — controller without auth:
@Controller('flow-xx')
export class FlowXxController {
  @Get('items')
  async getItems() { ... }
}

// PASS pattern — controller with auth:
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('flow-xx')
export class FlowXxController {
  @Roles(ROLE.TENANT_ADMIN, ROLE.TENANT_USER)
  @Get('items')
  async getItems() { ... }
}
```

**LAYER 5 VERDICT:**
- `No controllers in file` → **PASS (N/A)**
- `AUTH_DEFERRED (auth.module.ts absent)` → **PASS with label** — DPO triple metadata must include `authStatus: AUTH_DEFERRED`
- `GUARDS >= CONTROLLERS AND AUTH_DECL >= ROUTES` → **PASS**
- `GUARDS < CONTROLLERS` → **REJECT** — add `@UseGuards` before `@Controller`
- `AUTH_DECL < ROUTES` → **REJECT** — add `@Roles(...)` or `@Public()` to each undecorated route

---

## REVIEW VERDICT (all 5 layers required)

```
LAYER 1: Semantic Review        — function names, variable names, error messages
LAYER 2: DNA + Portability      — 9 DNA rules + P-1 ClsService + D-HIST-001 + P-3 FREEDOM key naming
LAYER 3: SILENT_FAILURE         — MACHINE vs FREEDOM constant classification
LAYER 4: Behavioral Assertion   — no stub tests, domain-outcome assertions present
LAYER 5: Auth Declaration       — @UseGuards present, every route has @Roles or @Public()

Any layer REJECT → do NOT capture as DPO chosen. Fix first.
AUTH_DEFERRED (Layer 5 only) → capture with authStatus: AUTH_DEFERRED label in DPO metadata.
```

## Changelog

- **v1.0.0** — initial skill. Layers 1-3: semantic, DNA, silent failure.
- **v1.1.0** — Layer 2: P-1 ClsService import check replaces scope_id grep (GAP-01 fix).
  Layer 4: behavioral assertion gate (D2-F1). Closes G-30.
- **v1.2.0** — Layer 2: D-HIST-001 direct SDK import check added (from PORTABILITY-TEST-
  PROTOCOL-v2.0 Layer 1 Step 2). Layer 5: auth declaration check (A-1 @UseGuards, A-2
  @Roles/@Public per route). AUTH_DEFERRED exception documented. Closes AUTH-ARBITER-
  SKILLS-REMEDIATION-PLAN-v3.0 Phase 3.
