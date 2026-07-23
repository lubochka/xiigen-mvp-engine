# FLOW-11 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Schema Registry DAG (`schema-registry-dag`)
**Classification:** ADMIN_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/schema-registry-dag.topology.json`

**Topology shape:** 7 nodes, 9 edges. Minimum inventory items: 16.

## Business States & Transitions

1. SchemaRegistrationGateway — transaction step entered via `POST /schemas (transactional write)`
2. SchemaVersionManager — validation step entered via `Inline validation — called by T189`
3. DagCycleDetector — validation step entered via `Inline — prevents circular schema references`
4. SchemaCompatibilityChecker — validation step entered via `Inline — checks backward compatibility`
5. SchemaPublisher — transaction step entered via `SchemaValidated event (OCC — version immutability)`
6. DagTopologyBuilder — data_pipeline step entered via `SchemaPublished event (rebuilds DAG topology)`
7. DagRenderGateway — data_pipeline step entered via `GET /dag/render (serves DAG visualization)`
8. SchemaRegistrationRequested → SchemaRegistrationGateway when `` (emits `xiigen.schema-registry.registration-requested.v1`)
9. SchemaRegistrationGateway → SchemaVersionManager when `inline` (emits `xiigen.schema-registry.version-check-inline.v1`)
10. SchemaRegistrationGateway → DagCycleDetector when `inline` (emits `xiigen.schema-registry.cycle-check-inline.v1`)
11. SchemaRegistrationGateway → SchemaCompatibilityChecker when `inline` (emits `xiigen.schema-registry.compatibility-check-inline.v1`)
12. SchemaRegistrationGateway → SchemaPublisher when `all inline checks passed` (emits `xiigen.schema-registry.schema-validated.v1`)
13. SchemaRegistrationGateway → SchemaRejected when `any inline check failed — terminal` (emits `xiigen.schema-registry.schema-rejected.v1`) [TERMINAL]
14. SchemaPublisher → DagTopologyBuilder when `` (emits `xiigen.schema-registry.schema-published.v1`)
15. DagTopologyBuilder → DagRenderGateway when `` (emits `xiigen.schema-registry.dag-rebuilt.v1`)
16. DagRenderGateway → DagRendered when `terminal` (emits `xiigen.schema-registry.dag-rendered.v1`) [TERMINAL]

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 9+7=16):** PASS — 16 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
