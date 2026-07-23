# CYCLES 1-3 IMPLEMENTATION PLAN FOR CLAUDE CODE
## Version: 1.0 | Date: 2026-04-01
## Governs: PlannerHandler, ConvergenceHandler, DepthDecisionHandler
##          + unit tests, e2e tests, UI tests for each
## Protocol: XIIGEN-EXECUTION-PROTOCOL-v1.1.md applies throughout

---

## WHAT THIS PLAN PRODUCES

Three new handlers that make Cycles 1-3 executable, plus full test coverage.
Cycle 4 (AF pipeline) already works. These three handlers complete the chain.

```
HANDLER 1: PlannerHandler          → Cycle 1  (user sentence → plan steps)
HANDLER 2: ConvergenceHandler      → Cycle 2  (plan step → verified NODE)
HANDLER 3: DepthDecisionHandler    → Cycle 3  (verified NODE → LEAF/EXPAND)
```

Each handler is delivered with:
- Unit tests (jest, mock providers, pure logic)
- E2E tests (jest, in-memory fabric, full chain)
- UI component (React, visible in GenerationLabPage)
- UI tests (jest + RNTL, mock API)

---

## STATE FILE

`FLOW-01-IMPL-STATE.json` — saved to `docs\sessions\FLOW-01\` after every phase.

```json
{
  "plan": "CYCLES-1-3-IMPLEMENTATION",
  "current_phase": 0,
  "phase_status": "NOT_STARTED",
  "phases": {
    "PHASE-A": { "status": "NOT_STARTED", "handler": "PlannerHandler", "tests_passing": null },
    "PHASE-B": { "status": "NOT_STARTED", "handler": "ConvergenceHandler", "tests_passing": null },
    "PHASE-C": { "status": "NOT_STARTED", "handler": "DepthDecisionHandler", "tests_passing": null },
    "PHASE-D": { "status": "NOT_STARTED", "handler": "ChainIntegration", "tests_passing": null }
  },
  "test_counts": {
    "unit": 0,
    "e2e": 0,
    "ui": 0
  },
  "issues": [],
  "progress_log": []
}
```

---

## HOW TESTS ARE STRUCTURED (READ BEFORE WRITING ANY CODE)

### Unit tests
File location: same directory as the handler
```
server/src/engine/node-handlers/planner.handler.spec.ts
server/src/engine/node-handlers/convergence.handler.spec.ts
server/src/engine/node-handlers/depth-decision.handler.spec.ts
```
Pattern: follow `node-handlers.spec.ts` exactly.
- Mock all providers (mockAi, mockDb, mockRag)
- Test each method independently
- Test both success path and failure path
- Test DNA compliance (DNA-3: no throw, returns DataProcessResult)
- Run with: `cd server && npx jest planner.handler.spec.ts --verbose`

### E2E tests
File location: `server/test/e2e/flow-01/`
```
server/test/e2e/flow-01/cycle1-planner.e2e.spec.ts
server/test/e2e/flow-01/cycle2-convergence.e2e.spec.ts
server/test/e2e/flow-01/cycle3-depth-decision.e2e.spec.ts
server/test/e2e/flow-01/cycles-chain.e2e.spec.ts  (Phase D)
```
Pattern: follow `flow-01.e2e.spec.ts` exactly.
- Use `makeInMemoryDb()` factory pattern
- Use real contracts (T47/T48/T49) from `user-registration-onboarding-contracts.ts`
- Test 8 mandatory categories: happy path, error path, tenant isolation,
  idempotency, UI state mapping, API contract, CloudEvents, named checks
- Run with: `cd server && npx jest cycle1-planner.e2e.spec.ts --verbose`

### UI tests
File location: `client/__tests__/flows/flow-01/`
```
client/__tests__/flows/flow-01/cycle1-planner.ui.test.ts
client/__tests__/flows/flow-01/cycle2-convergence.ui.test.ts
client/__tests__/flows/flow-01/cycle3-depth.ui.test.ts
```
Pattern: follow `flow-01-integration.test.ts` exactly.
- Use MockFlowProvider for API responses
- Test 5 categories: C1 (optimistic), C2 (app reopen), C3 (offline queue),
  C4 (SLA countdown), C5 (draft state where applicable)
- Test visibility: SENT/RECEIVED/DECIDED panels render correctly
- Run with: `cd client && npx jest cycle1-planner.ui.test.ts --verbose`

### Absolute gate
Before declaring any phase COMPLETE:
```
cd server && npx jest 2>&1 | tail -5  → failures must === 0
cd client && npx jest 2>&1 | tail -5  → failures must === 0
```
failures === 0 is not delta. It is absolute. Pre-existing failures must be fixed.

---

## PHASE A — PLANNER HANDLER (Cycle 1)

**What it does:** Receives a user sentence. Calls the AI. Returns ordered plan steps.

**File to create:**
```
server/src/engine/node-handlers/planner.handler.ts
```

### A1 — Read before writing

```
✅ server/src/engine/node-handlers/ai-generate.handler.ts
   — how to call IAiProvider, how to structure multi-model calls
