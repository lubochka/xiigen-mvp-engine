---
name: learning-path-audit
sk_number: SK-467
version: "1.0.0"
priority: HIGH
load_order: 0
category: code-execution
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  The inverse of SK-441 L3. Given the current codebase, what teaching signals
  does today's code actually produce at each signal point? For each signal type,
  states: fires? fields complete? corruption class? Produces the "generating but
  not learning" verdict with specific evidence. A codebase can score 75% on
  static wiring (SK-465) and still produce 100% corrupted training data —
  this skill catches that class of failure. Distinct from SK-441 (forward-looking
  scenario trace) and SK-465 (static code measurement).
triggers:
  - "learning path audit"
  - "generating but not learning"
  - "are DPO triples valid"
  - "what signals does the engine produce"
  - "learning loop working"
  - "training data quality"
  - "audit learning signals"
  - "what is the engine actually learning"
  - "SK-467"
---

# Learning Path Audit Skill (SK-467) v1.0

## THE QUESTION

SK-441 L3 asks: **"If FLOW-01 runs, what learning signals will it produce?"**
(Forward-looking — traces a designed scenario)

SK-467 asks: **"Given today's code, what learning signals does it actually produce?"**
(Backward-looking — inspects current signal handlers and their output)

These are different questions. SK-441 assumes the scenario works and traces what
emerges. SK-467 finds what is broken in the signal path before any scenario runs.

---

## SIGNAL INVENTORY — FIVE TYPES

For each signal type, the audit asks three questions:

```
1. FIRES?       Does the handler actually emit this signal? (yes / no / never)
2. COMPLETE?    Are all required fields present at the call site?
3. CORRUPTION?  What class of corruption exists if the signal fires with wrong data?
```

---

## SIGNAL 1 — DPO_TRIPLE

**Expected:** `feedback.handler` emits after each generation cycle.
Required fields: `chosen.code`, `chosen.model`, `rejected.code`, `rejected.model`,
`prompt.system`, `fabricProviders`, `curriculumTier`, `taskTypeId`, `flowId`.

**Audit commands:**

```bash
# 1. Does it fire? (check for write call)
grep -n "dpoTriple\|createFeedbackRecord\|storeDPO\|xiigen-training-data" \
  server/src/engine/node-handlers/feedback.handler.ts | head -10

# 2. Is prompt.system populated at the call site?
grep -n "systemPrompt\|prompt\.system\|xiigen-prompts" \
  server/src/engine/node-handlers/feedback.handler.ts
# Expected: ES query to xiigen-prompts index by taskTypeId
# If not found: prompt.system = null on ALL triples (BUG-6 class)

# 3. Is fabricProviders populated?
grep -n "resolvedProviders\|fabricProviders" \
  server/src/engine/generic-node-executor.ts
# Expected: ctx.resolvedProviders populated before feedback.handler runs
# If empty: fabricProviders = {} on all triples

# 4. Cross-model check — are chosen and rejected from different models?
grep -n "sameModel\|PENDING_INDEX\|dpo.*valid" server/src/learning/dpo-validation.ts
# Expected: cross-model validation gate routing invalid triples to pending index

# 5. Runtime evidence — count valid triples vs corrupted
VALID=$(curl -sf "localhost:9200/xiigen-training-data/_count" \
  -H "Content-Type: application/json" \
  -d '{"query":{"bool":{"must":[
    {"exists":{"field":"prompt.system"}},
    {"exists":{"field":"runtimeContext.fabricProviders"}},
    {"exists":{"field":"curriculumTier"}}
  ]}}}' | jq .count)
TOTAL=$(curl -sf "localhost:9200/xiigen-training-data/_count" | jq .count)
echo "Valid DPO triples: ${VALID}/${TOTAL}"
```

**Corruption classes:**

