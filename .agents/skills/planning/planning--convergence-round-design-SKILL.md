---
name: convergence-round-design
sk_number: SK-452
version: "1.1.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-04-07"
contexts: ["web-session", "claude-code"]
description: >
  Defines how to design a convergence session: challenger roles, prompt
  templates, genuine challenge detection, and termination conditions.
  v1.1 adds: DPO triple quality criterion (Gap 3 fix) — pre-flight gate
  that detects over-prescribed or under-constrained plan steps before rounds
  begin, concrete score-spread thresholds for genuine disagreement, and
  retrospective quality flags (OVER_PRESCRIBED, NOISE_SIGNAL, SINGLE_WINNER)
  stored with triples so OssCurriculumRunner can filter out noise.
triggers:
  - "convergence session design"
  - "challenger roles"
  - "challenger prompt"
  - "convergence round"
  - "which challengers"
  - "design convergence for"
  - "convergence topology"
  - "FLOW-37 planning"
  - "before writing convergence session files"
---

# Convergence Round Design Skill (SK-452) v1.1

## WHEN TO INVOKE

Before writing any convergence topology session file.
Before Gate C for FLOW-37 (convergence.handler planning session).
Before writing challenger prompts for any convergence-builder flow.

The session files for a convergence flow cannot pass SK-443 Gate C without
complete challenger prompt templates — this skill provides them.

---

## WHAT A CONVERGENCE SESSION IS

A convergence session runs multi-model conversation until models agree on a
verified NODE representation `{structure, intent, constraints, quality}`.

The conversation structure:
```
Round N:
  1. Proposer generates/updates the NODE representation
  2. Each challenger evaluates it from their expertise domain
  3. Challengers return: APPROVED | CHALLENGE + challenge text | CONTEXT_INSUFFICIENT
  4. Escalation Orchestrator applies rules (SK-446):
     - All APPROVED → consensus reached → DONE
     - Any CHALLENGE → Proposer updates → next round
     - CONTEXT_INSUFFICIENT → resolve context → resume
  5. If max rounds exceeded → STALLED → escalate
```

---

## CHALLENGER ROLE SELECTION

Select challenger roles based on the domain and archetype of the capability being converged.

### Minimum challenger set by archetype

| Archetype | Minimum challengers |
|-----------|---------------------|
| ROUTING | Domain + Principles |
| DATA_PIPELINE | Domain + Security + Principles |
| VALIDATION | Domain + Completeness + Principles |
| ORCHESTRATION | Domain + Security + Business + Completeness + Principles |
| SCHEDULED | Domain + Security + Completeness + Principles |
| INFRASTRUCTURE | Domain + Security + Business + Principles |

### Add optional challengers when:

- Capability emits cross-flow events → add **Business** challenger
- Capability crosses repo/service boundaries → add **Business** challenger
- Capability involves user data or PII → add **Security** challenger (if not already)
- Capability has multi-stack requirement → add **Stack Portability** challenger
- Capability is for an unfamiliar domain (Pascal, legacy system) → add **Domain Expert** challenger with domain-specific context

### Never add challengers for noise

Do not add a Security challenger to a read-only query capability that touches no user data.
Do not add a Business challenger to a single-repo, single-flow capability with no cross-system contracts.
Noise challengers inflate rounds without adding signal. Challenge quality matters more than challenge quantity.

---

## CHALLENGER PROMPT TEMPLATES

Every challenger receives a system prompt that defines its role, its context package,
and its response format. Context isolation is mandatory (P20): each challenger receives
ONLY its defined subset.

### Domain Challenger

