---
name: flow-design-rag-seeds
version: "2.0.0"
priority: HIGH
category: code-execution
author: luba
updated: "2026-03-25"
description: >
  10 FLOW_DESIGN RAG patterns to seed in Phase A of FLOW-37 and FLOW-38. These
  patterns teach the engine how to design topologies correctly. AF-4 retrieves
  them during topology generation; FLOW-38G adds new patterns when design flaws
  accumulate.
triggers:
  - "FLOW_DESIGN patterns"
  - "RAG seeding"
  - "Phase A patterns"
  - "topology design patterns"
---

# Flow Design RAG Seeds v1.0

## WHEN TO INVOKE

**Claude Code:** During Phase A of FLOW-37 or FLOW-38, when seeding
FLOW_DESIGN patterns to xiigen-rag-patterns. Use the exact pattern format
below. Seed 5 patterns in FLOW-37 Phase A, 5 more in FLOW-38 Phase A.

---

## PATTERN FORMAT

```json
{
  "patternId": "flow-design::{concept}",
  "patternType": "FLOW_DESIGN",
  "tier": "SEED",
  "content": "...",
  "qualityScore": 0.70,
  "qualityDataPoints": 0,
  "usageCount": 0,
  "createdBy": "FLOW-37-Phase-A",
  "timestamp": "${now}"
}
```

**Tier progression:**
- `SEED` — Initial pattern from Phase A
- `TESTED` — Pattern used in 5+ runs with OUTCOME signals
- `PROVEN_SOLUTION` — Promoted by DpoToRagPromoter (3+ teachingPoints)

---

## FLOW-37 PHASE A SEEDS (5 patterns)

### Pattern 1: flow-vs-service
```json
{
  "patternId": "flow-design::flow-vs-service",
  "patternType": "FLOW_DESIGN",
  "tier": "SEED",
  "content": "DECISION: FLOW or SERVICE?\n\nApply Q1-Q4 in order:\n\nQ1: Will output quality improve with more data?\n  YES → FLOW (ai-generate.handler + PromptOps)\n  NO  → continue\n\nQ2: Does this branch on conditions that change per tenant/time?\n  YES → FLOW (route.handler + FREEDOM config)\n  NO  → continue\n\nQ3: Should this appear in flow registry as traceable execution?\n  YES → FLOW\n  NO  → continue\n\nQ4: Is this on the bootstrap list?\n  YES → MANUAL acceptable (Phase A only)\n  NO  → FLOW (default)\n\nIf Q1/Q2/Q3 = YES: the capability is a FLOW.\nIf only Q4 = YES: manual TypeScript is acceptable.\nIf all NO: genuine utility — TypeScript is fine (rare).",
  "qualityScore": 0.70,
  "qualityDataPoints": 0,
  "usageCount": 0,
  "createdBy": "FLOW-37-Phase-A"
}
```

### Pattern 2: bootstrap-boundary
```json
{
  "patternId": "flow-design::bootstrap-boundary",
  "patternType": "FLOW_DESIGN",
  "tier": "SEED",
  "content": "EXHAUSTIVE BOOTSTRAP LIST — Manual TypeScript acceptable ONLY for:\n\n1. GenericNodeExecutor — executes flow nodes, cannot be a flow node itself\n2. AF-1 through AF-11 station handlers — AF pipeline cannot build itself\n3. ES index creation (curl -X PUT) — indices must exist before flows store to them\n4. Topology JSON parser — must exist before topology files can be read\n5. Phase requirement document seeding — phase-capability-gate reads this\n6. FLOW_DESIGN RAG pattern seeding — must precede flows that retrieve them\n7. Bootstrap boundary skill itself — the skill that explains the rule\n\nThis list is EXHAUSTIVE. It does not grow without a new locked decision.\n\nIf a capability is not on this list, it MUST be a flow topology.",
  "qualityScore": 0.70,
  "qualityDataPoints": 0,
  "usageCount": 0,
  "createdBy": "FLOW-37-Phase-A"
}
```

