# FLOW-12 Snapshot Gap Analysis — Phase 4 Deliverable

**Flow:** Subscription Billing (`subscription-billing`)
**Classification:** TENANT_FACING
**Authoritative spec:** `client\e2e\subscription-billing.spec.ts`
**Snapshot dir:** (not parseable from spec)
**P3 input rows (TESTED+PARTIAL):** 11

| # | Business State | P3 | Verdict | PNG Evidence |
|---|---------------|-----|---------|--------------|
| 1 | SubscriptionPlanOrchestrator — billing step entered via `POST /subscriptions/plans (OCC + integer-ce… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 2 | SubscriptionLifecycleManager — orchestration step entered via `PlanCreated event (payment validation… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 3 | RecurringBillingEngine — billing step entered via `Scheduled: status → lock → invoice → charge (per … | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 4 | SubscriptionAnalyticsAggregator — data_pipeline step entered via `Additive-subtractive MRR (no doubl… | PARTIAL | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 5 | SubscriptionRequested → SubscriptionPlanOrchestrator when `` (emits `xiigen.subscription-billing.pla… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 6 | SubscriptionPlanOrchestrator → SubscriptionLifecycleManager when `` (emits `xiigen.subscription-bill… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 7 | SubscriptionLifecycleManager → RecurringBillingEngine when `activation succeeded` (emits `xiigen.sub… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 8 | SubscriptionLifecycleManager → SubscriptionRejected when `payment/plan check failed — terminal` (emi… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 9 | RecurringBillingEngine → SubscriptionAnalyticsAggregator when `successful charge` (emits `xiigen.sub… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 10 | RecurringBillingEngine → SubscriptionChurned when `charge failed past retry budget — terminal` (emit… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |
| 11 | SubscriptionAnalyticsAggregator → MrrRecorded when `terminal (per cycle)` (emits `xiigen.subscriptio… | TESTED | NO_SCREENSHOT | spec has no page.screenshot() calls |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 11 (= P3 TESTED+PARTIAL count). PASS
- **Arbiter 2 — PNG Truthfulness:** PASS — PNG_EXISTS requires file ≥1024B on disk under `docs/e2e-snapshots/?/`.
- **Arbiter 3 — Screenshot-call Presence:** PASS — SCREENSHOT_CALL_EXISTS means `page.screenshot()` is present in the test block but PNG missing / < 1KB on disk.
- **Arbiter 4 — Distinction Clarity:** PASS — NO_SCREENSHOT means the test block has no `page.screenshot()` call (separate from SCREENSHOT_CALL_EXISTS).
