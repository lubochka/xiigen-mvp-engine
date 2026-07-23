# Bootstrapping a Self-Building, Self-Testing .NET + React System With a Persistent Progress Ledger

## Executive summary

A self-building, self-testing platform needs two things before it can generate meaningful code: a **minimal handwritten kernel** (runtime + adapters) and an **installer-grade translation layer** that converts “plans” into **machine-readable registries, a knowledge graph, and a retrieval index**. Once those exist, the platform can run a repeatable “implement-family” loop: **plan → generate → validate → test → deploy locally → judge → merge**, while continuously improving prompts and routing them per model/version using a PromptOps control plane. citeturn29view0turn28view0turn16view0

The missing capability you emphasized—**saving progress in a rigorous, auditable, and tool-agnostic way**—is best solved by introducing a **Progress Ledger** as the internal source of truth. Every run/node writes structured artifacts that capture: specifications, applied skills/patterns, implemented logic changes, prompt/model recipes (implementor + arbiters), tests and e2e results, commits and code references, GraphRAG methodology and queries used, plus correlated logs/traces (W3C trace headers and OpenTelemetry IDs). These “evidence bundles” are then mirrored into Jira/Trello/Azure DevOps through a fabric/provider interface, so the external tool is only a projection. citeturn25view0turn25view1turn1search2turn6view0turn8view0

This report assumes: a small-to-mid team (3–8 engineers), Linux-first CI runners, and local-first dev via Docker Compose; cloud provider is intentionally unspecified (fabric-first) and can be introduced behind providers later. citeturn16view0turn3view0

## Kernel architecture for deterministic self-driving development

The kernel should remain **small, stable, and handwritten**. It exists to execute flows and enforce guardrails—not to contain business logic. In .NET, the runtime is most maintainable if it relies on idiomatic dependency injection (DI) registration, with “providers” bound behind interfaces, enabling swappable implementations and test doubles. citeturn3view0

A practical minimal kernel includes:

- **Flow runtime**: executes persisted DAG/step definitions; persists run and node snapshots; supports resumability and human gates (WAITING_FOR_USER).
- **Fabric adapters**: source control, CI runner, container orchestrator, RAG/graph, and PM system are accessed only through provider interfaces.
- **Registry clients**: read/write official registries (factory registry, task type registry, skill registry, prompt registry, implementation/status registry).

To keep the UI “future proof” across entity["company","Microsoft","software company"]-backed tech stacks (React web vs React Native), treat the UI as a **config-driven console** that renders flows and progress states from snapshots rather than hardcoded per-entity pages. The React docs explicitly recommend using established frameworks/tooling and modern build tooling such as Vite-like setups; you can use that guidance to keep client scaffolding standard while still letting features be config-driven. citeturn4search0turn4search1

### Reference architecture diagram

```mermaid
flowchart LR
  subgraph Client["Client (React / React Native)"]
    UI[Flow Designer + Run Monitor<br/>Config-driven screens]
  end

  subgraph Kernel[".NET Kernel (handwritten)"]
    API[API Gateway / Dynamic Controller]
    ORCH[Flow Orchestrator]
    FAB[Fabrics (interfaces)]
    REG[Registries (read/write)]
    SNAP[RunSnapshot + NodeSnapshot service]
  end

  subgraph Knowledge["Knowledge plane"]
    VEC[Vector RAG index]
    GDB[Graph DB (Catalog + Impact graph)]
  end

  subgraph Delivery["Delivery plane"]
    SCM[Source control provider]
    CI[CI runner provider]
    DEP[Local/Sandbox deploy provider]
  end

  subgraph Evidence["Progress Ledger"]
    LEDGER[WorkSpecs / EvidenceBundles / Judgments<br/>Code refs / Test reports / Trace links]
  end

  subgraph PM["Work management (projection)"]
    JIRA[Jira]
    TRELLO[Trello]
    ADO[Azure DevOps Boards]
  end

  UI --> API --> ORCH
  ORCH --> REG
  ORCH --> FAB
  ORCH --> SNAP --> UI
  REG --> VEC
  REG --> GDB
  FAB --> SCM --> CI --> DEP
  ORCH --> LEDGER --> UI
  LEDGER --> JIRA
  LEDGER --> TRELLO
  LEDGER --> ADO
```

## Translating “plans” into runtime assets and a connected GraphRAG

