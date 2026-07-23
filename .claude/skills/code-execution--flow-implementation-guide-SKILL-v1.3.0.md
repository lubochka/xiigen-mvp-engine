---
name: flow-implementation-guide
version: "1.3.0"
description: >
  The master skill for implementing any new flow through the XIIGen AF pipeline.
  v1.2 adds Step 3.b (@connectionType annotation) and V9 (portability gate P-1..P-5).
  v1.3 adds V10 (auth gate A-1..A-3) and V11 (tenant certification tier NONE→TIER_D).
  V10 and V11 do NOT block ACTIVE promotion — they record status for Phase H and I.
  Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 4.
author: luba
updated: "2026-04-24"
priority: SUPREME
triggers:
  - "implement flow"
  - "new flow"
  - "plan implementation"
  - "execute flow"
  - "7-step protocol"
  - "V9 portability"
  - "portability gate"
  - "V10 auth gate"
  - "V11 cert tier"
  - "auth gate"
  - "tenant certification"
---

# Flow Implementation Guide Skill v1.3
## How to plan, implement, test, and validate ANY XIIGen flow

---

## Skill Loading Order

```
1. data-connection-classification v2.0  ← What type is each ES document AND service file?
2. flow-prerequisites v1.1.0            ← Is infrastructure ready? (incl. P-5 auth infra check)
3. flow-implementation-guide            ← THIS SKILL: how to implement
4. dna-compliance-guard v1.2.0          ← 9 DNA rules + P-1..P-5 portability + A-1..A-3 auth + D-HIST-001
5. xiigen-core-principles               ← P1-P8 compliance check
6. plan-review-skill v2.1.0             ← FC-1 through FC-21 consistency
```

---

## THE 7-STEP FLOW IMPLEMENTATION PROTOCOL

Every flow follows these 7 steps. No exceptions. No shortcuts.

---

### STEP 1: VERIFY PREREQUISITES

Before writing any code, run the flow-prerequisites verification gate.
If ANY Tier 1 prerequisite fails, stop and fix infrastructure first.

```bash
curl localhost:9200/xiigen-rag-patterns/_mapping | jq '.xiigen-rag-patterns.mappings.properties.connectionType'
curl localhost:9200/xiigen-prompts/_mapping | jq '.xiigen-prompts.mappings.properties.connectionType'
cd server && npx jest --testPathPattern="project-tracker" --verbose
cd server && npx jest --verbose  # baseline >= 2,342
cd client && npx jest --verbose  # baseline >= 220
```

**Output:** Prerequisite gate PASS or FAIL + which prerequisites are missing.

---

### STEP 2: CLAIM ARTIFACT NUMBERS

**Read from 5 canonical docs — NEVER from memory.**

```bash
grep -oE "F1[0-9]{3}" ENGINE_ARCHITECTURE_MERGED.md | sort -t'F' -k1 -n | tail -1
grep -oE "T[0-9]{3}" TASK_TYPES_CATALOG_MERGED.md | sort -t'T' -k1 -n | tail -1
grep -oE "CF-[0-9]+" V62_BFA_STRESS_TEST_MERGED.md | sort -t'-' -k2 -n | tail -1
grep -oE "SK-[0-9]+" SKILLS_FACTORY_RAG_MERGED.md | sort -t'-' -k2 -n | tail -1
grep -oE "DR-[0-9]+" ENGINE_ARCHITECTURE_MERGED.md | sort -t'-' -k2 -n | tail -1
```

Document in STATE.json:
```json
{
  "flow_starts_at": {
    "factory": "F????",
    "task_type": "T???",
    "bfa_rule": "CF-???"
  },
  "portabilityStatus": "TBD",
  "portabilityGaps": [],
  "authStatus": "TBD",
  "authGaps": [],
  "tenantCertTier": "NONE"
}
```

---

### STEP 3: CLASSIFY DATA (ES DOCUMENTS)

For each document type this flow creates or reads, classify:

```
□ What connectionType? (TENANT_PRIVATE | FLOW_SCOPED | TENANT_EXPORTABLE)
□ Who owns it?
□ Does it travel on export?
□ What fields need PII scrubbing?
□ What dependencies must exist for it to work after import?
```

