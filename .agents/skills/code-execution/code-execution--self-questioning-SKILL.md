---
name: self-questioning
sk_number: SK-429
version: "1.0.0"
priority: HIGH
load_order: 2
category: code-execution
author: luba
updated: "2026-03-24"
contexts: ["claude-code", "web-session"]
description: >
  Every ai-generate.handler that produces a design artifact must include a
  QUESTION YOURSELF section in its prompt. The model asks itself 3+ questions
  about potential flaws, answers each, and modifies the output before returning.
  The downstream validate.handler enforces that questions were asked and answered.
  Catches design flaws before AF-9 judgment.
triggers:
  - "ai-generate for design"
  - "topology generation"
  - "schema generation"
  - "contract generation"
  - "genesis prompt writing"
  - "QUESTION YOURSELF"
  - "self-questioning"
  - "design artifact"
---

# Self-Questioning Skill v1.0

## WHEN TO INVOKE

**In every ai-generate.handler prompt that produces a design artifact:**
- Flow topology
- EngineContract (task type definition)
- Schema (event contract, fixture schema)
- Remediation plan
- Genesis prompt content
- RAG pattern content

**In every web-session genesis prompt review:** when checking the genesis prompt
before seeding to ES, verify it includes a QUESTION YOURSELF section.

---

## WHAT THIS SKILL PREVENTS

Design flaws that slip through AF-9 judgment because the generating model never
considered them. Historical examples from FLOW-37/38:

- v2 classified 6 capabilities as TypeScript services — a self-questioning prompt
  asking "does any capability here answer YES to Q1-Q4?" would have caught this
- v2 missed SkillEvolutionTrigger from the factory table — a self-question
  "does the factory count match the service count?" would have caught this
- v2 plans produced topology topologyId values that didn't match their
  contract files — self-questioning "are all topologyIds consistent with their
  filename?" would have caught this

---

## THE QUESTION YOURSELF TEMPLATE

Add this section to every ai-generate.handler prompt for design artifacts:

```
QUESTION YOURSELF before finalizing your output:

1. [Capability classification] Does any capability in this design have
   TypeScript if/else logic that should be a route.handler node?

2. [Learning signal] Does every feedback.handler in this design have at
   least one learning_signals[] entry? If not, why does this flow not learn?

3. [Bootstrap boundary] Is any capability here implemented as TypeScript
   when it should be a flow topology per the bootstrap-boundary rules?

4. [Threshold configuration] Are all numeric thresholds (counts, scores,
   sample minimums) referenced via FREEDOM config rather than hardcoded?

5. [Completeness] Does the count of factories, task types, and topologies
   all match? Is anything declared in the summary but missing from the
   phase deliverables?

Answer each question. If any answer reveals a flaw, modify your output
before returning. State your modifications explicitly.
```

Adapt the questions to the specific artifact being generated. Keep at least 3.
The questions above are the defaults; replace domain-specific questions where
more relevant.

---

## REQUIRED OUTPUT FORMAT

When a node includes selfQuestionsRequired in its config, the output MUST
include these fields:

```json
{
  "artifact": { "the generated content": "..." },
  "selfQuestions": [
    "Does any capability have TypeScript if/else that should be route.handler?",
    "Does every feedback.handler have learning_signals[]?",
    "Are all thresholds from FREEDOM config?"
  ],
  "answers": [
    "No — all branching is in route.handler node n3.",
    "Yes — n5 feedback.handler has OUTCOME signal for xiigen-rag-retrieval-outcomes.",
    "Yes — n3 condition reads ${config.qualityScoreMinSamples}."
  ],
  "modificationsFromQuestioning": [
    "Added FREEDOM config reference to n3 condition — was hardcoded 5."
  ]
}
```

If `modificationsFromQuestioning` is empty and no questions revealed flaws,
include it as an empty array with a note:
```json
"modificationsFromQuestioning": [],
"noModificationsReason": "All questions answered cleanly — no flaws detected."
```

---

## DOWNSTREAM validate.handler CHECKS

The validate.handler after any design-generating ai-generate.handler MUST include:

```json
{
  "checks": [
    {
      "id": "SELF-Q-001",
      "check": "self-questions-present",
      "config": { "minimum": 3 },
      "severity": "score-0"
    },
    {
      "id": "SELF-Q-002",
      "check": "all-questions-answered",
      "required": true,
      "severity": "score-0"
    },
    {
      "id": "SELF-Q-003",
      "check": "modifications-documented",
      "condition": "any answer reveals a flaw",
      "severity": "BUILD_FAILURE"
    }
  ]
}
```

