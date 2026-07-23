/**
 * FLOW-12 Engine Contracts — Subscription & Recurring Billing
 *
 * T209  SubscriptionPlanOrchestrator   archetype: BILLING (OCC + integer-cents guard)
 * T210  SubscriptionLifecycleManager   archetype: ORCHESTRATION
 * T211  RecurringBillingEngine         archetype: BILLING (SCHEDULED, status→lock→invoice→charge)
 * T212  SubscriptionAnalyticsAggregator archetype: DATA_PIPELINE (additive-subtractive MRR)
 *
 * DNA-1: All business data uses Record<string, unknown> — no typed interfaces.
 * DNA-3: All methods return DataProcessResult<T> — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on every transition.
 *
 * CF-12-1: T211 status check ORDER 1, lock ORDER 2 — DPO conflict with FLOW-09-T107
 * CF-12-2: T209 priceCents Number.isInteger() at ORDER 1, storeDocumentWithOCC not plain storeDocument
 * CF-12-3: T211 dunning from FREEDOM config; T212 normalizeMrr MACHINE formula + additive-subtractive
 * CF-12-4: scope_isolation arbiter in all arbiterConfig blocks; paymentMethodToken NEVER stored
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

export const SUBSCRIPTION_BILLING_TASK_TYPES = ['T209', 'T210', 'T211', 'T212'] as const;

// ── T209: SubscriptionPlanOrchestrator ───────────────────────────────────────

export function createSubscriptionPlanOrchestratorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T209',
    flowId: 'FLOW-12',
    flowName: 'Subscription & Recurring Billing',
    name: 'SubscriptionPlanOrchestrator',
    archetype: ContractArchetype.BILLING,
    entry: 'Triggered by PlanPublishRequested event (admin action)',
    purpose:
      'Publishes or updates a subscription plan with OCC write protection. ' +
      'Validates integer-cents price at ORDER 1 before any write. ' +
      'Uses storeDocumentWithOCC (not plain storeDocument) to detect concurrent plan edits. ' +
      'Writes audit record BEFORE enqueue(SubscriptionPlanPublished).',
    distinctFrom:
      'T210 SubscriptionLifecycleManager (T209 manages plan catalog; T210 manages subscriber state)',

    ironRules: [
      'IR-1: Number.isInteger(priceCents) && priceCents > 0 — checked at ORDER 1 before SETNX or any write. ' +
        'Float prices (9.99) rejected immediately. CF-12-2.',
      'IR-2: SETNX at ORDER 2 — prevents duplicate plan+version from concurrent publish requests.',
      'IR-3: storeDocumentWithOCC(plan, versionPin) at ORDER 6 — NEVER plain storeDocument(). ' +
        'OCC_CONFLICT → emit SubscriptionPlanPublicationFailed, return failure. CF-12-2.',
      'IR-4: storeDocument(audit) at ORDER 5 — BEFORE enqueue(SubscriptionPlanPublished). DNA-8.',
      'IR-5: billingInterval must be MONTHLY | ANNUAL | CUSTOM — other values rejected at ORDER 4.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'IntegerCentsGuard',
          description: 'Reject float priceCents — MACHINE rule',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'SetnxIdempotency',
          description: 'SETNX on hash(tenantId+planId+version)',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'OccRead',
          description: 'getDocumentWithVersion for versionPin',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'IntervalValidation',
          description: 'billingInterval MONTHLY|ANNUAL|CUSTOM check',
          ironRuleRef: 'IR-5',
        },
        {
          order: 5,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before enqueue',
          ironRuleRef: 'IR-4',
        },
        {
          order: 6,
          name: 'OccWrite',
          description: 'storeDocumentWithOCC(plan, versionPin)',
          ironRuleRef: 'IR-3',
        },
        {
          order: 7,
          name: 'Enqueue',
          description: 'enqueue(SubscriptionPlanPublished)',
          ironRuleRef: 'IR-4',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F_DATABASE',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Plan persistence (OCC) + audit trail + idempotency keys',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'SubscriptionPlanPublished / SubscriptionPlanPublicationFailed CloudEvent emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-12-01',
        description: 'Number.isInteger(priceCents) at ORDER 1 (IR-1)',
        severity: 'error',
        checkType: 'financial_op_idempotency',
      },
      {
        gateId: 'QG-12-02',
        description: 'storeDocumentWithOCC not plain storeDocument (IR-3)',
        severity: 'error',
        checkType: 'setnx_before_operation',
      },
      {
        gateId: 'QG-12-03',
        description: 'storeDocument(audit) before enqueue (IR-4, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    bfaRegistration: {
      entities: ['subscription_plan', 'plan_audit'],
      events: ['subscription.plan.published', 'subscription.plan.publication.failed'],
      apiRoutes: [],
    },

    machineComponents: [
      'Integer-cents guard at ORDER 1 — float prices rejected (CF-12-2)',
      'SETNX on hash(tenantId+planId+version) at ORDER 2',
      'storeDocumentWithOCC(plan, versionPin) — OCC concurrency control (CF-12-2)',
      'Outbox: audit storeDocument before SubscriptionPlanPublished enqueue (DNA-8)',
    ],

    freedomComponents: [
      'subscription_billing_plan_audit_retention — how long to keep plan audit records',
    ],
  });
}

// ── T210: SubscriptionLifecycleManager ──────────────────────────────────────

export function createSubscriptionLifecycleManagerContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T210',
    flowId: 'FLOW-12',
    flowName: 'Subscription & Recurring Billing',
    name: 'SubscriptionLifecycleManager',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered by SubscribeRequested CloudEvent',
    purpose:
      'Creates a new subscription for a subscriber. Validates plan is ACTIVE, ' +
      'validates payment method via IPaymentFabricService (REUSED from FLOW-09 — not re-registered), ' +
      'SETNX on hash(tenantId+subscriberId+planId) to prevent duplicate subscriptions. ' +
      'Sets initial state TRIALING (trialDays>0) or ACTIVE (trialDays===0). ' +
      'Stores paymentMethodId (vault ref) — NEVER paymentMethodToken (raw client token). ' +
      'storeDocument(subscription) BEFORE enqueue(SubscriptionActivated).',
    distinctFrom:
      'T209 SubscriptionPlanOrchestrator (T210 manages subscriber state; T209 manages plan catalog) ' +
      'T211 RecurringBillingEngine (T210 handles initial activation; T211 handles ongoing billing cycles)',

    ironRules: [
      'IR-1: IPaymentFabricService.validate() at ORDER 1 — invalid payment → failure(PAYMENT_INVALID), no state write.',
      'IR-2: Plan status must be ACTIVE at ORDER 2 — non-ACTIVE plan → failure(PLAN_NOT_ACTIVE).',
      'IR-3: SETNX at ORDER 3 — key=hash(tenantId+subscriberId+planId). Duplicate → failure(ALREADY_SUBSCRIBED).',
      'IR-4: storeDocument(subscription) at ORDER 4 BEFORE enqueue(SubscriptionActivated). DNA-8.',
      'IR-5: paymentMethodId (vault ref) stored — paymentMethodToken (raw) NEVER stored anywhere.',
      'IR-6: IPaymentFabricService is REUSED from FLOW-09 — not a new provider registration.',
      'IR-7: trialDays > 0 → status=TRIALING, trialEndsAt set. trialDays === 0 → status=ACTIVE.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'PaymentValidation',
          description: 'IPaymentFabricService.validate() — invalid → failure',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'PlanStatusCheck',
          description: 'Verify plan status === ACTIVE',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'SetnxIdempotency',
          description: 'SETNX on hash(tenantId+subscriberId+planId)',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'SubscriptionWrite',
          description: 'storeDocument(subscription) — DNA-8',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'ActivationEmit',
          description: 'enqueue(SubscriptionActivated)',
          ironRuleRef: 'IR-4',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F_DATABASE',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Subscription record persistence + idempotency keys + plan lookup',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'SubscriptionActivated CloudEvent emission',
      },
      {
        factoryId: 'F09-PAYMENT',
        interfaceName: 'IPaymentFabricService',
        fabricType: FabricType.DATABASE,
        description: 'REUSED from FLOW-09 — payment method validation (not re-registered)',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-12-04',
        description: 'IPaymentFabricService.validate() at ORDER 1 (IR-1)',
        severity: 'error',
        checkType: 'financial_op_idempotency',
      },
      {
        gateId: 'QG-12-05',
        description: 'SETNX at ORDER 3 — duplicate prevention (IR-3)',
        severity: 'error',
        checkType: 'setnx_before_operation',
      },
      {
        gateId: 'QG-12-06',
        description:
          'storeDocument(subscription) before enqueue(SubscriptionActivated) (IR-4, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
      {
        gateId: 'QG-12-07',
        description: 'paymentMethodToken never stored — only vault ref paymentMethodId (IR-5)',
        severity: 'error',
        checkType: 'pci_scope_isolation',
      },
      {
        gateId: 'QG-12-07b',
        description: 'State machine guard CF-791 — VALID_TRANSITIONS checked from FREEDOM config',
        severity: 'error',
        checkType: 'freedom_config_threshold_scan',
      },
    ],

    bfaRegistration: {
      entities: ['subscription', 'subscriber'],
      events: ['subscription.activated', 'subscription.activation.failed'],
      apiRoutes: [],
    },

    machineComponents: [
      'VALID_STATES: NONE → TRIALING (trialDays>0), NONE → ACTIVE (trialDays===0)',
      'SETNX key = hash(tenantId+subscriberId+planId) at ORDER 3',
      'Outbox: subscription storeDocument before SubscriptionActivated enqueue (DNA-8)',
      'paymentMethodId vault ref only — paymentMethodToken never stored (CF-12-4)',
    ],

    freedomComponents: [
      'subscription_billing_default_trial_days — default trial days if plan does not specify',
    ],
  });
}

// ── T211: RecurringBillingEngine ─────────────────────────────────────────────

export function createRecurringBillingEngineContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T211',
    flowId: 'FLOW-12',
    flowName: 'Subscription & Recurring Billing',
    name: 'RecurringBillingEngine',
    archetype: ContractArchetype.BILLING,
    entry:
      'Triggered by BillingCycleDue delayed queue job (SCHEDULED archetype — not @EventPattern)',
    purpose:
      'Processes a recurring billing cycle for a single subscription. ' +
      'Execution order is MACHINE: status(1)→lock(2)→invoice(3)→charge(4)→audit(5)→emit(6). ' +
      'Status check at ORDER 1 prevents charging cancelled/paused subscriptions. ' +
      'Lock at ORDER 2 prevents concurrent double-billing on partition failover. ' +
      'Dunning retry schedule from FREEDOM config key subscription_billing_dunning_schedule. ' +
      'DPO conflict: T211 lock-before-charge INVERTS FLOW-09 T107 seat-before-payment — both are domain-correct.',
    distinctFrom:
      'T210 SubscriptionLifecycleManager (T211 handles ongoing billing; T210 handles initial activation)',

    ironRules: [
      'IR-1: getStatus() at ORDER 1 — CANCELLED/PAUSED → emit InvoiceVoided, return. No lock acquired. CF-12-1.',
      'IR-2: Lock acquisition at ORDER 2 — lock=false (concurrent run) → return without charge. CF-12-1.',
      'IR-3: Invoice generation at ORDER 3 — only after status=ACTIVE and lock=true.',
      'IR-4: Charge at ORDER 4 — after invoice ID established as idempotency key.',
      'IR-5: storeDocument(billingAudit) at ORDER 5 BEFORE any enqueue (audit or InvoicePaid/Failed). DNA-8.',
      'IR-6: dunningSchedule from FREEDOM config key "subscription_billing_dunning_schedule" — NEVER hardcoded. CF-12-3.',
      'IR-7: maxAttempts = dunningSchedule.length — never a hardcoded constant. CF-12-3.',
      'DPO: T211 lock-before-charge INVERTS FLOW-09-T107 seat-before-payment. conflictsWith: FLOW-09-T107-seat-before-payment.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'StatusCheck',
          description: 'getStatus() — CANCELLED/PAUSED → InvoiceVoided, no lock',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'LockAcquire',
          description: 'Distributed lock — false → skip (concurrent run)',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'InvoiceGen',
          description: 'Generate invoiceId = hash(tenantId+subscriptionId+periodKey)',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'Charge',
          description: 'IPaymentFabricService.charge({ amount, invoiceId, attemptNumber })',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'AuditWrite',
          description: 'storeDocument(billingAudit) — DNA-8',
          ironRuleRef: 'IR-5',
        },
        {
          order: 6,
          name: 'ResultEmit',
          description: 'emit InvoicePaid | InvoicePaymentFailed | DunningFailed',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F_DATABASE',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Subscription status read + billing audit write + lock state',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'InvoicePaid / InvoicePaymentFailed / InvoiceVoided / DunningFailed CloudEvent emission',
      },
      {
        factoryId: 'F09-PAYMENT',
        interfaceName: 'IPaymentFabricService',
        fabricType: FabricType.DATABASE,
        description: 'REUSED from FLOW-09 — charge execution',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-12-08',
        description:
          'getStatus() at ORDER 1 — CANCELLED/PAUSED → InvoiceVoided, no lock (IR-1, CF-12-1)',
        severity: 'error',
        checkType: 'financial_op_idempotency',
      },
      {
        gateId: 'QG-12-09',
        description: 'Lock at ORDER 2 — before invoice and charge (IR-2, CF-12-1)',
        severity: 'error',
        checkType: 'setnx_before_operation',
      },
      {
        gateId: 'QG-12-10',
        description: 'storeDocument(audit) before enqueue (IR-5, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
      {
        gateId: 'QG-12-11',
        description: 'dunning schedule from FREEDOM config — never hardcoded (IR-6, CF-12-3)',
        severity: 'error',
        checkType: 'freedom_config_threshold_scan',
      },
    ],

    bfaRegistration: {
      entities: ['invoice', 'billing_cycle', 'billing_audit'],
      events: ['invoice.paid', 'invoice.payment.failed', 'invoice.voided', 'dunning.failed'],
      apiRoutes: [],
    },

    machineComponents: [
      'Execution order: status(1)→lock(2)→invoice(3)→charge(4)→audit(5)→emit(6) — MACHINE ordering',
      'invoiceId = hash(tenantId+subscriptionId+periodKey) — idempotency key for charge',
      'Outbox: billingAudit storeDocument before any emit (DNA-8)',
      'DPO conflict: conflictsWith FLOW-09-T107-seat-before-payment (domain-correct inversion)',
    ],

    freedomComponents: [
      'subscription_billing_dunning_schedule — [{attempt, wait_hours}] tuples (CF-12-3)',
    ],
  });
}

// ── T212: SubscriptionAnalyticsAggregator ────────────────────────────────────

export function createSubscriptionAnalyticsAggregatorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T212',
    flowId: 'FLOW-12',
    flowName: 'Subscription & Recurring Billing',
    name: 'SubscriptionAnalyticsAggregator',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry:
      'Triggered by SubscriptionActivated (add) OR SubscriptionCancelled (subtract) CloudEvents',
    purpose:
      'Maintains MRR metric per tenant using additive-subtractive aggregation. ' +
      'Handles BOTH SubscriptionActivated (add) and SubscriptionCancelled (subtract). ' +
      'Normalizes all billing intervals to monthly equivalent before summing: ' +
      'MONTHLY=price, ANNUAL=Math.floor(price/12), CUSTOM=Math.floor(price/intervalDays*30). ' +
      'This normalization formula is MACHINE — not configurable. ' +
      'SubscriptionMetricsUpdated output contains NO subscriberId field (tenant-level aggregates only).',
    distinctFrom:
      'T211 RecurringBillingEngine (T212 aggregates revenue metrics; T211 processes billing cycles)',

    ironRules: [
      'IR-1: Both SubscriptionActivated AND SubscriptionCancelled handlers required — additive-only = score-0. CF-12-3.',
      'IR-2: normalizeMrr() is MACHINE — ANNUAL=Math.floor(priceCents/12), CUSTOM=Math.floor(priceCents/intervalDays*30). CF-12-3.',
      'IR-3: SubscriptionMetricsUpdated has NO subscriberId field — tenant-level aggregates only.',
      'IR-4: IProrationService (F211) is SHARED — not re-registered in this service.',
      'IR-5: storeDocument(mrrMetric) BEFORE enqueue(SubscriptionMetricsUpdated). DNA-8.',
    ],

    aggregation: {
      addEvents: ['SubscriptionActivated'],
      removeEvents: ['SubscriptionCancelled'],
      recalculateOnRemove: true,
      filterCondition: 'billingInterval in [MONTHLY, ANNUAL, CUSTOM]',
      scoreRange: [0, Infinity],
    },

    factoryDependencies: [
      {
        factoryId: 'F_DATABASE',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'MRR metric persistence + subscription read',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'SubscriptionMetricsUpdated CloudEvent emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-12-12',
        description:
          'SubscriptionCancelled handler present — additive-only = score-0 (IR-1, CF-12-3)',
        severity: 'error',
        checkType: 'retracted_review_excluded_from_aggregate',
      },
      {
        gateId: 'QG-12-13',
        description: 'normalizeMrr() MACHINE formula applied (IR-2, CF-12-3)',
        severity: 'error',
        checkType: 'financial_op_idempotency',
      },
      {
        gateId: 'QG-12-14',
        description: 'SubscriptionMetricsUpdated has no subscriberId (IR-3)',
        severity: 'error',
        checkType: 'pci_scope_isolation',
      },
      {
        gateId: 'QG-12-15',
        description: 'storeDocument(mrrMetric) before enqueue (IR-5, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    bfaRegistration: {
      entities: ['mrr_metric', 'subscription_analytics'],
      events: ['subscription.metrics.updated'],
      apiRoutes: [],
    },

    machineComponents: [
      'normalizeMrr(priceCents, billingInterval, intervalDays): MONTHLY=price, ANNUAL=Math.floor(price/12), CUSTOM=Math.floor(price/intervalDays*30)',
      'Additive-subtractive dual-handler: SubscriptionActivated (add) + SubscriptionCancelled (subtract)',
      'Outbox: mrrMetric storeDocument before SubscriptionMetricsUpdated enqueue (DNA-8)',
    ],

    freedomComponents: [
      'subscription_billing_metrics_window_days — rolling window for metric aggregation',
    ],
  });
}

// ── Backward-compatible aliases (old T-PLUS-0..3 names) ─────────────────────
// Previously the file used T-PLUS-0..3 placeholder names. Existing tests that
// import these names continue to work via these re-exports.
export const createSubscriptionActivationGatewayContract =
  createSubscriptionPlanOrchestratorContract;
export const createSubscriptionStateManagerContract = createSubscriptionLifecycleManagerContract;
export const createBillingCycleOrchestratorContract = createRecurringBillingEngineContract;
export const createMrrAnalyticsPipelineContract = createSubscriptionAnalyticsAggregatorContract;

/** All FLOW-12 contract factory functions */
export const SUBSCRIPTION_BILLING_CONTRACT_FACTORIES = [
  createSubscriptionPlanOrchestratorContract,
  createSubscriptionLifecycleManagerContract,
  createRecurringBillingEngineContract,
  createSubscriptionAnalyticsAggregatorContract,
];

/** All FLOW-12 contract descriptors for ENGINE_CONTRACTS in engine-bootstrapper */
export const SUBSCRIPTION_BILLING_CONTRACT_DESCRIPTORS: Array<{
  taskTypeId: string;
  name: string;
  flowId: string;
  version: string;
}> = [
  { taskTypeId: 'T209', name: 'SubscriptionPlanOrchestrator', flowId: 'FLOW-12', version: 'v1' },
  { taskTypeId: 'T210', name: 'SubscriptionLifecycleManager', flowId: 'FLOW-12', version: 'v1' },
  { taskTypeId: 'T211', name: 'RecurringBillingEngine', flowId: 'FLOW-12', version: 'v1' },
  { taskTypeId: 'T212', name: 'SubscriptionAnalyticsAggregator', flowId: 'FLOW-12', version: 'v1' },
];
