# FLOW-11 Snapshot Gap Analysis — Phase 4 Deliverable

**Flow:** Schema Registry DAG (`schema-registry-dag`)
**Classification:** ADMIN_FACING
**Authoritative spec:** `client\e2e\schema-registry-dag.spec.ts`
**Snapshot dir:** (not parseable from spec)
**P3 input rows (TESTED+PARTIAL):** 12

| # | Business State | P3 | Verdict | PNG Evidence |
|---|---------------|-----|---------|--------------|
| 1 | DagCycleDetector — validation step entered via `Inline — prevents circular schema references` | PARTIAL | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 2 | DagTopologyBuilder — data_pipeline step entered via `SchemaPublished event (rebuilds DAG topology)` | PARTIAL | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 3 | DagRenderGateway — data_pipeline step entered via `GET /dag/render (serves DAG visualization)` | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 4 | SchemaRegistrationRequested → SchemaRegistrationGateway when `` (emits `xiigen.schema-registry.regis… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 5 | SchemaRegistrationGateway → SchemaVersionManager when `inline` (emits `xiigen.schema-registry.versio… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 6 | SchemaRegistrationGateway → DagCycleDetector when `inline` (emits `xiigen.schema-registry.cycle-chec… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 7 | SchemaRegistrationGateway → SchemaCompatibilityChecker when `inline` (emits `xiigen.schema-registry.… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 8 | SchemaRegistrationGateway → SchemaPublisher when `all inline checks passed` (emits `xiigen.schema-re… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 9 | SchemaRegistrationGateway → SchemaRejected when `any inline check failed — terminal` (emits `xiigen.… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 10 | SchemaPublisher → DagTopologyBuilder when `` (emits `xiigen.schema-registry.schema-published.v1`) | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 11 | DagTopologyBuilder → DagRenderGateway when `` (emits `xiigen.schema-registry.dag-rebuilt.v1`) | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 12 | DagRenderGateway → DagRendered when `terminal` (emits `xiigen.schema-registry.dag-rendered.v1`) [TER… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 12 (= P3 TESTED+PARTIAL count). PASS
- **Arbiter 2 — PNG Truthfulness:** PASS — PNG_EXISTS requires file ≥1024B on disk under `docs/e2e-snapshots/?/`.
- **Arbiter 3 — Screenshot-call Presence:** PASS — SCREENSHOT_CALL_EXISTS means `page.screenshot()` is present in the test block but PNG missing / < 1KB on disk.
- **Arbiter 4 — Distinction Clarity:** PASS — NO_SCREENSHOT means the test block has no `page.screenshot()` call (separate from SCREENSHOT_CALL_EXISTS).
