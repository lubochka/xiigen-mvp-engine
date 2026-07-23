---
name: generated-code-review
sk_number: SK-474
version: "1.1.0"
priority: HIGH
load_order: 3
category: code-execution
author: luba
updated: "2026-04-23"
contexts: ["claude-code"]
description: >
  Systematic four-layer human inspection of generated service code.
  Layer 2 now checks ClsService import (not just scope_id) — the actual
  GAP-01 pattern. Layer 4 added: behavioral assertion gate (D2-F1) to
  catch stub tests before they enter the DPO corpus. Closes G-30.
---

# Generated Code Review Skill (SK-474) v1.1

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

---

## WHEN TO RUN

After Phase B produces any service file that will become a DPO triple.
Specifically: after cycle-1 scores come back ≥ 0.65 and the code is a candidate
for `chosen` — before Phase E capture.

**All 4 layers must PASS before code becomes DPO chosen candidate.**

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

## LAYER 2 — DNA COMPLIANCE + PORTABILITY (v1.1 extended)

Nine DNA patterns must hold. **P-1 ClsService check replaces the original DNA-5 scope_id check.**

```bash
# DNA-6: No SDK imports
grep -n "import.*redis\|import.*ioredis\|import.*elasticsearch\|import.*pg\|import.*aws-sdk\|import.*anthropic\|import.*openai" \
  server/src/engine/flows/FLOW-XX/t47-*.service.ts
# Expected: 0 hits

# P-1 + DNA-5: No ClsService import AND no scope_id construction (v1.1 — FIXED)
# THE ORIGINAL CHECK WAS: grep -n "scope_id\|scopeId" — THIS MISSES GAP-01
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

**Pass condition:** 0 SDK imports, 0 ClsService imports, no scope prefix construction,
store-before-emit holds, idempotency keys present, no top-level throws.

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

## LAYER 4 — BEHAVIORAL ASSERTION CHECK (D2-F1) — NEW v1.1.0

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

## REVIEW VERDICT (all 4 layers required)

```
LAYER 1: Semantic Review      — function names, variable names, error messages
LAYER 2: DNA + Portability    — 9 DNA rules + P-1 ClsService + P-3 FREEDOM key naming
LAYER 3: SILENT_FAILURE       — MACHINE vs FREEDOM constant classification
LAYER 4: Behavioral Assertion — no stub tests, domain-outcome assertions present

Any layer REJECT → do NOT capture as DPO chosen. Fix first.
```
