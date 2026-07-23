---
name: system-intake-design
sk_number: SK-454
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Before designing anything for an existing codebase, extract {structure, intent,
  constraints, quality} from whatever artifacts are provided: TypeScript files,
  Pascal source, Figma JSON, documentation, or any combination. This skill defines
  the extraction protocol per artifact type and produces a domain context package
  that feeds directly into the NODE convergence workflow. Without this skill, every
  intake session re-derives the same methodology from scratch.
  Applies immediately — no infrastructure required.
triggers:
  - "examine this codebase"
  - "understand this system"
  - "intake this project"
  - "analyze this codebase"
  - "what does this system do"
  - "pascal system"
  - "existing codebase"
  - "three repos"
  - "figma plugin intake"
  - "before designing for"
  - "extract context from"
  - "domain context package"
---

# System Intake Design Skill (SK-454) v1.0

## WHEN TO INVOKE

Before designing anything for an existing system.
Before running NODE convergence on a capability that lives in external code.
Before proposing any flow or capability for a codebase you haven't analyzed.

The intake produces a domain context package. That package feeds into SK-435
(node-convergence) as the input to building the NODE.

---

## THE FOUR PROPERTIES TO EXTRACT

Every intake extracts the same four properties regardless of artifact type:

```
structure:   How the system is organized.
             Service boundaries, module layout, dependency graph, entry points.
             Not file names — the conceptual architecture.

intent:      What the system does for users / tenants.
             Business rules, invariants, domain concepts.
             Not what the code does — what the business requires.

constraints: What must always be true.
             Performance bounds, security requirements, data invariants.
             Explicit (documented) + implicit (inferred from behavior).

quality:     How well the system currently serves its intent.
             Gaps, known failures, areas where behavior diverges from intent.
             Where the system is brittle or wrong.
```

---

## EXTRACTION PROTOCOL BY ARTIFACT TYPE

### Code-First System (TypeScript, Python, Java, C#, PHP, etc.)

```
Step 1: Read entry points
  → Find main(), app.listen(), handler(), routes — wherever execution starts
  → These tell you what the system responds to

Step 2: Map service boundaries
  → What modules/services exist? What does each one own?
  → Look for: interfaces, abstract classes, dependency injections
  → Ignore: utilities, helpers, test infrastructure

Step 3: Extract business rules
  → Search for: validation logic, guard clauses, invariant checks
  → grep -r "throw\|error\|fail\|reject\|require\|assert\|must\|cannot" src/
  → Each of these is a candidate constraint

Step 4: Identify event contracts
  → What events/messages does the system produce and consume?
  → Queue configs, event buses, webhooks, pub/sub topics

Step 5: Find quality signals
  → TODO/FIXME/HACK comments
  → Error handling that swallows exceptions without logging
  → Feature flags or kill switches (signals of known instability)
  → Dead code paths that were never removed
```

### Legacy System (Pascal, COBOL, VBA, etc.)

```
Step 1: Find the program entry (BEGIN...END, main procedure)
  → This is the top-level intent

Step 2: Identify data structures
  → RECORD types, TYPE declarations
  → These are the domain entities

Step 3: Extract business procedures
  → Named procedures (PROCEDURE, FUNCTION) are capabilities
  → Each procedure is a candidate task type for the modern equivalent

Step 4: Find the hardcoded constants
  → Legacy systems have extensive hardcoded values
  → Classify each: MACHINE (must stay fixed) or FREEDOM (should be configurable)

Step 5: Identify external dependencies
  → File I/O (input sources, output destinations)
  → Database calls (data model)
  → Communication (if any — reports, exports)

Step 6: Map procedures to modern archetypes
  → Input/output transformation → DATA_PIPELINE
  → Decision routing → ROUTING
  → Long-running process → SCHEDULED
  → Orchestrating multiple steps → ORCHESTRATION
```

### Design System (Figma JSON, Sketch, Adobe XD)

```
Step 1: Read component hierarchy
  → Top-level frames/artboards are screens
  → Component instances are reusable elements
  → Auto-layout frames are structural containers

Step 2: Extract design tokens
  → Colors, typography, spacing — look for named styles
  → These become FREEDOM config (not hardcoded in generated code)

Step 3: Identify intent from naming
  → Component names encode intent: "UserProfileCard", "PaymentForm", "ErrorBanner"
  → Poorly named components require inference from visual structure

Step 4: Infer constraints from design patterns
  → Repeated spacing values → spacing system constraint
  → Consistent color usage → semantic color constraint
  → Error states present → error handling required constraint

Step 5: Identify quality gaps
  → Missing states (no loading state, no error state) → incomplete design
  → Inconsistent component naming → future maintenance constraint
  → Accessibility properties absent → quality deficit
```

