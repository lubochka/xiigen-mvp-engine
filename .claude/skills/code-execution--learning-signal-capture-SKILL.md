---
name: learning-signal-capture
sk_number: SK-468
# TODO S7 (C-9 pattern): assign from codebase .claude/skills/SKILL-INDEX.md
version: "2.0.0"
priority: HIGH
load_order: 3
category: code-execution
author: luba
updated: "2026-03-25"
contexts: ["claude-code", "web-session"]
description: >
  Every flow topology MUST capture at least one learning signal in its
  feedback.handler. A topology without learning signals is a static function
  that cannot improve. This skill defines the 9 signal types (6 original + MODEL_COMPARISON, SHADOW_RUN,
  ARBITER_VERDICT added v2.0.0), the feedback.handler template, and the validation
  checks that enforce signal presence.
triggers:
  - "feedback.handler"
  - "learning signal"
  - "DPO triple"
  - "OUTCOME signal"
  - "what does this flow learn"
  - "learning loop"
  - "flow improvement"
  - "xiigen-training-data"
---

# Learning Signal Capture Skill v2.0 (P17+P18 DPO fields, new signal types)

## WHEN TO INVOKE

**Claude Code:** When writing any feedback.handler node in a topology contract.
Load before writing the `learning_signals[]` field.

**Web session:** During plan-review, check that every flow topology has at
least one learning signal declared in its feedback.handler.

---

## WHAT THIS SKILL PREVENTS

Topologies that execute correctly but contribute nothing to the learning system.
A flow without learning signals is indistinguishable from a TypeScript service —
it runs, it produces output, but the engine does not improve from it.

Historical examples:
- FLOW-37 v2 `CapabilityGapRepository.ts` stored gap scan results with no
  learning signal → no quality data accumulated → capability gap patterns never
  improved
- FLOW-38 v2 `DpoToRagPromoter.ts` stored promoted patterns with no quality
  feedback → promoted patterns had no evidence of retrieval effectiveness

---

## THE 9 LEARNING SIGNAL TYPES (v2.0.0)
# NOTE: When adding a new signal type here, also add it to (a) this table AND
# (b) the SIGNAL SELECTION GUIDE below — FC-10 propagation rule.

| Type | What it captures | Stored to | Used by |
|------|-----------------|-----------|---------|
| `OUTCOME` | Did this run pass? What score? What patterns retrieved? | `xiigen-rag-retrieval-outcomes` | RagQualityEvolver (FLOW-38A) |
| `DPO_TRIPLE` | Rejected vs chosen output with full context | `xiigen-training-data` | Local model fine-tuning (Phase 3) |
| `CALIBRATION` | Archetype+domain detail level and score | `xiigen-calibration-memory` | CalibrationMemory (FLOW-38E) |
| `GAP_SIGNAL` | Missing capability with proposed skill | `xiigen-capability-gap-signals` | SkillEvolutionTrigger (FLOW-38F) |
| `DESIGN_FLAW` | Topology structure was wrong — classification | `xiigen-flow-design-flaws` | FLOW-38G design-learning |
| `PROMPT_PATCH` | Genesis prompt needed change — what and why | `xiigen-prompt-evolution` | PromptEvolutionStore (FLOW-38C) |
| `MODEL_COMPARISON` | Which model family won per archetype per AF station | `xiigen-model-preference` | ModelPreferenceTracker (FLOW-39) |
| `SHADOW_RUN` | Gap score between paid and OSS model per archetype tier | `xiigen-shadow-runs` | Independence timeline tracker (P21) |
| `ARBITER_VERDICT` | Each arbiter's verdict per candidate output per run | `xiigen-arbiter-verdicts` | Arbiter calibration (FLOW-38) |

---

## SIGNAL SELECTION GUIDE

Choose based on what this flow does:

```
Flow validates capability presence
  → GAP_SIGNAL if capability missing
  → OUTCOME always

Flow generates content via AI (pattern, topology, plan)
  → DPO_TRIPLE if multi-cycle (rejected vs chosen)
  → PROMPT_PATCH if genesis prompt was changed
  → OUTCOME always

Flow updates quality scores
  → OUTCOME (records what was updated + result)

Flow synthesizes guidance from accumulated records
  → CALIBRATION (records archetype+domain + recommendation quality)
  → OUTCOME

Flow analyzes why a run failed
  → DESIGN_FLAW if topology was wrong
  → OUTCOME always

Flow designs a topology for another flow
  → DPO_TRIPLE (bad design vs good design)
  → DESIGN_FLAW if self-questioning revealed a structural problem
  → OUTCOME always

Flow uses multi-generate.handler (any generation station)
  → MODEL_COMPARISON always (records model preference data per archetype)
  → SHADOW_RUN always — even as placeholder with ossScore:null (P21)
    If no OSS key: shadowStatus='PENDING_LOCAL_MODEL', paidScore still recorded

Flow uses arbiter-panel.handler (any evaluation station)
  → ARBITER_VERDICT (one per arbiter role per output label A/B/C)
    resolvedModel stays null until after DPO triple is finalized
```

The OUTCOME signal is required on every flow. It is the minimum learning signal.

---

## feedback.handler TEMPLATE

```json
{
  "id": "n-final",
  "handler": "feedback.handler",
  "description": "Store result and emit event",
  "actions": [
    {
      "type": "store",
      "index": "xiigen-{result-index}",
      "document": "${output-document}"
    },
    {
      "type": "emit",
      "event": "{domain}.{action}.{past-tense}",
      "payload": {
        "correlationId": "${correlationId}",
        "tenantId": "${tenantId}",
        "flowId": "${flowId}",
        "{result-field}": "${output.field}"
      }
    }
  ],
  "learning_signals": [
    {
      "type": "OUTCOME",
      "index": "xiigen-rag-retrieval-outcomes",
      "data": {
        "runId": "${runId}",
        "flowId": "${flowId}",
        "taskTypeId": "${taskTypeId}",
        "archetype": "${contract.archetype}",
        "patternsRetrieved": "${n1.patterns[*].patternId}",
        "runPassed": "${n2.valid || n-validate.allPresent}",
        "finalScore": "${n-score.value || null}"
      }
    }
  ],
  "ironRules": ["store action precedes emit action (DNA-8)"]
}
```

---

## SIGNAL-SPECIFIC TEMPLATES

### DPO_TRIPLE signal

```json
{
  "type": "DPO_TRIPLE",
  "index": "xiigen-training-data",
  "data": {
    "flowId": "${flowId}",
    "taskTypeId": "${taskTypeId}",

    "chosen": {
      "code":  "${n4-generate.modelComparison.chosen.code}",
      "model": "${n4-generate.modelComparison.chosen.model}",
      "score": "${n4-generate.modelComparison.chosen.score}"
    },
    "rejected": {
      "code":  "${n4-generate.modelComparison.rejected.code}",
      "model": "${n4-generate.modelComparison.rejected.model}",
      "score": "${n4-generate.modelComparison.rejected.score}"
    },
    "modelComparison": {
      "chosen":           "${n4-generate.modelComparison.chosen}",
      "rejected":         "${n4-generate.modelComparison.rejected}",
      "discarded":        "${n4-generate.modelComparison.discarded || null}",
      "judgeModel":       "${n4-generate.modelComparison.judgeModel}",
      "shuffleWasApplied": true
    },

    "curriculumTier":        "${archetype-tier-table[contract.archetype]}",
    "targetModelFamily":     "${freedomConfig.get('xiigen.oss_target_model') ?? 'deepseek-coder-v2'}",
    "instructionFormat":     "${freedomConfig.get('xiigen.oss_instruction_format') ?? 'deepseek-coder'}",
    "distillationReadiness": "READY | TOO_COMPLEX | PENDING_SIMPLIFICATION",
    "shadowRunId":           "${shadowRun.runId || null}",

    "teachingPoint": "${n-generate.answers[0]}",
    "conflictType":  "${n-validate.violations[0].check}",

    "prompt": {
      "system":      "${n1-prompt-retrieve.promptContent}",
      "ragPatterns": "${n2-rag.patterns}",
      "planSteps":   "${n3-decompose.steps}"
    },

    "runtimeContext": {
      "fabricProviders": "${ctx.resolvedProviders}"
    }
  }
}

> **IMPORTANT — S3 carry flag (from PATCH--xiigen-core-principles carry section):**
> `targetModelFamily` and `instructionFormat` MUST be read from FREEDOM config at store time,
> never hardcoded. The pattern is: `freedomConfig.get('xiigen.oss_target_model') ?? 'deepseek-coder-v2'`.
> Hardcoding 'deepseek-coder-v2' directly violates P17 (MACHINE constant) the moment a
> different OSS model is preferred. See D-EXT-009 for the FREEDOM config pattern.
```

