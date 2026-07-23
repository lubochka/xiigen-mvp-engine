# FLOW-11 UI Automation Gap Analysis — Phase 3 Deliverable

**Flow:** Schema Registry DAG (`schema-registry-dag`)
**Classification:** ADMIN_FACING
**P2 verdict:** COVERED

## Spec Files Found (both directories searched)

| Path | Lines | Size (B) | Role |
|------|------:|---------:|------|
| `client/e2e/schema-registry-dag.spec.ts` | 95 | 4880 | AUTHORITATIVE |

| # | Business State | P2 Verdict | Automation | Spec File | Test | Line |
|---|---------------|------------|-----------|-----------|------|------|
| 1 | SchemaRegistrationGateway — transaction step entered via `POST /schemas (transactional write)` | COVERED | NOT_TESTED | `schema-registry-dag.spec.ts` | — | — |
| 2 | SchemaVersionManager — validation step entered via `Inline validation — called by T189` | COVERED | NOT_TESTED | `schema-registry-dag.spec.ts` | — | — |
| 3 | DagCycleDetector — validation step entered via `Inline — prevents circular schema references` | COVERED | PARTIAL | `schema-registry-dag.spec.ts` | FLOW-11 — Schema Registry & DAG | 16 |
| 4 | SchemaCompatibilityChecker — validation step entered via `Inline — checks backward compatibility` | COVERED | NOT_TESTED | `schema-registry-dag.spec.ts` | — | — |
| 5 | SchemaPublisher — transaction step entered via `SchemaValidated event (OCC — version immutability)` | COVERED | NOT_TESTED | `schema-registry-dag.spec.ts` | — | — |
| 6 | DagTopologyBuilder — data_pipeline step entered via `SchemaPublished event (rebuilds DAG topology)` | COVERED | PARTIAL | `schema-registry-dag.spec.ts` | FLOW-11 — Schema Registry & DAG | 16 |
| 7 | DagRenderGateway — data_pipeline step entered via `GET /dag/render (serves DAG visualization)` | COVERED | TESTED | `schema-registry-dag.spec.ts` | R-08: DAG Visualization page loads and renders output | 87 |
| 8 | SchemaRegistrationRequested → SchemaRegistrationGateway when `` (emits `xiigen.schema-registry.regis… | COVERED | TESTED | `schema-registry-dag.spec.ts` | FLOW-11 — Schema Registry & DAG | 16 |
| 9 | SchemaRegistrationGateway → SchemaVersionManager when `inline` (emits `xiigen.schema-registry.versio… | COVERED | TESTED | `schema-registry-dag.spec.ts` | FLOW-11 — Schema Registry & DAG | 16 |
| 10 | SchemaRegistrationGateway → DagCycleDetector when `inline` (emits `xiigen.schema-registry.cycle-chec… | COVERED | TESTED | `schema-registry-dag.spec.ts` | FLOW-11 — Schema Registry & DAG | 16 |
| 11 | SchemaRegistrationGateway → SchemaCompatibilityChecker when `inline` (emits `xiigen.schema-registry.… | COVERED | TESTED | `schema-registry-dag.spec.ts` | FLOW-11 — Schema Registry & DAG | 16 |
| 12 | SchemaRegistrationGateway → SchemaPublisher when `all inline checks passed` (emits `xiigen.schema-re… | COVERED | TESTED | `schema-registry-dag.spec.ts` | FLOW-11 — Schema Registry & DAG | 16 |
| 13 | SchemaRegistrationGateway → SchemaRejected when `any inline check failed — terminal` (emits `xiigen.… | COVERED | TESTED | `schema-registry-dag.spec.ts` | FLOW-11 — Schema Registry & DAG | 16 |
| 14 | SchemaPublisher → DagTopologyBuilder when `` (emits `xiigen.schema-registry.schema-published.v1`) | COVERED | TESTED | `schema-registry-dag.spec.ts` | FLOW-11 — Schema Registry & DAG | 16 |
| 15 | DagTopologyBuilder → DagRenderGateway when `` (emits `xiigen.schema-registry.dag-rebuilt.v1`) | COVERED | TESTED | `schema-registry-dag.spec.ts` | FLOW-11 — Schema Registry & DAG | 16 |
| 16 | DagRenderGateway → DagRendered when `terminal` (emits `xiigen.schema-registry.dag-rendered.v1`) [TER… | COVERED | TESTED | `schema-registry-dag.spec.ts` | FLOW-11 — Schema Registry & DAG | 16 |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 16 (= P1 item count). PASS
- **Arbiter 2 — Both Directories Searched:** PASS — both `client/e2e/` AND `e2e/tests/` traversed; results listed in Spec Files section above.
- **Arbiter 3 — Test String Truthfulness:** PASS — TESTED/PARTIAL verdicts cite exact test/describe string with line number from the authoritative spec file.
- **Arbiter 4 — Duplicate Flagging:** N/A — 0 duplicate(s) flagged for Phase 12 consolidation.