### Documentation (markdown, wikis, API specs)

```
Step 1: Extract stated invariants
  → "Must", "always", "never", "required", "guaranteed"
  → Each is a constraint candidate

Step 2: Find the gap between documentation and implied behavior
  → What does the documentation say will happen?
  → What does the code suggest actually happens?
  → The gap is a quality signal — document it explicitly

Step 3: Extract domain vocabulary
  → Domain-specific terms that appear repeatedly
  → These become the domainConcepts in the NODE intent

Step 4: Identify what is NOT documented
  → Error handling, edge cases, concurrent access behavior
  → What documentation omits is often the most important constraint
```

---

## THE DOMAIN CONTEXT PACKAGE FORMAT

After extraction, produce a domain context package in this format:

```json
{
  "sourceType": "code | legacy | design | documentation | mixed",
  "sourceArtifacts": ["path/or/description/of/source"],
  "extractedAt": "ISO-TIMESTAMP",

  "structure": {
    "topLevelComponents": ["ServiceA", "ServiceB", "DatabaseSchema"],
    "boundaries": ["ServiceA owns user auth and token lifecycle"],
    "dependencies": ["ServiceA depends on ServiceB for profile data"],
    "entryPoints": ["POST /api/register", "EventBus: UserRegistrationRequested"]
  },

  "intent": {
    "summary": "One sentence: what does this system do for users?",
    "businessRules": ["Email must be unique before user creation", "..."],
    "domainConcepts": ["idempotency check", "token lifecycle", "..."],
    "invariants": ["User cannot have two active verification tokens simultaneously"]
  },

  "constraints": {
    "explicit": ["CF-1: Email uniqueness before write (documented)"],
    "implicit": ["No PII in queue messages (inferred from data handling)"],
    "unknowns": ["Concurrent access behavior under high load — not documented"]
  },

  "quality": {
    "gaps": ["Error handling swallows exceptions in auth flow"],
    "knownFailures": ["Race condition in token revocation under concurrent resend"],
    "brittleAreas": ["Hardcoded timeout values that will need FREEDOM config"],
    "missingCoverage": ["No error state in email verification UI"]
  }
}
```

---

## CONTEXT_INSUFFICIENT DURING INTAKE

If the extraction cannot answer a question that is required for convergence, emit
a typed context request before proceeding:

```
What you need                              →  Request type
────────────────────────────────────────────────────────────
Queue message schema from another repo    →  DOWNSTREAM_CONTRACT
API contract from a different service     →  REST_CONTRACT
Which version of a schema is current      →  SCHEMA_VERSION
A business decision about an ambiguity    →  HUMAN_JUDGMENT
```

Do not guess. Do not assume. Emit the request and wait.

---

## MINIMUM VIABLE INTAKE

When time is constrained, produce at minimum:

```
□ intent.summary (one sentence — what does this system do for users?)
□ intent.invariants (the 3-5 most important things that must always be true)
□ constraints.implicit (things the code enforces that documentation doesn't state)
□ quality.knownFailures (what breaks silently today)
```

A minimal intake is better than no intake. It prevents the most common design
mistake: proposing a capability architecture that violates an existing invariant.

---

## ANTI-PATTERNS

```
❌ Starting to design before completing the intake
   → "I'll figure out the constraints as I go" = re-work when a violation surfaces
   → Intake first. Design second. Always.

❌ Intake that only reads the happy path
   → The most important constraints are in error handling and edge cases
   → grep for throw/error/fail/reject/require — these encode the real invariants

❌ Treating documentation as ground truth
   → Legacy systems especially: documentation often describes intended behavior,
     not actual behavior. Code is truth.
   → Note the gap in quality.gaps — it's a constraint on the migration.

❌ Producing intent.summary as a technical description
   → "The system uses PostgreSQL with Redis caching" is structure, not intent
   → "The system registers users and verifies their email before granting access" is intent

❌ Skipping quality section because it's uncomfortable
   → The quality section is where the most valuable design decisions come from
   → Known failures inform iron rules. Brittle areas become FREEDOM config targets.
```

---

## INTEGRATION

```
Invoke before: NODE convergence on any external capability
Invoke before: designing any flow for an existing codebase
Produces:      domain context package → feeds into SK-435 (node-convergence)
Feeds into:    planning--convergence-round-design-SKILL.md — context packages per challenger
               planning--iron-rule-derivation-SKILL.md — intent.invariants → iron rules
               code-execution--node-convergence-SKILL.md — STEP 1 domain context assembly
References:    code-execution--github-lab-SKILL.md (SK-436) — reading files from other repos
               planning--claim-verification-SKILL.md (SK-431) — verify extracted facts
```
