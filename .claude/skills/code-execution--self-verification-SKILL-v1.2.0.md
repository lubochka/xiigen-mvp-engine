---
name: self-verification-skill
sk_number: SK-417
version: "1.2.0"
load_order: 17
priority: RECOMMENDED
author: luba
updated: "2026-04-24"
description: >
  Self-verification discipline for the XIIGen engine. v1.1 adds
  PORTABILITY_REMEDIATION change category (GAP-01 fixes must not be classified
  as BACKWARD_COMPAT). v1.2 adds AUTH_PROTECTION_ADDITION change category —
  adding @UseGuards/@Roles to a controller changes the security surface and
  requires auth-specific test verification, not just L1. Closes AUTH-ARBITER-
  SKILLS-REMEDIATION-PLAN-v3.0 Phase 7.
---

# Self-Verification Skill v1.2

## When to Invoke

- Before declaring any fix "done"
- Before any phase-end gate
- After any AF station, fabric provider, DNA guard, or skill block change
- When a test passes but you are not confident the fix is at the right level
- **v1.1:** After any portability remediation (ClsService removal, @connectionType annotation, FREEDOM key rename)
- **NEW v1.2:** After adding `@UseGuards`, `@Roles`, or `@Public()` to any controller or route

---

## The 6 Rules

| # | Rule | What It Catches |
|---|------|-----------------|
| 1 | `fresh-fixtures` | Using hand-crafted StationInput instead of real EngineContract fixtures |
| 2 | `categorize` | Wrong change category — treating a MACHINE, PORTABILITY, or AUTH change as BACKWARD_COMPAT |
| 3 | `right-level` | Verifying at the wrong test level — L1 unit only when auth or portability requires more |
| 4 | `cascade` | Missing downstream effects of a change — factory → AF mapping → BFA registration |
| 5 | `non-renderable` | Claiming DNA compliance without building and running the generated code |
| 6 | `predict` | Not predicting which DNA patterns, flows, and AF stations are affected before changing |

---

## Rule 2: Categorize (updated v1.2)

**Classify the change before testing.** Every change is one of:

| Category | Definition | Test Requirement |
|----------|------------|-----------------|
| `MACHINE_CHANGE` | Changes the engine's invariant behavior — DNA patterns, fabric contracts, station routing | L1 + L2 + L3 mandatory |
| `FREEDOM_CHANGE` | Changes configurable behavior — provider selection, quality thresholds, prompt templates | L1 + L2; L3 if cross-tenant |
| `BACKWARD_COMPAT` | Adds new behavior without breaking existing | L1; verify existing L2/L3 still pass |
| `NEW_ARTIFACT` | New factory, task type, flow — no existing behavior broken | L1 + L2 + BFA validation |
| `PORTABILITY_REMEDIATION` | Removes ClsService, adds @connectionType, renames FREEDOM keys, adds requiredCoInstalls | L1 + V9 portability gate + Layer 1 of FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 |
| `AUTH_PROTECTION_ADDITION` | Adds @UseGuards, @Roles, @Public() to controller/routes; updates bypass-paths.registry.ts | L1 + V10 auth gate + Rule 7 (401/403) + Rule 8 (R6 cross-tenant JWT, if TIER-C) — NEW v1.2 |

---

## Rule 2: Why AUTH_PROTECTION_ADDITION Is a Separate Category

Adding `@UseGuards(JwtAuthGuard, RolesGuard)` to a controller is NOT a `BACKWARD_COMPAT`
change. It changes the security surface in a way that breaks every existing caller
that does not supply a valid JWT with the correct role. Specifically:

**What BACKWARD_COMPAT testing does NOT verify:**
- Unauthenticated requests now return 401 (not 200)
- Wrong-role requests now return 403 (not 200 or the previous response)
- @Public() routes remain reachable without JWT
- Cross-tenant JWTs are rejected on routes they should not access (R6)
- The bypass-paths.registry.ts is correctly updated for all @Public() routes

A developer who classifies adding guards as BACKWARD_COMPAT will run L1 unit tests
and declare done — missing every auth-specific behavior change.

