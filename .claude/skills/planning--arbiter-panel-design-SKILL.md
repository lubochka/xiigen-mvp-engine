---
name: arbiter-panel-design
sk_number: SK-442
version: "1.1.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-04-16"
supersedes: "1.0.0"
contexts: ["web-session", "claude-code"]
description: >
  Governs how to design the arbiter panel for any AF station that makes a
  quality-affecting AI judgment. Covers the 8 arbiter roles, their context
  packages, minimum panel by archetype, and the upper judge expansion protocol.
  Role 8 Goal Delivery (new v1.1, governed by SK-534) runs FIRST before all
  correctness arbiters. Scope Isolation arbiter is separately governed by
  SK-526 and FC-32. Use before authoring any AF-6, AF-7, or AF-9 prompt
  configuration, and before writing any topology ai-generate or score.handler node.
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
  - "goal delivery arbiter"
---

# Arbiter Panel Design Skill (SK-442) v1.1

## ORIGIN

v1.0 extracted from M2 (Every AI judgment uses a specialized panel) and P17 (Arbiter Panel Evaluation). Gap 3 in FLOW-DESIGN-SKILL-INDEX was "arbiters uniform — deferred." This skill closes that gap.

v1.1 extends the panel after XIIGEN-GOVERNANCE-AUTHORING-R1 (2026-04-16). Retrospective analysis of v1-v27 of User Journey Reconnection showed the 7-arbiter panel caught every correctness issue it was scoped to catch AND shipped with 3 of 4 user goals unmapped because no arbiter had coverage as its expertise. Role 8 Goal Delivery Arbiter (governed by SK-534) closes that gap and runs FIRST — before all 7 correctness arbiters — because internal consistency of a plan that misses goals is still the wrong plan.

## WHEN TO INVOKE

- Before authoring any AF-6 (review), AF-7 (compliance), or AF-9 (score) prompt
- Before writing any topology ai-generate.handler or score.handler node
- When adding a new task type to any contract (arbiterConfig must be declared)
- When the convergence.handler produces a NODE (NODE quality.scoringCriteria[] maps to arbiters)
- **(NEW v1.1)** Whenever STATE.goalContext.statement changes — re-run Role 8 to verify goal coverage still holds

---

## PRECEDENCE RULE (new v1.1)

Role 8 Goal Delivery runs FIRST. If Role 8 returns BLOCK, Roles 1-7 do not execute — the panel rejects the plan for coverage reasons before correctness is evaluated.

The separately-governed Scope Isolation arbiter (SK-526, FC-32) also runs as a mandatory pre-check alongside Role 8 for tenant-facing flows. Both are structural pre-checks; Roles 1-7 are correctness checks.

```
Panel execution order:
  Role 8  (Goal Delivery — SK-534)          RUNS FIRST
  Scope Isolation (SK-526, FC-32)           ALSO RUNS FIRST
      ↓ (only if both PASS or CHALLENGE)
  Roles 1-7 (correctness arbiters)
```

---

## THE 8 ARBITER ROLES

Each arbiter is a separate model call. Each receives ONLY its own context package. No arbiter ever sees another arbiter's verdict or the model that generated the code.

---

### 1. Business Logic Arbiter

**Expertise scope:** Iron rules + domain event contracts + BFA CF rules for this task type

**Context package (ONLY these — no other context):**
- `contract.ironRules[]` — every iron rule for this task type
- `node.intent.invariants[]` — business invariants from the NODE
- Upstream + downstream event schemas for this task type
- BFA CF rules that apply to this flow (from `bfa-conflict-arbitration-contracts.ts`)

**Verdict class:** BLOCK_OR_PASS

**Catches:** Iron rule violations, wrong event emissions, business invariant violations, BFA conflict creation that the iron rules were supposed to prevent.

**Does NOT catch:** Security vulnerabilities, fabric interface misuse, principle violations, prompt quality. Those are other arbiters' domains.

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

**Catches:** Missing tenantId, silent failure paths, data leakage between tenants, missing input validation, auth bypass patterns.

---

### 3. Skills & Patterns Arbiter

**Expertise scope:** RAG-retrieved patterns for this archetype

**Context package (ONLY these):**
- Patterns retrieved from `xiigen-rag-patterns` for this archetype (from rag-retrieve.handler output)
- `DISTILLED_RULE` entries from `xiigen-distilled-rules` for this domain
- Fabric interface registry (which interfaces the code should use vs which SDKs are banned)

**Verdict class:** CHALLENGE_OR_PASS

