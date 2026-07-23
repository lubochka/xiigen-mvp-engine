# AGENTS.md — Bug-to-Tests (SK-415)

## Invoke When
- A bug is confirmed (reproducible, with a root cause hypothesis)
- Before writing ANY fix for an engine component
- After three-level-verification identifies a fix candidate
- After engine-qa classifies a bug as CLASS A–F

## The Protocol (6 steps — in order)

```
Step 1 — Assign BUG-ENGINE-NN identifier (class, affected component, flow)
Step 2 — Write 3 FAILING tests:
           L1: unit test  → npx jest <spec> → must FAIL
           L2: simulation → npx jest <integration-spec> → must FAIL
           L3: e2e/contract → npx jest test/phase9-lifecycle.spec.ts → must FAIL
Step 3 — Confirm all 3 FAIL (if any PASSES: test doesn't reproduce — re-examine)
Step 4 — Fix ENGINE (never fix test assertions without Luba approval)
Step 5 — Confirm all 3 PASS
Step 6 — Zero-regression gate: server count ≥ baseline+3, client Δ=0
```

## Iron Rule

> **Test assertion changes require Luba explicit approval.**
> "Adapt test to accept wrong output" = session failure.

## Red Flags

| Signal | Problem |
|--------|---------|
| Fix written before any test | AP-1: fix-first, tests written to match fix |
| `expect()` changed to match bug output | AP-2: assertion adjustment without approval |
| Only L1 written, L2/L3 skipped | AP-3: incomplete three-level coverage |
| Only `expect(result.success).toBe(true)` | AP-4: generic assertion, proves nothing |
| Test count increases by <3 after fix | Missing L1/L2/L3 — check which level was skipped |
| BUG-ENGINE-NN not assigned before fix | Protocol violated — assign number first |

## Test Routing by Component

| Affected Component | L1 Spec File | L2 Spec File | L3 Spec File |
|--------------------|-------------|-------------|-------------|
| AF station | `test/af-stations/<station>.spec.ts` | `test/<station>-integration.spec.ts` | `test/phase9-lifecycle.spec.ts` |
| DNA guard | `test/dna/<guard>.spec.ts` | Generated output validation spec | `test/phase9-lifecycle.spec.ts` |
| Fabric provider | `test/fabrics/<provider>.spec.ts` | `test/fabrics/<provider>-integration.spec.ts` | Docker provider test |
| Skill block | `test/af-stations/skill-selection.spec.ts` | AF-4 + AF-9 integration | Lifecycle with injection |

## Bug Record Template (paste into test file description)

```
BUG-ENGINE-NN: <description>
CLASS: A/B/C/D/E/F
AFFECTED: <component>
ROOT CAUSE: <mechanism>
WRONG ASSUMPTION: <what code assumed>
FIX: <file:line — engine fix, not test fix>
DNA PATTERNS AFFECTED: DNA-N or N/A
REGRESSION RISK: FLOW-XX
```

## Relationship to Other Skills

- **three-level-verification**: Bug fix always triggers 3-level check. Bug-to-tests files
  ARE the 3-level test files. Three-level-verification may require additional coverage.
- **test-integrity FM-1**: Never change mock to bypass the bug — fix the engine
- **engine-qa**: Bug class taxonomy (A–F) must be set in BUG-ENGINE-NN header
- **retroactive-development**: If fix is in engine core → re-validate all flows using that component

## One Rule

> Three failing tests before any fix. Three passing tests after.
> Test count ≥ baseline+3. Never touch assertions without approval.
