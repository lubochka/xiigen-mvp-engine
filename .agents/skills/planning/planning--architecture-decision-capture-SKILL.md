---
name: architecture-decision-capture
sk_number: SK-450
version: "1.0.0"
priority: HIGH
load_order: 98
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Gate C does not pass without FLOW-XX-ARCHITECTURE-DECISIONS.json.
  This skill defines what counts as a significant decision, how to write
  a DESIGN_REASONING triple that the engine can retrieve and learn from,
  and how to seed the decisions into the RAG so future planning sessions
  are informed by prior reasoning. Decisions captured poorly produce
  low-quality RAG patterns that degrade future plans.
triggers:
  - "gate C"
  - "architecture decisions"
  - "ARCHITECTURE-DECISIONS.json"
  - "what decisions were made"
  - "capture this decision"
  - "design reasoning"
  - "DESIGN_REASONING"
  - "before session files"
  - "significant decision"
---

# Architecture Decision Capture Skill (SK-450) v1.0

## WHEN TO INVOKE

At Gate C — after planning produces a plan, before session files are written.
Every planning session that produces session files MUST produce an
`FLOW-XX-ARCHITECTURE-DECISIONS.json` file. Gate C does not pass without it.

Also invoke when a significant decision is made mid-session — capture it immediately
rather than reconstructing at Gate C from memory.

---

## WHAT COUNTS AS A SIGNIFICANT DECISION

A decision is significant if the engine would need to know it to design a similar
capability correctly in a future flow. The test:

> "If FLOW-15 encountered a similar situation, would knowing this decision save
> at least one planning session of rework?"

If YES → capture it.

**Decision types that are always significant:**

| Type | Description | Example |
|------|-------------|---------|
| `CAPABILITY_CLASSIFICATION` | Q1-Q4 gate result with non-obvious reasoning | T48 classified as PROCESSING not ROUTING because wait is time-bounded, not decision-bounded |
| `INCOMPATIBLE_RECLASSIFICATION` | Stack verdict changed from INCOMPATIBLE to IMPL_VARIES_WITH_PROVIDER | T48 WordPress reclassified — ISchedulerService fabric added |
| `DEPENDENCY_DIRECTION` | Why a capability is Wave -1 vs Wave 1 | SSE to FLOW-40 Wave -1: 23 flows depend on it |
| `IRON_RULE_DERIVATION` | Non-obvious rule traced to a specific failure mode | Token revocation rule derived from token lifecycle race condition |
| `WAVE_ASSIGNMENT` | Why this flow runs before or after another | FLOW-27 Human Gate before user-facing flows: cross-cutting dependency |
| `FABRIC_INTRODUCTION` | Why a new fabric interface was added | ISchedulerService added to abstract Bull from WordPress Action Scheduler |
| `BFA_CONFLICT` | Cross-flow invariant conflict detected and resolved | FLOW-01 saga compensation timing vs FLOW-03 payment confirmation |
| `ARCHITECTURE_PATTERN` | A general pattern established for future flows | "If N > 2 flows depend on X, X is infrastructure at Wave -1" |

**What is NOT significant:**

- Decisions that follow directly from a principle or DNA pattern (no reasoning needed)
- Artifact number assignments (tracked in RAG separately)
- Test framework choices (implementation detail)
- Individual iron rules (captured in contracts, not in architecture decisions)

---

## THE DESIGN_REASONING TRIPLE FORMAT

```json
{
  "decisionId": "D-XX-N",
  "type": "CAPABILITY_CLASSIFICATION | INCOMPATIBLE_RECLASSIFICATION | DEPENDENCY_DIRECTION | IRON_RULE_DERIVATION | WAVE_ASSIGNMENT | FABRIC_INTRODUCTION | BFA_CONFLICT | ARCHITECTURE_PATTERN",
  "question": "one sentence — what was decided? (the retrievable key)",
  "reasoning": "why this decision — what alternatives were considered and rejected?",
  "principle": "which principle, DNA pattern, or architectural rule this applies",
  "outcome": "the decision made — what is now true as a result"
}
```

