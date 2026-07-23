# FLOW-44 UI Spec — Phase 5 Deliverable

**Flow:** AI Self-Modification (`ai-self-modification`)
**Classification:** ENGINE_INTERNAL
**P2 verdict:** ADMIN_COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `AiSelfModificationPage.tsx` | `/admin/ai-self-modification/ai-self-modification` | `page-ai-self-modification` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | Gap Translation Engine-specific patterns TBD | `AiSelfModificationPage.tsx` | `page-aiselfmodification` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 1 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
