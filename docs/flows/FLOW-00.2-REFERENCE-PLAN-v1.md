# FLOW-00.2: STACK COUPLING BASE — REFERENCE PLAN v1
## Builds the infrastructure, skills, and schema that allow any flow
## to be planned, reviewed, and implemented on multiple server and client stacks.
## Prerequisite for FLOW-01 through FLOW-24 re-review sessions.
## Date: 2026-03-22
## Status: PLAN — awaiting approval before session files are produced

---

## WHY THIS FLOW EXISTS

FLOW-01 through FLOW-24 plans were produced assuming one canonical stack:
NestJS + React.js. Before any of those flows are executed, the planning and
implementation system needs to know — for every task type, every client node,
every arbiter, every genesis prompt — which parts are universal rules and
which parts are specific to one technology.

Without this base, every new stack (Python server, Angular client, .NET, etc.)
would require someone to manually re-read every plan and figure out what applies.
That is exactly the kind of work XIIGen is supposed to eliminate.

**This flow builds the foundation so that FLOW-01's re-review session can
produce a plan that works on 7 server × 7 client stacks, not just one.**

---

## WHAT FLOW-00.2 IS NOT

- It does not implement any user-facing feature
- It does not generate code for any stack other than node-react-web
- It does not retroactively re-implement FLOW-25 through FLOW-35 on new stacks
- It does not produce full stack implementation guides for Python, .NET, etc.
  (that is FLOW-37, which runs after all user flows are done)

**What it does:** it annotates, classifies, and structures everything that
already exists so that planning sessions for FLOW-01 onwards are
stack-aware from the start.

---

## DECISIONS LOCKED BY THIS FLOW

Before Phase A begins, these decisions must be recorded in DECISIONS-LOCKED.md:

### D-STACK-1 — Three-tier coupling taxonomy

```
CONCEPT_NEUTRAL:  Rule applies word-for-word on any stack.
                  The arbiter checking it needs stack-aware patterns,
                  but the RULE TEXT itself is identical everywhere.
                  
IMPL_VARIES:      Concept is identical. Code syntax differs by one or more
                  coupling dimensions. Genesis prompt becomes a parameterized
                  template. Generator substitutes variables at build time.
                  
STACK_COUPLED:    Implementation differs fundamentally between stacks.
                  No shared template is possible. Separate implementation
                  sections required per stack.
                  
INCOMPATIBLE:     Cannot be implemented on this stack within XIIGen's
                  architecture model. Must be flagged before implementation
                  begins, with explicit mitigation or alternative stack.
```

### D-STACK-2 — Option C Hybrid genesis prompt format (already approved)

```
Every genesis prompt has four sections:
  Section 1: NEUTRAL_IRON_RULES      — verbatim for every stack
  Section 2: CONCEPT_DESCRIPTION     — what this does in business terms
  Section 3: EVENT_CONTRACTS         — CONSUMES / EMITS / BOUNDARY (always neutral)
  Section 4: STACK_IMPLEMENTATIONS   — per-stackId generation instructions
             [OPTIONAL] Section 5: CLIENT_FRAMEWORK_NOTES — per-clientFramework
```

### D-STACK-3 — Ten coupling dimensions

```
[SL]   SERVER_LANGUAGE         typescript | python | php | csharp | rust | java
[DI]   SERVER_DI_FRAMEWORK     nestjs | fastapi | laravel | wordpress | aspnet | axum | spring
[AM]   SERVER_ASYNC_MODEL      eventloop | asyncio | laravel-jobs | sync-php | task-async | tokio | reactive
[ORM]  SERVER_DATA_ACCESS      typeorm/prisma | sqlalchemy | eloquent | wpdb | efcore | sqlx | jooq
[CF]   CLIENT_FRAMEWORK        react-web | angular | vue | php-server | wordpress-plugin
                               | android-kotlin | ios-swift | react-native
[CL]   CLIENT_LIFECYCLE        react-hooks | angular-lifecycle | vue-composable
                               | php-session | android-activity | ios-viewcontroller
[CS]   CLIENT_STATE_MODEL      useState-zustand | rxjs-behaviorsubject | pinia
                               | php-session | stateflow | combine-published
[CRT]  CLIENT_ROUTING          react-router | angular-router | vue-router | php-redirect
                               | jetpack-navigation | uinavigation-controller
[CB]   CLIENT_BUILD            vite | angular-cli | php-none | gradle-agp | xcode
[TEST] TEST_FRAMEWORK          jest | pytest | phpunit | rust-test | xunit | espresso-junit
```

### D-STACK-4 — WordPress treatment