**The question field is the retrieval key.** When AF-4 retrieves architecture decisions,
it matches against `question` semantically. A vague question produces poor retrieval.

```
BAD:  "question": "T48 design"
GOOD: "question": "Should T48 WordPress be INCOMPATIBLE or IMPL_VARIES_WITH_PROVIDER?"

BAD:  "question": "Wave assignment"
GOOD: "question": "Should SSE push infrastructure live in FLOW-01 or as separate Wave -1 flow?"
```

**The reasoning field is what teaches the engine.** A decision that says "we decided X"
teaches nothing. A decision that says "we considered A and B; A was rejected because it
creates wrong dependency direction for 23 downstream flows; B was chosen because..." gives
the engine the classification logic, not just the classification.

---

## THE COMPLETE FILE FORMAT

```json
{
  "flowId": "FLOW-XX",
  "producedAt": "ISO-TIMESTAMP",
  "sessionType": "PLANNING",
  "architectureDecisions": [
    {
      "decisionId": "D-XX-1",
      "type": "INCOMPATIBLE_RECLASSIFICATION",
      "question": "Should T48 WordPress be INCOMPATIBLE or IMPL_VARIES_WITH_PROVIDER?",
      "reasoning": "WordPress has no reliable 24h scheduler natively. But Action Scheduler plugin provides equivalent mechanism. The incompatibility is at the provider level (scheduler mechanism), not the design level (time-bounded wait state). ISchedulerService fabric already abstracts scheduler providers. The question is: is this mechanism-level or design-level? Mechanism-level incompatibilities become IMPL_VARIES_WITH_PROVIDER + fabric interface + FREEDOM config key.",
      "principle": "P14 NODE-First Design: INCOMPATIBLE at mechanism level → IMPL_VARIES_WITH_PROVIDER + fabric interface",
      "outcome": "T48 reclassified to IMPL_VARIES_WITH_PROVIDER. ISchedulerService covers Bull (NestJS) and Action Scheduler (WordPress). FREEDOM config: xiigen.scheduler_provider."
    }
  ]
}
```

Minimum 3 decisions per planning session. A planning session with fewer than 3 significant
decisions either had trivial scope (unlikely) or decisions were missed (more likely).

---

## SEEDING TO RAG AT PHASE A

After Gate C approval, the decisions must be seeded to `xiigen-rag-patterns` at Phase A
start. Without seeding, the decisions exist in a file but cannot be retrieved by AF-4.

```bash
# Seed FLOW-XX-ARCHITECTURE-DECISIONS.json to RAG
node -e "
const fs = require('fs');
const decisions = JSON.parse(fs.readFileSync('FLOW-XX-ARCHITECTURE-DECISIONS.json'));
const token = process.env.XIIGEN_TOKEN || '';

for (const d of decisions.architectureDecisions) {
  const doc = {
    patternId:       d.decisionId,
    patternType:     'ARCHITECTURE_DECISION',
    flowId:          decisions.flowId,
    decisionType:    d.type,
    semanticContent: d.question + ' ' + d.reasoning.slice(0, 200),
    content:         JSON.stringify(d),
    qualityScore:    0.70,
    createdAt:       decisions.producedAt,
  };
  fetch('http://localhost:9200/xiigen-rag-patterns/_doc/' + d.decisionId, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'xiigen-community' },
    body: JSON.stringify(doc)
  }).then(r => r.json()).then(r => console.log(d.decisionId, r.result));
}
"

# Verify decisions are indexed
curl -sf "localhost:9200/xiigen-rag-patterns/_count" \
  -d '{"query":{"term":{"patternType.keyword":"ARCHITECTURE_DECISION"}}}' | jq .count
# Expected: at least 3 (this flow's decisions)
```

---

## RETROACTIVE CAPTURE

For flows that ran before this skill existed, capture decisions retroactively from:
- Session transcripts and chat history
- DECISIONS-LOCKED.md entries
- Planning session outputs where reasoning was documented

The retroactive capture is less valuable than real-time capture (some context is lost),
but it is far better than nothing. Every captured decision reduces the engine's need to
re-derive reasoning in future sessions.