Your “installer” is the bridge between human-generated plan bundles and runtime autonomy. The installer must create: (1) registry records, (2) vector chunks, and (3) a connectivity graph that explicitly links families ↔ factories ↔ methods ↔ tasks ↔ skills ↔ templates. This is the foundation for deterministic retrieval and regression impact analysis.

### Why GraphRAG needs a formal bootstrap pattern

A graph allows you to answer “what depends on what” precisely (impact analysis), while vector retrieval answers “what is similar/related.” A robust hybrid approach is: **Graph filter → Vector retrieval → Merge**.

If you use entity["company","Neo4j","graph database company"] or an equivalent graph database behind a provider interface, the graph bootstrap needs stable node/edge schemas and unique constraints. Graph-first filtering is especially important for your regression requirement: if an interface changes, retest all provider implementations and flows that depend on it.

If you adopt the entity["company","Microsoft","software company"] GraphRAG approach (or compatible pattern), BYOG (“bring your own graph”) workflows expect structured relationship tables (e.g., entities/relationships inputs and generated tables like communities/reports) and formalize the pipeline from graph structure to downstream summarization/reporting artifacts. citeturn16view0

### Installer flow that seeds registries and graphs

```mermaid
flowchart TD
  A[PlanBundle received] --> B[Parse + validate range completeness]
  B --> C[Write registries: factories/tasks/skills/templates/prompts]
  C --> D[Seed Graph Catalog (Family-Factory-Method-Task-Skill-Template)]
  D --> E[Seed Vector RAG (chunk+embed) + link chunks to graph IDs]
  E --> F[Repo scan: discover existing code/tests -> statuses + refs]
  F --> G[Provision local sandbox profile (docker-compose)]
  G --> H[Smoke run + publish snapshots + evidence bundle]
```

The local sandbox profile is simplest to make reproducible via entity["company","Docker","container software company"] Compose, which has a well-defined Compose file specification for services/networks/volumes and is widely supported for local multi-service stacks. citeturn16view0

## Implementor + arbiters loop with model/version-aware PromptOps

Your implementor and arbiters must not “improvise.” They should operate under a strict contract:

- **Graph facts first**: file references, statuses, dependency graph, test coverage links.
- **Structured outputs**: PatchPlan manifests and arbiter judgments must conform to schemas.
- **Evidence and updates**: every action writes to the Progress Ledger and updates status registries/graph edges.

### Enforcing deterministic outputs

For implementors and arbiters, schema-enforced outputs are crucial. entity["company","OpenAI","ai research company"] Structured Outputs is designed to constrain generations to a supplied JSON Schema, reducing invalid JSON and missing required fields. citeturn29view0

For prompt improvement, the operational standard should be “eval-driven development.” OpenAI guidance on evaluation stresses that LLM outputs are variable and recommends structured evals, logging everything, and continuous evaluation as systems evolve. citeturn28view0

### ExecutionRecipe: the unit of routing per flow type, node type, model version

Define execution at runtime as a resolved “recipe”:
- Prompt template/version
- RAG profile/version (graph/vector/hybrid; chunking strategy; token budget)
- Model profile/version (provider/name/version; budget mode; tool permissions)
- Judge rubric version

This is what you show in the UI per node: “what prompt + model + retrieval strategy produced this patch.” citeturn28view0turn29view0

### Recommended “arbiter” set and what they must read/write

Arbiters should be deterministic gatekeepers that:
- Read: WorkSpec + graph dependencies + code/test refs + test reports + trace logs
- Write: Judgment + required actions + impacted nodes + updated statuses

A minimal, high-leverage set:
- Coverage arbiter: interface/method coverage vs planned registry.
- Security arbiter: secrets handling, permissions, unsafe execution, dependency risks.
- Testing arbiter: unit/contract/integration/e2e coverage and pass state.
- Dependency arbiter: regression impact set and retest list.
- Business-flow arbiter: flow template dependencies satisfied.

The core operational requirement: any failure produces a structured “Judgment” record that becomes the next implementor input.

## CI/CD and testing foundations that support self-building

Self-building systems fail without fast feedback, reproducible tests, and strong artifact retention.

### CI providers and why “progress artifacts” must be first-class

A self-driving pipeline must emit:
- machine-readable artifacts (JSON: recipes, judgments, status diffs)
- human-readable summaries (Markdown run report)
- raw evidence (logs, JUnit XML, coverage, trace links)

In GitHub Actions, job summaries can be written to the `GITHUB_STEP_SUMMARY` file and appear in the run’s summary view, which is an ideal “no-code explanation” surface for humans. citeturn22search0

