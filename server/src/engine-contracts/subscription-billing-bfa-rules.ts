/**
 * FLOW-12: Subscription & Recurring Billing
 * BFA rules: CF-12-1 through CF-12-4
 *
 * CF-12-1: T211 RecurringBillingEngine — status check ORDER 1, lock ORDER 2.
 *          DPO conflict: T211 lock-before-charge INVERTS FLOW-09-T107 seat-before-payment.
 *          Both are domain-correct. conflictsWith: FLOW-09-T107-seat-before-payment.
 *
 * CF-12-2: T209 SubscriptionPlanOrchestrator — priceCents Number.isInteger() at ORDER 1,
 *          storeDocumentWithOCC (not plain storeDocument).
 *
 * CF-12-3: T211 dunning from FREEDOM config; T212 normalizeMrr MACHINE formula;
 *          T212 additive-subtractive: BOTH SubscriptionActivated AND SubscriptionCancelled.
 *
 * CF-12-4: scope_isolation arbiter in all arbiterConfig blocks; paymentMethodToken NEVER stored.
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const SUBSCRIPTION_BILLING_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-12-1',
    flowId: 'FLOW-12',
    description:
      'T211 RecurringBillingEngine: status check (IBillingScheduleService.getStatus) ' +
      'runs at ORDER 1 before lock acquisition. CANCELLED/PAUSED status → InvoiceVoided, no lock. ' +
      'Lock runs at ORDER 2 before invoice and charge. Lock=false → skip (concurrent run). ' +
      'Charge at ORDER 4. Status-before-lock is mandatory — inverting produces ' +
      'double-billing on partition failover. SF-CHECK-1. ' +
      'DPO conflict: T211 lock-before-charge INVERTS FLOW-09 T107 seat-before-payment — ' +
      'both are domain-correct. conflictsWith: FLOW-09-T107-seat-before-payment.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-12-2',
    flowId: 'FLOW-12',
    description:
      'T209 SubscriptionPlanOrchestrator: priceCents must be Number.isInteger() ' +
      'at ORDER 1 before SETNX. Float prices (9.99) produce IEEE 754 rounding drift in ' +
      'proration over time. T209 uses storeDocumentWithOCC(plan, versionPin) — not ' +
      'plain storeDocument(). SF-CHECK-2.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-12-3',
    flowId: 'FLOW-12',
    description:
      'T211 dunning retry schedule from FREEDOM config key ' +
      '"subscription_billing_dunning_schedule" — never a hardcoded const. ' +
      'T212 MRR normalization formula is MACHINE: ' +
      'ANNUAL=Math.floor(priceCents/12), CUSTOM=Math.floor(priceCents/intervalDays*30). ' +
      'T212 subscribes to BOTH SubscriptionActivated (add) AND SubscriptionCancelled (subtract). ' +
      'Additive-only MRR aggregation score-0. SF-CHECK-3, SF-CHECK-5.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-929..CF-934) — edge-case coverage from docs/flow-coverage/subscription-billing/P10-server-specs.md
  {
    ruleId: 'CF-929',
    flowId: 'FLOW-12',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/subscription-billing — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-930',
    flowId: 'FLOW-12',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-931',
    flowId: 'FLOW-12',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-932',
    flowId: 'FLOW-12',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-933',
    flowId: 'FLOW-12',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-10 Optimistic concurrency on invoice-billing path — winner 201, loser 409. Second concurrency surface beyond EC-5 (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-934',
    flowId: 'FLOW-12',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-11 Secondary idempotency surface (invoice-charge retry) — replay returns cached 200 with same invoice id; no double-charge (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-12-4',
    flowId: 'FLOW-12',
    description:
      'scope_isolation arbiter present in all arbiterConfig blocks (FC-32). ' +
      'Subscription plans, subscriptions, invoices, and metrics are PRIVATE per tenant. ' +
      'xiigen-freedom-config reads (dunning schedule, metrics window) are intentionally GLOBAL. ' +
      'IPaymentFabricService is REUSED from FLOW-09 — not re-registered. ' +
      'paymentMethodToken must never be stored in any ES index.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