```
SYSTEM PROMPT:
You are the Domain Challenger in a NODE convergence session.
Your sole expertise: intent correctness and iron rule completeness for this domain.

You receive:
- The proposed NODE representation
- The capability's iron rules
- The domain context (what this capability does for users)

You DO NOT receive: security patterns, principles text, RAG patterns, other challenger verdicts.

For each challenge you raise, provide:
1. Which field in the NODE is incorrect or incomplete
2. Why it is incorrect (trace to a specific domain invariant)
3. What the correct representation should be

Response format:
{
  "verdict": "APPROVED" | "CHALLENGE" | "CONTEXT_INSUFFICIENT",
  "challenges": [
    { "field": "intent.failureModes", "reason": "...", "correction": "..." }
  ],
  "contextRequests": [
    { "type": "DOWNSTREAM_CONTRACT | BUSINESS_RULE | ...", "target": "...", "question": "..." }
  ]
}

A challenge is GENUINE if: removing it would change what code gets generated.
A challenge is NOISE if: the correction would produce functionally identical code.
Raise only genuine challenges.
```

### Security Challenger

```
SYSTEM PROMPT:
You are the Security Challenger in a NODE convergence session.
Your sole expertise: security properties, DNA-3/5/8 compliance, failure mode coverage.

You receive:
- The proposed NODE representation
- DNA patterns 3, 5, and 8 (full text)
- The capability's declared failure modes

You DO NOT receive: iron rules, domain context, other challenger verdicts, RAG patterns.

Check:
- Does intent.failureModes[] cover all security-relevant failure paths?
- Are there missing failure modes related to: tenant isolation, token lifecycle, data exposure?
- Does intent.invariants[] enforce the critical security properties?

Response format: same as Domain Challenger
```

### Business Challenger

```
SYSTEM PROMPT:
You are the Business Challenger in a NODE convergence session.
Your sole expertise: cross-system consistency — contracts between this capability
and other capabilities, services, or repositories.

You receive:
- The proposed NODE representation
- The list of events this capability emits and consumes
- Any upstream NODE representations from earlier in the same flow

You DO NOT receive: iron rules, principles text, security patterns.

You are looking for:
- Field values that may be transformed by an intermediate handler before reaching their destination
- Event schema fields that downstream consumers may interpret differently than intended
- Cases where this NODE's output depends on an assumption about an upstream system

When you need external data to verify a constraint, emit a CONTEXT_INSUFFICIENT request
with the specific file, schema, or API spec you need.

Response format: same as Domain Challenger
```

### Principles Challenger (ISOLATED — P20)

```
SYSTEM PROMPT:
You are the Principles Arbiter in a NODE convergence session.
Your sole expertise: alignment with XIIGen's M1-M5 and P1-P22 principles and 9 DNA patterns.

M1-M5 (Mission layer):
  M1: Every run produces structured teaching material
  M2: Every station uses specialized arbiter panel
  M3: Teaching first, code is a byproduct
  M4: Zero known defects in delivery
  M5: Engine progress visible at every phase

P14: NODE-first design — no genesis prompt before verified NODE
P15: Design reasoning as training data — decisions captured at Gate C
P17: Arbiter panel — no single judge
P18: DPO triples have curriculumTier, cross-model provenance
P19: Zero known defects — pre-existing banned

DNA patterns: [list all 9 DNA patterns verbatim]

You receive ONLY the above principles and the proposed NODE representation.
You DO NOT receive domain context, iron rules, security patterns, or other verdicts.

Check: does the NODE representation, as written, violate any of the above?

Response format: same as Domain Challenger. Your verdict is BLOCK-class — a CHALLENGE
from you means the NODE cannot be accepted until resolved.
```

### Completeness Challenger

```
SYSTEM PROMPT:
You are the Completeness Challenger in a NODE convergence session.
Your sole expertise: verifying that nothing essential is missing from the NODE.

You receive:
- The proposed NODE representation
- The capability's structure fields (inputShape, outputShape, triggers, emits)

Check:
- Are all declared outputs reachable from the declared inputs?
- Are all declared emits traceable to a condition in intent.invariants or intent.failureModes?
- Are there failure modes in intent.failureModes[] with no corresponding handling path?
- Is intent.purpose specific enough that a different implementation team could build the same thing?

Response format: same as Domain Challenger
```

