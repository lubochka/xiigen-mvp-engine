---
name: bug-to-tests-skill
sk_number: SK-415
version: "1.0.0"
priority: MANDATORY
load_order: 13
author: luba
updated: "2026-03-18"
description: >
  Enforces test-first discipline for every confirmed engine bug.
  Three failing tests must exist and be confirmed failing before any
  fix is written. Tests before fix — always.
---

# Bug-to-Tests Skill v1.0 (SK-415)

## The Iron Rule

> A test assertion change requires **Luba explicit approval**.
> Adapting a test to accept wrong output = **session failure**.

If a test is failing because the engine produces wrong output, the fix
goes in the **engine** — not in the test's `expect()` call. The only time
a test assertion changes is when the correct expected behavior itself changes
(which is a product decision requiring approval).

---

## The Protocol

### Step 1 — Assign a Bug Identifier

Every confirmed bug gets a unique identifier before any test or fix is written:

```
BUG-ENGINE-NN: <one-sentence description of the wrong behavior>
CLASS:         A | B | C | D | E | F  (see engine-qa-skill for taxonomy)
AFFECTED:      <AF station, DNA guard, fabric provider, or skill block>
FLOW:          <FLOW-XX or N/A if not flow-specific>
TASK TYPE:     <T-XXX or N/A>
REPORTED IN:   <file:line or test name>
```

**Bug class quick reference (from engine-qa):**
- A: Fabric Provider — wrong DataProcessResult shape from a provider
- B: Queue Coordination — consumer lag, DLQ overflow, event ordering
- C: DNA Pattern — generated code violates DNA-1 through DNA-9
- D: AF Pipeline — station uses stale/wrong data from upstream
- E: BFA Conflict — two flows publish the same event / collision
- F: Engine Contract — required field missing or wrong type in contract

**NN assignment:** Sequentially from current max in `BUG-ENGINE-NN` registry.
Check `server/test/` for the highest existing `BUG-ENGINE-NN` before assigning.

---

### Step 2 — Write 3 FAILING Tests (before any fix)

Write one test per level. Run each test. Confirm it **FAILS** before proceeding.

#### Test 1 — Unit (Level 1)

```typescript
// File: test/af-stations/<station>.spec.ts  OR  test/fabrics/<provider>.spec.ts
// OR appropriate unit location for the component

describe('BUG-ENGINE-NN: <description>', () => {
  it('reproduces the bug at unit level', async () => {
    // Arrange — minimal setup, mock external boundaries
    const input = sampleContracts.getStationInput('T-XXX', 'af<N>-<name>');

    // Act
    const result = await station.process(input);

    // Assert — this MUST FAIL before the fix
    // Assert the CORRECT expected behavior, not what the bug produces
    expect(result.success).toBe(true);
    expect(result.data.<specific-field>).toBe(<expected-correct-value>);
  });
});
```

**Run and confirm failure:**
```bash
cd server && npx jest test/af-stations/<station>.spec.ts --verbose 2>&1 | grep -E "FAIL|PASS|✓|✗|●"
# Expected output: FAIL (if passing, the bug is not reproduced — re-examine)
```

#### Test 2 — Simulation (Level 2)

```typescript
// File: test/<component>-integration.spec.ts
// Uses NestJS TestingModule + real sample-contracts.ts fixtures
// Mocks external service boundaries (AI, DB) only

describe('BUG-ENGINE-NN: integration reproduction', () => {
  let module: TestingModule;
  let station: <StationType>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [<relevant NestJS modules>],
      providers: [
        <StationType>,
        { provide: <FabricToken>, useValue: mockProvider },
      ],
    }).compile();
    station = module.get(<StationType>);
  });

  it('reproduces the bug in NestJS context with real contracts', async () => {
    const input = sampleContracts.getStationInput('T-XXX', 'af<N>-<name>');
    const result = await station.process(input);

    // Assert correct expected behavior — MUST FAIL before fix
    expect(result.success).toBe(true);
    expect(result.data.<specific-field>).toBe(<expected-correct-value>);
  });
});
```

#### Test 3 — E2E / Contract (Level 3)

```typescript
// File: test/phase9-lifecycle.spec.ts  OR  test/fabrics/<provider>.spec.ts
// Uses full pipeline or docker-compose.test.yml provider

describe('BUG-ENGINE-NN: e2e regression', () => {
  it('does not regress after fix — full pipeline', async () => {
    // Full lifecycle test using the task type affected by the bug
    const contract = sampleContracts.getContract('full');
    const result = await engine.processContract(contract);

    // Assert the specific output that was wrong
    expect(result.phases[<N>].output.<specific-field>).toBe(<expected-correct-value>);
  });
});
```

---

### Step 3 — Confirm All 3 Tests FAIL

```bash
cd server && npx jest --testPathPattern="BUG-ENGINE-NN|<pattern>" --verbose 2>&1 | tail -30
```

Expected output before fix:
```
FAIL test/af-stations/<station>.spec.ts
  ● BUG-ENGINE-NN › reproduces the bug at unit level
FAIL test/<component>-integration.spec.ts
  ● BUG-ENGINE-NN › reproduces the bug in NestJS context
FAIL test/phase9-lifecycle.spec.ts
  ● BUG-ENGINE-NN › does not regress after fix
```

If any test PASSES before the fix: the test is not actually reproducing
the bug. Re-examine the assertion. Do NOT declare the test written and
proceed — a passing "reproduction" test is no protection.

---

### Step 4 — Fix the Engine (NOT the tests)

