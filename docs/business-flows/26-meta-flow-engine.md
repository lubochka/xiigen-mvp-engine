<!--
  Source: business flows.zip / 26-self developing.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-26 meta-flow-engine
  Related deep-research: docs/business-flows/_deep-research/meta-flow-engine/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/meta-flow-engine/ (if present)
-->

I would like the system to be "self build"
Let me take an example
I am describing the flow -> text to video
The sytem generates the flow
for each node makes a cycle of design
Then maybe more sub flows...
But eventually we will have a node implementation
This implementation may contain for example implementing AI Interface Fabric connector to the OPEN AI
It needs to be covered by a tes
make an e2e cycle
deployed locally and tested
And then after everything is working this connector implementation should be a part of core infrastructure > for example by submitting the code into git core infrustruvture
so later if we will need additional functions, logic or algorithms, the system will extend it's own core

This is the holy grail of an autonomous, self-evolving architecture. For a microservices-based workflow platform that orchestrates complex AI models, creating a system that acts as a recursive "Skill Factory" elevates it from a static execution engine to a living, self-improving ecosystem.

What you are describing is essentially a **Meta-Flow**—a workflow whose sole purpose is to design, build, validate, and assimilate new workflows and nodes into the platform's core infrastructure.

Here is how this "Self-Build" architecture can be structured to achieve continuous self-extension:

### The Self-Build Lifecycle

**1. Intent to Graph (The Discovery Phase)**
When you input the prompt ("text to video"), the orchestrator's planning module evaluates the request against its current registry of known nodes and capabilities.

* It breaks the intent down into a Directed Acyclic Graph (DAG) of required steps.
* It identifies a gap: *“I need to connect to OpenAI's video generation API, but I do not currently have an `OpenAIVideoConnector` node.”*

**2. The Skill Factory (Design & Implementation)**
Instead of failing, the system triggers an internal "Self-Build Flow" to create the missing component.

* **Interface Design:** It designs the contract (e.g., inputs: prompt, duration, aspect ratio; outputs: video URL).
* **Code Generation:** It writes the implementation of the connector, adhering to your platform's microservices architecture and standard patterns.
* **Sub-Flows:** If the connector requires complex multi-step logic (like polling for video completion), it designs internal sub-flows for that specific node.

**3. The Validation Crucible (Test & Execute)**
Code generation is only half the battle; trust requires validation.

* **Test Generation:** The system writes unit tests and an E2E test suite specifically for the new connector.
* **Sandboxed Execution:** It deploys the newly generated node into a local, isolated sandbox environment (e.g., an ephemeral Docker container).
* **The E2E Cycle:** It executes the test suite. If the test fails (e.g., a missing API header or timeout), the execution logs are fed back into the Skill Factory for an automatic self-correction loop until the tests pass solidifying a green build.

**4. Assimilation (Extending the Core)**
Once the E2E cycle is successful, the temporary node must become a permanent part of the system's DNA.

* **GitOps Integration:** The system uses a Git integration node to commit the new connector code, its tests, and its documentation into the core infrastructure repository.
* **Registry Update:** It updates the central node registry/manifest.
* **Hot Reload / Deployment:** The microservices architecture discovers the new capability, making the `OpenAIVideoConnector` instantly available for the original "text to video" request—and all future orchestrations.

### Required Architectural Pillars

To make this vision a reality, your underlying architecture needs a few specific mechanisms:

* **Everything is a Node:** The ability to write code, commit to Git, and run tests must themselves be standard nodes in your system. The system uses these foundational nodes to build higher-level nodes.
* **Semantic Code Memory:** Before building a new connector from scratch, the system needs to query its own codebase. If an `OpenAIImageConnector` already exists, the system should read it and *extend* it for video, rather than duplicating the authentication logic.
* **Strict Interface Contracts:** For the system to safely plug in new code, all nodes must adhere to a strict, standardized interface boundary. The orchestrator doesn't need to know *how* the OpenAI node works, only that it consumes and emits the standard JSON payload format your platform expects.

By implementing this Meta-Flow loop, your system doesn't just execute workflows; it essentially becomes an AI software engineer dedicated to infinitely expanding its own capabilities based directly on user demand.

What you’re describing (“describe a flow → system generates missing nodes → designs/implements them → tests + local deploy → then *assimilates* them into core via Git”) fits **exactly** into the engine we’ve been building — but it needs one explicit **Meta-Flow** that combines:

* **FCE self-extension** (gap → new factory + contracts)
* **AF station loop** (generate → review → judge → iterate)
* **Execution/Infra fabrics** (Git/CI/CD/PR + local deploy + runtime promotion ladder)

…and it must do all of that **without breaking the Fabric-first rule** (no direct OpenAI SDK calls, no typed models, etc.). 

Below is the concrete, *no-code orchestration* for the “Self-Build” lifecycle, mapped to the existing architecture.

---

## 1) Self-Build = “Meta-Flow” on top of FCE + Fabrics

### The non-negotiables (from the anchor rules)

When we “add capability”, we are **not** hand-writing services; we’re extending the engine via:

1. **New factory interfaces** resolved through an existing **fabric**
2. **New task-type contracts** in full format
3. **AF station mapping** (generation → judgment loop)
4. **BFA cross-flow validation**
5. **Flow template JSON** (engine output)
6. **DNA compliance** 

This is the “engine-first” rule you already quoted — and it’s the safety mechanism that stops the system from becoming a pile of bespoke code.

---

## 2) The Self-Build Lifecycle (end-to-end)

### Phase A — Gap detection → “CapabilityGapDetected”

Trigger points:

* Planner can’t compile the requested flow because a required factory interface doesn’t exist.
* Or a factory exists, but **capability manifest** doesn’t support the requested operation.

This routes into the **Self-Extension gate** (your “holy grail” meta-loop).

### Phase B — Contract-first creation (no provider coupling)

**Outputs (engine artifacts, not code yet):**

1. **Factory interface spec** (e.g., `IOpenAiVideoProvider` or `IOpenAiChatProvider` — whichever fabric layer it belongs to)
2. **Fabric resolution mapping** (declares which fabric(s) it resolves through)
3. **Task type contract** (engine knows how to generate/validate it)
4. **Schema registration** for any new events the node will emit (so BFA can reason about it later)

This uses the “required engine contract format” (Task Type = ARCHETYPE, deps, fabric resolution, AF config, BFA validation, MACHINE/FREEDOM, IR, QG). 

### Phase C — Implementation cycle per node (the “design loop” you want)

This is the AF loop:

* AF stations are explicitly split into **INVENTORY / SYNTHESIS / JUDGMENT** 
* Each missing node runs:

  1. **AF-4 RAG**: find closest existing provider/connector patterns
  2. **AF-1 Genesis**: generate implementation + tests
  3. **AF-6/7/8**: review + DNA compliance + security
  4. **AF-9 Judge**: enforce iron rules + quality gates
  5. If fail → feed logs back into AF-1/AF-2 and retry (bounded retries)

### Phase D — “Validation Crucible”: local deploy + E2E tests

This is where your requirement goes beyond “generate code”:

We already have the fabric layers needed to do it:

* **Execution Fabric** to do Git/PR/CI/CD operations:
  F54 Source control (clone/branch/commit/push), F55 CI/CD, F56 PR management. 
* **Infrastructure Fabric** to deploy and test locally (or ephemeral):
  F59 container orchestration (K8s deploy/rollback), plus monitoring/secrets as needed. 

So the self-build flow runs:

1. build container(s) for the generated node (sandbox)
2. deploy to a local ephemeral environment (kind/k3d/docker compose — abstracted behind F59)
3. run:

   * unit tests
   * contract tests (schema + idempotency + rate limits)
   * E2E flow test (the *actual flow* that required the node)

### Phase E — Assimilation into core (GitOps promotion)

This is the “become part of the core infrastructure” step:

1. Commit generated implementation + tests into a **staging integration branch**
2. Open PR into the **core infrastructure repo**
3. CI/CD runs mandatory gates (security, regressions, compatibility)
4. On merge: update registry indices so the engine can resolve the new factory via config-first routing (the universal CreateAsync pattern). 
5. Promote via ladder: **DRAFT → WIRED → VALIDATED → INJECTED → MINIMAL → CORE** 

Critically: “CORE” promotion should **never** be fully automatic unless your policy allows it (because that’s the “self-modifying production brain” risk).

---