Use data-connection-classification v2.0 for the checklist.

**Iron rule:** FLOW_SCOPED ES documents must NEVER contain tenant-specific values.

---

### STEP 3.b: CLASSIFY TYPESCRIPT SERVICE FILES — v1.2.0

The data-connection-classification skill classifies ES documents. Service TypeScript
files also require classification because they travel with the flow package.

**Every `.service.ts` file in `server/src/engine/flows/{slug}/` must have:**

```typescript
/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-XX
 * @portability MOBILE — ClsService absent, FREEDOM keys flow-scoped
 */
export class {ClassName} extends MicroserviceBase {
```

For PLAIN_TS flows (no NestJS DI):
```typescript
/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-XX
 * @portability MOBILE — pure TypeScript, no framework dependencies
 * @import-from @xiigen/engine-infra-interfaces — canonical fabric interfaces only
 */
export class {ClassName} {
```

**Verify before proceeding to STEP 4:**
```bash
FLOW_DIR="server/src/engine/flows/{slug}"
SERVICE_COUNT=$(ls $FLOW_DIR/*.service.ts 2>/dev/null | wc -l)
ANNOTATED=$(grep -rl "@connectionType FLOW_SCOPED" $FLOW_DIR --include="*.service.ts" | wc -l)
echo "Services: $SERVICE_COUNT | Annotated: $ANNOTATED"
# Expected: ANNOTATED == SERVICE_COUNT
```

If any service is unannotated: add the JSDoc block. Do NOT proceed to STEP 4 until
all service files are annotated.

---

### STEP 4: WRITE ENGINE CONTRACTS

Create factory contracts (F-XXXX), task types (T-XXX), and BFA rules (CF-XXX)
following the contract template from `reference--contract-template.md`.

Include `flowId` and `flowName` in every EngineContract.

---

### STEP 5: DEFINE AF PROMPTS

Write genesis, review, compliance, and judge prompts for each task type.
Seed to Elasticsearch with `connectionType: FLOW_SCOPED`.

Include FREEDOM key directives in genesis prompts — all configurable values must
use flow-scoped key format: `flow{NN}_semantic_name`.

---

### STEP 6: SUBMIT TO PIPELINE

Submit the contracts to the AF pipeline via POST /api/flow/inject.
Monitor with GET /api/runs/:runId/trace.

---

### STEP 7: VALIDATE (11 dimensions after every phase)

After each phase, run ALL 11 validation checks.
V9 (portability) added in v1.2. V10 (auth) and V11 (cert tier) added in v1.3.

**V10 and V11 do NOT block ACTIVE promotion.** They record status for GUIDE-B17
Phases H (auth decoration) and I (tenant certification). A flow reaches ACTIVE
when V1-V8 pass. V9-V11 status is recorded regardless.

---

#### V1: CODE QUALITY
- Re-run AF-9 on all generated artifacts
- npx tsc --noEmit on generated code
- Check P1-P8 compliance via grep
- PASS if: AF-9 score ≥ 70 AND zero compilation errors

#### V2: LEARNING PROGRESS
- Compare arbiter state: now vs previous phase
- Run trace entries: did pipeline score improve vs prior run?
- PASS if: at least one metric improved OR this is Phase A

#### V3: OBSERVABILITY
- Query AF-11 feedback store for this phase's runs
- Every AF station must have at least one trace
- PASS if: all expected stations have traces AND correlated

#### V4: DOCUMENTATION
- DR entries created (if specified)?
- CHANGELOG updated?
- STATE.json reflects current phase?
- PASS if: all specified docs exist AND STATE.json is current

#### V5: SOURCE CONTROL
- git status clean
- All phase code committed
- cd server && npx jest >= baseline
- PASS if: clean git AND tests pass

#### V6: PROJECT TRACKING
- Phase card exists and status updated
- PASS if: card exists AND status updated

#### V7: TESTABILITY
- Replay with: (a) different model, (b) different tenantId, (c) mock AI provider
- PASS if: all 3 replays produce valid output