Artifact retention matters because your Progress Ledger will often store **references** (artifact IDs/URLs), not always the artifacts themselves. The `actions/upload-artifact` action documents artifact immutability characteristics (in modern versions) and outputs IDs/URLs, which can be stored as references in your ledger. citeturn24view0

### Approval workflows and safe promotion

For gated promotion (e.g., “merge code only after arbiter + human approvals”), GitHub environments support deployment protection rules such as required reviewers, which can be used as a hard gate before secrets are made available to a job. citeturn23view0  
This pairs naturally with your “WAITING_FOR_USER / group quorum” node status semantics.

### Testing stack recommendations

A self-building platform should standardize test types and auto-generate required suites across factories/providers:

- .NET unit testing: MSTest (Microsoft Testing Framework) is officially documented as supported and cross-platform; xUnit and NUnit are also widely used. citeturn26search0turn3search2turn26search1
- API contract tests: Pact is a common consumer-driven contract testing framework; use it to enforce provider compatibility when interfaces evolve. citeturn4search3
- Web E2E: Playwright’s .NET docs cover end-to-end testing workflows and CI usage patterns. citeturn3search3turn16search2
- React Native E2E: the React Native testing overview and Detox docs provide an end-to-end testing approach for mobile apps. citeturn26search6turn26search3
- Deterministic integration tests: Testcontainers for .NET is a pragmatic way to run real dependencies (databases/brokers) in ephemeral containers for integration tests. citeturn16view1

### Comparison tables

**CI/CD providers (docs-driven comparison)**

| Provider | Strengths for self-building pipelines | Risks/limits | Primary docs |
|---|---|---|---|
| GitHub Actions | Tight integration with PRs, job summaries for human-readable run reports, mature workflow syntax; strong artifact ecosystem. citeturn22search0turn5search3turn24view0 | Runner and marketplace action versioning; keep action versions current (artifact action versions deprecate over time). citeturn24view0 | citeturn5search3turn22search0turn24view0 |
| Azure Pipelines | Strong enterprise controls and Azure DevOps integration; YAML pipelines are first-class. citeturn5search0turn1search2 | Heavier configuration surface; org policies can add friction if not templated. citeturn5search0 | citeturn5search0 |
| GitLab CI/CD | Unified repo + CI; `.gitlab-ci.yml` is the standard pipeline spec. citeturn5search1 | Requires operational maturity if self-hosted; runner management can become overhead. citeturn5search1 | citeturn5search1 |
| CircleCI | Mature CI platform with its own config reference. citeturn5search2 | Another “external control plane” to integrate with Progress Ledger; ensure artifacts/metadata are exported consistently. citeturn5search2 | citeturn5search2 |

**Testing frameworks (fit-for-purpose)**

| Layer | Good default | Notes | Primary docs |
|---|---|---|---|
| .NET unit tests | MSTest or xUnit | MSTest is documented by Microsoft; xUnit is widely adopted. citeturn26search0turn3search2 | citeturn26search0turn3search2 |
| Provider contract tests | Pact | Useful when multiple providers implement the same interface; reduces cross-provider breaking changes. citeturn4search3 | citeturn4search3 |
| Web E2E | Playwright or Cypress | Playwright supports .NET; Cypress provides browser-based E2E and is widely documented. citeturn3search3turn26search2 | citeturn3search3turn26search2 |
| React Native E2E | Detox | Specifically designed for RN E2E flows and documented accordingly. citeturn26search3 | citeturn26search3 |

**Code generation / scaffolding options**

| Target | Tooling option | What it’s good for | Primary docs |
|---|---|---|---|
| .NET solution/feature scaffolding | `dotnet new` templates | Official templating system for standardized project/layout generation. citeturn3search1 | citeturn3search1 |
| API client/server codegen | NSwag or OpenAPI Generator | Generate clients/stubs from OpenAPI; NSwag is .NET-centric; OpenAPI Generator is broad. citeturn27search0turn27search9 | citeturn27search0turn27search9 |
| JS/TS scaffolding | Yeoman | A generic scaffolding system; useful for generating consistent UI module skeletons. citeturn27search2 | citeturn27search2 |
| Monorepo/React Native generators | Nx | Includes generators for React Native within an Nx workspace. citeturn27search3turn27search7 | citeturn27search3turn27search7 |

### Sample pipeline configuration emphasizing evidence + summaries (GitHub Actions)

