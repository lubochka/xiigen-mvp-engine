---
name: flow-lifecycle
sk_number: SK-443
version: "1.1.0"
priority: IMPORTANT
author: luba
updated: "2026-04-24"
description: >
  Protocol for managing lifecycle transitions in the xiigen-lifecycle index:
  Phase A CAS write (PLANNING → INJECTING), Phase E ACTIVE promotion,
  upstream prerequisite check (FLOW-NN must be ACTIVE before FLOW-NN+1 starts),
  and downstream gate-event unlock. Governs all lifecycle state machine transitions.
  v1.1.0: Phase G (portabilityStatus MOBILE/PARTIAL_GAP/NOT_PORTABLE), Phase H
  (authStatus AUTH_READY/AUTH_DEFERRED/AUTH_GAP), Phase I (tenantCertTier
  TIER_A/B/C/D) CAS write steps added. Guard 14 enforcement at TIER_C promotion.
triggers:
  - "flow lifecycle"
  - "set flow ACTIVE"
  - "lifecycle transition"
  - "phase A lifecycle"
  - "promote to ACTIVE"
  - "check upstream flow"
  - "gate event unlock"
  - "xiigen-lifecycle"
  - "portability status write"
  - "auth status write"
  - "tenant cert tier"
  - "Guard 14"
  - "MOBILE promotion"
  - "AUTH_READY"
---

# flow-lifecycle

## Purpose

Every flow in the xiigen engine has a lifecycle tracked in the `xiigen-lifecycle` index.
Phase A writes the initial INJECTING status. Phase E writes ACTIVE.
Before any Phase A begins, the upstream flow's status must be ACTIVE (if wave > 0).

Without this skill, Phase E promotion is ad-hoc, downstream flows can start before
upstream is complete, and the gate-event unlock chain breaks.

---

## When to Invoke

- Auto-fire at Phase A start (write INJECTING)
- Auto-fire at Phase E completion (write ACTIVE)
- Auto-fire before FLOW-NN Phase A when wave > 0 (read upstream status)
- Auto-fire when gate event is declared in a task type's contract

---

## Lifecycle States

```
PRIMARY STATES (main lifecycle state machine — mutually exclusive):
PLANNING    → Initial state; flow has been examined but Phase A hasn't started
INJECTING   → Phase A in progress (fixtures being authored + seeded)
GENERATING  → Phase B in progress (AF pipeline running for any task type)
INTEGRATING → Phase D in progress (NestJS wiring + tests)
ACTIVE      → Phase E complete; all task types INJECTED; DPO minimum met
FAILED      → Any phase produced an unrecoverable error (manual intervention required)
HELD        → Phase B run scored < 0.60 and checkpoint_report was triggered

PROTOCOL STATUS FIELDS (supplementary — written alongside primary state, not replacing it):
portabilityStatus:
  TBD           → Phase G has not run
  MOBILE        → Phase G: all P-1..P-5 + D-HIST-001 pass
  PARTIAL_GAP   → Phase G: 1-4 checks fail — gaps logged
  NOT_PORTABLE  → Phase G: P-1 (ClsService) > 0 — fundamental blocker

authStatus:
  TBD           → Phase H has not run
  AUTH_READY    → Phase H: all controllers guarded, all routes declared, Rule 7 tests pass
  AUTH_DEFERRED → Phase H: auth.module.ts absent — deferred to post-AUTH-PLAN deployment
  AUTH_GAP      → Phase H: controllers exist but some unguarded or routes lack declaration
  NOT_APPLICABLE → No HTTP controllers in this flow

tenantCertTier (per SK-553 v1.1.0):
  NONE    → Phase I has not run or flow is not targeting distribution
  TIER_A  → SK-553 Layer 1 PASS (or AUTH_DEFERRED documented)
  TIER_B  → TIER_A + repo {tenantId}--{moduleName} + repo evidence PNG
  TIER_C  → TIER_B + AI Adaptation + per-role visual + R6 auth isolation (Guard 14 required)
  TIER_D  → TIER_C + SK-549 full per-role coverage at all cascade points
```

---

## ES Document Format