### Pattern 3: routing-in-route-handler
```json
{
  "patternId": "flow-design::routing-in-route-handler",
  "patternType": "FLOW_DESIGN",
  "tier": "SEED",
  "content": "ANTI-PATTERN: if/else in node logic\n\nWRONG:\n  if (score >= 85) { return 'pass'; }\n  else if (score >= 65) { return 'prompt-patch'; }\n  else { return 'fail'; }\n\nCORRECT:\n  Use route.handler with branches:\n  {\n    \"handler\": \"route.handler\",\n    \"condition\": \"${n-score.value}\",\n    \"branches\": {\n      \">=85\": \"n-pass\",\n      \">=65\": \"n-prompt-patch\",\n      \"default\": \"n-fail\"\n    }\n  }\n\nWHY: route.handler branches are visible in the topology graph,\nconfigurable via FREEDOM, and testable as separate paths.\nif/else in node logic hides branching inside implementation.",
  "qualityScore": 0.70,
  "qualityDataPoints": 0,
  "usageCount": 0,
  "createdBy": "FLOW-37-Phase-A"
}
```

### Pattern 4: self-questioning-required
```json
{
  "patternId": "flow-design::self-questioning-required",
  "patternType": "FLOW_DESIGN",
  "tier": "SEED",
  "content": "RULE: Every ai-generate.handler producing a design artifact MUST include QUESTION YOURSELF.\n\nPrompt structure:\n  [SYSTEM PROMPT]\n  [RAG CONTEXT]\n  [IRON RULES]\n  [QUESTION YOURSELF]\n    After generating your output, you MUST:\n    1. Ask yourself at least 3 questions that could reveal flaws\n    2. Answer each question honestly\n    3. If any answer reveals a flaw, modify the output before returning\n\n  [OUTPUT FORMAT]\n    {\n      \"artifact\": {...},\n      \"selfQuestions\": [\"...\", \"...\", \"...\"],\n      \"answers\": [\"...\", \"...\", \"...\"],\n      \"modificationsFromQuestioning\": []\n    }\n\nVALIDATION: SELF-Q-001 (3+ questions), SELF-Q-003 (modifications if flaw found)",
  "qualityScore": 0.70,
  "qualityDataPoints": 0,
  "usageCount": 0,
  "createdBy": "FLOW-37-Phase-A"
}
```

### Pattern 5: dual-format-skills
```json
{
  "patternId": "flow-design::dual-format-skills",
  "patternType": "FLOW_DESIGN",
  "tier": "SEED",
  "content": "RULE: Skills exist in two formats — both are required.\n\n1. MARKDOWN FILE (.md)\n   Location: skills/{category}--{name}-SKILL.md\n   Used by: Claude Code loading skills in web/IDE sessions\n   Content: Full prose, examples, anti-patterns, integration notes\n\n2. RAG PATTERN (xiigen-rag-patterns)\n   patternType: SKILL\n   Used by: AF-4 retrieval during code generation\n   Content: Condensed rules, JSON examples, validation checks\n\nWhen creating a new skill:\n  □ Write the .md file (complete documentation)\n  □ Seed the RAG pattern (extracted rules for AF-4)\n  □ Register in SKILL-INDEX.md\n\nWithout both formats, the skill either:\n  - Cannot be loaded by Claude Code (missing .md)\n  - Cannot be retrieved by AF pipeline (missing RAG pattern)",
  "qualityScore": 0.70,
  "qualityDataPoints": 0,
  "usageCount": 0,
  "createdBy": "FLOW-37-Phase-A"
}
```

---

## FLOW-38 PHASE A SEEDS (5 patterns)