✅ server/src/engine/node-handlers/node-handler.types.ts
   — NodeHandlerContext, NodeHandlerResult, INodeHandler interface
✅ server/src/engine/node-handlers/decompose.handler.ts
   — how to extract planSteps from contract — input pattern reference
✅ docs/sessions/FLOW-01/FLOW-01-STEP-2-CYCLE1-CONTEXT.md
   — the 5-field context package this handler builds and sends to AI
✅ docs/sessions/FLOW-01/FLOW-01-STEP-3-CYCLE1-TEST.md
   — the 4 checks that define a valid plan (coverage/abstraction/responsibility/dependency)
```

### A2 — What to build

**PlannerHandler class implements INodeHandler:**

```typescript
// nodeType = 'planner'

interface PlannerInput {
  userIntent:   string;           // verbatim from user — never modified
  domain:       string;           // 2-3 sentences, no tech names
  constraints:  string[];         // from state.invariants — machine constraints only
  priorArtQuery: string;          // RAG query string or "NO_PRIOR_ART"
  successFormat: string;          // what a valid plan step looks like
}

interface PlanStep {
  index:       number;
  text:        string;            // plain language, no tech names
  intClause:   string;            // which intent clause this covers
  dependencies: number[];         // indices of steps this depends on
}

interface PlannerOutput {
  planSteps:      PlanStep[];
  grade:          number;         // coverage × abstraction × responsibility × dependency
  reviewerGaps:   string[];       // what the reviewer found missing
  accepted:       boolean;        // grade >= gradeThreshold
  plannerModel:   string;         // which model produced the plan
  reviewerModel:  string;         // which model reviewed the plan
}
```

**Two AI calls per run:**
1. Planner call: sends PlannerInput → receives plan steps
2. Reviewer call: sends plan steps + original userIntent → receives gap analysis

**Planner system prompt (assembled from PlannerInput):**
```
You are a plan decomposer for the XIIGen engine.
Given a user intent, produce an ordered plan of steps.

INTENT (verbatim — do not rephrase):
{input.userIntent}

DOMAIN:
{input.domain}

CONSTRAINTS (every step must respect these):
{input.constraints joined by newline}

PRIOR ART:
{input.priorArtQuery}

SUCCESS FORMAT:
{input.successFormat}

QUESTION YOURSELF before returning your plan:
1. Does every intent clause from INTENT appear as the primary subject of
   at least one step? List each clause and its step number.
2. Does any step contain a technology name (framework, database, library)?
   Name it if found.
3. Does any step contain "and" or "then" where each part could be a
   separate step? Flag it if found.
4. Does any step that depends on a prior step declare that dependency?
If any answer reveals a problem — fix the plan before returning it.

Return JSON only:
{
  "steps": [
    { "index": 1, "text": "...", "intClause": "...", "dependencies": [] }
  ]
}
```

**Reviewer system prompt:**
```
You are a plan reviewer. Check this plan against the original intent.

ORIGINAL INTENT: {userIntent}
PLAN: {steps as numbered list}

Check:
1. COVERAGE: For each intent clause, which step covers it?
   Verdict per clause: COVERED | PARTIAL | MISSING
2. ABSTRACTION: Does any step name a technology? List any violations.
3. RESPONSIBILITY: Does any step combine two actions with "and"/"then"?
   Flag each.
4. DEPENDENCIES: Are all declared dependencies valid?