---

## TERMINATION CONDITIONS

### CONSENSUS_REACHED (happy path)

All challengers return `APPROVED` in the same round.

Verify:
```
□ Every challenger returned APPROVED (not just a majority)
□ The final representation was validated against the last round's challenges
□ No pending CONTEXT_INSUFFICIENT requests
□ convergenceHistory.consensusReachedAt is set
```

### DEFERRED_CONSTRAINT (acceptable provisional)

A CONTEXT_INSUFFICIENT request could not be resolved (HUMAN_JUDGMENT timeout,
or GitHub MCP not connected).

Mark the NODE as provisional:
```json
{
  "node": {
    "convergenceHistory": {
      "consensusReached": false,
      "deferredConstraints": [
        {
          "requestType": "DOWNSTREAM_CONTRACT",
          "target": "repo-B/contracts/queue-handlers.ts",
          "question": "Does the handler strip hyphens from userId before forwarding?",
          "deferredAt": "ISO-TIMESTAMP",
          "unblocks": "CF-N iron rule cannot be finalized until resolved"
        }
      ]
    }
  }
}
```

Generation proceeds with provisional NODE. The generated code is marked with the
DEFERRED_CONSTRAINT — it may need revision when the constraint is resolved.

### STALLED (escalation required)

Max rounds exceeded without consensus. Escalate to planning session.

```bash
# Read the stalled round's unresolved challenges
curl -sf "localhost:3000/api/engine/convergence/${sessionId}/rounds" \
  | jq '.rounds[-1].unresolvedChallenges'
```

Stalling usually means: genuine architectural ambiguity (escalate to Luba),
circular challenges (challenger scope too broad — narrow it), or missing upstream
NODE (convergence order violated — check dependency graph).

---

## THE CONVERGENCE_SESSION TRAINING SIGNAL

Every convergence session produces a training signal. The signal captures what was
learned, not just what was decided.

```json
{
  "signalType": "CONVERGENCE_SESSION",
  "sessionId": "uuid",
  "flowId": "FLOW-XX",
  "nodeId": "T-N",
  "tenantId": "...",
  "rounds": 3,
  "challengersUsed": ["domain", "security", "principles"],
  "contextRequestsEmitted": 1,
  "contextRequestType": "DOWNSTREAM_CONTRACT",
  "consensusReached": true,
  "representationBefore": { "...": "initial representation" },
  "representationAfter": { "...": "final representation" },
  "challengeHistory": [
    {
      "round": 1,
      "challenger": "domain",
      "challenge": "intent.failureModes missing token expiry race condition",
      "resolution": "Added: EXPIRED_TOKEN_CONCURRENT_VERIFICATION to failureModes"
    }
  ],
  "keyInsight": "When a token has a TTL, concurrent verification attempts after expiry must be explicitly modeled as a failure mode"
}
```

The `keyInsight` field is the most valuable for future convergence sessions — it
summarizes what the session learned in one sentence, making it retrievable by AF-4
for similar future capabilities.

---

## ANTI-PATTERNS

```
❌ Challenger prompt without context isolation
   → Principles Challenger receiving iron rules is a P20 violation
   → Each challenger gets ONLY its defined context package

❌ All challengers from the same model family
   → Convergence quality requires different perspectives
   → Use AI_ENGINE for proposer, AI_OPENAI_PROVIDER and AI_GEMINI_PROVIDER for challengers

❌ Adding challengers to appear thorough
   → A Security challenger on a read-only query adds noise, not signal
   → Minimum panel by archetype. Add only when justified.

❌ APPROVED after round 1 with no challenges at all
   → Either the NODE is trivial or the challengers didn't try hard enough
   → 0 challenges from any challenger in round 1 warrants re-running with harder challenge questions

❌ Treating STALLED as equivalent to CONSENSUS
   → STALLED means genuine disagreement exists. It must be escalated.
   → A STALLED NODE used for generation produces wrong code without visible signal.
```

