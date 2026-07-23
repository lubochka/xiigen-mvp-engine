# FLOW-23 UI Spec — Phase 5 Deliverable

**Flow:** Form Builder Templates (`form-builder-templates`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `TemplateBuilder.tsx` | `/form-builder-templates/template-builder` | (none declared) |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | Every task type in T381-T420 has at least one plan step | `TemplateBuilder.tsx` | `page-templatebuilder.tsx` |
| 2 | Every plan step is scoped to a single responsibility (single task type) | `TemplateBuilder.tsx` | `page-templatebuilder.tsx` |
| 3 | No step imports provider SDKs directly (fabric-first) | `TemplateBuilder.tsx` | `page-templatebuilder.tsx` |
| 4 | No step creates entity-specific controllers | `TemplateBuilder.tsx` | `page-templatebuilder.tsx` |
| 5 | All steps return DataProcessResult<T> | `TemplateBuilder.tsx` | `page-templatebuilder.tsx` |
| 6 | Focus areas covered: form builder, template gallery, submission pipeline | `TemplateBuilder.tsx` | `page-templatebuilder.tsx` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 6 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
