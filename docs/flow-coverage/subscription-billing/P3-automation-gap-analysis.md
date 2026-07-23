# FLOW-12 UI Automation Gap Analysis — Phase 3 Deliverable

**Flow:** Subscription Billing (`subscription-billing`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED

## Spec Files Found (both directories searched)

| Path | Lines | Size (B) | Role |
|------|------:|---------:|------|
| `client/e2e/subscription-billing.spec.ts` | 153 | 7394 | AUTHORITATIVE |

| # | Business State | P2 Verdict | Automation | Spec File | Test | Line |
|---|---------------|------------|-----------|-----------|------|------|
| 1 | SubscriptionPlanOrchestrator — billing step entered via `POST /subscriptions/plans (OCC + integer-ce… | COVERED | TESTED | `subscription-billing.spec.ts` | R-02: Float priceCents shows integer-cents validation error | 31 |
| 2 | SubscriptionLifecycleManager — orchestration step entered via `PlanCreated event (payment validation… | COVERED | TESTED | `subscription-billing.spec.ts` | R-04: SubscribePage renders with plan selector and payment m… | 71 |
| 3 | RecurringBillingEngine — billing step entered via `Scheduled: status → lock → invoice → charge (per … | COVERED | TESTED | `subscription-billing.spec.ts` | R-08: BillingDashboardPage shows invoice list with all statu… | 130 |
| 4 | SubscriptionAnalyticsAggregator — data_pipeline step entered via `Additive-subtractive MRR (no doubl… | COVERED | PARTIAL | `subscription-billing.spec.ts` | R-07: BillingDashboardPage renders MRR metric card | 116 |
| 5 | SubscriptionRequested → SubscriptionPlanOrchestrator when `` (emits `xiigen.subscription-billing.pla… | COVERED | TESTED | `subscription-billing.spec.ts` | FLOW-12 — Subscription & Recurring Billing | 16 |
| 6 | SubscriptionPlanOrchestrator → SubscriptionLifecycleManager when `` (emits `xiigen.subscription-bill… | COVERED | TESTED | `subscription-billing.spec.ts` | FLOW-12 — Subscription & Recurring Billing | 16 |
| 7 | SubscriptionLifecycleManager → RecurringBillingEngine when `activation succeeded` (emits `xiigen.sub… | COVERED | TESTED | `subscription-billing.spec.ts` | FLOW-12 — Subscription & Recurring Billing | 16 |
| 8 | SubscriptionLifecycleManager → SubscriptionRejected when `payment/plan check failed — terminal` (emi… | COVERED | TESTED | `subscription-billing.spec.ts` | FLOW-12 — Subscription & Recurring Billing | 16 |
| 9 | RecurringBillingEngine → SubscriptionAnalyticsAggregator when `successful charge` (emits `xiigen.sub… | COVERED | TESTED | `subscription-billing.spec.ts` | FLOW-12 — Subscription & Recurring Billing | 16 |
| 10 | RecurringBillingEngine → SubscriptionChurned when `charge failed past retry budget — terminal` (emit… | COVERED | TESTED | `subscription-billing.spec.ts` | FLOW-12 — Subscription & Recurring Billing | 16 |
| 11 | SubscriptionAnalyticsAggregator → MrrRecorded when `terminal (per cycle)` (emits `xiigen.subscriptio… | COVERED | TESTED | `subscription-billing.spec.ts` | FLOW-12 — Subscription & Recurring Billing | 16 |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 11 (= P1 item count). PASS
- **Arbiter 2 — Both Directories Searched:** PASS — both `client/e2e/` AND `e2e/tests/` traversed; results listed in Spec Files section above.
- **Arbiter 3 — Test String Truthfulness:** PASS — TESTED/PARTIAL verdicts cite exact test/describe string with line number from the authoritative spec file.
- **Arbiter 4 — Duplicate Flagging:** N/A — 0 duplicate(s) flagged for Phase 12 consolidation.
