# FLOW-20 UI Spec — Phase 5 Deliverable

**Flow:** Ads Platform (`ads-platform`)
**Classification:** ADMIN_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `AuctionDashboardPage.tsx` | `/admin/ads-platform/auction-dashboard` | (none declared) |
| `ConsentGatePage.tsx` | `/admin/ads-platform/consent-gate` | (none declared) |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | Every task type in T287-T306 has at least one plan step | `AuctionDashboardPage.tsx` | `page-auctiondashboard` |
| 2 | Every plan step is scoped to a single responsibility (single task type) | `AuctionDashboardPage.tsx` | `page-auctiondashboard` |
| 3 | No step imports provider SDKs directly (fabric-first) | `AuctionDashboardPage.tsx` | `page-auctiondashboard` |
| 4 | No step creates entity-specific controllers | `AuctionDashboardPage.tsx` | `page-auctiondashboard` |
| 5 | All steps return DataProcessResult<T> | `AuctionDashboardPage.tsx` | `page-auctiondashboard` |
| 6 | Focus areas covered: REQUEST_RESPONSE, spend ledger, dual-gate arbiter | `ConsentGatePage.tsx` | `page-consentgate` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 6 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
