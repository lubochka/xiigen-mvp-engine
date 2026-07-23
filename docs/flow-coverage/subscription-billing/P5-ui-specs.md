# FLOW-12 UI Spec — Phase 5 Deliverable

**Flow:** Subscription Billing (`subscription-billing`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `BillingDashboardPage.tsx` | `/subscription-billing/billing-dashboard` | `billing-dashboard-page`, `invoice-empty`, `invoice-list`, `mrr-metric-card`, `mrr-value` |
| `SubscribePage.tsx` | `/subscription-billing/subscribe` | `payment-method-input`, `plan-select`, `subscribe-button`, `subscribe-error`, `subscribe-form`, `subscribe-page` +4 |
| `SubscriptionPlanPage.tsx` | `/subscription-billing/subscription-plan` | `billing-interval-select`, `form-error`, `occ-conflict-error`, `plan-id-input`, `plan-name-input`, `plan-publish-form` +7 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | SubscriptionPlanOrchestrator — billing step entered via `POST /subscriptions/plans (OCC + … | `BillingDashboardPage.tsx` | `page-billingdashboard` |
| 2 | SubscriptionLifecycleManager — orchestration step entered via `PlanCreated event (payment … | `SubscriptionPlanPage.tsx` | `page-subscriptionplan` |
| 3 | RecurringBillingEngine — billing step entered via `Scheduled: status → lock → invoice → ch… | `BillingDashboardPage.tsx` | `page-billingdashboard` |
| 4 | SubscriptionAnalyticsAggregator — data_pipeline step entered via `Additive-subtractive MRR… | `BillingDashboardPage.tsx` | `page-billingdashboard` |
| 5 | SubscriptionRequested → SubscriptionPlanOrchestrator when `` (emits `xiigen.subscription-b… | `SubscriptionPlanPage.tsx` | `page-subscriptionplan` |
| 6 | SubscriptionPlanOrchestrator → SubscriptionLifecycleManager when `` (emits `xiigen.subscri… | `SubscriptionPlanPage.tsx` | `page-subscriptionplan` |
| 7 | SubscriptionLifecycleManager → RecurringBillingEngine when `activation succeeded` (emits `… | `BillingDashboardPage.tsx` | `page-billingdashboard` |
| 8 | SubscriptionLifecycleManager → SubscriptionRejected when `payment/plan check failed — term… | `SubscriptionPlanPage.tsx` | `page-subscriptionplan` |
| 9 | RecurringBillingEngine → SubscriptionAnalyticsAggregator when `successful charge` (emits `… | `BillingDashboardPage.tsx` | `page-billingdashboard` |
| 10 | RecurringBillingEngine → SubscriptionChurned when `charge failed past retry budget — termi… | `BillingDashboardPage.tsx` | `page-billingdashboard` |
| 11 | SubscriptionAnalyticsAggregator → MrrRecorded when `terminal (per cycle)` (emits `xiigen.s… | `BillingDashboardPage.tsx` | `page-billingdashboard` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 11 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
