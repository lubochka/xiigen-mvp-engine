
## GOLDEN RULE GR-001 — Zero Tech Debt, No Pre-Existing Carve-Outs

**Source:** Direct instruction from Luba. Absolute. No exceptions without explicit
Luba approval on record.

> "Zero tech debt = zero tech debt, full stop. No carve-outs, no 'pre-existing'
> exceptions. Fixing everything now."

**What this means for test integrity:**

`failures === 0` means the FULL test suite has zero failures — not "zero new failures
added this session." A session that closes with pre-existing failures still present
has NOT satisfied P19. The label "pre-existing" has no governance weight.

**The anti-pattern this rule eliminates:**
```
❌ WRONG: "failures === 0 means A0.5 introduces no new failures (satisfied)."
   → Pre-existing failures remain. Session declared done. VIOLATION.

✅ CORRECT: failures === 0 means the full suite output shows zero failures.
   → If pre-existing failures exist: fix them, or escalate to Luba for named deferral.
   → "Pre-existing" is not a deferral reason. It is a description with no governance weight.
```

**Acceptable exception path (only path):**
1. Luba explicitly approves leaving the failure in place THIS session
2. Issue recorded as: `DEFERRED — Luba approval [date] — fix in [named session]`
3. Carry-forward file updated

**Review gate (fires at every ⛔ STOP alongside Rule 7 and Rule 8):**
```
□ GR-001: cd server && npx jest 2>&1 | grep "Tests:.*failed" → 0 hits
□ GR-001: failures in this suite === 0, not "same count as baseline"
□ GR-001: no failure labeled "pre-existing" without Luba approval on record
```

---
---
name: test-integrity-skill
sk_number: SK-414
version: "2.2.0-GR001"
load_order: 12
priority: MANDATORY
author: luba
updated: "2026-04-24"
description: >
  Catches failure modes that produce green tests while making the codebase worse.
  v2.1 adds Rule 6 (D2-F1 behavioral assertion gate). v2.2 adds Rule 7 (auth
  route test: 401/403/200 per controller) and Rule 8 (cross-tenant JWT isolation:
  R6 requirement — Tenant B token rejected on Tenant C routes). Both rules are
  WARN at TIER-A/B and BLOCK at TIER-C certification. Closes AUTH-ARBITER-SKILLS-
  REMEDIATION-PLAN-v3.0 Phase 6.
entry: SKILL.md
rules:
  - rules/test-fix-or-code-fix.md
  - rules/branch-reachability.md
  - rules/coverage-vs-execution.md
  - rules/pipeline-function-coverage.md
  - rules/contract-driven-testing.md
  - rules/behavioral-assertion-gate.md
  - rules/auth-route-test.md
  - rules/cross-tenant-jwt-isolation.md
triggers:
  - "test fails after guard change"
  - "mock changed to make test pass"
  - "branch unreachable"
  - "all tests pass but tests were modified"
  - "DNA check skipped in mock"
  - "coverage inflation"
  - "test assertion changed"
  - "integration test added"
  - "stub test"
  - "expect true to be true"
  - "behavioral assertion"
  - "domain outcome"
  - "401 test"
  - "403 test"
  - "auth test"
  - "unauthenticated"
  - "cross-tenant JWT"
  - "R6"
  - "tenant isolation JWT"
---

# Test Integrity Skill v2.2 (+ GR-001 Zero Tech Debt)

## When to Invoke

When any of the following occur:
- Test fails after a guard condition changes
- A mock was modified to make a failing test pass
- Test count increased but code coverage decreased
- Any test assertion was changed (not added — changed)
- A new integration test was added
- **v2.1:** After writing any new service spec file
- **v2.1:** Before declaring any phase complete
- **NEW v2.2:** After adding `@UseGuards` or `@Roles` to any controller
- **NEW v2.2:** Before TIER-C certification (R6 cross-tenant JWT isolation required)

---

## The 8 Rules