```json
{
  "flowId": "FLOW-01",
  "status": "ACTIVE",
  "wave": 0,
  "taskTypes": ["T47", "T48", "T49"],
  "prerequisites": [],
  "gateEvent": {
    "event": "OnboardingCompleted",
    "unlocksFlows": ["FLOW-02", "FLOW-03", "FLOW-04", "FLOW-05"]
  },
  "phaseHistory": [
    { "phase": "INJECTING", "startedAt": "2026-03-23T10:00:00Z" },
    { "phase": "GENERATING", "startedAt": "2026-03-23T11:00:00Z" },
    { "phase": "INTEGRATING", "startedAt": "2026-03-23T14:00:00Z" },
    { "phase": "ACTIVE", "completedAt": "2026-03-23T16:00:00Z" }
  ],
  "dpoTriples": 3,
  "completedAt": "2026-03-23T16:00:00Z",
  "portabilityStatus": "MOBILE",
  "portabilityGaps": [],
  "authStatus": "AUTH_READY",
  "authGaps": [],
  "tenantCertTier": "TIER_A"
}
```

---

## Step 1 — Phase A: Write INJECTING Status

Run at the start of Phase A (after infrastructure checks pass, before fixture authoring):

```bash
# CAS write — check PLANNING status first (don't overwrite ACTIVE)
CURRENT=$(curl -sf "http://localhost:9200/xiigen-lifecycle/_doc/FLOW-NN" \
  | jq -r '._source.status // "NOT_FOUND"' 2>/dev/null)

if [ "$CURRENT" = "ACTIVE" ]; then
  echo "STOP: FLOW-NN is already ACTIVE. Do not re-run Phase A."
  exit 1
fi

# Write INJECTING
curl -sf -X PUT "http://localhost:9200/xiigen-lifecycle/_doc/FLOW-NN" \
  -H "Content-Type: application/json" \
  -d '{
    "flowId": "FLOW-NN",
    "status": "INJECTING",
    "wave": N,
    "taskTypes": ["T__", "T__", "T__"],
    "prerequisites": ["FLOW-NN-1"],
    "phaseHistory": [
      { "phase": "INJECTING", "startedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" }
    ]
  }'

echo "FLOW-NN status set to INJECTING"
```

---

## Step 2 — Before Phase A (Wave > 0): Check Prerequisites

If this flow has a wave > 0, all prerequisite flows must be ACTIVE first:

```bash
# Example: FLOW-02 requires FLOW-01 ACTIVE
for prereq in FLOW-01; do
  STATUS=$(curl -sf "http://localhost:9200/xiigen-lifecycle/_doc/${prereq}" \
    | jq -r '._source.status // "NOT_FOUND"' 2>/dev/null)

  if [ "$STATUS" != "ACTIVE" ]; then
    echo "STOP: ${prereq} status is '${STATUS}', not ACTIVE."
    echo "Complete ${prereq} (Phase A through E) before starting this flow."
    exit 1
  else
    echo "PASS: ${prereq} is ACTIVE"
  fi
done
```

---

## Step 3 — Phase B/C Transition: Update Status

When Phase B begins (first AF pipeline execution for any task type):

```bash
curl -sf -X POST "http://localhost:9200/xiigen-lifecycle/_update/FLOW-NN" \
  -H "Content-Type: application/json" \
  -d '{
    "script": {
      "source": "ctx._source.status = '\''GENERATING'\''; ctx._source.phaseHistory.add(['\''phase'\'': '\''GENERATING'\'', '\''startedAt'\'': params.ts])",
      "params": { "ts": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" }
    }
  }'
```

---

## Step 4 — Phase E: Write ACTIVE Status

Run after all task types are INJECTED and DPO minimum is met:

