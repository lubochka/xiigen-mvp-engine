---
name: topology-structure
sk_number: SK-428
version: "2.0.0"
priority: HIGH
load_order: 1
category: code-execution
author: luba
updated: "2026-03-25"
contexts: ["claude-code", "web-session"]
description: >
  How to write a flow topology contract. Node type selection, mandatory elements,
  wiring patterns, and the complete contract format Claude Code uses when
  scaffolding Phase A contracts for af-pipeline flows. Also used in web sessions
  when reviewing topology designs before submission.
triggers:
  - "building topology"
  - "topology contract"
  - "node selection"
  - "flow design"
  - "contracts/topologies"
  - "which handler"
  - "rag-retrieve or decompose"
  - "route.handler condition"
---

# Topology Structure v1.0

## WHEN TO INVOKE

**Claude Code:** When writing any `contracts/topologies/{FLOW}/{name}.topology.json`
file. Load before writing the first node.

**Web session:** When reviewing a topology design in Gate ⓪.5 or during
plan-review (FC checks include topology structure validation).

---

## WHAT THIS SKILL PREVENTS

Topology contracts that:
- Use TypeScript if/else logic inside handler descriptions (should be route.handler)
- Skip feedback.handler (learning signal lost)
- Have ai-generate.handler without downstream validate.handler (no quality check)
- Use sequential ai-generate.handler calls (should be decompose.handler first)
- Miss selfQuestionsRequired in design-artifact ai-generate nodes

---

## THE 9 NODE HANDLERS (v2.0 — added arbiter-panel and multi-generate)

| Handler | Purpose | Primary use |
|---------|---------|-------------|
| `rag-retrieve.handler` | Fetch from ES indices | n1 in most flows — get context before generating |
| `decompose.handler` | Split input into discrete parts | When input has multiple concerns; before ai-generate |
| `ai-generate.handler` | LLM call — single-provider generation | When output does NOT become DPO training data |
| `multi-generate.handler` | N generators parallel, blind judge picks chosen/rejected | When output WILL become DPO training data — replaces ai-generate for generation stations |
| `arbiter-panel.handler` | Run 7 specialized blind arbiters, Escalation Orchestrator decides | After multi-generate, before feedback — mandatory when DPO triple is produced |
| `validate.handler` | Enforce conditions, run named checks | Before routing; after ai-generate for design artifacts |
| `score.handler` | Compute weighted numeric scores | When a decision requires thresholds (non-DPO paths) |
| `route.handler` | Branch based on condition | Any branching — never TypeScript if/else |
| `feedback.handler` | Store results + emit events | Final node — always last; DNA-8 compliance |

**Load order principle:**
```
rag-retrieve → [decompose] → [ai-generate] → validate → [score] → route → feedback
```
Not every node is required. The minimum is: some input node → feedback.handler.

---

## MANDATORY ELEMENTS

Every topology contract MUST contain:

```
□ topologyId: unique, format: "flow-{XX}-{capability}"
□ flowId: "FLOW-XX"
□ taskTypeId: "T-[NEXT+N]" from INFRA-AUDIT
□ archetype: one of DATA_PIPELINE | AI_GENERATION | VALIDATION | ORCHESTRATION
□ trigger: "event {domain}.{action}" OR "scheduled {cron}"
□ nodes: at least 2 nodes
□ edges: all edges declared explicitly
□ ironRules: at least 2 non-negotiable constraints
□ qualityGates: at least 2 specific AF-9 scoring criteria
□ feedback.handler as final node (or on every terminal branch)
```

---

## COMPLETE CONTRACT FORMAT

