---
name: node-convergence
sk_number: SK-435
version: "2.1.0"
priority: HIGH
load_order: 1
category: code-execution
author: luba
updated: "2026-04-01"
contexts: ["claude-code", "web-session"]
description: >
  Execution guide for building a NODE — the verified {structure, intent,
  constraints, quality} representation of a capability — through multi-model
  convergence. Used before any genesis prompt is written. Covers two input
  paths: PATH A (pre-authored EngineContract) and PATH B (plain-language plan
  step from Cycle 1 — no pre-authored contract, no task type ID). PATH B is
  the self-building loop path. PATH A is the current engine path. Covers
  pre-convergence assembly, CONTEXT_INSUFFICIENT handling, and verification.
  REQUIRES convergence.handler infrastructure (Task 7 of pre-FLOW-01 list).
triggers:
  - "run convergence for"
  - "build NODE for"
  - "NODE convergence"
  - "CONTEXT_INSUFFICIENT"
  - "convergence stalled"
  - "build representation"
  - "before writing genesis prompt"
  - "plan step to NODE"
  - "Cycle 2 input"
  - "no task type ID"
  - "convergence from plan step"
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

## CYCLE 2 INPUT: TWO PATHS

Convergence receives one of two input types. The path determines how the
context package is assembled and what the nodeId looks like.

### PATH A — PRE-AUTHORED CONTRACT (current engine)

Input: an `EngineContract` with a pre-known `taskTypeId`. Iron rules are
human-authored. Archetype is assigned before convergence runs.

Use Step 1 and Step 2 as written below. This is the current engine path.

### PATH B — PLAN STEP (self-building loop, Cycle 2)

Input: a plain-language step text from Cycle 1 output — no `taskTypeId`,
no pre-authored contract, no archetype. The NODE is built from the step
text alone. The AI derives all four NODE fields from the step content.

**This is the path that must NOT fall back to PATH A behavior.**
If ConvergenceHandler sees a plan step and builds a handler expecting
an EngineContract, the architectural pivot has failed.

#### PATH B: Context package assembly (SK-522 fields)

| SK-522 field | What it receives in Cycle 2 PATH B |
|-------------|-----------------------------------|
| INTENT | The plan step verbatim — character-for-character. Never rephrase. |
| DOMAIN | Same domain description used in Cycle 1 — carried forward unchanged. |
| CONSTRAINTS | DNA rules (9 patterns) + BFA conflict rules for this domain. Same as Cycle 1 CONSTRAINTS. |
| PRIOR_ART | RAG query string: `"node representations for [step keyword] [domain]"`. NOT inline content. |
| SUCCESS | NODE format spec: 4 fields present, non-empty per field rules in Step 5, stack-neutral. |

Verify all 8 checks from SK-522 Section 4 pass before submitting.

#### PATH B: Challenger roles

Challenger roles are derived from what the step involves — not from a
pre-assigned archetype:

| Step involves | Challenger roles |
|--------------|-----------------|
| Data in / data out boundary | domain, schema, business |
| Cross-service coordination | domain, security, business |
| State transition or lifecycle event | domain, business, completeness |
| External integration | domain, security, completeness |
| Default (any other step) | domain, security, business, completeness |

#### PATH B: nodeId format

`${flowId}::step-${stepIndex}::${stepKeyword}`

No `taskTypeId` in the nodeId. Example: `FLOW-01::step-2::identity-creation`

#### PATH B: Submission (replaces Step 2 for this path)

```json
POST /api/engine/convergence
{
  "nodeId": "${flowId}::step-${stepIndex}::${stepKeyword}",
  "inputPath": "PLAN_STEP",
  "domainContext": {
    "stepText": "${plan step verbatim — SK-522 INTENT field}",
    "domain": "${2–3 sentence domain description — SK-522 DOMAIN field}",
    "constraints": ["${DNA rule (DNA-N)}", "..."],
    "priorArtQuery": "${RAG query string — SK-522 PRIOR_ART field}",
    "challengerRoles": ["${derived from step content per table above}"]
  },
  "upstreamNodes": ["${completed nodeIds from earlier steps in this plan}"],
  "maxRounds": 5
}
```

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

### PATH B additional verification (plan-step-derived NODEs)

