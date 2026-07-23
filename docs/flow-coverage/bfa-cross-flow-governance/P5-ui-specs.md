# FLOW-25 UI Spec — Phase 5 Deliverable

**Flow:** BFA Cross-Flow Governance (`bfa-cross-flow-governance`)
**Classification:** ENGINE_INTERNAL
**P2 verdict:** ADMIN_COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `BfaCrossFlowGovernancePage.tsx` | `/admin/bfa-cross-flow-governance/bfa-cross-flow-governance` | `page-bfa-cross-flow-governance` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | CHANGE-INTAKE-PARSE-001 (T375): content-addressed ingestion — parse + normalize + persist … | `BfaCrossFlowGovernancePage.tsx` | `page-bfacrossflowgovernance` |
| 2 | BLAST-RADIUS-TRAVERSAL-001 (T380): transitive graph traversal with cycle-safe DFS, depth-l… | `BfaCrossFlowGovernancePage.tsx` | `page-bfacrossflowgovernance` |
| 3 | ARBITRATION-STATE-MACHINE-001 (T381): state machine with human capture, resolution apply, … | `BfaCrossFlowGovernancePage.tsx` | `page-bfacrossflowgovernance` |
| 4 | CROSS-TENANT-GUARD-001 (T387): cross-tenant conflict detection with explicit isolation gat… | `BfaCrossFlowGovernancePage.tsx` | `page-bfacrossflowgovernance` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 4 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
