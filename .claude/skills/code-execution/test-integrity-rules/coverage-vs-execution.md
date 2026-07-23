---
title: Count What Executes, Not What Asserts
impact: HIGH
tags: coverage, dead-code, test-count, assertion, fabric-bypass, integration
---

## Count What Executes, Not What Asserts

**Impact: HIGH**

Test count is the wrong metric. A test suite can grow from 2,342 to 2,380 tests
while coverage of specific AF station branches decreases. This happens when:

- New integration tests use in-memory fabric mocks that bypass the real
  `IFabricService` contract (coverage inflation — the fabric path never runs)
- Modified tests are redirected to pass a different branch to avoid a dead path
- Tests assert on DataProcessResult output properties that multiple branches
  can produce — not on the specific execution path

**Diagnostic question:**
> "For each test added or modified this phase, which specific fabric call or
> AF station branch does it assert on, and is that assertion only satisfiable
> by the intended branch — or could it be satisfied by a sibling branch too?"

---

## The Audit Procedure

Run this at the end of any phase where tests were modified (not just added).

### Step 1 — Separate test changes into three categories

For every test touched this phase:

```
Category A — New test, new branch coverage
  Test did not exist before. Tests an AF station path not covered by any prior test.
  This is genuine coverage increase.

Category B — New test, redundant coverage
  Test did not exist before. Tests an AF station path already covered by another test.
  Test count goes up. Coverage stays the same.

Category C — Modified test
  Test existed before. Mock, fixture, or assertion was changed.
  Requires the test-fix-or-code-fix audit (see that rule).
  Risk: test now covers a different (sibling) AF station branch than before.
```

### Step 2 — For each Category C test, identify the branch shift

Ask: what branch did the test exercise BEFORE the modification? After?

```
Example:
  Before: DataProcessResult success path, fabric resolves to ElasticsearchProvider
  After:  DataProcessResult success path, fabric uses in-memory provider (mock)

Branch shift: real-fabric-path → in-memory-bypass
Coverage change: the real Elasticsearch fabric path loses its only test.
  The in-memory path gains a redundant test.
```

### Step 3 — Build the branch coverage delta table

List every significant execution path in the modified AF station or fabric.
For each, count tests before and after:

```
Path                              | Tests before | Tests after | Delta | Status
----------------------------------|-------------|-------------|-------|-------
af4-rag: skill selection (real)   |      2       |      2      |   0   | covered
af4-rag: in-memory fallback       |      1       |      3      |  +2   | covered (redundant)
af9-judge: Claude primary         |      1       |      1      |   0   | covered
af9-judge: GPT-4o cross-validate  |      0       |      2      |  +2   | NEW ✓
af11-feedback: skillsActive write |      1       |      0      |  -1   | LOST ← problem
af11-feedback: scoreDelta update  |      2       |      3      |  +1   | covered (redundant)
fabric-ES: real provider          |      2       |      0      |  -2   | LOST ← problem
fabric-ES: in-memory mock         |      0       |      3      |  +3   | NEW (but wrong level)
```

If any row has a negative delta: **coverage loss, regardless of total test count.**
If any real-fabric row shifts to in-memory mock: **Level 1 test replacing Level 2 test — wrong.**

### Step 4 — Verify assertion specificity

A test that asserts `dataProcessResult.success === true` could be satisfied
by any branch that returns success. It does not prove a specific path ran.

For each key test, identify the most specific assertion available:

```
Specific assertions by path:
  af4-rag skill selection:    skillsActive.includes('SK-PLAN') when planningContext score high
  af9-judge cross-validate:   crossValidationModel === 'gpt-4o' in result metadata
  af11-feedback skillsActive: feedback.skillsActive === ['SK-TEST'] for test-heavy runs
  fabric-ES real:             provider.constructor.name === 'ElasticsearchProvider'
```

If a test only asserts on `success: true` and not on the specific path token,
the test may pass even when the wrong branch runs.

---

## End-of-Phase Coverage Checklist

Run before declaring a phase complete:

```
□ Total tests added this phase: N
□ Of N: how many are Category A (new path coverage)? ___
□ Of N: how many are Category B (redundant)? ___
□ Of N: how many are Category C (modified)? ___

□ For each Category C test: ran test-fix-or-code-fix audit
□ Branch coverage delta table filled (Step 3)
□ No path has a negative delta
□ No real-fabric path replaced by in-memory mock (that's a level demotion, not coverage)
□ Each key test asserts on a path-specific token, not just DataProcessResult.success

If any box is unchecked: the phase is NOT complete.
```

---

## Worked Example — Fabric Coverage Inflation

**Phase adds 4 integration tests for af4-rag-context. Did coverage improve?**

```
4 new tests:
  T1: skill selection with high quality score → uses InMemoryDatabaseProvider mock
  T2: skill selection with low quality score → uses InMemoryDatabaseProvider mock
  T3: skill selection with empty context → uses InMemoryDatabaseProvider mock
  T4: skill selection for ORCHESTRATION archetype → uses InMemoryDatabaseProvider mock

All 4 tests assert: DataProcessResult.success === true, skillsActive.length > 0

Coverage delta:
  af4-rag: InMemoryDatabaseProvider path: 0 → 4 (+4) — all redundant for same provider
  af4-rag: ElasticsearchProvider path: 1 → 1 (0) — no change
  af4-rag: score threshold branch: 0 → 2 (+2) — NEW ✓ (for low/high score logic)
  But: all 4 tests use in-memory — Level 1 unit tests, not Level 2 integration

Conclusion: test count +4, real integration coverage +0.
  The score threshold logic IS new coverage (Category A).
  But it should be tested with real contract fixtures at Level 2, not in-memory mocks.
```

---

## One-Line Summary

> "After every phase that modifies tests: fill the coverage delta table.
> If any real-fabric path goes to zero, the phase is not done."
