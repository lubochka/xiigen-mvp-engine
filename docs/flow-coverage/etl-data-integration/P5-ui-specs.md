# FLOW-14 UI Spec — Phase 5 Deliverable

**Flow:** ETL Data Integration (`etl-data-integration`)
**Classification:** ADMIN_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `EtlDataIntegrationPage.tsx` | `/admin/etl-data-integration/etl-data-integration` | `page-etl-data-integration` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | Every task type in T189-T200 has at least one plan step | `EtlDataIntegrationPage.tsx` | `page-etldataintegration` |
| 2 | Every plan step is scoped to a single responsibility (single task type) | `EtlDataIntegrationPage.tsx` | `page-etldataintegration` |
| 3 | No step imports provider SDKs directly (fabric-first) | `EtlDataIntegrationPage.tsx` | `page-etldataintegration` |
| 4 | No step creates entity-specific controllers | `EtlDataIntegrationPage.tsx` | `page-etldataintegration` |
| 5 | All steps return DataProcessResult<T> | `EtlDataIntegrationPage.tsx` | `page-etldataintegration` |
| 6 | Focus areas covered: ETL pipeline, 25 CloudEvent schemas, BFA peer-flow rules | `EtlDataIntegrationPage.tsx` | `page-etldataintegration` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 6 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
