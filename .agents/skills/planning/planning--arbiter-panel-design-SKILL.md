---
name: arbiter-panel-design
sk_number: SK-442
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-03-25"
contexts: ["web-session", "claude-code"]
description: >
  Governs how to design the arbiter panel for any AF station that makes a
  quality-affecting AI judgment. Covers the 7 arbiter roles, their context
  packages, minimum panel by archetype, and the upper judge expansion protocol.
  Use before authoring any AF-6, AF-7, or AF-9 prompt configuration, and before
  writing any topology ai-generate or score.handler node.
triggers:
  - "arbiter panel"
  - "arbiter design"
  - "arbiter expertise"
  - "which arbiters"
  - "judge configuration"
  - "before writing AF-9"
  - "before writing AF-6"
  - "before authoring judge prompt"
  - "evaluator decomposition"
  - "score.handler arbiters"
---

# Arbiter Panel Design Skill (SK-442) v1.0

## ORIGIN

Extracted from M2 (Every AI judgment uses a specialized panel) and P17 (Arbiter Panel
Evaluation). Gap 3 in FLOW-DESIGN-SKILL-INDEX was "arbiters uniform — deferred." This
skill closes that gap.

## WHEN TO INVOKE

- Before authoring any AF-6 (review), AF-7 (compliance), or AF-9 (score) prompt
- Before writing any topology ai-generate.handler or score.handler node
- When adding a new task type to any contract (arbiterConfig must be declared)
- When the convergence.handler produces a NODE (NODE quality.scoringCriteria[] maps to arbiters)

---

## THE 7 ARBITER ROLES

Each arbiter is a separate model call. Each receives ONLY its own context package.
No arbiter ever sees another arbiter's verdict or the model that generated the code.

---

### 1. Business Logic Arbiter

**Expertise scope:** Iron rules + domain event contracts + BFA CF rules for this task type

**Context package (ONLY these — no other context):**
- `contract.ironRules[]` — every iron rule for this task type
- `node.intent.invariants[]` — business invariants from the NODE
- Upstream + downstream event schemas for this task type
- BFA CF rules that apply to this flow (from `bfa-conflict-arbitration-contracts.ts`)

**Verdict class:** BLOCK_OR_PASS

**Catches:** Iron rule violations, wrong event emissions, business invariant violations,
BFA conflict creation that the iron rules were supposed to prevent.

**Does NOT catch:** Security vulnerabilities, fabric interface misuse, principle violations,
prompt quality. Those are other arbiters' domains.

---

### 2. Security Arbiter

**Expertise scope:** Tenant isolation + auth + data exposure + failure modes

**Context package (ONLY these):**
- DNA-3 (no throw in business logic)
- DNA-5 (tenantId on every DB write)
- DNA-8 (storeDocument before enqueue)
- `contract.stackCoupling.failureModes[]`
- Input validation requirements for this task type

**Verdict class:** BLOCK_OR_PASS

**Catches:** Missing tenantId, silent failure paths, data leakage between tenants,
missing input validation, auth bypass patterns.

---

### 3. Skills & Patterns Arbiter

**Expertise scope:** RAG-retrieved patterns for this archetype

**Context package (ONLY these):**
- Patterns retrieved from `xiigen-rag-patterns` for this archetype (from rag-retrieve.handler output)
- `DISTILLED_RULE` entries from `xiigen-distilled-rules` for this domain
- Fabric interface registry (which interfaces the code should use vs which SDKs are banned)

**Verdict class:** CHALLENGE_OR_PASS

**Catches:** Code that reinvents what a skill already provides, incorrect fabric interface
usage (e.g., importing ioredis directly instead of IScopedMemoryService), patterns
that contradict established domain conventions.

---

### 4. Prompts Compliance Arbiter

**Expertise scope:** Genesis prompt adherence + teachability

**Context package (ONLY these):**
- The genesis prompt text that produced this code
- The output format specification from the genesis prompt
- The self-questioning requirements (selfQuestionsRequired count + questions)

**Verdict class:** CHALLENGE_OR_PASS

