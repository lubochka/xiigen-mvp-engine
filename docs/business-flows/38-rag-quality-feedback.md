<!--
  Source: business flows.zip / 30-prompt improvements.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-38 rag-quality-feedback
  Naming note: Resolved 2026-04-22 — zip-30 prompt-improvements describes the prompt-versioning + quality-scoring learning loop; maps to today's rag-quality-feedback. Today's FLOW-30 slug 'tenant-lifecycle-manager' is a different concept.
  Related deep-research: docs/business-flows/_deep-research/rag-quality-feedback/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/rag-quality-feedback/ (if present)
-->

We would like to be able to make a prompt engineering using AI
Which means on each node we would like to try to optimize our prompts and the way we write promts
For example we have to decide how to approach some task - we try to approach with the basic prompt by defining the task - maybe suggesting our existing rag stored memory and skills and then we get the answer from several different models. The judge arbitr define props and cons of all the approaches, and judges if we can continue on - we would like not to only store this judgment for the future - we would like to make an optimization "discussion" how we can improve the prompt for the next time with the model - for example we would give the model our current prompt, and the "judge decision" and ask it how we can improve the prompt next time to get a better results. And we will store it for future developments. 
I am attaching the rag deep research - assuming we will always use one or several suggested ways to manage the internal rag, suggest how can we manage a self learning system that always improve the prompts it uses for different tasks types. 

What you’re describing is basically **PromptOps as a first-class capability of the engine**: every node run produces traces + scores + verdicts, and then a *separate improvement loop* proposes (and safely promotes) better prompt variants for that **task type / node type / tenant / budget mode**, instead of “manually tuning strings”.

Below is a design that fits your “engine generates flows” mindset: **learning happens by selecting among versioned assets and promoting candidates**, not by silently mutating production prompts. 

---

## 1) Core principle: prompts are versioned assets + policies, not strings

Your attached research already frames the right control-plane model: treat **tasks/subtasks/models/prompts/flows/evaluators** as versioned assets in a control-plane graph. 

So define these as *engine assets*:

### A. Prompt assets (immutable versions)

* **PromptTemplate**: `{promptId, taskType, nodeType, inputSchema, outputSchema, guardrails, templateText, ragProfileId, modelProfileId}`
* **PromptVersion**: `{promptId, version, parentVersion, changeSummary, createdBy, createdAt, status: candidate|canary|active|deprecated}`
* **PromptPatch** (the “discussion outcome”): `{traceId, judgeVerdict, failureModes[], suggestedEdits[], rationale, expectedImpact}`

### B. Policies (how a node chooses prompts/models/retrieval)

* **PromptPolicy**: maps `(taskType,nodeType,tenantId,budgetMode)` → selection strategy:

  * explore/exploit weights
  * allowed prompt versions set
  * constraints (max tokens, max latency, required schemas)

### C. Eval datasets (regression tests from real failures)

User feedback should become:

1. a routing signal, 2) evaluation datasets, 3) improvement signals. 
   So store:

* **EvalCase**: `{traceId, inputs, expectedConstraints, scoringRubricRef, “what went wrong” labels}`
* **EvalSuite**: `{taskType,nodeType,tenantScope, cases[], passThresholds}`

---

## 2) Runtime loop per node: Execute → Judge → Learn

Your deep-research explicitly calls out 3 selection problems to learn over time: retrieval strategy, model depth, and prompt/flow selection. 

### Step 1 — Select “execution recipe” (policy routing)

For every node run:

* pick **retrieval mode** (none/vector/hybrid/GraphRAG/agentic) 
* pick **model(s)** and “depth” (Fast/Balanced/Thorough) 
* pick **prompt version** (active vs canary vs candidate under test)

This is where you can introduce **lightweight routing learning** (bandit/router) to optimize (quality, cost, latency) instead of manual tuning. 

### Step 2 — Execute (possibly multi-model)

Run multiple models if configured, then aggregate. (Your judge already compares pros/cons; keep that.)

### Step 3 — Judge + scoring

Store:

* answer quality metrics
* retrieval quality metrics
* operational metrics (tokens/cost/latency)

The research stresses trace/span capture as the substrate for learning, because you can compute quality/cost over the same orchestration boundaries. 
Also treat **context efficiency** as a first-class metric (don’t just stuff more context). 

### Step 4 — Trigger “Prompt Improvement” sub-flow

Trigger conditions:

* judge verdict below threshold
* user feedback negative / “needs fix”
* high cost for acceptable quality (optimize prompt for efficiency)

