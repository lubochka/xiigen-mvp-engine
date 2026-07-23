---
name: stack-portability-design
sk_number: SK-453
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Before any capability gets a stack verdict, classify it using the four-value
  taxonomy: CONCEPT_NEUTRAL, IMPL_VARIES, IMPL_VARIES_WITH_PROVIDER, INCOMPATIBLE.
  The critical question for INCOMPATIBLE verdicts: is the incompatibility at the
  mechanism level or the design level? Mechanism-level incompatibilities become
  IMPL_VARIES_WITH_PROVIDER + fabric interface + FREEDOM config key.
  Design-level incompatibilities are genuine — the concept does not exist in that stack.
  Getting this wrong locks 23+ flows into NestJS-only generation.
triggers:
  - "stack portability"
  - "is this compatible with wordpress"
  - "INCOMPATIBLE"
  - "IMPL_VARIES"
  - "multi-stack"
  - "stack coupling"
  - "classify for stacks"
  - "HybridGenesisPrompt"
  - "stack profile"
  - "stackGenerationFrames"
  - "is this a real incompatibility"
---

# Stack Portability Design Skill (SK-453) v1.0

## WHEN TO INVOKE

Before writing any `stackCoupling` annotation or `stackGenerationFrames` entry.
When a stack gets an INCOMPATIBLE verdict — always ask the mechanism vs design question.
Before writing genesis prompts that contain stack-specific language in Section 1.

---

## THE FOUR CLASSIFICATION VALUES

```
CONCEPT_NEUTRAL:             The concept exists in all target stacks.
                             The implementation differs only in syntax.
                             Example: HTTP request validation exists in every web stack.

IMPL_VARIES:                 The concept exists in all stacks.
                             The implementation mechanism differs meaningfully.
                             Example: Idempotency check — Redis SETNX in NestJS,
                             wp_insert_user with prior uniqueness check in WordPress.

IMPL_VARIES_WITH_PROVIDER:   The concept exists in all stacks, but a specific
                             mechanism varies by provider (not just by stack).
                             A fabric interface abstracts the provider.
                             FREEDOM config key selects the provider.
                             Example: Scheduled jobs — Bull in NestJS, Action Scheduler
                             in WordPress. Both implement "time-bounded async task."
                             ISchedulerService is the fabric interface.

INCOMPATIBLE:                The concept does not exist in that stack at all.
                             There is no mechanism, no plugin, no workaround.
                             Genuine INCOMPATIBLE verdicts are rare.
                             Before using this: apply the mechanism vs design test below.
```

---

## THE MECHANISM VS DESIGN TEST

Every time a stack gets an INCOMPATIBLE verdict, ask:

> **Is this incompatibility at the mechanism level or the design level?**

```
Mechanism level:  A specific technical mechanism is absent from this stack.
                  But the UNDERLYING CONCEPT exists.
                  → The verdict is IMPL_VARIES_WITH_PROVIDER, not INCOMPATIBLE.
                  → Solution: introduce a fabric interface to abstract the mechanism.
                              Add a FREEDOM config key for provider selection.

Design level:     The concept itself does not exist in this stack's paradigm.
                  There is no equivalent concept and no workaround.
                  → The verdict is genuinely INCOMPATIBLE.
                  → Document why. State what would be needed for compatibility.
```

**Worked example — T48 WordPress:**

```
Initial verdict:  INCOMPATIBLE — WordPress has no reliable 24h scheduler
Question:         Is the incompatibility mechanism-level or design-level?
Analysis:         The concept is "time-bounded async task" — schedule an action
                  after a delay. The mechanism in NestJS is Bull/BullMQ delayed jobs.
                  WordPress has Action Scheduler plugin, a job queue with cron-style
                  scheduling. The concept exists; the mechanism differs by provider.
Correct verdict:  IMPL_VARIES_WITH_PROVIDER
Solution:         ISchedulerService fabric interface
                  Bull provider (NestJS), Action Scheduler provider (WordPress)
                  FREEDOM config: xiigen.scheduler_provider
```

---

## THE PORTABILITY PROTOCOL

Apply this protocol for every capability + stack combination:

### Step 1: Extract the abstract concept

Strip all framework names from the capability description. What remains is the concept.

```
NestJS: "Use @Throttle() decorator to limit registration attempts"
Concept: "Rate limit requests per tenant within a time window"
```

The concept is what needs to be expressible in every target stack.

### Step 2: Find the stack equivalent

For each target stack, ask: "How does this stack implement this concept?"

```
Concept:  Rate limit requests per tenant within a time window
NestJS:   @Throttle() decorator with ThrottlerModule
WordPress: get_transient('{tenantId}_reg_limit_{ip}') — note: less reliable under concurrency
Laravel:  RateLimiter::attempt() with Redis backing
```

### Step 3: Classify

```
All stacks have an equivalent concept + similar reliability → CONCEPT_NEUTRAL
All stacks have an equivalent but mechanism differs meaningfully → IMPL_VARIES
Mechanism differs by pluggable provider → IMPL_VARIES_WITH_PROVIDER + fabric interface
No equivalent concept in target stack → INCOMPATIBLE (only if mechanism test confirms)
```

