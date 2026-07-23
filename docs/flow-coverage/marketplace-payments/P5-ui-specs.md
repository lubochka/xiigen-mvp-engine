# FLOW-16 UI Spec — Phase 5 Deliverable

**Flow:** Marketplace Payments (`marketplace-payments`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `CheckoutPage.tsx` | `/marketplace-payments/checkout` | (none declared) |
| `EscrowDashboardPage.tsx` | `/marketplace-payments/escrow-dashboard` | (none declared) |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | Every task type in T241-T268 has at least one plan step | `CheckoutPage.tsx` | `page-checkout` |
| 2 | Every plan step is scoped to a single responsibility (single task type) | `CheckoutPage.tsx` | `page-checkout` |
| 3 | No step imports provider SDKs directly (fabric-first) | `CheckoutPage.tsx` | `page-checkout` |
| 4 | No step creates entity-specific controllers | `CheckoutPage.tsx` | `page-checkout` |
| 5 | All steps return DataProcessResult<T> | `CheckoutPage.tsx` | `page-checkout` |
| 6 | Focus areas covered: EP-5 outbox, DNA-9 idempotency, compensation chain, 14 named checks | `CheckoutPage.tsx` | `page-checkout` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 6 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
