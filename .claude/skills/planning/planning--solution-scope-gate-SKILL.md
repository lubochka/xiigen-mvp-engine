---
name: solution-scope-gate
sk_number: SK-434
version: "1.0.0"
priority: MANDATORY
load_order: 0
category: planning
author: luba
updated: "2026-03-24"
contexts: ["web-session", "claude-code"]
description: >
  Before proposing ANY solution, classify it on the scope ladder:
  CONVENTION → ADAPTATION → EXTENSION → NEW FLOW → NEW INFRA.
  Start at the lowest scope. Only move up when the lower scope genuinely
  cannot solve the problem. Prevents building what already exists.
triggers:
  - "how do we solve"
  - "we need to build"
  - "what infrastructure do we need"
  - "let's create a new flow"
  - "we need a new service"
  - "we need a new index"
  - "build a tool"
  - "new fabric interface"
  - "classify these gaps"
  - "what fix class"
  - "deduplicate gaps"
  - "gap distribution"
  - "before writing session files"
---

# Solution Scope Gate Skill v1.0

## THE SCOPE LADDER

Apply bottom-up. Stop at the first level that solves the problem.
Document why lower levels are insufficient before claiming a higher one.

---

### CONVENTION
A rule added to `AGENTS.md`, a skill, or a session template. No code.

```
Examples:
  - workspace naming rule: "unzip analysis materials to ~/.xiigen/workspace/{name}/"
  - discoveries log: "write discoveries[] to STATE.json continuously"
  - session type classification: "the word 'fix' = MAINTENANCE SESSION"

Test: can this be expressed as a sentence that humans and AI can follow?
Cost: one sentence. Maximum flexibility. Zero maintenance.
```

→ Start here. Only move to ADAPTATION if convention genuinely cannot solve it.

---

### ADAPTATION
An existing tool, community skill, or MCP connection. Wrapped in XIIGen patterns (FREEDOM config for tokens, AGENTS.md registration). No new code beyond the thin wrapper.

```
Examples:
  - GitHub MCP connected (one toggle) + adapted community skill for branch comparison
  - Docker profile with pre-installed tools: lab environment question
  - Community Claude skill for GitHub API access, wrapped with ISecretsService for PAT

Test: does a working implementation already exist externally?
Cost: one session. Some maintenance. Leverages existing quality.
```

→ If convention is insufficient and something external works, use it.

---

### EXTENSION
New capability added to existing infrastructure. A new step in a gate template, a new signal type in an existing skill, a new FC check, a new parameter on an existing handler.

```
Examples:
  - ARTIFACT_RANGE seeding step added to Phase F gate in flow-implementation-guide-SKILL.md
  - FC-23/24/25 added to plan-review-SKILL.md
  - DESIGN_REASONING signal added to learning-signal-capture-SKILL.md
  - stackTarget parameter added to AF-1 execution call

Test: does this fit naturally into an existing handler, skill, or template?
Cost: one session. Permanent maintenance. Must not break existing behavior.
```

→ If adaptation is insufficient and existing infrastructure can extend, extend it.

---

### NEW FLOW
Net-new topology through the AF pipeline. Registered in flow registry. Full governance chain.

```
Test (Q1-Q4 — all must pass):
  Q1: Does this capability accumulate learning data over time?
  Q2: Should this behave differently per tenant?
  Q3: Should this appear in the flow registry?
  Q4: Is this on the bootstrap-boundary exhaustive list?

If any answer is NO → it's not a flow. Route to lower scope.
Cost: multiple sessions. Full governance. Long-term maintenance.
```

→ Only when extension is genuinely insufficient.

---

### NEW INFRA
New fabric interface, new Elasticsearch index, new service, new external dependency.

```
Test: does nothing in any lower scope category work?
Cost: significant. Foundation for other work. Very high maintenance surface.
```

→ Last resort. If you've reached here without eliminating the lower scopes, go back.

---

## THE GATE QUESTION

Before proposing any solution, answer:

```
1. State the problem clearly in one sentence.
2. Can a CONVENTION solve it? (a rule or document change, no code)
   If yes → use CONVENTION. Done.
3. Does an existing external tool/MCP/skill solve it?
   If yes → ADAPTATION. Document why CONVENTION was insufficient.
4. Can existing infrastructure be extended?
   If yes → EXTENSION. Document why ADAPTATION was insufficient.
5. Does Q1-Q4 pass?
   If yes → NEW FLOW. Document why EXTENSION was insufficient.
6. Is new infrastructure truly required?
   → NEW INFRA. Requires planning session approval.
```

