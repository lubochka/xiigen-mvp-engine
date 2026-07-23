---
name: node-convergence
sk_number: SK-435
version: "2.0.0"
priority: HIGH
load_order: 1
category: code-execution
author: luba
updated: "2026-03-25"
contexts: ["claude-code", "web-session"]
description: >
  Execution guide for building a NODE — the verified {structure, intent,
  constraints, quality} representation of a capability — through multi-model
  convergence. Used before any genesis prompt is written. Covers pre-convergence
  assembly, CONTEXT_INSUFFICIENT handling, and verification of output.
  REQUIRES convergence.handler infrastructure (Task 7 of pre-FLOW-01 list).
triggers:
  - "run convergence for"
  - "build NODE for"
  - "NODE convergence"
  - "CONTEXT_INSUFFICIENT"
  - "convergence stalled"
  - "build representation"
  - "before writing genesis prompt"
---

# Node Convergence Skill v1.0

## PREREQUISITE

`convergence.handler` must be ACTIVE (Task 7 of pre-FLOW-01 task list).

Until it exists: build NODEs manually in the REFERENCE-PLAN.md using the
schema from `reference--contract-template.md` `node:` field. Capture the
design reasoning as DESIGN_REASONING signals manually at Gate C.

---

## WHAT A NODE IS

```
NODE = {structure, intent, constraints, quality}
     = the verified, stack-neutral understanding of what a capability needs to do
     = built by multi-model conversation until consensus
     = immutable once verified
     = the input from which genesis prompts are DERIVED (not authored independently)
```

A node is NOT a service. It is the understanding of what a service needs to do.
The service is generated from the node. The node exists independently of any stack.

---

## STEP 1: ASSEMBLE DOMAIN CONTEXT PACKAGE

Before submitting to convergence, gather:

```bash
# 1. Task type contract (EngineContract)
cat server/src/engine-contracts/FLOW-XX-contracts.ts | grep -A 50 "T${N}:"

# 2. Existing stackCoupling annotations
cat server/src/engine-contracts/FLOW-XX-contracts.ts | grep -A 20 "stackCoupling"

# 3. Related event schemas
ls contracts/events/FLOW-XX/

# 4. Upstream NODE representations (from completed nodes in same flow)
curl -sf "localhost:9200/xiigen-rag-patterns/_search" \
  -d '{"query":{"term":{"patternType.keyword":"NODE_REPRESENTATION"}},
       "filter":{"term":{"flowId":"FLOW-XX"}},"size":10}' \
  | jq '.hits.hits[]._source.nodeId'

# 5. Relevant ARCHITECTURE_DECISION patterns
curl -sf -X POST localhost:3000/api/rag/search \
  -d '{"query":"${domain} architectural decisions capability classification","topK":5}'
```

---

## STEP 2: SUBMIT CONVERGENCE REQUEST

```bash
curl -X POST localhost:3000/api/engine/convergence \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "${flowId}::${taskTypeId}",
    "domainContext": {
      "taskTypeId": "${taskTypeId}",
      "capabilityName": "${name}",
      "archetype": "${archetype}",
      "domain": "${domain}",
      "contractContent": "${contract text}",
      "upstreamEvents": ["${events this receives}"],
      "downstreamEvents": ["${events this emits}"]
    },
    "upstreamNodes": ["${completedNodeIds}"],
    "targetStacks": ["node-nestjs", "php-wordpress", "php-laravel"],
    "maxRounds": 5
  }'
```

---

## STEP 3: MONITOR CONVERGENCE ROUNDS

Each round produces:
- Proposer's current representation
- Each challenger's verdict: `APPROVED` | `CHALLENGE`
- Challenge content if any
- Context requests if any (type + target)

**Model roles:**
- Proposer: generates the representation
- Domain challenger: checks intent and iron rule correctness
- Security challenger: checks security properties and failure modes
- Business challenger: checks cross-system consistency and field contracts
- Completeness challenger: checks that nothing is missing

---

## STEP 4: HANDLE CONTEXT_INSUFFICIENT

When a challenger cannot verify a constraint without external data:

```
DOWNSTREAM_CONTRACT  → GitHub MCP: get file from target repo
  github_get_file_contents(path="contracts/...", ref="main")

REST_CONTRACT        → GitHub MCP: get OpenAPI spec from target repo
  github_get_file_contents(path="api-spec.yaml", ref="main")

SCHEMA_VERSION       → RAG query: schema history documents
  POST localhost:3000/api/rag/search -d '{"query":"${schema} version history","topK":3}'

BUSINESS_RULE        → RAG query: ARCHITECTURE_DECISION patterns
  POST localhost:3000/api/rag/search -d '{"query":"${decision context}","topK":5}'

HUMAN_JUDGMENT       → Escalate to Luba
  If no response in 24h → mark as DEFERRED_CONSTRAINT, continue with flag
```

Resume convergence with the retrieved context:
```bash
curl -X POST localhost:3000/api/engine/convergence/resume \
  -d '{"sessionId": "...", "contextProvided": {...}}'
```

---

## STEP 5: VERIFY CONVERGENCE OUTPUT

