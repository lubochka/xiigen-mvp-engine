<!--
  Source: business flows.zip / 32-sharable flows.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-32 sharable-flows-marketplace
  Related deep-research: docs/business-flows/_deep-research/sharable-flows-marketplace/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/sharable-flows-marketplace/ (if present)
-->

We would like to be able to let the user share their flows and rags For that we need to be able to differ between the business logic and data "by design" and the sensitive business data of the clients of the tenant. We would like to let the tenant share his business logic solution, and even charge for the usage by downloads, copies, usage or percent for the "copier" clients - kind of "affiliate" program So we will need a statisctics management, module option to share as template, copy template, manage versions, apply new versions in "copied" solutions and more.
Below is a **factory-first, multi-tenant-safe** way to let tenants **share flows + RAGs as “products”** while keeping **client-sensitive data** isolated **by design** (not by convention). It builds directly on your engine’s existing invariants: “engine is the fabric” and “everything external is a factory” , immutable/versioned flow definitions , version-pinned runs , and tenant-scoped metering events .

---

## 1) RAG quick lookup (where this requirement “lands” in your docs)

* **Factory-first / fabric-first contract** (why templates must be config + factories, not code): 
* **Immutable flow definitions + versioning** (publish = new version, never overwrite): 
* **Runs pinned to the starting version** (critical for “copied solutions” stability): 
* **Cross-flow dependency + revalidation on change** (needed for “apply new versions” safely): 
* **Metering & billing events** (for affiliate/royalties by usage/tokens/ops): 
* **Billing metering service shape + metric examples** (flow execution, tokens, API calls, storage): 
* **TenantId everywhere (keys + metrics)** (non-negotiable for isolation): 
* **Multi-tenant risk note** (when tenants can influence runtime/build behavior → stronger isolation tier): 
* **Template override chain pattern** (useful for “copied solution overrides”): 

---

## 2) Core design: split “Logic Package” vs “Tenant Data” as separate planes

### A. Logic Package (shareable, sellable)

A “template product” is a **pure artifact** consisting of:

1. **Flow definitions** (JSON DAGs) + metadata + semver versions (immutable) 
2. **RAG Blueprint** (retrieval strategy config + prompt IDs + schemas), *not* the tenant’s private corpus
3. **Dependency manifest**: required factories/capabilities + required event schemas (so install can validate)
4. **License + pricing policy**: download/copy/usage/% revenue share
5. **Upgrade policy**: “notify only” vs “auto-eligible” vs “forced security patch” (rare)

### B. Tenant Data (never exported by default)

Always excluded from a package unless **explicitly** opted-in with a separate “Data Pack” contract:

* production indices (documents, embeddings, conversation logs, user content)
* secrets / connector credentials
* execution traces containing customer payloads
* customer-specific config docs that contain PII/financial terms

This aligns with your multi-tenant posture: tenant scoping must be structurally enforced, not “remembered” .

---

## 3) Sharing “RAGs” safely: Blueprint vs Dataset

### RAG Blueprint (default share)

Share **how** to retrieve, not **what** you retrieved:

* chunking rules, routing (Split/FanOut/Hybrid/Graph/Vector/Multi), ranking weights
* prompt templates / prompt IDs
* schema expectations (input/output JSON schema)
* connector *types* required (e.g., “needs VectorStore + ObjectStorage”), but **no tenant secrets**

### RAG Dataset (optional, gated)

If tenants want to sell/share actual corpora/embeddings:

* treat as a **separate paid artifact** with strict controls:

  * explicit “export classification” gate + automated PII scanning
  * immutable content hashes + provenance
  * “tenant-owned object storage prefix” + strict download authorization
* recommend a higher isolation tier when tenants can ship runtime-influencing content/build steps .

---

## 4) “Copy template / manage versions / apply new versions” — three install modes

### Mode 1 — Snapshot Copy (most common)

* Consumer installs PackageVersion X.Y.Z → engine **clones** flow definitions into consumer tenant as a new local flow.
* Future upstream updates do **not** affect it.

### Mode 2 — Linked Copy (tracked)

* Consumer installs X.Y.Z with a **link pointer** to publisher package.
* Consumer runs are **pinned** to their installed version (guaranteed) .
* New upstream versions generate an “upgrade available” signal.

### Mode 3 — Fork (break the link)

* Consumer “forks” a linked copy → becomes fully local (snapshot).

### Upgrading a copied solution

