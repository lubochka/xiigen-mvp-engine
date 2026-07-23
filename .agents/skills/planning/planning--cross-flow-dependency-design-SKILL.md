---
name: cross-flow-dependency-design
sk_number: SK-463
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  Determines how many cross-flow dependency documents to register in Phase F
  and which structure to use. Two patterns: POINT_TO_POINT (N documents, one per
  emitting task type) vs WAVE_GATE (1 document, flow-completion unlocks parallel
  wave). BUG-3 canonical failure: FLOW-01's 3-event pattern misapplied to FLOW-02.
  Distinct from CROSS_FLOW_TRACE (SK-441) which simulates invariant violations —
  this skill designs the dependency structure before session files are written.
triggers:
  - "cross-flow"
  - "Phase F"
  - "event registration"
  - "point-to-point"
  - "wave gate"
  - "how many events to register"
  - "BUG-3"
  - "cross-flow dependency"
---

# Cross-Flow Dependency Design Skill (SK-463) v1.0

## THE DECISION RULE

```
Q1: Does each emitting task type in this flow have exactly ONE specific
    downstream task type that consumes its output?
    YES → POINT_TO_POINT (N documents)

Q2: Does this flow's COMPLETION unlock multiple downstream flows simultaneously?
    YES → WAVE_GATE (1 document)

Q3: Both apply (some task types point-to-point + one wave gate completion)?
    YES → register both independently
```

---

## PATTERN A — POINT_TO_POINT

**ES document per pairing:**
```json
{
  "dependencyId": "FLOW-01-T47-to-FLOW-02-T50",
  "sourceFlow": "FLOW-01",
  "sourceTaskType": "T47",
  "sourceEvent": "UserRegistrationInitiated",
  "targetFlow": "FLOW-02",
  "targetTaskType": "T50",
  "dependencyType": "POINT_TO_POINT",
  "requiredStatus": "COMPLETE",
  "registeredAt": "[timestamp]"
}
```

**Phase F registration (FLOW-01 example — 3 documents):**
```bash
for DEP in \
  '{"sourceTaskType":"T47","sourceEvent":"UserRegistrationInitiated","targetFlow":"FLOW-02","targetTaskType":"T50"}' \
  '{"sourceTaskType":"T48","sourceEvent":"EmailVerified","targetFlow":"FLOW-02","targetTaskType":"T51"}' \
  '{"sourceTaskType":"T49","sourceEvent":"OnboardingDelivered","targetFlow":"FLOW-02","targetTaskType":"T52"}'; do
  curl -X POST localhost:9200/xiigen-cross-flow-deps/_doc \
    -H "Content-Type: application/json" \
    -d "$(echo ${DEP} | jq '. + {"sourceFlow":"FLOW-01","dependencyType":"POINT_TO_POINT","requiredStatus":"COMPLETE"}')"
done
```

**Phase F gate check:**
```bash
COUNT=$(curl -sf "localhost:9200/xiigen-cross-flow-deps/_count" \
  -d '{"query":{"term":{"sourceFlow.keyword":"FLOW-01"}}}' | jq .count)
echo "FLOW-01 cross-flow deps: ${COUNT} (expected: 3)"
# 0 = Phase F incomplete; do not claim FLOW-01 ACTIVE
```

---

## PATTERN B — WAVE_GATE

**ES document (1 document total):**
```json
{
  "dependencyId": "FLOW-02-wave-gate-to-wave2",
  "sourceFlow": "FLOW-02",
  "sourceTaskType": "T52",
  "sourceEvent": "OnboardingCompleted",
  "targetWave": "WAVE-2",
  "targetFlows": ["FLOW-03","FLOW-04","FLOW-05","FLOW-06","FLOW-07"],
  "dependencyType": "WAVE_GATE",
  "requiredStatus": "ACTIVE",
  "registeredAt": "[timestamp]"
}
```

**Phase F registration (FLOW-02 example — 1 document):**
```bash
curl -X POST localhost:9200/xiigen-cross-flow-deps/_doc \
  -H "Content-Type: application/json" \
  -d '{
    "dependencyId":"FLOW-02-wave-gate-to-wave2",
    "sourceFlow":"FLOW-02","sourceTaskType":"T52",
    "sourceEvent":"OnboardingCompleted",
    "targetWave":"WAVE-2",
    "targetFlows":["FLOW-03","FLOW-04","FLOW-05","FLOW-06","FLOW-07"],
    "dependencyType":"WAVE_GATE","requiredStatus":"ACTIVE"
  }'
```

**Phase F gate check:**
```bash
COUNT=$(curl -sf "localhost:9200/xiigen-cross-flow-deps/_count" \
  -d '{"query":{"bool":{"filter":[
    {"term":{"sourceFlow.keyword":"FLOW-02"}},
    {"term":{"dependencyType.keyword":"WAVE_GATE"}}
  ]}}}' | jq .count)
echo "FLOW-02 wave gate: ${COUNT} (expected: 1)"
# 0 = incomplete; 3 = BUG-3 applied wrong pattern
```

---

## BUG-3 DETECTION AND FIX

```bash
# Detect: FLOW-02 incorrectly using POINT_TO_POINT
curl -sf "localhost:9200/xiigen-cross-flow-deps/_count" \
  -d '{"query":{"bool":{"filter":[
    {"term":{"sourceFlow.keyword":"FLOW-02"}},
    {"term":{"dependencyType.keyword":"POINT_TO_POINT"}}
  ]}}}' | jq .count
# Expected: 0 for FLOW-02

# Fix: delete wrong docs, register WAVE_GATE
curl -X POST "localhost:9200/xiigen-cross-flow-deps/_delete_by_query" \
  -H "Content-Type: application/json" \
  -d '{"query":{"bool":{"filter":[
    {"term":{"sourceFlow.keyword":"FLOW-02"}},
    {"term":{"dependencyType.keyword":"POINT_TO_POINT"}}
  ]}}}'
# Then register the WAVE_GATE document above
```

---

## REFERENCE TABLE (FLOW-01 through FLOW-09)

| Flow | Pattern | Count | Note |
|------|---------|-------|------|
| FLOW-01 | POINT_TO_POINT | 3 | T47→T50, T48→T51, T49→T52 |
| FLOW-02 | WAVE_GATE | 1 | T52.OnboardingCompleted → WAVE-2 |
| FLOW-03 | POINT_TO_POINT | 1 | T62→FLOW-09 EventAnalytics |
| FLOW-04..07 | TBD | — | Derive from task type contracts at planning time |
| FLOW-09 | Terminal | 0 | No downstream flow |

---

## INTEGRATION

```
Invoke during:  Phase F session file authoring
Reads from:     Task type contracts — which events each type emits
                planning--wave-assignment-SKILL.md (SK-455) — confirm wave structure
Produces:       Phase F bash commands + gate check commands
References:     planning--simulation-protocol-SKILL.md (SK-441) CROSS_FLOW_TRACE —
                simulate invariants after registration (different operation from design)
Supersedes:     BUG-3 manual fix in PHASE-THREE-PREPARATION-GUIDE
```