```
WordPress (both PHP server plugin and client plugin) is a LIMITED stack.
Incompatibilities for FLOW-01 through FLOW-04:
  1. Fan-in parallelism (T50) — ⛔ no native parallel execution
  2. Long-running background processes (T48, T64) — ⛔ wp_cron unreliable
  3. Reliable anti-replay via Redis (T65) — ⚠️ degraded via wp_transient
  4. Realtime WebSocket push (T51, T61) — ⛔ requires external JS layer

Status: SUPPORTED WITH EXPLICIT FEATURE FLAGS.
  - Flows targeting wordpress must declare which features are degraded
  - Degraded features are noted in stackImplementations[php-wordpress]:
    incompatible: true | degraded: true with explanation
  - WordPress plugin deployments targeting these flows must use a JS
    component layer (React or Vue embedded in plugin) for client features
```

### D-STACK-5 — Angular observable scope — WHERE it is declared

```
Angular observable chain risk is declared in topology.json at the node level,
under stackCoupling.client.angularNotes.
It is also enforced by the functional spec arbiter (checking service scope
and Subject type) in generated Angular code.
The flow reference plan (Pass 3) references the topology.json values —
it does not duplicate them.
```

### D-STACK-6 — SK-431 pipeline position

```
SK-431 StackCouplingAuditor runs as step 9 of the planning pipeline
for ALL flows (not only multi-stack flows).
Reason: a plan that has not been audited for stack coupling implicitly
assumes node-react-web. All future plans must be explicit.
Single-stack plans still produce the stackCoupling annotation — they
just list only one stack in stackImplementations[].
```

---

## FIVE PHASES

```
Phase A  Schema + Types         ← stackCoupling fields in EngineContract + topology
Phase B  Skills                 ← SK-431, SK-432, SK-433; update SK-418 v1.3, SK-419
Phase C  Principles             ← Add P11 Stack Coupling to xiigen-core-principles
Phase D  Infrastructure Flows Audit  ← tag T47–T566 (all existing task types)
Phase E  User Flows Audit       ← tag FLOW-01–04 topology + genesis prompts in detail
```

Every phase gates independently. ⛔ STOP after each. Tests must not regress.
No new user-facing features. No stack implementations. No code generation.

---

## PHASE A — SCHEMA + TYPES
**What:** Add `stackCoupling` as a first-class field in `EngineContractParams`,
`topology.json` node schema, and `HybridGenesisPrompt` interface.
**Output:** TypeScript schema files + JSON schema additions.
**Gate:** `tsc --noEmit` = 0 errors. All existing tests pass.

### A.1 — New types in `server/src/engine-contracts/stack-coupling.ts`