**Catches:** Code that reinvents what a skill already provides, incorrect fabric interface usage (e.g., importing ioredis directly instead of IScopedMemoryService), patterns that contradict established domain conventions.

---

### 4. Prompts Compliance Arbiter

**Expertise scope:** Genesis prompt adherence + teachability

**Context package (ONLY these):**
- The genesis prompt text that produced this code
- The output format specification from the genesis prompt
- The self-questioning requirements (selfQuestionsRequired count + questions)

**Verdict class:** CHALLENGE_OR_PASS

**Catches:** Code that ignored the genesis prompt's instructions, unanswered self-questions, output format violations, genesis prompts that are so prescriptive the generated code is just a copy (distillationReadiness: TOO_PRESCRIPTIVE → PROMPT_PATCH signal).

---

### 5. Key Principles Arbiter (see SK-444 for full operating manual)

**Expertise scope:** M1-M5 + P1-P22 + DNA-1..9 + fabric interface registry

**Context package (ONLY these — isolation is mandatory):**
- Full text of M1-M5 and P1-P22 (not summaries, not references — the full text)
- DNA-1 through DNA-9 with concrete violation examples
- Fabric interface registry (IScopedMemoryService not ioredis, etc.)
- The generated code

**Verdict class:** BLOCK_OR_PASS

**BLOCK threshold:** ANY M-principle or DNA violation is automatic BLOCK. P-principle violations are BLOCK unless the specific principle states ADVISORY.

**Does NOT receive:** Iron rules, RAG patterns, security patterns, task type name, archetype, or flow ID. Isolation is the enforcement mechanism — see P20 and SK-444.

**Self-check rule:** Reads `contract.arbiterConfig` and verifies `principles` role is present (P17 + P20 compliance check).

---

### 6. Iron Rules Arbiter

**Expertise scope:** Contract iron rules only — one job, no distractions

**Context package (ONLY these):**
- `contract.ironRules[]` as a numbered list
- The generated code

**Verdict class:** BLOCK_OR_PASS

**Note:** Why separate from Business Logic Arbiter? Business Logic gets domain context (events, invariants, BFA rules) — its job is domain correctness. Iron Rules gets only the specific rule strings — its job is verbatim rule implementation. One can pass while the other fails. Both must pass.

**Catches:** Specific rule implementation gaps, rules present in the contract but absent in the generated code, rules present but implemented at the wrong layer.

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

**Catches:** Generated code that handles some inputs but not all declared in the NODE, events declared in `emits[]` but never emitted in code, failure modes in `intent.failureModes[]` with no handling path.

---

### 8. Goal Delivery Arbiter (NEW v1.1 — RUNS FIRST)

**Expertise scope:** user-stated goals + plan turn list. Coverage, not correctness.

**Context package (ONLY these — strict two-input isolation is mandatory):**
- User's goal statement verbatim from `STATE.goalContext.statement` (loaded by SK-536 at session start)
- Plan's turn list (just turn names and 1-line purposes — NOT turn implementation details)

**Does NOT receive:**
- Iron rules
- RAG patterns
- Security patterns
- Task type name or archetype
- Contract contents
- Any prior arbiter's verdict
- Codebase context

The two-input isolation is the feature. A coverage arbiter with nuanced multi-input context produces nuanced verdicts that are hard to audit. A two-input coverage arbiter produces verdicts any reviewer can reproduce from two pieces of paper.

**Verdict class:** BLOCK_OR_PASS (with sub-classes)
- APPROVED — every goal element mapped to ≥1 turn with verification step
- BLOCK_UNMAPPED — ≥1 goal element has zero turns assigned
- BLOCK_UNVERIFIED — ≥1 goal element has turns but no verification step
- CHALLENGE — turn assignments are ambiguous

**Aggregate verdict:** worst per-goal-element verdict. Any BLOCK_* blocks the entire panel execution.

**Catches:** Plans that are internally consistent but miss user-stated goals. The class of failure v1-v27 of User Journey Reconnection exhibited (3 of 4 goals unmapped after 22 review rounds).

**Does NOT catch:** Security vulnerabilities, iron rule violations, fabric misuse, prompt quality, any correctness dimension. Those are Roles 1-7.

**Governed by:** SK-534 Goal Delivery Completeness (provides the 5-step processing protocol, 4 verdict classes, output format).

**Precedence:** RUNS FIRST. If Role 8 returns BLOCK_*, Roles 1-7 do not execute.

---

## ADDITIONAL MANDATORY ARBITER — Scope Isolation (SK-526)

The Scope Isolation arbiter is separately governed by SK-526 and required by FC-32. It runs as a mandatory pre-check alongside Role 8 for any tenant-facing flow. It is not numbered in SK-442 because its governance lives in SK-526, but it is effectively the 9th mandatory arbiter:

- Verifies three-tier scoping compliance (PRIVATE / MODULE_SCOPED / GLOBAL)
- Blocks on cross-tenant reads, scope elevation outside KnowledgePolicyService, missing tenantId on writes to PRIVATE indices
- Required by FC-32 on every flow node that touches tenant-scoped indices

See SK-526 for full specification.

---

## MINIMUM PANEL BY ARCHETYPE (updated v1.1)

Every archetype now includes Role 8 (Goal Delivery) and Scope Isolation (SK-526). Role 8 runs FIRST; Scope Isolation runs alongside Role 8 (both are structural pre-checks). Roles 1-7 per archetype are unchanged from v1.0.

| Archetype | Structural pre-checks (run FIRST) | Correctness arbiters (Roles 1-7) | Total arbiters |
|-----------|-----------------------------------|----------------------------------|----------------|
| ROUTING | Goal Delivery (Role 8) + Scope Isolation | Business Logic + Principles + Iron Rules | 5 |
| DATA_PIPELINE | Goal Delivery + Scope Isolation | + Security | 6 |
| VALIDATION | Goal Delivery + Scope Isolation | + Completeness | 6 |
| TRANSACTION | Goal Delivery + Scope Isolation | All 7 | 9 |
| ORCHESTRATION | Goal Delivery + Scope Isolation | All 7 | 9 |
| SCHEDULED | Goal Delivery + Scope Isolation | Business Logic + Security + Principles + Iron Rules + Completeness | 7 |

**Rationale:**
- Goal Delivery is always-on because every flow delivers work that advances some user-stated goal; even a ROUTING flow must be traceable to a goal element
- Scope Isolation is always-on because every flow must comply with three-tier scoping (GLOBAL / PRIVATE / MODULE_SCOPED)
- The 7 correctness arbiters remain archetype-specific per v1.0

---

## STEP 1: IDENTIFY MANDATORY ARBITERS

From the contract archetype:
1. **Goal Delivery (Role 8) and Scope Isolation are always included** — no exceptions.
2. Look up archetype in the table above for Roles 1-7.
3. Add any arbiters required by specific iron rules (e.g., if iron rules reference DNA-5, Security Arbiter is mandatory regardless of archetype).
4. If the task type emits cross-flow events: add Completeness Arbiter.

---

## STEP 2: COMPOSE CONTEXT PACKAGES

For each arbiter, the context package is NOT the full contract. It is the minimal relevant subset. Check: "If I gave this arbiter the full contract, would it be distracted by information outside its expertise?" If yes — trim.

Business Logic: only iron rules + invariants + events + BFA rules
Security: only DNA patterns + failure modes
Skills: only retrieved patterns (from n1 rag-retrieve output)
Prompts: only genesis prompt text + format spec
Principles: ONLY principles text + DNA patterns (completely isolated from domain context)
Iron Rules: only iron rules list
Completeness: only node.structure fields
**Goal Delivery (Role 8): ONLY user goal statement verbatim + plan turn list (two-input isolation is mandatory)**

---

## STEP 3: DECLARE arbiterConfig IN THE CONTRACT

```typescript
arbiterConfig: {
  generators: ["AI_ENGINE", "AI_OPENAI_PROVIDER", "AI_GEMINI_PROVIDER"],
  judge: "AI_JUDGE_PROVIDER",          // Sonnet via D-EXT-009 FREEDOM config
  blind: true,                          // outputs shuffled A/B/C before judge sees them
  evaluatorArbiters: {
    // STRUCTURAL PRE-CHECKS (run FIRST — v1.1)
    goal_delivery: {
      model: "AI_GOAL_DELIVERY_ARBITER",
      expertise: "user-goal-to-turn coverage verification — two-input isolation",
      blind: true,
      isolated: true,                   // NO other context
      runsFirst: true,                  // precedes all other arbiters
      governedBy: "SK-534"
    },
    scope_isolation: {
      model: "AI_SCOPE_ARBITER",        // or AI_JUDGE_PROVIDER fallback
      expertise: "three-tier scoping model (PRIVATE|MODULE|GLOBAL) read/write compliance",
      blind: true,
      isolated: false,
      governedBy: "SK-526"
    },

    // CORRECTNESS ARBITERS (run if structural pre-checks PASS)
    business_logic:     { model: "AI_DOMAIN_ARBITER",    expertise: "iron rules + domain events + BFA rules" },
    security:           { model: "AI_SECURITY_ARBITER",  expertise: "DNA-3/5/8 + failure modes" },
    skills_patterns:    { model: "AI_SKILLS_ARBITER",    expertise: "RAG-retrieved archetype patterns" },
    prompts_compliance: { model: "AI_PROMPTS_ARBITER",   expertise: "genesis prompt text + format spec" },
    key_principles:     { model: "AI_PRINCIPLES_ARBITER", expertise: "M1-M5 + P1-P22 + DNA-1..9 full text — isolated",
                          isolated: true },
    iron_rules:         { model: "AI_IRON_RULES_ARBITER", expertise: "contract.ironRules[] only" },
    completeness:       { model: "AI_COMPLETENESS_ARBITER", expertise: "node.structure completeness" }
  },
  blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
  tieBreak: "alphabetical-label",       // A beats B beats C — deterministic, unbiased
  minimumProviders: 2,                  // if < 2: status = PENDING_COMPARISON, store to review index
  undecidedIndex: "xiigen-training-data-review"
}
```

