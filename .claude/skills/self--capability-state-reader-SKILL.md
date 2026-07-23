---
name: capability-state-reader
sk_number: SK-505
version: "1.0.0"
priority: HIGH
load_order: -2
category: self
layer: engine-self-awareness
author: luba
updated: "2026-03-26"
contexts: ["claude-code", "web-session"]
description: >
  Queries the engine's own capability manifest before any session begins.
  Reports: which fabric interfaces have active providers, which named checks
  are installed, which flows are ACTIVE, and what is MISSING or PENDING.
  This is the zeroth step of any SELF-EXTENSION session — the engine cannot
  plan its own extension without first knowing its current state.
triggers:
  - "what can the engine do"
  - "what is missing"
  - "capability audit"
  - "what fabric interfaces exist"
  - "engine state before planning"
  - "self-extension session start"
  - "capability manifest"
---

# Capability State Reader Skill (SK-505)

## WHAT THIS SKILL PREVENTS

Starting a session to build IMessagingService when it was already built in a
prior session. Starting a session to design FLOW-05 without knowing that
IFeedService is missing and FLOW-05 requires it. Planning a self-extension
flow without a baseline of what already works.

---

## STEP 1 — QUERY FABRIC INTERFACE REGISTRY

```bash
# List all fabric interfaces with their provider status
curl -sf "localhost:9200/xiigen-capability-manifest/_search" \
  -d '{"query":{"term":{"type.keyword":"FABRIC_INTERFACE"}},"size":50}' \
  | jq '.hits.hits[]._source | {
      interface: .interfaceId,
      status: .status,
      provider: .activeProvider,
      firstUsedBy: .firstUsedByFlow
    }'
# status values: ACTIVE | STUB | MISSING
```

---

## STEP 2 — QUERY NAMED CHECK REGISTRY

```bash
# List all named checks with their installation status
curl -sf "localhost:9200/xiigen-capability-manifest/_search" \
  -d '{"query":{"term":{"type.keyword":"NAMED_CHECK"}},"size":100}' \
  | jq '.hits.hits[]._source | {
      checkId: .checkId,
      severity: .severity,
      installedIn: .installedInContracts,
      status: .status
    }'
```

---

## STEP 3 — QUERY FLOW STATUS

```bash
# List all flows with current status
curl -sf "localhost:9200/xiigen-flow-lifecycle/_search" \
  -d '{"size":50,"sort":[{"flowId.keyword":"asc"}]}' \
  | jq '.hits.hits[]._source | {flowId, status, wave, lastPhase}'
# status: PENDING | PHASE_A | PHASE_B | PHASE_C | PHASE_D | PHASE_E | PHASE_F | ACTIVE
```

---

## STEP 4 — PRODUCE CAPABILITY SNAPSHOT

```markdown
## CAPABILITY SNAPSHOT — [timestamp]

## FABRIC INTERFACES
| Interface | Status | Provider | Used by |
|-----------|--------|----------|---------|
| IMessagingService | ✅ ACTIVE | WhatsAppProvider | FLOW-01 |
| IFeedService | ⚠️ STUB | InMemoryFeedProvider | FLOW-05 (stub only) |
| IMLService | ❌ MISSING | — | Required by FLOW-07 |

## NAMED CHECKS
| Check | Severity | Status | Installed in |
|-------|----------|--------|--------------|
| machine_constant_no_freedom_config | score-0 | ✅ T47,T48,T49 | FLOW-01..04 |
| scoring_weights_from_freedom_config | score-0 | ❌ MISSING | Required before FLOW-05 |

## FLOW STATUS
| Flow | Wave | Status |
|------|------|--------|
| FLOW-01 | 0 | ✅ ACTIVE |
| FLOW-05 | 1 | ⏳ PENDING — blocked: IFeedService STUB only |

## BLOCKERS DETECTED: [N]
```

---

## WHEN TO RUN

At the start of every SELF-EXTENSION session (SK-509). Also at the start of any
PLANNING session for a new flow — SK-458 (prerequisite-chain) uses the output of
this skill to verify prerequisites are met.