Return JSON only:
{
  "coverage": [{ "clause": "...", "verdict": "COVERED|PARTIAL|MISSING", "step": 1 }],
  "abstractionViolations": ["step N: name found"],
  "responsibilityFlags": ["step N: flag"],
  "dependencyGaps": ["step N: issue"]
}
```

**Grade formula (compute after reviewer returns):**
```typescript
const coverageScore = coverage.reduce((sum, c) =>
  sum + (c.verdict === 'COVERED' ? 1.0 : c.verdict === 'PARTIAL' ? 0.5 : 0.0), 0
) / coverage.length;

const abstractionScore = abstractionViolations.length === 0 ? 1.0 : 0.0;
const compoundCount = responsibilityFlags.length;
const responsibilityScore = 1 - (compoundCount / steps.length);
const dependencyScore = dependencyGaps.length === 0 ? 1.0 : 0.0;

const grade = coverageScore
  * abstractionScore
  * (0.5 + 0.5 * responsibilityScore)
  * dependencyScore;
```

**DNA compliance:**
- DNA-3: method returns `DataProcessResult<PlannerOutput>` — never throws
- DNA-1: all data as `Record<string, unknown>` in fabric calls
- DNA-5: tenantId from context, never as parameter

**Visibility record emission (DNA-8: store before emit):**
After plan is accepted, store visibility record to `xiigen-cycle-visibility`:
```typescript
{
  cycleType: 'CYCLE_1_PLANNER',
  flowId, tenantId, runId,
  sent: { userIntent, domain, constraints, priorArtQuery, successFormat },
  received: { plannerOutput: steps, reviewerOutput: gaps },
  decided: { grade, accepted, acceptedBecause: "grade >= threshold" | "grade < threshold" },
  changed: accepted
    ? `xiigen-rag-patterns key ${flowId}/cycle1-plan updated`
    : `plan rejected at grade ${grade} — no RAG update`
}
```

### A3 — Unit tests (planner.handler.spec.ts)

Minimum 12 tests:

```typescript
describe('PlannerHandler', () => {
  // Input validation
  it('returns failure if userIntent is empty')
  it('returns failure if constraints is empty')

  // Happy path
  it('calls plannerAI with assembled context package')
  it('calls reviewerAI with plan steps and original intent')
  it('returns PlannerOutput with grade when plan passes review')
  it('grade is 1.0 when all checks pass')

  // Grade formula
  it('grade is 0 when any abstraction violation found')
  it('grade is 0 when any dependency gap found')
  it('grade drops proportionally for PARTIAL coverage')
  it('accepted is false when grade < gradeThreshold')

  // DNA compliance
  it('never throws — returns DataProcessResult.failure on AI error')
  it('stores visibility record before any downstream emit (DNA-8)')

  // QUESTION YOURSELF enforcement
  it('retries once if planner output contains technology names')
})
```

### A4 — E2E tests (cycle1-planner.e2e.spec.ts)

Minimum 8 tests covering the mandatory categories:

```typescript
describe('Cycle 1 Planner E2E — FLOW-01', () => {
  // 1. Happy path
  it('produces 5-9 steps for FLOW-01 registration intent')
  it('all steps are technology-neutral')

  // 2. Error path
  it('returns failure gracefully when AI provider is unavailable')
  it('rejects plan when reviewer finds missing coverage clause')

  // 3. Tenant isolation
  it('visibility record is scoped to tenantId — not visible to other tenants')

  // 4. Idempotency
  it('running same intent twice produces same plan structure (same clauses covered)')

  // 5. UI state mapping
  it('PlannerOutput.grade maps to UI grade badge correctly')

  // 6. Visibility
  it('visibility record SENT contains all 5 context package fields verbatim')
  it('visibility record DECIDED contains grade and acceptance reasoning')
})
```

### A5 — UI component + tests

**New component:** `client/src/components/generationlab/CycleOnePlanner.tsx`

Displays:
- Input: text area for user intent
- Run button
- Output panel: plan steps as numbered list, each with intent clause label
- Grade indicator: numeric + color (green ≥ 0.85, yellow 0.65-0.84, red < 0.65)
- Visibility panel: collapsible SENT / RECEIVED / DECIDED sections

Add to `GenerationLabPage.tsx` alongside existing components.

**UI tests (cycle1-planner.ui.test.ts):**
```typescript
describe('CycleOnePlanner UI', () => {
  // C1 — Optimistic
  it('shows "Planning..." immediately on button click before API returns')
  it('shows plan steps when API returns accepted plan')
  it('shows rejection badge when grade < threshold')

  // C2 — App reopen
  it('restores in-progress plan from state on app reopen')

  // C3 — Offline
  it('disables run button when connection is offline')

  // Visibility panel
  it('SENT panel shows all 5 context package fields')
  it('RECEIVED panel shows planner and reviewer outputs separately')
  it('DECIDED panel shows grade and acceptance reason')
  it('visibility panel is collapsed by default, expands on click')
})
```

**Write to state after Phase A:**
```
phases.PHASE-A.status         → "COMPLETE"
phases.PHASE-A.tests_passing  → [unit count, e2e count, ui count]
test_counts.unit               → [cumulative]
test_counts.e2e                → [cumulative]
test_counts.ui                 → [cumulative]
```

---

## PHASE B — CONVERGENCE HANDLER (Cycle 2)

**What it does:** Receives one plan step. Runs 3-model parallel generation
to produce NODE candidates. Blind judge selects winner. Arbiters validate.

**File to create:**
```
server/src/engine/node-handlers/convergence.handler.ts
```

### B1 — Read before writing

```
✅ server/src/engine/node-handlers/ai-generate.handler.ts
   — parallel generation + blind judging pattern — copy exactly
