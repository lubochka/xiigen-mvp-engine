# AGENTS.md — Test Integrity Skill v2.0

## Invoke When
- A test fails after a guard change in an AF station or DNA validator
- A @nestjs/testing mock is modified (not just created new) to make a test pass
- Phase ends with "all tests pass" but at least one test was modified
- Integration tests added but unit mocks bypass fabric interfaces
- DNA guard exists in one AF station, missing in sibling station

## The 4 Failure Modes

| FM | Trigger | Rule |
|----|---------|------|
| FM-1 Mock-Fix Masking | Mock changed to skip DNA check | `test-fix-or-code-fix` |
| FM-2 Guard Stacking | BFA rule stacked on DNA check → branch unreachable | `branch-reachability` |
| FM-3 Coverage Inflation | Integration tests use fabric-bypassing mocks | `coverage-vs-execution` |
| FM-4 Sibling Guard Gap | DNA-3 in GenesisStation, missing in FeedbackStation | `branch-reachability` (sibling audit) |

## Routing

| Symptom | Rule |
|---------|------|
| Test fails after DNA guard tightened | `test-fix-or-code-fix` → `branch-reachability` |
| Mock changed to skip validation | `test-fix-or-code-fix` → `coverage-vs-execution` |
| BFA + DNA guard on same path | `branch-reachability` → `coverage-vs-execution` |
| Test count up, mocks bypass fabric | `coverage-vs-execution` → `branch-reachability` |
| Guard missing in sibling AF station | `branch-reachability` (FM-4 sibling audit) |
| Synthetic fixtures used in integration test | `contract-driven-testing` |

## Gate 5 Checklist Addition

```
□ Modified mock (not new)? → run test-fix-or-code-fix first
□ Guard changed in AF station? → run branch-reachability
□ DNA guard added to one station? → audit sibling stations (FM-4)
□ Integration tests added? → verify real EngineContract fixtures used
□ Tests modified (not just added)? → run coverage-vs-execution
```

## One Rule

> A passing mock confirms the mock works. It does not confirm the guard runs.