```bash
# First: verify DPO triple minimum
DPO_COUNT=$(curl -sf "http://localhost:9200/xiigen-training-data/_count?q=flowId:FLOW-NN" \
  | jq '.count')

REQUIRED_DPOS=3  # from reference plan Phase E gate

if [ "$DPO_COUNT" -lt "$REQUIRED_DPOS" ]; then
  echo "STOP: DPO triples = ${DPO_COUNT}, need ${REQUIRED_DPOS}."
  echo "Re-run Phase B with the updated prompt until more DPO triples are generated."
  exit 1
fi

# Write ACTIVE
curl -sf -X PUT "http://localhost:9200/xiigen-lifecycle/_doc/FLOW-NN" \
  -H "Content-Type: application/json" \
  -d '{
    "flowId": "FLOW-NN",
    "status": "ACTIVE",
    "wave": N,
    "taskTypes": ["T__", "T__", "T__"],
    "prerequisites": ["FLOW-NN-1"],
    "dpoTriples": '"${DPO_COUNT}"',
    "completedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Verify
STATUS=$(curl -sf "http://localhost:9200/xiigen-lifecycle/_doc/FLOW-NN" \
  | jq -r '._source.status')
echo "FLOW-NN status: ${STATUS}"  # must output: ACTIVE
```

---

## Step 5 — Gate Event: Unlock Downstream Flows

If the flow has a gate event (T49 emits OnboardingCompleted → unlocks FLOW-02/03/04/05):

```bash
# When gate event fires in Phase E, verify downstream flows can see the gate
curl -sf "http://localhost:9200/xiigen-lifecycle/_doc/FLOW-NN" \
  | jq '._source.gateEvent'
# Expected: { "event": "OnboardingCompleted", "unlocksFlows": ["FLOW-02", ...] }

# Downstream flows check this gate in their Phase A CHECK 6
# No additional action needed — the ACTIVE status + gateEvent field is the signal
```

---

## Step 6a — Phase G: Write portabilityStatus (NEW v1.1.0)

Run after Phase G gate (V9) completes. Writes portabilityStatus to the lifecycle document.

```bash
# Determine portability verdict from Phase G gate results
# P1=ClsService hits, P3=unscoped FREEDOM keys, P4=local interfaces
# (read from Phase G gate output or IMPL-STATE.json)
PORTABILITY_STATUS="MOBILE"     # override below if any P fails
PORTABILITY_GAPS="[]"

[ "$P1" -gt 0 ] && PORTABILITY_STATUS="NOT_PORTABLE" &&   PORTABILITY_GAPS='["P-1: ClsService present ('$P1' hits)"]'
[ "$P3" -gt 0 ] && PORTABILITY_STATUS="PARTIAL_GAP" &&   PORTABILITY_GAPS='["P-3: '$P3' unscoped FREEDOM keys"]'
[ "$P4" -gt 0 ] && [ "$PORTABILITY_STATUS" != "NOT_PORTABLE" ] &&   PORTABILITY_STATUS="PARTIAL_GAP" &&   PORTABILITY_GAPS='["P-4: '$P4' local interface definitions"]'

curl -sf -X POST "http://localhost:9200/xiigen-lifecycle/_update/FLOW-NN"   -H "Content-Type: application/json"   -d '{
    "script": {
      "source": "ctx._source.portabilityStatus = params.s; ctx._source.portabilityGaps = params.g; ctx._source.phaseHistory.add(['''phase''': '''PHASE_G''', '''completedAt''': params.ts, '''result''': params.s])",
      "params": {
        "s": "'"$PORTABILITY_STATUS"'",
        "g": '"$PORTABILITY_GAPS"',
        "ts": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      }
    }
  }'

echo "portabilityStatus set to: $PORTABILITY_STATUS"
```

**Condition to run:** Phase G gate has executed (V9 check in IMPL-STATE.json).
If Phase G was not included in the implementation plan for this flow: write
`portabilityStatus: "NOT_APPLICABLE"` with note `"EXTERNAL_REPO adapter"`.

---

## Step 6b — Phase H: Write authStatus (NEW v1.1.0)

Run after Phase H gate (V10) completes. Writes authStatus to the lifecycle document.