```typescript
/**
 * Stack Coupling Types — FLOW-00.2
 *
 * Business purpose: Every task type and client node can be labelled with
 * exactly how much of its design is universal versus technology-specific.
 * This allows XIIGen to generate correct code for any stack and to flag
 * incompatibilities before an implementation session begins.
 *
 * Authoritative: DECISIONS-LOCKED.md → D-STACK-1 through D-STACK-6
 */

export type CouplingTier =
  | 'CONCEPT_NEUTRAL'   // rule applies word-for-word on any stack
  | 'IMPL_VARIES'       // same concept, different syntax per dimension
  | 'STACK_COUPLED'     // fundamentally different implementation per stack
  | 'INCOMPATIBLE';     // cannot be implemented on this stack

export type CouplingDimension =
  | 'SERVER_LANGUAGE'
  | 'SERVER_DI_FRAMEWORK'
  | 'SERVER_ASYNC_MODEL'
  | 'SERVER_DATA_ACCESS'
  | 'CLIENT_FRAMEWORK'
  | 'CLIENT_LIFECYCLE'
  | 'CLIENT_STATE_MODEL'
  | 'CLIENT_ROUTING'
  | 'CLIENT_BUILD'
  | 'TEST_FRAMEWORK';

export type ServerStackId =
  | 'node-nestjs'           // TypeScript + NestJS (canonical)
  | 'node-nextjs'           // TypeScript + Next.js API routes
  | 'python-fastapi'        // Python + FastAPI
  | 'php-laravel'           // PHP + Laravel
  | 'php-wordpress'         // PHP + WordPress plugin
  | 'dotnet-aspnet'         // C# + ASP.NET Core
  | 'rust-axum';            // Rust + Axum

export type ClientFrameworkId =
  | 'react-web'             // React.js SPA (canonical)
  | 'angular'               // Angular
  | 'vue'                   // Vue.js
  | 'php-server-rendered'   // PHP server-rendered
  | 'php-wordpress-plugin'  // PHP WordPress plugin
  | 'android-kotlin'        // Native Android (Kotlin)
  | 'ios-swift'             // Native iOS (Swift)
  | 'react-native';         // React Native (mobile, both platforms)

/** Observable subject type — Angular-specific, required for every signal. */
export type AngularSubjectType = 'Subject' | 'BehaviorSubject' | 'ReplaySubject';

/** Angular observable chain risk level. */
export type AngularChainRisk = 'LOW' | 'MEDIUM' | 'HIGH';

/** Server-side coupling annotation for one task type. */
export interface ServerStackCoupling {
  tier: CouplingTier;
  dimensions: CouplingDimension[];
  /** Iron rules that are CONCEPT_NEUTRAL — delivered verbatim to every stack. */
  neutralIronRules: string[];
  /** Per-stack: generation instructions + additional rules + incompatibility reason. */
  stackImplementations: Partial<Record<ServerStackId, StackImplementationEntry>>;
}

export interface StackImplementationEntry {
  generationFrame: string;
  additionalIronRules?: string[];
  incompatible?: boolean;
  incompatibleReason?: string;
  degraded?: boolean;
  degradedReason?: string;
  architectureNotes?: string;
}

/** Angular-specific notes for any client node that carries observable state. */
export interface AngularClientNotes {
  subjectType: AngularSubjectType;
  serviceScope: 'feature-module' | 'root';
  observableChainRisk: AngularChainRisk;
  routeGuardRequired: boolean;
  canDeactivateRequired?: boolean;  // for draft state recovery prompt
  note?: string;
}

/** Client-side coupling annotation for one topology node. */
export interface ClientNodeCoupling {
  tier: CouplingTier;
  dimensions: CouplingDimension[];
  /** Frameworks where this client node is ⛔ INCOMPATIBLE. */
  incompatibleFrameworks: Partial<Record<ClientFrameworkId, string>>;
  /** Angular-specific notes — required if tier is not CONCEPT_NEUTRAL. */
  angularNotes?: AngularClientNotes;
  /** Per-framework: implementation notes where significant. */
  frameworkNotes?: Partial<Record<ClientFrameworkId, string>>;
}

/** Full stack coupling annotation for one task type. */
export interface TaskTypeStackCoupling {
  server: ServerStackCoupling;
  /**
   * Client coupling — only present if this task type has direct client interaction
   * (optimistic actions, app reopen behavior, background signals, draft state).
   * Absent for pure server-side task types.
   */
  client?: ClientNodeCoupling;
  /**
   * Authoritative flag for which stack(s) this task type can be generated for.
   * Defaults to ['node-nestjs'] for backward compatibility with pre-FLOW-00.2 contracts.
   */
  supportedStacks: ServerStackId[];
}
```

### A.2 — Add `stackCoupling` to `EngineContractParams`

In `server/src/engine-contracts/contract-schema.ts`, add to `EngineContractParams`:

```typescript
/**
 * Stack coupling classification for this task type.
 *
 * Business purpose: Allows the planning pipeline (SK-431) and the code generator
 * (FlowGenerator) to know which implementation sections apply for the target stack,
 * and to flag incompatibilities before an implementation session begins.
 *
 * Required by FLOW-00.2. Defaults to IMPL_VARIES on node-nestjs only if absent.
 */
readonly stackCoupling?: TaskTypeStackCoupling;
```

Also add to `EngineContract` class and `toDict()` (snake_case: `stack_coupling`).

### A.3 — Add `HybridGenesisPrompt` interface

New file: `server/src/engine-contracts/hybrid-genesis-prompt.ts`

```typescript
/**
 * HybridGenesisPrompt — Option C structure for genesis seed prompts.
 *
 * Business purpose: Separates the universal iron rules (applicable to any stack)
 * from the stack-specific generation instructions. A developer on any stack
 * can read Section 1 and understand what the service must do. They receive
 * Section 4 with the code generation frame for their specific technology.
 *
 * Section 1: CONCEPT_NEUTRAL iron rules — verbatim for every stack
 * Section 2: Business concept description — what this does for tenants
 * Section 3: Event contracts — CONSUMES / EMITS / BOUNDARY (always neutral)
 * Section 4: Stack implementations — per-stackId generation frames
 * Section 5: Client framework notes — per-clientFrameworkId (optional)
 */
export interface HybridGenesisPrompt {
  taskType: string;
  version: string;
  flowId: string;
  flowName: string;

  /** Section 1: Rules that apply identically on every stack. Never stack-specific. */
  neutralIronRules: string[];

  /** Section 2: What this service does in business terms. Stack-agnostic. */
  conceptDescription: string;

  /** Section 3: Mode C event contracts. Always stack-neutral. */
  eventContracts: {
    consumes: string[];
    emits: string[];
    integrationBoundary: Record<string, 'INJECTABLE' | 'PLATFORM-ONLY'>;
    note?: string;
  };

  /** Section 4: Per-stack generation instructions. */
  stackImplementations: Partial<Record<ServerStackId, StackGenesisEntry>>;

  /** Section 5: Client-side notes per framework. Only for client-facing task types. */
  clientFrameworkNotes?: Partial<Record<ClientFrameworkId, ClientGenesisNote>>;
}

export interface StackGenesisEntry {
  /** The generation instruction for this stack — replaces "Generate a NestJS service..." */
  generationFrame: string;
  /** Rules that apply only on this stack (platform limitations, timeout guards, etc.). */
  additionalIronRules?: string[];
  incompatible?: boolean;
  incompatibleReason?: string;
  degraded?: boolean;
  degradedReason?: string;
}

export interface ClientGenesisNote {
  stateManagementPattern: string;
  angularNotes?: AngularClientNotes;
  offlineQueueMechanism?: string;
  realtimeSignalMechanism?: string;
  draftPersistenceMechanism?: string;
  incompatible?: boolean;
  incompatibleReason?: string;
}
```

