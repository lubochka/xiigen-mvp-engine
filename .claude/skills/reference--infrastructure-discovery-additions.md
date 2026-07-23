---
name: infrastructure-discovery-additions
version: "1.0.0"
updated: "2026-03-26"
applies_to: pipeline--infrastructure-discovery-SKILL.md
description: >
  Step 0.5 (RAG pattern retrieval before scanning) + Step 1.5 (RAG seeding
  after scan) for infrastructure discovery pipeline.
---



## STEP 0.5 — RAG SEMANTIC READINESS CHECK

Insert between Step 0 and Step 1:

```
### Step 0.5 — RAG Semantic Readiness Check (v1.0.3)

Before reading artifact numbers, verify the RAG can be used semantically.
A RAG that returns 0 results for domain queries is being used as a database.

# Check 1: Does a semantic query return anything?
curl -sf -X POST localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query":"duplicate registration idempotency check before write","topK":3}' \
  | jq '{count: .hits.total.value, topScore: .hits.hits[0]._score}'
# Expected: count >= 1, topScore > 0.7
# If count = 0: RAG not semantically indexed — patterns stored but not embedded
# Fix: re-seed patterns with embedding generation enabled

# Check 2: Are ARTIFACT_RANGE documents present?
RANGES=$(curl -sf "localhost:9200/xiigen-rag-patterns/_count" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"patternType.keyword":"ARTIFACT_RANGE"}}}' | jq .count)
echo "ARTIFACT_RANGE documents: ${RANGES}"
# Expected: >= number of ACTIVE flows
# If 0: artifact registry not in RAG — use CLAUDE.md with caution (may be stale)

# Check 3: Are ARCHITECTURE_DECISION patterns present?
ARCH=$(curl -sf "localhost:9200/xiigen-rag-patterns/_count" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"patternType.keyword":"ARCHITECTURE_DECISION"}}}' | jq .count)
echo "ARCHITECTURE_DECISION patterns: ${ARCH}"
# If 0: no design reasoning captured yet
# Plan: seed retroactively from DECISIONS-LOCKED.md after this session

If RAG semantic check fails:
  → Note in STATE.json as DEFERRED_SEMANTIC_RAG
  → Proceed with structured queries for this session (do not block)
  → Add to session scope: resolve semantic indexing before next planning session
```

---

## STEP 1.5 — ARTIFACT NUMBER RECONCILIATION

Insert after Step 1 (live artifact boundaries):

```
### Step 1.5 — Artifact Number Reconciliation (v1.0.3)

Compare CLAUDE.md claimed numbers against RAG query results.
If they disagree, the RAG query wins. CLAUDE.md is a rendered view, not a source.

# Query RAG for highest assigned task type
HIGHEST_T=$(curl -sf "localhost:9200/xiigen-rag-patterns/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"patternType.keyword":"ARTIFACT_RANGE"}},
       "sort":[{"taskTypes.next.keyword":"desc"}],"size":1}' \
  | jq -r '.hits.hits[0]._source.taskTypes.next // "UNKNOWN"')
echo "RAG next T: ${HIGHEST_T}"

# Compare against CLAUDE.md
CLAUDE_T=$(grep "Next Task Type" CLAUDE.md | grep -oP 'T\d+')
echo "CLAUDE.md next T: ${CLAUDE_T}"

[ "${HIGHEST_T}" != "${CLAUDE_T}" ] && \
  echo "⚠️  MISMATCH — use RAG value (${HIGHEST_T}), queue CLAUDE.md update" || \
  echo "✅ Numbers consistent"

If ARTIFACT_RANGE not yet seeded (RAG returns UNKNOWN):
  → Fall back to live file scan (original Step 1 grep commands)
  → Add to session scope: seed ARTIFACT_RANGE after this session completes
  → Record in STATE.json: "artifact_registry_in_rag": false

The correct next-available numbers are (in priority order):
  1. RAG ARTIFACT_RANGE query (most current)
  2. Live file scan grep (direct but manual)
  3. CLAUDE.md (last resort — may be stale)
```
