---
name: SK-432-HybridPromptBuilder
version: "1.0.0"
description: >
  Builds the Option C hybrid genesis prompt structure for any task type.
  Separates universal iron rules (Section 1) from stack-specific generation
  frames (Section 4). Converts existing single-text genesis prompts to the
  HybridGenesisPrompt format. Ensures Section 1 never contains stack syntax.
  Invoked during Pass 7 of flow re-examination and during FLOW-00.2 Phase E.
author: luba
updated: "2026-03-22"
layer: planning
requires: [SK-416, SK-431]
complements: [SK-419]
triggers:
  - "genesis prompt"
  - "hybrid prompt"
  - "convert prompt to hybrid"
  - "stack-specific implementation section"
  - Pass 7 of any flow reexamination
---

# SK-432 — HybridPromptBuilder

## Purpose

A genesis prompt that starts with "Generate a NestJS service..." cannot be
used by a Python or .NET developer without first understanding which parts
are NestJS-specific and which are universal. This skill separates them.

**The invariant:** Section 1 (neutral iron rules) must read the same
on every stack. If a sentence in Section 1 mentions a framework name,
a language primitive, or a library, it belongs in Section 4.

## The Four Sections

```
SECTION 1 — NEUTRAL_IRON_RULES
  What goes here: Business rules, ordering constraints, data rules, config rules.
  What NEVER goes here: framework names, language keywords, library calls,
    async primitives (await, async/await, Promise, Task), decorator names (@Injectable),
    ORM method names (transaction(), $transaction(), DB::transaction()),
    any word that only exists in one technology.

  Test: can a developer who knows only the business domain (not the tech stack)
  understand and enforce every rule in this section? If yes → it belongs here.

SECTION 2 — CONCEPT_DESCRIPTION
  Plain English. What this service does for tenants. No technology references.
  Example: "ParallelProfileEnricher runs N enrichment sources simultaneously,
           waits for all to complete or time out, and assembles the enriched profile."

SECTION 3 — EVENT_CONTRACTS
  CONSUMES, EMITS, INTEGRATION BOUNDARY.
  Always language-neutral (event names are strings, not TypeScript types).
  INJECTABLE vs PLATFORM-ONLY classification belongs here.

SECTION 4 — STACK_IMPLEMENTATIONS
  One entry per stackId. Each entry is the generation instruction for that stack.
  The entry may reference framework names, language primitives, library names.
  If a stack is incompatible: state incompatible: true and explain why.
```

## Algorithm: Converting an Existing Prompt

Given an existing single-text genesis prompt:

### Step 1: Identify the neutral iron rules

Read every sentence in the prompt. For each sentence, ask:
"Does this sentence contain a technology name, framework keyword, or library reference?"

```
"storeDocument() BEFORE any event emit"
  → Contains no framework name. storeDocument() is a fabric interface method.
  → ✅ NEUTRAL

"await Promise.allSettled([...enrichmentSources.map(...)])"
  → Promise.allSettled is a JavaScript primitive.
  → 🔴 STACK_COUPLED → move to Section 4

"Extend MicroserviceBase"
  → MicroserviceBase is the XIIGen base class — it exists in every SDK.
  → The CONCEPT is neutral. The SYNTAX (extends vs : vs inheriting) varies.
  → ⚡ IMPL_VARIES → stays in Section 1 as concept, varies in Section 4

"Return DataProcessResult<T> — never throw"
  → DataProcessResult is XIIGen-native, exists in all SDKs.
  → The CONCEPT (return result wrapper) is neutral.
  → The GENERIC SYNTAX (<T> vs [T]) varies.
  → ⚡ IMPL_VARIES → concept in Section 1, syntax in Section 4

"Inject F184 IEnrichmentSourceService via constructor"
  → 'via constructor' is NestJS-specific.
  → The injection concept is neutral; the mechanism varies.
  → Section 1: "Resolve F184 IEnrichmentSourceService via DI"
  → Section 4: NestJS: "constructor(@Inject(F184) private svc: IEnrichmentSourceService)"
               Python: "def __init__(self, svc: IEnrichmentSourceService = Depends(get_svc))"
```

### Step 2: Write Section 4 entries

For each stackId in `supportedStacks[]`, write the generation instruction:

```
Pattern: "[Stack-specific frame sentence]. [Stack-specific implementations of 
          IMPL_VARIES elements]. [Stack-specific iron rules if any]."

node-nestjs example:
  "Generate a NestJS @Injectable() class extending MicroserviceBase.
   Inject F184 via constructor injection.
   Parallel execution: const results = await Promise.allSettled(
     sources.map(s => this.svc.fetch(tenantId, s))
   );
   Return Promise<DataProcessResult<ProfileEnrichmentResult>>."

python-fastapi example:
  "Generate a Python class inheriting MicroserviceBase.
   Inject F184 via FastAPI Depends() or __init__ parameter.
   Parallel execution: results = await asyncio.gather(
     *[source.fetch(tenant_id) for source in sources],
     return_exceptions=True
   )
   Return Awaitable[DataProcessResult[ProfileEnrichmentResult]]."

php-wordpress example (incompatible):
  incompatible: true
  incompatibleReason: "WordPress has no native parallel execution primitive.
    IR-1 (all branches run in parallel) cannot be satisfied within a WordPress
    page request lifecycle. Use php-laravel stack if enrichment parallelism
    is required. Mitigation: Action Scheduler plugin for sequential fallback,
    but this violates the intent of IR-1."
```