```bash
# Determine auth verdict from Phase H gate results
# Read from Phase H gate output or IMPL-STATE.json authStatus field
AUTH_STATUS=$(jq -r '.authStatus // "TBD"'   docs/sessions/FLOW-NN/FLOW-NN-IMPL-STATE.json 2>/dev/null || echo "TBD")
AUTH_GAPS=$(jq -c '.authGaps // []'   docs/sessions/FLOW-NN/FLOW-NN-IMPL-STATE.json 2>/dev/null || echo '[]')

curl -sf -X POST "http://localhost:9200/xiigen-lifecycle/_update/FLOW-NN"   -H "Content-Type: application/json"   -d '{
    "script": {
      "source": "ctx._source.authStatus = params.s; ctx._source.authGaps = params.g; ctx._source.phaseHistory.add(['''phase''': '''PHASE_H''', '''completedAt''': params.ts, '''result''': params.s])",
      "params": {
        "s": "'"$AUTH_STATUS"'",
        "g": '"$AUTH_GAPS"',
        "ts": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      }
    }
  }'

echo "authStatus set to: $AUTH_STATUS"
```

**Condition to run:** Phase H gate has executed. If auth.module.ts absent:
`authStatus = "AUTH_DEFERRED"` is correct (not TBD — it means the gate ran
and explicitly chose the deferred path).

---

## Step 6c — Phase I: Write tenantCertTier (NEW v1.1.0)

Run after Phase I gate (V11) completes. Writes tenantCertTier to the lifecycle document.
Includes Guard 14 enforcement for TIER_C.

```bash
# Read tenantCertTier from IMPL-STATE.json
TIER=$(jq -r '.tenantCertTier // "NONE"'   docs/sessions/FLOW-NN/FLOW-NN-IMPL-STATE.json 2>/dev/null || echo "NONE")

# Guard 14: TIER_C requires AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4 deployed
# Check before writing TIER_C or higher
if [ "$TIER" = "TIER_C" ] || [ "$TIER" = "TIER_D" ]; then
  AUTH_MODULE=$(ls server/src/auth/auth.module.ts 2>/dev/null | wc -l)
  SCOPE_WIRE=$(ls server/src/auth/scope-enrichment.interceptor.ts 2>/dev/null | wc -l)
  APP_GUARD=$(grep -c "JwtAuthGuard\|APP_GUARD" server/src/app.module.ts 2>/dev/null || echo 0)
  ROLE_STRINGS=$(ls server/src/kernel/role-strings.ts 2>/dev/null | wc -l)
  GUARD14_SCORE=$((AUTH_MODULE + SCOPE_WIRE + APP_GUARD + ROLE_STRINGS))
  echo "Guard 14 score: $GUARD14_SCORE/4"
  if [ "$GUARD14_SCORE" -lt 4 ]; then
    echo "STOP: Guard 14 NOT satisfied ($GUARD14_SCORE/4). Cannot write TIER_C to lifecycle."
    echo "TIER_C requires AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4 fully deployed."
    echo "Set tenantCertTier to TIER_B until Guard 14 is satisfied."
    exit 1
  fi
  echo "Guard 14 PASS: $GUARD14_SCORE/4 — TIER_C promotion allowed"
fi

curl -sf -X POST "http://localhost:9200/xiigen-lifecycle/_update/FLOW-NN"   -H "Content-Type: application/json"   -d '{
    "script": {
      "source": "ctx._source.tenantCertTier = params.t; ctx._source.phaseHistory.add(['''phase''': '''PHASE_I''', '''completedAt''': params.ts, '''result''': params.t])",
      "params": {
        "t": "'"$TIER"'",
        "ts": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      }
    }
  }'

echo "tenantCertTier set to: $TIER"
```

**Guard 14 enforcement:** This skill blocks TIER_C (and TIER_D) lifecycle writes
when the auth infrastructure score is < 4/4. TIER_B is always available without
Guard 14. The guard is enforced here (lifecycle write) AND in QA Step 5b (report)
AND in the Phase I gate — three independent enforcement points.

---

## Step 6 — Retrieve Flow Status (API)

Three API endpoints:

```bash
# GET single flow status
curl -sf "http://localhost:3000/api/lifecycle/flows/FLOW-NN" | jq '.'

# PUT update status (CAS — conditional on current status)
curl -sf -X PUT "http://localhost:3000/api/lifecycle/flows/FLOW-NN" \
  -H "Content-Type: application/json" \
  -d '{"status": "INTEGRATING", "expectedStatus": "GENERATING"}'

# GET all flows by wave
curl -sf "http://localhost:3000/api/lifecycle/flows?wave=0" | jq '.[].flowId'
```