#### V8: RAG INTEGRITY
- Query xiigen-rag-patterns for this flow's documents
- Check connectionType distribution (FLOW_SCOPED vs TENANT_PRIVATE)
- PASS if: patterns exist AND connectionTypes correct AND retrieval works

#### V9: PORTABILITY GATE — v1.2.0

Run after V1-V8. A flow that fails V9 is ACTIVE but not MOBILE.
It can run in the monorepo but cannot be packaged for distribution.

```bash
FLOW_DIR="server/src/engine/flows/{slug}"

# P-1: No ClsService import
P1=$(grep -rc "import.*ClsService\|from 'nestjs-cls'" $FLOW_DIR \
  --include="*.service.ts" | awk -F: '{sum+=$2} END {print sum+0}')
echo "P-1 ClsService hits: $P1"   # Expected: 0

# P-2: @connectionType annotated
SERVICE_COUNT=$(ls $FLOW_DIR/*.service.ts 2>/dev/null | wc -l)
ANNOTATED=$(grep -rl "@connectionType FLOW_SCOPED" $FLOW_DIR \
  --include="*.service.ts" | wc -l)
echo "P-2 Annotated: $ANNOTATED / $SERVICE_COUNT"

# P-3: FREEDOM keys are flow-scoped
P3=$(grep -rE "freedom\.get\(|fromConfig\(" $FLOW_DIR \
  --include="*.service.ts" | grep -vc "flow[0-9][0-9]*_" || echo 0)
echo "P-3 Unscoped FREEDOM keys: $P3"   # Expected: 0

# P-4: No local interface clones
P4=$(grep -rcE "^interface (IDb|IQueue|IFreedom)" $FLOW_DIR \
  --include="*.ts" | awk -F: '{sum+=$2} END {print sum+0}')
echo "P-4 Local interfaces: $P4"   # Expected: 0

# P-5: requiredCoInstalls declared
CROSS_FLOW=$(grep -rE "searchDocuments|storeDocument" $FLOW_DIR \
  --include="*.service.ts" | grep "xiigen-" | \
  grep -v "flow[0-9][0-9]*-" | wc -l)
DECLARED=$(node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8'))\
  ?.xiigen?.requiredCoInstalls?.length ?? 0" 2>/dev/null || echo 0)
echo "P-5 Cross-flow reads: $CROSS_FLOW | Declared: $DECLARED"
```

**V9 verdict rules:**
- `MOBILE`: P-1=0, P-2=100%, P-3=0, P-4=0, P-5=pass
- `PARTIAL_GAP`: 1-4 checks fail → list in portabilityGaps[]
- `NOT_PORTABLE`: P-1 > 0 → fundamental blocker
- `NOT_APPLICABLE`: EXTERNAL_REPO adapter flows only

**V9 does NOT block ACTIVE promotion.** Record in STATE.json:
```json
"portabilityStatus": "MOBILE | PARTIAL_GAP | NOT_PORTABLE | NOT_APPLICABLE",
"portabilityGaps": []
```

---

#### V10: AUTH GATE — NEW v1.3.0

Run after V9. Records auth coverage for GUIDE-B17 Phase H (Auth Decoration).
A flow that fails V10 is ACTIVE but not AUTH_READY. It can run in the monorepo
but its controllers accept unauthenticated requests until Phase H completes.

```bash
FLOW_DIR="server/src/engine/flows/{slug}"

# A-1: Every controller has @UseGuards
CONTROLLERS=$(find $FLOW_DIR -name "*.controller.ts" 2>/dev/null | wc -l)
GUARDED=$(grep -rl "@UseGuards" $FLOW_DIR \
  --include="*.controller.ts" 2>/dev/null | wc -l)
echo "A-1 Controllers: $CONTROLLERS | @UseGuards: $GUARDED"
# Expected: GUARDED == CONTROLLERS

# A-2: Every route has @Roles() or @Public()
ROUTES=$(grep -rEcl "@Get\(|@Post\(|@Put\(|@Delete\(|@Patch\(" $FLOW_DIR \
  --include="*.controller.ts" 2>/dev/null | wc -l)
AUTH_DECL=$(grep -rEcl "@Roles\(|@Public\(\)" $FLOW_DIR \
  --include="*.controller.ts" 2>/dev/null | wc -l)
echo "A-2 Controller files with routes: $ROUTES | with @Roles/@Public: $AUTH_DECL"

# Auth infrastructure presence (AUTH_DEFERRED check):
AUTH_MODULE=$(ls server/src/auth/auth.module.ts 2>/dev/null | wc -l)
echo "Auth infrastructure: $([ $AUTH_MODULE -eq 1 ] && echo 'PRESENT' || echo 'ABSENT — AUTH_DEFERRED')"
```