## 3) No-code orchestration: the Meta-Flow DAG (SelfBuildFlow-v1)

Here’s the orchestration as a flow (conceptual DAG — not implementation code):

1. **DetectGap**

   * input: desired flow spec (e.g., “text → video”)
   * output: `CapabilityGapDetected{ requiredFactoryInterface, requiredCapabilities }`

2. **RAG-ReuseScan (AF-4)**

   * search: existing connector/provider patterns
   * output: `reusePlan{ COPY | ADAPT | REWRITE }`

3. **ContractGenerator**

   * emits: Factory interface spec + Fabric mapping + TaskType contract + Event schema drafts

4. **BFA-Precheck**

   * validates cross-flow contract safety (event schemas, API contracts, state machines, etc.)
   * this is the kind of gap BFA was explicitly designed to catch (event payload change / API contract change / distributed state machine issues). 

5. **GenesisLoop (AF-1→AF-9)**

   * generate node implementation + tests
   * iterate until Judge passes (or escalates)

6. **SandboxDeploy (F59)**

   * deploy generated node locally/ephemeral
   * health checks + smoke tests

7. **E2EFlowTest**

   * execute original requested flow end-to-end using the new node
   * assert: outputs + schema + durability + idempotency

8. **AssimilateToCore (F54/F55/F56)**

   * commit → PR → CI/CD → merge
   * register new factory + capabilities in registry

9. **Promotion**

   * set promotion stage (GENERATED→…→CORE) with explicit criteria per stage 

---

## 4) “AI Interface Fabric connector to OpenAI” — the correct place it lives

Your OpenAI connector **must not** be used directly by services. It must be:

* a **provider implementation** behind the **AI Engine Fabric** (or Video Generation family, depending on what it does)
* resolved via `CreateAsync()` config-first routing (so it’s swappable) 
* never imported directly in business code (no `openai.*` SDK inside services) 

That’s what keeps “self-evolving” from becoming “hard-coded spaghetti”.

---

## 5) Deep research notes: what changes when the system can extend its own core

### The hard problems (and how this architecture contains them)

1. **Regression risk**

   * solved by: CI/CD gates + E2E flow tests + promotion ladder before CORE

2. **Contract drift (events/APIs/state machines)**

   * solved by: schema registration + BFA enforcement (BFA’s blind spots are exactly contract drift and cross-flow propagation). 

3. **Security/supply-chain risk**

   * solved by: AF-8 security scan + “no secrets in code” via vault fabric + signed artifacts in registry

4. **Runaway self-modification**

   * solved by: policy that blocks automatic CORE promotion, requires explicit approval or strong thresholds

---

## 6) Mini-RAG index (attached project sources you should treat as authoritative)

* **basic_prompt.txt** — the “engine-first” rules and MUST-NOT list (fabric-first, full contract format, no direct provider imports). 
* **XIIGEN_ENGINE_ARCHITECTURE_UNIFIED.md** — Execution/Infra/Management fabrics + promotion ladder + factory pattern routing.  
* **V62_BFA_STRESS_TEST.md** — why cross-flow contract validation matters (distributed state machines, event payload changes, API contract changes). 
* **FLOW05_ENGINE_EXTENSION_MERGED_FINAL.md** — concrete “good vs bad” examples showing why stubs and direct imports are build failures. 

---

## Save state (so we can resume without losing the thread)

**SAVE_POINT: SELF_BUILD_META_FLOW:P0**

* Defined the **Self-Build Meta-Flow** that: Gap → Contract → Generate → Test → Local Deploy → GitOps Assimilation → Promotion
* Mapped it to existing architecture primitives: **AF stations**, **Execution/Infra fabrics**, **Promotion ladder**, **BFA**
* Explicitly anchored to Fabric-first + full contract rules

When you say “continue”, the next concrete step is: **turn this Meta-Flow into an engine extension spec** (new task type(s) + a flow template like `self-build-skill-v1`) that uses **F54/F55/F56** for GitOps and **F59** for local deploy/testing.  


### Next: define **FLOW-06 — Self-Build / Skill-Factory Assimilation** (no-code orchestration)

This is the missing “Meta-Flow” that turns **CapabilityGapDetected → working connector → tested + locally deployed → merged into core** using the existing fabrics (Git/CI/CD/PR, containers, secrets, monitoring). The architecture already expects “code → branch → PR → CI/CD → deployed service” as an execution lane. 

Below is the **engine-extension spec** shape (same structure as FLOW-05): contracts + factories + template + guardrails. It stays Fabric-first (no direct provider imports)  and uses the required full contract format. 

---

## 0) What FLOW-06 adds (deliverables)

**New Family (additive):** Family **19 — ENGINE_EVOLUTION**
**New Factory Interfaces (additive):** F190–F197 (8 interfaces)
**New Task Types (additive):** T50–T52 (3 contracts)
**New Flow Template:** `self-build-skill-v1` (phase-gated + loopback)
**BFA registration:** new events + new “skill implementation” entities + cross-flow rules (event chains + API changes)  

---

## 1) Family 19 + Factory Interfaces (F190–F197)

All methods return `DataProcessResult<T>` and use `tenantId` + `Dictionary<string,object>` to stay inside Genie DNA (no typed models). 

### **F190 — ICapabilityGapService** (detect what’s missing)

**Fabric resolution:** DATABASE FABRIC (ES registries) + RAG FABRIC (pattern lookup) + optional Graph/Vector (advanced matching). 
**Key methods:**

* `DetectGapsAsync(tenantId, desiredFlowSpec, ct) → DPR<gapList>`
* `SuggestReuseAsync(tenantId, gap, ct) → DPR<{COPY|ADAPT|REWRITE, candidates[]}>`

### **F191 — IEngineContractSynthesisService** (write the *engine artifacts*)

**Fabric resolution:** AI ENGINE FABRIC + DATABASE FABRIC (store contracts + registries) 
**Key methods:**

* `DraftFactoryInterfaceAsync(tenantId, gap, ct) → DPR<factorySpec>`
* `DraftTaskTypeContractAsync(tenantId, gap, ct) → DPR<taskTypeContract>`
* `DraftFlowTemplateAsync(tenantId, gap, ct) → DPR<flowTemplate>`

### **F192 — INodeImplementationGenesisService** (generate the connector/service)

**Fabric resolution:** AI ENGINE FABRIC + RAG FABRIC (reuse existing patterns) 
**Key methods:**

* `GenerateImplementationAsync(tenantId, factorySpec, ct) → DPR<codeArtifacts>`
* `ApplyFixFromLogsAsync(tenantId, codeArtifacts, testLogs, ct) → DPR<patchedArtifacts>`

### **F193 — ITestGenesisService** (unit + integration + e2e tests)

**Fabric resolution:** AI ENGINE FABRIC + RAG FABRIC
**Key methods:**

* `GenerateUnitTestsAsync(...) → DPR<testArtifacts>`
* `GenerateE2ETestsAsync(flowTemplate, ...) → DPR<e2eArtifacts>`

### **F194 — ISandboxBuildDeployService** (local deploy)

**Fabric resolution:** Infrastructure Fabric (containers) + secret vault + monitoring. 
**Key methods:**

* `BuildImageAsync(tenantId, artifacts, ct) → DPR<imageRef>`
* `DeployEphemeralAsync(tenantId, imageRef, ct) → DPR<envRef>`
* `TeardownAsync(tenantId, envRef, ct) → DPR<ok>`

### **F195 — IValidationRunnerService** (run tests + collect logs)

**Fabric resolution:** CI/CD provider + container orchestration provider + DB for logs.  
**Key methods:**

* `RunUnitAsync(...) → DPR<report>`
* `RunIntegrationAsync(...) → DPR<report>`
* `RunE2EAsync(...) → DPR<report>`
* `CollectArtifactsAsync(...) → DPR<logs+reports>`

### **F196 — IGitAssimilationService** (commit/PR/merge path)

**Fabric resolution:** Execution Fabric (source control + PR + pipeline). 
**Key methods:**

* `CreateBranchAsync(...) → DPR<branch>`
* `CommitAsync(...) → DPR<commit>`
* `OpenPrAsync(...) → DPR<pr>`
* `AwaitCiGreenAsync(...) → DPR<ciResult>`

### **F197 — IPromotionPolicyService** (promotion ladder + approvals)

**Fabric resolution:** feature flags + notifications + project mgmt mapping (optional).  
**Key methods:**

