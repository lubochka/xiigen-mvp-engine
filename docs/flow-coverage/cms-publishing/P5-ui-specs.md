# FLOW-22 UI Spec — Phase 5 Deliverable

**Flow:** CMS Publishing (`cms-publishing`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `CmsPublishingPage.tsx` | `/cms-publishing/cms-publishing` | `page-cms-publishing` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | Every task type in T341-T380 has at least one plan step | `CmsPublishingPage.tsx` | `page-cmspublishing` |
| 2 | Every plan step is scoped to a single responsibility (single task type) | `CmsPublishingPage.tsx` | `page-cmspublishing` |
| 3 | No step imports provider SDKs directly (fabric-first) | `CmsPublishingPage.tsx` | `page-cmspublishing` |
| 4 | No step creates entity-specific controllers | `CmsPublishingPage.tsx` | `page-cmspublishing` |
| 5 | All steps return DataProcessResult<T> | `CmsPublishingPage.tsx` | `page-cmspublishing` |
| 6 | Focus areas covered: CMS editorial workflow, versioned publishing, slug registry | `CmsPublishingPage.tsx` | `page-cmspublishing` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 6 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
