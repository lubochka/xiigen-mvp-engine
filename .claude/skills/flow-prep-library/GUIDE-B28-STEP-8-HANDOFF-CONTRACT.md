# GUIDE-B28 — How to Produce `FLOW-XX-STEP-8-HANDOFF-CONTRACT.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 38 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-STEP-8-HANDOFF-CONTRACT.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the STEP-8-HANDOFF-CONTRACT guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance to a flow's
LEAF NODEs and state, it will produce a correct executor handoff contract that
connects Cycle 3's depth decisions to Cycle 4's AF pipeline execution.

---

## WHAT THIS FILE IS

`FLOW-XX-STEP-8-HANDOFF-CONTRACT.md` is **Step 8 of the 10-step simulation pipeline**.
It defines three mappings that translate verified LEAF NODEs into the inputs that the
existing AF pipeline (Phase A through Phase F session files) can consume without
modification.

**Position in sequence:**
```
Step 7 → CYCLE 3 TEST     (grades LEAF/EXPAND decisions)
Step 8 → HANDOFF CONTRACT (this file — maps LEAF NODEs to executor inputs)
Step 9 → VISIBILITY       (defines what operators can see per cycle)
```

**What the handoff contract does:**
The AF pipeline (the existing session files for Phase A-F) already has structure to
accept iron rules, input/output contracts, and arbiter checklists. The handoff
contract defines exactly what feeds into each part of that pipeline from the LEAF
NODEs that survived Cycles 1-3. No session file is modified — the contract defines
the inputs, the session files consume them.

**Why Step 8 only consumes LEAF NODEs:**
EXPAND NODEs return to Cycle 1 at greater depth. Only LEAF NODEs proceed to executor
generation. Step 8 documents the handoff for those LEAF NODEs exclusively.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-11 | PRIMARY | `FLOW-09-STEP-8-HANDOFF-CONTRACT.md` — compressed v2: 3-mapping structure (iron rules, I/O contract, arbiter checklist), state write |
| ZIP-11 | PRIMARY | `FLOW-01-STEP-8-HANDOFF-CONTRACT.md` — rich v1: full 3-mapping derivation rules with 4-category iron rule classification (DNA excluded/BFA included/architecture included/MACHINE included), per-task-type I/O contracts, arbiter criterion-to-panel mappings, existing session file compatibility, quality threshold mapping, SK-443 verification |
| ZIP-15 | §4 | `XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md` §4 — 8 role relationship types: types 7 (AI-BLOCKS-HUMAN) and 8 (HUMAN-GATES-AI) are directly relevant to handoff contract guard declarations for flows with Human Gate patterns |
| ZIP-Project | REFERENCE | `code-execution--node-convergence-SKILL.md` (SK-435) — Genesis Prompt Derivation: 4 NODE fields → 4 genesis prompt sections |
| ZIP-Project | REFERENCE | `planning--arbiter-panel-design-SKILL.md` (SK-442) — 7 arbiter roles and which NODE constraint type each arbiter owns |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-STEP-8-HANDOFF-CONTRACT.md`

**Also updates:** `FLOW-XX-PLAN-STATE.json` with `executor_handoff.status = "HANDOFF_CONTRACT_READY"`

---

## THE THREE MAPPINGS — UNIVERSAL STRUCTURE

Every handoff contract has exactly three mappings:

| Mapping | From | To | Consumer |
|---------|------|----|---------|
| Mapping 1 | NODE.constraints | Iron rules for genesis prompt | AF-1 (genesis) + AF-7 (compliance) |
| Mapping 2 | NODE.structure | Input/output contract | AF-1 (signature) + Phase C (tests) |
| Mapping 3 | NODE.quality.scoringCriteria | Arbiter checklist | Phase E (arbiter panel) |

---

## HOW TO PRODUCE THE FILE (v2 FORMAT — DEFAULT)

### Step 1 — Read PLAN-STATE.json and identify LEAF NODEs

```bash
node -e "
const s = JSON.parse(require('fs').readFileSync('FLOW-XX-PLAN-STATE.json'));
console.log('flow_id:', s.flowId);
console.log('task_range:', s.task_range);
console.log('executor_handoff.status:', s.executor_handoff && s.executor_handoff.status);
// The task range drives the iron rules list in Mapping 1
"
```

### Step 2 — Write the file header

```markdown
# FLOW-XX — STEP 8: HANDOFF CONTRACT
## Status: COMPLETE
## Skills loaded: code-execution--node-convergence-SKILL.md (SK-435), planning--convergence-round-design-SKILL.md (SK-452)
```

### Step 3 — Write MAPPING 1 — IRON RULES

Iron rules for the genesis prompt derive from PLAN-STATE.json `invariants`. The
key rule: **do not duplicate DNA rules** — they are enforced by AF-7 externally.
Include BFA rules, architecture decisions, MACHINE constraints, and flow-specific
task range requirement.

```markdown
---

