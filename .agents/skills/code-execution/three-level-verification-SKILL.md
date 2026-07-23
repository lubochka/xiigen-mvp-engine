# Three-Level Verification Skill v1.0
## AF Pipeline Fix Verification — Unit + Simulation + Contract

---

## The Problem This Skill Solves

A fix to an AF station or fabric provider can pass all unit tests and still
break at simulation or contract level. This happens because unit tests mock
the dependencies that the fix actually touches. The mock insulates the test
from the real failure path.

Three failure scenarios:

1. **Unit passes, simulation fails**: The fix works in isolation but breaks
   when composed with real EngineContract data. The unit mock was too
   permissive — it accepted inputs the real contract doesn't produce.

2. **Simulation passes, contract fails**: The simulation used synthetic
   fixtures. The real engine contract has edge cases (missing optional fields,
   non-standard taskType combinations) that the synthetic fixture never covered.

3. **All pass locally, pipeline fails**: The fix works for the happy path
   but breaks when another AF station passes output as input. The contract
   replay reveals a shape mismatch.

**This skill prevents declaring a fix done before all 3 levels confirm it.**

---

## The 3-Level Protocol

Run in sequence. Stop at the first level that fails — do not skip to a higher
level to see if it passes.

### Level 1 — Unit Test

**Command:**
```bash
cd server && npx jest <specific-spec-file> --verbose
```

**What passes Level 1:**
- The specific spec file for the changed unit (AF station, DNA guard, fabric provider)
- 0 test failures
- The test asserts on the specific output path that was fixed — not just a generic output

**What fails Level 1:**
- Any test failure in the specific spec file
- Test passes but only because a mock is intercepting the fixed path

**Stop rule:** If Level 1 fails, do not proceed. Fix the unit. Re-run Level 1.

---

### Level 2 — Simulation (NestJS Integration)

**Command:**
```bash
cd server && npx jest <integration-spec> --verbose
```

**What passes Level 2:**
- NestJS TestingModule test using real EngineContract fixtures from
  `server/src/engine-contracts/sample-contracts.ts`
- No hand-crafted synthetic mocks — use the real contract objects
- The fix holds when the station receives real contract-shaped inputs
- DataProcessResult shape is correct throughout the pipeline

**What fails Level 2:**
- Test fails with real contract data even though unit test passed
- DataProcessResult.success is false on a path that should succeed
- Shape mismatch between what the fixed station produces and what the next
  station expects

**Stop rule:** If Level 2 fails, the unit mock was masking the real problem.
Re-examine the fix. A Level 2 failure after a Level 1 pass = the mock was wrong.

---

### Level 3 — Contract / E2E

**Command (NestJS e2e):**
```bash
cd server && npx jest test/phase9-lifecycle.spec.ts --verbose
```
**or Docker run (if fabric providers involved):**
```bash
docker-compose -f docker-compose.test.yml up -d
cd server && npx jest test/fabrics/<provider>.spec.ts --verbose
docker-compose -f docker-compose.test.yml down
```

**What passes Level 3:**
- The fix holds under full AF pipeline execution (AF-1 through AF-11 chain)
- If fabric providers are involved: Docker provider test passes
- Tenant isolation is preserved — fix does not bleed across tenants
- Session gate baseline is maintained: server tests ≥ session-start count

**What fails Level 3:**
- Pipeline test fails after passing simulation
- Fabric provider returns unexpected shape under real container conditions
- Tenant A's fix breaks Tenant B's isolation

**Stop rule:** If Level 3 fails after Levels 1 and 2 passed, there is a
composition problem. The fix is correct in isolation but wrong in the pipeline.
Look at the AF station before and after the fixed station.

---

## When to Invoke

**Mandatory:**
- After ANY fix to an AF station (`server/src/af-stations/`)
- After ANY change to a DNA guard
- After ANY fabric provider change
- After ANY skill block change that affects generated output
- Before declaring any bug fix complete
- Before phase-end gate

**Optional but recommended:**
- After adding new test fixtures to `sample-contracts.ts`
- After changing quality scorer thresholds
- After BFA registration changes

---

## Quick Routing Table

| What was fixed | Level 1 spec | Level 2 spec | Level 3 spec |
|---------------|-------------|-------------|-------------|
| AF station logic | `test/af-stations/<station>.spec.ts` | Integration test with sample-contracts.ts | `test/phase9-lifecycle.spec.ts` |
| DNA guard | `test/dna/<guard>.spec.ts` | Generated output validation | Lifecycle + dna-compliance-guard check |
| Fabric provider | `test/fabrics/<provider>.spec.ts` (in-memory) | Integration with IFabricService | Docker provider test |
| Skill block | `test/af-stations/skill-selection.spec.ts` | AF-4 + AF-9 integration | Lifecycle with skill injection |
| Quality scorer | `test/learning/feedback-quality.spec.ts` | Feedback loop integration | Lifecycle score propagation |

---

## Anti-Patterns

### Anti-Pattern 1: Declaring done after Level 1 only
```
✗ "All unit tests pass" → phase complete
✓ Run Level 2 before declaring done — mocks may be too permissive
```

### Anti-Pattern 2: Skipping Level 2 because "simulation is slow"
```
✗ Level 1 passes → skip to Level 3
✓ Level 2 catches mock-masking failures that Level 3 cannot diagnose
```

### Anti-Pattern 3: Using synthetic fixtures for Level 2
```
✗ Level 2 test uses hand-crafted { taskType: 'TEST', factoryId: 1 } object
✓ Level 2 test uses real objects from server/src/engine-contracts/sample-contracts.ts
```

### Anti-Pattern 4: Level 3 without Docker when fabric is involved
```
✗ Fabric provider fix verified only with in-memory provider
✓ If fix touches a real fabric (ES, PG, SQS), run Docker provider test
```

---

## Integration with Other Skills

```
bug-to-tests:              writes 3 FAILING tests → three-level-verification confirms all 3 pass
test-integrity:            Level 2 uses contract-driven-testing rule
retroactive-development:   Level 3 re-validates ALL flows using T-XXX (not just the fixed one)
dna-compliance-guard:      Level 1 unit test should include DNA guard check
```

---

## One-Line Summary

> **A fix is done when unit, simulation, AND contract all pass — not when
> the unit test alone goes green.**