**Catches:** Code that ignored the genesis prompt's instructions, unanswered self-questions,
output format violations, genesis prompts that are so prescriptive the generated code is
just a copy (distillationReadiness: TOO_PRESCRIPTIVE → PROMPT_PATCH signal).

---

### 5. Key Principles Arbiter (see SK-444 for full operating manual)

**Expertise scope:** M1-M5 + P1-P22 + DNA-1..9 + fabric interface registry

**Context package (ONLY these — isolation is mandatory):**
- Full text of M1-M5 and P1-P22 (not summaries, not references — the full text)
- DNA-1 through DNA-9 with concrete violation examples
- Fabric interface registry (IScopedMemoryService not ioredis, etc.)
- The generated code

**Verdict class:** BLOCK_OR_PASS

**BLOCK threshold:** ANY M-principle or DNA violation is automatic BLOCK. P-principle
violations are BLOCK unless the specific principle states ADVISORY.

**Does NOT receive:** Iron rules, RAG patterns, security patterns, task type name,
archetype, or flow ID. Isolation is the enforcement mechanism — see P20 and SK-444.

**Self-check rule:** Reads `contract.arbiterConfig` and verifies `principles` role is
present (P17 + P20 compliance check).

---

### 6. Iron Rules Arbiter

**Expertise scope:** Contract iron rules only — one job, no distractions

**Context package (ONLY these):**
- `contract.ironRules[]` as a numbered list
- The generated code

**Verdict class:** BLOCK_OR_PASS

**Note:** Why separate from Business Logic Arbiter? Business Logic gets domain context
(events, invariants, BFA rules) — its job is domain correctness. Iron Rules gets only
the specific rule strings — its job is verbatim rule implementation. One can pass while
the other fails. Both must pass.

**Catches:** Specific rule implementation gaps, rules present in the contract but absent
in the generated code, rules present but implemented at the wrong layer.

---

### 7. Completeness Arbiter

**Expertise scope:** NODE structure completeness

**Context package (ONLY these):**
- `node.structure.inputShape`
- `node.structure.outputShape`
- `node.structure.emits[]`
- `node.structure.triggers[]`
- `node.intent.failureModes[]`

**Verdict class:** CHALLENGE_OR_PASS

**Catches:** Generated code that handles some inputs but not all declared in the NODE,
events declared in `emits[]` but never emitted in code, failure modes in
`intent.failureModes[]` with no handling path.

---

## MINIMUM PANEL BY ARCHETYPE

| Archetype | Minimum arbiters | Why |
|-----------|-----------------|-----|
| ROUTING | Business Logic + Principles + Iron Rules | Simplest archetype — core correctness + principles |
| DATA_PIPELINE | + Security | Writes to stores — tenant isolation critical |
| VALIDATION | + Completeness | All input cases must be handled |
| TRANSACTION | All 7 | Complex state — needs every check |
| ORCHESTRATION | All 7 | Multi-step, event-driven — highest risk |
| SCHEDULED | Business Logic + Security + Principles + Iron Rules + Completeness | SLA + state + isolation |

---

## STEP 1: IDENTIFY MANDATORY ARBITERS

From the contract archetype:
1. Look up archetype in the table above
2. Add any arbiters required by specific iron rules (e.g., if iron rules reference
   DNA-5, Security Arbiter is mandatory regardless of archetype)
3. If the task type emits cross-flow events: add Completeness Arbiter

---

## STEP 2: COMPOSE CONTEXT PACKAGES

For each arbiter, the context package is NOT the full contract. It is the minimal
relevant subset. Check: "If I gave this arbiter the full contract, would it be
distracted by information outside its expertise?" If yes — trim.

Business Logic: only iron rules + invariants + events + BFA rules
Security: only DNA patterns + failure modes
Skills: only retrieved patterns (from n1 rag-retrieve output)
Prompts: only genesis prompt text + format spec
Principles: ONLY principles text + DNA patterns (completely isolated from domain context)
Iron Rules: only iron rules list
Completeness: only node.structure fields

---

## STEP 3: DECLARE arbiterConfig IN THE CONTRACT