* `EvaluateStageAsync(tenantId, evidenceBundle, ct) → DPR<{DRAFT|WIRED|VALIDATED|INJECTED|MINIMAL|CORE}>` 
* `RequestHumanGateAsync(...) → DPR<approvalTicket>`
* `PromoteAsync(...) → DPR<promotionRecord>`

---

## 2) New Task Types (T50–T52) — full-format contracts (condensed but complete)

### **TASK TYPE: T50 — Self-Build Orchestrator**

* **ARCHETYPE:** ORCHESTRATION 
* **ENTRY:** `CapabilityGapDetected` (from planner) or “build missing connector” command
* **PURPOSE:** Generate + iterate until a missing capability becomes a validated skill
* **DISTINCT FROM:** T7 migration (multi-session legacy), T1 media (domain flow)
* **FACTORY DEPENDENCIES:** F190–F197 (all via CreateAsync routing) 
* **FABRIC RESOLUTION:** Uses DB/Queue/AI/RAG + Execution/Infra/Mgmt fabrics 
* **AF CONFIGURATION:** AF-2/3/4 (inventory) → AF-1/5/10 (synthesis) → AF-6/7/8/9 (judgment) 
* **BFA VALIDATION:** register new events/APIs + verify cross-flow dependencies (event chain + flow-to-flow) 
* **MACHINE/FREEDOM:** MACHINE = promotion rules + safety gates; FREEDOM = which provider to target + env config
* **IRON RULES:** (build failure)

  1. No direct provider imports (must be fabric) 
  2. Must generate tests before assimilation
  3. Must pass local sandbox E2E before PR
  4. Must not auto-promote to CORE without policy approval
* **QUALITY GATES (AF-9):** DNA 6/6, deterministic tests, security scan pass, BFA cross-flow safe, promotion evidence complete 

### **TASK TYPE: T51 — Connector/Provider Genesis Loop**

* **ARCHETYPE:** PROCESSING
* **ENTRY:** T50 spawns per missing interface
* **PURPOSE:** Generate implementation + tests + docs; iterate using logs
* **FACTORY DEPS:** F192, F193, F195
* **IRON RULES:** must return DPR; must be idempotent; must respect rate limits and secret vault usage
* **QUALITY GATES:** compile + unit green + integration green

### **TASK TYPE: T52 — Assimilation & Promotion Gate**

* **ARCHETYPE:** DISTRIBUTION / ORCHESTRATION
* **ENTRY:** “Validated build bundle ready”
* **PURPOSE:** GitOps PR → CI green → merge → registry update → promotion stage write
* **FACTORY DEPS:** F196, F197, F191
* **BFA VALIDATION:** detect API contract changes + event schema changes as first-class changes  
* **QUALITY GATES:** CI must be green + BFA safe + promotion stage allowed

---

## 3) Flow Template: `self-build-skill-v1` (visual, phase-gated, loopback)

**Swimlanes (UI):**

1. **Contract Lane** (gap → factory/task/flow artifacts)
2. **Genesis Lane** (implementation + tests)
3. **Sandbox Lane** (local deploy + e2e)
4. **GitOps Lane** (PR + CI)
5. **Promotion Lane** (DRAFT→…→CORE)

**Core nodes (high level):**

1. `DetectGap` (F190)
2. `DraftEngineArtifacts` (F191)
3. `BFA-Precheck` (register event/API deltas; prevent cross-flow break) 
4. `GenerateImplementation` (F192)
5. `GenerateTests` (F193)
6. `Build+DeploySandbox` (F194)
7. `RunE2E` (F195)
8. **Loopback on failure:** `ApplyFixFromLogs` (F192) → re-run (bounded retries)
9. `CreatePR+RunCI` (F196)
10. `PromoteStage` (F197) using the ladder 
11. `UpdateRegistries` (F191 → DB fabric) so future planning sees the new capability

---

## 4) “Deep research” — the new requirements your holy-grail introduces

1. **Self-build is a distributed state machine** (planner ↔ sandbox ↔ CI ↔ registry). BFA must reason across event chains and flow-to-flow dependencies, not just entity fields. 
2. **Event schema + API contract changes must trigger safety analysis**, otherwise your platform can silently break consumers.  
3. **Deterministic tests for AI connectors**: you need a “record/replay” or mock-mode path (policy: never block promotion on flaky external calls).
4. **Governance**: CORE promotion should be policy-gated (feature flag / approver), because you are literally modifying the platform’s execution substrate. 
5. **Zero-secrets rule**: all provider keys live in vault; the skill only references vault keys (never embeds values).

---

## 5) Mini-RAG index (what to retrieve when implementing FLOW-06)

* **basic_prompt.txt** — Fabric-first, “flow = engine output”, required contract fields, DNA rules. 
* **XIIGEN_ENGINE_ARCHITECTURE_UNIFIED.md** — Execution/Infra/Mgmt fabrics (F54–F68) + flow→work-item mapping.  
* **V62_BFA_STRESS_TEST.md** — why event payload + API contract changes are critical + flow-to-flow dependency gaps.  
* **FLOW05_ENGINE_EXTENSION_MERGED_FINAL.md** — examples of “correct vs forbidden” + promotion ladder evidence style.  

---

## SAVE STATE

**SAVE_POINT: FLOW06_SELF_BUILD:P0**

* Defined Family 19 + factories F190–F197 (gap → contracts → genesis → sandbox → gitops → promotion)
* Defined task types T50–T52 (full-format fields) and template `self-build-skill-v1`
* Captured new requirements: distributed state, BFA event/API coverage, deterministic testing, governance gates

If you say “next” again, I’ll continue with **FLOW06:P1**: the **full factory specs** (each with FABRIC RESOLUTION + FACTORY CREATION block + method signatures + MACHINE/FREEDOM + IRON RULES), matching the strict style used in FLOW-05.

## SELF_BUILD:P1 — Factory Interfaces (FULL SPEC)

Before the specs: **we must stay engine-first** (flows are JSON DAGs in ES, not orchestration code)  and **all external deps are resolved via `IExternalServiceFactory<T>.CreateAsync()` with config-first routing**  (never direct provider SDK imports) .

Also: AF stations are the generation pipeline (INVENTORY / SYNTHESIS / JUDGMENT) , and every generated service must obey the **6 DNA patterns** .

### Numbering (safe, additive)

Current state reserves **F225+** as the next factory range (engine state says “Next: F225”). I’m placing **Self-Build after the next business-flow extension range** to avoid collisions.

* **Family 26: ENGINE_EVOLUTION (Self-Build / Skill Assimilation)**
* **Factories: F233–F240 (8 factories)**

---

# F233 — ICapabilityGapService (ENGINE_EVOLUTION)

**FABRIC RESOLUTION**

* **DATABASE FABRIC** (Skill 05) → ES indices for registries (capabilities, factories, task types, templates) 
* **RAG FABRIC** (Skill 00a/00b) → pattern lookup (7 strategies) 
* **MGMT FABRIC** → optional graph/vector enrich (F65/F66) 

**FACTORY CREATION**
`IExternalServiceFactory<ICapabilityGapService>.CreateAsync(FactoryResolutionContext ctx)` 
Config-first routing order is mandatory. 

**METHODS** *(all return `Task<DataProcessResult<...>>`, all accept `tenantId`)*

1. `DetectGapsAsync(tenantId, Dictionary<string,object> desiredFlowSpec, ct)`
   → `{ gaps:[{ gapId, missingFactoryInterface, missingCapability, why, suggestedFamily }], confidence }`

2. `SuggestReuseAsync(tenantId, Dictionary<string,object> gap, ct)`
   → `{ decision: "COPY|ADAPT|REWRITE", candidates:[{ skillId, factoryRef, similarity, notes }] }`

3. `BuildCapabilityGraphAsync(tenantId, Dictionary<string,object> flowDraft, ct)`
   → `{ nodes:[...], edges:[...], missing:[...] }` (used later by BFA + contract synthesis)

**MACHINE (fixed)**

* Must consult registries + RAG before declaring a “new capability” (prevents duplicate factories).
* Must output deterministic “gapId” keys (hash of request+registry snapshot) for idempotency.

**FREEDOM (configurable)**

* similarity thresholds, RAG strategy selection (Split/FanOut/Tiered/Hybrid/Graph/Vector/Multi) 
* “reuse bias” weights (prefer COPY vs REWRITE)

**DNA**