| # | Rule | What It Catches | Impact |
|---|------|-----------------|--------|
| 1 | `test-fix-or-code-fix` | Fixing a test by changing the mock instead of the code | HIGH |
| 2 | `branch-reachability` | Downstream branch made unreachable by guard stacking | HIGH |
| 3 | `coverage-vs-execution` | Test count up, real execution coverage down (fabric bypass) | HIGH |
| 4 | `pipeline-function-coverage` | AF station pair tested in isolation, never in chain | MEDIUM |
| 5 | `contract-driven-testing` | Hand-crafted StationInput instead of real EngineContract fixture | MEDIUM |
| 6 | `behavioral-assertion-gate` | Stub tests / result.success-only assertions before DPO capture | HIGH |
| 7 | `auth-route-test` | Controller spec missing 401 (no JWT) and 403 (wrong role) assertions | HIGH — NEW v2.2 |
| 8 | `cross-tenant-jwt-isolation` | No test verifying Tenant B's JWT is rejected on Tenant C's routes | HIGH — NEW v2.2 |

---

## Rule 6: Behavioral Assertion Gate (FM-6 — D2-F1)

**Impact: HIGH**

A test asserting only `result.success === true` confirms the service ran without
crashing. It does NOT confirm tenant isolation, domain correctness, or side effects.
Tests that only check `result.success` contaminate the DPO training corpus.

**Detection:**
```bash
FLOW_DIR="server/src/engine/flows/{slug}"

# Step 1: Find stub assertions
STUBS=$(grep -rcE \
  "expect\(true\)\.toBe\(true\)|expect\(true\)\.toEqual\(true\)|expect\(result\.success\)\.toBe\(true\)$" \
  $FLOW_DIR --include="*.spec.ts" | wc -l)
echo "Stub assertions: $STUBS"   # Expected: 0

# Step 2: Count domain-outcome assertions per service
for SPEC in $FLOW_DIR/*.spec.ts; do
  SERVICE=$(basename $SPEC .spec.ts)
  BEHAVIORAL=$(grep -cE \
    "result\.data\[|result\.data\.|\.toMatchObject|toHaveBeenCalledWith|\.toContain|toHaveProperty" \
    $SPEC 2>/dev/null || echo 0)
  echo "$SERVICE: behavioral assertions = $BEHAVIORAL"
done
```

**Three required behavioral assertions per service:**

1. **Tenant isolation** — `result.data['tenantId']` equals the test tenant
2. **Domain status** — correct business state set on the stored record
3. **Side effect** — correct event emitted with correct payload

**Concurrent tenant isolation test** — required for any service using Promise.all():
```typescript
it('should not leak tenantId in concurrent execution', async () => {
  const [resultA, resultB] = await Promise.all([
    service.execute({ ...validInput, tenantId: 'tenant-a' }),
    service.execute({ ...validInput, tenantId: 'tenant-b' }),
  ]);
  expect(resultA.data['tenantId']).toBe('tenant-a');
  expect(resultB.data['tenantId']).toBe('tenant-b');
});
```

---

## Rule 7: Auth Route Test (FM-7) — NEW v2.2.0

**Impact: HIGH**

A controller with `@UseGuards` and `@Roles` that has no auth-specific tests can
still contain routing bugs that silently bypass protection. Tests must verify:
- Protected routes return **401** when no JWT is provided
- Protected routes return **403** when a JWT is present but the role is wrong
- `@Public()` routes return **200** without any JWT

Without these tests, a misconfigured guard (e.g. wrong guard order, missing
`@Roles` on a route) will deploy and score silently — no test failure, no alert.