### Curriculum Tier Assignment

Tiers are assigned automatically by FLOW-39C (curriculum-sequencer) when a
DPO_TRIPLE or DISTILLED_RULE is stored. The `curriculumTier` field must be
present on every DPO_TRIPLE stored to `xiigen-training-data`.

Fine-tuning runs in tier order — local model learns simple patterns before
complex ones. Without tier ordering, 40 triples provide the same gradient
as 80 random triples.

| Archetype | Tier | Rationale |
|-----------|------|-----------|
| `ROUTING` | 1 | Simplest — idempotency, rate limiting, DNA-8 |
| `DATA_PIPELINE` | 2 | Requires Tier 1 fabric foundation |
| `VALIDATION` | 2 | Requires Tier 1 validate.handler patterns |
| `TRANSACTION` | 3 | Complex state — compensation, saga ordering |
| `ORCHESTRATION` | 4 | Multi-step, event contracts, gate events |
| `SCHEDULED` | 5 | Most complex — SLA windows, virtual clock, state machine |

If FLOW-39C is not yet ACTIVE: assign `curriculumTier` manually using this
table before storing. Never store a DPO_TRIPLE with `curriculumTier: null`.

---

## DPO VALIDITY GATE

A DPO_TRIPLE is stored to `xiigen-training-data` ONLY when ALL THREE conditions are met:

```
□ chosen.model  ≠  rejected.model   (different model families — P17)
□ modelComparison.shuffleWasApplied === true
□ prompt.system is non-null         (genesis text present — GAP-08)
```

When < 2 provider keys are available:
- Set `triple.status = 'PENDING_COMPARISON'`
- Store to `xiigen-training-data-pending` — NOT the main training index
- Log: "DPO triple pending — single-provider run, cannot produce cross-model chosen/rejected"

When all generators score equally (three-way tie):
- Set `triple.status = 'UNDECIDED'`
- Store to `xiigen-training-data-review` for human labeling
- Never store to main training index

**A triple stored without meeting these conditions is GAP-08 non-compliant.**
It produces noisy training signal because the model learns from comparisons that
are not genuine cross-model comparisons.

### LEARNING-003: DPO Triple Format Check

```json
{
  "id": "LEARNING-003",
  "check": "dpo-triple-format",
  "target": "${feedback.handler.learning_signals[DPO_TRIPLE].data}",
  "config": {
    "requiredFields": [
      "prompt.system", "chosen", "rejected", "teachingPoint",
      "curriculumTier", "targetModelFamily", "instructionFormat",
      "modelComparison"
    ]
  },
  "severity": "BUILD_FAILURE",
  "description": "DPO triple must have complete P17+P18 fields. See DPO VALIDITY GATE above."
}
```

### LEARNING-004: Cross-Model DPO Provenance (P17)