```json
{
  "topologyId": "flow-37a-phase-capability-gate",
  "flowId": "FLOW-37",
  "taskTypeId": "T-[NEXT+0]",
  "version": "1.0.0",
  "archetype": "VALIDATION",
  "purpose": "One sentence: what does this topology produce?",
  "trigger": "event phase.start OR called by phase orchestrator",

  "nodes": {
    "n1": {
      "handler": "rag-retrieve.handler",
      "description": "What this node retrieves and why",
      "config": {
        "index": "xiigen-{index-name}",
        "query": "${input.fieldName}",
        "queryField": "the ES field to match",
        "size": 50
      },
      "output": { "retrieved": "description of output shape" }
    },

    "n2": {
      "handler": "validate.handler",
      "description": "What conditions are checked",
      "checks": [
        {
          "id": "CHECK-001",
          "check": "named-check-id",
          "target": "${n1.retrieved[*].fieldName}",
          "config": { "threshold": "${config.freedomConfigKey}" },
          "severity": "score-0 | BUILD_FAILURE | warning"
        }
      ],
      "output": { "valid": "boolean", "violations": "string[]", "allPresent": "boolean" }
    },

    "n3": {
      "handler": "route.handler",
      "description": "Branch based on n2 result",
      "condition": "n2.allPresent",
      "branches": {
        "true": "n4",
        "false": "n5"
      }
    },

    "n4": {
      "handler": "multi-generate.handler",
      "description": "What the LLM generates and why this requires intelligence. Uses multi-generate (not ai-generate) because this output becomes DPO training data.",
      "generators": ["AI_ENGINE", "AI_OPENAI_PROVIDER", "AI_GEMINI_PROVIDER"],
      "judgeToken": "AI_JUDGE_PROVIDER",
      "blind": true,
      "prompt": {
        "system": "Role and context for the model (from genesis prompt in xiigen-prompts)",
        "user": "Task with ${variable} injection from upstream node outputs",
        "selfQuestionsRequired": 3
      },
      "output": {
        "generated": "output shape — content of chosen output",
        "selfQuestions": "string[]",
        "answers": "string[]",
        "modelComparison": {
          "chosen":    "{ code: string, model: string, score: number }",
          "rejected":  "{ code: string, model: string, score: number }",
          "discarded": "{ code: string, model: string, score: number } | null",
          "judgeModel": "string",
          "shuffleWasApplied": true
        }
      }
    },

    "n5": {
      "handler": "feedback.handler",
      "description": "Store result and emit event — always last",
      "actions": [
        {
          "type": "store",
          "index": "xiigen-{result-index}",
          "document": "document-template-name"
        },
        {
          "type": "emit",
          "event": "domain.action.past-tense",
          "payload": { "key": "${n4.generated.field}" }
        }
      ],
      "learning_signals": [
        {
          "type": "OUTCOME | DPO_TRIPLE | CALIBRATION | GAP_SIGNAL | DESIGN_FLAW",
          "index": "xiigen-{learning-index}",
          "data": {
            "runId": "${runId}",
            "flowId": "${flowId}",
            "passed": "${n2.valid}",
            "patternsRetrieved": "${n1.retrieved[*].patternId}"
          }
        }
      ],
      "output": { "stored": "boolean", "eventEmitted": "string" }
    }
  },

  "edges": [
    ["n1", "n2"],
    ["n2", "n3"],
    ["n3.true", "n4"],
    ["n3.false", "n5"],
    ["n4", "n5"]
  ],

  "ironRules": [
    "n5 stores document BEFORE emitting event (DNA-8)",
    "n3 condition reads from FREEDOM config — never hardcoded threshold",
    "n4 MUST include selfQuestionsRequired >= 3 for design artifacts"
  ],

  "qualityGates": [
    "validate.handler n2 must check all named conditions",
    "feedback.handler n5 must include at least one learning_signal",
    "route.handler n3 condition must reference upstream validate output"
  ]
}
```

---

## NAMED CHECK CATALOG (validate.handler)

Common checks available in the validate.handler registry:

```
file-exists              → checks ${target} file path exists on disk
file-has-section         → checks markdown file contains ## ${section}
yaml-frontmatter-present → checks file starts with ---
skill-exists             → checks skill in SKILL-INDEX.md
not-already-in-rag       → checks patternId not in xiigen-rag-patterns
cross-flow-confirmation  → checks flowIds array has >= config.minFlows distinct values
pattern-has-min-samples  → checks qualityDataPoints >= config.threshold
score-delta-within-bounds → checks abs(newScore - prevScore) <= config.maxDelta
three-level-verified     → checks three-level-verification result stored
self-questions-present   → checks output.selfQuestions.length >= config.minimum
all-questions-answered   → checks output.answers matches output.selfQuestions length
not-duplicate-flow       → checks topologyId not in flow registry
has-feedback-node        → checks topology has at least one feedback.handler
has-learning-signal      → checks feedback.handler has learning_signals[]
```

---

## WIRING PATTERNS

**Pattern A: Linear validation pipeline**
```
rag-retrieve → validate → feedback
```
Use when: checking conditions against retrieved data, no branching needed.

**Pattern B: Branch-on-validation**
```
rag-retrieve → validate → route → [feedback(success)] / [ai-generate → feedback(remediate)]
```
Use when: success path is simple, failure path needs AI-generated response.

**Pattern C: Enrich-and-store**
```
rag-retrieve → decompose → ai-generate → validate → feedback
```
Use when: generating structured content that must meet quality criteria.

**Pattern D: Score-gated promotion**
```
rag-retrieve → decompose → validate(min-samples) → score → route → feedback
```
Use when: updating numeric quality metrics from accumulated outcomes.

