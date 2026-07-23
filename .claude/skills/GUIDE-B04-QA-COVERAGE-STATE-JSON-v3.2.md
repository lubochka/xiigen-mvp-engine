# GUIDE-B04 — How to Produce `FLOW-XX-QA-COVERAGE-STATE.json`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 14 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-24
## v3.2 amendment: Q7 (auth_protection_declared) and Q8 (tenant_cert_tier) added.
##   Q7: verifies @UseGuards/@Roles present on controllers; Rule 7 auth tests.
##   Q8: records tenantCertTier from IMPL-STATE.json + portability protocol results.
##   Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 18.

---

## FINAL GOAL (re-read before authoring any FLOW-XX-QA-COVERAGE-STATE.json):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

---

## WHAT THIS FILE IS

`FLOW-XX-QA-COVERAGE-STATE.json` is the **QA coverage assessment** — the most
complex state file in List B. It evaluates six orthogonal quality dimensions (Q1-Q6),
records evidence for each, identifies critical gaps, and produces an `overallReadiness`
verdict that gates whether the flow can be considered implementation-complete.

Every value must come from a real verification step (bash command, file existence check,
ES query result). No Q-category verdict may be set from memory or assumption.

**Schema version:** `"qcs-v1"` (fixed — do not change)
**Authoring reference:** ZIP-01 `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md` §Q1-Q6 definitions

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-01 | PRIMARY + STRUCTURE | AUTHORING-GUIDE v1.15 §Q1-Q6 category definitions; `qcs-v1` schema; overallReadiness tri-state verdict rules |
| ZIP-11 | FIXTURE | FLOW-47 QA-COVERAGE-STATE.json (most detailed example — Q1=PASS_WITH_CAVEATS, Q2=PARTIAL_GAP, Q4=PARTIAL_GAP, Q5=PARTIAL_GAP, Q6=PASS); FLOW-09 QA-COVERAGE-STATE.json (early-phase TBD example) |
| ZIP-14 | REFERENCE | `ux-guidelines.csv` — Q2 client_ui verdict criteria (FULL_UI/PARTIAL_UI/NO_UI/INTERNAL_ONLY verdicts per task type) |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-QA-COVERAGE-STATE.json`
**File size range:** 3-6 KB
**When authored:** After implementation phases B-F complete; updated when gaps are remediated
**Companion file:** `FLOW-XX-QA-COVERAGE-STATE.md` (B-05) — must be produced immediately after this file

---

## THE SIX QA CATEGORIES

| Q | Category name | What it tests | Evidence source |
|---|--------------|--------------|----------------|
| Q1 | unit_tests | Server jest + e2e test counts vs baseline | `npx jest` run results |
| Q2 | client_ui | UI-REFLECTION verdicts per task type (FULL_UI / PARTIAL_UI / NO_UI / INTERNAL_ONLY) | `UI-REFLECTION-STATE.json` (B-09) |
| Q3 | design_simulation | Design contract spec presence (DC-01..DC-10); DPO triple check | `ls` of topology + design contract files |
| Q4 | marketplace_ui | Marketplace package applicability; ironRules + arbiterConfigIds population | ES query or fixture file inspection |
| Q5 | cross_tenant_install | Cross-tenant install path validation; scope-portability tests | Test file existence + provisioning test run |
| Q6 | bfa_validation | CF rule presence, cross-flow validator suite result | `grep` for CF rules + BFA suite run |
| Q7 | auth_protection_declared | @UseGuards on all controllers; @Roles/@Public per route; Rule 7 (401/403) tests | `grep` for @UseGuards + test counts |
| Q8 | tenant_cert_tier | tenantCertTier from IMPL-STATE.json; SK-553 Layer 1; D-HIST-001; NDJSON counts | IMPL-STATE.json reads + detection commands |

**Verdict values per Q-category:**
| Verdict | Meaning |
|---------|---------|
| `"PASS"` | All criteria met, evidence is positive |
| `"PASS_WITH_CAVEATS"` | Criteria met but with acknowledged limitations (e.g., weakened assertions) |
| `"PARTIAL_GAP"` | Some criteria met, specific gaps identified |
| `"TBD"` | Not yet evaluated — insufficient evidence to set a verdict |
| `"FAIL"` | Critical criteria not met |

**overallReadiness values:**
| Value | Meaning |
|-------|---------|
| `"READY"` | All Q1-Q6 PASS or PASS_WITH_CAVEATS, no blockers |
| `"READY_WITH_GAPS"` | Some PARTIAL_GAP verdicts, no blocking items |
| `"BLOCKED"` | At least one FAIL or a BLOCKING severity item in blockerSummary |

---

## STEP-BY-STEP AUTHORING INSTRUCTIONS FOR CLAUDE CODE

### Step 1: Write the file header

```json
{
  "flowId": "FLOW-XX",
  "slug": "{slug}",
  "schemaVersion": "qcs-v1",
  "createdAt": "{YYYY-MM-DD}",
  "branch": "{current-branch}",
```

**Rules:**
- `schemaVersion` is always `"qcs-v1"` — never change
- `createdAt` is today's date (ISO: YYYY-MM-DD)
- `branch` is the current git branch

---

### Step 2: Populate Q1 — Unit Tests

Q1 checks whether the test count meets or exceeds the baseline from IMPL-STATE.json.

```bash
# Get actual test count
cd server && npx jest --passWithNoTests 2>&1 | grep -E "Tests:|passed|failed" | tail -3
cd client && npx jest --passWithNoTests 2>&1 | grep -E "Tests:|passed|failed" | tail -3
# Get baseline from IMPL-STATE
grep -A 3 '"test_baseline"' docs/sessions/FLOW-XX/FLOW-XX-IMPL-STATE.json
# Count test files for this flow specifically
find server/test -path "*{slug}*" -name "*.spec.ts" 2>/dev/null
find client -path "*{slug}*" -name "*.spec.ts" 2>/dev/null
```

```json
"Q1_unit_tests": {
  "verdict": "PASS | PASS_WITH_CAVEATS | PARTIAL_GAP | FAIL",
  "evidence": [
    "{N} server tests pass per commit {hash}",
    "{N} client tests pass"
  ],
  "claimedCount": {N — from IMPL-STATE phase gate results},
  "actualCount": {N — from running npx jest right now},
  "criticalGaps": [
    "{gap description if actualCount < claimedCount, or if assertions were weakened}"
  ]
}
```

**Q1 verdict rules:**
- `PASS`: actualCount ≥ claimedCount AND no weakened assertions
- `PASS_WITH_CAVEATS`: tests pass but assertions were weakened vs plan thresholds, or some tests use `toBeGreaterThan(0)` instead of specific count assertions
- `PARTIAL_GAP`: actualCount < claimedCount, or tests skip required plan invariants
- `FAIL`: test suite fails (non-zero failures)

**SILENT_FAILURE RISK:** Setting `claimedCount` and `actualCount` both to the same number from memory without running `npx jest`. Always run the test suite to get real counts.

---

### Step 3: Populate Q2 — Client UI

Q2 checks the UI surface coverage for each task type in this flow.

```bash
# Read UI-REFLECTION-STATE.json for this flow
cat docs/sessions/FLOW-XX/UI-REFLECTION-STATE.json 2>/dev/null
# Count React pages
ls client/src/pages/{slug}/ 2>/dev/null
# Check for mock-states spec (required for UX-2 coverage)
ls client/__tests__/flows/{slug}/ 2>/dev/null
ls client/e2e/{slug}.spec.ts 2>/dev/null
```

```json
"Q2_client_ui": {
  "verdict": "FULL_UI | PARTIAL_UI | NO_UI | PARTIAL_GAP | TBD",
  "uiReflectionVerdict": "T{N}: {FULL_UI|PARTIAL_UI|NO_UI|INTERNAL_ONLY}; T{N+1}: {verdict}",
  "evidence": [
    "client/src/pages/{slug}/{PageName}Page.tsx",
    "client/__tests__/flows/{slug}/ — {N} test files"
  ],
  "criticalGaps": [
    "{gap if any page uses stub/placeholder instead of real API}",
    "{gap if UI-REFLECTION verdict is PARTIAL_UI with known stub}"
  ]
}
```

**Q2 verdict mapping from UI-REFLECTION verdicts:**
| UI-REFLECTION summary | Q2 verdict |
|----------------------|------------|
| All task types FULL_UI or NO_UI (intentional) | `"PASS"` |
| ≥1 task type PARTIAL_UI with real implementation | `"PASS_WITH_CAVEATS"` |
| ≥1 task type PARTIAL_UI with stub/placeholder | `"PARTIAL_GAP"` |
| No React pages at all for a TENANT_FACING flow | `"PARTIAL_GAP"` |
| UI-REFLECTION-STATE.json doesn't exist yet | `"TBD"` |

**uiReflectionVerdict format:** Comma-separated list of `T{N}: {verdict}` for each task type. Example: `"T659/T660 NO_UI; T661 PARTIAL_UI (stub setTimeout)"`

---

### Step 4: Populate Q3 — Design Simulation

Q3 checks whether design contracts and DPO triples exist.

```bash
# Check for design contract spec
ls server/test/e2e/{slug}/{slug}.design-contract.spec.ts 2>/dev/null
ls server/test/e2e/{slug}/{slug}-design-contract.spec.ts 2>/dev/null
# Check for topology
ls contracts/topologies/{slug}.topology.json 2>/dev/null
# Check topology QA spec
ls client/e2e/topology/{slug}-topology-qa.spec.ts 2>/dev/null
# Check DPO triple fixtures
ls fixtures/design-reasoning/{slug}-design-decisions.json 2>/dev/null
ls server/src/bootstrap/history-seeds/{slug}-design-corpus.json 2>/dev/null
```

```json
"Q3_design_simulation": {
  "verdict": "PASS | PASS_WITH_CAVEATS | PARTIAL_GAP | TBD",
  "designContractSpec": "server/test/e2e/{slug}/{slug}.design-contract.spec.ts | null",
  "topologyPresent": true,
  "topologyFile": "contracts/topologies/{slug}.topology.json",
  "topologyQaSpec": "client/e2e/topology/{slug}-topology-qa.spec.ts | null",
  "dpoTriplesPresent": true,
  "dpoTriplesPath": "fixtures/design-reasoning/{slug}-design-decisions.json",
  "evidence": [
    "Topology: {N} nodes, {N} edges confirmed",
    "Design contract spec: {N} DC tests passing | missing"
  ],
  "criticalGaps": [
    "{gap if DC-01..DC-10 spec missing}",
    "{gap if DPO triples file missing or empty}"
  ]
}
```

**Q3 verdict rules:**
- `PASS`: topology.json + topology-qa.spec + design-contract.spec all present and passing
- `PASS_WITH_CAVEATS`: topology present but design-contract spec or DPO step skipped per plan KNOWN CONSTRAINTS
- `PARTIAL_GAP`: topology present but topology-qa.spec or design-contract.spec missing
- `TBD`: topology not yet authored

---

### Step 5: Populate Q4 — Marketplace UI

Q4 checks whether the flow's marketplace package has ironRules and arbiterConfigIds populated.

```bash
# Check marketplace package data (if ES available)
# If ES not available, check the fixture files
cat fixtures/arbiters/{slug}-arbiters.bulk.ndjson 2>/dev/null | grep -c "arbiterType"
# Check design bundle refs
grep -r "ironRules\|arbiterConfigIds" server/src/engine-contracts/{slug}-contracts.ts 2>/dev/null | head -5
# Check if this flow is marketplace-applicable
grep -i "marketplace\|applicability" docs/sessions/FLOW-XX/FLOW-XX-CURRENT-STATE.json 2>/dev/null | head -3
```

```json
"Q4_marketplace_ui": {
  "verdict": "PASS | PARTIAL_GAP | NOT_APPLICABLE | TBD",
  "applicabilityToMarketplace": "DIRECTLY_APPLICABLE | APPLICABLE | NOT_APPLICABLE | TBD",
  "applicabilityReason": "{one sentence explaining why applicable or not}",
  "evidence": [
    "{task type and what marketplace-relevant service it provides}",
    "fixtures/arbiters/{slug}-arbiters.bulk.ndjson — {N} arbiter records"
  ],
  "criticalGaps": [
    "{gap if ironRules not populated on marketplace packages}",
    "{gap if arbiterConfigIds not linked}"
  ]
}
```

**Q4 verdict rules:**
- `PASS`: flow is marketplace-applicable AND ironRules + arbiterConfigIds populated on all packages
- `PARTIAL_GAP`: applicable but ironRules or arbiterConfigIds missing/empty
- `NOT_APPLICABLE`: flow has no marketplace-facing surface (e.g., pure platform-internal flows)
- `TBD`: applicability not yet evaluated

---

### Step 6: Populate Q5 — Cross-Tenant Install (FIXED v3.1 — checks actual portability conditions)

**What Q5 measures:** Can this flow be packaged and installed in a SECOND tenant's environment?
This is NOT the same as scope_isolation in the AI training pipeline (which is a DPO quality check).
Q5 checks physical package distribution conditions — GAP-01 through GAP-10.

```bash
FLOW_DIR="server/src/engine/flows/{slug}"

# P-1: No ClsService import (GAP-01)
P1=$(grep -rc "import.*ClsService\|from 'nestjs-cls'" $FLOW_DIR --include="*.service.ts" \
  | awk -F: '{sum+=$2} END {print sum+0}')
echo "P-1 ClsService: $P1"   # Expected: 0

# P-2: @connectionType annotated (GAP-16a)
SERVICES=$(ls $FLOW_DIR/*.service.ts 2>/dev/null | wc -l)
ANNOTATED=$(grep -rl "@connectionType FLOW_SCOPED" $FLOW_DIR --include="*.service.ts" | wc -l)
echo "P-2 Annotated: $ANNOTATED/$SERVICES"

# P-3: FREEDOM keys flow-scoped (GAP-09)
P3=$(grep -rE "freedom\.get\(|fromConfig\(" $FLOW_DIR --include="*.service.ts" 2>/dev/null \
  | grep -vc "flow[0-9][0-9]*_" || echo 0)
echo "P-3 Unscoped keys: $P3"   # Expected: 0

# P-4: No local interface clones (GAP-02)
P4=$(grep -rcE "^interface (IDb|IQueue|IFreedom)" $FLOW_DIR --include="*.ts" \
  | awk -F: '{sum+=$2} END {print sum+0}')
echo "P-4 Local interfaces: $P4"   # Expected: 0

# P-5: requiredCoInstalls declared (GAP-10)
CROSS=$(grep -rE "searchDocuments|storeDocument" $FLOW_DIR --include="*.service.ts" 2>/dev/null \
  | grep "xiigen-" | grep -v "flow[0-9]*-" | wc -l)
DECL=$(node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8'))\
  ?.xiigen?.requiredCoInstalls?.length??0" 2>/dev/null||echo 0)
echo "P-5 Cross-flow reads: $CROSS | Declared: $DECL"
```

```json
"Q5_cross_tenant_install": {
  "verdict": "PASS | PARTIAL_GAP | NOT_PORTABLE | NOT_APPLICABLE | TBD",
  "portabilityGate": {
    "P1_no_cls_service":      "PASS | FAIL",
    "P2_connection_annotated": "PASS | FAIL",
    "P3_freedom_keys_scoped":  "PASS | FAIL",
    "P4_no_local_interfaces":  "PASS | FAIL",
    "P5_co_installs_declared": "PASS | FAIL | NA"
  },
  "evidence": [
    "P-1: grep import.*ClsService → {N} hits",
    "P-2: {ANNOTATED}/{SERVICES} service files annotated",
    "P-3: {N} unscoped FREEDOM keys",
    "P-4: {N} local interface definitions",
    "P-5: {CROSS} cross-flow reads, {DECL} declared"
  ],
  "criticalGaps": [
    "{list any P-1..P-5 failures here with the specific grep output}"
  ]
}
```

**Q5 verdict rules (v3.1):**
- `PASS` (MOBILE): P-1=0, P-2=100%, P-3=0, P-4=0, P-5 declared ≥ cross-flow reads
- `PARTIAL_GAP`: 1-4 checks fail — list in criticalGaps
- `NOT_PORTABLE`: P-1 > 0 (ClsService present) — fundamental blocker
- `NOT_APPLICABLE`: EXTERNAL_REPO adapter flows only (no monorepo services)
- `TBD`: checks not yet run

**IMPORTANT — what Q5 does NOT check:**
The scope_isolation arbiter in the NDJSON file is an AI training pipeline isolation check
(ensures DPO triples don't leak across tenants in the learning system). It is NOT a
cross-tenant install check. A flow can have scope_isolation arbiter present and still
have ClsService in every service — making it completely non-portable.

---

### Step 7: Populate Q6 — BFA Validation

Q6 checks whether BFA rules are present and the cross-flow validator suite passes.

```bash
# List CF rules for this flow
cat server/src/engine-contracts/{slug}-bfa-rules.ts 2>/dev/null | grep "export const CF"
# Run BFA cross-flow validator suite (if available)
cd server && npx jest --testPathPattern="bfa-cross-flow" 2>&1 | tail -5
# Check for collision
grep -r "CF-[0-9]\{3\}" server/src/engine-contracts/ | grep "{slug}" | head -5
```

```json
"Q6_bfa_validation": {
  "verdict": "PASS | PASS_WITH_CAVEATS | PARTIAL_GAP | FAIL",
  "cfRules": ["CF-{N}", "CF-{N+1}", "..."],
  "evidence": [
    "{N} CF rules introduced in {slug}-bfa-rules.ts",
    "BFA cross-flow validator suite: {N} suites / {N} tests pass | not run"
  ],
  "criticalGaps": [
    "{gap if BFA suite not run since last implementation change}",
    "{gap if CF rules are empty stubs with no actual validation logic}"
  ]
}
```

**Q6 verdict rules:**
- `PASS`: all CF rules present (non-empty) AND BFA cross-flow validator suite passes
- `PASS_WITH_CAVEATS`: CF rules present but suite not re-run for this specific flow post-implementation
- `PARTIAL_GAP`: CF rules present but suite fails or some rules are stubs
- `FAIL`: no CF rules authored for this flow

---

### Step 7b: Populate Q7 — Auth Protection Declared (NEW v3.2)

Q7 checks whether HTTP controllers are guarded and routes have auth declarations.
Applies to any flow that produces controllers. For service-only flows: Q7 = NOT_APPLICABLE.

```bash
FLOW_DIR="server/src/engine/flows/{slug}"

# Auth infrastructure presence (determines if AUTH_DEFERRED applies)
AUTH_MODULE=$(ls server/src/auth/auth.module.ts 2>/dev/null | wc -l)
echo "Auth infrastructure: $([ $AUTH_MODULE -eq 1 ] && echo 'PRESENT' || echo 'ABSENT — AUTH_DEFERRED')"

# A-1: Controllers vs @UseGuards
CONTROLLERS=$(find $FLOW_DIR -name "*.controller.ts" 2>/dev/null | wc -l)
GUARDED=$(grep -rl "@UseGuards" $FLOW_DIR --include="*.controller.ts" 2>/dev/null | wc -l)
echo "A-1 Controllers: $CONTROLLERS | Guarded: $GUARDED"

# A-2: Routes vs @Roles/@Public()
ROUTES=$(grep -rEcl "@Get\(|@Post\(|@Put\(|@Delete\(|@Patch\(" $FLOW_DIR   --include="*.controller.ts" 2>/dev/null | wc -l)
AUTH_DECL=$(grep -rEcl "@Roles\(|@Public\(\)" $FLOW_DIR   --include="*.controller.ts" 2>/dev/null | wc -l)
echo "A-2 Route files: $ROUTES | Auth declared: $AUTH_DECL"

# Rule 7 — 401/403 tests present
TESTS_401=$(grep -rcE "\.expect\(401\)|HttpStatus\.UNAUTHORIZED"   $FLOW_DIR --include="*.spec.ts" 2>/dev/null   | awk -F: '{sum+=$2} END {print sum+0}')
TESTS_403=$(grep -rcE "\.expect\(403\)|HttpStatus\.FORBIDDEN"   $FLOW_DIR --include="*.spec.ts" 2>/dev/null   | awk -F: '{sum+=$2} END {print sum+0}')
echo "Rule 7 — 401 tests: $TESTS_401 | 403 tests: $TESTS_403"
```

```json
"Q7_auth_protection": {
  "verdict": "PASS | AUTH_GAP | AUTH_DEFERRED | NOT_APPLICABLE | TBD",
  "authInfraPresent": true,
  "controllerCount": 0,
  "guardedControllerCount": 0,
  "authDeclarationCoverage": {
    "routeFilesWithRoutes": 0,
    "routeFilesWithAuthDecl": 0
  },
  "rule7Tests": {
    "test401Count": 0,
    "test403Count": 0
  },
  "evidence": [
    "A-1: {CONTROLLERS} controllers, {GUARDED} guarded",
    "A-2: {ROUTES} route files, {AUTH_DECL} with @Roles/@Public()",
    "Rule 7: {TESTS_401} x 401 tests, {TESTS_403} x 403 tests"
  ],
  "criticalGaps": [
    "{gap if GUARDED < CONTROLLERS — which controllers are unguarded}",
    "{gap if AUTH_DECL < ROUTES — which route files lack auth declaration}",
    "{gap if TESTS_401 = 0 — 401 test missing}",
    "{gap if TESTS_403 = 0 — 403 test missing}"
  ]
}
```

**Q7 verdict rules:**
| Condition | Verdict |
|-----------|---------|
| No controllers (CONTROLLERS = 0) | `"NOT_APPLICABLE"` |
| auth.module.ts absent AND controllers exist | `"AUTH_DEFERRED"` — acceptable; Phase H will decorate |
| CONTROLLERS = GUARDED AND AUTH_DECL = ROUTES AND TESTS_401 ≥ 1 AND TESTS_403 ≥ 1 | `"PASS"` |
| Any guard or auth declaration missing (auth infra present) | `"AUTH_GAP"` |
| Tests exist but counts are 0 | `"AUTH_GAP"` — test missing |
| Not yet evaluated | `"TBD"` |

**Q7 is not BLOCKING by itself:** AUTH_DEFERRED is an acceptable state for GOAL_PARTIALLY_REACHED.
AUTH_GAP (when auth infra is present but controllers unguarded) IS a blocker for Q7.

---

### Step 7c: Populate Q8 — Tenant Certification Tier (NEW v3.2)

Q8 records the flow's current TIER-A/B/C/D certification status and the evidence
behind it. This closes the gap where a flow could reach GOAL_REACHED while having
TBD portability and TBD auth status in IMPL-STATE.json.

```bash
# Read current status from IMPL-STATE.json
IMPL="docs/sessions/FLOW-XX/FLOW-XX-IMPL-STATE.json"
PORTABILITY=$(jq -r '.portabilityStatus // "TBD"' $IMPL 2>/dev/null || echo "TBD")
AUTH=$(jq -r '.authStatus // "TBD"' $IMPL 2>/dev/null || echo "TBD")
SK553_L1=$(jq -r '.portabilityTest.layer1.status // "NOT_RUN"' $IMPL 2>/dev/null || echo "NOT_RUN")
TIER=$(jq -r '.tenantCertTier // "NONE"' $IMPL 2>/dev/null || echo "NONE")
CERT_TARGET=$(jq -r '.tenantCertTarget // "NOT_DISTRIBUTABLE"' $IMPL 2>/dev/null || echo "NOT_DISTRIBUTABLE")
echo "Portability: $PORTABILITY | Auth: $AUTH | SK-553 L1: $SK553_L1"
echo "Tier: $TIER | Target: $CERT_TARGET"

# D-HIST-001: no SDK imports in service files
SDK=$(grep -rn "^import.*from '@elastic\|from '@anthropic\|from 'pg'\|from 'ioredis'"   server/src/engine/flows/{slug}/ --include="*.ts"   | grep -v "fabrics/implementations\|.spec." | wc -l)
echo "D-HIST-001 SDK imports: $SDK"   # Expected: 0

# NDJSON type coverage (SK-554)
SCOPE=$(jq '[.[] | select(.arbiterType=="scope_isolation")] | length'   fixtures/arbiters/{slug}-arbiters.bulk.ndjson 2>/dev/null || echo 0)
EMPTY=$(jq '[.[] | select(.arbiterType==null or .arbiterType=="")] | length'   fixtures/arbiters/{slug}-arbiters.bulk.ndjson 2>/dev/null || echo 0)
echo "NDJSON scope_isolation: $SCOPE | No-type records: $EMPTY"
```

```json
"Q8_tenant_cert_tier": {
  "verdict": "TIER_A | TIER_B | TIER_C | TIER_D | NOT_CERTIFIED | NOT_DISTRIBUTABLE | TBD",
  "tenantCertTarget": "NOT_DISTRIBUTABLE | TIER_A | TIER_B | TIER_C | TIER_D",
  "evidence": {
    "portabilityStatus": "TBD | MOBILE | PARTIAL_GAP | NOT_PORTABLE | NOT_APPLICABLE",
    "authStatus": "TBD | AUTH_READY | AUTH_GAP | AUTH_DEFERRED | NOT_APPLICABLE",
    "sk553Layer1": "NOT_RUN | PASS | FAIL",
    "sk553Phase0Auth": "NOT_RUN | PASS | AUTH_DEFERRED",
    "dHist001SdkImports": 0,
    "ndjsonScopeIsolation": 0,
    "ndjsonNoTypeRecords": 0,
    "r6AuthIsolation": "NOT_RUN | PASS | FAIL",
    "repoNamingCompliant": false
  },
  "criticalGaps": [
    "{gap if portabilityStatus = TBD — V9 gate not run}",
    "{gap if authStatus = TBD — V10 gate not run}",
    "{gap if dHist001SdkImports > 0 — SDK imports block portability}",
    "{gap if ndjsonScopeIsolation = 0 — scope_isolation absent}"
  ]
}
```

**Q8 verdict rules:**
| Condition | Verdict |
|-----------|---------|
| tenantCertTarget = NOT_DISTRIBUTABLE | `"NOT_DISTRIBUTABLE"` — no certification needed |
| portabilityStatus = TBD OR authStatus = TBD | `"TBD"` — gates not run, cannot determine |
| SK-553 Layer 1 PASS AND (AUTH_READY OR AUTH_DEFERRED documented) | `"TIER_A"` minimum |
| TIER_A + repo naming + repo evidence | `"TIER_B"` |
| TIER_B + AI Adaptation + per-role visual + R6 + Guard 14 | `"TIER_C"` |
| All layers + full per-role coverage at all cascade points | `"TIER_D"` |
| portabilityStatus ≠ MOBILE AND SK-553 not run | `"NOT_CERTIFIED"` |

**Q8 and overallReadiness:**
- `verdict = TBD` on a completed flow (phase_status = PHASE_F+) → contributes to `"READY_WITH_GAPS"`
- `portabilityStatus = TBD OR authStatus = TBD` on completed flow → `overallReadiness = "BLOCKED"`
  (TBD status on a completed flow means the gates never ran — this is a blocker, not a gap)
- `NOT_DISTRIBUTABLE` → no impact on overallReadiness (opt-out is valid)

---

### Step 8: Set overallReadiness, blockerSummary, and nextActions

```json
"overallReadiness": "READY | READY_WITH_GAPS | BLOCKED",
"blockerSummary": [
  "{item from criticalGaps with BLOCKING or SIGNIFICANT severity}",
  ...
],
"nextActions": [
  "{specific action to remediate the first blocker}",
  "{specific action for the second blocker}",
  ...
]
```

**overallReadiness rules:**
| Condition | overallReadiness |
|-----------|-----------------|
| All Q1-Q8 are PASS or PASS_WITH_CAVEATS or NOT_APPLICABLE, blockerSummary empty | `"READY"` |
| Any Q is PARTIAL_GAP or AUTH_DEFERRED, no FAIL verdicts, no BLOCKING items | `"READY_WITH_GAPS"` |
| Any Q is FAIL or AUTH_GAP, or blockerSummary has a BLOCKING item | `"BLOCKED"` |
| Q8 portabilityStatus = TBD or authStatus = TBD on completed flow | `"BLOCKED"` (gates never ran) |

**blockerSummary** should contain the highest-severity gaps — specifically any gap
classified as BLOCKING or SIGNIFICANT in the RECONCILIATION-STATE.md (B-06) for this flow.

**nextActions** are specific, actionable steps (not vague). Each action should name the
file to edit or the command to run.

---

## COMPLETE TEMPLATE (pre-implementation state)

Use this template when QA coverage is being recorded before full implementation:

```json
{
  "flowId": "FLOW-XX",
  "slug": "{slug}",
  "schemaVersion": "qcs-v1",
  "createdAt": "{YYYY-MM-DD}",
  "branch": "{branch-name}",
  "qCategories": {
    "Q1_unit_tests": {
      "verdict": "TBD",
      "evidence": [],
      "claimedCount": 0,
      "actualCount": 0,
      "criticalGaps": ["Implementation not yet complete"]
    },
    "Q2_client_ui": {
      "verdict": "TBD",
      "uiReflectionVerdict": "Not yet evaluated",
      "evidence": [],
      "criticalGaps": []
    },
    "Q3_design_simulation": {
      "verdict": "TBD",
      "designContractSpec": null,
      "topologyPresent": false,
      "evidence": [],
      "criticalGaps": []
    },
    "Q4_marketplace_ui": {
      "verdict": "TBD",
      "applicabilityToMarketplace": "TBD",
      "evidence": [],
      "criticalGaps": []
    },
    "Q5_cross_tenant_install": {
      "verdict": "TBD",
      "applicability": "TBD",
      "scopeIsolationArbiterPresent": false,
      "evidence": [],
      "criticalGaps": []
    },
    "Q6_bfa_validation": {
      "verdict": "TBD",
      "cfRules": [],
      "evidence": [],
      "criticalGaps": []
    },
    "Q7_auth_protection": {
      "verdict": "TBD",
      "authInfraPresent": null,
      "controllerCount": 0,
      "guardedControllerCount": 0,
      "authDeclarationCoverage": {
        "routeFilesWithRoutes": 0,
        "routeFilesWithAuthDecl": 0
      },
      "rule7Tests": { "test401Count": 0, "test403Count": 0 },
      "evidence": [],
      "criticalGaps": ["Auth gates not yet evaluated"]
    },
    "Q8_tenant_cert_tier": {
      "verdict": "TBD",
      "tenantCertTarget": "NOT_DISTRIBUTABLE",
      "evidence": {
        "portabilityStatus": "TBD",
        "authStatus": "TBD",
        "sk553Layer1": "NOT_RUN",
        "sk553Phase0Auth": "NOT_RUN",
        "dHist001SdkImports": null,
        "ndjsonScopeIsolation": null,
        "ndjsonNoTypeRecords": null,
        "r6AuthIsolation": "NOT_RUN",
        "repoNamingCompliant": false
      },
      "criticalGaps": ["Certification gates not yet run"]
    }
  },
  "overallReadiness": "READY_WITH_GAPS",
  "blockerSummary": [],
  "nextActions": [
    "Complete implementation phases B-F before evaluating Q1-Q6"
  ]
}
```

---

## SELF-CHECK BEFORE SAVING

```
□ schemaVersion is exactly "qcs-v1" (string)
□ Every Q-category verdict was set from a bash command result, not from memory
□ Q1 claimedCount and actualCount are both real numbers (not 0 as placeholder)
□ Q2 uiReflectionVerdict references actual task type IDs (T{N}, T{N+1}, etc.)
□ Q3 topologyPresent is confirmed by ls command — not assumed true
□ Q4 applicabilityToMarketplace clearly states "DIRECTLY_APPLICABLE" or "NOT_APPLICABLE" — never TBD on a completed flow
□ Q5 scopeIsolationArbiterPresent confirmed by grep on arbiters NDJSON file
□ Q6 cfRules[] contains all CF rule IDs from {slug}-bfa-rules.ts
□ overallReadiness follows the objective verdict rules (not subjective)
□ blockerSummary only contains items confirmed as BLOCKING or SIGNIFICANT by evidence
□ nextActions are specific and actionable (name files or commands, not vague goals)
□ Companion file FLOW-XX-QA-COVERAGE-STATE.md (B-05) produced immediately after this file
□ File saved to docs/sessions/FLOW-XX/FLOW-XX-QA-COVERAGE-STATE.json
□ [v3.2] Q7 verdict is set from A-1/A-2 grep results and Rule 7 test counts — not from memory
□ [v3.2] Q7 = NOT_APPLICABLE if CONTROLLERS = 0; AUTH_DEFERRED if auth.module.ts absent
□ [v3.2] Q8 portabilityStatus and authStatus read from IMPL-STATE.json — not assumed
□ [v3.2] Q8 dHist001SdkImports is a real grep count — not left null on a completed flow
□ [v3.2] Q8 ndjsonScopeIsolation is a real jq count from the arbiters file
□ [v3.2] Q8 = TBD is NOT acceptable on a flow with phase_status PHASE_F+ (run the gates)
```

**SILENT_FAILURE RISK:** The most dangerous error is using estimated or assumed values for
Q1 claimedCount and actualCount. Test counts that don't match the real suite results create
a false picture of QA coverage. Always run `npx jest` before populating Q1.

---

## TWO OBSERVED EXAMPLES

**Example A — FLOW-47 (partial implementation, READY_WITH_GAPS):**
- Q1: PASS_WITH_CAVEATS (86 tests pass but assertions weakened then partially restored)
- Q2: PARTIAL_GAP (T661 uses stub setTimeout instead of real API)
- Q3: TBD (no DC-01..DC-10 spec, DPO triple check skipped per KNOWN CONSTRAINTS)
- Q4: PARTIAL_GAP (ironRules + arbiterConfigIds zero-populated on all 30 packages)
- Q5: PARTIAL_GAP (T661 stub + cross-tenant install not validated live)
- Q6: PASS (7 CF rules present: CF-832..CF-838)
- overallReadiness: READY_WITH_GAPS
- blockerSummary: 6 items (Rule 16 violation, T661 stub, weakened assertions, missing topology, ironRules/arbiterConfigIds empty)

**Example B — FLOW-09 (early evaluation, TBD verdicts):**
- Q1: TBD (test files inventoried, no current count confirmed)
- Q2: TBD (5 React pages exist, but UI-REFLECTION inventory incomplete)
- Q3: TBD (topology present but QA spec and design-contract spec not confirmed)
- Q4: TBD (applicability noted but not evaluated)
- Q5: TBD (scope_isolation arbiter confirmed present but install not tested)
- Q6: PASS (implied from Phase A BFA rules authored)
- Note: FLOW-09 uses an extended schema variant with `scaffold_phase` and `verdict_legend` fields

---

## SCHEMA VARIANT NOTE

FLOW-09 uses an extended Q-category schema with additional fields per Q:
- `"category"` — the Q name as a plain-English string
- `"actualOnDisk"` — object with sub-counts (phase_test_files, it_blocks, service_files, etc.)
- `"react_pages_count"` — explicit count field for Q2

These additional fields are acceptable extensions. The guidance file must support both
the compact schema (FLOW-47 pattern) and the extended schema (FLOW-09 pattern).
**Use the compact schema by default; add extension fields only when they add clarity.**

---

## COMPANION FILE RULE

`FLOW-XX-QA-COVERAGE-STATE.md` (B-05) MUST be produced immediately after this file.
It is a 6-row markdown table derived directly from the Q1-Q6 verdicts here.
See GUIDE-B05 for the authoring instructions.

---

## C30/C38 SOURCE SPLIT NOTE

The QA coverage schema is **universal** across all 49 flows. For FLOW-35..47 and
FLOW-48, where no ZIP-16 business spec exists, Q4 applicabilityToMarketplace and Q5
applicability are determined from:
- The flow's CURRENT-STATE.json D3 section
- The flow's DESIGN-SIMULATION-R1.md overview table
FLOW-41 (`adapter-ci-cd-bridge`): Q2 always `"NOT_APPLICABLE"` (no React pages, engine-internal only).

---

## AUTHORING QUALITY GATE

This guidance file is SELF-SUFFICIENT if a Claude Code session can produce a correct
`FLOW-XX-QA-COVERAGE-STATE.json` using only:
1. This guidance file
2. The actual codebase (for bash commands)
3. The flow's IMPL-STATE.json (for claimedCount baseline)
4. The flow's UI-REFLECTION-STATE.json (for Q2 verdicts)

---
*GUIDE-B04 | Round 14 | Phase 4 — Guidance File Authoring*
*Sources: ZIP-01 (P+S), ZIP-11 (F), ZIP-14 (R)*
*Next: GUIDE-B05 — FLOW-XX-QA-COVERAGE-STATE.md (Round 15)*
*v3.2 amendment: Q7 (auth_protection_declared): A-1/A-2 controller guard checks +*
*Rule 7 (401/403 test counts); Q8 (tenant_cert_tier): reads portabilityStatus,*
*authStatus, SK-553 Layer 1, D-HIST-001, NDJSON scope counts from IMPL-STATE.json.*
*overallReadiness rules extended to Q1-Q8; TBD on completed flow = BLOCKED.*
*Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 18.*