---

## EXAMPLES FROM THE 2026-03-24 ARCHITECTURAL SESSION

| Problem | Wrong scope | Right scope | Why |
|---------|-------------|-------------|-----|
| Artifact registry stale | NEW INFRA (sync script + new index) | EXTENSION (Phase F gate step + FLOW-38 seeding) | FLOW-38 already manages RAG patterns |
| Need to compare branches | NEW FLOW (Code Repository Fabric, FLOW-41) | ADAPTATION (GitHub MCP + community skill) | GitHub compare API already exists |
| Workspace for analysis | NEW INFRA (workspace manager service) | CONVENTION (AGENTS.md rule: unzip to ~/.xiigen/workspace/) | A path convention needs no code |
| Multi-model convergence | EXTENSION (add to existing handler) | NEW FLOW (convergence.handler is a new topology) | Q1-Q4 all pass: learning, per-tenant, registry, not bootstrap |
| Lab environment | NEW FLOW (lab environment flow) | ADAPTATION (docker-compose lab profile with pre-installed tools) | DevOps concern, not application concern |

---

## COMPOSE, ADAPT, BUILD

```
Compose externally  → GitHub MCP exists, don't wrap it in a fabric interface
Adapt minimally     → wrap with FREEDOM config + AGENTS.md, nothing more  
Build only what genuinely doesn't exist
```

---

## ANTI-PATTERNS

```
❌ Reaching for NEW FLOW before checking whether an EXTENSION would work
   → The DESIGN_REASONING signal was added to an existing skill (EXTENSION)
   → It did not need a new flow

❌ Building a sync script when FLOW-38 already manages RAG patterns
   → Self-learning RAG is already infrastructure. Use it.

❌ Proposing a new fabric interface for something GitHub MCP already does
   → ICodeRepositoryService wrapping GitHub = rebuilding what exists
   → Correct answer: GitHub MCP as ADAPTATION, thin skill wrapper

❌ Using "architectural completeness" to justify NEW INFRA
   → Completeness is achieved by using existing infrastructure correctly,
   → not by adding more infrastructure
```

---

## GAP CLASSIFICATION (after simulation, before planning)

When to use: after running simulations that found multiple gaps.
Before synthesizing root causes or writing session plans.
Pairs with simulation-protocol-SKILL.md (SK-441) output.

### Step 1: Assign a category to each gap

```
TOOL         — a fabric interface or external integration is missing
               Example: IScopedMemoryService not defined → analytics patterns break
SKILL        — a genesis prompt, iron rule, or AF-9 criteria is missing
               Example: no ARCHITECTURE_SCAN prompt → intake pipeline can't run
ORCHESTRATION — the topology model can't express this pattern
               Example: no collect.handler → all fan-out scenarios always break
ARCHITECTURE  — the engine's fundamental model doesn't support this
               Example: stackCoupling keyed by 'php-wordpress' → can't be mechanism-first
```

### Step 2: Assign a fix class to each gap

```
CONTENT      — write a genesis prompt, iron rule, or AF-9 quality criteria
               No code. Fastest class. One session per 3-5 gaps.
               Test: "would a prompt or document change close this?"

INTERFACE    — define a new fabric interface + one provider implementation
               Follows IDatabaseService pattern. ~120 lines. Predictable effort.
               Test: "does this follow the existing IScopedMemoryService pattern?"

EXTENSION    — extend an existing handler, skill, or topology model
               Modifies existing code. Must not break existing behavior.
               Test: "does this fit naturally into an existing file?"

NEW_HANDLER  — new handler type in the topology model (collect, loop)
               New pattern. ~200 lines. Requires topology schema extension.
               Test: "does Q1-Q4 pass for this handler? Is it in bootstrap boundary?"

INFRASTRUCTURE — new ES index, new external service, new MCP connection
               Significant. Foundation for other work. High maintenance surface.
               Test: "does nothing in any lower scope work?" (last resort)
```

### Step 3: Deduplicate by root cause

For each new gap, ask: does any existing gap share this root cause?

