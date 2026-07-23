---
name: self-verification-skill
sk_number: SK-417
version: "1.1.0"
load_order: 17
priority: RECOMMENDED
author: luba
updated: "2026-04-23"
description: >
  Self-verification discipline for the XIIGen engine. v1.1 adds
  PORTABILITY_REMEDIATION change category to Rule 2 — closing the gap where
  GAP-01 fixes were classified as BACKWARD_COMPAT and under-tested. Closes G-38.
---

# Self-Verification Skill v1.1

## When to Invoke

- Before declaring any fix "done"
- Before any phase-end gate
- After any AF station, fabric provider, DNA guard, or skill block change
- When a test passes but you are not confident the fix is at the right level
- **NEW v1.1:** After any portability remediation (ClsService removal, @connectionType annotation, FREEDOM key rename)

---

## The 6 Rules

| # | Rule | What It Catches |
|---|------|-----------------|
| 1 | `fresh-fixtures` | Using hand-crafted StationInput instead of real EngineContract fixtures |
| 2 | `categorize` | Wrong change category — treating a MACHINE or PORTABILITY change as BACKWARD_COMPAT |
| 3 | `right-level` | Verifying at the wrong test level — L1 unit only when L2 simulation is required |
| 4 | `cascade` | Missing downstream effects of a change — factory → AF mapping → BFA registration |
| 5 | `non-renderable` | Claiming DNA compliance without building and running the generated code |
| 6 | `predict` | Not predicting which DNA patterns, flows, and AF stations are affected before changing |

---

## Rule 2: Categorize (updated v1.1)

**Classify the change before testing.** Every change is one of:

| Category | Definition | Test Requirement |
|----------|------------|-----------------|
| `MACHINE_CHANGE` | Changes the engine's invariant behavior — DNA patterns, fabric contracts, station routing | L1 + L2 + L3 mandatory |
| `FREEDOM_CHANGE` | Changes configurable behavior — provider selection, quality thresholds, prompt templates | L1 + L2; L3 if cross-tenant |
| `BACKWARD_COMPAT` | Adds new behavior without breaking existing | L1; verify existing L2/L3 still pass |
| `NEW_ARTIFACT` | New factory, task type, flow — no existing behavior broken | L1 + L2 + BFA validation |
| `PORTABILITY_REMEDIATION` | Removes ClsService, adds @connectionType, renames FREEDOM keys, adds requiredCoInstalls | L1 + V9 portability gate + Layer 1 of FLOW-PORTABILITY-TEST-PROTOCOL — NEW v1.1 |

**Why PORTABILITY_REMEDIATION is a separate category:**

Removing ClsService from a service is NOT a BACKWARD_COMPAT change. It changes how
tenantId flows through the service. The test requirement for BACKWARD_COMPAT is
"L1 + verify existing L2/L3 still pass" — this does NOT verify:
- tenantId is correctly scoped in concurrent calls (requires concurrent tenant isolation test)
- @connectionType annotation is present and correct (requires V9 portability gate)
- FLOW-PORTABILITY-TEST-PROTOCOL Layer 1 passes (connection annotation check)

A developer who applies BACKWARD_COMPAT to a GAP-01 fix will under-test it. The
portability remediation requires its own verification checklist.

**PORTABILITY_REMEDIATION verification checklist:**
```bash
FLOW_DIR="server/src/engine/flows/{slug}"

# 1. Run portability gate (from dna-compliance-guard v1.1.0)
P1=$(grep -rc "import.*ClsService\|from 'nestjs-cls'" $FLOW_DIR --include="*.service.ts" \
  | awk -F: '{sum+=$2} END {print sum+0}')
echo "P-1 ClsService: $P1"   # Expected: 0

ANNOTATED=$(grep -rl "@connectionType FLOW_SCOPED" $FLOW_DIR --include="*.service.ts" | wc -l)
TOTAL=$(ls $FLOW_DIR/*.service.ts 2>/dev/null | wc -l)
echo "P-2 Annotated: $ANNOTATED / $TOTAL"   # Expected: equal

P3=$(grep -rE "freedom\.get\(|fromConfig\(" $FLOW_DIR --include="*.service.ts" \
  | grep -vc "flow[0-9][0-9]*_" || echo 0)
echo "P-3 Unscoped keys: $P3"   # Expected: 0

# 2. Run concurrent tenant isolation test (mandatory for P-1 remediation)
npx jest --testPathPattern="$FLOW_DIR" --testNamePattern="concurrent\|tenant.*isolat" --runInBand

# 3. Run FLOW-PORTABILITY-TEST-PROTOCOL Layer 1 (connection annotation check)
# See FLOW-PORTABILITY-TEST-PROTOCOL-v1.2.md §Layer 1

# 4. Update STATE.json portabilityStatus
node -e "
  const s = JSON.parse(require('fs').readFileSync('STATE.json'));
  s.portabilityStatus = 'MOBILE';
  s.portabilityGaps = [];
  require('fs').writeFileSync('STATE.json', JSON.stringify(s, null, 2));
"
echo "STATE.json updated: portabilityStatus = MOBILE"
```

---

## Rule 1: Fresh Fixtures

**Real fixtures only.** Level 2 (simulation) tests must use real `EngineContract` objects
from `server/src/engine-contracts/sample-contracts.ts`. Hand-crafted `StationInput`
inline in tests is not a simulation — it is an extended unit test with fabricated inputs.

```typescript
// WRONG:
const input: StationInput = { taskType: 'T-001', fabricType: 'in-memory', ... };

// RIGHT:
import { sampleContracts } from '../engine-contracts/sample-contracts';
const contract = sampleContracts.find(c => c.taskType === 'T-001');
const input = StationInputFactory.fromContract(contract);
```

---

## Rule 3: Right Level

Match the test level to the blast radius:

| Change category | Minimum test level |
|----------------|-------------------|
| MACHINE_CHANGE | L1 + L2 + L3 |
| FREEDOM_CHANGE | L1 + L2 |
| BACKWARD_COMPAT | L1; verify L2/L3 still pass |
| NEW_ARTIFACT | L1 + L2 + BFA validation |
| PORTABILITY_REMEDIATION | L1 + V9 + Layer 1 portability protocol + concurrent isolation test |

---

## Anti-Patterns

1. **"All unit tests pass" declared as done.** Unit tests do not verify integration, concurrent behavior, or real fixture compatibility.
2. **"I reviewed the code and it looks correct."** Visual inspection is not verification.
3. **Skip cascade check because "it's a small change."** Small changes in fabric providers affect all stations using that fabric.
4. **Verify at L1 only because L2 is slow.** Slowness is not a justification for under-verification.
5. **NEW v1.1: Classify ClsService removal as BACKWARD_COMPAT.** It is PORTABILITY_REMEDIATION. Requires V9 + concurrent isolation test, not just L1.

---

## Integration

```
self-verification-skill
  → Rule 2 categorize → dispatches to correct test suite
  → confirms fix is verified before three-level-verification declares done
  → confirms cascade before declaring bug closed (bug-to-tests-skill)
  → PORTABILITY_REMEDIATION → V9 gate → dna-compliance-guard v1.1.0 P-1..P-5
  → PORTABILITY_REMEDIATION → FLOW-PORTABILITY-TEST-PROTOCOL Layer 1
```