```yaml
name: self-build-ci

on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  build_test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Backend build + test
        run: |
          dotnet restore
          dotnet test --logger "trx;LogFileName=test-results.trx"

      - name: Client build + test
        run: |
          cd src/client
          npm ci
          npm test -- --ci

      - name: Package evidence bundle
        run: |
          mkdir -p evidence
          cp -r src/backend/**/TestResults evidence/ || true
          cp -r src/client/**/test-results evidence/ || true
          # Write a human summary for the run UI
          echo "## Self-build CI summary" >> $GITHUB_STEP_SUMMARY
          echo "- Backend tests: completed" >> $GITHUB_STEP_SUMMARY
          echo "- Client tests: completed" >> $GITHUB_STEP_SUMMARY

      - name: Upload evidence bundle
        uses: actions/upload-artifact@v4
        with:
          name: evidence-bundle
          path: evidence
```

This design leverages job summaries and artifacts explicitly for “no-code explanation” and evidence retention. citeturn22search0turn24view0

## Progress preservation as a first-class system feature

You listed the exact fields that must be saved. The engineering-robust solution is: **Progress Ledger as internal source of truth**, with bidirectional links to graph nodes, repositories, CI artifacts, and PM work items.

### Why trace IDs are the backbone of auditability

For correlation across services and across signals (logs/traces/metrics), OpenTelemetry describes context propagation as the mechanism that carries trace/span IDs across boundaries, and notes that official propagators default to the W3C Trace Context headers (including `traceparent`). citeturn25view0turn25view1  
OpenTelemetry also describes log correlation as injecting trace context into log records, enabling logs to be viewed in trace context. citeturn2view0turn25view0

Practically: every Progress Ledger record should include `traceId` (and often the serialized `traceparent`) so that a user can click from “a failing arbiter judgment” to the exact logs/spans.

### Canonical Progress Ledger record types

Below are minimal, concrete schemas (examples) capturing the “progress must save …” checklist.

**WorkSpec (what needs to be done / acceptance criteria)**

```json
{
  "specId": "SPEC:FAMILY:DatabaseFabric:Provider:Mongo",
  "scope": { "level": "SYSTEM", "tenantId": null },
  "targets": [{ "familyId": "DatabaseFabric", "factoryId": "Fxxx", "providerId": "mongo" }],
  "acceptanceCriteria": [
    "All factory methods implemented for provider",
    "Contract tests pass",
    "E2E smoke flow passes"
  ],
  "dependencies": {
    "factories": ["Fxxx", "Fyyy"],
    "flows": ["FLOW-SMOKE-01"],
    "skills": ["SK-FAM-DB", "SK-Fxxx"]
  }
}
```

**WorkPattern (pattern of solving / skills used / RAG resources)**

```json
{
  "patternId": "PATTERN-RUN-<runId>-NODE-<nodeId>",
  "appliedSkillIds": ["SK-102", "SK-103", "SK-DB-PROVIDER"],
  "rag": {
    "graphQueries": ["GetFamilyContext", "GetFactoryImpact"],
    "graphNodeIds": ["Family:DB", "Factory:Fxxx", "Method:sha1(...)"],
    "vectorChunkRefs": ["vec:chunk:123", "vec:chunk:456"]
  }
}
```

**ExecutionRecipe (which prompts/models were used for implementors)**

```json
{
  "runId": "RUN-...",
  "nodeId": "implement_factory_method",
  "flowType": "IMPLEMENT_FAMILY",
  "taskType": "T58",
  "prompt": { "id": "PROMPT:ImplementFactoryMethod", "version": "v7" },
  "model": { "provider": "openai", "name": "gpt-4o", "version": "2024-08-06" },
  "retrieval": { "mode": "hybrid", "ragProfileId": "RAG:Hybrid:v3" },
  "metrics": { "tokensIn": 12000, "tokensOut": 2200, "latencyMs": 8400 }
}
```

Schema adherence is enforceable using Structured Outputs, which is explicitly designed to constrain outputs to a JSON Schema and reduce invalid formatting. citeturn29view0

**ArbiterJudgment (arbiter inputs and result)**