| Corruption | Symptom | Impact |
|-----------|---------|--------|
| `prompt.system: null` | Genesis text not fetched from ES | Triple unusable for supervised fine-tuning — 0 graduation progress |
| `fabricProviders: {}` | Provider context absent | Cannot trace which model generated which code |
| `curriculumTier: null` | Tier not assigned | Cannot build curriculum — all 80 triples count as tier 0 |
| `chosen.model === rejected.model` | Same-model DPO | Training on style drift, not quality difference |
| All three corruptions simultaneously | Triple looks valid, is not | Learning loop appears to run but produces 0 usable data |

---

## SIGNAL 2 — ARCH_PATTERN (RAG seeding)

**Expected:** Phase E seeds named patterns from the generation session into `xiigen-rag-patterns`.
Required fields: `patternType: ARCH_PATTERN`, `archetype`, `semanticContent`,
`codeSnippet`, `flowId`, `taskTypeId`.

**Audit commands:**

```bash
# 1. Does Phase E seeding actually run?
grep -n "ARCH_PATTERN\|seedArchPattern\|xiigen-rag-patterns" \
  server/src/engine/node-handlers/feedback.handler.ts
# Also check: sessions/FLOW-XX/SESSION-E.md — does it call the seed endpoint?

# 2. Is semanticContent populated (enables semantic retrieval)?
curl -sf "localhost:9200/xiigen-rag-patterns/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"patternType.keyword":"ARCH_PATTERN"}},"_source":["semanticContent","archetype"],"size":3}' \
  | jq '.hits.hits[]._source'
# If semanticContent is null/absent: IRagService.ingest() not called at seed time
# → vector index empty → semantic retrieval returns 0 results for any query

# 3. Count patterns by flow
curl -sf "localhost:9200/xiigen-rag-patterns/_search" \
  -H "Content-Type: application/json" \
  -d '{"aggs":{"by_flow":{"terms":{"field":"flowId.keyword"}}},"size":0}' \
  | jq '.aggregations.by_flow.buckets'
# Expected: ~2-3 patterns per task type per flow
```

**Corruption class:** ARCH_PATTERN seeded without `semanticContent` = database document, not a RAG pattern. Future flows cannot retrieve it via semantic search — they retrieve it via tag filter only.

---

## SIGNAL 3 — ARBITER_VERDICT

**Expected:** `score.handler` emits one verdict per arbiter role after each evaluation.
Required fields: `role`, `verdict` (APPROVED/BLOCK/PATCH), `score`, `reasoning`,
`taskTypeId`, `flowId`.

**Audit commands:**

```bash
# 1. Does score.handler emit ARBITER_VERDICT signals?
grep -n "ARBITER_VERDICT\|arbiterVerdict\|emitVerdict" \
  server/src/engine/node-handlers/score.handler.ts

# 2. If not: does it emit at all, or compute only?
grep -n "weightedScore\|average\|return.*score" \
  server/src/engine/node-handlers/score.handler.ts | head -10
# If only weighted average: no verdict signals, no per-role training data

# 3. Runtime evidence
VERDICT_COUNT=$(curl -sf "localhost:9200/xiigen-arbiter-verdicts/_count" \
  2>/dev/null | jq .count 2>/dev/null || echo "index absent")
echo "ARBITER_VERDICT records: ${VERDICT_COUNT}"
```

**Corruption class:** No ARBITER_VERDICT = no per-role learning signal. The engine cannot improve individual arbiter accuracy — the only feedback is the aggregate score.

---

## SIGNAL 4 — MODEL_COMPARISON (Shadow run gap scores)

**Expected:** After each generation cycle, record the gap between expensive-model
score and local-model score. Required fields: `taskTypeId`, `gapScore`,
`expensiveModelScore`, `localModelScore`, `archetypeTier`.

**Audit commands:**