✅ server/src/engine/node-handlers/arbiter-panel.handler.ts
   — arbiter selection and isolation pattern
✅ docs/sessions/FLOW-01/FLOW-01-STEP-4-CYCLE2-TEMPLATE.md
   — the 6-field template this handler fills and sends to each generator
✅ docs/sessions/FLOW-01/FLOW-01-STEP-5-CYCLE2-TEST.md
   — convergence/arbiter/abstraction/quality checks
✅ .claude/skills/code-execution--node-convergence-SKILL.md (SK-435)
   — NODE format: {structure, intent, constraints, quality}
✅ .claude/skills/planning--convergence-round-design-SKILL.md (SK-452)
   — challenger prompt templates per role
```

### B2 — What to build

**ConvergenceHandler class implements INodeHandler:**

```typescript
// nodeType = 'convergence'

interface NodeRepresentation {
  structure: {
    inputShape:    string[];
    outputShape:   string[];
    triggers:      string[];
    emits:         string[];
    dependencies:  number[];    // step indices from plan
  };
  intent: {
    purpose:       string;      // one sentence, no tech names
    invariants:    string[];    // from state.invariants that apply to THIS step
    failureModes:  string[];    // at least 2, step-specific
    domainConcepts: string[];
  };
  constraints: string[];        // verifiable conditions
  quality: {
    scoringCriteria:      string[];
    acceptanceThreshold:  number;
    degradationAcceptable: boolean;
  };
}

interface ConvergenceOutput {
  winningNode:     NodeRepresentation;
  candidateA:      NodeRepresentation;   // shuffled labels
  candidateB:      NodeRepresentation;
  candidateC:      NodeRepresentation;   // may be null if only 2 models
  judgeReasoning:  string;
  arbiterVerdicts: Record<string, 'PASS' | 'CONCERN' | 'BLOCK'>;
  convergenceScore: number;              // similarity across candidates
  grade:           number;
  accepted:        boolean;
  shuffleWasApplied: boolean;
}
```

**Generator system prompt (built from Cycle 2 template fields):**
```
You are a NODE representation builder for the XIIGen engine.
Your task: produce the verified understanding of one capability.
This is NOT code generation. Output is a NODE structure.

STEP (verbatim — do not rephrase):
{stepText}

UPSTREAM CONTEXT:
{upstreamContext}

CONSTRAINTS (every node field must respect these):
{constraints}

PRIOR ART RETRIEVED:
{ragResults or "NO_PRIOR_NODES"}

OUTPUT FORMAT: {nodeOutputFormat definition}

QUESTION YOURSELF before returning your NODE:
1. Does the NODE contain a single distinct responsibility in intent.purpose?
   If intent.purpose contains "and"/"then" — split or revise.
2. Does constraints[] include every applicable invariant?
   Cross-check against: {constraints list}
3. Does quality.scoringCriteria[] contain at least 2 step-specific failure modes?
   Generic modes ("system error", "failure") do not count.
4. Does the NODE contain any technology name?
   Check: intent.purpose, structure fields, constraints.
   If found — remove it.

Return JSON only — the NodeRepresentation object.
```

**Judge prompt (blind — labels A/B/C, no model attribution):**
```
You are evaluating NODE representations. Pick the best one.
Do not generate code. Evaluate representation quality only.