### Step 3: Validate Section 1 completeness

Every iron rule that the functional spec arbiter will check must appear in
Section 1. Check: does the arbiter for this task type reference any rule
that is NOT in Section 1? If so, add it.

### Step 4: Add Section 5 if client-facing

If the task type has client interaction (optimistic actions, app reopen,
background signals, draft state), invoke SK-433 AngularObservableChainAuditor
for the Angular entry and add the result to `clientFrameworkNotes.angular`.

## Validation Rules for Finished Prompt

```
□ Section 1 contains no language-specific keywords
  (no: await, async, Promise, Task, Coroutine, chan, Future, Goroutine,
       @Injectable, @Component, [Inject], #[inject],
       transaction(), $transaction(), DB::transaction(),
       NestJS, FastAPI, Laravel, ASP.NET, Axum, Spring)

□ Every iron rule in Section 1 uses XIIGen vocab only:
  (ok: DNA-8, storeDocument(), QUEUE FABRIC, FREEDOM config, SETNX,
       InjectionToken, PLATFORM-ONLY, INJECTABLE, tenantId, correlationId)

□ Section 4 has an entry for every stackId in supportedStacks[]

□ Every INCOMPATIBLE entry has incompatibleReason AND mitigation

□ Every IMPL_VARIES element appears in Section 4 with per-stack syntax

□ Section 3 has no TypeScript interface references — event names are strings
```

## Output Format

```typescript
const prompt: HybridGenesisPrompt = {
  taskType: 'T50',
  version: '1.0.0',
  flowId: 'FLOW-02',
  flowName: 'Business Onboarding Intelligence',
  
  neutralIronRules: [
    'IR-1: ALL enrichment branches must complete (or time out) before T50 emits ProfileEnrichmentCompleted. Partial completion is not terminal.',
    'IR-2: A single source timeout or failure MUST NOT halt T50. T50 continues with remaining sources. EnrichmentSourceFailed is emitted for the failed source.',
    'IR-3: Enrichment source list MUST come from FREEDOM config — never hardcoded. Score-0 violation if provider list is in code.',
    'DNA-8: storeDocument(enrichmentResult) BEFORE emitting any completion event.',
    'DNA-5: All database queries scoped to tenantId.',
  ],
  
  conceptDescription: 'ParallelProfileEnricher runs N enrichment sources simultaneously, waits for all to complete or time out, assembles the enriched profile, and emits a single ProfileEnrichmentCompleted event. Partial failures are acceptable; at least one successful source is required.',
  
  eventContracts: {
    consumes: ['UserOnboardingCompleted — from FLOW-01 T49, via QUEUE FABRIC'],
    emits: ['ProfileEnrichmentInitiated', 'ProfileDataAcquired', 'ProfileEnrichmentCompleted', 'EnrichmentSourceFailed (compensation)'],
    integrationBoundary: {
      'F184 IEnrichmentSourceService': 'INJECTABLE',
      'F189 IAuditTrailService': 'PLATFORM-ONLY',
    },
  },
  
  stackImplementations: {
    'node-nestjs': {
      generationFrame: 'Generate a NestJS @Injectable() class extending MicroserviceBase. Inject F184 via constructor. Parallel: await Promise.allSettled(sources.map(s => this.svc.fetch(tenantId, s))). Filter rejected results without re-throwing. Return Promise<DataProcessResult<ProfileEnrichmentResult>>.',
    },
    'python-fastapi': {
      generationFrame: 'Generate Python class inheriting MicroserviceBase. Inject F184 via Depends(). Parallel: results = await asyncio.gather(*[s.fetch(tenant_id) for s in sources], return_exceptions=True). Filter Exception instances. Return Awaitable[DataProcessResult[ProfileEnrichmentResult]].',
    },
    'php-laravel': {
      generationFrame: 'Generate Laravel Job class. Use Bus::batch([EnrichJob::dispatch($src) for $src in $sources])->then(fn($batch) => $this->emitCompleted($batch))->dispatch(). Individual job failures update batch but do not halt it.',
      additionalIronRules: ['Requires laravel/horizon for reliable queue processing.'],
    },
    'php-wordpress': {
      incompatible: true,
      incompatibleReason: 'WordPress has no native parallel execution. Fan-in of N parallel async operations (IR-1) cannot be implemented within a WordPress page request. Mitigation: use php-laravel stack if enrichment parallelism is required, or implement sequential fallback via Action Scheduler (violates IR-1 intent).',
    },
    'dotnet-aspnet': {
      generationFrame: 'Generate C# class inheriting MicroserviceBase. Parallel: var tasks = sources.Select(s => s.FetchAsync(tenantId)); var results = await Task.WhenAll(tasks); catch (AggregateException ae) for partial failures. Return Task<DataProcessResult<ProfileEnrichmentResult>>.',
    },
    'rust-axum': {
      generationFrame: 'Generate Rust struct implementing MicroserviceBase trait. Parallel: let results = futures::future::join_all(sources.iter().map(|s| s.fetch(tenant_id))).await; filter Err variants without early return. Return impl Future<Output = DataProcessResult<ProfileEnrichmentResult>>.',
    },
  },
  
  // T50 runs in background — no direct client interaction
  // Client receives update via T51 realtime-push signal
  // clientFrameworkNotes defined on T51 topology node, not here
};
```