Apply the fix to the engine-level component:
- AF station: `server/src/af-stations/<station>.ts`
- DNA guard: `server/src/dna/<guard>.ts`
- Fabric provider: `server/src/fabrics/<provider>.ts`
- Skill block: `server/src/skills/<block>.ts`

**Never fix:**
- The test's `expect()` call (without Luba approval)
- A generated output file that is produced by a buggy AF station
  → fix the station, not the output (see retroactive-development-skill)

---

### Step 5 — Confirm All 3 Tests PASS

```bash
cd server && npx jest --testPathPattern="BUG-ENGINE-NN|<pattern>" --verbose 2>&1 | tail -30
```

Expected output after fix:
```
PASS test/af-stations/<station>.spec.ts
  ✓ BUG-ENGINE-NN › reproduces the bug at unit level
PASS test/<component>-integration.spec.ts
  ✓ BUG-ENGINE-NN › reproduces the bug in NestJS context
PASS test/phase9-lifecycle.spec.ts
  ✓ BUG-ENGINE-NN › does not regress after fix
```

---

### Step 6 — Zero-Regression Gate

```bash
cd server && npm test 2>&1 | tail -5
# Test count must be ≥ session-start baseline + 3 (the 3 new tests)

cd client && npm test 2>&1 | tail -5
# Δ new failures vs preExistingFailures.client[] = 0
```

**Count-below-baseline rule (universal):** the gate is not only "0 failures". If
the passed-test count is BELOW `baseline + 3`, a pre-existing test was deleted,
renamed away, or `.skip`ped while you worked. A green suite with fewer tests is a
**regression**, not a pass. Find the missing test (`git diff` the spec files,
search for `.skip`/`xit`/`describe.skip`), restore it, or — if its removal is
legitimately correct — get Luba approval (Iron Rule). Never let the count silently
drop to make the suite green.

---

## BUG-ENGINE-NN Registry

Track every bug in the bug record format:

```
BUG-ENGINE-NN: <description>
CLASS: A/B/C/D/E/F
AFFECTED: <component>
ROOT CAUSE: <mechanism — one sentence>
WRONG ASSUMPTION: <what the code assumed that was false>
FIX: <what changed in engine — file:line>
DNA PATTERNS AFFECTED: DNA-N (or N/A)
TESTS ADDED:
  L1: test/af-stations/<file>.spec.ts — "<test name>"
  L2: test/<integration>.spec.ts — "<test name>"
  L3: test/phase9-lifecycle.spec.ts — "<test name>"
REGRESSION RISK: FLOW-XX, FLOW-YY (flows that use the same component)
STATUS: OPEN | FIXED | VERIFIED
```

---

## Anti-Patterns

### AP-1: Fix Before Tests
```
BUG found → fix applied → then "write a test to cover it"
```
**Why wrong:** The test is written to match the fix, not to prove the bug.
It can never fail on a regression. It is documentation, not protection.

### AP-2: Test Assertion Adjustment
```
Test: expect(result.data.skillsActive).toContain('SK-PLAN')
Bug: skillsActive is empty
"Fix": expect(result.data.skillsActive.length).toBeGreaterThanOrEqual(0)
```
**Why wrong:** The test now passes on the buggy output.
**What to do:** Fix the engine so skillsActive contains 'SK-PLAN'.

### AP-3: Only Writing the Unit Test
```
L1: written, failing ✓
L2: "not needed, unit covers it"
L3: "not needed, too much setup"
```
**Why wrong:** L2 or L3 failures are the only way to catch mocking assumptions
that mask the real bug. See three-level-verification.

### AP-4: Generic Assertion
```
expect(result.success).toBe(true)
```
**Why wrong:** Any branch that returns success satisfies this. The test
does not prove the specific path or field value was correct.
Always assert on the path-specific token (see coverage-vs-execution.md).

### AP-5: Reproducing an error/guard bug without asserting the error code
```
// Bug: a guard should reject empty tenant scope with TENANT_SCOPE_MISSING,
// but currently it succeeds.
expect(result.isSuccess).toBe(false)   // ✗ too weak
```
**Why wrong:** `isSuccess === false` passes for ANY failure, including an
unrelated one — it does not prove the correct guard fired. The reproduction test
must assert the **specific domain error code** (behavioral-assertion-gate; mirrors
`test-integrity` Rule 6). For a guard/error bug the FAILING-before-fix test asserts
the exact code the engine must return:
```
expect(result.isSuccess).toBe(false);
expect(result.errorCode).toBe('TENANT_SCOPE_MISSING'); // domain outcome, not just !success
```

> **mvp `DataProcessResult<T>` field idiom:** read success via `result.isSuccess`,
> payload via `result.data`, and the error via `result.errorCode`
> (`server/src/kernel/data-process-result.ts`). Older snippets in this file use
> `result.success` to mark the success branch — in mvp tests prefer `result.isSuccess`
> and always pair an error-path reproduction with a concrete `result.errorCode`
> assertion. Success-only / `isSuccess`-only assertions are a behavioral-assertion
> failure class, not a style nit.

---

## Integration with Three-Level Verification

A bug fix is a mandatory trigger for three-level-verification.
After the fix:
1. Run three-level-verification routing table → identify L1/L2/L3 spec files
2. Those 3 spec files should be the bug-to-tests files you just wrote
3. If three-level-verification requires a DIFFERENT spec file than the one
   you wrote → add the fix coverage there too

The bug-to-tests files are the minimum. Three-level-verification may
require additional coverage in adjacent spec files.

---

## One-Line Summary

> "Confirm bug → write 3 FAILING tests → fix ENGINE → confirm 3 PASS.
> Test count +3 minimum. Assertion change = Luba approval required."
