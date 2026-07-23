<!--
  Source: business flows.zip / 31-functionality by a design.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-31 design-intelligence-engine
  Related deep-research: docs/business-flows/_deep-research/design-intelligence-engine/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/design-intelligence-engine/ (if present)
-->

We would like to be able gather information from all design figma screens and use AI to try to understand each screen what it's components and functional meaning.
At some point by a design we should be able to learn which module we should use
Is that a shop?
Is that a part of social screen?
Is it some kind of report
And so on

We would like by examining the screens help the user complete functional deep functionality. For that we would like to make system learn what are "typical" components for systems. We would like to be able to gather that information by a AI graph rag and AI Rag

Please make a deep research how should we approach this task
Use so far designed flows, and module-architecture where we did try to make some kind of matrix between different type of systems and their common functionality

Below is a **deep-research, engine-compatible approach** to:

1. ingest **all Figma screens**, 2) infer **components + functional meaning**, 3) classify **screen → Genie DNA module(s)**, 4) infer **system type** (shop / social / report / etc.), and 5) run **gap-completion** using **AI RAG + GraphRAG** — grounded in your existing **Task Type 3 (Figma→System)** flow and the **module-architecture 20×15 matrix**.

---

## 1) The core idea: Screen Understanding = “UI → Function IR” (not “UI → guess”)

Figma gives you **structure** (node tree, component instances, text layers, constraints) plus you can render a **frame image** for vision. The winning approach is to produce an intermediate representation that is:

* **machine-readable**
* **verifiable** (every inference points to evidence: nodeIds, text, component names)
* **retrieval-friendly** (embeddable vectors + graph edges)
* **directly mappable** to your **Genie DNA module registry** (Dynamic Router, View Definitions, Detail Definitions, Form Definitions, Cart Rules, Chat Configs, etc. from `module-architecture/DEFINITIVE_MODULE_ARCHITECTURE.md` and `GENERIC_MODULE_ANALYSIS_COMPLETE.md`)

### The IR you want (3 layers)

**A) DesignIR (structural)**
From your existing Phase 1 of T3 (`FigmaParserExecutor`):

* `screens[]`, `components[]`, `designTokens`, `screenMap`, `prototypeLinks`, layout constraints

**B) ScreenSemanticsIR (functional meaning)**
Per screen:

* `screen_archetype`: list|detail|form|feed|profile|checkout|report|settings…
* `ui_controls[]`: normalized controls (button/input/table/card/filter/date-picker/chat-thread…)
* `user_actions[]`: create/edit/search/pay/chat/book/refund…
* `data_entities[]`: Product, Order, User, Post, Ticket, Invoice…
* `evidence[]`: nodeIds + text snippets + component names + bounding-box cues

**C) SystemModelIR (global)**
Across all screens:

* `system_type_candidates`: store/social/events/hotels/dashboard…
* `module_map`: screen → modules (and confidence)
* `flows[]`: browse→detail→action→confirmation (derived from prototype links + CTA detection)
* `gaps[]`: missing modules/screens based on the **module matrix + dependency map**

This aligns perfectly with your existing **T3 phases 4–7** in `TASK_TYPES_CATALOG_MERGED.md` (functional description, system model, module resolver, gap detector).

---

## 2) Use the module-architecture matrix as the “ground truth ontology”

Your `module-architecture/GENERIC_MODULE_ANALYSIS_COMPLETE.md` is not just documentation — it’s your **label taxonomy**:

* 20 core modules grouped into 5 super-modules (Entity Viewer, Transaction, Creator, Communication, Financial)
* Per-site “enabled / typical behaviors / configuration knobs”
* Cross-module dependency map (e.g., Promotions → Cart ← Availability; Checkout → Invoices; Cancel/Refund → Credit Note…)

### Why this matters

Instead of asking the model “what is this screen?”, you ask:

1. “Which **module signatures** are present here?” (evidence-based)
2. “Which **site-types** are consistent with the set of modules we’re seeing?” (global aggregation)
3. “Given inferred site-type + dependency map, what’s missing?” (gap completion)

This turns “classification” into **constraint satisfaction** (much more stable).

---

## 3) AI RAG + GraphRAG: what each one does best

You want **both**, but with clear jobs:

### A) Vector RAG (Similarity)

Use embeddings to retrieve:

* similar screens seen before (even across tenants/projects)
* similar component compositions (“grid + filters + price badge + cart CTA”)
* similar action patterns (“book now + date picker + cancellation policy”)

**Good for:** “this looks like X we’ve seen before”
**Storage:** screen embeddings + component embeddings + “screen archetype embeddings”

### B) GraphRAG (Structure + Constraints)

Graph is where you store:

* navigation/prototype flows: Screen A → Screen B
* composition: Screen → Component → ControlType
* semantics: Screen → Action → Entity
* mapping: Screen → ModuleCandidate(score)
* “requires” edges from the module matrix: SystemType → required modules; Module → depends on modules (dependency map)

**Good for:**

* “if this screen is ‘Cart’, what must exist elsewhere?”
* “these 3 screens form a checkout flow”
* “this is a social feed because it has feed+profile+engagement loop nodes”

### The killer move: Hybrid retrieval (Multi strategy)

At inference time:

1. **Vector RAG** pulls the nearest known archetypes/screens.
2. **GraphRAG** pulls constraints + dependency expectations for the leading hypotheses.
3. The LLM is used to **explain & choose** with evidence, not invent.

This is exactly aligned with your **RAG Fabric** strategy set (Graph, Vector, Multi) in `basic_prompt.txt`.

---

## 4) The practical pipeline: how to “understand” each screen (reliably)

### Step 1 — Deterministic feature extraction (cheap + stable)

From DesignIR per screen:

* detect layout primitives: list/grid/table, tabs, sidebars, top-nav, modal dialogs
* detect key widgets: date-range picker, price badge, quantity stepper, cart icon, chat thread, ticket form, invoice table, refund policy block
* detect named components: “ProductCard”, “CheckoutSummary”, “GroupCard”, “ReportChart” (Figma naming is gold)

This provides a baseline score without LLM hallucination.

### Step 2 — Multimodal semantic extraction (LLM with structure + image)

Prompt input:

* reduced node tree (pruned to meaningful nodes)
* extracted text layers
* component instance names
* rendered frame image

Output:

* ScreenSemanticsIR JSON (strict schema)
* “evidence map”: for each inferred action/entity/module → list nodeIds/text

### Step 3 — Screen → Module mapping (using your Genie DNA module registry)

Now you retrieve from RAG:

* the **module definitions** and “module signatures” from `DEFINITIVE_MODULE_ARCHITECTURE.md` + `GENERIC_MODULE_ANALYSIS_COMPLETE.md`
* examples of how those modules appear in screens

Then the model outputs:

* `moduleCandidates[]` with confidence
* `requiredConfigDocs[]` (e.g., `view_definitions`, `detail_definitions`, `form_definitions`, `cart_rules`, `invoice_configs`…)

### Step 4 — System type inference (aggregate across screens)

You never classify system type from one screen. You do it by:

* counting module evidence
* checking dependency consistency
* checking whether “site-type signatures” match (e.g., Social needs Feed+Profile+Engagement patterns; Store needs Product list+Detail+Cart; Hotels needs Availability+Cancellation policies, etc.)

### Step 5 — Gap completion (the feature you asked for)

Once you have `system_type_candidates`, run:

* module matrix expectations
* cross-module dependency map checks

Output:

* missing modules
* missing screens
* missing flows (e.g., “Cancel/Refund exists but no Invoices/Receipts screen/config”)

Then the engine asks the user targeted questions **only for missing critical decisions**.

---

## 5) No-code orchestration: how this fits into your existing Flow (T3)

You already have `figma-to-system-v1.json` (8 phases). The enhancement is: **make Phase 4–7 a GraphRAG+RAG-driven sub-pipeline**.

### Proposed node-level orchestration (no code)

**Phase 1 (existing):** Parse Figma → DesignIR
**Phase 2–3 (existing):** HTML/CSS + visual diff

**Phase 4 (upgrade): ScreenSemantics extraction**

1. `RenderFrameImages` (per screen)
2. `ExtractDeterministicFeatures` (per screen)
3. `RAG: Retrieve module signatures + similar screens`
4. `AI: Produce ScreenSemanticsIR (with evidence map)`
5. `Judge Gate: schema-valid + evidence coverage threshold`

**Phase 5 (upgrade): System model synthesis**
6. `Graph Build: ScreenGraph (navigation + composition + semantics)`
7. `GraphRAG: pull constraints (module matrix + dependency map)`
8. `AI: infer SystemModelIR (system types + entity map + flows)`
9. `Judge Gate: consistency checks (entities reused correctly, no contradictions)`

