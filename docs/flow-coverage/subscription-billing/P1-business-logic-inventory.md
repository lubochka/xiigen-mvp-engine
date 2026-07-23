# FLOW-12 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Subscription Billing (`subscription-billing`)
**Classification:** TENANT_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/subscription-billing.topology.json`

**Topology shape:** 4 nodes, 7 edges. Minimum inventory items: 11.

## Business States & Transitions

1. SubscriptionPlanOrchestrator — billing step entered via `POST /subscriptions/plans (OCC + integer-cents guard + SETNX idempotency)`
2. SubscriptionLifecycleManager — orchestration step entered via `PlanCreated event (payment validation, plan status check, SETNX, write, emit)`
3. RecurringBillingEngine — billing step entered via `Scheduled: status → lock → invoice → charge (per SLA window)`
4. SubscriptionAnalyticsAggregator — data_pipeline step entered via `Additive-subtractive MRR (no double counting on churn/upgrade)`
5. SubscriptionRequested → SubscriptionPlanOrchestrator when `` (emits `xiigen.subscription-billing.plan-requested.v1`)
6. SubscriptionPlanOrchestrator → SubscriptionLifecycleManager when `` (emits `xiigen.subscription-billing.plan-created.v1`)
7. SubscriptionLifecycleManager → RecurringBillingEngine when `activation succeeded` (emits `xiigen.subscription-billing.activated.v1`)
8. SubscriptionLifecycleManager → SubscriptionRejected when `payment/plan check failed — terminal` (emits `xiigen.subscription-billing.activation-rejected.v1`) [TERMINAL]
9. RecurringBillingEngine → SubscriptionAnalyticsAggregator when `successful charge` (emits `xiigen.subscription-billing.invoice-charged.v1`)
10. RecurringBillingEngine → SubscriptionChurned when `charge failed past retry budget — terminal` (emits `xiigen.subscription-billing.charge-failed.v1`) [TERMINAL]
11. SubscriptionAnalyticsAggregator → MrrRecorded when `terminal (per cycle)` (emits `xiigen.subscription-billing.mrr-recorded.v1`) [TERMINAL]

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 7+4=11):** PASS — 11 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