Upgrades are a **migration** with safety:

1. Pull publisher’s new PackageVersion
2. Run compilation/validation + **cross-flow revalidation** using dependency graph (so consumers don’t break silently) 
3. Produce an **UpgradePlan** (diff + risk score + required config mappings)
4. Apply upgrade as a **new local version**; old stays replayable/rollbackable (immutability) 

---

## 5) Statistics + “affiliate” revenue share (downloads/copies/usage/%)

### A. Events you should meter (examples)

* `template.view`
* `template.download`
* `template.install` (copy)
* `template.upgrade`
* `template.flow_run` (run attributed to template)
* `template.rag_query` (query attributed to template blueprint)

### B. Use your existing metering pipeline

Your catalog already has **Metering & Billing Event** (T90) that fires on flow execution completion, AI tokens, storage writes, etc. 
And a billing metering service that emits usage events with bounded dimensions (no unbounded per-user labels) .

**Key trick for affiliate attribution:**
When a template is installed, inject **package attribution metadata** into:

* the flow definition metadata (packageId, publisherTenantId, installId)
* the run context so metering emits dimensions like:

  * `{ packageId, publisherTenantId, consumerTenantId, flowId, taskType, tier }`

And keep the same hard rule: **tenantId in every key and every metric dimension** .

### C. Revenue share calculation

* Billing engine aggregates consumer usage (tokens, executions, connector calls) using the same metric categories the platform already tracks (e.g., `ai.tokens_used`, `flow.execution_ms`, `connector.api_calls`) 
* Payout = `sharePercent × attributable_cost` (or sharePercent × attributable_revenue) per billing period.
* This also supports fixed-fee models:

  * per download
  * per install/copy
  * per upgrade

---

## 6) No-code orchestration (the “flows” to implement this)

### Flow A — Publish Template Package

1. Select assets: Flow DAG(s) + RAG Blueprint(s) + prompts + schemas
2. Run **Sanitizer** (MACHINE):

   * allowlist only “logic indices”
   * block secrets / private corpora / runtime traces
3. Store immutable PackageVersion (hash + semver)
4. Publish marketplace listing + visibility rules + pricing

### Flow B — Install / Copy Template

1. Consumer chooses install mode (Snapshot / Linked / Fork)
2. Validate dependencies:

   * required factories exist + entitlements
   * required schemas registered
3. Create local flow version(s) + activate
4. Emit `template.install` meter event

### Flow C — Upgrade Linked Copy

1. Detect upstream release → notify consumer
2. Generate UpgradePlan + show diff
3. Apply upgrade → new local version
4. Optionally run migration for in-flight runs (but keep “runs pinned to version” invariant) 

### Flow D — Settlement (Affiliate Payout)

1. Aggregate T90 usage events by `(publisherTenantId, packageId, consumerTenantId, period)` 
2. Apply pricing policy (fixed, per usage, % share)
3. Emit payout records + invoices

---

## 7) Guardrails you’ll want as MACHINE (non-negotiable)

1. **Export allowlist**: only “logic artifacts” can be included by default
2. **No secrets in packages**: re-bind connectors on install (wizard)
3. **Cross-tenant safe-by-default**: any template that introduces runtime/build influence may require stronger isolation tier 
4. **Upgrade never overwrites**: always new version + rollback (immutability) 
5. **BFA revalidation on upgrades** (dependency graph) 
6. **Metering dims must be bounded** (no per-user cardinality explosion) 

---

## STATE SAVE (resume point)

```text
STATE: FLOW_TEMPLATE_MARKETPLACE_V1 = DESIGNED
SCOPE:
  - Logic Package vs Tenant Data split (Blueprint vs Dataset for RAG)
  - Install modes: Snapshot / Linked / Fork
  - Upgrade as new version + BFA revalidation + rollback
  - Metering/affiliate: use T90 + F263; add template.* metrics with bounded dimensions
NEXT:
  - Define “Template Package” schema (manifest + export allowlist rules)
  - Define install-time “Connector Rebinding Wizard” flow (no secrets travel)
  - Define settlement aggregation rules (per period) + payout ledger
RESUME KEY:
  "Continue from FLOW_TEMPLATE_MARKETPLACE_V1 — package schema + export sanitizer + install/upgrade DAG"
```

If you want, I can turn this into a **full engine extension spec** (new task types + factory interfaces + BFA conflict rules + flow template JSONs) in the same format you use everywhere else.
