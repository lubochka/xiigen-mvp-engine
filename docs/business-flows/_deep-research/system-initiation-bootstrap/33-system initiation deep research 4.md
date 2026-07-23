# Designing a Documented, Visual, Iterative, Easy-to-Deploy “Installer → Self-Build → Self-Test” Start for .NET + React or React Native

## Executive summary

To start development after “all current plans are generated (and more will come later)”—and to have the system **build and test itself**—you need a bootstrap that is simultaneously:

- **Deterministic** enough to be safe (plans → typed registries → task DAG execution),
- **Observable** enough to be trusted (every step emits structured progress + artifacts),
- **Interactive** enough to iterate (human checkpoints for approvals/iterations),
- **Deployable** enough to run locally on day zero (single command + Docker Compose),
- **Evolvable** enough to adapt (PromptOps: versioning, eval, canary, rollback).

The missing piece you called out—“well documented, progress reported visually, user iteration, easy deploy/test”—is addressed by adding an explicit **Delivery & Documentation layer** to your earlier architecture:

- **Every flow node produces a “Run Evidence Pack”** (structured JSON + human-readable Markdown/HTML + links) and persists it in CI artifacts and your status graph. GitHub Actions artifacts are explicitly meant for persisting outputs/logs/reports across jobs and after the run. citeturn2search6turn2search2  
- **Every node also emits status events** that drive a visual DAG monitor in the client UI and can appear in CI surfaces (job summary, checks). GitHub job summaries support custom Markdown on workflow run summaries via `GITHUB_STEP_SUMMARY`. citeturn3search4turn3search0  
- **Prompt versions and model versions are routed by “ExecutionRecipes”**, and improvements are gated by evaluation suites and canary rollout. This is directly aligned with entity["company","OpenAI","ai company"] guidance: evals are the way to test variable model outputs in production, and structured outputs can enforce JSON schemas for automation-safe outputs. citeturn0search1turn0search0  
- **GraphRAG bootstrapping is BYOG-first** for deterministic connectivity (families/interfaces), then GraphRAG’s community summaries and local search are used for richer reasoning and retrieval. GraphRAG’s “Bring Your Own Graph” documentation describes seeding `entities.parquet` and `relationships.parquet` and then running community workflows for query. citeturn1search0turn4search2

What follows is a rigorous blueprint that turns those principles into concrete “installer + implement-family loop + PromptOps loop,” with built-in documentation and visual progress reporting.

## A bootstrap architecture that is self-documenting and visually observable

### The additional “Delivery & Documentation layer” you need

Your earlier “kernel + registries + GraphRAG + implement-family flow” becomes operational when you require every step (installer nodes, implementator nodes, arbiter nodes) to produce **three outputs**:

- **Machine output** (structured JSON): PatchPlan, Judgment, RecipeResolution, GraphUpdates.
- **Human output** (Markdown/HTML): what happened, why, what changed, what failed, what’s next.
- **UI output** (events): DAG node status updates, percent complete, links to evidence.

This pattern closely matches modern CI practice: workflows generate build/test outputs which are uploaded as artifacts and presented in summaries. GitHub explicitly documents artifacts as “files produced during a workflow run” to persist and share outputs (logs, test results, etc.). citeturn2search6turn2search9

### A minimal “Run Evidence Pack” contract

Define a single Evidence Pack produced by each node:

- `run.json` (structured, used by the system)
- `run.md` (human narrative)
- `links.json` (UI “clickouts”)

Why schema-locked JSON matters: Structured Outputs is designed to ensure the model adheres to your JSON schema—reducing failures like missing keys or invalid enums when automation depends on the output. citeturn0search0

### Where evidence should appear visually

You should support three “progress surfaces” from day zero, ordered by fastest-to-ship:

| Surface | What users see | Why it matters | Supporting primary sources |
|---|---|---|---|
| CI job summary | A Markdown “report card” for the run (DAG status, links to artifacts, failures) | Immediate visibility without building UI first | Job summaries via `GITHUB_STEP_SUMMARY` citeturn3search4turn3search0 |
| CI artifacts | Downloadable logs/reports/traces/diffs | Auditable evidence; debugging capability | Artifact concept + upload action citeturn2search6turn2search2 |
| In-app Run Monitor | DAG visualization: node states, evidence links, re-run buttons | True “self-driving system” UX | Your architecture requirement; ties to status graph (see sections below) |

You can optionally add “PR checks” as a fourth surface when you integrate a GitHub App: the Checks API allows creating check runs for commits; GitHub notes you must use a GitHub App to create a check run. citeturn3search1turn3search9

## Connecting implementator and arbiter prompts to graphs, files, and status

### Graph must encode both connectivity and reachability

You already introduced Catalog Graph + Impact Graph. To make AI edits safe and repeatable, add an overlay with:

- **Status** (planned → scaffolded → implemented → tested → integrated → broken)
- **References** (RepoArtifact paths to code/tests/prompts; build/test run links)

This is the mechanism that solves: “most are not implemented; if they are, code and tests must be reachable to change them easily.”

### GraphRAG bootstrap pattern for “connected interfaces and families”

Use BYOG to seed deterministic connectivity edges, then let GraphRAG build community summaries for higher-level reasoning and drill-down for specific entities:

- BYOG requires entity and relationship tables (e.g., `entities.parquet`, `relationships.parquet`) aligned to GraphRAG workflows. citeturn1search0  
- Local Search is designed for entity-based reasoning that combines structured graph data with unstructured text units. citeturn4search2  
- Global Search uses community reports in a map-reduce fashion for whole-dataset reasoning. citeturn1search7  
- DRIFT combines global and local methods for breadth + depth. citeturn1search4turn4search16

This matters operationally because implementators and arbiters need **predictable** queries:

- “Give me the existing implementation refs for Factory X / Method Y.”
- “What is impacted if I change Method Y signature?”
- “What tests cover it, and where are they located?”

### “File & Setup Contract” enforced via prompt + structured outputs

For implementator prompts and arbiter prompts, adopt rules consistent with entity["company","OpenAI","ai company"]’s guidance for durable automation:

- Use tool/function calling and keep the system in control of execution. citeturn0search3  
- Prefer simple, direct instructions; avoid chain-of-thought elicitation; use delimiters for clarity—especially for reasoning models where developer messages are prioritized. citeturn5search0turn5search10  
- For write actions, treat prompt injection as a first-class risk: validate server-side, require human confirmation for irreversible actions. citeturn5search1  
- Require structured outputs for PatchPlans and Judgments to stabilize parsing and downstream execution. citeturn0search0

In practice: implementator always performs “graph lookup → PatchPlan → apply patch → run tests → update registry/graph.” Arbiters always perform “graph lookup → deterministic checks → Judgment → status update.”

## PromptOps that supports per-model, per-version routing and safe improvement

### Why prompts must be treated as deployable artifacts

If your system is going to self-build, prompt regressions become as dangerous as code regressions. entity["company","OpenAI","ai company"] explicitly frames evals as necessary because generative outputs are variable and traditional deterministic tests are insufficient. citeturn0search1turn0search7

### ExecutionRecipe: the unit of runtime selection and auditability

Create a resolved “ExecutionRecipe” for each node execution that pins:

- PromptVersion + PromptTemplate
- RAGProfileVersion (Graph/Vector/Hybrid, token budgets, filters)
- ModelProfileVersion (provider/model/version + tool permissions)
- JudgeRubricVersion (arbiter thresholds)
- Output schema and tool allowlist

This is how you connect prompts “per model, type, flow type, model + version.”

If you are using reasoning models, OpenAI recommends designing prompts aligned to the new message role behavior (developer messages prioritized) and avoiding “think step-by-step” prompting. citeturn5search0

### Improving prompts safely: eval suites, variants, canary

Two strong primary-source pathways support safe improvement:

- **OpenAI eval best practices + Evals API** for regression testing and measurable gates. citeturn0search1turn0search7  
- **Microsoft prompt flow** for prompt variants and evaluation flows: variants can represent different prompt content or different connection settings, and evaluation flows compute metrics to assess outputs. citeturn1search11turn1search15  

This lines up with your requirement that improvement may require user iteration:

- Candidate prompt versions exist, but only become active after eval + canary.
- A user can approve promotion or rollback.
- Evidence packs show the delta: before/after scores, failure categories, artifacts.

### Cost and latency: prompt caching and stable prefixes

Your flows will likely include large “DNA + contract + schema guardrails” prefixes. OpenAI’s prompt caching is explicitly intended to reduce cost/latency when prompts have identical prefixes. This incentivizes designing prompts with stable headers and variable appended context packs. citeturn0search2turn0search5

## A deployment-and-test experience that is easy on day zero

### One-command local install: Docker Compose + seeded infra pack

For “easy to deploy and test,” your installer should boot a local stack with Docker Compose:

- Compose’s reference documentation shows how services are defined (images, ports, environment variables) and supports dependency containers. citeturn3search2  
- Volumes are the documented way to persist data and share across services. citeturn3search10turn3search6  

A typical day-zero stack for your architecture: Postgres + Redis + Elasticsearch + Neo4j (or equivalent). The exact components depend on your current fabrics; the point is: **the installer owns the composition** and emits `WorkspaceReady` only after the full stack is healthy.

### Integration testing that any developer can run

For deterministic local/CI parity, Testcontainers is a practical approach:

- The Testcontainers .NET getting-started guide emphasizes that integration tests can run locally without installing dependencies like Postgres—tests spin up containerized real services. citeturn3search3turn3search11  
- The Testcontainers for .NET documentation positions it as a library for throwaway Docker containers in tests. citeturn3search7  

This supports your “system modifies existing provider implementations and must retest impacted implementations” requirement: the regression flow can select test sets (contract suites + integration suites) and run them in consistent ephemeral environments.

### Developer iteration loop: fast inner loop with dotnet watch and modern React tooling

Local developer productivity matters because many iterations will still be human-driven at first:

- `dotnet watch` is explicitly designed for fast iterative development; it reruns or hot reloads on file changes. citeturn2search1  
- React’s official “build from scratch” guidance recommends installing a build tool like Vite (or similar) for dev server + build. citeturn2search3  
- Vite’s guide documents the dev server and build pipeline expectations. citeturn2search20  

These tools also let you ship your “visual progress UI” incrementally without blocking the backend kernel work.

## A concrete “installer + implement-family” CI flow with visual progress reporting

### GitHub Actions pattern for visual progress and evidence

You can produce an immediately usable “visual progress report” without building UI first:

- Write a Markdown DAG status and links to evidence into `GITHUB_STEP_SUMMARY`. GitHub documents job summaries as custom Markdown on the workflow run summary. citeturn3search4turn3search0  
- Upload evidence packs as artifacts using the official `actions/upload-artifact` action. citeturn2search2turn2search6  
- Gate promotions using environments and deployment protection rules; GitHub environments prevent jobs from running until protection rules pass. citeturn1search16turn1search2  
- If you want programmatic gates, GitHub supports custom deployment protection rules (external approval/deny logic). citeturn1search5turn1search8  

#### Sample CI YAML skeleton (illustrative)