**Detection:**
```bash
FLOW_DIR="server/src/engine/flows/{slug}"

# Check for controller spec files
CTRL_SPECS=$(find $FLOW_DIR -name "*.controller.spec.ts" 2>/dev/null | wc -l)
echo "Controller spec files: $CTRL_SPECS"

if [ "$CTRL_SPECS" -gt 0 ]; then
  # Count 401 assertions (unauthenticated request test)
  AUTH_401=$(grep -rcE "\.expect\(401\)|expectStatus.*401|status.*401|HttpStatus\.UNAUTHORIZED" \
    $FLOW_DIR --include="*.controller.spec.ts" 2>/dev/null \
    | awk -F: '{sum+=$2} END {print sum+0}')
  echo "Rule 7a — 401 (no JWT) assertions: $AUTH_401"   # Expected: ≥1

  # Count 403 assertions (authenticated but wrong role)
  AUTH_403=$(grep -rcE "\.expect\(403\)|expectStatus.*403|status.*403|HttpStatus\.FORBIDDEN" \
    $FLOW_DIR --include="*.controller.spec.ts" 2>/dev/null \
    | awk -F: '{sum+=$2} END {print sum+0}')
  echo "Rule 7b — 403 (wrong role) assertions: $AUTH_403"   # Expected: ≥1

  # Count 200 assertions on @Public() routes
  PUBLIC_200=$(grep -rcE "\.expect\(200\)|\.expect\(201\)|HttpStatus\.OK|HttpStatus\.CREATED" \
    $FLOW_DIR --include="*.controller.spec.ts" 2>/dev/null \
    | awk -F: '{sum+=$2} END {print sum+0}')
  echo "Rule 7c — 200/201 (public or auth pass) assertions: $PUBLIC_200"
else
  echo "Rule 7: No controller spec files found — N/A if flow has no controllers"
fi
```

**Required test templates:**

```typescript
// Template 1 — 401: No JWT provided (required for every protected route)
it('should return 401 when no JWT provided', async () => {
  await request(app.getHttpServer())
    .get('/api/{flow-slug}/items')
    .expect(401);
  // No Authorization header — JwtAuthGuard rejects
});

// Template 2 — 403: JWT present but wrong role
it('should return 403 when authenticated with insufficient role', async () => {
  const token = await getTokenForRole('viewer');  // role without @Roles permission
  await request(app.getHttpServer())
    .get('/api/{flow-slug}/admin-items')
    .set('Authorization', `Bearer ${token}`)
    .expect(403);
  // Valid JWT, wrong role — RolesGuard rejects
});

// Template 3 — 200: Correct role passes
it('should return 200 when authenticated with correct role', async () => {
  const token = await getTokenForRole('tenant-admin');
  await request(app.getHttpServer())
    .get('/api/{flow-slug}/items')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
});

// Template 4 — AUTH_DEFERRED variant (when auth.module.ts not yet deployed)
// When authStatus = AUTH_DEFERRED: test that route is reachable (not that it's guarded)
it('AUTH_DEFERRED: route accessible without JWT (to be guarded in Phase H)', async () => {
  await request(app.getHttpServer())
    .get('/api/{flow-slug}/items')
    .expect(200);  // Guards not yet active — document this will become 401
  // TODO Phase H: change this test to expect(401) after auth ships
});
```

**Rule 7 verdict:**
- `CTRL_SPECS === 0` → **PASS (N/A)** — no controllers, no auth tests needed
- `authStatus === AUTH_DEFERRED` → **PASS with label** — Template 4 variant acceptable;
  mark test with `TODO Phase H` comment
- `AUTH_401 >= 1 AND AUTH_403 >= 1` → **PASS**
- `AUTH_401 === 0` → **WARN at TIER-A/B; BLOCK at TIER-C** — add 401 test
- `AUTH_403 === 0` → **WARN at TIER-A/B; BLOCK at TIER-C** — add 403 test

---

## Rule 8: Cross-Tenant JWT Isolation (FM-8 — R6) — NEW v2.2.0

**Impact: HIGH**

Rule 6 tests tenant isolation at the service layer (data scoping). Rule 8 tests
tenant isolation at the HTTP layer (JWT token scoping). These are different failure
modes: a service can correctly scope ES documents by tenantId while a misconfigured
guard still accepts Tenant B's JWT on Tenant C's route.

This is the R6 requirement from FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 Phase 5c Step 2,
and is required for TIER-C certification (Guard 14 scope). The test proves that a JWT
issued to Tenant B cannot access resources belonging to Tenant C.