A topology where ai-generate produced a design artifact but the validate.handler
does not check SELF-Q-001 through SELF-Q-003 fails the topology-structure gate.

---

## DOMAIN-SPECIFIC QUESTION SETS

### For flow topology generation (FLOW-39 and similar):

```
1. Does any node use TypeScript if/else for routing?
   → Should be route.handler. Check all ai-generate and feedback nodes.

2. Does every branch have a feedback.handler terminal?
   → Branches that end without feedback lose their learning signal.

3. What would cause this topology to need PromptOps patches?
   → If you can't answer this, the topology probably doesn't learn.

4. Will AF-9 be able to score this topology's output?
   → If output is opaque (TypeScript that doesn't emit events), AF-9 can't judge it.

5. Is there a validate.handler before every route.handler?
   → Route without validate means branching on unvalidated data.
```

### For EngineContract generation:

```
1. Does the factory count match the service count in factoryDependencies?
   → Count them explicitly: ${factories.length} declared, ${services.length} described.

2. Are all ironRules expressed without TypeScript syntax?
   → Iron rules are intent, not implementation. They use prose constraints.

3. Does each AF station configuration describe the correct station's purpose?
   → af1Genesis describes what to generate; af9Judge describes scoring — not swapped.

4. Is the archetype the best fit? What would choosing a different archetype change?
   → This forces consideration of alternatives.
```

### For RAG pattern generation (DpoToRagPromoter, FLOW-38B):

```
1. Are the tags specific enough that only relevant flows retrieve this?
   → Generic tags (service, code, implementation) retrieve for everything.
   → Tags should include the exact check ID or violation keyword.

2. Does the positiveExample show code, not prose?
   → Code examples in RAG patterns are directly usable by AF-1.

3. Will a validate.handler check using these keywords find this pattern?
   → Test mentally: query "store before enqueue DNA-8" → does this pattern appear?
```

---

## INTEGRATION WITH GENESIS PROMPTS

When writing genesis prompts for Phase A seed:

```typescript
// The genesis prompt MUST include QUESTION YOURSELF if it generates design artifacts
const genesisPrompt = `
  Generate a ${archetype} flow topology for: ${capability_description}
  
  Retrieved patterns say:
  ${designPatterns.map(p => p.teachingPoint).join('\n')}

  [Your generation instructions]
  
  QUESTION YOURSELF before finalizing:
  1. Does any node use TypeScript if/else instead of route.handler?
  2. Does every terminal branch have a feedback.handler with learning_signals?
  3. Are all thresholds from FREEDOM config, not hardcoded?
  
  Answer each. Modify if needed. Include selfQuestions[] and answers[] in output.
`;
```

---

## ANTI-PATTERNS

```
❌ "The model is smart enough, it doesn't need to question itself"
   → FLOW-37 v2 missed SkillEvolutionTrigger from the factory table
   → A model that doesn't question itself catches flaws only by accident

❌ "QUESTION YOURSELF section makes prompts too long"
   → A bad design costs 3-5 extra cycles
   → A self-questioning prompt costs 200 tokens
   → The tradeoff is clear

❌ "SELF-Q-001 through SELF-Q-003 are nice-to-have"
   → They are MANDATORY in validate.handler for design-artifact ai-generate nodes
   → Without them, the check never runs — designs ship with uncaught flaws

❌ Listing self-questions without answering them
   → The answers are the value
   → Questions without answers = the model asked but didn't think
```

---

## TEST SCENARIOS

- `ai-generate.handler` produces a topology contract with `selfQuestions: []`
  → FAIL SELF-Q-001: minimum 3 questions required → AF-9 scores this as violation

- Topology has `ai-generate.handler` for pattern content, downstream
  `validate.handler` does NOT check SELF-Q-001
  → ANTI-PATTERN: add the check — detected during topology-structure review

- `selfAnswers` has 2 entries but `selfQuestions` has 3
  → FAIL SELF-Q-002: all questions must be answered → caught before feedback

---

## INTEGRATION

```
Invoked by: topology-structure-SKILL.md (node n4 prompt format)
            planning-skill Gate 5 (genesis prompt quality review)
Enforced by: validate.handler SELF-Q-001 through SELF-Q-003 checks
Used in:    FLOW-37B through FLOW-37G topology contracts (Phase B-F)
            FLOW-38A through FLOW-38G topology contracts (Phase B-F)
            FLOW-39 meta-flow design engine
```
