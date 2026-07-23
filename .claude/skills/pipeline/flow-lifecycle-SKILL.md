---
name: flow-lifecycle
sk_number: SK-443
version: "1.0.0"
priority: IMPORTANT
author: luba
updated: "2026-03-23"
description: >
  Protocol for managing lifecycle transitions in the xiigen-lifecycle index:
  Phase A CAS write (PLANNING → INJECTING), Phase E ACTIVE promotion,
  upstream prerequisite check (FLOW-NN must be ACTIVE before FLOW-NN+1 starts),
  and downstream gate-event unlock. Governs all lifecycle state machine transitions.
triggers:
  - "flow lifecycle"
  - "set flow ACTIVE"
  - "lifecycle transition"
  - "phase A lifecycle"
  - "promote to ACTIVE"
  - "check upstream flow"
  - "gate event unlock"
  - "xiigen-lifecycle"
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
PLANNING    → Initial state; flow has been examined but Phase A hasn't started
INJECTING   → Phase A in progress (fixtures being authored + seeded)
GENERATING  → Phase B in progress (AF pipeline running for any task type)
INTEGRATING → Phase D in progress (NestJS wiring + tests)
ACTIVE      → Phase E complete; all task types INJECTED; DPO minimum met
FAILED      → Any phase produced an unrecoverable error (manual intervention required)
HELD        → Phase B run scored < 0.60 and checkpoint_report was triggered
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
  "completedAt": "2026-03-23T16:00:00Z"
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

| From | To | Condition | Who initiates |
|------|----|-----------|---------------|
| (none) | INJECTING | Phase A starts | Claude Code (this skill) |
| INJECTING | GENERATING | First AF pipeline run | Claude Code or GenericNodeExecutor |
| GENERATING | HELD | score < 0.60 on any run | GenericNodeExecutor auto |
| HELD | GENERATING | Human approves retry | Manual |
| GENERATING | INTEGRATING | All task types >= 0.70 | Claude Code |
| INTEGRATING | ACTIVE | Phase E gate passes | Claude Code (this skill) |
| any | FAILED | Unrecoverable error | Claude Code |

---

## Hard Rules

- NEVER set ACTIVE without verifying DPO triple minimum first
- NEVER start Phase A for wave > 0 flow without verifying all prerequisites are ACTIVE
- NEVER overwrite ACTIVE status — a flow that is ACTIVE must stay ACTIVE
- NEVER set ACTIVE on partial completion — all task types in the flow must be INJECTED
- If the lifecycle API (GAP-03) doesn't exist, use direct ES curl commands — do NOT skip lifecycle tracking