---

## DPO TRIPLE QUALITY CRITERION

A DPO triple is meaningful training signal only when it represents genuine
disagreement. The engine can store syntactically valid triples that teach
nothing — or worse, teach the wrong thing.

**Genuine disagreement requires:**

```
1. Score spread: chosen.score and rejected.score differ by ≥ 1.0 point.
   chosen=9.4 / rejected=9.3 is not disagreement. It is noise dressed as signal.
   A triple where scores are within 0.5 of each other teaches only that
   slightly wordier responses score marginally higher.

2. Model diversity: chosen.model ≠ rejected.model (V9-002, already enforced).
   Additionally: over 10+ rounds, at least 2 different models must win at
   least one round each. If one model wins every round, the other models'
   outputs are not providing genuine alternatives.

3. Round 1 spread: round 1 chosen.score should be 6.5–8.0.
   If round 1 chosen.score ≥ 9.0, the context package is over-prescribed.
   The models have been told so precisely what to produce that there is no
   room for genuine choice. The resulting triples have near-zero training value.
   → CONTEXT_INSUFFICIENT: context package is over-constraining generation.

4. Score trend: chosen.score should rise across rounds (stagnation ~round 12–15).
   A flat score across all rounds means the context is not accumulating
   useful signal and the models are not learning from each other.
   Stagnation on round 1 or 2 means over-prescription (see criterion 3).
```

**Pre-flight check — run before Cycle 2 begins:**

Before the first round fires, evaluate the plan step against these criteria.
If any criterion predicts failure, emit CONTEXT_INSUFFICIENT before running
rounds — not after inspecting the results.

```
Pre-flight gate for each plan step:

□ Step describes one isolatable responsibility
  (bundled steps → all providers solve the same problem → convergence)

□ Step contains at least one domain-specific constraint
  (generic steps give providers nothing to choose between)

□ Step cannot be trivially solved from the step text alone
  Test: "Could a model derive the correct implementation from this step
  without any domain knowledge?" If yes → step is over-constrained.
  Context package must add domain-specific difficulty, not specification.

□ At least one legitimate approach exists that a model might not choose
  (if there is only one correct approach, disagreement is impossible)

If any gate fails:
  → CONTEXT_INSUFFICIENT: "Plan step '[text]' is [over-constrained /
    too generic / single-approach] — round 1 will converge immediately.
    Required: [what domain-specific constraint is missing]."
  → Halt. Do not begin rounds. Surface to orchestrator for resolution.
```

**Retrospective quality check — run after rounds complete:**

```
After Cycle 2 produces triples for a step:

□ round 1 chosen.score in 6.5–8.0 range
  If > 9.0: log OVER_PRESCRIBED warning. Triple stored but flagged.

□ score spread (chosen - rejected) ≥ 1.0 across majority of rounds
  If < 0.5 on average: log NOISE_SIGNAL warning. Triples stored but
  flagged. These will not improve OSS curriculum calibration.

□ at least 2 distinct models won at least 1 round each over the session
  If one model won all rounds: log SINGLE_WINNER warning.

Warnings are stored with the triple. OssCurriculumRunner filters out
NOISE_SIGNAL triples before seeding — they are not used for curriculum.
```

---

## INTEGRATION

```
Invoke before:  FLOW-37 planning session Gate C
Invoke when:    Writing any convergence-builder session file
Produces:       Challenger prompt templates for session files (required for SK-443)
                CONVERGENCE_SESSION training signals
Feeds into:     code-execution--node-convergence-SKILL.md (SK-435) — execution
                planning--arbiter-panel-design-SKILL.md (SK-442) — panel design at runtime
                planning--escalation-orchestrator-SKILL.md (SK-446) — verdict collection rules
References:     planning--system-intake-SKILL.md (SK-453) — context package assembly
```
