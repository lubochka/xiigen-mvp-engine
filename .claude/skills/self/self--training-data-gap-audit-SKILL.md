---
name: training-data-gap-audit
sk_number: SK-508
version: "1.0.0"
priority: MEDIUM
load_order: 99
category: self
layer: engine-self-awareness
author: luba
updated: "2026-03-26"
contexts: ["claude-code"]
description: >
  After a capability gap is closed (SK-507), audits DPO triples generated during
  the window when the capability was missing. Determines which triples are
  recoverable (re-runnable for valid triples), which should be promoted to
  MONO_MODEL_CALIBRATION, and which must be deleted. Prevents contaminated
  triples from persisting in the training corpus indefinitely.
triggers:
  - "training data from when capability was missing"
  - "contaminated triples"
  - "gap window training data"
  - "recover DPO triples"
  - "triples generated without dependency"
  - "INVALID_MISSING_DEPENDENCY triples"
---

# Training Data Gap Audit Skill (SK-508)

## WHAT THIS SKILL PREVENTS

The graduation threshold counts `countsTowardThreshold: true` triples. If 15 of
the 80 needed triples were generated during a window when IFeedService was STUB
(not ACTIVE), they may encode incomplete feed integration patterns. Left in the
corpus, they teach the local model a partial implementation as if it were complete.
The fine-tuning corpus permanently contains wrong patterns from those 15 triples.

---

## STEP 1 — FIND THE GAP WINDOW

```bash
# Find when the capability was first STUB and when it became ACTIVE
curl -sf "localhost:9200/xiigen-capability-manifest/_doc/IFeedService" \
  | jq '{stubSince: ._source.stubSince, activeSince: ._source.activeSince}'

# GAP_START = stubSince (or service creation date if not tracked)
# GAP_END   = activeSince
```

---

## STEP 2 — FIND TRIPLES IN THE GAP WINDOW

```bash
GAP_START="2026-03-20T00:00:00Z"
GAP_END="2026-03-26T00:00:00Z"

curl -sf "localhost:9200/xiigen-training-data/_search" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": {\"bool\": {\"must\": [
      {\"range\": {\"timestamp\": {\"gte\": \"$GAP_START\", \"lt\": \"$GAP_END\"}}},
      {\"terms\": {\"taskTypeId.keyword\": [\"T_PostOrchestrator\",\"T_FeedInserter\"]}}
    ]}},
    \"size\": 100
  }" | jq '[.hits.hits[]._source | {id: ._id, taskTypeId, score, curriculumTier, countsTowardThreshold}]'
```

---

## STEP 3 — CLASSIFY EACH TRIPLE

For each triple in the gap window, apply this classification:

| Class | Condition | Action |
|-------|-----------|--------|
| RECOVERABLE | Chosen code doesn't use the missing capability's methods | Promote to valid — capability gap didn't affect the code |
| CONTAMINATED | Chosen code calls a stub method (returns mock data) | Delete — teaches wrong integration pattern |
| CALIBRATION | Chosen code would need rewrite with real capability | Tag as MONO_MODEL_CALIBRATION, countsTowardThreshold: false |

```bash
# Check chosen code for stub method calls
echo $TRIPLE | jq '.chosen.code' | grep -E "InMemoryFeedProvider|mockFeed|stub" | wc -l
# > 0 → CONTAMINATED
# = 0 → may be RECOVERABLE — check further
```

---

## STEP 4 — EXECUTE REMEDIATION

```bash
# Delete contaminated triples
for ID in $CONTAMINATED_IDS; do
  curl -X DELETE "localhost:9200/xiigen-training-data/_doc/$ID" | jq .result
done

# Tag calibration triples
for ID in $CALIBRATION_IDS; do
  curl -X POST "localhost:9200/xiigen-training-data/_update/$ID" \
    -d '{"doc":{"countsTowardThreshold":false,"trainingDataQuality":"MONO_MODEL_CALIBRATION","gapWindowContamination":true}}'
done

# Verify clean count
curl -sf "localhost:9200/xiigen-training-data/_count" \
  -d '{"query":{"term":{"countsTowardThreshold":true}}}' | jq '.count'
```

---

## STEP 5 — SCHEDULE RE-RUNS

For RECOVERABLE and CALIBRATION triples, schedule a re-run with the capability now ACTIVE:

```bash
# Mark task types for re-run now that capability is active
for TT in T_PostOrchestrator T_FeedInserter; do
  curl -X POST "localhost:9200/xiigen-rerun-queue/_doc" \
    -d "{\"taskTypeId\":\"$TT\",\"reason\":\"GAP_CLOSED_IFeedService\",\"priority\":\"HIGH\"}"
done
```