## MAPPING 1 — IRON RULES

```
ironRules: [
  "DNA-1: All business data uses Record<string, unknown> — no typed entity classes",
  "DNA-2: All queries use BuildSearchFilter — no hand-built DSL",
  "DNA-3: All service methods return DataProcessResult<T> — no throw",
  "DNA-4: All services extend MicroserviceBase",
  "DNA-5: Tenant context via AsyncLocalStorage — no tenantId parameter",
  "DNA-6: No entity-specific controllers — DynamicController handles all CRUD",
  "DNA-7: All queue consumers deduplicate via idempotency keys",
  "DNA-8: storeDocument() BEFORE enqueue()",
  "DNA-9: All inter-service events use CloudEvents envelope",
  "FLOW-XX: All task types in T[NNN]-T[NNN+M] must be represented",
  "FLOW-XX: Fabric-first — @Inject(DATABASE_SERVICE | QUEUE_SERVICE | AI_PROVIDER)",
  "FLOW-XX: BFA cross-flow validation required before deployment"
  [+ any flow-specific BFA rules from state.invariants.bfa_rules]
  [+ any architecture decisions from state.invariants.iron_rules_from_prior_runs]
]
```
```

### Step 4 — Write MAPPING 2 — I/O CONTRACT

```markdown
---

## MAPPING 2 — I/O CONTRACT

```
inputContract:
  source: "Verified LEAF NODE from Cycle 3"
  required_fields:
    - node.intent.purpose      -> executor purpose statement
    - node.intent.scope        -> executor scope boundary
    - node.structure.inputShape  -> executor method signature
    - node.structure.outputShape -> executor return type (DataProcessResult<T>)
    - node.constraints          -> executor iron rules and verifiable conditions
    - node.quality.testCriteria -> executor test requirements

outputContract:
  executor_produces:
    - service_class:   extends MicroserviceBase, @Injectable()
    - method_signature: accepts inputShape, returns DataProcessResult<T>
    - fabric_wiring:  @Inject decorators for required fabric interfaces
    - test_file:      unit tests covering all quality.testCriteria
    - bfa_validation: BFA cross-flow check passes before merge
```
```

### Step 5 — Write MAPPING 3 — ARBITER CHECKLIST

```markdown
---

## MAPPING 3 — ARBITER CHECKLIST

```
executor_review_checklist:
  [ ] Service class extends MicroserviceBase
  [ ] No direct SDK imports
  [ ] All methods return DataProcessResult<T>
  [ ] Fabric interfaces injected via @Inject decorators
  [ ] BuildSearchFilter used for all queries
  [ ] storeDocument() called before enqueue()
  [ ] CloudEvents envelope on all inter-service events
  [ ] Idempotency keys on all queue consumers
  [ ] Tenant scope via AsyncLocalStorage
  [ ] No entity-specific controller
  [ ] All task types in T[NNN]-T[NNN+M] represented
  [ ] BFA validation passes
  [+ flow-specific checks from state.invariants.bfa_rules and iron_rules_from_prior_runs]
```
```

### Step 6 — Write STATE WRITE

```markdown
---

## STATE WRITE

```
executor_handoff.status       → "HANDOFF_CONTRACT_READY"
executor_handoff.handoff_file → "FLOW-XX-STEP-8-HANDOFF-CONTRACT.md"
step_status                   → "COMPLETE"
```

Apply to PLAN-STATE.json:
```bash
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('FLOW-XX-PLAN-STATE.json'));
s.executor_handoff = s.executor_handoff || {};
s.executor_handoff.status = 'HANDOFF_CONTRACT_READY';
s.executor_handoff.handoff_file = 'FLOW-XX-STEP-8-HANDOFF-CONTRACT.md';
s.current_step = 8;
s.step_status = 'COMPLETE';
fs.writeFileSync('FLOW-XX-PLAN-STATE.json', JSON.stringify(s, null, 2));
console.log('STATE written. executor_handoff.status:', s.executor_handoff.status);
"
```
```

### Step 7 — Close

```markdown
---