```json
{
  "judgmentId": "JDG-...",
  "arbiterId": "ArbiterTesting",
  "runId": "RUN-...",
  "nodeId": "arbiter_testing",
  "inputs": {
    "specId": "SPEC:FAMILY:...",
    "codeRefs": ["repo:core:path:src/backend/...#Symbol"],
    "testReportRefs": ["artifact:evidence-bundle:test-results.trx"]
  },
  "result": {
    "pass": false,
    "failureLabels": ["MISSING_CONTRACT_TEST", "E2E_FLAKE"],
    "requiredActions": [
      "Add contract test suite for method X",
      "Stabilize E2E by using deterministic test data seed"
    ]
  }
}
```

**CodeChangeSet (commits, code references)**

```json
{
  "changeSetId": "CS-...",
  "repo": { "provider": "git", "repoId": "core" },
  "commit": { "sha": "abc123", "branch": "feature/selfbuild" },
  "pullRequest": { "id": 42, "provider": "github" },
  "files": {
    "created": ["src/backend/Fabrics/DatabaseFabric/Providers/Mongo/..."],
    "modified": ["src/backend/Fabrics/DatabaseFabric/IDatabaseService.cs"],
    "deleted": []
  },
  "codeRefs": [
    { "path": "src/backend/.../MongoDatabaseService.cs", "symbol": "StoreDocumentAsync" }
  ]
}
```

**TestReport (tests + e2e implemented and executed)**

```json
{
  "testReportId": "TR-...",
  "suiteType": "e2e",
  "runner": "playwright",
  "status": "FAIL",
  "artifacts": ["artifact:evidence-bundle:playwright-report/"],
  "covers": {
    "factories": ["Fxxx"],
    "methods": ["sha1(...)"],
    "flows": ["FLOW-SMOKE-01"]
  }
}
```

Playwright provides official documentation for end-to-end testing and CI guidance in .NET contexts, making it a solid default for browser-based E2E. citeturn3search3turn16search2

**GraphChangeSet (GraphRAG methodology + query provenance)**

```json
{
  "graphChangeId": "GC-...",
  "queriesUsed": [
    { "templateId": "GetFamilyContext", "params": { "familyId": "DatabaseFabric" } },
    { "templateId": "GetFactoryImpact", "params": { "factoryId": "Fxxx" } }
  ],
  "upserts": {
    "nodes": ["ProviderImpl:mongo", "TestSuite:contract:Fxxx", "RepoArtifact:path:..."],
    "edges": ["ProviderImpl-IMPLEMENTS->Method", "TestSuite-COVERS->Method"]
  }
}
```

GraphRAG’s BYOG design reinforces the idea that structure (entities/relationships) is a primary artifact that downstream processes use; storing “graph changes” as first-class evidence is aligned with that approach. citeturn16view0

**NoCodeReport (plain-language “what happened” + resource list)**

```json
{
  "reportId": "NCR-...",
  "runId": "RUN-...",
  "summary": "Implemented Mongo provider for IDatabaseService. Added contract tests and updated impacted providers. Ran unit+contract+e2e; e2e still failing due to seed data mismatch.",
  "resourcesUsed": {
    "skills": ["SK-DB-PROVIDER", "SK-103"],
    "ragChunks": ["vec:chunk:123", "vec:chunk:456"],
    "prompts": ["PROMPT:ImplementFactoryMethod:v7", "PROMPT:ArbiterTesting:v3"],
    "evidenceBundles": ["artifact:evidence-bundle"]
  }
}
```

This “no-code explanation” should also be rendered into a run summary (e.g., GitHub job summary markdown) for immediate human consumption. citeturn22search0

### Visual progress model for the user

Your UI should not parse logs to infer status; it should read explicit snapshots:

- RunSnapshot: overall DAG, node statuses, completion gate
- NodeSnapshot: step inputs/outputs, recipe, evidence links, user tasks (if any)

This aligns with your requirement for “progress reported visually” and “user iteration” (WAITING_FOR_USER).

A robust status taxonomy should include at least: PLANNED, SCAFFOLDED, IMPLEMENTED, TESTED, INTEGRATED, PUBLISHED, BROKEN, DEPRECATED.

## Work-management integration via a fabric-first provider layer

You correctly stated that the specific PM system shouldn’t matter. Use a single PM provider interface that supports:

- create/update items (and discover or map fields)
- attach evidence artifacts / comments
- reflect status and blockers (including “waiting for user/group/quorum”)

### Why each PM system is viable (and what to store where)

Treat the Progress Ledger as canonical; mirror only the “human interface” subset to the external PM system.

