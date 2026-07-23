---
name: dpo-training-data
sk_number: SK-444
version: "1.0.0"
priority: IMPORTANT
author: luba
updated: "2026-03-23"
description: >
  Protocol for verifying, capturing, and exporting DPO (Direct Preference Optimization)
  training triples in the xiigen engine. Defines the full DPO triple format (6 fields),
  where each field comes from in the run trace, the minimum triple count per flow,
  fine-tuning export format, and Phase E verification commands.
  GAP-08 describes the current incomplete format; this skill documents the correct one.
triggers:
  - "DPO triple"
  - "training data"
  - "dpo_triple_id"
  - "Phase E DPO"
  - "verify DPO"
  - "fine-tuning export"
  - "dpoTriples count"
  - "xiigen-training-data"
---

# dpo-training-data

## Purpose

Every Phase B improvement cycle that results in a score >= 0.85 after starting below 0.85
generates a DPO triple. These triples are the training signal that teaches the engine's
local model to prefer correct code over incorrect code.

Without this skill, triples are either not captured (GAP-08 incomplete format) or captured
in a format that can't be used for fine-tuning. Phase E gate requires verifying minimum counts.

---

## When to Invoke

- Auto-fire at Phase E to verify minimum DPO triple count before ACTIVE promotion
- Reference during Phase B trace reading (n8 node: `dpo_triple_id` field)
- Reference when feedback.handler is being implemented or debugged

---

## Full DPO Triple Format

Each triple is stored as one document in `xiigen-training-data` ES index:

```json
{
  "tripleId": "dpo-{flowId}-{taskTypeId}-{runId}",
  "flowId": "FLOW-01",
  "taskTypeId": "T47",
  "runId": "run-FLOW01-T47-003",
  "capturedAt": "2026-03-23T14:00:00Z",
  "promptVersion": "1.2.0",

  "context": {
    "prompt_system": "FULL genesis prompt content used in n1",
    "ragPatterns": [
      {
        "patternId": "F174-IAuthenticationService-sso-registration",
        "content": "full RAG pattern document content"
      }
    ],
    "planSteps": ["register", "checkDuplicate", "generateVerificationToken", "persistAndEmit"],
    "taskContract": {
      "taskTypeId": "T47",
      "ironRules": ["IR-1", "IR-2", "IR-3", "IR-4", "IR-5", "IR-6"]
    }
  },

  "rejected": {
    "code": "FULL generated code from the cycle that scored < 0.85",
    "score": 0.74,
    "violations": [
      { "type": "iron_rule", "id": "IR-3", "message": "hardcoded TTL found: const TOKEN_TTL = 86400" },
      { "type": "arbiter", "id": "FLOW-01-routing-auth-security-001", "message": "missing @Throttle decorator" }
    ]
  },

  "chosen": {
    "code": "FULL generated code from the cycle that scored >= 0.85",
    "score": 0.87,
    "violations": []
  }
}
```

**6 mandatory fields:** `context` (with 4 subfields), `rejected` (with violations list), `chosen`

---

## Where Each Field Comes From

| Field | Source node | What to read |
|-------|------------|-------------|
| `context.prompt_system` | n1 output | `result.prompts[0].content` (genesis prompt) |
| `context.ragPatterns` | n2 output | `result.patterns[]` (full pattern documents, not just IDs) |
| `context.planSteps` | n3 output | `result.steps[]` (method names from decompose) |
| `context.taskContract` | Run input | The contract fixture for this task type |
| `rejected.code` | n4 output | `result.generated_code` from the failing cycle |
| `rejected.score` | n7 output | `result.score` from the failing cycle |
| `rejected.violations` | n5+n6 output | DNA failures + iron rule failures + arbiter failures |
| `chosen.code` | n4 output | `result.generated_code` from the PASSING cycle |
| `chosen.score` | n7 output | `result.score` from the PASSING cycle |
| `chosen.violations` | n5+n6 output | Empty array (all checks passed) |

**Critical:** If the context fields are missing (GAP-08 not resolved), the triple cannot be
used for fine-tuning. The rejected/chosen code alone is insufficient — the model needs to
know what prompt produced which code.

---

## When a Triple is Generated

A triple is captured when **both** of these are true:
1. A previous run for this task type scored < 0.85
2. The current run scored >= 0.85

The `feedback.handler` (n8) is responsible for capturing this automatically.

**Manual check:** If `n8.dpo_triple_id == null` after a score improvement, GAP-08 is active.
In this case, manually construct and index the triple using the trace data.

---

## Minimum Triple Count per Flow

| Flow | Min DPO triples | Why |
|------|----------------|-----|
| FLOW-01 | 3 | 3 task types, 1 triple each minimum |
| FLOW-02 | 3 | T51 convergence likely needs 2 cycles — T50/T52 may pass on cycle 1 |
| Future flows | 1 per task type | Every task type should have at least 1 rejected/chosen pair |

---

## Phase E Verification

```bash
# Count triples for this flow
FLOW_ID="FLOW-01"
DPO_COUNT=$(curl -sf "http://localhost:9200/xiigen-training-data/_count?q=flowId:${FLOW_ID}" \
  | jq '.count')

echo "DPO triples for ${FLOW_ID}: ${DPO_COUNT}"
# Expected: >= 3 for FLOW-01

# Verify each triple has context (not just rejected/chosen)
curl -sf "http://localhost:9200/xiigen-training-data/_search?q=flowId:${FLOW_ID}" \
  | jq '.hits.hits[]._source | {tripleId, hasContext: (.context.prompt_system != null), promptVersion}'

# All should show: hasContext: true
```

If `hasContext: false`:
```bash
# GAP-08 is active — re-index with full context
# 1. Get the run traces for the failing and passing runs
curl -sf "http://localhost:9200/xiigen-run-traces/_search?q=taskTypeId:T47" \
  | jq '.hits.hits[]._source | {runId, score: .n7.score}'

# 2. Identify the failing run (score < 0.85) and passing run (score >= 0.85)
# 3. Construct the triple manually and index it:
curl -sf -X PUT "http://localhost:9200/xiigen-training-data/_doc/dpo-${FLOW_ID}-T47-manual" \
  -H "Content-Type: application/json" \
  -d '{ ...full triple document... }'
```

---

## Fine-Tuning Export

When exporting for fine-tuning (JSONL format, one triple per line):

```bash
curl -sf "http://localhost:9200/xiigen-training-data/_search?size=1000" \
  | jq -c '.hits.hits[]._source | {
      messages: [
        { role: "system", content: .context.prompt_system },
        { role: "user", content: ("Generate service code for: " + .taskTypeId) }
      ],
      chosen: .chosen.code,
      rejected: .rejected.code
    }' > xiigen-dpo-training.jsonl

echo "Exported $(wc -l < xiigen-dpo-training.jsonl) training triples"
```

---

## Hard Rules

- NEVER mark Phase E as ACTIVE with fewer triples than the flow's minimum
- NEVER index a triple without `context.prompt_system` — it cannot be used for fine-tuning
- NEVER create a triple where `chosen.score < rejected.score` — the chosen must be better
- NEVER create a triple from two runs with the same prompt version — the improvement must come from a prompt change
- If `dpo_triple_id: null` in n8 trace after a score improvement: GAP-08 is active — capture manually