**Pattern E: Design-with-self-questioning**
```
rag-retrieve → validate(no-duplicate) → ai-generate(QUESTION YOURSELF) → validate(self-questions-answered) → feedback
```
Use when: AI generates a design artifact (topology, contract, plan).

**Pattern F: Multi-arbiter evaluation pipeline (P17 — mandatory for DPO training data)**
```
rag-retrieve → decompose → multi-generate(N providers, shuffle) → arbiter-panel(7 arbiters, blind) → feedback(DPO_TRIPLE)
```
Use when: generated output will be stored as DPO training data.
The multi-generate node runs all configured providers in parallel, shuffles outputs
with random labels before any arbiter sees them. The arbiter-panel node runs 7
specialized blind arbiters and the Escalation Orchestrator (SK-446) resolves to
chosen/rejected. feedback.handler stores the DPO triple with modelComparison field.

Note: `ai-generate.handler` is valid for flows where output does NOT become DPO
training data (e.g., generating a code comment, computing a score). For all AF-1
generation stations: use `multi-generate.handler` + `arbiter-panel.handler`.

---

## EDGE CASES

**Multiple terminal branches:** Every branch must end with feedback.handler.
A branch that ends without storing a result loses the learning signal.

**ai-generate for non-design tasks:** If the output is not a design artifact
(e.g., generating a code comment), `selfQuestionsRequired` can be 0. But if
the output affects system behavior, include at least 1 self-question.

**Circular retrieval:** If a flow retrieves from an index it also writes to
(e.g., FLOW-38A reads `xiigen-rag-patterns` and writes qualityScore updates),
n1 retrieves the state BEFORE the run. feedback.handler at n-final writes the
new state AFTER. This is correct; do not add an intermediate refresh.

---

## ANTI-PATTERNS

```
❌ TypeScript if/else in node description
   → Use route.handler. The condition becomes visible in the topology JSON.

❌ ai-generate.handler without validate.handler downstream
   → Generated content must be validated before storage.
   → Add: check self-questions-answered + check has-feedback-node

❌ Multiple sequential ai-generate.handler calls
   → Two sequential LLM calls usually means: decompose first, then single generate.
   → Or: one generate → validate → route (not generate → generate).

❌ feedback.handler without learning_signals[]
   → A flow without learning signals is a static function.
   → Add at least one OUTCOME signal.

❌ Hardcoded threshold in validate.handler check config
   → config.threshold should reference a FREEDOM config key, not a literal.
   → Correct: "config": { "threshold": "${config.qualityScoreMinSamples}" }

❌ ai-generate.handler producing DPO_TRIPLE learning signal (P17 violation)
   → A single-model run cannot produce chosen/rejected from different model families.
   → Replace with multi-generate.handler + arbiter-panel.handler.
   → If only one provider key is available: set triple.status = PENDING_COMPARISON,
     store to xiigen-training-data-review. Never store to main training index.

❌ score.handler with single AI_JUDGE_PROVIDER across all evaluator dimensions (P17 violation)
   → Each evaluator domain requires a specialized arbiter.
   → Replace score.handler with arbiter-panel.handler for DPO-producing stations.
   → score.handler is valid for non-DPO scoring (e.g., difficulty prediction).

❌ arbiter-panel.handler with arbiters sharing context packages
   → If Business Logic Arbiter and Security Arbiter receive the same full contract,
     isolation is broken. Each arbiter must receive only its defined subset.

❌ Hardcoded model name in ai-generate or multi-generate node (FC-31 / D-EXT-009)
   → Model names in topology nodes must reference FREEDOM config keys.
   → Wrong: "generators": ["claude-sonnet-4-5", "gpt-4o"]
   → Right: "generators": ["AI_ENGINE", "AI_OPENAI_PROVIDER"]
```

---

## TEST SCENARIOS

- Topology has route.handler with `condition: "n2.count >= 3"` hardcoded
  → ANTI-PATTERN: threshold hardcoded → fix: `"${config.calibrationMinRecords}"`
- Topology has ai-generate.handler for pattern generation, no downstream validate
  → ANTI-PATTERN: add validate.handler checking `self-questions-answered`
- Topology has 2 branches but only 1 feedback.handler
  → ANTI-PATTERN: each terminal branch needs feedback.handler for learning signal

---

## INTEGRATION

```
Invoked after: flow-vs-service-gate classifies a capability as FLOW
Used by:       Claude Code when writing contracts/topologies/**/*.topology.json
Validated by:  plan-review-skill FC checks (topology structure completeness)
Referenced in: self-questioning-SKILL.md (node n4 prompt format)
               learning-signal-capture-SKILL.md (feedback.handler format)
```