**Detection:**
```bash
FLOW_DIR="server/src/engine/flows/{slug}"

# Check for cross-tenant JWT test
R6_TESTS=$(grep -rcE \
  "cross.tenant|tenant.*B.*token.*C|JWT.*isolation|tenantB.*token|tenant_b.*token|crossTenant" \
  $FLOW_DIR --include="*.spec.ts" 2>/dev/null \
  | awk -F: '{sum+=$2} END {print sum+0}')
echo "Rule 8 — R6 cross-tenant JWT isolation tests: $R6_TESTS"
# Expected: ≥1 for TIER-C certification target
# WARN at TIER-A/B; BLOCK at TIER-C
```

**Required test template:**

```typescript
// R6 cross-tenant JWT isolation test
// Tenant B's valid JWT must be rejected when accessing Tenant C's resources
describe('R6: Cross-Tenant JWT Isolation', () => {
  it('rejects Tenant B JWT on Tenant C routes', async () => {
    // Arrange: obtain a valid JWT scoped to Tenant B
    const tenantBToken = await loginAs({
      email: 'user@tenant-b.com',
      password: 'test-password',
      tenantId: 'tenant-b',
    });

    // Act: attempt to access a resource that belongs to Tenant C
    // (tenantId encoded in route param or resolved from JWT — either way, B ≠ C)
    const response = await request(app.getHttpServer())
      .get('/api/{flow-slug}/tenant-c-resource-id')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .send();

    // Assert: access denied — Tenant B cannot read Tenant C's data
    expect(response.status).toBeOneOf([401, 403]);
    // 401 if TenantGuard rejects the token as belonging to wrong tenant
    // 403 if TenantGuard passes but RolesGuard or resource check rejects
    // Both are acceptable; neither 200 nor any 2xx is acceptable
  });

  it('accepts Tenant B JWT on Tenant B routes', async () => {
    // Sanity check: the same token IS accepted on Tenant B's own resources
    const tenantBToken = await loginAs({
      email: 'user@tenant-b.com',
      password: 'test-password',
      tenantId: 'tenant-b',
    });

    await request(app.getHttpServer())
      .get('/api/{flow-slug}/tenant-b-resource-id')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .expect(200);
    // Verifies the token itself is valid — the rejection above is about tenant scope
  });
});
```

**When to add Rule 8 test:**
- Targeting TIER-C certification → REQUIRED (BLOCK without it)
- TIER-A/B only → RECOMMENDED (WARN without it, not BLOCK)
- authStatus = AUTH_DEFERRED → SKIP (no JWT infrastructure yet; note for Phase H)
- Flow has no HTTP controllers → N/A

**Rule 8 verdict:**
- `R6_TESTS >= 1` → **PASS**
- `R6_TESTS === 0 AND authStatus === AUTH_DEFERRED` → **PASS with label** — add when auth ships
- `R6_TESTS === 0 AND TIER target < TIER_C` → **WARN** — recommended but not blocking
- `R6_TESTS === 0 AND TIER target === TIER_C` → **BLOCK** — R6 required before TIER-C

---

## Symptom → Rule Mapping

| Symptom | Primary rule | Secondary rule |
|---------|-------------|----------------|
| Mock changed to skip DNA validation | `test-fix-or-code-fix` | `coverage-vs-execution` |
| BFA rule and DNA guard both check same input | `branch-reachability` | `coverage-vs-execution` |
| Test count up, but integration mocks bypass fabric | `coverage-vs-execution` | `branch-reachability` |
| DNA-3 guard in AF-1 but not in AF-11 | `branch-reachability` (sibling audit) | `pipeline-function-coverage` |
| `expect(true).toBe(true)` in spec file | `behavioral-assertion-gate` | `test-fix-or-code-fix` |
| `expect(result.success).toBe(true)` only | `behavioral-assertion-gate` | `coverage-vs-execution` |
| Test passes but tenantId never asserted | `behavioral-assertion-gate` | `branch-reachability` |
| Controller spec has no 401 test | `auth-route-test` | — |
| Controller spec has no 403 test | `auth-route-test` | `coverage-vs-execution` |
| No test verifying cross-tenant JWT rejection | `cross-tenant-jwt-isolation` | `auth-route-test` |