* Dict payloads, DPR envelope, tenant scoping, no entity controllers. 

---

# F234 — IEngineContractSynthesisService (ENGINE_EVOLUTION)

**FABRIC RESOLUTION**

* **AI ENGINE FABRIC** (IAiProvider + dispatcher) 
* **DATABASE FABRIC** for storing generated contracts + registries 

**FACTORY CREATION**
`IExternalServiceFactory<IEngineContractSynthesisService>.CreateAsync(ctx)` 

**METHODS**

1. `DraftFactoryInterfaceAsync(tenantId, Dictionary<string,object> gap, ct)`
   → `{ interfaceName, familyId, factoryId, fabricResolution:[...], requiredCapabilities:[...] }`

2. `DraftTaskTypeContractAsync(tenantId, Dictionary<string,object> flowIntent, Dictionary<string,object> deps, ct)`
   → **FULL engine contract** must include all required fields  (ARCHETYPE→QUALITY GATES).

3. `DraftFlowTemplateAsync(tenantId, Dictionary<string,object> taskContracts, ct)`
   → `{ templateId, version, nodes:[{ factoryRef, method:"CreateAsync", resolutionContext:{...} }], gates:[...] }`
   (Flow templates are JSON DAG documents stored in ES. )

4. `DraftBfaRegistrationAsync(tenantId, Dictionary<string,object> contractBundle, ct)`
   → `{ entities:[...], events:[...], apis:[...], crossFlowRules:[...] }`
   (needed because BFA must detect event/API changes, not only DB schema changes). 

**MACHINE (fixed)**

* If the generated task type is missing any required contract field → **BUILD FAILURE** (the engine can’t generate). 
* No provider names in code/contracts; only fabric references. 

**FREEDOM**

* contract “style presets” (strict vs verbose), template phase-gating aggressiveness

---

# F235 — INodeImplementationGenesisService (ENGINE_EVOLUTION)

**FABRIC RESOLUTION**

* **AI ENGINE FABRIC** (multi-model + aggregation) 
* **RAG FABRIC** for “extend existing connector patterns”
* **EXECUTION FABRIC (optional)** only for scaffolding in a sandbox repo (not core assimilation yet) 

**METHODS**

1. `GenerateImplementationAsync(tenantId, Dictionary<string,object> factorySpec, ct)`
   → `{ codeBundle:{ files:[{path,content,hash}], build:{...}, runtime:{...} } }`

2. `ApplyFixFromLogsAsync(tenantId, Dictionary<string,object> codeBundle, Dictionary<string,object> testLogs, ct)`
   → `{ patchedBundle, patchSummary, remainingRisks }`

3. `GenerateDocsAsync(tenantId, Dictionary<string,object> factorySpec, ct)`
   → `{ readmeMd, usageExamples, configKeys }`

**MACHINE**

* MUST NOT generate direct provider imports (OpenAI SDK, DB drivers, etc.)—all calls go through fabrics. 
* Must obey DNA patterns. 

**FREEDOM**

* model selection via config (Claude/OpenAI/Gemini/…) 
* “minimize diff” vs “rewrite module” strategy

---

# F236 — ITestGenesisService (ENGINE_EVOLUTION)

**FABRIC RESOLUTION**

* AI ENGINE + RAG (reuse existing test harness patterns)

**METHODS**

1. `GenerateUnitTestsAsync(tenantId, Dictionary<string,object> codeBundle, ct)`
2. `GenerateIntegrationTestsAsync(tenantId, Dictionary<string,object> codeBundle, ct)`
3. `GenerateE2ETestsAsync(tenantId, Dictionary<string,object> flowTemplate, ct)`
4. `GenerateDeterministicHarnessAsync(tenantId, Dictionary<string,object> providerCalls, ct)`
   → “record/replay” or mock mode to avoid flaky external calls in CI.

**MACHINE**

* E2E must test the *actual flow* that triggered the gap (same template chain).
* Tests must validate event payload + API contract registration so BFA can reason (event/API changes are invisible otherwise). 

---

# F237 — ISandboxBuildDeployService (ENGINE_EVOLUTION)

**FABRIC RESOLUTION**

* **INFRA FABRIC** (F59 container orchestration; F62 secrets; F63 monitoring) 
* **DATABASE FABRIC** for sandbox run logs/state

**METHODS**

1. `BuildImageAsync(tenantId, Dictionary<string,object> codeBundle, ct)` → `{ imageRef }`
2. `DeployEphemeralAsync(tenantId, Dictionary<string,object> imageRef, ct)` → `{ envRef, endpoints }`
3. `TeardownAsync(tenantId, Dictionary<string,object> envRef, ct)` → `{ ok }`

**MACHINE**

* Sandbox must be isolated per `traceId` (no shared env state).
* Secrets only through vault (no env var embedding in generated code). 

---

# F238 — IValidationRunnerService (ENGINE_EVOLUTION)

**FABRIC RESOLUTION**

* **EXECUTION FABRIC** (F55 pipelines, F58 artifacts) 
* **INFRA FABRIC** (logs/metrics via monitoring) 

**METHODS**

1. `RunUnitAsync(...)` → `{ pass, reportRef }`
2. `RunIntegrationAsync(...)` → `{ pass, reportRef }`
3. `RunE2EAsync(...)` → `{ pass, reportRef, flowTraceIds:[...] }`
4. `CollectLogsAsync(...)` → `{ logs, failureSignatures }`

**MACHINE**

* If E2E fails: must return normalized failure signatures (so AF-1 can patch deterministically).

---

# F239 — IGitAssimilationService (ENGINE_EVOLUTION)

**FABRIC RESOLUTION**

* **EXECUTION FABRIC** (F54 source control, F56 PR) 

**METHODS**

1. `CreateBranchAsync(tenantId, Dictionary<string,object> targetRepo, ct)` → `{ branch }`
2. `CommitAsync(tenantId, Dictionary<string,object> branch, Dictionary<string,object> artifacts, ct)` → `{ commitSha }`
3. `OpenPrAsync(tenantId, Dictionary<string,object> prSpec, ct)` → `{ prUrl, prId }`
4. `AttachEvidenceAsync(tenantId, Dictionary<string,object> prId, Dictionary<string,object> evidence, ct)`
5. `AwaitCiGreenAsync(tenantId, Dictionary<string,object> prId, ct)` → `{ ciStatus, reports }`

**MACHINE**

* Never push to main directly. Always PR + CI.
* Evidence must include: DNA compliance, BFA registration, E2E run trace.

---

# F240 — IPromotionPolicyService (ENGINE_EVOLUTION)

**FABRIC RESOLUTION**

* **MGMT FABRIC**: feature flags + notifications + project mgmt (F64/F67/F68) 
* **DATABASE FABRIC** for promotion ledger

**METHODS**

1. `EvaluateStageAsync(tenantId, Dictionary<string,object> evidenceBundle, ct)`
   → `{ stage:"DRAFT|WIRED|VALIDATED|INJECTED|MINIMAL|CORE", blockers:[...] }`
   (stage ladder exists in engine) 

2. `RequestHumanGateAsync(tenantId, Dictionary<string,object> gateSpec, ct)` → `{ approvalTicket }`

3. `PromoteAsync(tenantId, Dictionary<string,object> promotionSpec, ct)` → `{ promotionRecord }`

4. `RollbackAsync(tenantId, Dictionary<string,object> rollbackSpec, ct)` → `{ ok }`

**MACHINE**

* CORE promotion should be gated (human or policy), because Self-Build changes the platform substrate.
* Promotion must consider BFA risks like **distributed state machines** and event chain contracts  (otherwise severity scoring is wrong).

---

## MINI-RAG (attached sources) — retrieval keys for Self-Build

Use this as the “quick lookup” index when the engine runs AF-4 RAG:

1. **Factory-first + CreateAsync routing** → XIIGEN_ENGINE_ARCHITECTURE_UNIFIED (DB1/DB2 routing) 
2. **No provider imports / use fabrics only** → basic_prompt  and FLOW05 negative example 
3. **Flow is JSON DAG stored in ES** → basic_prompt 
4. **AF stations + sub-engines** → XIIGEN_ENGINE_ARCHITECTURE_UNIFIED 
5. **DNA patterns** → XIIGEN_ENGINE_ARCHITECTURE_UNIFIED 
6. **Execution/Infra/Mgmt fabrics (Git/CI/CD/PR + K8s/Vault/Monitoring)** → XIIGEN_ENGINE_ARCHITECTURE_UNIFIED 
7. **BFA must detect event schema + API contract changes** (not only DB changes) → V62 stress tests 
8. **BFA must understand distributed state machines** → V62 stress test 