```typescript
arbiterConfig: {
  generators: ["AI_ENGINE", "AI_OPENAI_PROVIDER", "AI_GEMINI_PROVIDER"],
  judge: "AI_JUDGE_PROVIDER",          // Sonnet via D-EXT-009 FREEDOM config
  blind: true,                          // outputs shuffled A/B/C before judge sees them
  evaluatorArbiters: {
    business_logic:     { model: "AI_DOMAIN_ARBITER",    expertise: "iron rules + domain events + BFA rules" },
    security:           { model: "AI_SECURITY_ARBITER",  expertise: "DNA-3/5/8 + failure modes" },
    skills_patterns:    { model: "AI_SKILLS_ARBITER",    expertise: "RAG-retrieved archetype patterns" },
    prompts_compliance: { model: "AI_PROMPTS_ARBITER",   expertise: "genesis prompt text + format spec" },
    key_principles:     { model: "AI_PRINCIPLES_ARBITER", expertise: "M1-M5 + P1-P22 + DNA-1..9 full text — isolated",
                          isolated: true },
    iron_rules:         { model: "AI_IRON_RULES_ARBITER", expertise: "contract.ironRules[] only" },
    completeness:       { model: "AI_COMPLETENESS_ARBITER", expertise: "node.structure completeness" }
  },
  tieBreak: "alphabetical-label",       // A beats B beats C — deterministic, unbiased
  minimumProviders: 2,                  // if < 2: status = PENDING_COMPARISON, store to review index
  undecidedIndex: "xiigen-training-data-review"
}
```

---

## STEP 4: UPPER JUDGE — DYNAMIC PANEL EXPANSION

The panel defined in `arbiterConfig` is the base panel. The upper judge may add
specialized arbiters when the base panel cannot resolve a disagreement.

**Trigger for upper judge activation:**
When the Escalation Orchestrator (SK-446) reaches Rule 4 (max cycles exceeded OR
2+ base arbiters CHALLENGE same code section with conflicting reasons), the upper
judge receives: all arbiter verdicts + the unresolved conflict description.

**Upper judge decision:**
1. Identify the expertise domain that is causing the conflict
2. If a more specialized arbiter would resolve it: spawn a new arbiter with that
   specific expertise for this run only (e.g., "concurrency safety for Redis SETNX
   patterns" when base Security Arbiter and Business Logic Arbiter disagree about
   the atomicity of a setIfAbsent call)
3. Log the new arbiter as a DESIGN_REASONING triple: what conflict triggered it,
   what expertise was needed, what it found
4. If the new arbiter resolves consensus: accept result, record in modelComparison
5. If still unresolved: route to human (Rule 5 in SK-446)

**Panel growth rule:**
If the same expertise domain is spawned by the upper judge 3+ times across different
flows, it becomes a candidate for the permanent panel. Luba decides whether to add it
as an 8th standard arbiter or keep it as an on-demand spawn.

---

## ANTI-PATTERNS

```
WRONG: score.handler with single AI_JUDGE_PROVIDER for all 5 evaluator dimensions
RIGHT: 7 specialized arbiters via arbiter-panel.handler, each with own context

WRONG: Arbiters that share context packages
RIGHT: Each arbiter receives ONLY its defined subset — overlap = contamination

WRONG: Escalation gate that averages arbiter scores
RIGHT: Escalation Orchestrator (SK-446) applies rules, never arithmetic

WRONG: Principles Arbiter receives iron rules "for context"
RIGHT: Principles Arbiter receives ONLY M1-M5, P1-P22, DNA-1..9. Nothing else.
       Even one sentence of domain context reduces its reliability.

WRONG: Same 7-arbiter panel for every archetype
RIGHT: ROUTING uses 3, ORCHESTRATION uses all 7 — see minimum panel table

WRONG: "We only have one API key — will skip multi-generator"
RIGHT: store DPO triple with status=PENDING_COMPARISON to xiigen-training-data-review
       Never store single-model run to main training index
```

---

## WHAT THIS SKILL PREVENTS

- Single-model evaluation producing DPO triples with no comparative signal (P17)
- Principles violations passing because the domain judge was distracted by iron rules
- Panel producing incorrect verdicts because arbiters saw each other's outputs
- Upper judge never called because no escalation path exists
- FLOW-02..09 contracts missing arbiterConfig, requiring retroactive addition