**STEP 8 COMPLETE**
```

---

## HOW TO PRODUCE THE FILE (v1 FORMAT — WHEN NEEDED)

Use v1 when:
- Flow has multiple task type archetypes needing per-archetype iron rules
- Flow has Human Gate patterns (ZIP-15 §4 types 7/8) requiring guard declarations
- Flow has complex I/O contracts with multiple trigger/emit patterns
- Domain is new and arbiter criterion-to-panel mappings need documentation

v1 adds full derivation rules for all three mappings:

### v1 MAPPING 1 — Full iron rule derivation (4 categories)

```markdown
---

## MAPPING 1 — NODE CONSTRAINTS → IRON RULES FOR GENESIS PROMPT

**Iron rule category classification:**

```
CATEGORY A — DNA rules (DNA-1 through DNA-9):
  Action: DO NOT include in genesis iron rules.
  Reason: AF-7 (compliance station) enforces DNA rules externally.
          Duplicating in genesis creates drift between genesis and AF-7 scoring.

CATEGORY B — BFA rules (CF-N):
  Action: Include as NAMED iron rule.
  Format: "[CF-ID] — [requirement]: [consequence of violation]"

CATEGORY C — Architecture decisions (D-XX-N):
  Action: Include as NAMED architecture decision iron rule.
  Format: "[D-ID] — [requirement]: [consequence of violation]"

CATEGORY D — MACHINE constraints:
  Action: Include as NAMED machine constraint.
  Format: "MACHINE — [constraint]: [consequence of violation]"
```

**[Flow domain] genesis iron rules by step archetype:**

For [STEP_TYPE_1] steps ([ARCHETYPE]):
```
[CF-N]: [requirement]
        → [failure DataProcessResult code on violation]
[D-XX-N]: [requirement]
           → [what violation causes at runtime]
MACHINE: [machine constraint with idempotency key format or ordering rule]
```

For [STEP_TYPE_2] steps (ORCHESTRATION):
```
[prerequisite dependency rule derived from NODE structure.dependencies]
→ [check at dispatch time, not at invocation time]
[CF-N from BFA]
```

**Iron rule format for EngineContract.ironRules[]:**
```typescript
ironRules: [
  "[CF-N]: [requirement] — [failure mode] returned as DataProcessResult.failure",
  "[D-XX-N]: [requirement] — [consequence of violation]",
  // ... step-specific rules from NODE.constraints
]
```
```

### v1 MAPPING 2 — Full I/O contract per task type

```markdown
---

## MAPPING 2 — NODE STRUCTURE → INPUT/OUTPUT CONTRACT

**Derivation rules:**
```
NODE.structure.inputShape  → executor accepts() — required fields
NODE.structure.outputShape → DataProcessResult<T> return type
NODE.structure.triggers    → invoked_by (queue event or API route)
NODE.structure.emits       → must_emit after storeDocument() (DNA-8 order)
NODE.structure.dependencies → requires_prior step numbers
```

**[FLOW-XX] contracts by task type:**

T[NNN] [ServiceName] ([ARCHETYPE]):
```
accepts: { [inputShape fields] }
returns: DataProcessResult<{ [outputShape fields] }>
invoked_by: [trigger event or route]
must_emit: [CloudEvent name] — after storeDocument([record type])
requires_prior: [T-numbers or "none — first step in flow"]
```

**Guard pattern declarations (flows with Human Gate — ZIP-15 §4 types 7/8):**

If any step type in this flow has ZIP-15 §4 Type 7 (AI-BLOCKS-HUMAN) or
Type 8 (HUMAN-GATES-AI), declare the guard in the I/O contract:

Type 7 — AI-BLOCKS-HUMAN pattern:
```
T[NNN] [ArbitrationService]:
  accepts: { [inputs including conflict record] }
  returns: DataProcessResult.pending() — NOT .success()  ← critical
           [Why: premature .success() causes downstream to execute before human decides]
  invoked_by: [conflict detection event]
  must_await: [human resolution via Human Gate task — see guard declaration]
  guard_type: AI_BLOCKS_HUMAN
  assignee_role: [role string from ZIP-15 §1 — e.g., "human_decision_maker"]
  blocking_policy: "downstream deployment halted until resolution"
  claim_semantics: "assignee claims the Human Gate task before review"
  resolution_actions: [APPROVE, REJECT, DEFER]
```