---

## SAVE STATE

**SAVE_POINT: SELF_BUILD_META_FLOW:P1**

* Locked numbering plan for Self-Build as **Family 26, F233–F240** (post next extension range).
* Delivered **full factory specifications**: purpose, fabric resolution, CreateAsync routing, methods, MACHINE/FREEDOM, and guardrails aligned to engine anchors.  
* Added **Self-Build Mini-RAG** to drive AF-4 retrieval.

Say **next** and I’ll produce **SELF_BUILD:P2**: the **full engine contracts** for **T77–T79** (ARCHETYPE→QUALITY GATES) using the required contract format. 

## SELF_BUILD:P2 — Full Engine Contracts (T47–T49)

**Why T47–T49 (not T77…):** the current unified engine state ends at **T46** , and the guardrail is “backward compat / existing numbers unchanged” —so the Self-Build contracts start at the next free IDs.

Also, each contract below follows the **required contract format** (ARCHETYPE → QUALITY GATES) , and assumes **flows are engine output** (JSON DAGs stored in ES)  .

---

# TASK TYPE: **T47 — Self-Build Orchestrator (Skill Factory Assimilation)**

**ARCHETYPE:** ORCHESTRATION 

**ENTRY:**

* `CapabilityGapDetected` emitted by Planner when intent→flow compilation finds missing capability (e.g., “text→video” requires a connector that isn’t registered).
* Explicit operator command: `self_build(skill_name|factory_interface|capability)`.

**PURPOSE:**
End-to-end meta-flow that:

1. detects missing capability, 2) drafts engine artifacts (factory + task type + template + BFA registrations), 3) runs a bounded genesis loop to produce implementation+tests, 4) deploys locally in sandbox and runs E2E, 5) assimilates via PR+CI, 6) updates registries + promotes stage.

**DISTINCT FROM:**

* **T7 Legacy Migration** (multi-session migration of legacy systems; not capability creation). 
* **T3 Figma→System** (application generation, not core capability assimilation). 
* **FLOW-05 contracts** (domain gamification services, not platform self-evolution). 

**FACTORY DEPENDENCIES:** *(all resolved via `CreateAsync()` as per contract requirement)* 

* **F174:** `ICapabilityGapService`
* **F175:** `IEngineContractSynthesisService`
* **F176:** `INodeImplementationGenesisService`
* **F177:** `ITestGenesisService`
* **F178:** `ISandboxBuildDeployService`
* **F179:** `IValidationRunnerService`
* **F180:** `IGitAssimilationService`
* **F181:** `IPromotionPolicyService`

**FABRIC RESOLUTION:** 

* F174 → DATABASE + RAG (registry scan + reuse classification)
* F175 → AI ENGINE + DATABASE (contract drafting + registry writes)
* F176/F177 → AI ENGINE + RAG (generate impl/tests from reusable patterns)
* F178/F179 → INFRA (deploy sandbox) + EXECUTION (collect artifacts) 
* F180 → EXECUTION (Git + PR + CI/CD) 
* F181 → MGMT (flags/approvals/notifications) + DATABASE ledger 

**AF CONFIGURATION:** 

* **INVENTORY:** AF-2 Planning, AF-3 Prompt Library, AF-4 RAG (detect gap + reuse plan)
* **SYNTHESIS:** AF-1 Genesis, AF-5 Multi-model (generate code/tests), AF-10 Merge (if competing candidates)
* **JUDGMENT:** AF-6 Review, AF-7 Compliance (DNA), AF-8 Security, AF-9 Judge (final pass/fail)

**BFA VALIDATION:** (must be explicit per contract) 

* Registers **EVENT_SCHEMA_CHANGE** and **API_CONTRACT_CHANGE** impacts for any new connector/service (the “event payload / API contract” gaps are a known failure class). 
* Builds cross-flow dependency graph entries (so new capabilities don’t silently break existing flows). 
* Enforces “no collisions” rules (event name conflicts / schema conflicts patterns are already formalized as cross-flow conflict rules). 

**MACHINE / FREEDOM:** 

* **MACHINE (fixed):** phase order; bounded retries; evidence bundle required; PR+CI required; registry update required; stage ladder enforced.
* **FREEDOM (configurable):** target provider selection through fabric config; sandbox type (kind/k3d/compose); max retries; quality tier (ACS-21 vs 70-Gate) ; auto-merge policy.

**IRON RULES (violation = BUILD FAILURE):** 
IR-1: New capability must be expressed as **factory + contract + flow template**, not a standalone service (flow = engine output JSON DAG in ES).  
IR-2: No direct provider SDK imports (all external dependencies must be fabric-resolved). (Anti-pattern list explicitly forbids importing providers.) 
IR-3: Must generate tests + pass sandbox E2E before assimilation.
IR-4: Must use PR workflow; no direct mainline pushes (via Execution Fabric). 
IR-5: Must register BFA event/API/chain changes for cross-flow safety. 
IR-6: Must stop at max retry and escalate (no infinite self-mod loop).

**QUALITY GATES (AF-9 validates):** 
QG-1: Contract completeness (all required fields present) 
QG-2: Sandbox deploy health + deterministic harness for external calls (no flaky CI).
QG-3: E2E flow success using the newly generated node.
QG-4: BFA registrations present + conflict rules clean. 
QG-5: Promotion stage computed and consistent with ladder. 

---

# TASK TYPE: **T48 — Connector/Provider Genesis Loop (Per-Gap Builder)**

**ARCHETYPE:** PROCESSING 

**ENTRY:**
Spawned by **T47** once per `gapId`.

**PURPOSE:**
Generate a connector/provider implementation **and** its tests/docs, then iterate using normalized failure signatures until all gates pass or retry budget is exhausted.

**DISTINCT FROM:**

* FLOW-05 generation (domain services); this builds **platform capability nodes**.
* T7 migration (converts legacy; does not produce new fabric-resolved connectors). 

**FACTORY DEPENDENCIES:**

* **F176:** `INodeImplementationGenesisService`
* **F177:** `ITestGenesisService`
* **F179:** `IValidationRunnerService`
* **F178:** `ISandboxBuildDeployService`

**FABRIC RESOLUTION:**

* AI ENGINE + RAG for synthesis; INFRA for sandbox; EXECUTION for artifacts/logs. 

**AF CONFIGURATION:**

* AF-4 RAG → AF-1 Genesis → AF-6/7/8 Review+Compliance+Security → AF-9 Judge, loopback on fail. 

**BFA VALIDATION:**

* If generated node introduces/changes events/APIs, emit a **BFA registration draft** and block “ready” state until it’s included. 

**MACHINE / FREEDOM:**

* **MACHINE:** deterministic failure signature extraction; bounded retries; required test types: unit + integration + E2E.
* **FREEDOM:** model routing (single vs multi-model); COPY/ADAPT/REWRITE choice; timeout budgets.

**IRON RULES:**
IR-1: Must reuse fabrics; forbidden to hard-bind providers (anti-pattern). 
IR-2: Must be sandbox-deployable (containerizable) using Infra Fabric. 
IR-3: Must produce evidence bundle (reports/logs) for assimilation.

**QUALITY GATES:**
QG-1: Build compiles + unit tests pass.
QG-2: Integration tests pass in sandbox.
QG-3: Security scan clean (AF-8). 
QG-4: DNA compliance validated in AF-7 (per engine’s “DNA enforced” principle). 

---

# TASK TYPE: **T49 — Assimilation & Promotion Gate (GitOps → Registry → Stage)**

**ARCHETYPE:** DISTRIBUTION 

**ENTRY:**
Triggered when **T48** emits `ValidatedBuildBundleReady` (contains code artifacts + test reports + BFA registrations + sandbox evidence).

**PURPOSE:**
Turn a validated bundle into a **core-discoverable capability** by: PR creation → CI green → merge → registry updates → promotion stage evaluation.

**DISTINCT FROM:**

* T47 orchestrates the whole self-build; **T49 is the final gate** with GitOps/policy enforcement.

**FACTORY DEPENDENCIES:**

* **F180:** `IGitAssimilationService`
* **F181:** `IPromotionPolicyService`
* **F175:** `IEngineContractSynthesisService` (registry + template update)