**V10 verdict rules:**
- `AUTH_READY`: CONTROLLERS == GUARDED AND all routes have @Roles/@Public() AND auth infra present
- `AUTH_GAP`: controllers exist but some are unguarded or routes lack auth declaration
- `AUTH_DEFERRED`: auth.module.ts absent (AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4 not yet deployed)
- `NOT_APPLICABLE`: flow has no HTTP controllers (service-only flows)

**V10 does NOT block ACTIVE promotion.** Record in STATE.json:
```json
"authStatus": "AUTH_READY | AUTH_GAP | AUTH_DEFERRED | NOT_APPLICABLE",
"authGaps": []
```

If `AUTH_GAP`: populate authGaps[] with the specific controllers and routes that need decoration.
These become the input to GUIDE-B17 Phase H.

---

#### V11: TENANT CERTIFICATION TIER — NEW v1.3.0

Run after V10. Records the current TIER-A/B/C/D certification status per
FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 tier model. This feeds GUIDE-B17 Phase I
(Tenant Certification) and the TIER-C pre-certification checklist.

```bash
# Read current status from STATE.json (set by V9 and V10):
PORTABILITY=$(jq -r '.portabilityStatus // "TBD"' \
  docs/sessions/{slug}/STATE.json 2>/dev/null || echo "TBD")
AUTH=$(jq -r '.authStatus // "TBD"' \
  docs/sessions/{slug}/STATE.json 2>/dev/null || echo "TBD")
SK553_L1=$(jq -r '.protocolStatus.sk553Layer1 // "NOT_RUN"' \
  docs/sessions/{slug}/STATE.json 2>/dev/null || echo "NOT_RUN")

echo "Portability: $PORTABILITY | Auth: $AUTH | SK-553 Layer1: $SK553_L1"

# Determine current TIER:
# NONE    — portabilityStatus is TBD or NOT_PORTABLE
# TIER-A  — SK-553 Layer 1 PASS (or AUTH_DEFERRED documented)
# TIER-B  — TIER-A + repo {tenantId}--{moduleName} + repo evidence PNG
# TIER-C  — TIER-B + AI Adaptation 1-5 + per-role visual + R6 auth isolation
#           (Guard 14: requires AUTH-ROLES-GROUPS-PLAN v3 Phases 1-4 deployed)
# TIER-D  — All layers + SK-549 full per-role coverage
```

**Tier determination logic (apply in order, stop at first match):**

| Tier | Required conditions |
|------|-------------------|
| TIER-D | TIER-C + SK-549 full per-role coverage complete |
| TIER-C | TIER-B + AI Adaptation Phases 1-5 complete + per-role visual (N roles × 3 cells) + R6 cross-tenant JWT isolation PASS + Guard 14 (AUTH-PLAN v3 Phases 1-4 deployed) |
| TIER-B | TIER-A + repo named `{tenantId}--{moduleName}` + repo evidence PNG present |
| TIER-A | SK-553 Layer 1 PASS, OR (portabilityStatus = MOBILE AND AUTH_DEFERRED documented) |
| NONE | None of the above — SK-553 Layer 1 not run AND no documented deferral |

**Guard 14 enforcement (from MODULE-SEPARATION-FIX-PLAN-v5.0 + PFM-v2.9):**
```bash
# TIER-C requires auth plan deployed — check before claiming TIER-C:
AUTH_MODULE=$(ls server/src/auth/auth.module.ts 2>/dev/null | wc -l)
ROLE_STRINGS=$(ls server/src/kernel/role-strings.ts 2>/dev/null | wc -l)
if [ "$AUTH_MODULE" -eq 0 ] || [ "$ROLE_STRINGS" -eq 0 ]; then
  echo "⚠️  Guard 14: AUTH-ROLES-GROUPS-PLAN v3 Phases 1-4 not deployed"
  echo "    Maximum achievable tier: TIER-B (TIER-C requires auth deployment)"
fi
```