Type 8 — HUMAN-GATES-AI pattern:
```
T[NNN] [PromotionOrchestrator]:
  accepts: { [inputs including promotion request] }
  returns: DataProcessResult.pending() — NOT .success()
           [Why: AI must not self-promote without human approval]
  invoked_by: [self-build completion event]
  must_await: [human approval via Human Gate task]
  guard_type: HUMAN_GATES_AI
  assignee_role: [role string — e.g., "core_approver"]
  blocking_policy: "AI capability not activated until human approves"
  resolution_actions: [APPROVE, REJECT]
```

Note: `DataProcessResult.pending()` is the MACHINE pattern for Human Gate steps.
Using `.success()` prematurely is a SILENT_FAILURE — downstream proceeds
before human resolution, data integrity compromised.
```

### v1 MAPPING 3 — Full arbiter criterion-to-panel mapping

```markdown
---

## MAPPING 3 — NODE QUALITY CRITERIA → ARBITER CHECKLIST

**Arbiter ownership by criterion type:**

```
DNA-pattern criterion → Principles + IronRules arbiters
Domain business rule → Domain arbiter
Security criterion → Security arbiter
Ordering criterion → Principles arbiter
Multi-capability criterion (ORCHESTRATION) → Completeness + Skills arbiters
Human Gate criterion → Domain + Security arbiters (chain integrity)
```

**[FLOW-XX] arbiter checklist by criterion type:**

For [STEP_TYPE_1] steps — [N] arbiters:

Criterion: "[criterion text]"
  → [Arbiter name] PASS: [observable pass condition]
  → [Arbiter name] PASS: [observable pass condition]

[... per criterion per step type ...]

**Quality threshold mapping:**
```
NODE.quality.acceptanceThreshold = 0.85
→ AF-9 threshold = 0.85 (never lower than NODE threshold)

NODE.quality.degradationAcceptable:
  false (ROUTING, VALIDATION, TRANSACTION): partial failure rejects generation
  true (ORCHESTRATION sub-capabilities): partial failure acceptable if retriable
```