**If these endpoints don't exist:** GAP-03 (xiigen-lifecycle index + 3 API endpoints) is not resolved.
Direct ES access (Steps 1-5 above) is the fallback.

---

## Lifecycle Transition Rules

**Primary state transitions:**

| From | To | Condition | Who initiates |
|------|----|-----------|---------------|
| (none) | INJECTING | Phase A starts | Claude Code (this skill) |
| INJECTING | GENERATING | First AF pipeline run | Claude Code or GenericNodeExecutor |
| GENERATING | HELD | score < 0.60 on any run | GenericNodeExecutor auto |
| HELD | GENERATING | Human approves retry | Manual |
| GENERATING | INTEGRATING | All task types >= 0.70 | Claude Code |
| INTEGRATING | ACTIVE | Phase E gate passes | Claude Code (this skill) |
| any | FAILED | Unrecoverable error | Claude Code |

**Protocol status writes (supplementary — do not change primary state):**

| Field | From | To | Condition | Who initiates |
|-------|------|----|-----------|---------------|
| portabilityStatus | TBD | MOBILE | Phase G: P-1..P-5 + D-HIST-001 all pass | Claude Code (Step 6a) |
| portabilityStatus | TBD | PARTIAL_GAP | Phase G: 1-4 checks fail | Claude Code (Step 6a) |
| portabilityStatus | TBD | NOT_PORTABLE | Phase G: P-1 (ClsService) > 0 | Claude Code (Step 6a) |
| authStatus | TBD | AUTH_READY | Phase H: all guards + routes declared + Rule 7 tests pass | Claude Code (Step 6b) |
| authStatus | TBD | AUTH_DEFERRED | Phase H: auth.module.ts absent | Claude Code (Step 6b) |
| authStatus | TBD | AUTH_GAP | Phase H: controllers unguarded or routes lacking declaration | Claude Code (Step 6b) |
| tenantCertTier | NONE | TIER_A | Phase I: SK-553 Layer 1 PASS | Claude Code (Step 6c) |
| tenantCertTier | TIER_A | TIER_B | Phase I: repo naming + evidence PNG | Claude Code (Step 6c) |
| tenantCertTier | TIER_B | TIER_C | Phase I: AI Adaptation + visual + R6 + Guard 14 (4/4) | Claude Code (Step 6c) |
| tenantCertTier | TIER_C | TIER_D | Phase I: SK-549 full per-role coverage | Claude Code (Step 6c) |

---

## Hard Rules

- NEVER set ACTIVE without verifying DPO triple minimum first
- NEVER start Phase A for wave > 0 flow without verifying all prerequisites are ACTIVE
- NEVER overwrite ACTIVE status — a flow that is ACTIVE must stay ACTIVE
- NEVER set ACTIVE on partial completion — all task types in the flow must be INJECTED
- If the lifecycle API (GAP-03) doesn't exist, use direct ES curl commands — do NOT skip lifecycle tracking
- NEVER leave portabilityStatus = TBD or authStatus = TBD after Phase F — run Steps 6a/6b (NEW v1.1.0)
- NEVER write tenantCertTier = TIER_C without Guard 14 passing (4/4 auth infra score) — Step 6c enforces (NEW v1.1.0)
- NEVER skip Step 6a/6b/6c for distributable flows — TBD/NONE in the lifecycle index blocks marketplace listing

---

*SK-443 v1.1.0 — flow-lifecycle*
*v1.0.0: PLANNING→INJECTING→GENERATING→INTEGRATING→ACTIVE state machine;*
*Phase A/E CAS writes; prerequisite check; gate event unlock.*
*v1.1.0: portabilityStatus (MOBILE/PARTIAL_GAP/NOT_PORTABLE) — Step 6a Phase G;*
*authStatus (AUTH_READY/AUTH_DEFERRED/AUTH_GAP) — Step 6b Phase H;*
*tenantCertTier (TIER_A/B/C/D) — Step 6c Phase I with Guard 14 enforcement;*
*ES document format extended; transition rules table extended; Hard Rules 6-8 added.*
*Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 23.*