### Pattern 6: learning-loops-must-learn
```json
{
  "patternId": "flow-design::learning-loops-must-learn",
  "patternType": "FLOW_DESIGN",
  "tier": "SEED",
  "content": "RULE: A learning loop that does not capture learning signals is not a loop.\n\nEvery feedback.handler MUST have learning_signals[] with:\n  - OUTCOME (REQUIRED): patternsRetrieved + runPassed\n  - GAP_SIGNAL (conditional): if cycleCount >= 2 && !success\n  - DESIGN_FLAW (conditional): if failureClass == STRUCTURAL_FAILURE\n\nValidation: LEARNING-001 (OUTCOME present) is BUILD_FAILURE severity.\nA topology without OUTCOME cannot deploy.\n\nWhy OUTCOME is required:\n  - Updates qualityScore on retrieved patterns\n  - Without it, stale patterns rank high forever\n  - FLOW-38B subscription reads these to update scores",
  "qualityScore": 0.70,
  "qualityDataPoints": 0,
  "usageCount": 0,
  "createdBy": "FLOW-38-Phase-A"
}
```

### Pattern 7: thresholds-in-config
```json
{
  "patternId": "flow-design::thresholds-in-config",
  "patternType": "FLOW_DESIGN",
  "tier": "SEED",
  "content": "ANTI-PATTERN: Hardcoded numeric thresholds\n\nWRONG:\n  if (score >= 0.85) { ... }\n  const minPatterns = 3;\n  const maxAgeHours = 168;\n\nCORRECT:\n  {\n    \"config\": {\n      \"scoreThreshold\": \"${FREEDOM.topology.scoreThreshold}\",\n      \"minPatterns\": \"${FREEDOM.rag.minPatterns}\",\n      \"maxAgeHours\": \"${FREEDOM.rag.maxAgeHours}\"\n    }\n  }\n\nWHY: FREEDOM config allows per-tenant override without code change.\nHardcoded thresholds require code deployment to adjust.\n\nValidation: CONFIG-001 (no hardcoded literals) is score-reduce-20.",
  "qualityScore": 0.70,
  "qualityDataPoints": 0,
  "usageCount": 0,
  "createdBy": "FLOW-38-Phase-A"
}
```

### Pattern 8: ai-synthesis-over-formula
```json
{
  "patternId": "flow-design::ai-synthesis-over-formula",
  "patternType": "FLOW_DESIGN",
  "tier": "SEED",
  "content": "RULE: Content generation uses ai-generate.handler, not formulas.\n\nWRONG (formula in code):\n  const guidance = `Based on ${records.length} records, threshold is ${avg * 0.8}`;\n\nCORRECT (ai-generate.handler):\n  {\n    \"handler\": \"ai-generate.handler\",\n    \"prompt\": {\n      \"system\": \"${genesisPrompt}\",\n      \"ragContext\": \"${calibrationRecords}\",\n      \"userContext\": \"Synthesize guidance for archetype ${input.archetype}\"\n    },\n    \"outputSchema\": { \"guidance\": \"string\", \"confidence\": \"number\" }\n  }\n\nWHY: ai-generate.handler output improves via PromptOps.\nFormulas in code are static — they never learn from outcomes.",
  "qualityScore": 0.70,
  "qualityDataPoints": 0,
  "usageCount": 0,
  "createdBy": "FLOW-38-Phase-A"
}
```

### Pattern 9: design-flaw-capture
```json
{
  "patternId": "flow-design::design-flaw-capture",
  "patternType": "FLOW_DESIGN",
  "tier": "SEED",
  "content": "SIGNAL TYPE: DESIGN_FLAW\n\nEmit when: failureClass == 'STRUCTURAL_FAILURE' (AF-9 score < 50 AND diagnosis\nshows topology structure caused the failure, not prompt quality).\n\nFormat:\n  {\n    \"type\": \"DESIGN_FLAW\",\n    \"condition\": \"${n-diagnose.failureClass} == 'STRUCTURAL_FAILURE'\",\n    \"index\": \"xiigen-flow-design-flaws\",\n    \"data\": {\n      \"topologyId\": \"${topologyId}\",\n      \"flawDescription\": \"${n-diagnose.structuralIssue}\",\n      \"nodesThatFailed\": \"${n-diagnose.failingNodes}\",\n      \"suggestedFix\": \"${n-diagnose.suggestedStructuralFix}\"\n    }\n  }\n\nConsumer: FLOW-38G reads 3+ similar DESIGN_FLAW signals and generates\na new FLOW_DESIGN pattern to prevent the flaw in future topologies.",
  "qualityScore": 0.70,
  "qualityDataPoints": 0,
  "usageCount": 0,
  "createdBy": "FLOW-38-Phase-A"
}
```