```bash
# 1. Are shadow run placeholders seeded?
curl -sf "localhost:9200/xiigen-shadow-runs/_count" | jq .count
# Expected: ≥3 (T47/T48/T49 from bootstrapper)
# 0 = BUG-7 — placeholders not seeded, independence timeline unknown

# 2. Are gap scores being populated as flows run?
curl -sf "localhost:9200/xiigen-shadow-runs/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"exists":{"field":"gapScore"}},"size":3}' \
  | jq '.hits.hits[]._source | {taskTypeId, gapScore, shadowStatus}'
# If all null: shadow runs seeded but never updated (Phase B skips gap score capture)

# 3. Is there code to update shadow runs after local model generates?
grep -rn "gapScore\|shadowStatus\|updateShadowRun" server/src/engine/
```

**Corruption class:** Shadow run placeholders exist but `gapScore` stays null = P21 independence timeline cannot be computed. Graduation date is permanently unknown regardless of how many flows run.

---

## SIGNAL 5 — DESIGN_REASONING (architecture decisions as RAG)

**Expected:** At Gate C planning approval, FLOW-XX-ARCHITECTURE-DECISIONS.json is
seeded to `xiigen-rag-patterns` with `patternType: ARCHITECTURE_DECISION`.

**Audit commands:**

```bash
# 1. Are any ARCHITECTURE_DECISION patterns in RAG?
curl -sf "localhost:9200/xiigen-rag-patterns/_count" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"patternType.keyword":"ARCHITECTURE_DECISION"}}}' | jq .count
# 0 = Gate C process change (SK-450) not yet applied

# 2. Do any FLOW-XX-ARCHITECTURE-DECISIONS.json files exist?
ls sessions/*/FLOW-*-ARCHITECTURE-DECISIONS.json 2>/dev/null \
  || echo "No ARCHITECTURE_DECISIONS files found"
```

**Corruption class:** 0 ARCHITECTURE_DECISION patterns = planning decisions not in training data. The engine's design judgment improves only from code quality, not from architectural reasoning. After 24 flows: code generator is better; designer is unchanged.

---

## THE AUDIT TABLE

Produce after running all five signal audits:

```markdown
## LEARNING PATH AUDIT — [date]

| Signal | Fires? | Fields complete? | Corruption class | Impact |
|--------|--------|-----------------|-----------------|--------|
| DPO_TRIPLE | YES | prompt.system: ❌ fabricProviders: ✅ curriculumTier: ✅ | BUG-6: null prompt.system on all triples | 0/80 valid triples — 0 graduation progress |
| ARCH_PATTERN | YES | semanticContent: ❌ | No vector index — semantic retrieval returns 0 | RAG used as database |
| ARBITER_VERDICT | NO | — | No per-role learning signal at all | Cannot improve individual arbiter accuracy |
| MODEL_COMPARISON | PARTIAL | gapScore: ❌ (null) | Shadow runs seeded, never updated | Independence timeline unknown |
| DESIGN_REASONING | NO | — | 0 architectural decisions as training data | Designer capability unchanged after 24 flows |

VERDICT: Generating but not learning.
Root cause: Three disconnections (prompt.system, semantic ingest, shadow run update)
Fix path: Group A session (prompt.system + RAG tracker + shadow run update)
```

---

## VERDICT CLASSIFICATION

```
All signals fire + all fields complete              → LEARNING (proceed to flow execution)
All signals fire + 1–2 field gaps                  → PARTIAL LEARNING (fix gaps before Wave 2)
1–2 signals not firing                             → GENERATING BUT NOT LEARNING (fix before any execution)
3+ signals not firing OR prompt.system null on all → STRUCTURAL LEARNING FAILURE (fix before Phase B)
```

---

## INTEGRATION

```
Invoke at:    Start of any capability audit session (alongside SK-465)
              After any Group fix session that touches signal handlers
Produces:     Learning path audit table + VERDICT + root cause + fix path
Feeds into:   planning--remediation-session-design-SKILL.md (SK-466) for learning gaps
References:   session-output--mission-progress-SKILL.md (SK-445) — paired runtime queries
              code-execution--capability-measurement-SKILL.md (SK-465) — static scoring
Distinct from: planning--simulation-protocol-SKILL.md (SK-441) L3 — forward-looking;
              this is backward-looking against current code
```