**FABRIC RESOLUTION:**

* Execution Fabric for Git/CI/PR 
* Management Fabric for flags/approvals/notifications 
* Database Fabric for registry writes + promotion ledger

**AF CONFIGURATION:**

* AF-9 Judge is mandatory here: enforce iron rules, evidence completeness, backward compat.  

**BFA VALIDATION:**

* Requires finalized cross-flow registration for event chain propagation / conflict rules (the stress-test gaps explicitly demand event chain + output event registration). 

**MACHINE / FREEDOM:**

* **MACHINE:** PR required; CI required; stage ladder enforced; registries updated on merge; rollback supported.
* **FREEDOM:** auto-merge vs reviewer required; which stage may be auto-promoted.

**IRON RULES:**
IR-1: Cannot bypass PR/CI (Execution Fabric is the only path). 
IR-2: Cannot promote to CORE without policy gate (promotion ladder exists and includes human gates in templates).  
IR-3: Registry must be updated so future flows can discover the new capability (factory registry + flow template registry are core engine assets). 

**QUALITY GATES:**
QG-1: CI green + artifacts attached (logs, reports).
QG-2: Backward compatibility preserved (no changes to existing T/F IDs). 
QG-3: Promotion stage computed using ladder: **DRAFT→WIRED→VALIDATED→INJECTED→MINIMAL→CORE**. 
QG-4: “Engine generated” promotion proof aligns to the documented ladder semantics (GENERATED→INJECTED→MINIMAL→CORE pattern is already used as evidence style). 

---

## SAVE STATE

**SAVE_POINT: SELF_BUILD_META_FLOW:P2**

* Added **three full-format engine contracts** in the required schema (T47–T49). 
* Anchored Self-Build to engine guardrails: **Flow = engine output (JSON DAG in ES)** , **AF station routing** , **BFA cross-flow registrations** , **promotion ladder** , **backward compatibility** 

Say **next** and I’ll deliver **SELF_BUILD:P3**: the **Flow Template** `self-build-skill-v1` as an engine-storable **JSON DAG** (nodes, phase gates, loopback wiring, evidence bundle schema), aligned to the template registry format. 

## SELF_BUILD:P3 — Flow Template `self-build-skill-v1.json` (Engine-storable JSON DAG)

This template follows the same **flow-template JSON style** as `lesson-gamification-v1` (templateId/version/taskTypes/requiredFamilies/trigger + executable nodes), where each executable node is a factory-resolved step (`resolve: CreateAsync(ctx)`).  
It also uses the engine’s existing **node types** (Trigger, PhaseGate, HumanApprovalGate, SubFlow) and **Judge loopback semantics** (verdict `LoopBack`). 

> **ID note:** Current registry ends at **F173** and **T46**. 
> This template assumes **new** Self-Build factories are **F174–F181** (additive) and contracts are **T47–T49** (additive).

