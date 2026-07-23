# XIIGEN — GAP REVIEW: EXPECTED vs ACTUAL
## Session type: INVESTIGATION
## Date: 2026-04-01 | Skills: SK-441, SK-434, SK-432
## No code. High-level analysis only.

---

## WHAT LUBA EXPECTS

```
User: "I need a user registration flow on [infra]"
          ↓
Engine: "Here is the plan — step by step"          ← STEP 1: INTENT → PLAN
          ↓
Each plan step → NODE                              ← STEP 2: STEP → NODE
  3 models generate concurrently
  Sonnet judges + arbiters decide
  NODE = { structure, intent, constraints, quality }
          ↓
Each NODE → deeper topology (recursively)          ← STEP 3: NODE → TOPOLOGY
  Each sub-step → sub-NODE
  Convergence until leaf level
          ↓
Leaf NODE → executor / code generation             ← STEP 4: LEAF → CODE
          ↓
At every cycle, visible:                           ← STEP 5: TRANSPARENCY
  What was SENT (prompt/context)
  What was RECEIVED (each model's output)
  What was DECIDED (judge verdict + why)
```

---

## WHAT THE ENGINE ACTUALLY DOES (FLOW-01 live run, 2026-04-01)

```
Seed phase (pre-run):
  Pre-authored contracts injected into Elasticsearch
  Task types T47/T48/T49 are ALREADY NAMED and KNOWN
  Iron rules are ALREADY WRITTEN by a human
          ↓
buildPrompt():
  "Generate a NestJS TypeScript service for task type T47 (archetype: ROUTING).
  IMPLEMENTATION STEPS: 1. generate
  Produce only the TypeScript class implementation. No explanations."
          ↓
3 providers called in parallel (Anthropic + OpenAI + Gemini)
          ↓
Blind judge picks winner
          ↓
DPO triple stored
          ↓
Score reported: T47 = 0.75, T48 = 0.917, T49 = 0.917
```

**The engine starts at what should be the END of Luba's expected flow.**

---

## THE GAP — 5 STRUCTURAL ABSENCES

### GAP-1: No user intent → plan step (Gap class A: INTAKE)

**What should happen:** A user says "I need a user registration flow." The engine
decomposes this into a sequence of named steps with dependencies, in plain language,
before any task type ID exists.

**What actually happens:** Task types (T47, T48, T49), their names, their purposes,
and their iron rules are ALL PRE-AUTHORED by a human before the engine runs.
The engine never generates the plan. It only generates the code from an existing plan.

**Evidence:**
- `FLOW-01-LIVE-RUN.md` BUG-01-006: "`buildPrompt()` sends only taskTypeId+archetype —
  no purpose, name, or factoryDependencies"
- `decompose.handler.ts`: reads `contract.handlers[]` from the database or falls back
  to archetype template — both paths assume a pre-authored contract already exists
- `FLOW-01-SESSION-A.md` is about seeding 53 pre-authored fixture files

**Root cause (Level 3):** The engine has no intake path for human language intent.
It was designed assuming task types are authored by humans in advance, not discovered
by the engine from a user prompt.

---

### GAP-2: No NODE primitive (Gap class B: REPRESENTATION)

**What should happen:** Each plan step is translated into a NODE: a structured
representation with `{ structure, intent, constraints, quality }` that is
stack-neutral and immutable once verified. The NODE is the unit of work — not the
task type ID.

**What actually happens:** The unit of work is a `taskTypeId` string (T47) pointing
to a pre-authored contract document in Elasticsearch. There is no NODE object.
`decompose.handler` returns `planSteps: [{ name: 'generate', order: 0 }]` — a
flat list of strings, not structured representations.

**Evidence:**
- `node-handler.types.ts` defines `NodeHandlerContext` — but "node" here means
  topology node (a step in the AF pipeline), NOT the XIIGen NODE primitive
  `{ structure, intent, constraints, quality }`
- `XIIGEN-ARCHITECTURAL-RETHINKING.md` (memory) identifies this as Gap 1:
  "NODE missing — no {structure, intent, constraints, quality} via convergence"
- Skills exist (`code-execution--node-convergence-SKILL.md`) describing what NODE
  convergence should look like — but no handler implements it

**Root cause (Level 3):** The engine conflates two different concepts both called
"node": (a) AF pipeline topology node (decompose→rag-retrieve→ai-generate→score etc.)
and (b) the XIIGen NODE primitive that represents a capability. These need to be
distinct. Currently only (a) exists.

---

### GAP-3: No convergence.handler (Gap class B: REPRESENTATION)

