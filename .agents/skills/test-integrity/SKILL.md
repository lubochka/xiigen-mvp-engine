# Test Integrity Skill v2.0
## For: XIIGen Engine — NestJS + TypeScript

---

## Core Principle

**A passing test confirms an assertion holds. It does not confirm that the
branch you care about actually executed.**

These two things come apart whenever:
- A mock is changed to skip a DNA check (the guard is never reached)
- A guard is stacked on another guard making a downstream branch unreachable
- An integration test is added but unit mocks bypass the fabric (coverage inflation)
- A DNA guard exists in GenesisStation but is missing in its sibling FeedbackStation

When they come apart, test count goes up, coverage signals go green, and a
code path silently becomes dead or unguarded.

---

## The Four Failure Modes

| Mode | Trigger | Symptom | Rule |
|------|---------|---------|------|
| **FM-1: Mock-Fix Masking** | @nestjs/testing mock changed to skip DNA check | Test passes, guard never runs | `test-fix-or-code-fix` |
| **FM-2: Guard Stacking** | BFA rule stacked on DNA check | Downstream branch unreachable | `branch-reachability` |
| **FM-3: Coverage Inflation** | Integration tests added, unit mocks bypass fabric | Test count up, real coverage down | `coverage-vs-execution` |
| **FM-4: Sibling Guard Gap** | DNA-3 in GenesisStation, missing in FeedbackStation | Guard applied inconsistently across sibling AF stations | `branch-reachability` (sibling audit) |

---

## When to Invoke

Invoke this skill when ANY of the following occur:

- A test fails after a guard condition is changed in an AF station or DNA validator
- A `@nestjs/testing` mock is modified to make a test pass (not just created new)
- A phase ends with "all tests pass" and at least one test was modified (not just added)
- An integration test is added but the corresponding unit mock bypasses a fabric interface
- A DNA guard appears in one AF station but is missing in its sibling station
- Test count increases by more than the number of new behaviours introduced

---

## Quick Routing Table

| What just happened | Apply first | Then |
|-------------------|-------------|------|
| Test fails after DNA guard tightened | `test-fix-or-code-fix` | `branch-reachability` |
| Mock changed to skip DNA validation | `test-fix-or-code-fix` | `coverage-vs-execution` |
| BFA rule and DNA guard both check same input | `branch-reachability` | `coverage-vs-execution` |
| Test count up, but integration mocks bypass fabric | `coverage-vs-execution` | `branch-reachability` |
| DNA-3 guard in AF-1 but not in AF-11 | `branch-reachability` (sibling audit) | `pipeline-function-coverage` |
| "All tests pass" but a guard interaction exists in AF chain | `branch-reachability` | `coverage-vs-execution` |
| Contract-driven test uses hand-crafted fixture | `contract-driven-testing` | — |

---

## Rule Files

```
rules/test-fix-or-code-fix.md    ← FM-1: diagnose before touching any mock
rules/branch-reachability.md     ← FM-2 + FM-4: guard chain audit, sibling parity
rules/coverage-vs-execution.md   ← FM-3: count what executes, not what asserts
rules/pipeline-function-coverage.md  ← AF station + fabric coverage matrix
rules/contract-driven-testing.md     ← use real EngineContract fixtures, not synthetic
```

---

## Integration with planning-skill Gate 5 (Test Coverage Matrix)

Add to Gate 5 pre-code checklist:

```
□ For each failing test: run test-fix-or-code-fix before modifying any mock
□ For each guard changed in an AF station: run branch-reachability for all downstream branches
□ For each sibling AF station pair: run FM-4 sibling guard parity check
□ End-of-phase: run coverage-vs-execution if any test was modified (not just added)
□ All integration tests: verify they use real EngineContract fixtures, not synthetic mocks
```

Add to AGENTS.md Maintenance Rules:

```
| AF station guard condition changed (af-stations/*.ts) | Run test-integrity branch-reachability |
| @nestjs/testing mock modified (not created new)        | Run test-integrity test-fix-or-code-fix |
| DNA guard added to one AF station                      | Run test-integrity FM-4 sibling audit   |
```

---

## Anti-Patterns

### Anti-Pattern 1: Mock-Fix Masking
```
✗ Test fails because DNA-1 check blocks generation
  → Mock changed to bypass DNA validation
  → Test passes
  → DNA-1 guard now unreachable in production code

✓ Diagnose WHY the DNA check fires
  Fix the generated code to be DNA-1 compliant
  Keep the mock strict — it should reject non-compliant inputs
```

### Anti-Pattern 2: Guard Stacking
```
✗ BFA conflict check added after DNA check
  Both checks guard the same input path
  Input that passes DNA fails BFA → downstream branch unreachable
  No test ever reaches the branch

✓ Run branch-reachability for the combined guard chain
  Ensure each branch has at least one reachable test input
  If branch is dead: document Option A/B/C in DECISIONS.md
```

### Anti-Pattern 3: Coverage Inflation
```
✗ 6 new integration tests added
  All use in-memory fabric (bypasses real IFabricService contract)
  Unit mocks accept any input shape
  Test count: +6. Real contract coverage: +0

✓ At least one test per new integration path must use a real EngineContract fixture
  (from server/src/engine-contracts/sample-contracts.ts)
  Count tests that execute real fabric paths, not just tests that pass
```

### Anti-Pattern 4: Sibling Guard Gap
```
✗ DNA-3 guard (no thrown errors in business logic) added to af1-genesis.ts
  af11-feedback.ts processes similar inputs but has no DNA-3 guard
  Bug: feedback station throws errors that bypass DNA compliance

✓ After adding a DNA guard to any AF station:
  Audit all sibling stations that process the same input types
  Apply the same guard consistently across the sibling group
```