```json
{
  "id": "LEARNING-004",
  "check": "dpo-cross-model-provenance",
  "target": "${feedback.handler.learning_signals[DPO_TRIPLE].data}",
  "config": {
    "rule": "chosen.model != rejected.model"
  },
  "severity": "BUILD_FAILURE",
  "description": "DPO triple chosen and rejected must come from different model families. Same-model cycle comparison is not DPO."
}
```

### LEARNING-006: OSS Teaching Fields Present (P18)

```json
{
  "id": "LEARNING-006",
  "check": "dpo-oss-fields-present",
  "target": "${feedback.handler.learning_signals[DPO_TRIPLE].data}",
  "config": {
    "requiredFields": ["curriculumTier", "targetModelFamily", "instructionFormat", "distillationReadiness"]
  },
  "severity": "BUILD_FAILURE",
  "description": "DPO triple must include OSS teaching fields (P18). FLOW-39 will not add these retroactively."
}
```

### LEARNING-007: curriculumTier Not Null (P18)

```json
{
  "id": "LEARNING-007",
  "check": "field-not-null",
  "target": "${feedback.handler.learning_signals[DPO_TRIPLE].data.curriculumTier}",
  "config": { "allowedValues": [1, 2, 3, 4, 5] },
  "severity": "BUILD_FAILURE",
  "description": "curriculumTier must be assigned at store time from the archetype tier table. null = unusable for curriculum fine-tuning."
}
```

---

### GAP_SIGNAL

```json
{
  "type": "GAP_SIGNAL",
  "index": "xiigen-capability-gap-signals",
  "data": {
    "flowId": "${flowId}",
    "taskTypeId": "${taskTypeId}",
    "phaseThatFailed": "${input.phaseType}",
    "failureClass": "${n-classify.flawType}",
    "proposedSkill": "${n-generate.remediationPlan.proposedSkillPath}",
    "cyclesNeeded": "${cycleCount}"
  }
}
```

### DESIGN_FLAW signal

```json
{
  "type": "DESIGN_FLAW",
  "index": "xiigen-flow-design-flaws",
  "data": {
    "flowId": "${flowId}",
    "originFlow": "${input.failedFlowId}",
    "flawType": "DESIGN_FLAW",
    "flawDescription": "${n-classify.designFlawAnalysis}",
    "suggestedFix": "${n-classify.suggestedFix}",
    "capturedAt": "${now}"
  }
}
```

---

## validate.handler CHECK

Every topology MUST pass this check:

```json
{
  "id": "LEARNING-001",
  "check": "has-learning-signal",
  "target": "feedback.handler.learning_signals",
  "required": true,
  "minimumSignals": 1,
  "severity": "score-0"
}
```

Add to `qualityGates` in topology contract:
```json
"qualityGates": [
  "feedback.handler has at least one learning_signal of type OUTCOME",
  "OUTCOME signal includes patternsRetrieved array (for RAG quality evolver)"
]
```

---

## THE LEARNING LOOP CONNECTION

When every flow captures OUTCOME signals:

```
FLOW execution → feedback.handler stores OUTCOME → FLOW-38A picks up event →
  rag-quality-evolution topology runs → qualityScore updated for retrieved patterns →
  next FLOW execution retrieves higher-quality patterns → better generation →
  fewer cycles → smaller scoreDelta on next DPO triple
```

This loop only closes if OUTCOME signals are captured. A flow that skips them
breaks the loop at the first step.

---
---

## v2.0.0 ADDITIONS — Model Comparison, Shadow Run, Arbiter Verdict Signals

> Added: 2026-03-25 | Source: XIIGen Skills Overhaul — Session 3 (P17+P18+M2)

---

### MODEL_COMPARISON Signal (type 7)

**Purpose:** Records which model family produced better output at each AF station,
per archetype per domain. Feeds ModelPreferenceTracker — after N flows the engine
knows which model to prefer for ROUTING vs ORCHESTRATION archetypes.