---

## Gate 5 Pre-Code Checklist (updated v2.2)

```
□ For each failing test: run test-fix-or-code-fix before modifying any mock
□ For each guard changed in an AF station: run branch-reachability for all downstream branches
□ For each sibling AF station pair: run FM-4 sibling guard parity check
□ End-of-phase: run coverage-vs-execution if any test was modified (not just added)
□ All integration tests: verify they use real EngineContract fixtures, not synthetic mocks
□ v2.1: Stub assertion count = 0 for all spec files in this phase
□ v2.1: Each service has ≥1 assertion on result.data['tenantId']
□ v2.1: Each service has ≥1 assertion on a domain-status field
□ v2.1: Each service has ≥1 assertion on a side-effect (enqueue or storeDocument)
□ v2.1: Any service with Promise.all: concurrent tenant isolation test present
□ NEW v2.2 — Rule 7: Any controller spec has ≥1 test for 401 (no JWT)
□ NEW v2.2 — Rule 7: Any controller spec has ≥1 test for 403 (wrong role)
□ NEW v2.2 — Rule 7: AUTH_DEFERRED → Template 4 variant with TODO Phase H comment
□ NEW v2.2 — Rule 8: TIER-C target → R6 cross-tenant JWT isolation test present
□ NEW v2.2 — Rule 8: TIER-A/B target → R6 test recommended (WARN if absent)
```

---

## Rule Files

```
rules/test-fix-or-code-fix.md            ← FM-1: diagnose before touching any mock
rules/branch-reachability.md             ← FM-2 + FM-4: guard chain audit, sibling parity
rules/coverage-vs-execution.md           ← FM-3: count what executes, not what asserts
rules/pipeline-function-coverage.md      ← AF station + fabric coverage matrix
rules/contract-driven-testing.md         ← use real EngineContract fixtures, not synthetic
rules/behavioral-assertion-gate.md       ← FM-6: stub test detection + domain outcome check
rules/auth-route-test.md                 ← FM-7: 401/403/200 per controller (NEW v2.2)
rules/cross-tenant-jwt-isolation.md      ← FM-8: R6 cross-tenant JWT rejection (NEW v2.2)
```

---

## CLAUDE.md Maintenance Rules (additions for v2.2)

```
| New .service.ts file created in engine/flows/     | Run test-integrity behavioral-assertion-gate |
| .spec.ts test count increases this phase          | Run test-integrity behavioral-assertion-gate + coverage-vs-execution |
| AF station guard condition changed                | Run test-integrity branch-reachability |
| @nestjs/testing mock modified (not created new)   | Run test-integrity test-fix-or-code-fix |
| DNA guard added to one AF station                 | Run test-integrity FM-4 sibling audit |
| @UseGuards or @Roles added to controller (v2.2)   | Run test-integrity auth-route-test (Rule 7) |
| Targeting TIER-C certification (v2.2)             | Run test-integrity cross-tenant-jwt-isolation (Rule 8) |
```

## Changelog

- **v1.0.0** — initial skill. Rules 1-5: test-fix-or-code-fix, branch-reachability,
  coverage-vs-execution, pipeline-function-coverage, contract-driven-testing.
- **v2.0.0** — major revision. Gate 5 Pre-Code Checklist. Symptom → Rule mapping table.
  CLAUDE.md maintenance rules. rule files index.
- **v2.1.0** — Rule 6: behavioral assertion gate (FM-6, D2-F1). Stub test detection.
  Three required assertions per service. Concurrent tenant isolation test. Closes G-31.
- **v2.2.0** — Rule 7: auth route test (FM-7). 401/403/200 assertions required per
  controller spec. Template 4 AUTH_DEFERRED variant for pre-auth sessions. Rule 8:
  cross-tenant JWT isolation (FM-8, R6). Tenant B token must be rejected on Tenant C
  routes. WARN at TIER-A/B; BLOCK at TIER-C. Both rules respect AUTH_DEFERRED state.
  Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 6.