**What should happen:** When a plan step needs to become a NODE, 3 models each
produce a candidate representation. A judge (Sonnet + domain arbiters) runs a
multi-round conversation until consensus. The result is a verified NODE.

**What actually happens:**
- `ai-generate.handler.ts` DOES run 3 models in parallel and blind-judge the winner
- BUT it is judging GENERATED CODE quality — not NODE representation quality
- The judge prompt is: "evaluate TypeScript code against iron rules"
- There is no round-based conversation to build consensus on WHAT to build —
  only on which implementation is best
- No `convergence.handler` exists in `node-handlers/`

**Evidence from `ai-generate.handler.ts`:**
```
judgePrompt = "You are evaluating generated TypeScript code against these iron rules:...
  Rank these outputs. Reply with JSON only: {ranking, scores, violations}"
```
This is CODE QUALITY judging. It is not DESIGN CONSENSUS building.

**Root cause (Level 3):** Multi-model parallelism is wired for code quality comparison
(which implementation is better) not for design consensus (what the thing should be).
These are different questions requiring different judge prompts and different
conversation structures.

---

### GAP-4: No topology deepening loop (Gap class: ORCHESTRATION)

**What should happen:** A NODE can be expanded into a sub-topology. If a step
is complex, the engine goes deeper: the NODE's children each become sub-NODEs,
each verified by convergence, until leaf nodes are reached and code generation
begins. Depth is determined by the NODE's `complexity` field, not pre-authored.

**What actually happens:**
- The AF pipeline topology is FLAT and PRE-DEFINED:
  `decompose → rag-retrieve → ai-generate → validate → score → feedback`
- This pipeline runs once per task type (T47, T48, T49)
- There is no mechanism to expand a node into sub-nodes dynamically
- The topology is authored in JSON contracts before any user request is received

**Evidence:**
- `FLOW-01-REDESIGN-PLAN.md` redesigns the session FILES (documents) but does not
  redesign the engine's runtime topology expansion capability
- The redesign adds "planning layer" learning (graph edges, DPO triples for planning
  decisions) — but these still assume the topology is known in advance
- `route.handler.ts` routes between KNOWN branches — it does not spawn new branches

**Root cause (Level 3):** The engine architecture is GENERATION-FIRST: it assumes
a complete topology (T47→T48→T49 with their archetypes and iron rules) is known
before execution begins. The user request is merely a trigger to run a pre-designed
flow. The flow is not discovered from the request.

---

### GAP-5: No cycle visibility (Gap class H: VISIBILITY)

**What should happen:** At every convergence cycle, the engine shows:
- What was SENT: the full prompt/context given to each model
- What was RECEIVED: each model's output, visible side by side
- What was DECIDED: which output won, the judge's reasoning, the confidence delta

**What actually happens:**
- `FLOW-01-LIVE-RUN.md` DOES show what was sent and received for T47
  (this was MANUALLY written into the document by the session author, not emitted by the engine)
- The engine logs `debug()` statements but produces no structured cycle report
- The EXECUTION-LOG-A.json through EXECUTION-LOG-F.json are OUTPUT logs, not
  per-cycle transparency reports
- BUG-01-006: even the prompt sent is incomplete (missing purpose, name, dependencies)

**Root cause (Level 3):** The engine was designed as a batch code generator with
DPO output as its primary artifact. Cycle-level transparency was not a design
goal — only the final winner and its score matter to the current pipeline.

---

## ROOT CAUSE CONVERGENCE (SK-432 three-level ladder)

Running cross-gap convergence on all 5 gaps:

| Gap | Level 1 (symptom) | Level 2 (structural) | Level 3 (architectural) |
|-----|------------------|---------------------|------------------------|
| GAP-1 | Task types pre-authored | No intake session type | Engine assumes plan is known before execution |
| GAP-2 | No NODE object | decompose returns flat strings | No NODE primitive in domain model |
| GAP-3 | Judge evaluates code, not design | Multi-model wired for generation only | Multi-model parallelism purpose is wrong |
| GAP-4 | Topology is flat/static | No loop or expand handler | Architecture is generation-first, not discovery-first |
| GAP-5 | No cycle report | Logging is debug-only | Transparency was not a design goal |

**Convergence result: 2 Level-3 root causes govern all 5 gaps.**

```
ROOT CAUSE α: ENGINE IS GENERATION-FIRST
  → Governs GAP-1, GAP-4, GAP-5
  → The engine was designed to generate code from a pre-known task type.
    It has no discovery loop. User intent is not an input — it's pre-encoded
    in contracts authored before the engine runs.
  → Fix class: ARCHITECTURE (planning session required before any code)

ROOT CAUSE β: NO NODE PRIMITIVE IN DOMAIN MODEL
  → Governs GAP-2, GAP-3
  → "Node" means topology step in the current codebase.
    XIIGen NODE = {structure, intent, constraints, quality} doesn't exist.
    Multi-model parallelism is wired to compare implementations, not build
    design representations.
  → Fix class: ARCHITECTURE + NEW_HANDLER (convergence.handler)
```

