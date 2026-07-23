---
name: test-integrity-skill
sk_number: SK-414
version: "2.1.0"
load_order: 12
priority: MANDATORY
author: luba
updated: "2026-04-23"
description: >
  Catches five failure modes that produce green tests while making the codebase
  worse. v2.1 adds Rule 6 (D2-F1 behavioral assertion gate): stub tests and
  result.success-only assertions are now a MANDATORY failure class. Closes G-31.
entry: SKILL.md
rules:
  - rules/test-fix-or-code-fix.md
  - rules/branch-reachability.md
  - rules/coverage-vs-execution.md
  - rules/pipeline-function-coverage.md
  - rules/contract-driven-testing.md
  - rules/behavioral-assertion-gate.md
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
---

# Test Integrity Skill v2.1

## When to Invoke

When any of the following occur:
- Test fails after a guard condition changes
- A mock was modified to make a failing test pass
- Test count increased but code coverage decreased
- Any test assertion was changed (not added — changed)
- A new integration test was added
- **NEW v2.1:** After writing any new service spec file
- **NEW v2.1:** Before declaring any phase complete

---

## The 6 Rules

| # | Rule | What It Catches | Impact |
|---|------|-----------------|--------|
| 1 | `test-fix-or-code-fix` | Fixing a test by changing the mock instead of the code | HIGH |
| 2 | `branch-reachability` | Downstream branch made unreachable by guard stacking | HIGH |
| 3 | `coverage-vs-execution` | Test count up, real execution coverage down (fabric bypass) | HIGH |
| 4 | `pipeline-function-coverage` | AF station pair tested in isolation, never in chain | MEDIUM |
| 5 | `contract-driven-testing` | Hand-crafted StationInput instead of real EngineContract fixture | MEDIUM |
| 6 | `behavioral-assertion-gate` | Stub tests / result.success-only assertions before DPO capture | HIGH — NEW v2.1 |

---

## Rule 6: Behavioral Assertion Gate (FM-6 — D2-F1) — NEW v2.1.0

**Impact: HIGH**

A test asserting only `result.success === true` confirms the service ran without
crashing. It does NOT confirm:
- Tenant isolation (tenantId correctly scoped, not leaked from CLS)
- Domain correctness (correct status set on the stored record)
- Side effect correctness (correct event emitted with correct payload)

Tests that only check `result.success` enter the DPO training corpus as "code with
passing tests" — teaching every future generation that stub tests are sufficient proof
of correctness. This is the D2-F1 failure class from the module-separation corpus.

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

**Three required behavioral assertions per service (all three required in at least one test):**

1. **Tenant isolation** — `result.data['tenantId']` equals the test tenant:
   ```typescript
   expect(result.data['tenantId']).toBe('test-tenant-001');
   ```

2. **Domain status** — correct business state set:
   ```typescript
   expect(result.data['status']).toBe('EXPECTED_DOMAIN_STATUS');
   ```

3. **Side effect** — correct event or record produced:
   ```typescript
   expect(mockQueue.enqueue).toHaveBeenCalledWith(
     expect.any(String),
     expect.objectContaining({ type: 'domain.event.past-tense' }),
     expect.any(String)
   );
   ```

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

**Anti-patterns:**
```typescript
// ❌ STUB — proves only that it ran:
it('should work', async () => {
  const result = await service.execute(input);
  expect(result.success).toBe(true);
});

// ✅ BEHAVIORAL — proves domain correctness:
it('should register member and emit RegistrationInitiated', async () => {
  const result = await service.execute({ ...input, tenantId: 'test-tenant-001' });
  expect(result.success).toBe(true);
  expect(result.data['tenantId']).toBe('test-tenant-001');   // tenant scope
  expect(result.data['status']).toBe('REGISTERED');           // domain state
  expect(mockQueue.enqueue).toHaveBeenCalledWith(            // side effect
    expect.any(String),
    expect.objectContaining({ type: 'xiigen.registration.initiated' }),
    expect.any(String)
  );
});
```

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

---

## Gate 5 Pre-Code Checklist (updated v2.1)

```
□ For each failing test: run test-fix-or-code-fix before modifying any mock
□ For each guard changed in an AF station: run branch-reachability for all downstream branches
□ For each sibling AF station pair: run FM-4 sibling guard parity check
□ End-of-phase: run coverage-vs-execution if any test was modified (not just added)
□ All integration tests: verify they use real EngineContract fixtures, not synthetic mocks
□ NEW v2.1: Stub assertion count = 0 for all spec files in this phase
□ NEW v2.1: Each service has ≥ 1 assertion on result.data['tenantId']
□ NEW v2.1: Each service has ≥ 1 assertion on a domain-status field
□ NEW v2.1: Each service has ≥ 1 assertion on a side-effect (enqueue or storeDocument)
□ NEW v2.1: Any service with Promise.all: concurrent tenant isolation test present
```

---

## Rule Files

```
rules/test-fix-or-code-fix.md    ← FM-1: diagnose before touching any mock
rules/branch-reachability.md     ← FM-2 + FM-4: guard chain audit, sibling parity
rules/coverage-vs-execution.md   ← FM-3: count what executes, not what asserts
rules/pipeline-function-coverage.md  ← AF station + fabric coverage matrix
rules/contract-driven-testing.md     ← use real EngineContract fixtures, not synthetic
rules/behavioral-assertion-gate.md   ← FM-6: stub test detection + domain outcome check (NEW v2.1)
```

---

## CLAUDE.md Maintenance Rules (additions for v2.1)

```
| New .service.ts file created in engine/flows/ | Run test-integrity behavioral-assertion-gate |
| .spec.ts test count increases this phase | Run test-integrity behavioral-assertion-gate + coverage-vs-execution |
| AF station guard condition changed (af-stations/*.ts) | Run test-integrity branch-reachability |
| @nestjs/testing mock modified (not created new) | Run test-integrity test-fix-or-code-fix |
| DNA guard added to one AF station | Run test-integrity FM-4 sibling audit |
```