```json
{
  "type": "MODEL_COMPARISON",
  "index": "xiigen-model-preference",
  "data": {
    "flowId":     "${flowId}",
    "taskTypeId": "${taskTypeId}",
    "archetype":  "${contract.archetype}",
    "station":    "AF-1 | AF-6 | AF-7 | AF-9",
    "chosen":     { "modelToken": "${modelToken}", "modelId": "${modelId}", "score": 0.0 },
    "rejected":   { "modelToken": "${modelToken}", "modelId": "${modelId}", "score": 0.0 },
    "discarded":  null,
    "judgeModel": "${judgeModelId}",
    "ironRuleViolations": { "chosen": [], "rejected": [] },
    "shuffleApplied": true
  }
}
```

**Teaching value:** After 24 flows, `xiigen-model-preference` shows which provider
excels at which archetype. This feeds FLOW-39 curriculum — the local model learns
from the best provider's output for each archetype, not a random mix.

**Anti-patterns:**
```
❌ MODEL_COMPARISON with chosen and rejected from same model family
   → Not comparative signal — mark as PENDING_COMPARISON (P17)
❌ Missing shuffleApplied: true
   → Judge may have seen model attribution — blind judging compromised
```

---

### SHADOW_RUN Signal (type 8)

**Purpose:** Records a parallel OSS model run alongside the paid model run.
The gap score (`paidScore - ossScore`) is the independence metric. When gap
approaches 0 for an archetype tier, that tier can switch to local model.

**Must be created from FLOW-01 Phase B onward (P21).** When no local model is
deployed: create a placeholder record with `ossScore: null` and
`shadowStatus: 'PENDING_LOCAL_MODEL'`. The paid score is still recorded — it
will be needed for gap computation when the local model becomes available.

```json
{
  "type": "SHADOW_RUN",
  "index": "xiigen-shadow-runs",
  "data": {
    "flowId":       "${flowId}",
    "taskTypeId":   "${taskTypeId}",
    "paidRunId":    "${paidRun.runId}",
    "ossModel":     "${freedomConfig.get('xiigen.oss_target_model') ?? null}",
    "ossScore":     "${ossRun.score || null}",
    "paidScore":    "${paidRun.score}",
    "scoreDelta":   "${ossScore !== null ? paidScore - ossScore : null}",
    "archetypeTier": "${archetype-tier-table[contract.archetype]}",
    "shadowStatus": "PENDING_LOCAL_MODEL | ACTIVE | SWITCHED",
    "readyForSwitch": false
  }
}
```

**readyForSwitch logic:** Set to `true` when `ossScore >= paidScore - threshold`
across 3+ consecutive runs for this archetype tier. Threshold from FREEDOM config
`xiigen.switch_gap_threshold` (default: 0.05 = 5%).

**Anti-patterns:**
```
❌ Omitting SHADOW_RUN because "local model not ready"
   → Placeholder record with ossScore:null is required (P21)
   → "Unknown gap = unknown independence timeline = failure state"
❌ Missing archetypeTier
   → FLOW-39 cannot sequence curriculum without tier information
```

---

### ARBITER_VERDICT Signal (type 9)

**Purpose:** Records each arbiter's verdict for each candidate output (A/B/C).
After N flows, reveals which arbiter role most frequently blocks which archetype —
the highest-frequency BLOCK arbiter's prompt is the highest-value training target.

```json
{
  "type": "ARBITER_VERDICT",
  "index": "xiigen-arbiter-verdicts",
  "data": {
    "runId":       "${runId}",
    "taskTypeId":  "${taskTypeId}",
    "flowId":      "${flowId}",
    "arbiterRole": "business_logic | security | skills_patterns | prompts_compliance | key_principles | iron_rules | completeness",
    "verdict":     "APPROVED | CHALLENGE | BLOCK",
    "violations":  [{ "rule": "...", "evidence": "...", "severity": "BLOCK | ADVISORY" }],
    "outputLabel": "A | B | C",
    "resolvedModel": null
  }
}
```