### A.4 — Update topology JSON schema

In `contracts/features/feature-manifest.schema.json` root definitions,
add `stackCoupling` definition for topology node objects.

Also add `stackId` to the `platforms[]` entries in the feature manifest schema
(this connects FLOW-37 forward work without breaking FLOW-36):

```json
"stackId": {
  "type": "string",
  "enum": ["node-nestjs", "node-nextjs", "python-fastapi", "php-laravel",
           "php-wordpress", "dotnet-aspnet", "rust-axum"],
  "description": "Which server tech stack this platform entry runs on. Required from FLOW-00.2 onwards."
}
```

### Phase A Gate

```bash
cd server && npx tsc --noEmit    # 0 errors — new types compile cleanly
cd server && npm test             # 0 regression — no existing behavior changed
node scripts/naming-lint.js      # 0 violations — new files follow domain names
```

New files (naming compliant):
```
server/src/engine-contracts/stack-coupling.ts        ✓
server/src/engine-contracts/hybrid-genesis-prompt.ts ✓
```

---

## PHASE B — SKILLS
**What:** Install SK-431, SK-432, SK-433. Update SK-418 to v1.3 (adds V29–V31).
Update SK-419 to add stack coupling awareness. Update planning pipeline to 9 steps.
**Output:** Skill files + updated planning skill.
**Gate:** All skills registered and retrievable. FK-418 v1.3 produces 31/31 checklist.

### B.1 — Install SK-431 StackCouplingAuditor

Source: `.claude/skills/SK-431/SKILL.md` (from stack-coupling-audit-v1.zip)

**What SK-431 does:**
Classifies every element of a flow plan across CONCEPT_NEUTRAL / IMPL_VARIES /
STACK_COUPLED / INCOMPATIBLE. Runs as step 9 of the planning pipeline.
Produces stackCoupling annotations for EngineContractParams and topology.json.
Flags ⛔ INCOMPATIBLE stacks before implementation begins.

Registration:
```python
{
  "id": "SK-431",
  "name": "StackCouplingAuditor",
  "layer": "planning",
  "path": ".claude/skills/SK-431/SKILL.md",
  "requires": ["SK-416"],
  "complements": ["SK-418", "SK-419", "SK-420"],
  "weight": 0.90,
  "triggerKeywords": [
    "stack audit", "stack coupling", "which parts are stack-coupled",
    "does this work on Angular", "Python server", ".NET", "WordPress",
    "incompatible stack", "observable chain", "parallel execution"
  ]
}
```

### B.2 — Install SK-432 HybridPromptBuilder

New skill: builds the Option C hybrid genesis prompt structure for any task type.