**AUTH_PROTECTION_ADDITION verification checklist:**
```bash
FLOW_DIR="server/src/engine/flows/{slug}"
CONTROLLER_FILES=$(find $FLOW_DIR -name "*.controller.ts" 2>/dev/null)

# 1. V10 auth gate (from flow-implementation-guide v1.3.0)
for FILE in $CONTROLLER_FILES; do
  GUARDS=$(grep -c "@UseGuards" $FILE 2>/dev/null || echo 0)
  CONTROLLERS=$(grep -c "@Controller(" $FILE 2>/dev/null || echo 0)
  echo "V10 A-1: $FILE — controllers=$CONTROLLERS guards=$GUARDS"
  # Expected: GUARDS >= CONTROLLERS

  ROUTES=$(grep -cE "@Get\(|@Post\(|@Put\(|@Delete\(|@Patch\(" $FILE 2>/dev/null || echo 0)
  AUTH_DECL=$(grep -cE "@Roles\(|@Public\(\)" $FILE 2>/dev/null || echo 0)
  echo "V10 A-2: $FILE — routes=$ROUTES auth_decl=$AUTH_DECL"
  # Expected: AUTH_DECL >= ROUTES
done

# 2. Rule 7: auth route test (from test-integrity v2.2.0)
CTRL_SPECS=$(find $FLOW_DIR -name "*.controller.spec.ts" 2>/dev/null)
for SPEC in $CTRL_SPECS; do
  AUTH_401=$(grep -cE "\.expect\(401\)|HttpStatus\.UNAUTHORIZED" $SPEC 2>/dev/null || echo 0)
  AUTH_403=$(grep -cE "\.expect\(403\)|HttpStatus\.FORBIDDEN" $SPEC 2>/dev/null || echo 0)
  echo "Rule 7: $SPEC — 401=$AUTH_401, 403=$AUTH_403"
  # Expected: both > 0
done

# 3. bypass-paths.registry.ts updated for all @Public() routes
PUBLIC_ROUTES=$(grep -rn "@Public()" $FLOW_DIR --include="*.controller.ts" 2>/dev/null | wc -l)
if [ "$PUBLIC_ROUTES" -gt 0 ]; then
  echo "Public routes found: $PUBLIC_ROUTES — verify each is in bypass-paths.registry.ts"
  grep -rn "@Public()" $FLOW_DIR --include="*.controller.ts" 2>/dev/null | \
    sed 's/^/  NEEDS BYPASS ENTRY: /'
  BYPASS_ENTRIES=$(grep -c "flow-{slug}\|{slug}" \
    server/src/auth/bypass-paths.registry.ts 2>/dev/null || echo 0)
  echo "  Bypass entries for this flow: $BYPASS_ENTRIES"
  # Expected: BYPASS_ENTRIES >= PUBLIC_ROUTES
fi

# 4. Rule 8: cross-tenant JWT isolation (if TIER-C target)
TIER_TARGET=$(jq -r '.tenantCertTier // "NONE"' \
  docs/sessions/{slug}/STATE.json 2>/dev/null || echo "NONE")
if [ "$TIER_TARGET" = "TIER_C" ] || [ "$TIER_TARGET" = "TIER_D" ]; then
  R6_TESTS=$(grep -rcE "cross.tenant|tenantB.*token|crossTenant" \
    $FLOW_DIR --include="*.spec.ts" 2>/dev/null \
    | awk -F: '{sum+=$2} END {print sum+0}')
  echo "Rule 8 R6 cross-tenant JWT tests: $R6_TESTS"
  # Expected: >= 1 for TIER-C target
fi

# 5. Update STATE.json authStatus
node -e "
  const fs = require('fs');
  const s = JSON.parse(fs.readFileSync('docs/sessions/{slug}/STATE.json'));
  s.authStatus = 'AUTH_READY';
  s.authGaps = [];
  fs.writeFileSync('docs/sessions/{slug}/STATE.json', JSON.stringify(s, null, 2));
" 2>/dev/null || echo "STATE.json update: set authStatus=AUTH_READY manually"
echo "STATE.json updated: authStatus = AUTH_READY"
```

**AUTH_DEFERRED exception:**
If `authStatus = AUTH_DEFERRED` (auth.module.ts absent), this category does not yet
apply. Controllers exist but guards are not active. When AUTH-ROLES-GROUPS-PLAN-v3.0
Phases 1-4 deploy, re-classify as AUTH_PROTECTION_ADDITION and run the full checklist.

---

## Rule 2: Why PORTABILITY_REMEDIATION Is a Separate Category (v1.1, unchanged)

Removing ClsService from a service is NOT a BACKWARD_COMPAT change. It changes how
tenantId flows through the service. BACKWARD_COMPAT testing does NOT verify:
- tenantId is correctly scoped in concurrent calls
- @connectionType annotation is present and correct (requires V9 portability gate)
- FLOW-PORTABILITY-TEST-PROTOCOL Layer 1 passes

