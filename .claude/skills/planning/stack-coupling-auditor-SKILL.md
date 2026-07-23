---
name: SK-431-StackCouplingAuditor
version: "1.0.0"
description: >
  Classifies every element of a flow plan (iron rules, genesis prompts, client
  nodes, arbiters) across the CONCEPT_NEUTRAL / IMPL_VARIES / STACK_COUPLED
  taxonomy. Runs as step 9 of the planning pipeline for any flow that will be
  implemented on more than one stack. Produces the stackCoupling annotation
  for EngineContractParams and topology.json, and flags incompatible stacks
  before implementation begins.
author: luba
updated: "2026-03-22"
priority: HIGH
triggers:
  - "stack audit"
  - "which parts are stack-coupled"
  - "does this work on Angular / Python / .NET / WordPress"
  - any planning session where stackTargets includes more than node-react-web
  - before any genesis prompt is written
---

# SK-431 — StackCouplingAuditor

## Purpose

Every flow has two kinds of content: rules that apply to any stack,
and code that only works in one. Mixing them in a single genesis prompt
is the root cause of "NestJS-only" implementation. This skill separates
them and flags what cannot be ported before anyone writes code.

## The Three-Tier Taxonomy

```
✅ CONCEPT_NEUTRAL
  The rule applies word-for-word to every stack.
  The arbiter checking it uses a stack-specific pattern but the RULE is identical.
  Examples: DNA-8 outbox ordering, no PII in events, SETNX idempotency concept,
            FREEDOM config for parameters, tenant isolation

⚡ IMPL_VARIES
  The concept is identical. The code generation is parameterized by dimension.
  The genesis prompt becomes a template with {{VARIABLE}} substitution.
  Examples: Extend MicroserviceBase (syntax differs), DataProcessResult<T> (generics),
            DI injection pattern (varies by DI framework), SETNX implementation

🔴 STACK_COUPLED
  The implementation differs so fundamentally that no shared template works.
  Separate implementation sections are required per stack.
  Examples: Fan-in parallel execution, atomic transaction patterns,
            realtime-push signal delivery, offline queue storage,
            Angular observable Subject type choice, QR scanning

⛔ INCOMPATIBLE
  The concept cannot be implemented on this stack within XIIGen's architecture.
  Must be flagged BEFORE the implementation session begins — not discovered
  during code review.
  Examples: Fan-in parallelism in WordPress, long-running background processes
            in wp-cron, realtime WebSocket in server-rendered PHP
```

## Ten Coupling Dimensions

```
[SL]   SERVER_LANGUAGE         typescript | python | php | csharp | rust
[DI]   SERVER_DI_FRAMEWORK     nestjs | fastapi | laravel | wordpress | aspnet | axum
[AM]   SERVER_ASYNC_MODEL      eventloop | asyncio | laravel-jobs | sync-php | task-async | tokio
[ORM]  SERVER_ORM              typeorm/prisma | sqlalchemy | eloquent | wpdb | efcore | sqlx
[CF]   CLIENT_FRAMEWORK        react-web | angular | vue | php-server | wordpress-plugin
                               | android-kotlin | ios-swift
[CL]   CLIENT_LIFECYCLE        react-hooks | angular-lifecycle | vue-composable
                               | php-session | android-activity | ios-viewcontroller
[CS]   CLIENT_STATE_MODEL      usestate/zustand | rxjs-subject | pinia | php-session
                               | stateflow | combine-published
[CRT]  CLIENT_ROUTING          react-router | angular-router | vue-router | php-redirect
                               | navigation-component | uinavigation
[CB]   CLIENT_BUILD            vite | angular-cli | vite | php-none | gradle | xcode
[TEST] TEST_FRAMEWORK          jest | pytest | phpunit | rust-test | xunit | junit/espresso
```

## Classification Algorithm

For each element in a flow plan, run these four questions in order:

```
Q1: Would a developer on ANY stack implement this identically?
    Yes → ✅ CONCEPT_NEUTRAL. Stop.

Q2: Is the concept identical, but the syntax differs by a known dimension?
    Yes → ⚡ IMPL_VARIES. Name the dimension(s). Parameterize the template.

Q3: Is the implementation so architecturally different that separate
    implementation instructions are required?
    Yes → 🔴 STACK_COUPLED. Write separate sections per stack.

Q4: Does this stack have a structural constraint that prevents
    implementation within XIIGen's architecture model?
    Yes → ⛔ INCOMPATIBLE. Explain why. Propose mitigation or alternative stack.
```

## What Gets Tagged (scope)

Tag every occurrence of:

**In genesis prompts (Pass 7):**
- Every iron rule → NEUTRAL or VARIES
- The generation frame ("Generate a NestJS service...") → always STACK_COUPLED, replace with template
- Every async primitive → dimension [AM]
- Every DI annotation → dimension [DI]
- Every ORM/transaction call → dimension [ORM]

**In topology.json nodes (Pass 3):**
- Every optimisticAction → client tier, dimension [CS][CF]
- appReopenBehavior → client tier, dimension [CL][CRT]
- backgroundSteps realtime-push → client tier, dimension [CF][CL]
- offlineQueue queueable entries → client tier, dimension [CB][CF]
- requiresDraftState → client tier, dimension [CS][CF][CB]

