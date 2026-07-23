# Engine Contract Template

Copy this template for every new task type. Fill in ALL fields — no empty sections allowed.

---

## Template

```
═══════════════════════════════════════════════════════
TASK TYPE: T[NUMBER] — [DESCRIPTIVE NAME]
═══════════════════════════════════════════════════════

ARCHETYPE: [ORCHESTRATION | DATA_PIPELINE | AI_GENERATION | EVENT_HANDLER | INTEGRATION | VALIDATION]

ENTRY: [Fires when/after — specific trigger condition]

PURPOSE: [2-3 sentences: what this task type produces, what problem it solves]

DISTINCT FROM: T[EXISTING] — [How this differs from the most similar existing task type]

FACTORY DEPENDENCIES:
  F[N]:I[InterfaceName]  → [FABRIC NAME] ([provider hint]) — [what it does]
  F[N+1]:I[InterfaceName] → [FABRIC NAME] ([provider hint]) — [what it does]
  F[N+2]:I[InterfaceName] → [FABRIC NAME] ([provider hint]) — [what it does]

FABRIC RESOLUTION:
  F[N]   → DATABASE FABRIC     → [specific provider or "config-driven"]
  F[N+1] → QUEUE FABRIC        → [specific provider or "config-driven"]
  F[N+2] → AI ENGINE FABRIC    → [specific provider or "config-driven"]

AF CONFIGURATION:
  AF-1 Genesis:        [model hint, prompt strategy, template reference]
  AF-2 Planning:       [decomposition approach, max steps]
  AF-3 Prompt Library: [domain, prompt categories to retrieve]
  AF-4 RAG Context:    [pattern tags to search, max patterns]
  AF-6 Code Review:    [focus areas for review]
  AF-9 Judge:          [quality gates list, minimum score threshold]

BFA VALIDATION:
  Entities owned:  [list of entities this task type claims]
  Events published: [list of event types]
  API routes:       [list of routes registered]
  Cross-flow checks: [which existing flows to verify against]

MACHINE (fixed in code — changes via PR):
  - [specific logic that never changes: formulas, state machines, queue patterns]
  - [specific infrastructure wiring]

FREEDOM (configurable — changes via admin UI):
  - [entity field definitions]
  - [notification templates]
  - [thresholds, weights, feature flags]
  - [AI model selection]

IRON RULES (violations = BUILD FAILURE):
  1. [specific rule — e.g., "Must extend MicroserviceBase"]
  2. [specific rule — e.g., "Must return DataProcessResult on all methods"]
  3. [specific rule — e.g., "Must not import any provider SDK"]

QUALITY GATES (AF-9 checks):
  | Gate | Weight | Threshold | Description |
  |------|--------|-----------|-------------|
  | dna_compliance | 0.30 | 1.0 | All 9 DNA patterns pass |
  | scope_isolation | 0.20 | 1.0 | Tenant isolation verified |
  | outbox_pattern | 0.15 | 1.0 | Store-before-enqueue |
  | test_coverage | 0.20 | 0.8 | Unit test coverage |
  | code_complexity | 0.15 | 0.7 | Cyclomatic complexity |
═══════════════════════════════════════════════════════
```

---

## Filled Example: T44 (from FLOW-05)

```
═══════════════════════════════════════════════════════
TASK TYPE: T44 — Lesson Completion Trigger
═══════════════════════════════════════════════════════

ARCHETYPE: EVENT_HANDLER

ENTRY: Fires when user completes a lesson module (lesson.completed event)

PURPOSE: Validates lesson completion data, updates progress tracking,
triggers gamification rewards. Single event → multi-step reaction chain.

DISTINCT FROM: T47 (User Registration Trigger) — T47 handles user lifecycle;
T44 handles learning lifecycle with gamification hooks.

FACTORY DEPENDENCIES:
  F166:ILessonProgressService  → DATABASE FABRIC (Elasticsearch) — stores lesson progress
  F167:IRewardCalculator       → DATABASE FABRIC (PostgreSQL) — calculates reward points
  F168:IGamificationPublisher  → QUEUE FABRIC (Redis Streams)  — publishes reward events
  F169:IProgressNotifier       → QUEUE FABRIC (Redis Streams)  — sends progress notifications

FABRIC RESOLUTION:
  F166 → DATABASE FABRIC     → Elasticsearch (document store for progress)
  F167 → DATABASE FABRIC     → PostgreSQL (transactional reward calculation)
  F168 → QUEUE FABRIC        → Redis Streams (event publishing)
  F169 → QUEUE FABRIC        → Redis Streams (notification events)

AF CONFIGURATION:
  AF-1 Genesis:        claude-sonnet, event-handler template
  AF-3 Prompt Library: domain=education, categories=[gamification, progress-tracking]
  AF-4 RAG Context:    patterns=[event-handler, reward-calculation], maxPatterns=3
  AF-9 Judge:          gates=[dna_compliance, scope_isolation], minScore=0.75

BFA VALIDATION:
  Entities owned:  [lesson_progress, reward_calculation]
  Events published: [lesson.completed.processed, reward.calculated, progress.updated]
  API routes:       [/api/dynamic/lesson_progress, /api/dynamic/reward_calculation]
  Cross-flow checks: [FLOW-01 (user exists), FLOW-04 (content exists)]

MACHINE:
  - Reward calculation formula (points = base × multiplier × streak_bonus)
  - Progress state machine (NOT_STARTED → IN_PROGRESS → COMPLETED)
  - Queue coordination (store progress → calculate reward → publish events)

FREEDOM:
  - Reward point values per lesson type
  - Streak multiplier thresholds
  - Notification templates for progress milestones
  - Gamification badge definitions
  - Feature flag: gamification_enabled per tenant

IRON RULES:
  1. Must extend MicroserviceBase
  2. Must return DataProcessResult on all methods
  3. Must store progress BEFORE publishing reward event (outbox)
  4. Must validate lesson exists via RAG before processing

QUALITY GATES:
  | Gate | Weight | Threshold |
  |------|--------|-----------|
  | dna_compliance | 0.30 | 1.0 |
  | scope_isolation | 0.20 | 1.0 |
  | outbox_pattern | 0.15 | 1.0 |
  | test_coverage | 0.20 | 0.8 |
  | code_complexity | 0.15 | 0.7 |
═══════════════════════════════════════════════════════
```

