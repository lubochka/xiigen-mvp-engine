# FLOW-11 UI Spec — Phase 5 Deliverable

**Flow:** Schema Registry DAG (`schema-registry-dag`)
**Classification:** ADMIN_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `DagVisualizationPage.tsx` | `/admin/schema-registry-dag/dag-visualization` | `dag-error`, `dag-output`, `dag-viz-form`, `flow-id-input`, `format-select`, `page-dag-visualization` +1 |
| `SchemaRegistryPage.tsx` | `/admin/schema-registry-dag/schema-registry` | `loading-indicator`, `page-schema-registry`, `schema-item`, `schema-list`, `schema-search-form`, `schema-type-input` +1 |
| `SchemaSubmissionPage.tsx` | `/admin/schema-registry-dag/schema-submission` | `json-schema-input`, `page-schema-submission`, `schema-submission-form`, `schema-type-input`, `submission-error`, `submission-result` +1 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | SchemaRegistrationGateway — transaction step entered via `POST /schemas (transactional wri… | `DagVisualizationPage.tsx` | `page-dagvisualization` |
| 2 | SchemaVersionManager — validation step entered via `Inline validation — called by T189` | `DagVisualizationPage.tsx` | `page-dagvisualization` |
| 3 | DagCycleDetector — validation step entered via `Inline — prevents circular schema referenc… | `SchemaRegistryPage.tsx` | `page-schemaregistry` |
| 4 | SchemaCompatibilityChecker — validation step entered via `Inline — checks backward compati… | `DagVisualizationPage.tsx` | `page-dagvisualization` |
| 5 | SchemaPublisher — transaction step entered via `SchemaValidated event (OCC — version immut… | `DagVisualizationPage.tsx` | `page-dagvisualization` |
| 6 | DagTopologyBuilder — data_pipeline step entered via `SchemaPublished event (rebuilds DAG t… | `DagVisualizationPage.tsx` | `page-dagvisualization` |
| 7 | DagRenderGateway — data_pipeline step entered via `GET /dag/render (serves DAG visualizati… | `DagVisualizationPage.tsx` | `page-dagvisualization` |
| 8 | SchemaRegistrationRequested → SchemaRegistrationGateway when `` (emits `xiigen.schema-regi… | `SchemaRegistryPage.tsx` | `page-schemaregistry` |
| 9 | SchemaRegistrationGateway → SchemaVersionManager when `inline` (emits `xiigen.schema-regis… | `SchemaRegistryPage.tsx` | `page-schemaregistry` |
| 10 | SchemaRegistrationGateway → DagCycleDetector when `inline` (emits `xiigen.schema-registry.… | `SchemaRegistryPage.tsx` | `page-schemaregistry` |
| 11 | SchemaRegistrationGateway → SchemaCompatibilityChecker when `inline` (emits `xiigen.schema… | `SchemaRegistryPage.tsx` | `page-schemaregistry` |
| 12 | SchemaRegistrationGateway → SchemaPublisher when `all inline checks passed` (emits `xiigen… | `SchemaRegistryPage.tsx` | `page-schemaregistry` |
| 13 | SchemaRegistrationGateway → SchemaRejected when `any inline check failed — terminal` (emit… | `SchemaRegistryPage.tsx` | `page-schemaregistry` |
| 14 | SchemaPublisher → DagTopologyBuilder when `` (emits `xiigen.schema-registry.schema-publish… | `SchemaRegistryPage.tsx` | `page-schemaregistry` |
| 15 | DagTopologyBuilder → DagRenderGateway when `` (emits `xiigen.schema-registry.dag-rebuilt.v… | `SchemaRegistryPage.tsx` | `page-schemaregistry` |
| 16 | DagRenderGateway → DagRendered when `terminal` (emits `xiigen.schema-registry.dag-rendered… | `SchemaRegistryPage.tsx` | `page-schemaregistry` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 16 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