- Jira Cloud REST APIs: issue operations are exposed via `/rest/api/3/issue` and include create and other issue actions; attachments are handled via a dedicated attachments resource. citeturn6view0turn1view0
- Trello APIs: card endpoints include creating attachments on a card, and Trello supports webhooks to observe changes and keep mirrors consistent. citeturn8view0turn10view0
- Azure DevOps Boards: work items and updates are part of Work Item Tracking; REST APIs support work item updates using JSON Patch-like operations. citeturn1search2turn1search6

### Comparison table: Jira vs Trello vs Azure DevOps for your “progress mirror”

| Capability | Jira Cloud | Trello | Azure DevOps Boards |
|---|---|---|---|
| Work item creation/edit | Issue endpoints exist and are documented. citeturn6view0 | Cards are the primary unit (“card” APIs). citeturn8view0 | Work items are the primary unit; WIT concepts documented. citeturn1search2 |
| Attach run evidence | Attachments API group exists. citeturn1view0 | “Create attachment on card” endpoint exists. citeturn10view0 | Work item update APIs support attachments/updates. citeturn1search6 |
| Change notifications | (Common via webhooks/apps; depends on setup) | Webhooks are explicitly documented. citeturn10view0 | Board/pipeline events supported across Azure DevOps ecosystem (implementation-specific). citeturn1search2 |
| Best role in this architecture | Enterprise-friendly issue tracking and approvals | Lightweight collaboration board, good for early-stage | Strong integrated ALM when you want “one Microsoft plane” |

In all cases: store **IDs and links** to the PM work item inside your internal WorkSpec / NodeSnapshot records to keep bidirectional traceability.

## Phased implementation roadmap, effort ranges, and risk mitigations

The roadmap below is intentionally incremental: each phase yields a usable, testable, debuggable system with visible progress UI.

### Phase outcomes and effort ranges

**Phase: Kernel + installer skeleton (2–4 weeks)**  
Deliver: minimal flow runtime, registry store/read, Progress Ledger indices, Docker Compose sandbox profile, initial UI run monitor (graph + node inspector). citeturn16view0turn3view0

**Phase: Plan translation + GraphRAG bootstrap (3–6 weeks)**  
Deliver: PlanBundle parsers, registry writers, graph catalog seeding, hybrid retrieval service (graph-filtered vector search), QueryTemplates (GetFamilyContext/GetFactoryImpact), and repo discovery to set implemented/tested statuses with code/test references. citeturn16view0

**Phase: Implement-family loop + arbiter gates (4–8 weeks)**  
Deliver: implementor pipeline with schema-enforced PatchPlan, arbiter set, judgment loop, deterministic local deploy + smoke test, and regression-triggered retest logic using impact graph. citeturn29view0turn25view0turn16view0

**Phase: PromptOps control plane + evals + canary (4–8 weeks)**  
Deliver: PromptVersion lifecycle (candidate/canary/active), model/version routing via ExecutionRecipe, eval suite execution per change, and “improve prompt” workflows. citeturn28view0turn29view0

**Phase: Work-management provider + production readiness (3–6 weeks)**  
Deliver: F64 PM provider implementations for your selected initial system; consistent mirroring of status/evidence; hardened permissions and approvals; deployment safety gates. citeturn6view0turn8view0turn1search6turn23view0

### Key risks and mitigations

**Risk: Non-deterministic AI outputs produce inconsistent patches**  
Mitigation: schema-enforced outputs (Structured Outputs), eval-driven development, and continuous evaluation on every prompt/model change. citeturn29view0turn28view0

**Risk: Inability to correlate “what happened” across code, tests, and logs**  
Mitigation: enforce W3C Trace Context headers and OpenTelemetry context propagation/log correlation; store trace IDs in every ledger/evidence record. citeturn25view0turn25view1turn2view0

**Risk: Flaky E2E tests undermine self-healing loops**  
Mitigation: local sandbox standardization (Compose), containerized dependencies for integration tests (Testcontainers), deterministic test data seeds, and tiered gates (unit/contract before E2E). citeturn16view0turn16view1turn3search3turn26search3

**Risk: Vendor/tool lock-in for PM system**  
Mitigation: internal ledger as the source of truth; mirror minimal projection fields to Jira/Trello/Azure DevOps via provider interface. citeturn1search2turn6view0turn8view0

**Risk: Evidence retention breaks when CI artifacts expire**  
Mitigation: store artifact IDs/URLs and retention policy references; optionally copy critical evidence summaries into the Progress Ledger and into job summaries. GitHub artifact tooling documents artifact identity outputs and retention concepts. citeturn24view0turn22search0