# Flow UI examination — FLOW-11 schema-registry-dag

## Date: 2026-04-20 · Run: RUN-59 · Batch: E (Grammar 1 Progress Strip + compound Grammar 4 DAG view)

## One-sentence spec (F1)
> When a new schema version is submitted to the XIIGen engine, register it
> in the schema registry, validate it against the DAG for dependency conflicts,
> and publish the version if validation passes.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-03.md`)
- **platform-admin** — primary; register + validate + publish schemas
- **tenant-admin** — consume (cross-flow dependency awareness when defining own flow)
- **platform-support** — audit

## Grammar (compound)
- **G1 Progress Strip** for per-schema-version validation runs
- **G4 Topology Canvas** for the schema DAG view (dependencies across versions)

## Reference
**Confluent Schema Registry**, **Apollo Studio** (schema graph), **GraphQL
Inspector** (breaking-change visualisation).

## Classification
- **Q1 CRUD?** 🟡 3 pages exist (SchemaRegistryPage / SchemaSubmissionPage / DagVisualizationPage).
- **Q2 Error/empty?** Empty registry: "No schemas registered yet" + submit CTA.
- **Q3 Engineering leak?** DAG / dependency-conflict terminology — acceptable for admin audience.
- **Q4 Role-correct?** 3-role scope.

**Primary finding:** 🟡 partial — 3-page architecture is good; compound grammars (G1 + G4) need rendering verification.

## 14 existing PNGs

## Planned fixes
- SchemaRegistryPage (G3 card list): one card per schema with version badge + compatibility status + last-updated
- SchemaSubmissionPage (G5 kiosk form): upload + metadata + "Validate" primary
- Post-submit: Progress Strip showing validation phases (Parsed → Dependency scan → Compatibility check → Published)
- DagVisualizationPage (G4 topology): schemas-as-nodes + edges for dependencies, colour per compatibility status
