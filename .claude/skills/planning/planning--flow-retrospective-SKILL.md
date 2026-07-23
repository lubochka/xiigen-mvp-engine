---
name: flow-retrospective
sk_number: SK-464
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  The R-1 retrospective runs after all sequential flows complete and before any
  parallel wave begins. Measures four dimensions against predictions. Produces
  calibration adjustments for difficulty prediction (SK-461), named checks (Z-3),
  and intake prompts (O-2/O-3). Wave 2 must NOT begin until R-1 is complete —
  calibration errors compound across 6 parallel flows with no human intervention.
  Without this skill, R-1 is either skipped or conducted informally with no
  structural enforcement.
triggers:
  - "R-1"
  - "retrospective"
  - "before Wave 2"
  - "calibration"
  - "Wave 2 gate"
  - "cycle prediction accuracy"
  - "pattern transfer rate"
  - "MAE"
  - "recalibrate"
  - "wave pre-allocation"
---

# Flow Retrospective Skill (SK-464) v1.0

## WHEN TO RUN

R-1 runs AFTER the last sequential flow is ACTIVE and BEFORE Wave 2 parallel
execution begins. This is a hard gate — Wave 2 does not start until R-1 is recorded.

```
Sequential:  FLOW-01 → FLOW-02 → FLOW-03 → [optional FLOW-04]
             ↓
             R-1 runs here (covers all sequential flows)
             ↓
Wave 2 pre-allocation → FLOW-04..09 parallel
```

If FLOW-04 completes before Wave 2 starts: extend R-1 to include T63..T66.

---

## FOUR MEASUREMENT DIMENSIONS

### Dimension 1 — Cycle count accuracy

```bash
echo "=== Actual vs Predicted cycle counts ==="
for TT in T47 T48 T49 T50 T51 T52 T59 T60 T61 T62; do
  ACTUAL=$(curl -sf "localhost:9200/xiigen-training-data/_search" \
    -H "Content-Type: application/json" \
    -d "{\"query\":{\"term\":{\"taskTypeId.keyword\":\"${TT}\"}},\"_source\":[\"cyclesUsed\"],\"size\":1}" \
    | jq '.hits.hits[0]._source.cyclesUsed // "no data"')
  echo "${TT}: actual=${ACTUAL}"
done
# Predictions: T47:2 T48:2 T49:1 | T50:2 T51:3 T52:2 | T59:1 T60:3 T61:2 T62:2
```

**MAE calculation:**
```bash
python3 -c "
predicted = {'T47':2,'T48':2,'T49':1,'T50':2,'T51':3,'T52':2,'T59':1,'T60':3,'T61':2,'T62':2}
actual = {}  # fill from query above
errors = [abs(predicted[t] - actual[t]) for t in actual if t in predicted]
mae = sum(errors)/len(errors) if errors else 0
print(f'MAE: {mae:.2f}')
print('ACTION: Recalibrate novelty factor weights' if mae > 1.0 else 'Calibration acceptable')
"
```

**Threshold:** MAE > 1.0 → recalibrate difficulty prediction novelty factor weights before Wave 2.

---

### Dimension 2 — Pattern transfer rate

```bash
PATTERN_COUNT=$(curl -sf "localhost:9200/xiigen-rag-patterns/_count" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"patternType.keyword":"ARCH_PATTERN"}}}' | jq '.count')
echo "Arch patterns in RAG: ${PATTERN_COUNT}"
echo "Expected after 3 sequential flows: ~7"
echo "Expected after 4 flows: ~15"
# If count < expected: check Phase E seeding ran for all task types
```

**Threshold:** If pattern count < expected: Phase E seeding did not complete for some flows.
Verify Phase F ran fully before Wave 2. Rerun seeding if needed.

---

### Dimension 3 — DPO triple quality

```bash
TOTAL=$(curl -sf "localhost:9200/xiigen-training-data/_count" | jq '.count')
WITH_PROVIDERS=$(curl -sf "localhost:9200/xiigen-training-data/_count" \
  -H "Content-Type: application/json" \
  -d '{"query":{"exists":{"field":"runtimeContext.fabricProviders"}}}' | jq '.count')
echo "DPO triples: ${TOTAL} total, ${WITH_PROVIDERS} with fabricProviders"
echo "Expected: WITH_PROVIDERS = TOTAL"

# Check for null curriculumTier
NULL_TIER=$(curl -sf "localhost:9200/xiigen-training-data/_count" \
  -H "Content-Type: application/json" \
  -d '{"query":{"bool":{"must_not":{"exists":{"field":"curriculumTier"}}}}}' | jq '.count')
echo "Triples with null curriculumTier: ${NULL_TIER} (expected: 0)"
```