ORIGINAL STEP: {stepText}

Candidate A: {nodeA}
Candidate B: {nodeB}
Candidate C: {nodeC}

Check each candidate against:
1. TECHNOLOGY NEUTRALITY: no framework/database/library names
2. CONSTRAINT COVERAGE: all applicable invariants present
3. FAILURE MODE SPECIFICITY: at least 2 step-specific failure modes
4. UPSTREAM CONSISTENCY: dependencies declared match upstream context

Return JSON:
{
  "winner": "A"|"B"|"C",
  "reasoning": "which check distinguished winner — reference specific field",
  "scores": { "A": 0.0, "B": 0.0, "C": 0.0 },
  "violations": { "A": [], "B": [], "C": [] }
}
```

**Arbiters (one call each, isolated — no cross-arbiter visibility):**

Per step type (from state.cycle2.challenger_roles_by_step_type):
- REGISTRATION steps: Domain + Principles + IronRules + Security
- VERIFICATION steps: Domain + Principles + IronRules + Security
- ONBOARDING steps: all 7 arbiters

Each arbiter receives only its defined context package (per SK-452 templates).
Each returns: `{ verdict: 'PASS'|'CONCERN'|'BLOCK', criterion: string, detail: string }`

**DNA compliance:**
- DNA-3: returns DataProcessResult — never throws
- DNA-8: store visibility record before any downstream emit

### B3 — Unit tests (convergence.handler.spec.ts)

Minimum 15 tests:

```typescript
describe('ConvergenceHandler', () => {
  // Input
  it('returns failure if stepText is empty')
  it('returns failure if constraints is empty')

  // Generator calls
  it('calls 3 AI generators simultaneously with same prompt')
  it('generator prompts contain QUESTION YOURSELF section')
  it('falls back gracefully when one generator fails')

  // Blind judging
  it('shuffles candidate labels before sending to judge (V9-002)')
  it('judge receives labels A/B/C — not model names')
  it('winner is de-shuffled back to model attribution after judge returns')

  // Arbiter calls
  it('calls correct arbiters for ROUTING step type')
  it('calls all 7 arbiters for ORCHESTRATION step type')
  it('each arbiter receives only its defined context — no cross-contamination')
  it('BLOCK from any arbiter rejects the winning node')

  // Grade
  it('convergenceScore is 1.0 when all 3 candidates match on intent.purpose')
  it('convergenceScore is 0.0 when candidates diverge on core intent')

  // DNA compliance
  it('stores visibility record to xiigen-cycle-visibility before emit (DNA-8)')
})
```

### B4 — E2E tests (cycle2-convergence.e2e.spec.ts)

Minimum 8 tests:

```typescript
describe('Cycle 2 Convergence E2E — FLOW-01', () => {
  // 1. Happy path
  it('produces verified NODE for T47 registration step')
  it('winning NODE is technology-neutral')
  it('winning NODE has at least 2 step-specific failure modes in quality')

  // 2. Error path
  it('returns PARTIAL result when 2 of 3 generators succeed')
  it('returns failure when judge provider is unavailable')

  // 3. Tenant isolation
  it('winning NODE stored under tenantId scope')

  // 4. Idempotency
  it('same step text produces structurally similar NODE on re-run')

  // 6. Visibility
  it('RECEIVED contains all 3 candidate NODEs labelled A/B/C')
  it('DECIDED contains judge reasoning referencing specific NODE field')
})
```

### B5 — UI component + tests

**New component:** `client/src/components/generationlab/CycleTwoConvergence.tsx`

Displays:
- Input: plan step text (received from CycleOnePlanner)
- Three candidate panels: A / B / C side by side
- Winning NODE expanded view: all 4 fields (structure, intent, constraints, quality)
- Arbiter verdicts: one badge per arbiter (PASS=green, CONCERN=yellow, BLOCK=red)
- Convergence score indicator

**UI tests (cycle2-convergence.ui.test.ts):**
```typescript
describe('CycleTwoConvergence UI', () => {
  it('shows three candidate panels A/B/C side by side')
  it('winning panel is highlighted')
  it('BLOCK verdict from any arbiter shows red badge on winning panel')
  it('NODE fields expand on click — all 4 sections visible')
  it('convergence score renders as percentage')
  it('DECIDED section shows judge reasoning — not just winner label')
  it('shows retry indicator when grade < threshold')
})
```

---

## PHASE C — DEPTH DECISION HANDLER (Cycle 3)

**What it does:** Receives a verified NODE. Evaluates 5 complexity signals.
Returns LEAF or EXPAND. EXPAND includes sub-flow decomposition for next Cycle 1.

**File to create:**
```
server/src/engine/node-handlers/depth-decision.handler.ts
```

### C1 — Read before writing

```
✅ docs/sessions/FLOW-01/FLOW-01-STEP-6-CYCLE3-CONTEXT.md
   — the 5-field context package this handler sends to the Depth Decider AI