**Phase 6 (existing but stronger): Module resolver**
10. `ModuleResolverExecutor` now uses:

* module registry docs
* graph constraints
* vector similarity exemplars

11. Outputs “module wiring plan” + required config docs

**Phase 7 (existing but stronger): Gap detector**
12. Compare inferred system type against module matrix expectations
13. Emit `gaps[]` and optionally generate **stubs** (per your existing loop-back design)

This stays fully aligned with your “engine outputs JSON DAGs stored in Elasticsearch” approach.

---

## 6) What to store (so the system actually “learns typical components”)

### Vector stores (RAG)

* `screen_embedding` (text+structure+image-caption)
* `component_embedding` (component name + properties)
* `archetype_embedding` (canonical “Store Product List”, “Social Feed”, “Hotel Booking”)

### Graph store (GraphRAG)

Nodes:

* Screen, Component, ControlType, Action, Entity, Module, SystemType
  Edges:
* NAVIGATES_TO, USES, HAS_ACTION, OPERATES_ON, MAPS_TO_MODULE, REQUIRES_MODULE, DEPENDS_ON

### Feedback store (learning loop)

When user says:

* “this is not a shop, it’s a report dashboard”
* “this screen is ‘Add Item’ not ‘Edit Item’”
  Store:
* correction
* before/after labels
* evidence used
* model output + judge verdict
  Then future RAG pulls those corrections as **negative/positive exemplars**.

---

## 7) Quality gates (so the engine doesn’t drift)

For this capability, you want gates like:

1. **Evidence coverage gate**
   Every module/action/entity claim must reference ≥1 evidence item (text layer, component name, nodeId, or detected widget).

2. **Consistency gate (cross-screen)**
   If Entity “Order” exists, it must appear consistently (same fields, same naming) across screens that touch it.

3. **Constraint gate (module dependency map)**
   If Cart exists, either Checkout exists or system explicitly marks “cart-only browsing (no purchase)”.

4. **Genie DNA gate**
   No screen mapping results in “site-type hardcoding”; everything must map into module configs (view_definitions, form_definitions, etc.) per your module architecture philosophy.

---

## 8) What to do when the design is “a report/dashboard”

Your current Genie DNA modules don’t explicitly name “Reports”, but dashboards usually map to:

* **Entity Viewer** (`view_definitions` as tables/cards/charts)
* sometimes **Financial module** if invoices/receipts
* sometimes a new module family if you want first-class charting

So the correct behavior is:

* classify it as `screen_archetype=report/dashboard`
* map to `view_definitions` + a “chart control registry”
* if charting isn’t supported: **Gap → T58 self-extension** (new control type / visualization module), rather than hacking ad-hoc code.

---

## STATE SAVE (so we can resume exactly)

```
FIGMA_SCREEN_UNDERSTANDING_RESEARCH: COMPLETE_v1

Inputs referenced:
- TASK_TYPES_CATALOG_MERGED.md → T3 (Figma to System) phases 1–8
- module-architecture/DEFINITIVE_MODULE_ARCHITECTURE.md → 21 Genie DNA modules + config indices
- module-architecture/GENERIC_MODULE_ANALYSIS_COMPLETE.md → 20×15 matrix + dependency map
- basic_prompt.txt → Fabric-first + RAG strategies (Graph/Vector/Multi)

Decisions locked:
- Use UI→Function IR (DesignIR → ScreenSemanticsIR → SystemModelIR)
- Use Hybrid retrieval: Vector RAG (similarity) + GraphRAG (constraints)
- Module selection driven by module-architecture matrix + dependency map (not pure LLM guess)
- Fit into existing T3 flow by upgrading phases 4–7 (no new orchestration paradigm)

Next build step (if you want to implement):
- Define the JSON schemas for ScreenSemanticsIR + SystemModelIR
- Add a “ScreenSemantics” sub-flow under T3 Phase 4–5
- Create indices (tenant-scoped) for: figma_raw, design_ir, screen_semantics, screen_embeddings, screen_graph, mapping_feedback
```

If you want, I can now turn this into a **concrete flow template draft** (node list + inputs/outputs + judge gates + storage docs) that matches your engine’s “JSON DAG in Elasticsearch” style — still no code, but implementation-ready.
