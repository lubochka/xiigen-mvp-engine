# AGENTS.md — Three-Level Verification

## Invoke When
- Any fix to an AF station, DNA guard, fabric provider, or skill block
- Before declaring any bug fix complete
- Before phase-end gate

## The Protocol (run in sequence — stop at first failure)

```
Level 1 — Unit:
  cd server && npx jest <specific-spec> --verbose
  → Must PASS before proceeding

Level 2 — Simulation (NestJS integration):
  cd server && npx jest <integration-spec> --verbose
  → Uses real sample-contracts.ts fixtures, no synthetic mocks
  → Level 2 fail after Level 1 pass = mock was masking the real problem

Level 3 — Contract / E2E:
  cd server && npx jest test/phase9-lifecycle.spec.ts --verbose
  (or Docker provider test if fabric is involved)
  → Must PASS to declare fix complete
```

## Routing

| Fixed | L1 spec | L2 spec | L3 spec |
|-------|---------|---------|---------|
| AF station | `test/af-stations/<station>.spec.ts` | Integration + sample-contracts | `test/phase9-lifecycle.spec.ts` |
| DNA guard | `test/dna/<guard>.spec.ts` | Generated output validation | Lifecycle |
| Fabric provider | `test/fabrics/<provider>.spec.ts` | IFabricService integration | Docker provider test |
| Skill block | `test/af-stations/skill-selection.spec.ts` | AF-4 + AF-9 integration | Lifecycle with injection |

## Stop Rules

- Level 1 fails → do NOT proceed to Level 2. Fix unit first.
- Level 2 fails after Level 1 pass → mock was wrong. Re-examine the fix.
- Level 3 fails after 1+2 pass → composition problem. Check adjacent AF stations.

## One Rule

> A fix is done when all 3 levels pass — not when unit alone goes green.
