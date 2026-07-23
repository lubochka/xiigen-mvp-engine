# FLOW-37 UI Spec — Phase 5 Deliverable

**Flow:** Design System Governance (`design-system-governance`)
**Classification:** ENGINE_INTERNAL
**P2 verdict:** ADMIN_COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `DesignSystemGovernancePage.tsx` | `/admin/design-system-governance/design-system-governance` | `page-design-system-governance` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | DESIGN-SYSTEM-CLASSIFICATION-001: Stack coupling audit + compatibility reporting | `DesignSystemGovernancePage.tsx` | `page-designsystemgovernance` |
| 2 | HYBRID-GENESIS-PROMPT-001: Stack-aware genesis prompt builder with incompatibility exclusi… | `DesignSystemGovernancePage.tsx` | `page-designsystemgovernance` |
| 3 | DESIGN-DEBT-ANALYSIS-001: Design complexity scoring with token consistency checks | `DesignSystemGovernancePage.tsx` | `page-designsystemgovernance` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 3 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