---

## ANTI-PATTERNS

```
❌ Gate C approved without ARCHITECTURE-DECISIONS.json
   → Gate C does not pass without it. Produce it before claiming Gate C.

❌ Decisions written as: "We decided to use ISchedulerService"
   → The outcome without the reasoning teaches nothing.
   → Write why ISchedulerService was chosen over alternatives.
   → The reasoning is the value. The outcome is just metadata.

❌ Only capturing obvious decisions
   → "T47 is ROUTING because it routes auth pathways" — too obvious to capture
   → Capture the non-obvious: why T48 is PROCESSING not ROUTING despite having a wait state

❌ Producing decisions after session files, from memory
   → Decisions should be captured as they are made, or at Gate C before session files
   → Memory reconstruction produces thinner reasoning than real-time capture

❌ Question field written as a statement, not a question
   → "T48 reclassification" is not retrievable by AF-4 semantic search
   → "Should T48 WordPress be INCOMPATIBLE or IMPL_VARIES_WITH_PROVIDER?" is retrievable
```

---

## INTEGRATION

```
Invoke at:     Gate C — before session files are produced
Invoke during: any planning session when a significant decision is made
Produces:      FLOW-XX-ARCHITECTURE-DECISIONS.json
               Seeds to: xiigen-rag-patterns (patternType: ARCHITECTURE_DECISION) at Phase A
Feeds into:    AF-4 retrieval (future planning sessions retrieve prior decisions)
               planning--architectural-decision-testing-SKILL.md (SK-438) — tests if decisions held
References:    planning--session-file-authoring-SKILL.md (SK-443) — Gate C checklist
               PATCH--how-to-prepare-a-plan-NODE-prereq-Gate-C.md — Gate C requirement
```

---

## RECONCILE — core `decision-capture` parity (G02 refresh from llm_mvp_core)

**G02 is the canonical owner of this skill** (G11 only consumes it in load order).
SK-450 already enforces the one-sentence significance test, the Question-as-question
retrieval key, and a per-session threshold (mvp ≥3, stronger than core's ≥2). Two
reconcile completions:

**(A) The 8 mvp decision types subsume the 6 core types** — confirm none is dropped:

```
core CAPABILITY_CLASSIFICATION ≡ mvp CAPABILITY_CLASSIFICATION
core INTERFACE_INTRODUCTION    ≡ mvp FABRIC_INTRODUCTION
core DEPENDENCY_DIRECTION      ≡ mvp DEPENDENCY_DIRECTION
core IRON_RULE_DERIVATION      ≡ mvp IRON_RULE_DERIVATION
core ARCHITECTURE_PATTERN      ≡ mvp ARCHITECTURE_PATTERN
core LOCKED_DECISION_OVERRIDE  ≡ (mvp: a reopening captured via SK-417 + an ARCHITECTURE_PATTERN/IRON_RULE row)
(mvp adds INCOMPATIBLE_RECLASSIFICATION, WAVE_ASSIGNMENT, BFA_CONFLICT — extra, not fewer)
```
A decision typed `GENERAL` was not classified; every significant decision fits a type.

**(B) Routing: DECISIONS-LOCKED.md vs session note (core Section 4).** SK-450 seeds to
RAG / `FLOW-XX-ARCHITECTURE-DECISIONS.json`; the core also splits durable vs scoped:

```
Write to DECISIONS.md / DECISIONS-LOCKED.md when      Keep as a session/RAG note when
-------------------------------------------------     ---------------------------------
affects ≥2 capability classes                          specific to one implementation
sets a pattern for future flows                        current-session scope only
would be challenged without documentation              obvious from the code
needs "NEVER reopen without Luba" (3+ flows depend)    can safely be revisited
overrides a prior locked decision                      supplements, does not override
```
Reasoning (not the outcome) is the value: "we considered A and B; A rejected because
wrong dependency direction for N flows; B chosen because…" teaches the classification
logic. `Reasoning` references DNA Rules and FLOW invariants. (Core uses `dotnet`; the
post-update verification for a locked-decision change is `npm run build` + `npx jest`,
via SK-417.)