**What SK-432 does:**
Takes an existing genesis prompt (or a new task type's spec) and produces the
full `HybridGenesisPrompt` structure: separates neutral iron rules from
stack-specific generation frames. Ensures Section 1 never contains stack syntax.
Ensures Section 4 covers all stackTargets declared in the contract.

Registration:
```python
{
  "id": "SK-432",
  "name": "HybridPromptBuilder",
  "layer": "planning",
  "path": ".claude/skills/SK-432/SKILL.md",
  "requires": ["SK-416", "SK-431"],
  "complements": ["SK-419"],
  "weight": 0.85,
  "triggerKeywords": [
    "genesis prompt", "hybrid prompt", "generate prompt for",
    "convert prompt to hybrid", "stack-specific prompt section"
  ]
}
```

### B.3 — Install SK-433 AngularObservableChainAuditor

New skill: specifically handles the Angular observable chain blast-radius problem.

**What SK-433 does:**
For every `backgroundStep`, `optimisticAction`, and `appReopenBehavior` in a
topology node that targets Angular, determines:
- Correct Subject type (Subject / BehaviorSubject / ReplaySubject)
- Service scope (feature-module vs root, and why)
- Observable chain risk level (LOW / MEDIUM / HIGH)
- Whether CanActivate or CanDeactivate guard is required
- Which other Angular components subscribe to this observable (blast radius)

This skill is invoked by SK-431 when Angular is in the stackTargets.
It cannot be skipped for Angular client nodes.

Registration:
```python
{
  "id": "SK-433",
  "name": "AngularObservableChainAuditor",
  "layer": "planning",
  "path": ".claude/skills/SK-433/SKILL.md",
  "requires": ["SK-431"],
  "complements": ["SK-420"],
  "weight": 0.85,
  "triggerKeywords": [
    "angular", "observable", "BehaviorSubject", "Subject", "service scope",
    "providedIn root", "takeUntilDestroyed", "CanActivate", "CanDeactivate",
    "angular blast radius"
  ]
}
```

### B.4 — Update SK-418 to v1.3 (adds V29–V31)

Archive current `SK-418/SKILL.md` as `SKILL-v1_2-archived.md`.
Install updated version adding three new checks:

```
V29  stackCoupling annotation present on all task types in the plan
     For each T-{N} in the plan:
       EngineContractParams.stackCoupling must be present
       server.tier must be one of: CONCEPT_NEUTRAL | IMPL_VARIES | STACK_COUPLED
       neutralIronRules[] must be non-empty
       supportedStacks[] must be declared
     Exception: pre-FLOW-00.2 task types (T1–T566) tagged in Phase D

V30  All ⛔ INCOMPATIBLE stacks explicitly flagged in the plan
     For every declared stackTarget: if tier = INCOMPATIBLE for that stack,
       incompatibleReason must be present
       mitigation or alternative stack must be documented
     Exception: stacks not in stackTargets need not be assessed

V31  Angular client nodes have angularNotes if angular is in clientTargets
     For every topology node with tier != CONCEPT_NEUTRAL:
       if ClientFrameworkId includes 'angular':
         angularNotes.subjectType must be declared
         angularNotes.serviceScope must be declared
         angularNotes.observableChainRisk must be declared
     Exception: CONCEPT_NEUTRAL client nodes (no observable state)
```

New checklist becomes 31 items. V1–V28 unchanged.

### B.5 — Update SK-419 to v1.1 (stack coupling awareness)

SK-419 ModeCEventContractDesigner already handles event contract design.
Add one check:

```
After producing CONSUMES/EMITS/BOUNDARY for any task type,
verify that all three sections are fully stack-neutral:
  ✗ Event payload field names must not reference framework types
    (no TypeScript interfaces, no Python dataclass references)
  ✗ CONSUMES/EMITS must not specify HTTP methods for stack-to-stack calls
    (all CONSUMES are QUEUE FABRIC — no REST calls)
  ✅ All event types are string literals (not TypeScript enum members)
```

### B.6 — Update how-to-prepare-a-plan-SKILL-v4 to v5

Extend the pipeline to 9 steps and update the checklist:

```
① agent-output-format
② xiigen-core-principles (P1–P11)
③ SK-416 startup
④ infrastructure-discovery
⑤ planning-skill
⑥ plan-review-skill (FC-1 through FC-21)
⑦ flow-reexamination (for user-facing flows)
⑧ SK-430 naming conventions
⑨ SK-431 stack coupling audit + SK-432 hybrid prompt build
→ Gate A (automated: FC-1 through FC-21)
→ Gate B (2 AI cross-reviews)
→ Gate C (Luba approval)
```

### Phase B Gate

```bash
cd server && npm test             # 0 regression
# Verify all 5 skills registered:
curl http://localhost:3000/engine/skills/SK-431
curl http://localhost:3000/engine/skills/SK-432
curl http://localhost:3000/engine/skills/SK-433
# Verify SK-418 checklist now shows 31 items
# Verify SKILL-REGISTRATION-MANIFEST updated to v5
```

---

## PHASE C — PRINCIPLE 11
**What:** Add P11 Stack Coupling to `xiigen-core-principles-SKILL-v2.md` (v3).
**Output:** Updated skill file, updated AGENTS.md reference.
**Gate:** P11 questions answerable for FLOW-01 plan without looking elsewhere.

### P11 — Stack Coupling Awareness

```
PRINCIPLE 11 — Stack Coupling Awareness (NEW — 2026-03-22)

Every flow plan must declare, for every task type and client node,
exactly what is stack-neutral and what requires stack-specific implementation.
A plan that assumes one stack without declaring it is INCOMPLETE.

Plan must show:
  □ stackTargets declared in STATE.json (minimum: ['node-nestjs'] for backward compat)
  □ clientTargets declared in STATE.json (minimum: ['react-web'])
  □ Genesis prompts in HybridGenesisPrompt format (Section 1 neutral, Section 4 per-stack)
  □ stackCoupling annotation on all task types
  □ topology.json nodes have stackCoupling section for client nodes
  □ All ⛔ INCOMPATIBLE stacks flagged with reason before implementation begins
  □ Angular client nodes have angularNotes (subjectType, serviceScope, chainRisk)

Key question for P11: "If a Python developer picks up this plan, can they
implement the server without re-reading any other document? If an Angular
developer picks up this plan, do they know the Subject type, service scope,
and blast radius for every observable?"

Red flags:
  "Generate a NestJS service..." in a genesis prompt without a stackImplementations section
  "T48 runs for 24h" without specifying what that means in a PHP synchronous context
  Angular as a clientTarget without angularNotes on any node with observable state
  WordPress in stackTargets without explicit INCOMPATIBLE flags on fan-in or background tasks
```

### Phase C Gate

```bash
# P11 answerable: produce P11 answers for FLOW-01 as a test
# Output: 4-item checklist filled for FLOW-01
# Confirm: xiigen-core-principles v3 registered in skill store
cd server && npm test   # 0 regression
```

---

## PHASE D — INFRASTRUCTURE FLOWS AUDIT (T1–T566)
**What:** Tag all existing engine contracts (FLOW-25 through FLOW-35)
with `stackCoupling`. These are mostly `portingCandidate: false` — the engine's
own internals. The audit clarifies which rules are universal business logic
and which are NestJS/TypeScript implementation details baked into the engine.
**Output:** `stackCoupling` field added to all T1–T566 contracts. No behavioral change.
**Gate:** All tests pass. `npm run lint:naming` exits 0.

### D.1 — Audit approach for infrastructure flows

For infrastructure flows (FLOW-25 through FLOW-35), the majority of task types
are `portingCandidate: false`. The tagging is simpler:

```typescript
// Pattern for portingCandidate: false task types
stackCoupling: {
  server: {
    tier: 'CONCEPT_NEUTRAL',  // iron rules are universal
    dimensions: [],            // no implementation variation (not ported)
    neutralIronRules: [        // extract from existing ironRules[]
      'storeDocument() BEFORE enqueue() (DNA-8)',
      // ... all existing iron rules
    ],
    stackImplementations: {
      'node-nestjs': {
        generationFrame: '[existing promptText — this is the only stack]',
        incompatible: false
      }
      // no other stacks — portingCandidate: false
    }
  },
  supportedStacks: ['node-nestjs']
}
```

For task types with `portingCandidate: true` in FLOW-25 through FLOW-35:
apply the full IMPL_VARIES / STACK_COUPLED classification.

### D.2 — Batch tagging strategy

Group contracts by the primary coupling characteristic:

**Group 1 — Pure CONCEPT_NEUTRAL server tasks (portingCandidate: false):**
T516–T522 (FLOW-33), T565–T566 (FLOW-35)
→ Tag tier: CONCEPT_NEUTRAL, extract neutralIronRules, set supportedStacks: ['node-nestjs']

**Group 2 — IMPL_VARIES server tasks (portingCandidate: true, porting is syntax only):**
T~389–T412 (FLOW-26 self-developing), T468–T477 (FLOW-30 tenant lifecycle)
→ Tag tier: IMPL_VARIES, list dimensions: [SL][DI], extract neutralIronRules

**Group 3 — STACK_COUPLED server tasks (portingCandidate: true, fundamental differences):**
Fan-in / parallel patterns, long-running background tasks
→ Tag tier: STACK_COUPLED, write stackImplementations per supported stack

### Phase D Gate

```bash
cd server && npx tsc --noEmit    # 0 errors
cd server && npm test             # 0 regression
# Verify: every EngineContract in TaskTypeRegistry has stackCoupling field
node -e "
const { TaskTypeRegistry } = require('./dist/engine-contracts/task-type-registry');
const reg = new TaskTypeRegistry();
// ... verify all registered contracts have stackCoupling
"
```

---

## PHASE E — USER FLOWS AUDIT (FLOW-01 through FLOW-04)
**What:** Full stack coupling audit of T47–T66, all 4 topology.json files,
and all genesis prompts. Produces the definitive coupling annotations that
make the FLOW-01 through FLOW-04 re-review sessions possible.
**Output:** Annotated contracts + updated topology JSONs + hybrid genesis prompts.
**Gate:** SK-418 31-item checklist passes on all 4 flows (including V29–V31).

### E.1 — Task type annotations (T47–T66)

Apply `stackCoupling` to every task type in FLOW-01 through FLOW-04.
Key classifications (from STACK-COUPLING-AUDIT-FLOW-01-04-v1.md):

```
T47 UserRegistrationInitiator (FLOW-01):
  server tier: IMPL_VARIES, dimensions: [SL][DI][AM]
  neutralIronRules: [no PII in event, rate-limit via SETNX, token TTL from FREEDOM config, DNA-8]
  supportedStacks: all 7 (some with degraded notes for php-wordpress)

T48 EmailVerificationWaitState (FLOW-01):
  server tier: STACK_COUPLED, dimensions: [AM][DI]
  neutralIronRules: [24h TTL from FREEDOM config, no PII, resend idempotent via SETNX]
  stackImplementations:
    node-nestjs: long-running via cron/Bull scheduler
    python-fastapi: Celery beat or APScheduler
    php-laravel: Laravel Scheduler
    php-wordpress: incompatible: true (wp_cron unreliable for 24h TTL)
    dotnet-aspnet: IHostedService + Timer
    rust-axum: tokio::time::sleep in spawned task

T50 ParallelProfileEnricher (FLOW-02):
  server tier: STACK_COUPLED, dimensions: [AM][SL]
  neutralIronRules: [all branches run, partial failure OK, sources from FREEDOM config]
  stackImplementations:
    node-nestjs: Promise.allSettled([...])
    python-fastapi: asyncio.gather(*tasks, return_exceptions=True)
    php-laravel: Bus::batch([...]).then(...)
    php-wordpress: incompatible: true
    node-nextjs: Promise.allSettled with timeout guard
    dotnet-aspnet: await Task.WhenAll(tasks) with AggregateException
    rust-axum: futures::future::join_all(tasks).await

T60 EventRegistrationManager (FLOW-03):
  server tier: STACK_COUPLED, dimensions: [ORM][SL]
  neutralIronRules: [atomic capacity check+create, RegistrationFailed on any failure, no PII]
  stackImplementations per ORM

T65 CheckInValidator (FLOW-04):
  server tier: IMPL_VARIES, dimensions: [SL]
  neutralIronRules: [60s TTL MACHINE constant, anti-replay via SETNX, audit write before emit]
  client tier: STACK_COUPLED (QR scanning), dimensions: [CF]
  clientFrameworkNotes:
    react-web: html5-qrcode or quagga.js library
    angular: ngx-scanner library
    android-kotlin: CameraX + ML Kit Barcode Scanning
    ios-swift: AVFoundation + Vision framework
    php-server-rendered: incompatible (server-rendered PHP cannot access camera)
    php-wordpress-plugin: incompatible without JS layer
```

### E.2 — Topology.json stackCoupling annotations

For each of the 4 topology files, add `stackCoupling` to every node:

```json
// FLOW-01 node: awaiting-email-verification
"stackCoupling": {
  "server": {
    "tier": "STACK_COUPLED",
    "dimensions": ["SERVER_ASYNC_MODEL", "SERVER_DI_FRAMEWORK"],
    "neutralConcepts": ["24h wait semantics", "SLA countdown", "resend idempotency"]
  },
  "client": {
    "tier": "STACK_COUPLED",
    "dimensions": ["CLIENT_FRAMEWORK", "CLIENT_STATE_MODEL", "CLIENT_LIFECYCLE"],
    "incompatibleFrameworks": {
      "php-server-rendered": "SLA countdown and optimistic actions require persistent client state",
      "php-wordpress-plugin": "Same as php-server-rendered without JS layer"
    },
    "angularNotes": {
      "subjectType": "BehaviorSubject",
      "serviceScope": "feature-module",
      "observableChainRisk": "MEDIUM",
      "routeGuardRequired": false,
      "note": "ResendButtonState must be feature-scoped. VerificationExpiredRedirect should live in a CanActivate guard, not in the component."
    }
  }
}
```

### E.3 — Genesis prompt conversion (T47–T66)

Convert all 10 existing genesis prompts from the current single-text format
to the HybridGenesisPrompt format (Option C). The existing NestJS prompt text
becomes `stackImplementations['node-nestjs'].generationFrame`. The iron rules
become `neutralIronRules[]`. The CONSUMES/EMITS sections map to `eventContracts`.

### Phase E Gate

```bash
cd server && npx tsc --noEmit    # 0 errors
cd server && npm test             # 0 regression
node scripts/naming-lint.js      # 0 violations

# Run SK-418 v1.3 on all 4 flow plans:
# Each must now produce 31/31 (V1–V28 unchanged + V29 V30 V31 new)
# V29: stackCoupling present on T47–T66
# V30: ⛔ INCOMPATIBLE stacks flagged with reason
# V31: Angular angularNotes present on all client nodes
```

---

## PHASE F — DECISIONS + DOCUMENTATION
**What:** Lock all D-STACK decisions. Update INFRASTRUCTURE-FLOWS-STATE.
Produce STACK-COUPLING-BASE-COMPLETE.md summary. Update SKILL-REGISTRATION-MANIFEST-v5.
**Gate:** All decisions locked. STATE.json updated. Summary document produced.

### F.1 — Add D-STACK-1 through D-STACK-6 to DECISIONS-LOCKED.md

All six decisions from the preamble of this plan.

### F.2 — Update INFRASTRUCTURE-FLOWS-STATE-v4.json

Add `stack_coupling_base` section:
```json
"stack_coupling_base": {
  "status": "COMPLETE",
  "completed_at": "<ISO timestamp>",
  "task_types_annotated": 566,
  "topology_nodes_annotated": <N>,
  "genesis_prompts_converted": <N>,
  "skills_registered": ["SK-431", "SK-432", "SK-433"],
  "sk_418_version": "1.3",
  "principles_version": "v3",
  "decisions_locked": ["D-STACK-1", "D-STACK-2", "D-STACK-3", "D-STACK-4", "D-STACK-5", "D-STACK-6"]
}
```

### Phase F Gate

```bash
cd server && npm test   # 0 regression — final check
grep -c "D-STACK-" DECISIONS-LOCKED.md   # Expected: 6
```

---

## FLOW-01 THROUGH FLOW-04 RE-REVIEW — POST FLOW-00.2

After FLOW-00.2 Phase F is complete, each flow gets a dedicated re-review session.
These are **planning sessions only** — no Claude Code execution. Each session:

1. Reads the STACK-COUPLING-AUDIT produced in Phase E
2. Runs SK-418 v1.3 (31-item checklist)
3. Confirms or corrects V29–V31 for that flow
4. Produces updated reference plan (v9 for FLOW-01, v6 for FLOW-02, etc.)
5. That updated plan is what Claude Code executes for FLOW-01

**Session structure:**
```
Session 1: FLOW-01 re-review (30–45 min planning)
  → FLOW-01-REFERENCE-PLAN-v9.md (31/31 ✅)
  
Session 2: FLOW-02 re-review
  → FLOW-02-REFERENCE-PLAN-v6.md (31/31 ✅)
  
Session 3: FLOW-03 re-review (longest — draft state + Angular notes)
  → FLOW-03-REFERENCE-PLAN-v4.md (31/31 ✅)
  
Session 4: FLOW-04 re-review
  → FLOW-04-REFERENCE-PLAN-v3.md (31/31 ✅)
```

---

## ARTIFACT SUMMARY

```
New types:      CouplingTier, CouplingDimension, ServerStackId, ClientFrameworkId
                TaskTypeStackCoupling, HybridGenesisPrompt
New files:      stack-coupling.ts, hybrid-genesis-prompt.ts
New skills:     SK-431 StackCouplingAuditor
                SK-432 HybridPromptBuilder
                SK-433 AngularObservableChainAuditor
Updated skills: SK-418 → v1.3 (adds V29, V30, V31)
                SK-419 → v1.1 (stack-neutral event contract check)
                how-to-prepare-a-plan → v5 (9-step pipeline, P11)
                xiigen-core-principles → v3 (P11 added)
New decisions:  D-STACK-1 through D-STACK-6 in DECISIONS-LOCKED.md
Annotated:      All T47–T566 with stackCoupling
                All FLOW-01–04 topology nodes with stackCoupling
                All FLOW-01–04 genesis prompts converted to HybridGenesisPrompt
No regressions: All existing tests must pass after every phase
No new user features: pure infrastructure and planning base
```

---

## EXECUTION ORDER

```
FLOW-00.1 (Naming) — complete
  ↓
FLOW-00.2 Phase A (Schema + Types)
  ↓ ⛔ STOP, yes
FLOW-00.2 Phase B (Skills)
  ↓ ⛔ STOP, yes
FLOW-00.2 Phase C (Principle 11)
  ↓ ⛔ STOP, yes
FLOW-00.2 Phase D (Infrastructure Flows Audit T1–T566)
  ↓ ⛔ STOP, yes
FLOW-00.2 Phase E (User Flows Audit FLOW-01–04)
  ↓ ⛔ STOP, yes
FLOW-00.2 Phase F (Decisions + Documentation)
  ↓ ⛔ STOP, yes
  ↓
FLOW-01 re-review session (planning only — produces v9 plan)
  ↓ ⛔ STOP, yes
FLOW-02 re-review session
FLOW-03 re-review session
FLOW-04 re-review session
  ↓
FLOW-01 execution (Claude Code implements against v9 plan)
```