```yaml
name: installer-and-self-build

on:
  workflow_dispatch:
  push:
    branches: ["main"]

jobs:
  install_and_seed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run installer flow
        run: |
          ./tools/cli platform install --bundle registry/planbundles/latest.json \
            --emit-evidence ./out/evidence

      - name: Write progress summary
        run: |
          echo "## Installer status" >> $GITHUB_STEP_SUMMARY
          echo "- Plan bundle: ✅" >> $GITHUB_STEP_SUMMARY
          echo "- Graph catalog seeded: ✅" >> $GITHUB_STEP_SUMMARY
          echo "- Discovery scan: ✅" >> $GITHUB_STEP_SUMMARY
          echo "- Evidence pack: uploaded below" >> $GITHUB_STEP_SUMMARY

      - name: Upload evidence
        uses: actions/upload-artifact@v4
        with:
          name: installer-evidence
          path: out/evidence/

  implement_family_canary:
    needs: [install_and_seed]
    runs-on: ubuntu-latest
    environment: prompt-canary
    steps:
      - uses: actions/checkout@v4
      - name: Implement family (canary recipe)
        run: |
          ./tools/cli platform run-flow implement-family-v1 \
            --family ExecutionFabric \
            --recipe canary \
            --emit-evidence ./out/evidence

      - uses: actions/upload-artifact@v4
        with:
          name: family-impl-evidence
          path: out/evidence/

  promote_prompt_recipe:
    needs: [implement_family_canary]
    runs-on: ubuntu-latest
    environment: prompt-production
    steps:
      - name: Promote recipe if eval gates passed
        run: ./tools/cli promptops promote --recipe-id REC-123
```

The citations above explain why this pattern works: job summaries and artifacts provide immediate visibility, and environments/protection rules provide governed iteration gates. citeturn2search6turn2search2turn1search16turn1search2

## Phased roadmap with documentation and UX milestones

### Phase progression that matches your “installer-first” approach

| Phase | What ships | How users see progress | Effort range (person-weeks) |
|---|---|---|---|
| Installer baseline | PlanBundle import → registries → Graph catalog → discovery scan | CI summary + artifacts | 4–10 |
| Status + references overlay | Implementation registry + RepoArtifact links + statuses | CI summary + basic UI list | 4–12 |
| Implement-family loop MVP | Multi-model implementator + arbiters loop + local deploy + tests | DAG view in job summary + evidence packs | 8–20 |
| Visual Run Monitor in client | DAG visualization, node details, approvals | In-app DAG + evidence links | 6–16 |
| PromptOps MVP | ExecutionRecipe routing + offline eval + canary gating | Prompt dashboard + eval diffs | 8–18 |
| Continuous improvement | Auto-tune prompts, expand eval suites, richer GraphRAG use | Trend charts + canary rollbacks | ongoing |

GraphRAG’s own docs reinforce that prompt tuning can be automated once a workspace is initialized (including default prompt initialization and auto prompt tuning workflows). citeturn4search3turn4search6

### Key risks and safeguards for interactive iteration

- **Prompt injection and unsafe write actions**: OpenAI recommends mitigating write-action risk via server-side validation and requiring human confirmation for irreversible operations. citeturn5search1  
- **Prompt regressions across model versions**: reasoning model best practices highlight behavior differences and message role expectations; this justifies explicit “per-model/per-version” routing and re-evaluation. citeturn5search0  
- **Lack of evidence for trust**: CI artifacts + job summaries provide a concrete audit trail. citeturn2search6turn3search4  

## Implementation checklist for “documented + visual + iterative + easy deploy/test”

A minimum “definition of done” for your day-zero system:

- The installer can stand up a local environment with Docker Compose and emits a clear readiness signal. citeturn3search2  
- The installer seeds the connectivity graph via BYOG and produces community summaries for higher-level reasoning. citeturn1search0turn1search7  
- Every node emits Evidence Packs and status events, surfaced in CI summaries and artifacts. citeturn2search6turn3search0  
- Implementator outputs PatchPlans in structured JSON and cannot write outside allowed paths; arbiters output structured Judgments. citeturn0search0turn0search3  
- PromptOps stores prompt versions, evaluates candidates using eval best practices, and gates promotion per environment protection rules. citeturn0search1turn1search16turn1search2  
- Integration tests run reproducibly using containerized dependencies (Testcontainers) and are selected via the impact graph when interfaces change. citeturn3search3turn4search2  

This gives you a start that is not only technically sound, but also **operationally usable**: documented, visible, iterative, and testable from day zero.