---

## STEP 4: UPPER JUDGE — DYNAMIC PANEL EXPANSION

The panel defined in `arbiterConfig` is the base panel. The upper judge may add specialized arbiters when the base panel cannot resolve a disagreement.

**Trigger for upper judge activation:**
When the Escalation Orchestrator (SK-446) reaches Rule 4 (max cycles exceeded OR 2+ base arbiters CHALLENGE same code section with conflicting reasons), the upper judge receives: all arbiter verdicts + the unresolved conflict description.

**Upper judge decision:**
1. Identify the expertise domain that is causing the conflict
2. If a more specialized arbiter would resolve it: spawn a new arbiter with that specific expertise for this run only
3. Log the new arbiter as a DESIGN_REASONING triple: what conflict triggered it, what expertise was needed, what it found
4. If the new arbiter resolves consensus: accept result, record in modelComparison
5. If still unresolved: route to human (Rule 5 in SK-446)

**Panel growth rule:**
If the same expertise domain is spawned by the upper judge 3+ times across different flows, it becomes a candidate for the permanent panel. Luba decides whether to add it as an additional standard arbiter or keep it as an on-demand spawn.

**Note v1.1:** Goal Delivery (Role 8) emerged through exactly this pattern — spawned retrospectively by analysis of v27, repeatedly found to be the missing coverage check, promoted to permanent panel.

---

## ANTI-PATTERNS

```
WRONG: score.handler with single AI_JUDGE_PROVIDER for all 5 evaluator dimensions
RIGHT: 8 specialized arbiters via arbiter-panel.handler, each with own context

WRONG: Arbiters that share context packages
RIGHT: Each arbiter receives ONLY its defined subset — overlap = contamination

WRONG: Escalation gate that averages arbiter scores
RIGHT: Escalation Orchestrator (SK-446) applies rules, never arithmetic

WRONG: Principles Arbiter receives iron rules "for context"
RIGHT: Principles Arbiter receives ONLY M1-M5, P1-P22, DNA-1..9. Nothing else.

WRONG: Same 8-arbiter panel for every archetype
RIGHT: ROUTING uses 5, ORCHESTRATION uses 9 — see minimum panel table

WRONG (NEW v1.1): Goal Delivery arbiter receives the full plan for context
RIGHT: Goal Delivery receives ONLY the goal statement verbatim + turn list.
       Two-input isolation is the feature. More context reduces auditability.

WRONG (NEW v1.1): Goal Delivery runs last, as a sanity check
RIGHT: Goal Delivery runs FIRST. Correctness review of a plan missing goals
       is wasted effort — reject on coverage first.

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
- **(NEW v1.1)** Plans passing correctness review with unmapped user goals (v27 class)
- **(NEW v1.1)** Goal Delivery arbiter contamination via excess context (two-input rule)

---

## BACKWARD COMPATIBILITY — v1.0 → v1.1

Flows reviewed under v1.0 with the 7-arbiter panel that produced PASS verdicts may still fail v1.1's Role 8 Goal Delivery check. This is expected — v1.1 checks dimensions v1.0 did not.

Re-reviewing a v1.0-approved flow under v1.1:
- If Role 8 BLOCKs: flow plan has unmapped goals. Either add turns covering the missing goals, OR explicitly defer via SK-531.
- If Role 8 PASSES: Roles 1-7 verdicts from v1.0 review unchanged.

v27 of User Journey Reconnection: 7 arbiters under v1.0 returned PASS across 22 rounds. Under v1.1, Role 8 would BLOCK_UNMAPPED on 2 of 4 goal elements and BLOCK_UNVERIFIED on 1, rejecting the plan at round 1.