**Deduplication test:** if the root cause is fixed, do BOTH symptoms disappear?
- YES → one gap, two manifestations. Remove the duplicate. Add "ALSO HITS" note.
- NO  → genuinely separate gaps. Keep both.

Common deduplication patterns:
```
"Fan-out for multiple AI models" = "Fan-out for multiple data items"
  → both: collect.handler doesn't exist → one gap (ORCHESTRATION / NEW_HANDLER)

"NestJS-specific AF-9 judge" ≠ "NestJS-specific named check regex"
  → different layers (judge prompt vs validate.handler), different fixes
  → NOT the same gap despite appearing similar

"No intake for Figma screens" = "No intake for text descriptions"
  → both: intake.handler NONE in topology → one gap (ORCHESTRATION / NEW_HANDLER)
```

### Step 4: Read the fix class distribution — the most important number

Count gaps per fix class after deduplication.

```
> 50% CONTENT  → most work is writing prompts and iron rules; no code changes
                 The engine machinery works. The instructions don't exist.
                 Sessions are fast — one session per 3-5 gaps.

> 30% INTERFACE → predictable effort following IDatabaseService pattern
                 ~120 lines each. Parallel-workable.

> 20% NEW_HANDLER → fundamental topology changes; plan carefully first
                  Requires topology schema extension and tests.

High ARCHITECTURE % → planning session required before any code

```

The 70% CONTENT finding in the 2026-03-24 simulation session changed the
work estimate from "rebuild the engine" to "write the instructions it's missing."
This distribution tells you the nature of the work before you plan a single session.

---

## REFRAME TESTS (run before any session plan is written)

Run these three tests after gap classification and before drafting session files.
They catch wrong abstraction levels that look correct until a challenge exposes them.

### Test 1: "What happens at the next instance of this case?"

**Trigger words:** "for each stack", "per-stack", "maintain a list of",
"pre-authored", "one per technology", "per provider"

If one more instance arrives tomorrow, what happens?
- Manual work required again → WRONG ABSTRACTION LEVEL
- Solution runs automatically → proceed

```
FAILS: pre-author a WordPress stack profile
       → next case: Laravel arrives → manual work again → unbounded

PASSES: system intake pipeline (6 genesis prompts, written once)
       → next case: Laravel arrives → intake runs automatically → bounded
```

### Test 2: "Is this the provider or the capability?"

Apply to every interface name, contract key, config key, and prerequisite name.

**THE IDATABASESERVICE REFERENCE:** IDatabaseService names the capability
(database access), not the provider (Elasticsearch). Every new name must pass
this same test.

```
FAILS:  IRedisService        → Redis is a provider, not a capability
        GitHubMCP            → GitHub is a provider, not a capability
        'php-wordpress' key  → WordPress is a technology, not a mechanism

PASSES: IScopedMemoryService → scoped (tenant-namespaced) + memory (ephemeral)
        ICodeRepositoryService → code repository access capability
        ISchedulerService    → scheduling capability (not Bull, not cron)
        IDatabaseService     → database access (not Elasticsearch)
```

### Test 3: "Does the old model survive inside the new design?"

**Trigger:** any time "the correct model is X instead of Y" was established.

After any architectural reframe, scan the plan for:
- Specific technology names where abstractions should be
- Provider names in interface names
- Per-entity keys where mechanism-first keys should be
- Specific platform integrations where fabric interfaces should be

The old thinking always has at least one hiding place. The three corrections
from the 2026-03-24 session (after the system intake reframe was established):
```
'php-wordpress' key   → survived in T48 reclassification plan
IRedisService         → survived as the Z-2 session title
GitHub MCP            → survived as prerequisite 4
```
All three were found by this test, before session files were written.

**Rule:** Do not draft session files until all three tests return clean.

---

## INTEGRATION

```
Invoke before: any solution proposal, any "we should build X" statement
Invoke after:  simulation-protocol-SKILL.md produces a gap catalog
Invoke during: planning-session-startup (Step ⓪ gate)
Produces:      scope classification + gap classification + reframe findings
References:    planning--bootstrap-boundary-SKILL.md (for NEW FLOW boundary)
               planning--flow-vs-service-gate-SKILL.md (Q1-Q4 test)
               planning--problem-decomposition-SKILL.md (Step 4)
               planning--simulation-protocol-SKILL.md (SK-441) (gap input)
               planning--root-cause-ladder-SKILL.md (SK-432) (root cause after dedup)
```