✅ docs/sessions/FLOW-01/FLOW-01-STEP-7-CYCLE3-TEST.md
   — 3 checks: justification, consistency, termination bound enforcement
✅ .claude/skills/planning--depth-decision-SKILL.md (SK-521)
   — 5 complexity signals with NODE field references
✅ .claude/skills/planning--freedom-machine-classification-SKILL.md (SK-451)
   — termination bound is MACHINE — must be enforced before AI call
```

### C2 — What to build

**DepthDecisionHandler class implements INodeHandler:**

```typescript
// nodeType = 'depth-decision'

interface DepthDecisionInput {
  verifiedNode:         NodeRepresentation;  // from Cycle 2
  currentDepth:         number;              // how deep we are (1 = top level)
  terminationDepth:     number;              // MACHINE — from state.cycle3.termination_depth
  depthHistoryQuery:    string;              // RAG query for prior depth decisions
  flowDomain:           string;
}

interface SubNodeProposal {
  name:           string;   // plain language, distinct responsibility
  intClause:      string;   // which responsibility
  isDistinct:     boolean;  // non-overlap check
}

interface DepthDecisionOutput {
  verdict:              'LEAF' | 'EXPAND';
  justification:        string;         // signal cited OR "depth = N = terminationDepth"
  signalsEvaluated:     string[];       // which signals were checked
  signalsTriggered:     string[];       // which signals fired (empty for LEAF)
  subFlowDecomposition: SubNodeProposal[] | null;  // non-null only for EXPAND
  terminationBoundApplied: boolean;     // true if LEAF due to bound, not signals
  grade:                number;         // justification_present × non_overlap
  accepted:             boolean;
}
```

**MACHINE CONSTRAINT GATE (run BEFORE AI call):**
```typescript
// Enforce termination bound without AI involvement
if (input.currentDepth >= input.terminationDepth) {
  return DataProcessResult.success({
    verdict: 'LEAF',
    justification: `depth = ${input.currentDepth} = terminationDepth — bound enforced`,
    signalsEvaluated: [],
    signalsTriggered: [],
    subFlowDecomposition: null,
    terminationBoundApplied: true,
    grade: 1.0,
    accepted: true,
  });
}
// Only if depth < terminationDepth: proceed to AI call
```

**Depth Decider system prompt:**
```
You are deciding whether a capability NODE needs to expand into sub-nodes
or can proceed directly to executor generation.

VERIFIED NODE:
{verifiedNode as JSON}

CURRENT DEPTH: {currentDepth}
TERMINATION DEPTH: {terminationDepth} — you must never output EXPAND at this depth.

PRIOR DEPTH DECISIONS (for calibration):
{ragResults or "NO_PRIOR_DECISIONS"}

COMPLEXITY SIGNALS — evaluate each one against the NODE fields:
S1 (moderate): node.intent.purpose — does it contain more than one distinct action?
   Signal words: "and", "then", "as well as", "also", "additionally"
S2 (strong):   node.structure.inputShape — more than 3 distinct input types with no shared schema?
S3 (strong):   node.quality.scoringCriteria — more than 2 failure modes that cannot be detected
               by the same check?
S4 (moderate): node.constraints — constraints from more than 2 different domain areas?
S5 (weak):     node.quality.acceptanceThreshold > 0.90 AND intent.purpose covers
               more than one user-visible outcome? (weak alone — requires another signal)

QUESTION YOURSELF before returning your verdict:
1. If LEAF: which signals did you check and find NOT triggered?
   State each signal name and cite the NODE field value you examined.
   OR: state "depth = terminationDepth — bound enforced" if applicable.
2. If EXPAND: which signal(s) triggered? Cite the specific NODE field and value.
   Then list proposed sub-nodes: each must be one distinct user-facing action.
   Check: can each sub-node stand alone? If not — merge.

