# FLOW-26 UI Spec — Phase 5 Deliverable

**Flow:** Meta Flow Engine (`meta-flow-engine`)
**Classification:** ENGINE_INTERNAL
**P2 verdict:** ADMIN_COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `MetaFlowEnginePage.tsx` | `/admin/meta-flow-engine/meta-flow-engine` | `page-meta-flow-engine` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | DNA-1: Record<string, unknown> (no typed models) | `MetaFlowEnginePage.tsx` | `page-metaflowengine` |
| 2 | DNA-2: BuildSearchFilter (dynamic queries) | `MetaFlowEnginePage.tsx` | `page-metaflowengine` |
| 3 | DNA-3: DataProcessResult<T> (no throws for business logic) | `MetaFlowEnginePage.tsx` | `page-metaflowengine` |
| 4 | DNA-4: MicroserviceBase (19 inherited components) | `MetaFlowEnginePage.tsx` | `page-metaflowengine` |
| 5 | DNA-5: Scope Isolation via AsyncLocalStorage | `MetaFlowEnginePage.tsx` | `page-metaflowengine` |
| 6 | DNA-6: DynamicController (all CRUD via /api/dynamic/{indexName}) | `MetaFlowEnginePage.tsx` | `page-metaflowengine` |
| 7 | DNA-7: Idempotency via queue deduplication | `MetaFlowEnginePage.tsx` | `page-metaflowengine` |
| 8 | DNA-8: Outbox pattern (storeDocument before enqueue) | `MetaFlowEnginePage.tsx` | `page-metaflowengine` |
| 9 | DNA-9: CloudEvents envelope for inter-service events | `MetaFlowEnginePage.tsx` | `page-metaflowengine` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 9 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
