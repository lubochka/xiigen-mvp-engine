---
name: self-verification-skill
sk_number: SK-417
version: "1.0.0"
load_order: 17
priority: RECOMMENDED
author: luba
updated: "2026-03-18"
description: >
  Self-verification discipline for the XIIGen engine. 6 rules ensuring
  that fixes and changes are validated at the correct test level, with
  real fixtures, and with full cascade awareness before being declared done.
---

# Self-Verification Skill v1.0

## When to Invoke

- Before declaring any fix "done"
- Before any phase-end gate
- After any AF station, fabric provider, DNA guard, or skill block change
- When a test passes but you are not confident the fix is at the right level

---

## The 6 Rules

| # | Rule | What It Catches |
|---|------|-----------------|
| 1 | `fresh-fixtures` | Using hand-crafted StationInput instead of real EngineContract fixtures |
| 2 | `categorize` | Wrong change category — treating a MACHINE change as a FREEDOM change |
| 3 | `right-level` | Verifying at the wrong test level — L1 unit only when L2 simulation is required |
| 4 | `cascade` | Missing downstream effects of a change — factory → AF mapping → BFA registration |
| 5 | `non-renderable` | Claiming DNA compliance without building and running the generated code |
| 6 | `predict` | Not predicting which DNA patterns, flows, and AF stations are affected before changing |

---

## Rule 1: Fresh Fixtures

**Real fixtures only.** Level 2 (simulation) tests must use real `EngineContract` objects from `server/src/engine-contracts/sample-contracts.ts`. Hand-crafted `StationInput` inline in tests is not a simulation — it is an extended unit test with fabricated inputs.

**Check:** "Does my Level 2 test load a fixture from `sample-contracts.ts`?"
If no → it is not a simulation test.

```typescript
// WRONG: hand-crafted StationInput
const input: StationInput = { taskType: 'T-001', fabricType: 'in-memory', ... };

// RIGHT: real EngineContract fixture
import { sampleContracts } from '../engine-contracts/sample-contracts';
const contract = sampleContracts.find(c => c.taskType === 'T-001');
const input = StationInputFactory.fromContract(contract);
```

---

## Rule 2: Categorize

**Classify the change before testing.** Every change is one of:

| Category | Definition | Test Requirement |
|----------|------------|-----------------|
| `MACHINE_CHANGE` | Changes the engine's invariant behavior — DNA patterns, fabric contracts, station routing | L1 + L2 + L3 mandatory |
| `FREEDOM_CHANGE` | Changes configurable behavior — provider selection, quality thresholds, prompt templates | L1 + L2; L3 if cross-tenant |
| `BACKWARD_COMPAT` | Adds new behavior without breaking existing | L1; verify existing L2/L3 still pass |
| `NEW_ARTIFACT` | New factory, task type, flow — no existing behavior broken | L1 + L2 + BFA validation |

Wrong category → wrong test level chosen → false confidence.

---

## Rule 3: Right Level

**Match the test level to the blast radius.**

| Change type | Minimum level |
|-------------|--------------|
| DNA guard logic | L1 unit (isolated guard) |
| Fabric provider logic | L2 integration (real fabric call) |
| Multi-tenant path | L3 e2e (two tenants, isolation confirmed) |
| Engine contract field | L2 + BFA validation |
| AF station wiring | L2 (NestJS TestingModule) |
| Generated service output | L1 (DNA audit script) + L2 (compilation + run) |

**Stop rule:** If L1 passes but the blast radius requires L2 → the change is NOT verified. Do not proceed to the next phase.

---

## Rule 4: Cascade

**Trace the full effect chain before and after every change.**

```
Contract field change → factory registration → AF station mapping → BFA registration → downstream flows
AF station change     → upstream providers  → downstream consumers → AF-9 quality gate
Fabric provider change→ all stations using this fabric → tenant isolation → error propagation
DNA guard change      → all stations with same task type → sibling stations (Rule 9 of mental-debug)
Skill block change    → AF-4 selector → AF-1 injection → generated output quality
```

**Check:** "What are all the things that read the thing I changed?" List them. Test each.

---

## Rule 5: Non-Renderable

**Generated code cannot be verified by inspection.** A generated `.ts` file that looks correct may:
- Compile but produce wrong runtime behavior
- Pass the DNA audit script but fail at NestJS module initialization
- Pass L1 unit tests but fail L2 simulation when injected into the full AF pipeline

**Required steps for any generated file:**
1. Run DNA audit script (`generated-service-audit.md` checklist)
2. Compile: `cd server && npm run build` → 0 errors
3. Run L2: NestJS TestingModule loads the generated module without errors
4. Run L3: AF pipeline executes with the generated service and produces valid output

"Looks correct to me" is not a verification.

---

## Rule 6: Predict

**Before changing, predict the effects. After changing, verify the predictions.**

Pre-change prediction checklist:
```
☐ Which DNA patterns (DNA-1 through DNA-9) does this change affect?
☐ Which AF stations read the thing being changed?
☐ Which existing flows (FLOW-01 through FLOW-31) could be affected?
☐ Does AF-9 quality gate still pass after this change?
☐ Does BFA validation still pass for all registered flows?
☐ Which fabric providers are in the blast radius?
☐ Are there sibling stations/providers that need the same change?
```

Post-change verification: confirm each prediction was correct or explain why it wasn't.

---

## Anti-Patterns

1. **"All unit tests pass" declared as done.** Unit tests do not verify integration, concurrent behavior, or real fixture compatibility.
2. **"I reviewed the code and it looks correct."** Visual inspection is not verification. Generated code requires building and running.
3. **Skip cascade check because "it's a small change."** Small changes in fabric providers affect all stations using that fabric. Small changes in DNA guards affect all sibling stations.
4. **Verify at L1 only because L2 is slow.** Slowness is not a justification for under-verification. If L2 is required by Rule 3, it runs.

---

## Integration

```
self-verification-skill
  → confirms fix is verified before three-level-verification declares done
  → confirms cascade before declaring bug closed (bug-to-tests-skill)
  → generates predict checklist for planning-skill Gate 5 (test matrix)
```
