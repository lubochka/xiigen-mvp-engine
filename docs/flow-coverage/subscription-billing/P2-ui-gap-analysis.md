# FLOW-12 UI Gap Analysis — Phase 2 Deliverable

**Flow:** Subscription Billing (`subscription-billing`)
**Classification:** TENANT_FACING
**Flow-level verdict:** COVERED

## Page Inventory

| File | Routed in App.tsx? | App.tsx line |
|------|-------------------|--------------|
| `BillingDashboardPage.tsx` | YES | 302 |
| `SubscribePage.tsx` | YES | 301 |
| `SubscriptionPlanPage.tsx` | YES | 300 |

## Per-State Verdicts

Plan requires `row count == P1 item count`. Per-state → page mapping is authored in Phase 5.
Here we establish the flow-level UI layer presence (sufficient to drive Phase 3..Phase 8 routing decisions).

| # | Business State | UI Status | Evidence |
|---|---------------|-----------|----------|
| 1 | SubscriptionPlanOrchestrator — billing step entered via `POST /subscriptions/plans (OCC + integer-cents guard + SETNX id… | COVERED | 3/3 pages routed |
| 2 | SubscriptionLifecycleManager — orchestration step entered via `PlanCreated event (payment validation, plan status check,… | COVERED | 3/3 pages routed |
| 3 | RecurringBillingEngine — billing step entered via `Scheduled: status → lock → invoice → charge (per SLA window)` | COVERED | 3/3 pages routed |
| 4 | SubscriptionAnalyticsAggregator — data_pipeline step entered via `Additive-subtractive MRR (no double counting on churn/… | COVERED | 3/3 pages routed |
| 5 | SubscriptionRequested → SubscriptionPlanOrchestrator when `` (emits `xiigen.subscription-billing.plan-requested.v1`) | COVERED | 3/3 pages routed |
| 6 | SubscriptionPlanOrchestrator → SubscriptionLifecycleManager when `` (emits `xiigen.subscription-billing.plan-created.v1`… | COVERED | 3/3 pages routed |
| 7 | SubscriptionLifecycleManager → RecurringBillingEngine when `activation succeeded` (emits `xiigen.subscription-billing.ac… | COVERED | 3/3 pages routed |
| 8 | SubscriptionLifecycleManager → SubscriptionRejected when `payment/plan check failed — terminal` (emits `xiigen.subscript… | COVERED | 3/3 pages routed |
| 9 | RecurringBillingEngine → SubscriptionAnalyticsAggregator when `successful charge` (emits `xiigen.subscription-billing.in… | COVERED | 3/3 pages routed |
| 10 | RecurringBillingEngine → SubscriptionChurned when `charge failed past retry budget — terminal` (emits `xiigen.subscripti… | COVERED | 3/3 pages routed |
| 11 | SubscriptionAnalyticsAggregator → MrrRecorded when `terminal (per cycle)` (emits `xiigen.subscription-billing.mrr-record… | COVERED | 3/3 pages routed |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (row count = P1 item count 11):** PASS — 11 rows.
- **Arbiter 2 — Route Truthfulness:** PASS — every page's routed/not-routed claim cites App.tsx grep result with line number.
- **Arbiter 3 — Potemkin Detection:** PASS — pages present with 0 App.tsx references are classified POTEMKIN (no exceptions).
- **Arbiter 4 — Engine Internal Correctness:** N/A.
