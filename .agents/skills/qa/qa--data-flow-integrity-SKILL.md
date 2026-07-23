---
name: data-flow-integrity
sk_number: SK-500
version: "1.0.0"
priority: MEDIUM
load_order: 99
category: qa
layer: product
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Validates that data flows correctly through a chain of generated services:
  the output schema of service N matches the input expectation of service N+1.
  Catches the failure where each service passes its own tests (using complete
  mock data) but the actual chain produces wrong output because a field was
  dropped, renamed, or mistyped mid-chain. Run after any Wave completes.
triggers:
  - "data flow integrity"
  - "field dropped between services"
  - "chain of services"
  - "output schema mismatch"
  - "downstream receives wrong data"
  - "service chain validation"
---

# Data Flow Integrity Skill (SK-500)

## WHAT THIS SKILL PREVENTS

The Onboarding UML failure mode: data flows through Questionnaire → Analytics →
Business → Learning → Matching → Feed → Events → Recommendation. Each service
tests with complete mock data. But in the live chain, if Questionnaire drops
`preferenceVector` from its output, every downstream service receives null where
it expects an array — and all of them produce wrong results while their unit tests
still pass.

---

## STEP 1 — BUILD THE DATA FLOW MAP

For each service chain in the flow (or across flows), document the data contract:

```
Chain: T49 Questionnaire → T_BusinessProfiler → T_RecommendationSeeder

T49 OUTPUT (from contract qualityGates[]):
  {
    memberId:        string,   ← consumed by T_BusinessProfiler
    answers:         Answer[], ← consumed by T_BusinessProfiler
    preferenceVector: number[], ← consumed by T_RecommendationSeeder
    completedAt:     string    ← consumed by T_BusinessProfiler (analytics)
  }

T_BusinessProfiler EXPECTS:
  memberId:        ✅ present in T49 output
  answers:         ✅ present in T49 output
  preferenceVector: ⚠️ not in T49 output schema — CHECK

T_RecommendationSeeder EXPECTS:
  memberId:        ✅
  preferenceVector: ⚠️ same field — must be present
```

---

## STEP 2 — EXTRACT ACTUAL SCHEMAS FROM LIVE SERVICES

Do not trust mock data. Extract from the running services:

```bash
# Get the actual output schema from the last execution of T49
curl -sf "localhost:9200/xiigen-training-data/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"taskTypeId.keyword":"T49"}},"sort":[{"timestamp":"desc"}],"size":1}' \
  | jq '.hits.hits[0]._source.chosen.outputPayload | keys'
# Shows the actual fields T49 produced in the last run

# Get the input schema expected by T_BusinessProfiler
curl -sf "localhost:9200/xiigen-engine-contracts/_doc/T_BusinessProfiler" \
  | jq '._source.inputSchema // ._source.ironRules[] | select(.field != null) | .field'
```

---

## STEP 3 — RUN THE SCHEMA DIFF PER CHAIN STEP

For each (producer, consumer) pair in the chain:

```bash
PRODUCER_FIELDS=$(curl -sf "localhost:9200/xiigen-training-data/_search" \
  -d '{"query":{"term":{"taskTypeId.keyword":"T49"}},"sort":[{"timestamp":"desc"}],"size":1}' \
  | jq -r '.hits.hits[0]._source.chosen.outputPayload | keys[]' | sort)

CONSUMER_EXPECTS=$(curl -sf "localhost:9200/xiigen-engine-contracts/_doc/T_BusinessProfiler" \
  | jq -r '._source.requiredInputFields[]' | sort)

# Find fields consumer expects but producer doesn't provide
comm -13 <(echo "$PRODUCER_FIELDS") <(echo "$CONSUMER_EXPECTS")
# Any output here = DATA INTEGRITY GAP
```

---

## STEP 4 — CLASSIFY EACH GAP

| Gap type | Description | Fix |
|----------|-------------|-----|
| MISSING_FIELD | Producer omits a field the consumer requires | Add to producer output contract; PromptPatch if generated |
| RENAMED_FIELD | Producer uses `userId`, consumer expects `memberId` | Align naming; update one contract |
| TYPE_MISMATCH | Producer emits string, consumer expects number | Fix in producer; add named check |
| NESTED_MISMATCH | Producer flattens, consumer expects nested | Align structure; update contracts |
| OPTIONAL_GAP | Field present sometimes but not always | Add null guard in consumer; update iron rule |

---

## STEP 5 — PRODUCE THE INTEGRITY REPORT

```markdown
## DATA FLOW INTEGRITY REPORT — [Flow/Wave]
## Date: [date]

## CHAIN TESTED
[service 1] → [service 2] → [service 3]

## RESULTS
| Link | Producer field | Consumer expects | Status |
|------|---------------|-----------------|--------|
| T49→T_BusinessProfiler | preferenceVector | preferenceVector | ❌ MISSING |
| T49→T_BusinessProfiler | memberId | memberId | ✅ MATCH |

## GAPS FOUND: [N]
## FIX REQUIRED BEFORE: [wave/phase]
```

---

## ANTI-PATTERNS

```
❌ Trusting unit tests as proof of chain integrity — mocks hide the gaps
❌ Running this only on the first service in the chain
❌ Treating optional fields as "low priority" — null fields in a scoring formula = 0
❌ Running after Wave 2 launches — must run before any parallel flow consumes the output
```