### Step 4: For IMPL_VARIES_WITH_PROVIDER — name the fabric interface

```
Name the concept:   "Scheduled async task execution"
Fabric interface:   ISchedulerService
Methods:            scheduleDelayed(delay: Duration, action: ScheduledAction): Promise<...>
                    cancelScheduled(taskId: string): Promise<...>
Providers:          BullSchedulerProvider (NestJS), ActionSchedulerProvider (WordPress)
FREEDOM key:        xiigen.scheduler_provider: 'bull' | 'action_scheduler'
```

### Step 5: Write the stackCoupling annotation

```typescript
stackCoupling: {
  'node-nestjs:server': {
    tier: 'CONCEPT_NEUTRAL',
    neutralConcepts: ['time-bounded async task', 'scheduled job cancellation'],
    implementationNotes: 'Use ISchedulerService via injection — resolves to BullSchedulerProvider',
  },
  'php-wordpress:server': {
    tier: 'IMPL_VARIES_WITH_PROVIDER',
    neutralConcepts: ['time-bounded async task'],
    implementationNotes: 'ISchedulerService resolves to ActionSchedulerProvider. Use as_schedule_single_action(time() + delay, hook).',
    mitigation: 'Action Scheduler plugin required. Less reliable under high concurrency than Bull.',
    degraded: false,  // acceptable reliability with mitigation noted
  },
}
```

---

## HYBRIDGENESISPROMPT AUTHORING

Once stackCoupling is classified, derive the HybridGenesisPrompt:

```
Section 1 (neutralIronRules):   Rules derived from the concept, not the mechanism.
                                 Stack-neutral language only. No TypeScript, no PHP.
                                 Test: can a developer who knows only the business domain
                                 understand every rule without knowing the tech stack?

Section 2 (conceptDescription): Plain English. What this capability does for users.
                                 No framework names. No language keywords.

Section 3 (eventContracts):     CONSUMES and EMITS as plain strings.
                                 Event names in plain language.

Section 4 (stackGenerationFrames): One entry per target stack.
                                 The NestJS-specific instructions go here.
                                 The WordPress-specific instructions go here.
                                 These may differ significantly — that is correct.
                                 Section 4 is the only place stack-specific language lives.
```

The genesis prompt for any target stack is: Section 1 + Section 2 + Section 3 + Section 4 for that stack.

---

## GENUINE INCOMPATIBLE CASES

These are real INCOMPATIBLE verdicts that withstand the mechanism vs design test:

| Capability | Stack | Why genuinely INCOMPATIBLE |
|---|---|---|
| Real-time WebSocket connection management | WordPress (plugin context) | WordPress request lifecycle is synchronous and stateless; no concept of persistent connection management exists in the plugin paradigm |
| Background service process | WordPress | WordPress has no process model; everything runs within a request context |
| Microservice with DI container | PHP plain (not Laravel) | The DI container paradigm does not exist without a framework that provides it |

Note: each of these has a "requires infrastructure outside the stack" property. If the
incompatibility can be resolved with an additional dependency, it's usually IMPL_VARIES_WITH_PROVIDER.

---

## ANTI-PATTERNS

```
❌ INCOMPATIBLE without applying mechanism vs design test
   → T48 WordPress INCOMPATIBLE was wrong: mechanism-level, not design-level
   → Every INCOMPATIBLE verdict must pass the test before being accepted

❌ neutralIronRules containing framework names
   → "Must use @Throttle() decorator" is a NestJS rule, not a neutral rule
   → Correct: "Rate limiting MUST be enforced per tenant within a time window"
   → The @Throttle() implementation goes in stackGenerationFrames['node-nestjs:server']

❌ Single stackGenerationFrame (NestJS only) when WordPress is a target stack
   → FC-25 checks that at least 2 stack profiles exist for each task type
   → Missing WordPress frame means WordPress generation produces the NestJS frame
   → SILENT_FAILURE: wrong code generated with no error signal

❌ stackCoupling annotations that are never read by the generator
   → The generator must read stackTarget and dispatch to the matching Section 4
   → If ai-generate.handler doesn't read HybridGenesisPrompt.stackGenerationFrames,
     the annotations exist but have no effect
```

---

## INTEGRATION

```
Invoke before:  writing any stackCoupling annotation
Invoke when:    any capability gets INCOMPATIBLE verdict (apply mechanism vs design test)
Invoke before:  writing HybridGenesisPrompt stackGenerationFrames entries
Produces:       stackCoupling annotations, neutralIronRules, stackGenerationFrames
Feeds into:     FC-25 plan-review (stack portability check)
                ai-generate.handler stackTarget routing (Group D fix)
References:     planning--iron-rule-derivation-SKILL.md (SK-449) — neutral rule derivation
                planning--freedom-machine-classification-SKILL.md (SK-451) — FREEDOM config keys
```