---

## WHAT THE REDESIGN-PLAN IS ACTUALLY DOING (AND WHY IT MISSES THE POINT)

The FLOW-01-REDESIGN-PLAN.md is a sophisticated document. It adds:
- Graph edges (SK-510..SK-515)
- Planning DPO triples (CALIBRATION_COMPARISON, ROUTING_DECISION records)
- Node completeness grades
- Learning loop: outcomes → confidence deltas on graph edges

**This is correct work — but it operates at the wrong layer.**

The redesign improves how the engine LEARNS FROM CODE GENERATION DECISIONS.
It does not address the absence of the user-intent → NODE → topology loop that
Luba is asking for. After the redesign, the engine will be a better code generator.
It will still not understand a user prompt and build a plan from it.

**In session terms:**
- FLOW-01-REDESIGN-PLAN = making Phase B (Generate) and Phase F (Learning) smarter
- What Luba wants = a Phase 0 that doesn't exist yet: user intent → NODE plan

---

## WHERE THE ENGINE ACTUALLY TEACHES ITSELF (AND WHERE IT DOESN'T)

**What works:**
- Multi-model parallel generation ✅ (GAP-3 mechanism exists, wrong purpose)
- Blind judge with shuffle ✅
- DPO triple storage ✅
- Score brackets + routing ✅
- BFA cross-flow validation ✅
- Iron rules enforcement ✅

**What is completely absent:**
- User natural language → structured plan ❌
- Plan step → NODE via convergence ❌
- NODE → sub-topology expansion ❌
- Progressive depth control ❌
- Per-cycle send/receive/decide transparency ❌

---

## SCOPE CLASSIFICATION (SK-434)

| Fix needed | Scope | Reason |
|-----------|-------|--------|
| Cycle transparency | EXTENSION | Add structured cycle-log emitter to ai-generate.handler; costs one session |
| NODE primitive | NEW_HANDLER | convergence.handler: new handler type, new ES index, new topology step |
| User intent → plan | NEW FLOW | Q1-Q4 pass: learns over time, per-tenant, registry-worthy, not bootstrap |
| Topology deepening | ARCHITECTURE | Requires planning session before any code; changes fundamental execution model |

**The gap Luba is pointing at is primarily ROOT CAUSE α + β = 2 architectural
decisions that must be resolved in a planning session before any implementation.**

---

## WHAT SHOULD HAPPEN NEXT (HIGH LEVEL)

**Not code. A planning session with three questions:**

1. **What is the entry point?**
   "I need a user registration flow" enters the system HOW?
   → An API endpoint? A conversational interface? A structured JSON intake form?
   This determines what `convergence.handler` receives as input.

2. **What is the NODE expansion protocol?**
   When a NODE is produced for "user registration", what determines whether it
   expands into sub-NODEs (T47+T48+T49) vs goes directly to code generation?
   → Complexity threshold? Manual depth setting? Auto-detected by the convergence judge?
   This determines when the deepening loop terminates.

3. **What does the user SEE at each cycle?**
   "Send, receive, decide" — in what format? Real-time stream? Final summary?
   → This determines the visibility design.

**These three questions, answered, produce the Phase 0 design.**
**Phase 0 is what is missing before FLOW-01 through FLOW-09 can teach XIIGen anything meaningful.**

---

## SIMULATION VERDICT (SK-441)

| Step | What must happen | Handler | Input | Actual | Gap |
|------|-----------------|---------|-------|--------|-----|
| User says "I need user registration flow" | Intent parsed into plan | intake.handler | user_text ❌ | NONE | GAP-1 |
| Plan step → NODE | Convergence across 3 models | convergence.handler | plan_step ❌ | NONE | GAP-2, GAP-3 |
| NODE → deeper topology | Expand if complex | expand.handler | NODE ❌ | NONE | GAP-4 |
| Leaf NODE → generate | ai-generate.handler | NODE | WORKS | — |
| Per-cycle visibility | Structured cycle log | cycle-logger | outputs ⚠️ | SILENT_FAILURE | GAP-5 |

**Overall verdict: BREAKS at step 1. Engine never receives user intent.**
**Everything downstream of the current entry point (pre-seeded task type ID) works.**

---

*Gap review complete. ⛔ STOP. Awaiting Luba's direction before any planning or implementation.*