**`resolvedModel` stays `null`** until after the DPO triple is finalized and the
shuffle mapping is dereferenced. This preserves blind judging through the entire
process. The model family is recorded in `modelComparison`, not here.

**Teaching value:** After N flows, `xiigen-arbiter-verdicts` shows:
- Which arbiter blocks most frequently for ROUTING → genesis prompt for ROUTING
  needs better coverage of that arbiter's domain
- Which arbiter-pair most often disagrees → potential for Upper Judge expansion
- Which archetypes converge fastest → least expensive to generate

**Anti-patterns:**
```
❌ resolvedModel populated before DPO triple is finalized
   → Breaks blind judging — the model that produced the winning output must
     not be known until after all arbiters have rendered verdicts
```

---


## ANTI-PATTERNS

```
❌ feedback.handler with no learning_signals[]
   → The flow runs but contributes nothing
   → Add OUTCOME at minimum

❌ DPO_TRIPLE without prompt.system field
   → GAP-08: the triple is unusable for fine-tuning without full prompt context
   → The local model trains on context, not just outcomes

❌ OUTCOME without patternsRetrieved
   → RagQualityEvolver cannot update qualityScore without knowing which patterns ran
   → Even if n1 only retrieved 0 patterns, store an empty array: []

❌ Emitting event BEFORE storing document
   → DNA-8 violation
   → Always: store action first, emit action second in feedback.handler

❌ "This flow doesn't need learning signals — it's infrastructure"
   → Infrastructure flows are the ones that most need learning signals
   → They run before every user-facing flow — their quality directly affects everything

❌ DPO_TRIPLE with chosen.model === rejected.model (same model family) (P17)
   → Not DPO — it is intra-model style drift. Fine-tuning on it teaches nothing.
   → Use multi-generate.handler to produce genuine cross-model comparison
   → If single provider: store to xiigen-training-data-pending, not main index

❌ DPO_TRIPLE stored without curriculumTier (P18)
   → FLOW-39 cannot sequence curriculum — triple is placed in random tier position
   → Assign from archetype tier table at store time: ROUTING=1 .. SCHEDULED=5

❌ DPO_TRIPLE stored without targetModelFamily (P18)
   → OSS fine-tuning script cannot format the triple for the target model
   → Read from FREEDOM config: freedomConfig.get('xiigen.oss_target_model')
   → Never hardcode 'deepseek-coder-v2' — see D-EXT-009

❌ SHADOW_RUN omitted because "local model not ready yet" (P21)
   → Placeholder record with ossScore:null is always required
   → "Unknown gap score = unknown independence timeline = failure state" (P21)

❌ ARBITER_VERDICT resolvedModel populated before DPO triple finalized
   → Breaks blind judging protocol — the winning model must stay anonymous
     until after all verdicts are rendered
```

---

## TEST SCENARIOS

- Topology feedback.handler has `learning_signals: []`
  → FAIL LEARNING-001 → score-0 in AF-9 judgment

- OUTCOME signal missing `patternsRetrieved` field
  → PARTIAL: RagQualityEvolver will record the run but cannot update pattern scores
  → Fix: add `"patternsRetrieved": "${n1.patterns[*].patternId}"`

- DPO_TRIPLE signal missing `prompt.system`
  → GAP-08: triple stored but unusable for local model training
  → Fix: add `"system": "${n1-prompt-retrieve.promptContent}"`

---

## INTEGRATION

```
Invoked by: topology-structure-SKILL.md (feedback.handler format section)
Enforced by: validate.handler LEARNING-001 check in every topology
Used in:    FLOW-37A through FLOW-38G — all topology contracts
Referenced by: FLOW-38 loop design (every loop captures its own learning signals)
```

---

## v1.0.3 ADDITIONS — Design Reasoning Signal Types

> Added: 2026-03-24 | Source: XIIGEN-ARCHITECTURAL-RETHINKING.md, Gap 4

---