Return JSON:
{
  "verdict": "LEAF"|"EXPAND",
  "justification": "...",
  "signalsEvaluated": ["S1", "S2", ...],
  "signalsTriggered": ["S1"],
  "subFlowDecomposition": [
    { "name": "...", "intClause": "...", "isDistinct": true }
  ] | null
}
```

**Grade computation:**
```typescript
const justificationPresent =
  (output.signalsEvaluated.length > 0 || output.terminationBoundApplied) ? 1 : 0;

const nonOverlap = output.verdict === 'LEAF' ? 1 :
  (output.subFlowDecomposition?.every(n => n.isDistinct) ? 1 : 0);

const grade = justificationPresent * nonOverlap;
```

### C3 — Unit tests (depth-decision.handler.spec.ts)

Minimum 12 tests:

```typescript
describe('DepthDecisionHandler', () => {
  // Termination bound gate (MACHINE — no AI call)
  it('returns LEAF immediately at terminationDepth — AI is NOT called')
  it('justification says "bound enforced" when termination bound applies')
  it('terminationBoundApplied is true when depth === terminationDepth')

  // Happy path
  it('calls AI when depth < terminationDepth')
  it('returns LEAF with signal evidence for simple single-responsibility NODE')
  it('returns EXPAND with sub-flow decomposition for multi-responsibility NODE')

  // Justification enforcement
  it('grade = 0 when AI returns LEAF with no signal evaluation and no bound citation')
  it('grade = 0 when AI returns EXPAND with no signal evidence')

  // Sub-flow coherence
  it('grade = 0 when EXPAND sub-nodes overlap (isDistinct = false)')
  it('grade = 1.0 when EXPAND sub-nodes are all distinct')

  // DNA compliance
  it('never throws — returns DataProcessResult.failure on AI error')
  it('stores visibility record before emit (DNA-8)')
})
```

### C4 — E2E tests (cycle3-depth-decision.e2e.spec.ts)

Minimum 8 tests:

```typescript
describe('Cycle 3 Depth Decision E2E — FLOW-01', () => {
  // 1. Happy path
  it('returns LEAF for T47 registration step (single responsibility)')
  it('returns EXPAND for onboarding step with 3 sub-items in intent.purpose')

  // 2. Termination bound enforcement (MACHINE constraint test)
  it('returns LEAF at depth=3 regardless of NODE content — bound enforced')
  it('returns LEAF at depth=3 even for multi-responsibility onboarding NODE')

  // 3. Consistency
  it('same NODE at depth=1 produces same verdict on two independent runs')

  // 4. EXPAND sub-flow feeds next Cycle 1
  it('sub-flow decomposition is valid INTENT input for new Cycle 1 context package')

  // 5. Visibility
  it('DECIDED contains signal evidence when LEAF via signals')
  it('DECIDED contains "bound enforced" when LEAF via termination depth')
})
```

### C5 — UI component + tests

**New component:** `client/src/components/generationlab/CycleThreeDepth.tsx`

Displays:
- Input: verified NODE from CycleTwoConvergence (auto-populated)
- Depth indicator: current depth / termination depth
- Verdict badge: LEAF (green) or EXPAND (blue)
- Signal evaluation table: S1-S5, each row shows field examined + triggered/not
- If EXPAND: sub-node list with distinct/overlapping badge per node
- If LEAF via bound: "Termination bound applied at depth N" banner

**UI tests (cycle3-depth.ui.test.ts):**
```typescript
describe('CycleThreeDepth UI', () => {
  it('shows LEAF badge for simple single-responsibility NODE')
  it('shows EXPAND badge for multi-responsibility NODE')
  it('shows "Termination bound applied" banner when depth = terminationDepth')
  it('signal evaluation table shows all 5 signals with field values')
  it('triggered signals are highlighted')
  it('sub-node list is visible when verdict is EXPAND')
  it('overlapping sub-nodes show warning badge')
  it('DECIDED section shows signal citations — not just LEAF/EXPAND')
})
```

---

## PHASE D — CHAIN INTEGRATION TEST

Connects all three handlers end-to-end with Cycle 4 (existing AF pipeline).

**File to create:**
```
server/test/e2e/flow-01/cycles-chain.e2e.spec.ts
```

### D1 — What to test

```typescript
describe('Cycles 1→2→3→4 Chain E2E — FLOW-01', () => {
  // Full chain happy path
  it('user intent → plan steps → NODE → LEAF → executor: full chain succeeds')
  it('all 4 cycle visibility records are written — completeness test Q1-Q5 pass')
  it('Q1: user intent recoverable from Cycle 1 SENT')
  it('Q2: winning model recoverable from Cycle 4 DECIDED')
  it('Q3: depth reason recoverable from Cycle 3 DECIDED')
  it('Q4: decision graph changes recoverable from all CHANGED fields')

  // Error recovery
  it('Cycle 2 BLOCK verdict stops chain — does not proceed to Cycle 3')
  it('Cycle 3 grade < threshold stops chain — does not proceed to Cycle 4')
  it('Meta-Arbiter trigger: grade < 0.85 in any cycle writes Cycle 5 execution record')

  // Tenant isolation end-to-end
  it('all 4 visibility records are scoped to same tenantId')
  it('cross-tenant query returns no records from this flow run')
})
```

**Write to state after Phase D:**
```
phases.PHASE-D.status         → "COMPLETE"
phases.PHASE-D.tests_passing  → [chain test count]
```

---

## DELIVERY ORDER

```
Phase A: PlannerHandler
  → planner.handler.ts
  → planner.handler.spec.ts          (≥12 unit tests, 0 failures)
  → cycle1-planner.e2e.spec.ts       (≥8 e2e tests, 0 failures)
  → CycleOnePlanner.tsx
  → cycle1-planner.ui.test.ts        (≥8 UI tests, 0 failures)
  → ⛔ STOP — await Luba approval