And store the improvement as a **PromptPatch** linked to the run trace (provenance).

---

## 3) The “Prompt Improvement” sub-flow (no-code DAG)

This is the heart of your request: take **(current prompt + judge decision)** and run an optimization discussion, producing a new candidate prompt version, then test it before promotion. Your doc explicitly recommends “new candidate versions tested on curated + real-world eval sets,” not silent edits. 

### Prompt-optimization DAG (conceptual)

1. **CollectContext**

   * prompt text + version
   * inputs + outputs
   * retrieved context (what was injected)
   * judge rubric + verdict + reasons
   * user feedback text (if any)

2. **RetrieveEvidencePack (RAG)**

   * retrieve similar traces (same task type / failure label)
   * retrieve successful prompts for similar cases
   * retrieve prior prompt patches & what worked
   * use hybrid retrieval: vector for local similarity + GraphRAG/community for “global patterns across failures” 

3. **Critique (multi-model)**

   * “PromptCritic” produces: failure modes, missing constraints, ambiguity points, formatting issues
   * “PromptEditor” proposes concrete edits + why they help
   * “PromptGuard” checks for policy violations (schemas, forbidden changes)

4. **GenerateCandidatePromptVersion**

   * write new PromptVersion (status=candidate)
   * attach changeSummary + expected impact

5. **EvaluateCandidate**

   * run EvalSuite (replay against stored eval cases)
   * compute delta vs active prompt:

     * quality ↑
     * groundedness/retrieval noise ↓
     * cost/tokens ↓

6. **PromotionDecision**

   * if passes: move to **canary** for a tenant cohort
   * if canary passes: promote to **active**
   * otherwise: keep as candidate with notes

7. **Persist + Explain**

   * store everything so UI can show *exactly why* the prompt changed

This matches the “layered architecture” and “arbiter mesh” idea: orchestration + evaluation + learning, without unsafe self-modification. 

---

## 4) Multi-tenant prompt learning (without cross-tenant leakage)

Make “prompt learning” tenant-safe by default:

### Storage model

* **Global prompt baseline** (vendor-neutral, no tenant secrets)
* **Tenant overrides** (only deltas; still versioned)
* **Tenant cohorts** for canary (deterministic assignment)
* **Aggregated learnings** can be promoted globally, but only if:

  * derived from non-sensitive traces
  * validated across multiple tenants or a “public” eval suite

### Policy boundaries

* Tenant can change **FREEDOM** parts (style, verbosity, domain hints)
* Tenant cannot change **MACHINE** guardrails (schemas, safety rules, validation gates)
  This mirrors the “experiments must target FREEDOM only” safety pattern used elsewhere in your system design philosophy. 

---

## 5) Visual UX: what the user sees on each node

Because you want node-level visibility:

**Node card shows**

* promptId + version
* retrieval mode used (none/vector/hybrid/graph/agentic)
* model(s) used + budget mode
* judge score breakdown (quality / groundedness / cost)
* status: done / in progress / waiting for user (promotion approval)

**Clicking “Improve Prompt” shows**

* judge verdict + reasons
* prompt diff (old vs candidate)
* eval results (before/after)
* canary rollout status per tenant cohort

This is aligned with making the system inspectable and editable via control-plane graphs, not hidden magic. 

---

## 6) How it becomes “self-learning” instead of “prompt sprawl”

To avoid accumulating 500 prompts nobody trusts:

1. **Hard cap** per (taskType,nodeType,tenant,budget) on active variants (e.g., 3)
2. **Auto-prune** candidates that don’t beat baseline on eval suites
3. **Drift protection**: don’t promote if improvement only helps 1 niche case
4. **Context-efficiency gate**: if quality is same, prefer fewer tokens/less retrieval 
5. **Routing learns selection** (bandit/router) rather than creating infinite new prompts 

---

## STATE SAVE (so we can resume)

**PROMPTOPS_V1_STATE**

* Goal: Node-level prompt optimization loop (Execute → Judge → Improve → Evaluate → Canary → Promote)
* Key assets: PromptTemplate, PromptVersion, PromptPolicy, PromptPatch, EvalSuite
* Key signals: trace/span metrics + user feedback → routing + eval datasets + improvement suggestions 
* Safety rule: improvements are *new candidate versions*, evaluated + gated before promotion 
* Retrieval strategy: conditional + hybrid (vector + GraphRAG as a mode) 

If you want, next step is to express this as an **engine extension contract** (new “PromptOps” family + task types + flow template) in the same style as your catalog—without writing service implementations—so it can be generated like everything else.
