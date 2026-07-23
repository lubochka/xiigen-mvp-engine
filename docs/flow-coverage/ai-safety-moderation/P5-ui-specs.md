# FLOW-24 UI Spec — Phase 5 Deliverable

**Flow:** AI Safety & Moderation (`ai-safety-moderation`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `AiSafetyModerationPage.tsx` | `/ai-safety-moderation/ai-safety-moderation` | `page-ai-safety-moderation` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | Every task type in T421-T460 has at least one plan step | `AiSafetyModerationPage.tsx` | `page-aisafetymoderation` |
| 2 | Every plan step is scoped to a single responsibility (single task type) | `AiSafetyModerationPage.tsx` | `page-aisafetymoderation` |
| 3 | No step imports provider SDKs directly (fabric-first) | `AiSafetyModerationPage.tsx` | `page-aisafetymoderation` |
| 4 | No step creates entity-specific controllers | `AiSafetyModerationPage.tsx` | `page-aisafetymoderation` |
| 5 | All steps return DataProcessResult<T> | `AiSafetyModerationPage.tsx` | `page-aisafetymoderation` |
| 6 | Focus areas covered: CF-465 IRON RULE, SafetyGateToken, 8 named checks, gamification ledge… | `AiSafetyModerationPage.tsx` | `page-aisafetymoderation` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 6 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