---

## Checklist Before Submitting a Contract

- [ ] All sections filled (no empty/placeholder sections)
- [ ] Archetype matches the task pattern
- [ ] Every factory dependency has fabric type declared
- [ ] Fabric resolution table is complete
- [ ] AF configuration includes at minimum: AF-1, AF-4, AF-9
- [ ] BFA registration lists all entities, events, routes
- [ ] MACHINE items are truly fixed logic
- [ ] FREEDOM items are truly business-configurable
- [ ] Iron rules are specific (not generic "follow best practices")
- [ ] Quality gates have weights summing to ~1.0
- [ ] DISTINCT FROM references an actual existing task type

---

## NODE Field (v1.0.3 — P14 requirement)

Add to every EngineContract after `qualityGates`:

```typescript
// NODE — stack-neutral verified representation. Built BEFORE genesis prompt.
node: {
  structure: {
    inputShape:   Record<string, unknown>,
    outputShape:  Record<string, unknown>,
    dependencies: string[],  // taskTypeIds
    triggers:     string[],  // events/conditions
    emits:        string[],  // events produced
  },
  intent: {
    purpose:        string,  // ONE sentence, NO stack names
    invariants:     string[],
    failureModes:   string[],
    domainConcepts: string[],  // bridge to stackCoupling neutralConcepts
  },
  // constraints = ironRules | quality = qualityGates (do not duplicate)
}
```

domainConcepts → neutralConcepts bridge rule: each concept in domainConcepts
SHOULD appear in the corresponding stackCoupling[stack].neutralConcepts[].
Gap = incomplete stack profile.

---

## arbiterConfig Field (v2.0.0 — P17/P20 requirement)

Add to every EngineContract using `multi-generate.handler` or `arbiter-panel.handler`:

```typescript
// ARBITER CONFIG — required for every topology using multi-generate.handler
// or arbiter-panel.handler (P17/P20 — see planning--arbiter-panel-design-SKILL.md SK-442)
//
// Minimum arbiters by archetype:
//   ROUTING:       business_logic, key_principles, iron_rules
//   DATA_PIPELINE: business_logic, security, key_principles, iron_rules
//   VALIDATION:    business_logic, key_principles, iron_rules, completeness
//   TRANSACTION:   all 7 arbiters
//   ORCHESTRATION: all 7 arbiters
//   SCHEDULED:     business_logic, security, key_principles, iron_rules, completeness
//
// key_principles MUST have: isolated: true (P20)
// blockSemantics MUST be: ANY_BLOCK_CLASS_REJECTS (never averaged)
arbiterConfig: {
  evaluatorArbiters: {
    business_logic:     { modelToken: string; expertise: string; blind: true; };
    security?:          { modelToken: string; expertise: string; blind: true; };
    skills_patterns?:   { modelToken: string; expertise: string; blind: true; };
    prompts_compliance?: { modelToken: string; expertise: string; blind: true; };
    key_principles: {
      modelToken: string;
      expertise: "M1-M5 + P1-P22 + DNA-1..9 full text — isolated";
      blind: true;
      isolated: true;    // REQUIRED — no domain context in context package
    };
    iron_rules:         { modelToken: string; expertise: string; blind: true; };
    completeness?:      { modelToken: string; expertise: string; blind: true; };
  };
  blockSemantics: "ANY_BLOCK_CLASS_REJECTS";  // REQUIRED — never change to MAJORITY
  escalationGate: {
    maxCycles:       number;   // typically 3
    onMaxCycles:     "HUMAN_JUDGMENT_REQUIRED" | "BLOCK";
    onConsensus:     "ACCEPT";
    onSingleBlock:   "RETRY_WITH_CONTEXT" | "BLOCK";
  };
  upperJudge?: {
    modelToken: string;
    activateWhen: "TWO_OR_MORE_ARBITERS_DISAGREE";
  };
};
```

Example instance (add after qualityGates in your contract):

```typescript
arbiterConfig: {
  evaluatorArbiters: {
    business_logic: {
      modelToken: "AI_BUSINESS_ARBITER",
      expertise: "Domain-specific business rules and edge cases for this flow",
      blind: true,
    },
    key_principles: {
      modelToken: "AI_PRINCIPLES_ARBITER",
      expertise: "M1-M5 + P1-P22 + DNA-1..9 full text — isolated",
      blind: true,
      isolated: true,
    },
    iron_rules: {
      modelToken: "AI_IRON_RULES_ARBITER",
      expertise: "DNA-1..9 enforcement — no SETNX, idempotency, store-before-emit",
      blind: true,
    },
  },
  blockSemantics: "ANY_BLOCK_CLASS_REJECTS",
  escalationGate: {
    maxCycles: 3,
    onMaxCycles: "HUMAN_JUDGMENT_REQUIRED",
    onConsensus: "ACCEPT",
    onSingleBlock: "RETRY_WITH_CONTEXT",
  },
},
```

INCOMPATIBLE must include: incompatibilityLevel (mechanism|design) + mitigation.
Missing incompatibilityLevel = FC-25 violation.