**In arbiters:**
- The BUSINESS RULE → always CONCEPT_NEUTRAL
- The CODE CHECK (how the arbiter detects violation) → IMPL_VARIES or STACK_COUPLED

## Angular Observable Chain Rule (mandatory check)

For every `backgroundStep`, `optimisticAction`, and `appReopenBehavior` in a
topology node, the Angular classification MUST include:

```
angularNotes:
  subjectType:         Subject | BehaviorSubject | ReplaySubject
  serviceScope:        feature-module | root
  observableChainRisk: LOW | MEDIUM | HIGH
  routeGuardRequired:  true | false
  
  Guidance for subjectType:
    Subject:        Use when subscribers only need future events (no reopen needed)
    BehaviorSubject: Use when late subscribers need current state (app reopen)
    ReplaySubject:  Use when late subscribers need history (rare — justify)
    
  Guidance for serviceScope:
    feature-module: State destroyed when feature module unloads. Preferred.
    root:           State persists across navigation. Requires explicit reset on flow exit.
    
  Guidance for observableChainRisk:
    LOW:    Single subscriber. Component owns its subscription.
    MEDIUM: 2-3 subscribers. Document each one.
    HIGH:   4+ subscribers OR root-scoped service. Full blast radius analysis required.
```

## Output Format

For each task type, produce:

```
STACK COUPLING ANNOTATION — T{N} {TaskTypeName}

IRON RULES (CONCEPT_NEUTRAL — deliver to every stack verbatim):
  IR-1: [rule text]
  IR-3: [rule text]
  ...

IMPL_VARIES elements:
  - "Extend MicroserviceBase" → dimensions: [SL]
    S1 NestJS:  class Foo extends MicroserviceBase
    S2 Python:  class Foo(MicroserviceBase):
    S6 .NET:    class Foo : MicroserviceBase
    S7 Rust:    impl MicroserviceBase for Foo

  - "Return DataProcessResult<T>" → dimensions: [SL][AM]
    [per-stack syntax]

STACK_COUPLED elements:
  - Generation frame → [DI][SL]
    [per-stack implementation instructions]

  - "Fan-in parallel execution" → dimensions: [AM][SL]
    S1 NestJS:  Promise.allSettled([...])
    S2 Python:  asyncio.gather(*tasks, return_exceptions=True)
    S3 Laravel: Bus::batch([...]).then(...)
    S4 WP:      ⛔ INCOMPATIBLE — [reason and mitigation]
    ...

CLIENT ANNOTATIONS (if client-facing):
  C1 React:   [pattern]
  C2 Angular:
    subjectType: BehaviorSubject
    serviceScope: feature-module
    observableChainRisk: MEDIUM
    routeGuardRequired: false
    pattern: [Angular-specific pattern]
  C4 PHP:     ⛔ INCOMPATIBLE — [reason]
  ...

ARBITER COUPLING:
  {arbiterId}:
    businessRule: CONCEPT_NEUTRAL — "[rule text]"
    codeCheck: [IMPL_VARIES | STACK_COUPLED]
    dimensions: [DI][SL]
    [per-stack check patterns]
```

## Planning Pipeline Position

SK-431 runs as step 9, after SK-430 (NamingConventionsEnforcer):

```
① agent-output-format
② xiigen-core-principles
③ SK-416 startup
④ infrastructure-discovery
⑤ planning-skill
⑥ plan-review-skill (FC-1 through FC-18)
⑦ flow-reexamination (for user-facing flows)
⑧ SK-430 naming conventions
⑨ SK-431 stack coupling audit ← NEW
→ Gate A/B/C
```

SK-431 adds FC-19, FC-20, FC-21 to the SESSION-0 checklist:

```
FC-19: All genesis prompts have hybrid structure (neutral + per-stack sections)
FC-20: All topology nodes have stackCoupling annotation
FC-21: All ⛔ INCOMPATIBLE stacks flagged with mitigation before implementation
```

## Hard Rules

```
NEVER let a genesis prompt reach Claude Code without the stackCoupling annotation
if the stackTargets field includes more than one stack.

NEVER skip the Angular angularNotes block for any client-facing node in a flow
that targets Angular — even if you think it's "simple". Observable chains are
invisible in React but critical in Angular.

NEVER classify an iron rule as STACK_COUPLED. Iron rules are always NEUTRAL.
If you find yourself wanting to make an iron rule stack-specific, you have
found an implementation detail that does not belong in the iron rules section.
Move it to IMPL_VARIES or STACK_COUPLED elements.

ALWAYS flag WordPress (server and client plugin) incompatibilities explicitly
before the implementation session. The 4 known incompatibilities in FLOW-01-04:
  1. Fan-in parallelism (T50) — ⛔
  2. Long-running background processes (T48, T64) — ⛔
  3. Reliable Redis anti-replay (T65) — ⚠️ degraded via wp_transient
  4. Realtime-push WebSocket (T51, T61) — ⛔ without JS layer
```

## Where Results Live

```
Per task type:    EngineContractParams.stackCoupling field
Per node:         topology.json → nodes[].stackCoupling section
Per genesis prompt: genesisPrompt.stackImplementations + clientFrameworkNotes
Summary:          docs/STACK-COUPLING-AUDIT-FLOW-{XX}.md
```