### DESIGN_REASONING Signal

**Captured at:** Gate C of every planning session (before session files are produced)
**Index:** `xiigen-rag-patterns` (`patternType: ARCHITECTURE_DECISION`)
**Purpose:** Teaches the system to make better design decisions over time. Without this signal, the code generator improves but the designer does not.

```json
{
  "type": "DESIGN_REASONING",
  "index": "xiigen-rag-patterns",
  "data": {
    "patternId": "arch-decision::${flowId}::${decisionId}",
    "patternType": "ARCHITECTURE_DECISION",
    "domain": "${domain}",
    "flowId": "${flowId}",
    "decisionType": "CAPABILITY_CLASSIFICATION | WAVE_ASSIGNMENT | INCOMPATIBILITY_RECLASSIFICATION | IRON_RULE_DERIVATION | FABRIC_INTERFACE_INTRO | DEPENDENCY_DIRECTION | ARCHETYPE_SELECTION",
    "context": "${description of the planning situation}",
    "proposedRepresentation": "${what was initially proposed}",
    "challenges": [
      { "source": "${arbiter or review}", "challenge": "${what was questioned}", "severity": "BLOCKING | ADVISORY" }
    ],
    "resolutions": [
      { "challenge": "${challenge}", "resolution": "${how resolved}", "representationDelta": "${what changed}" }
    ],
    "finalRepresentation": "${what was decided}",
    "teachingPoint": "${one sentence: what future sessions should learn}",
    "principleApplied": "${M1-M5, P1-P22 or CF-N reference}",
    "qualityScore": 0.85,
    "tier": "SEED"
  }
}
```

**When to capture:**
- Gate C of every planning session — before session files produced
- When a convergence node resolves a CONTEXT_INSUFFICIENT request
- When an upstream NODE is reopened due to escalation from a downstream NODE
- When a human judgment resolves a DEFERRED_CONSTRAINT

**Anti-patterns:**
```
❌ Capturing only the final decision without the challenges that shaped it
❌ teachingPoint that restates the decision instead of generalizing it
❌ principleApplied left empty
❌ Only capturing in DECISIONS-LOCKED.md (prose only — not retrievable by pipeline)
```

---

### CONVERGENCE_SESSION Signal

**Captured at:** Completion of `convergence.handler` for each NODE
**Index:** `xiigen-convergence-sessions`
**Purpose:** Records the full multi-model conversation that built each NODE. Used to improve convergence efficiency — the system learns which questions to ask earlier.

```json
{
  "type": "CONVERGENCE_SESSION",
  "index": "xiigen-convergence-sessions",
  "data": {
    "nodeId": "${flowId}::${taskTypeId}",
    "flowId": "${flowId}",
    "taskTypeId": "${taskTypeId}",
    "rounds": "${number of rounds until consensus}",
    "contextRequestsEmitted": ["${typed requests made}"],
    "contextRequestsResolved": "${count}",
    "contextRequestsDeferred": "${count — marked DEFERRED_CONSTRAINT}",
    "flawsIdentified": [
      {
        "flaw": "${description}",
        "detectedBy": "${arbiter model}",
        "contextRequired": ["${what context was needed}"],
        "severity": "DATA_INTEGRITY | SECURITY | BUSINESS_LOGIC | COMPATIBILITY",
        "constraintAdded": "${CF-N rule produced}"
      }
    ],
    "escalations": ["${upstream NODEs reopened}"],
    "representationBefore": {},
    "representationAfter": {},
    "consensusReached": true,
    "stalledAt": null
  }
}
```

**Teaching value:** After N convergence sessions:
- System learns which challenge types require most rounds → asks earlier
- System learns which context request types most often reveal flaws → prioritizes
- System learns which archetype + domain combinations converge fastest → calibrates

**Note:** `convergence.handler` infrastructure required (Task 7 of pre-FLOW-01 list). Until then, capture DESIGN_REASONING manually at Gate C as the interim signal.