**Phase E existing session file compatibility:**
```
Mapping 1 (iron rules) → Phase B genesis prompt ironRules[]
Mapping 2 (I/O contracts) → Phase C acceptance test cases
Mapping 3 (arbiter checklist) → Phase E arbiter panel named checks
Quality threshold → AF-9 judge threshold (same 0.85)

No session file is modified. The contract defines inputs; session files consume them.
```
```

---

## ZIP-15 §4 GUARD MECHANISM INTEGRATION

When a flow contains steps that implement Human Gate patterns (ZIP-15 §4 types 7 or 8),
the handoff contract must declare the guard mechanism for those steps in Mapping 2.

**Type 7 — AI-BLOCKS-HUMAN (e.g., BFA conflict detection — FLOW-25):**
The AI produces a conflict analysis that blocks human workflow until a human
decision-maker resolves it. The key constraint: `DataProcessResult.pending()`, NOT
`.success()`. Using `.success()` is a SILENT_FAILURE — downstream proceeds before
human resolution.

Guard declaration required fields:
- `guard_type: AI_BLOCKS_HUMAN`
- `assignee_role: [role string from ZIP-15 §1]`
- `blocking_policy: [what downstream is blocked]`
- `claim_semantics: [how the human claims the task]`
- `resolution_actions: [APPROVE | REJECT | DEFER]`

**Type 8 — HUMAN-GATES-AI (e.g., core capability approval — FLOW-26):**
A human must explicitly approve before an AI-generated capability is promoted to
the core system. The gate prevents unsupervised AI self-modification.

Guard declaration required fields:
- `guard_type: HUMAN_GATES_AI`
- `assignee_role: [role string from ZIP-15 §1 — typically "core_approver"]`
- `blocking_policy: "AI capability not activated until human approves"`
- `resolution_actions: [APPROVE | REJECT]`

**Flows without Human Gates:**
If neither type 7 nor type 8 applies to any step, declare:
```
Guard mechanisms: N/A — no Human Gate patterns in this flow.
All steps use standard DataProcessResult.success() / .failure() patterns.
```

---

## ACCEPTANCE CRITERIA FOR STEP-8-HANDOFF-CONTRACT

Before Step 8 is considered complete:

- [ ] File header declares Status: COMPLETE and skills loaded (SK-435 + SK-452)
- [ ] MAPPING 1 (iron rules) is present with DNA rules listed
- [ ] MAPPING 2 (I/O contract) defines inputContract.required_fields and outputContract.executor_produces
- [ ] MAPPING 3 (arbiter checklist) has a checkbox list covering all 9 DNA rules + flow-specific checks
- [ ] STATE WRITE updates `executor_handoff.status = "HANDOFF_CONTRACT_READY"`

For v1 additionally:
- [ ] Mapping 1 uses 4-category classification (DNA excluded from genesis, BFA/architecture/MACHINE included)
- [ ] Mapping 2 has per-task-type I/O contracts
- [ ] Human Gate patterns from ZIP-15 §4 declared in Mapping 2 if applicable
- [ ] `DataProcessResult.pending()` declared for Human Gate steps (not `.success()`)
- [ ] Mapping 3 maps each criterion type to named arbiter with PASS condition
- [ ] Quality threshold mapping states AF-9 threshold = NODE threshold (both 0.85)
- [ ] Session file compatibility section confirms no modifications to Phase A-F files

---

## KEY RULES

**1. DNA rules appear in the iron rules list but are NOT duplicated in the genesis prompt.**
AF-7 (compliance station) enforces DNA rules externally. Duplicating them in the genesis
prompt creates drift — if the genesis says one thing and AF-7 scores differently, the
DPO triple records the wrong quality signal. DNA rules belong in the checklist (Mapping 3)
but not as genesis iron rules (Mapping 1 — CATEGORY A excluded).

In v2 format, the DNA rules DO appear in Mapping 1's iron rules list as documentation
of what the executor must comply with — but the rule for the genesis prompt is that
AF-7 enforces them. The list serves as a completeness record, not as genesis input.

**2. Human Gate steps must use `DataProcessResult.pending()`, not `.success()`.**
This is the most dangerous SILENT_FAILURE in flows with Human Gate patterns. If a step
that is waiting for human approval returns `.success()`, the downstream chain proceeds
immediately — before the human has decided. The conflict is resolved in production, not
prevented. The handoff contract is where this is declared so the genesis prompt can
include it as an iron rule.

**3. No session file (Phase A-F) is modified.**
The handoff contract defines what each session file receives. The session files already
have the structure to accept it. Modifying session files to accommodate new patterns
violates the simulation pipeline's invariant: Cycles 1-3 produce inputs; the AF pipeline
consumes them; the boundary is the handoff contract.

**4. The I/O contract drives Phase C test cases.**
The `accepts()` and `returns()` definitions in Mapping 2 are what Phase C uses to write
acceptance test cases. A step that accepts `{ memberId: string, verificationToken: string }`
must have a test that provides both fields in valid and invalid forms.

**5. The arbiter checklist drives Phase E arbiter named checks.**
The checklist items in Mapping 3 are the named checks the Phase E arbiter panel evaluates.
If a criterion appears in the checklist but has no corresponding named check in Phase E,
the arbiter panel passes silently without actually checking — another SILENT_FAILURE.

---

## RELATIONSHIP TO SUBSEQUENT STEPS

- **Step 9 (VISIBILITY):** Defines what operators can see for each cycle, including
  Cycle 4. The Cycle 4 SENT field is derived from Mapping 2's input/output contracts.
  The Cycle 4 DECIDED field records which executor generation was accepted.

- **Step 10 (CHAIN-REVIEW):** The C3→C4 boundary check verifies that the handoff
  contract derives all three mappings from the LEAF NODE structure. The executor_handoff
  status in state (`HANDOFF_CONTRACT_READY`) confirms Step 8 was completed.

---

*End of GUIDE-B28 — FLOW-XX-STEP-8-HANDOFF-CONTRACT.md*
*List A sources: ZIP-11 (FLOW-01/09 STEP-8-HANDOFF-CONTRACT examples),*
*ZIP-15 §4 (role relationship types 7/8 — guard mechanism declarations),*
*project knowledge (SK-435 node-convergence Genesis Prompt Derivation,*
*SK-442 arbiter-panel-design — 7 arbiter roles)*
*Target B-type: B-28 — FLOW-XX-STEP-8-HANDOFF-CONTRACT.md*
*Round: 38 of 72*