```json
{
  "templateId": "self-build-skill-v1",
  "version": "1.0",
  "taskTypes": ["T47", "T48", "T49"],
  "requiredFamilies": [18, 1, 2, 4, 5, 17],
  "sessions": "Single (may spawn child subflows)",
  "phaseGated": "Yes (6 gates + 1 human gate)",
  "loopBack": "Phase 4→3 (sandbox fail) OR Phase 5→3 (CI fail) OR per-gap Phase 3→2 (genesis retry)",

  "trigger": {
    "event": "CapabilityGapDetected",
    "source": "JudgeService/PlanOrchestrator",
    "fabric": "QUEUE FABRIC (Skill 04)",
    "validation": "BFA.ValidateEventContract('CapabilityGapDetected') + tenant scope check"
  },

  "promotionLadder": {
    "stages": ["DRAFT", "WIRED", "VALIDATED", "INJECTED", "MINIMAL", "CORE"],
    "policy": {
      "coreRequiresHumanApproval": true,
      "autoPromoteMaxStage": "MINIMAL"
    }
  },

  "evidenceBundleSchema": {
    "gap": { "gapId": "string", "missingFactory": "string", "missingCapability": "string" },
    "contracts": { "taskTypes": "array", "factorySpecs": "array", "flowTemplates": "array" },
    "implementation": { "files": "array", "build": "object", "runtime": "object" },
    "tests": { "unit": "object", "integration": "object", "e2e": "object", "deterministicHarness": "object" },
    "sandbox": { "envRef": "object", "endpoints": "object", "health": "object" },
    "bfa": { "events": "array", "entities": "array", "apis": "array", "crossFlowRules": "array" },
    "security": { "scanReport": "object", "secretsPolicy": "object" },
    "dna": { "matrix": "48/48", "violations": "array" },
    "gitops": { "branch": "string", "commit": "string", "pr": "object", "ci": "object" },
    "promotion": { "stage": "string", "blockers": "array", "approvalTicket": "string|null" }
  },

  "nodes": [
    {
      "nodeId": "phase-0-validate-trigger",
      "type": "TriggerValidation",
      "taskType": "T32",
      "description": "BFA pre-validation for entry event + dedupe guard",
      "factoryCall": { "interface": "IBfaService", "method": "ValidateFlowEntry" },
      "inputEvent": "CapabilityGapDetected",
      "outputRouting": "to-phase-1"
    },

    {
      "nodeId": "phase-1-detect-gaps",
      "type": "Phase",
      "phase": 1,
      "taskType": "T47",
      "steps": [
        {
          "id": "detect-gap-set",
          "factory": "F174",
          "method": "DetectGapsAsync",
          "resolve": "CreateAsync(ctx)",
          "fabric": "DATABASE FABRIC + RAG FABRIC",
          "outputs": ["gaps[]", "capabilityGraph"]
        },
        {
          "id": "reuse-plan",
          "factory": "F174",
          "method": "SuggestReuseAsync",
          "resolve": "CreateAsync(ctx)",
          "dependsOn": ["detect-gap-set"],
          "outputs": ["reusePlanByGap"]
        }
      ]
    },
    {
      "nodeId": "gate-1-gap-detected",
      "type": "PhaseGate",
      "judgeMode": "ArtifactReview",
      "acceptanceCriteria": [
        "gaps.length > 0",
        "each gap has missingFactory + missingCapability",
        "reusePlanByGap exists"
      ],
      "failAction": "RequiresHumanReview"
    },

    {
      "nodeId": "phase-2-draft-engine-artifacts",
      "type": "Phase",
      "phase": 2,
      "taskType": "T47",
      "steps": [
        {
          "id": "draft-factories",
          "factory": "F175",
          "method": "DraftFactoryInterfaceAsync",
          "resolve": "CreateAsync(ctx)",
          "fabric": "AI ENGINE FABRIC + DATABASE FABRIC",
          "foreach": "gaps[]",
          "outputs": ["factorySpecs[]"]
        },
        {
          "id": "draft-task-contracts",
          "factory": "F175",
          "method": "DraftTaskTypeContractAsync",
          "resolve": "CreateAsync(ctx)",
          "dependsOn": ["draft-factories"],
          "outputs": ["taskTypeContracts[]"]
        },
        {
          "id": "draft-flow-template",
          "factory": "F175",
          "method": "DraftFlowTemplateAsync",
          "resolve": "CreateAsync(ctx)",
          "dependsOn": ["draft-task-contracts"],
          "outputs": ["childTemplates[]"]
        },
        {
          "id": "draft-bfa-registration",
          "factory": "F175",
          "method": "DraftBfaRegistrationAsync",
          "resolve": "CreateAsync(ctx)",
          "dependsOn": ["draft-flow-template"],
          "outputs": ["bfaDraft"]
        }
      ]
    },
    {
      "nodeId": "gate-2-contract-completeness",
      "type": "PhaseGate",
      "judgeMode": "ArtifactReview",
      "acceptanceCriteria": [
        "all required contract fields present (ARCHETYPE→QUALITY GATES)",
        "factorySpecs reference fabrics only (no provider SDK binding)",
        "bfaDraft includes events/apis/entities if introduced"
      ],
      "failAction": "LoopBack",
      "loopBackTo": "phase-2-draft-engine-artifacts"
    },

    {
      "nodeId": "phase-3-genesis-per-gap",
      "type": "SubFlow",
      "phase": 3,
      "taskType": "T48",
      "foreach": "gaps[]",
      "subflow": {
        "templateId": "connector-genesis-inline",
        "steps": [
          {
            "id": "generate-implementation",
            "factory": "F176",
            "method": "GenerateImplementationAsync",
            "resolve": "CreateAsync(ctx)",
            "fabric": "AI ENGINE FABRIC + RAG FABRIC",
            "outputs": ["codeBundle"]
          },
          {
            "id": "generate-tests",
            "factory": "F177",
            "method": "GenerateE2ETestsAsync",
            "resolve": "CreateAsync(ctx)",
            "dependsOn": ["generate-implementation"],
            "outputs": ["testBundle"]
          },
          {
            "id": "run-unit-integration",
            "factory": "F179",
            "method": "RunUnitAsync",
            "resolve": "CreateAsync(ctx)",
            "dependsOn": ["generate-tests"],
            "outputs": ["unitReport"]
          }
        ],
        "onFail": {
          "maxRetries": 3,
          "repairStep": {
            "id": "apply-fix-from-logs",
            "factory": "F176",
            "method": "ApplyFixFromLogsAsync",
            "resolve": "CreateAsync(ctx)",
            "inputs": ["codeBundle", "unitReport.logs"],
            "outputs": ["patchedCodeBundle"]
          },
          "retryFrom": "generate-implementation"
        }
      },
      "outputs": ["validatedBundlesByGap[]"]
    },
    {
      "nodeId": "gate-3-genesis-green",
      "type": "PhaseGate",
      "judgeMode": "ArtifactReview",
      "acceptanceCriteria": [
        "validatedBundlesByGap.length == gaps.length",
        "all unitReport.pass == true",
        "no forbidden provider imports detected"
      ],
      "failAction": "LoopBack",
      "loopBackTo": "phase-3-genesis-per-gap"
    },

    {
      "nodeId": "phase-4-sandbox-deploy-and-e2e",
      "type": "Phase",
      "phase": 4,
      "taskType": "T47",
      "steps": [
        {
          "id": "build-and-deploy-sandbox",
          "factory": "F178",
          "method": "DeployEphemeralAsync",
          "resolve": "CreateAsync(ctx)",
          "fabric": "INFRA FABRIC (containers + secrets + monitoring)",
          "inputs": ["validatedBundlesByGap[]"],
          "outputs": ["sandboxEnvRef", "endpoints"]
        },
        {
          "id": "run-e2e",
          "factory": "F179",
          "method": "RunE2EAsync",
          "resolve": "CreateAsync(ctx)",
          "dependsOn": ["build-and-deploy-sandbox"],
          "outputs": ["e2eReport", "flowTraceIds[]"]
        },
        {
          "id": "collect-logs",
          "factory": "F179",
          "method": "CollectLogsAsync",
          "resolve": "CreateAsync(ctx)",
          "dependsOn": ["run-e2e"],
          "outputs": ["failureSignatures", "fullLogs"]
        }
      ],
      "finally": [
        {
          "id": "teardown",
          "factory": "F178",
          "method": "TeardownAsync",
          "resolve": "CreateAsync(ctx)",
          "inputs": ["sandboxEnvRef"]
        }
      ]
    },
    {
      "nodeId": "gate-4-e2e-green",
      "type": "PhaseGate",
      "judgeMode": "ArtifactReview",
      "acceptanceCriteria": ["e2eReport.pass == true"],
      "failAction": "LoopBack",
      "loopBackTo": "phase-3-genesis-per-gap",
      "notes": "Loop back to genesis with failureSignatures to patch only failing gaps"
    },

    {
      "nodeId": "phase-5-gitops-assimilation",
      "type": "Phase",
      "phase": 5,
      "taskType": "T49",
      "steps": [
        {
          "id": "create-branch",
          "factory": "F180",
          "method": "CreateBranchAsync",
          "resolve": "CreateAsync(ctx)",
          "fabric": "EXECUTION FABRIC (Git)",
          "outputs": ["branch"]
        },
        {
          "id": "commit-artifacts",
          "factory": "F180",
          "method": "CommitAsync",
          "resolve": "CreateAsync(ctx)",
          "dependsOn": ["create-branch"],
          "inputs": ["validatedBundlesByGap[]", "taskTypeContracts[]", "bfaDraft", "e2eReport"],
          "outputs": ["commitSha"]
        },
        {
          "id": "open-pr",
          "factory": "F180",
          "method": "OpenPrAsync",
          "resolve": "CreateAsync(ctx)",
          "dependsOn": ["commit-artifacts"],
          "outputs": ["pr"]
        },
        {
          "id": "await-ci",
          "factory": "F180",
          "method": "AwaitCiGreenAsync",
          "resolve": "CreateAsync(ctx)",
          "dependsOn": ["open-pr"],
          "outputs": ["ciResult"]
        }
      ]
    },
    {
      "nodeId": "gate-5-ci-green",
      "type": "PhaseGate",
      "judgeMode": "ArtifactReview",
      "acceptanceCriteria": ["ciResult.status == 'GREEN'"],
      "failAction": "LoopBack",
      "loopBackTo": "phase-3-genesis-per-gap"
    },

    {
      "nodeId": "phase-6-promotion-and-registry-update",
      "type": "Phase",
      "phase": 6,
      "taskType": "T49",
      "steps": [
        {
          "id": "evaluate-stage",
          "factory": "F181",
          "method": "EvaluateStageAsync",
          "resolve": "CreateAsync(ctx)",
          "inputs": ["evidenceBundleSchema"],
          "outputs": ["promotionDecision"]
        },
        {
          "id": "human-core-approval",
          "type": "HumanApprovalGate",
          "when": "promotionDecision.stage == 'CORE'",
          "outputs": ["approvalTicket"],
          "timeout": "P7D"
        },
        {
          "id": "promote",
          "factory": "F181",
          "method": "PromoteAsync",
          "resolve": "CreateAsync(ctx)",
          "dependsOn": ["evaluate-stage", "human-core-approval"],
          "outputs": ["promotionRecord"]
        },
        {
          "id": "finalize-registries",
          "factory": "F175",
          "method": "DraftFlowTemplateAsync",
          "resolve": "CreateAsync(ctx)",
          "note": "Write final factory/task/template registry updates (discoverable in future planning)",
          "dependsOn": ["promote"],
          "outputs": ["registryWrites"]
        }
      ]
    }
  ],

  "savePoints": [
    { "key": "SELF_BUILD:P1", "afterNode": "gate-1-gap-detected" },
    { "key": "SELF_BUILD:P2", "afterNode": "gate-2-contract-completeness" },
    { "key": "SELF_BUILD:P3", "afterNode": "gate-3-genesis-green" },
    { "key": "SELF_BUILD:P4", "afterNode": "gate-4-e2e-green" },
    { "key": "SELF_BUILD:P5", "afterNode": "gate-5-ci-green" }
  ],

  "resumeHints": {
    "onLoopBack": "Use failureSignatures to patch only the failing gap subflow(s); do not regenerate successful ones",
    "debugSurface": [
      "GET /api/debug/{traceId}",
      "GET /api/debug/{traceId}/phase/{phaseId}",
      "GET /api/debug/{traceId}/judge/{phaseId}",
      "GET /api/debug/{traceId}/gaps"
    ]
  }
}
```

### How this matches the engine’s canonical flow semantics

* **Templates are registry-driven** (templateId/version + taskTypes), same pattern as `lesson-gamification-v1`. 
* Uses the engine’s **phase gates + Judge ArtifactReview** mechanism (the same machine runs across tasks and gates). 
* Uses built-in **node types** including `HumanApprovalGate` and `SubFlow`. 
* The **loopback** behavior mirrors existing loopback templates (e.g., figma Phase 7→6) but adapted for “sandbox/CI failed → go back to genesis”. 
* GitOps + local deploy is explicitly supported by the **Execution Fabric** (“Code → branch → PR → CI/CD → deployed service”) and **Infrastructure Fabric**.  

---

## SAVE STATE

**SAVE_POINT: SELF_BUILD_META_FLOW:P3**

* Delivered `self-build-skill-v1.json` as an **engine-storable JSON DAG** template (nodes + gates + loopbacks + human approval).
* Included an explicit **evidence bundle schema** for promotion + registry assimilation.
* Anchored to existing template patterns and engine node/gate semantics.  

Say **next** and I’ll do **SELF_BUILD:P4**: the **BFA registrations** that Self-Build must generate (event schemas + API contract deltas + cross-flow conflict rules), so the “new connector” doesn’t become an invisible breaking change.