```
□ consensusReached: true (not PARTIAL_CONSENSUS or STALLED)
□ NODE has all four properties with non-empty values:
    structure.inputShape, outputShape, dependencies, triggers, emits
    intent.purpose (one sentence), invariants[], failureModes[], domainConcepts[]
    constraints[]: CF-N rules, not prose
    quality.scoringCriteria[], acceptanceThreshold, degradationAcceptable
□ stackProfiles present for all target stacks
□ No INCOMPATIBLE stack without mitigation
□ CONVERGENCE_SESSION signal stored to xiigen-convergence-sessions
□ NODE seeded to xiigen-rag-patterns as NODE_REPRESENTATION document
```

---

## STEP 6: IF STALLED

Reason: max rounds exceeded without consensus.

```bash
# Read last round's unresolved challenges
curl -sf "localhost:3000/api/engine/convergence/${sessionId}/rounds" \
  | jq '.rounds[-1].unresolvedChallenges'
```

Common causes and responses:

| Cause | Response |
|-------|----------|
| CONTEXT_INSUFFICIENT → DEFERRED_CONSTRAINT | Resume when Luba resolves; mark output as provisional |
| Genuine architectural ambiguity | Escalate to planning session; record as OPEN question |
| Challenger producing circular challenges | Check challenge validity; may need to narrow the challenge scope |
| Missing upstream NODE | Build upstream NODE first (dependency ordering) |

---

## DEPENDENCY ORDERING

NODEs within a flow have a dependency graph. The convergence orchestrator resolves it:

```
A1 must complete before A2 if A2 needs facts from A1.
A1 → A2 → A3 is the correct order if A3 depends on A2 which depends on A1.
```

If A3's business arbiter discovers A1 is wrong: escalation → orchestrator reopens A1
with new context → A1 re-verified → correction propagates to A2 and A3.

**Verified facts from completed NODEs are immutable within the session.**
A3 cannot re-challenge A1. A3 can only escalate if A1 is wrong.

---

## GENESIS PROMPT DERIVATION

After NODE is verified, the genesis prompt is derived — not authored:

```
Section 1: intent.purpose + intent.invariants + constraints (stack-neutral)
Section 2: structure.inputShape + structure.outputShape (stack-neutral)
Section 3: quality.scoringCriteria (stack-neutral)
Section 4: stackProfiles[targetStack].implementationNotes (stack-specific)
```

One NODE → N genesis prompts (one per target stack). No manual authoring per stack.

---

## INTEGRATION

```
Invoke before: Phase B generation (any flow)
Invoke when:   Writing any genesis prompt — build NODE first
Produces:      Verified NodeRepresentation + seeded to RAG
Feeds into:    AF-1 prompt construction (receives NodeRepresentation as context)
References:    planning--node-design-review-SKILL.md (review the output)
               code-execution--learning-signal-capture-SKILL.md (CONVERGENCE_SESSION signal)
```

---

## RUNTIME APPLICATION — THIS PATTERN EXTENDS TO ALL AF STATIONS

The convergence model (proposer + specialized challengers, blind evaluation, no
cross-arbiter visibility) is not only a planning-time tool. It is the correct
execution architecture for every AF station where AI quality judgment occurs.

**The mapping — convergence roles to runtime arbiters:**

| Convergence role | AF-1 runtime equivalent | AF-9 runtime equivalent |
|-----------------|------------------------|------------------------|
| Proposer | AI_ENGINE (primary generator) | iron_rules evaluator |
| Domain challenger | AI_OPENAI_PROVIDER / AI_GEMINI_PROVIDER | business_logic evaluator |
| Security challenger | AI_SECURITY_ARBITER | security evaluator |
| Business challenger | (generates variation for comparison) | iron_rules evaluator |
| Completeness challenger | (generates variation for comparison) | completeness evaluator |
| Convergence orchestrator | Escalation Orchestrator (SK-446) | Escalation Orchestrator (SK-446) |
| (absent in planning) | — | Key Principles Arbiter (SK-444) |
| (absent in planning) | — | Skills & Patterns Arbiter |
| (absent in planning) | — | Prompts Compliance Arbiter |

**Key invariants that carry over to runtime:**

1. No model sees another model's output before producing its own (blind)
2. Each arbiter receives only its defined expertise context — no cross-contamination
3. Outputs are labeled (A/B/C) before judging — model attribution stripped
4. Disagreement between models is recorded as ARBITER_DISAGREEMENT signal, not averaged
5. Consensus failure routes to Escalation Orchestrator, not to re-run with same models

**Infrastructure note:**
`convergence.handler` (Task 7) is needed for planning-time execution of this skill.
The runtime arbiter panel (SK-442 + SK-446 + SK-444) runs via GenericNodeExecutor
with multiple IAiProvider instances — no additional infrastructure gate required
beyond having multiple provider keys configured. The pattern is the same; the
execution context is different.

**See:**
- `planning--arbiter-panel-design-SKILL.md` (SK-442) — per-station arbiter configuration
- `planning--escalation-orchestrator-SKILL.md` (SK-446) — consensus rules and escalation
- `planning--principles-arbiter-SKILL.md` (SK-444) — isolation rule and operating manual
- P17 in `PATCH--xiigen-core-principles-M1-M5-P17-P22.md` — the governing principle