**PORTABILITY_REMEDIATION verification checklist:**
```bash
FLOW_DIR="server/src/engine/flows/{slug}"

# 1. Run portability gate (from dna-compliance-guard v1.2.0)
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
npx jest --testPathPattern="$FLOW_DIR" \
  --testNamePattern="concurrent\|tenant.*isolat" --runInBand

# 3. Run FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 Layer 1
# See SK-553 v1.1.0 Layer 1 checklist

# 4. Update STATE.json portabilityStatus
node -e "
  const fs = require('fs');
  const s = JSON.parse(fs.readFileSync('docs/sessions/{slug}/STATE.json'));
  s.portabilityStatus = 'MOBILE';
  s.portabilityGaps = [];
  fs.writeFileSync('docs/sessions/{slug}/STATE.json', JSON.stringify(s, null, 2));
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

Match the test level to the change category:

| Change category | Minimum test level |
|----------------|-------------------|
| `MACHINE_CHANGE` | L1 + L2 + L3 |
| `FREEDOM_CHANGE` | L1 + L2 |
| `BACKWARD_COMPAT` | L1; verify L2/L3 still pass |
| `NEW_ARTIFACT` | L1 + L2 + BFA validation |
| `PORTABILITY_REMEDIATION` | L1 + V9 + SK-553 v1.1.0 Layer 1 + concurrent isolation test |
| `AUTH_PROTECTION_ADDITION` | L1 + V10 + Rule 7 (401/403) + Rule 8 (R6 if TIER-C) + bypass-paths check |

---

## Rule 5: Non-Renderable (generated code — parse, don't eyeball)

Generated/non-renderable output is verified by a parser, not by reading it. For
generated TypeScript or SQL, run `npx tsc --noEmit` / a ts-morph parse — visual
inspection is not verification. For generated React output, use a render-assert
(`@testing-library/react` render + query), not "the JSX looks right".

```typescript
// Generated React → render-assert, not eyeball
render(<GeneratedScreen data={fixture} />);
expect(screen.getByRole('table')).toBeInTheDocument();
```

## Rule 6: Predict-then-verify

Before running the verification, WRITE DOWN the predicted result (which specs
pass, which DNA patterns/flows/stations are affected, expected count). Then run
and compare. A prediction that matches builds confidence; a mismatch surfaces a
wrong mental model BEFORE "done" is claimed. Running first and rationalizing the
output afterward is not verification.

## Anti-Patterns

1. **"All unit tests pass" declared as done.** Unit tests do not verify integration, concurrent behavior, or real fixture compatibility.
2. **"I reviewed the code and it looks correct."** Visual inspection is not verification.
3. **Skip cascade check because "it's a small change."** Small changes in fabric providers affect all stations using that fabric.
4. **Verify at L1 only because L2 is slow.** Slowness is not a justification for under-verification.
5. **v1.1: Classify ClsService removal as BACKWARD_COMPAT.** It is PORTABILITY_REMEDIATION. Requires V9 + concurrent isolation test.
6. **NEW v1.2: Classify adding @UseGuards as BACKWARD_COMPAT.** It is AUTH_PROTECTION_ADDITION. Breaks existing callers without JWT. Requires V10 + Rule 7 + bypass-paths verification.

---

## Integration

```
self-verification-skill v1.2
  → Rule 2 categorize → dispatches to correct test suite
  → confirms fix verified before three-level-verification declares done
  → confirms cascade before declaring bug closed (bug-to-tests-skill)
  → PORTABILITY_REMEDIATION → V9 gate → dna-compliance-guard v1.2.0 P-1..P-5
  → PORTABILITY_REMEDIATION → SK-553 v1.1.0 Layer 1
  → AUTH_PROTECTION_ADDITION → V10 gate → flow-implementation-guide v1.3.0
  → AUTH_PROTECTION_ADDITION → Rule 7 → test-integrity v2.2.0 (401/403)
  → AUTH_PROTECTION_ADDITION → Rule 8 → test-integrity v2.2.0 (R6, TIER-C)
  → AUTH_PROTECTION_ADDITION → bypass-paths.registry.ts verification
```

## Changelog

- **v1.0.0** — initial skill. 6 rules: fresh-fixtures, categorize, right-level,
  cascade, non-renderable, predict. 4 change categories.
- **v1.1.0** — Rule 2: PORTABILITY_REMEDIATION added as 5th change category.
  Verification checklist: V9 + concurrent isolation test + SK-553 Layer 1.
  Anti-pattern 5: ClsService removal is not BACKWARD_COMPAT. Closes G-38.
- **v1.2.0** — Rule 2: AUTH_PROTECTION_ADDITION added as 6th change category.
  Verification checklist: V10 + Rule 7 (401/403) + Rule 8 (R6 if TIER-C) +
  bypass-paths.registry.ts. AUTH_DEFERRED exception documented. Anti-pattern 6:
  adding @UseGuards is not BACKWARD_COMPAT. Rule 3 table updated with AUTH row.
  Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 7.