## SELF_BUILD:P4 — BFA Registration Pack (events + APIs + entities + cross-flow rules)

BFA’s job is to catch **cross-service / cross-flow breakage before code ships** (the “6-step T32 engine”). 
For Self-Build, BFA must explicitly close the same high-severity gaps highlighted in the stress tests:

* **G1** event payload changes must be detectable,
* **G2** event chain propagation must be tracked,
* **G3** distributed state machines must be modeled,
* **G5** flow-to-flow dependency via events must be registered,
* **G6** multi-database entity fragments must be mapped. 

In FLOW-05 we already proved the pattern: “INJECTED” stage = **BFA registers + cross-flow validates**. 
Self-Build reuses the same phase meaning.

---

# 1) What Self-Build must register in BFA

### A) **BFA Events** (platform + generated-skill events)

**Goal:** make schema changes detectable (G1) and allow propagation graphs (G2). 

**Minimum platform events (ENGINE_EVOLUTION namespace):**

1. `CapabilityGapDetected` *(entry trigger already used in the template)*
2. `SkillBuildRequested`
3. `EngineArtifactsDrafted` *(factory spec + task contracts + template draft)*
4. `ImplementationGenerated`
5. `TestsGenerated`
6. `SandboxDeployed`
7. `E2EValidationCompleted` *(pass/fail + normalized failure signatures)*
8. `AssimilationPrOpened`
9. `CiValidationCompleted`
10. `RegistryUpdated`
11. `PromotionStageChanged`

Each event gets:

* `eventName`, `version`, `schema` (JSON schema), `schemaHash`
* `publisher` (factory/task node)
* `consumers[]` (services/flows reading it)
* `severityOnBreak` (CRITICAL/HIGH/MEDIUM)
* `compatRules` (backward/forward compat expectations)

**Why:** FLOW-05 explicitly fixed G1 by registering events as **EVENT_SCHEMA_CHANGE contracts**. 

---

### B) **Event propagation tree** (G2)

Self-Build must emit a propagation tree doc for every “root event”, just like FLOW-05 required “full propagation tree (event→publisher→consumers→children)”. 

Example (conceptual, BFA stores as graph edges):

* `CapabilityGapDetected`

  * publisher: Planner/Judge
  * consumers: `T47 SelfBuildOrchestrator`
  * child events:

    * `SkillBuildRequested`

      * consumers: `T48 ConnectorGenesisLoop`
      * child events:

        * `ImplementationGenerated` → `TestsGenerated`
        * `SandboxDeployed` → `E2EValidationCompleted`

          * if fail → loopback signal (goes to Genesis)
          * if pass → `AssimilationPrOpened` → `CiValidationCompleted` → `RegistryUpdated` → `PromotionStageChanged`

This tree is the “structural memory” BFA needs to detect “if you change *this* event, it breaks these downstream consumers”.

---

### C) **BFA Entities (skill artifacts + runtime state)**

Self-Build introduces “platform entities” whose changes can break everything.

**Entities to register (minimum):**

* `SkillDefinition` (skill metadata + version + owners)
* `FactoryInterfaceSpec` (factory name/id + fabric resolution)
* `TaskTypeContract` (T47–T49 contracts; required fields enforced)
* `FlowTemplate` (the JSON DAG stored in ES)
* `PromotionRecord` (stage ladder evidence)
* `SandboxEnvironment` (ephemeral envRef + endpoints)
* `EvidenceBundle` (reports, logs, schema hashes, CI status)

**Writer exclusivity (BFA rule):**
Only the designated service may write the canonical entity (FLOW-05 uses this pattern: “LearningPlanService is the ONLY writer … (BFA enforces)”). 
Self-Build equivalent:

* only `RegistryWriterService` writes `TaskTypeContract` + `FlowTemplate` indices
* only `PromotionService` writes `PromotionRecord`
* only `SandboxService` writes `SandboxEnvironment`

**Multi-DB fragment mapping (G6):**
Self-Build artifacts are spread across stores, so entity registry must map fragments (same fix used in FLOW-05). 
Example mapping for `SkillDefinition`:

* ES: registry doc (canonical)
* Artifact Registry (Execution Fabric): packaged build/test artifacts
* CI/CD provider: pipeline run metadata
* Git provider: PR + commit references

---

### D) **API Contracts (for platform services + generated services)**

Even if most “external actions” are abstracted behind fabrics, Self-Build still depends on stable internal APIs.

Register at least:

* Debug surface endpoints (used for trace-based introspection):
  `GET /api/debug/{traceId}`, `/phase/{phaseId}`, `/judge/{phaseId}`, `/gaps` 
* Self-Build control plane (recommended):

  * `POST /api/self-build/start`
  * `GET /api/self-build/{traceId}/status`
  * `POST /api/self-build/{traceId}/approve-core` (human gate)
* Sandbox endpoints (health + probe)

  * `GET /health`, `GET /ready`

Each API contract doc includes:

* route + verb, auth model, request/response schemas, timeout budgets
* idempotency keys and retry policy
* dependency list (“who calls this”)

**Persistence-before-event invariant:** when APIs change state and then emit events, BFA should enforce “write before publish” ordering (the same invariant is explicitly called out in FLOW-05 notes). 

---

# 2) Cross-Flow Conflict Rules for Self-Build (CF-SB-*)

FLOW-05 already shows the shape: a small set of CF rules with severity and flow coverage. 
We mirror that, but focused on “platform integrity”:

### **CF-SB-1 — Event name collision**

Check that new event names don’t collide across flows (same pattern as CF-4). 
**Severity:** MEDIUM→HIGH (becomes CRITICAL if collision occurs on root triggers)

### **CF-SB-2 — Event payload change must be detectable**

Any change in event schema must register as EVENT_SCHEMA_CHANGE and trigger BFA/T32 review (G1). 
**Severity:** CRITICAL

### **CF-SB-3 — Propagation tree required**

If an event has consumers, a propagation tree edge list must exist (G2). 
**Severity:** CRITICAL

### **CF-SB-4 — Distributed state machine declared**

Self-Build stages (DRAFT→…→CORE) and task phases must be modeled as a distributed state machine so BFA can reason about partial states (G3). 
**Severity:** HIGH

### **CF-SB-5 — Flow-to-flow dependency via events**

Any output event produced by a generated skill that can trigger other flows must be registered as a cross-flow contract (G5). 
**Severity:** HIGH

### **CF-SB-6 — Multi-DB entity fragment mapping**

If a “platform entity” lives in multiple stores, entity registry must declare fragments + canonical writer (G6). 
**Severity:** MEDIUM→HIGH

### **CF-SB-7 — Registry ID collisions (T/F/template IDs)**

Prevent merges that reuse an existing **T{N} / F{N} / templateId** already in the registry (otherwise future planning breaks).
**Severity:** CRITICAL

---

# 3) Self-Build BFA stress tests (what the engine should auto-generate)

Pattern match to FLOW-05’s “Appendix E stress tests” style. 

**SB-TEST-1:** Remove a required field from `ImplementationGenerated` payload → **CRITICAL** (G1)
**SB-TEST-2:** Rename `PromotionStageChanged.stage` enum values → **HIGH/CRITICAL** (breaks distributed state machine / gates) (G3)
**SB-TEST-3:** Add a new platform event but omit propagation edges → **CRITICAL** (G2)
**SB-TEST-4:** Generated connector emits an output event without cross-flow registration → **HIGH** (G5)
**SB-TEST-5:** Split `SkillDefinition` across ES + artifact registry without entity-fragment mapping → **HIGH** (G6)
**SB-TEST-6:** Introduce an event name collision with an existing flow event → **MEDIUM/HIGH** (CF-SB-1)

---

## SAVE STATE

**SAVE_POINT: SELF_BUILD_META_FLOW:P4**

* Defined the **BFA Registration Pack** that Self-Build must generate: event schemas + propagation trees + entity registry + API contracts + cross-flow conflict rules. This is directly aligned with the known V62 gap fixes (G1/G2/G3/G5/G6).  
* Added Self-Build-specific stress tests modeled on the existing FLOW-05 BFA testing approach. 

Say **next** and I’ll deliver **SELF_BUILD:P5**: the **registry deltas** (what exact ES registry documents get added/updated: Family registry, Factory registry, Task type registry, Template registry) + the promotion evidence bundle structure that lets the system safely go from **INJECTED → MINIMAL → CORE**.