When the NODE was built from a plain-language plan step (PATH B), run
these checks in addition to the standard checklist above.

"Non-empty" means different things depending on what the input was:

| Field | Non-empty means (PATH B) | Fails if |
|-------|--------------------------|---------|
| `structure.inputShape` | A named shape with field names and types — no class names | Contains `Dto`, `Entity`, `class`, or any proper noun |
| `structure.outputShape` | `DataProcessResult<{ … }>` with field names — not `Promise<ServiceResult>` | Contains a class name or assumes a stack type |
| `intent.purpose` | One sentence describing what a user gains from this step | Describes what the system does internally ("calls X", "runs Y") |
| `intent.scope` | Names what this NODE covers and what it does NOT cover | Missing the NOT — scope without boundary is unbounded |
| `constraints` | At least one DNA rule cited by code (DNA-N) | Contains only prose preferences or technology choices |
| `quality.scoringCriteria` | Observable outcomes that can be TRUE or FALSE from the outside | Contains test method names, coverage percentages, or internal checks |

```
□ No field contains a class name, service name, or framework name
□ intent.purpose describes user outcome — not internal system behaviour
□ constraints list at least one DNA rule by code
□ quality.scoringCriteria are externally observable (could be checked by a tester with no code access)
□ structure fields describe shapes, not types from an existing codebase
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

## QUESTION YOURSELF — NODE GENERATOR AI

Read this before producing a NODE candidate. The questions prevent the most
common failure mode: outputting an implementation plan instead of a structural
representation.

A NODE is a representation of **what a capability needs to do**.
It is NOT a plan for how to implement it.

**Before submitting your NODE candidate, verify each field:**

**1. `structure.inputShape` — names a shape, not a class**

```
GOOD: { userId: string, tenantContext: implicit }
BAD:  RegisterUserDto                              ← class name, not a shape
BAD:  UserRegistrationRequest                     ← class name, assumes a codebase
```
If you wrote a proper noun: replace it with field names and types.

**2. `structure.outputShape` — names a shape, not a return type**

```
GOOD: DataProcessResult<{ userId: string, verificationPending: boolean }>
BAD:  Promise<User>                               ← assumes a User class and a JS stack
BAD:  ServiceResult<RegisteredUser>               ← assumes a framework type
```
If you wrote a class name or Promise generic: describe the actual fields.

**3. `intent.purpose` — describes what a user gains, not what the system does**

```
GOOD: "User identity is created and awaiting verification"
BAD:  "Calls UserService.create() and enqueues verification email"  ← implementation
BAD:  "Handles user registration through the service layer"          ← system behaviour
```
Test: would this make sense to a business analyst with no code access?
If yes: it is intent. If no: it is implementation.

**4. `constraints` — lists verifiable conditions, not technology choices**

```
GOOD: "User record stored before verification email enqueued (DNA-8)"
BAD:  "Use Redis distributed lock for race condition handling"        ← technology choice
BAD:  "Must be secure and performant"                                ← unverifiable preference
```
Each constraint must have a failing check. If you cannot state what breaks
when the constraint is violated: it is not a constraint, it is a preference.

**5. `quality.scoringCriteria` — observable outcomes, not test method names**

```
GOOD: "Duplicate email within same tenant is rejected with CONFLICT status"
BAD:  "testUserCreationService() passes"                             ← test method name
BAD:  "90% line coverage achieved"                                   ← coverage metric, not outcome
```
Test: can a tester with no code access verify this criterion from the outside?
If yes: it is an observable outcome. If no: it is an internal implementation check.

**If any answer triggers a BAD pattern:** revise that field before the round
closes. The judge will reject a NODE candidate that mixes representation
with implementation. One rejected round extends the convergence session;
one rejected NODE restarts it.

---

## INTEGRATION

```
Invoke before: Phase B generation (any flow)
Invoke when:   Writing any genesis prompt — build NODE first
Produces:      Verified NodeRepresentation + seeded to RAG
Feeds into:    AF-1 prompt construction (receives NodeRepresentation as context)
References:    planning--node-design-review-SKILL.md (review the output)
               code-execution--learning-signal-capture-SKILL.md (CONVERGENCE_SESSION signal)
               planning--ai-context-package-authoring-SKILL.md (SK-522) — PATH B context package
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