> **DPO triple required fields (v2.0.0 schema — P17+P18):** `curriculumTier`,
> `modelComparison` (chosen.model ≠ rejected.model), `targetModelFamily` (from
> FREEDOM config), `instructionFormat`, `distillationReadiness`, `prompt.system`.
> Abbreviated references in this file reflect planning context only.
> See `code-execution--learning-signal-capture-SKILL.md` for the full schema.
> (Cross-reference acceptable here — planning-session skill. Not acceptable in
> Claude Code SESSION-N.md files — inline all fields there per FC-28/SK-443.)

### Pattern 10: event-driven-loops
```json
{
  "patternId": "flow-design::event-driven-loops",
  "patternType": "FLOW_DESIGN",
  "tier": "SEED",
  "content": "RULE: Learning loops are event-triggered, not scheduled.\n\nWRONG (cron schedule):\n  \"trigger\": { \"type\": \"schedule\", \"cron\": \"0 * * * *\" }\n\nCORRECT (event trigger):\n  \"trigger\": { \"type\": \"event\", \"event\": \"run.completed\" }\n  \"trigger\": { \"type\": \"event\", \"event\": \"dpo.triple.stored\" }\n  \"trigger\": { \"type\": \"event\", \"event\": \"phase.execution.requested\" }\n\nWHY:\n  - Event-driven: runs when there is work to do\n  - Scheduled: runs whether or not there is work, wastes resources\n  - Event payloads carry context (runId, tenantId, correlationId)\n  - Scheduled runs must query for context, adding complexity\n\nException: Weekly maintenance tasks (index cleanup) may use schedule.",
  "qualityScore": 0.70,
  "qualityDataPoints": 0,
  "usageCount": 0,
  "createdBy": "FLOW-38-Phase-A"
}
```

> **Event naming convention:** All event names in trigger fields follow the
> pattern `{domain}.{action}.{past-tense}`. Canonical examples:
> - `generation.run.completed`
> - `phase.b.completed`
> - `dpo.triple.stored`
> - `pattern.promoted`
> - `distillation.rules.extracted`
> - `v9.gate.passed` / `v9.gate.failed`
>
> Do NOT use: `run.completed` (missing domain prefix) or `RunCompleted`
> (PascalCase is for CloudEvents type field only, not topology trigger names).

---

## SEEDING COMMANDS

### FLOW-37 Phase A
```bash
# Seed 5 patterns
for pattern in flow-vs-service bootstrap-boundary routing-in-route-handler \
               self-questioning-required dual-format-skills; do
  curl -X POST "localhost:9200/xiigen-rag-patterns/_doc" \
    -H "Content-Type: application/json" \
    -d @patterns/flow-design-${pattern}.json
done

# Verify count
curl -s "localhost:9200/xiigen-rag-patterns/_count?q=patternType:FLOW_DESIGN" | jq .count
# Expected: 5
```

### FLOW-38 Phase A
```bash
# Seed 5 more patterns
for pattern in learning-loops-must-learn thresholds-in-config \
               ai-synthesis-over-formula design-flaw-capture event-driven-loops; do
  curl -X POST "localhost:9200/xiigen-rag-patterns/_doc" \
    -H "Content-Type: application/json" \
    -d @patterns/flow-design-${pattern}.json
done

# Verify count
curl -s "localhost:9200/xiigen-rag-patterns/_count?q=patternType:FLOW_DESIGN" | jq .count
# Expected: 10
```

---

## INTEGRATION

```
Seeded by:    Claude Code in FLOW-37 Phase A (patterns 1-5)
              Claude Code in FLOW-38 Phase A (patterns 6-10)
Retrieved by: AF-4 during topology generation
Updated by:   FLOW-38G (adds new patterns when design flaws accumulate)
              DpoToRagPromoter (promotes tier from SEED → TESTED → PROVEN_SOLUTION)
```