**TIER-C pre-certification checklist (from PER-FLOW-FIX-MAP-v2.9 §Guard 14):**
```
Before recording TIER-C in STATE.json — verify all items:
  □ Guard 14: AUTH-PLAN v3 Phases 1-4 deployed? (auth.module.ts + role-strings.ts present)
  □ flow_module_name FREEDOM key declared in STEP-1-INVARIANTS?
  □ Repo naming: {tenantId}--{moduleName} convention applied in ForkFlowHandlerService?
  □ Repo evidence: GitHub listing screenshot captured for each cascade point?
  □ Per-role visual: all N roles × 3 cells (en/he-RTL/mobile) examined via SK-549?
  □ R6 auth isolation: cross-tenant JWT rejection tested (Tenant B → Tenant C → 401/403)?
```

**V11 does NOT block ACTIVE promotion.** Record in STATE.json:
```json
"tenantCertTier": "NONE | TIER_A | TIER_B | TIER_C | TIER_D"
```

---

## Report Format (updated v1.3)

```json
{
  "phase": "X",
  "validation": {
    "V1_code_quality":      {"status": "PASS|FAIL", "details": "..."},
    "V2_learning":          {"status": "PASS|FAIL", "details": "..."},
    "V3_observability":     {"status": "PASS|FAIL", "details": "..."},
    "V4_documentation":     {"status": "PASS|FAIL", "details": "..."},
    "V5_source_control":    {"status": "PASS|FAIL", "details": "..."},
    "V6_project_tracking":  {"status": "PASS|FAIL", "details": "..."},
    "V7_testability":       {"status": "PASS|FAIL", "details": "..."},
    "V8_rag_integrity":     {"status": "PASS|FAIL", "details": "..."},
    "V9_portability": {
      "status": "MOBILE|PARTIAL_GAP|NOT_PORTABLE|NOT_APPLICABLE",
      "checks": {
        "P1_no_cls_service":      "PASS|FAIL",
        "P2_connection_annotated": "PASS|FAIL",
        "P3_freedom_keys_scoped":  "PASS|FAIL",
        "P4_no_local_interfaces":  "PASS|FAIL",
        "P5_co_installs_declared": "PASS|FAIL|NA"
      },
      "gaps": []
    },
    "V10_auth": {
      "status": "AUTH_READY|AUTH_GAP|AUTH_DEFERRED|NOT_APPLICABLE",
      "checks": {
        "A1_controllers_guarded":   "PASS|FAIL|NA",
        "A2_routes_auth_declared":  "PASS|FAIL|NA",
        "auth_infra_present":       "PRESENT|ABSENT"
      },
      "gaps": []
    },
    "V11_cert_tier": {
      "tenantCertTier": "NONE|TIER_A|TIER_B|TIER_C|TIER_D",
      "guard14_clear": true,
      "blockers_to_next_tier": []
    }
  },
  "all_pass": true,
  "blockers": [],
  "next_phase_unlocked": true
}
```

## Changelog

- **v1.0.0** — initial skill. 7-step protocol, V1-V8 validation gates.
- **v1.1.0** — minor corrections, FREEDOM key naming rule.
- **v1.2.0** — Step 3.b: @connectionType annotation on TypeScript service files.
  V9 portability gate (P-1..P-5). V9 does NOT block ACTIVE. Closes G-33.
- **v1.3.0** — V10 auth gate (A-1..A-3): records authStatus per controller in STATE.json.
  V11 tenant certification tier (NONE→TIER_D): applies PORTABILITY-TEST-PROTOCOL-v2.0
  TIER model, enforces Guard 14 for TIER-C, embeds PFM-v2.9 TIER-C pre-certification
  checklist inline. Neither V10 nor V11 blocks ACTIVE promotion. Both feed GUIDE-B17
  Phases H (auth) and I (cert tier). Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 4.