Phase B: ConvergenceHandler
  → convergence.handler.ts
  → convergence.handler.spec.ts      (≥15 unit tests, 0 failures)
  → cycle2-convergence.e2e.spec.ts   (≥8 e2e tests, 0 failures)
  → CycleTwoConvergence.tsx
  → cycle2-convergence.ui.test.ts    (≥7 UI tests, 0 failures)
  → ⛔ STOP — await Luba approval

Phase C: DepthDecisionHandler
  → depth-decision.handler.ts
  → depth-decision.handler.spec.ts   (≥12 unit tests, 0 failures)
  → cycle3-depth-decision.e2e.spec.ts (≥8 e2e tests, 0 failures)
  → CycleThreeDepth.tsx
  → cycle3-depth.ui.test.ts          (≥8 UI tests, 0 failures)
  → ⛔ STOP — await Luba approval

Phase D: Chain Integration
  → cycles-chain.e2e.spec.ts         (≥11 tests, 0 failures)
  → Full test suite: failures === 0
  → ⛔ STOP — await Luba approval
```

---

## GATE BEFORE EVERY ⛔ STOP

```
1. cd server && npx jest 2>&1 | tail -5   → failures === 0
2. cd client && npx jest 2>&1 | tail -5   → failures === 0
3. State file saved with phase status = "COMPLETE"
4. All new files committed to Skills_Creation_Claude branch
5. Print: "Phase [X] complete — [N] unit, [N] e2e, [N] UI tests — 0 failures"
```

---

## DOCUMENT CHECKLIST

```
□ FLOW-01-IMPL-STATE.json
□ server/src/engine/node-handlers/planner.handler.ts
□ server/src/engine/node-handlers/planner.handler.spec.ts
□ server/test/e2e/flow-01/cycle1-planner.e2e.spec.ts
□ client/src/components/generationlab/CycleOnePlanner.tsx
□ client/__tests__/flows/flow-01/cycle1-planner.ui.test.ts
□ server/src/engine/node-handlers/convergence.handler.ts
□ server/src/engine/node-handlers/convergence.handler.spec.ts
□ server/test/e2e/flow-01/cycle2-convergence.e2e.spec.ts
□ client/src/components/generationlab/CycleTwoConvergence.tsx
□ client/__tests__/flows/flow-01/cycle2-convergence.ui.test.ts
□ server/src/engine/node-handlers/depth-decision.handler.ts
□ server/src/engine/node-handlers/depth-decision.handler.spec.ts
□ server/test/e2e/flow-01/cycle3-depth-decision.e2e.spec.ts
□ client/src/components/generationlab/CycleThreeDepth.tsx
□ client/__tests__/flows/flow-01/cycle3-depth.ui.test.ts
□ server/test/e2e/flow-01/cycles-chain.e2e.spec.ts
```