**Threshold:** Any triple with null `fabricProviders`: re-run Z-1.5 gate check before Wave 2.
Any triple with null `curriculumTier`: fix feedback.handler `resolveCurriculumTier()` before Wave 2.

---

### Dimension 4 — Named check accuracy (SILENT_FAILURE detection)

```bash
# Did check variants fire correctly, or did provider-specific checks fail on wrong stack?
curl -sf "localhost:9200/xiigen-training-data/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"bool":{"must":[
    {"range":{"score":{"lt":0.85}}},
    {"exists":{"field":"runtimeContext.fabricProviders"}}
  ]}},"_source":["taskTypeId","score","violations"],"size":10}' \
  | jq '.hits.hits[]._source'
# Review: did the violation match the expected check variant?
# If wrong regex fired for a stack: refine Z-3 check variants before Wave 2

# MACHINE constant SILENT_FAILURE check (for flows with T65 class task types)
curl -sf "localhost:9200/xiigen-training-data/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"taskTypeId.keyword":"T65"}},"_source":["rejected","chosen","score"]}' \
  | jq '.hits.hits[]._source | {
      score,
      rejected_has_config_get: (.rejected | test("config\\.get"; "i")),
      chosen_has_literal: (.chosen | test("const [A-Z_]+ = [0-9]+"; ""))
    }'
# Expected: rejected_has_config_get=true, chosen_has_literal=true
# If rejected_has_config_get=false: machine_constant_no_freedom_config check not active
```

---

## CALIBRATION ADJUSTMENTS

Record findings in `RETROSPECTIVE-FLOW-XX-YY.json` **before Wave 2 pre-allocation begins**.

```json
{
  "retrospectiveId": "R-1-FLOW-01-03",
  "coveredFlows": ["FLOW-01", "FLOW-02", "FLOW-03"],
  "cycleCountMAE": 0.67,
  "patternTransferRate": 7,
  "dpoTripleQuality": {
    "total": 14,
    "withFabricProviders": 14,
    "withCurriculumTier": 14,
    "nullTierCount": 0
  },
  "namedCheckAccuracy": "acceptable",
  "calibrationAdjustments": [
    {
      "target": "difficulty-prediction",
      "adjustment": "T51 budget prediction accurate (3=3). CONVERGENCE baseline confirmed.",
      "action": "no change"
    },
    {
      "target": "Z-3-named-checks",
      "adjustment": "PHP validation regex needs escape correction",
      "action": "update Z-3 check variant before Wave 2"
    }
  ],
  "wave2ClearToProceed": true,
  "recordedAt": "[timestamp]"
}
```

---

## WAVE 2 GATE

Wave 2 pre-allocation (Family/CF range assignment) must not begin until:

```bash
# Check: R-1 file exists
ls RETROSPECTIVE-FLOW-01-*.json || echo "BLOCKING: R-1 not recorded"

# Check: wave2ClearToProceed = true
cat RETROSPECTIVE-FLOW-01-*.json | jq '.wave2ClearToProceed'
# Expected: true

# Check: no blocking calibration adjustments pending
cat RETROSPECTIVE-FLOW-01-*.json | jq '.calibrationAdjustments[] | select(.action != "no change")'
# If any results: resolve those adjustments before Wave 2 allocation
```

If `wave2ClearToProceed` is false: fix blocking adjustments, re-run affected queries,
update the JSON, flip the flag. Do not proceed to Wave 2 allocation with the flag false.

---

## INTEGRATION

```
Invoke:         After last sequential flow ACTIVE, before Wave 2 pre-allocation
Reads from:     planning--difficulty-prediction-SKILL.md (SK-461) — cycle budget predictions
                State from xiigen-training-data, xiigen-rag-patterns ES indices
Produces:       RETROSPECTIVE-FLOW-XX-YY.json — calibrationAdjustments[] + wave2ClearToProceed
Feeds into:     SK-461 novelty factor weights (if MAE > 1.0)
                Z-3 named check variants (if accuracy issue found)
                Wave 2 pre-allocation session (blocked until file exists)
```
