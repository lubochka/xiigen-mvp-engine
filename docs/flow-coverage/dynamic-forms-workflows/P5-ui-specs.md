# FLOW-21 UI Spec — Phase 5 Deliverable

**Flow:** Dynamic Forms & Workflows (`dynamic-forms-workflows`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `DynamicFormsWorkflowsPage.tsx` | `/dynamic-forms-workflows/dynamic-forms-workflows` | `page-dynamic-forms-workflows` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | Every task type in T307-T340 has at least one plan step | `DynamicFormsWorkflowsPage.tsx` | `page-dynamicformsworkflows` |
| 2 | Every plan step is scoped to a single responsibility (single task type) | `DynamicFormsWorkflowsPage.tsx` | `page-dynamicformsworkflows` |
| 3 | No step imports provider SDKs directly (fabric-first) | `DynamicFormsWorkflowsPage.tsx` | `page-dynamicformsworkflows` |
| 4 | No step creates entity-specific controllers | `DynamicFormsWorkflowsPage.tsx` | `page-dynamicformsworkflows` |
| 5 | All steps return DataProcessResult<T> | `DynamicFormsWorkflowsPage.tsx` | `page-dynamicformsworkflows` |
| 6 | Focus areas covered: dynamic form engine, workflow state machine, conditional logic | `DynamicFormsWorkflowsPage.tsx` | `page-dynamicformsworkflows` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 6 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
