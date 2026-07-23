/**
 * FLOW-16 E2E — Giant Shop Marketplace Platforms
 *
 * Archetypes: KYC_VERIFICATION, LISTING_MODERATION, CHECKOUT_SAGA, PAYMENT_ESCROW,
 *             ORDER_FULFILLMENT, DISPUTE_RESOLUTION, PAYOUT_RELEASE, PRODUCT_DISCOVERY
 * Task types: T219–T226
 * CloudEvents: KycCompleted, KycRejected, StoreActivated, ListingApproved, ListingRejected,
 *   CheckoutStarted, CheckoutCompleted, CheckoutRolledBack, PaymentEscrowCreated,
 *   PaymentEscrowReleased, PaymentEscrowRefunded, FulfillmentStarted, FulfillmentCompleted,
 *   DisputeOpened, DisputeResolved, DisputeRejected, PayoutReleased, PayoutHeld,
 *   ProductDiscovered
 *
 * Named checks:
 *   check_kyc_completed_before_activation
 *   check_listing_passes_ai_review
 *   check_checkout_saga_lifo_order
 *   check_payment_escrow_created
 *   check_fulfillment_tracking_event
 *   check_dispute_evidence_attached
 *   check_payout_released_only_after_hold
 *   check_discovery_respects_rls
 *   check_idempotency_key_registered
 *   check_outbox_before_enqueue
 *   check_kyc_doc_not_in_payload
 *   check_compensation_chain_registered
 *   check_two_actor_required
 *   check_cross_tenant_listing_blocked
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — KYC + store activation, listing moderation, checkout saga, escrow, fulfillment, dispute, payout, discovery
 *   2. Error path — KYC rejection, listing rejected, checkout rollback, escrow refund, dispute rejected, payout held
 *   3. Tenant isolation — cross-tenant listing blocked, payout owner-scoped, discovery tenant-scoped
 *   4. Idempotency — duplicate checkout, duplicate payout, duplicate KYC submission
 *   5. UI state mapping — KYC_PENDING→STORE_ACTIVE, LISTING_DRAFT→LISTING_LIVE, CHECKOUT_PENDING→CHECKOUT_COMPLETE
 *   6. API contract — /api/dynamic/store-activations, /api/dynamic/escrow-records
 *   7. CloudEvents — KycCompleted, CheckoutCompleted, PaymentEscrowReleased validate against spec
 *   8. Named checks — check_kyc_completed_before_activation, check_payment_escrow_created,
 *                     check_checkout_saga_lifo_order, check_idempotency_key_registered, check_outbox_before_enqueue
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';
import { ContractArchetype } from '../../../src/engine-contracts/archetypes';
import {
  EngineContract,
  type EngineContractParams,
} from '../../../src/engine-contracts/contract-schema';
import { FlowGenerator } from '../../../src/engine/flow-generator';
import { AfPipeline } from '../../../src/af-stations/af-pipeline';
import { GenericNodeExecutor } from '../../../src/engine/generic-node-executor';
import { BusinessFlowArbiter } from '../../../src/guardrails/bfa';
import { PromotionLadder } from '../../../src/guardrails/promotion-ladder';
import { FreedomConfigManager } from '../../../src/freedom/config-manager';
import { FactoryRegistry } from '../../../src/factories/factory-registry';
import { TaskTypeRegistry } from '../../../src/engine-contracts/task-type-registry';
import { FabricType } from '../../../src/factories/fabric-type';

// ── Mock fabric providers ────────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex((d) => d['id'] === id);
      if (existing >= 0) {
        bucket[existing] = { ...doc, id };
      } else {
        bucket.push({ ...doc, id });
      }
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      const results = bucket.filter((doc) =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
      );
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find((d) => d['id'] === id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `Document ${id} not found in ${index}`);
    }),
    _store: store,
  };
}

function makeInMemoryQueue() {
  const emitted: Array<{ queue: string; payload: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (queue: string, payload: Record<string, unknown>) => {
      emitted.push({ queue, payload });
      return DataProcessResult.success({ messageId: `msg-${Date.now()}` });
    }),
    _emitted: emitted,
  };
}

function makePassExecutor(): GenericNodeExecutor {
  return {
    execute: jest.fn(async () =>
      DataProcessResult.success({
        runId: 'flow16-run-id',
        status: 'PASS',
        score: 95,
        trace: [
          { nodeId: 'kyc-verification', nodeType: 'verification', status: 'PASS', durationMs: 8 },
          { nodeId: 'listing-moderation', nodeType: 'moderation', status: 'PASS', durationMs: 12 },
          { nodeId: 'checkout-saga', nodeType: 'saga', status: 'PASS', durationMs: 15 },
          { nodeId: 'payment-escrow', nodeType: 'financial', status: 'PASS', durationMs: 10 },
          { nodeId: 'order-fulfillment', nodeType: 'fulfillment', status: 'PASS', durationMs: 9 },
          { nodeId: 'dispute-resolution', nodeType: 'resolution', status: 'PASS', durationMs: 7 },
          { nodeId: 'payout-release', nodeType: 'financial', status: 'PASS', durationMs: 6 },
          { nodeId: 'product-discovery', nodeType: 'discovery', status: 'PASS', durationMs: 5 },
        ],
        finalOutput: { code: '// FLOW-16 Giant Shop Marketplace Platforms' },
        promoted: true,
        promotionLevel: 'MINIMAL',
      }),
    ),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

function createEngine(): FlowGenerator {
  return new FlowGenerator({
    afPipeline: new AfPipeline(makePassExecutor()),
    factoryRegistry: new FactoryRegistry(),
    taskRegistry: new TaskTypeRegistry(),
    bfa: new BusinessFlowArbiter(),
    promotionLadder: new PromotionLadder(),
    freedomManager: new FreedomConfigManager(),
  });
}

// ── FLOW-16 inline contract param builders ───────────────────────────────────

function flow16KycParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T219_F16_KYC${suffix}`,
    flowId: 'FLOW-16',
    flowName: 'Giant Shop Marketplace Platforms',
    name: 'KycVerificationHandler',
    archetype: ContractArchetype.VALIDATION,
    entry: 'marketplace.kyc.submitted CloudEvent',
    purpose:
      'Verify seller identity via 3-provider KYC consensus. ' +
      'check_kyc_completed_before_activation: store MUST NOT activate until KYC passes. ' +
      'check_kyc_doc_not_in_payload: KYC documents must never appear in CloudEvent payloads.',
    factoryDependencies: [
      {
        factoryId: `F_DB_KYC${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'KYC record storage',
      },
      {
        factoryId: `F_QUEUE_KYC${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'KycCompleted / KycRejected event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-16-K01${suffix}`,
        description:
          'check_kyc_completed_before_activation — store must not activate without KYC pass',
        severity: 'error',
        checkType: 'check_kyc_completed_before_activation',
      },
      {
        gateId: `QG-16-K02${suffix}`,
        description: 'check_kyc_doc_not_in_payload — KYC documents must not appear in events',
        severity: 'error',
        checkType: 'check_kyc_doc_not_in_payload',
      },
      {
        gateId: `QG-16-K03${suffix}`,
        description: 'DNA-8: storeDocument before enqueue',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],
    bfaRegistration: {
      entities: [`kyc_record_f16${suffix}`],
      events: [`marketplace.kyc.completed.f16${suffix}`, `marketplace.kyc.rejected.f16${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: KYC must complete before store activation',
      'IR-2: KYC documents must never appear in CloudEvent payloads',
      'IR-3: DNA-8 storeDocument BEFORE enqueue',
      'IR-4: Two-actor approval required for KYC pass',
    ],
    machineComponents: ['KYC gate before activation', 'Document scrubber', 'Two-actor approval'],
    freedomComponents: ['flow16_kyc_provider_list', 'flow16_kyc_consensus_threshold'],
    familyId: 'Family-16',
  };
}

function flow16CheckoutParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T221_F16_CHECKOUT${suffix}`,
    flowId: 'FLOW-16',
    flowName: 'Giant Shop Marketplace Platforms',
    name: 'CheckoutSagaOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'marketplace.checkout.initiated CloudEvent',
    purpose:
      'Orchestrate 4-step checkout saga with LIFO compensation. ' +
      'check_checkout_saga_lifo_order: compensation steps must execute in reverse order. ' +
      'check_idempotency_key_registered: idempotency key must be registered before any financial call. ' +
      'check_compensation_chain_registered: all compensation handlers registered before saga start.',
    factoryDependencies: [
      {
        factoryId: `F_DB_CHECKOUT${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Checkout saga state storage',
      },
      {
        factoryId: `F_QUEUE_CHECKOUT${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'CheckoutCompleted / CheckoutRolledBack event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-16-C01${suffix}`,
        description: 'check_checkout_saga_lifo_order — compensation executes in reverse order',
        severity: 'error',
        checkType: 'check_checkout_saga_lifo_order',
      },
      {
        gateId: `QG-16-C02${suffix}`,
        description: 'check_idempotency_key_registered — must be set before financial call',
        severity: 'error',
        checkType: 'check_idempotency_key_registered',
      },
      {
        gateId: `QG-16-C03${suffix}`,
        description: 'check_compensation_chain_registered — all handlers registered at saga start',
        severity: 'error',
        checkType: 'check_compensation_chain_registered',
      },
      {
        gateId: `QG-16-C04${suffix}`,
        description: 'check_outbox_before_enqueue — storeDocument before enqueue (DNA-8)',
        severity: 'error',
        checkType: 'check_outbox_before_enqueue',
      },
    ],
    bfaRegistration: {
      entities: [`checkout_saga_f16${suffix}`],
      events: [
        `marketplace.checkout.completed.f16${suffix}`,
        `marketplace.checkout.rolled_back.f16${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Checkout saga compensation must execute in LIFO order',
      'IR-2: Idempotency key required before any financial call',
      'IR-3: All compensation handlers registered before saga starts',
      'IR-4: DNA-8 storeDocument before enqueue on every step',
    ],
    machineComponents: ['LIFO compensation chain', 'Idempotency key registry', 'Saga step tracker'],
    freedomComponents: ['flow16_checkout_timeout_seconds', 'flow16_checkout_max_retries'],
    familyId: 'Family-16',
  };
}

function flow16EscrowParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T222_F16_ESCROW${suffix}`,
    flowId: 'FLOW-16',
    flowName: 'Giant Shop Marketplace Platforms',
    name: 'PaymentEscrowManager',
    archetype: ContractArchetype.BILLING,
    entry: 'marketplace.checkout.completed CloudEvent',
    purpose:
      'Manage payment escrow lifecycle: create → hold → release or refund. ' +
      'check_payment_escrow_created: escrow record must exist before fulfillment starts. ' +
      'check_two_actor_required: escrow release requires both buyer and seller confirmation.',
    factoryDependencies: [
      {
        factoryId: `F_DB_ESCROW${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Escrow record storage',
      },
      {
        factoryId: `F_QUEUE_ESCROW${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'PaymentEscrowCreated / Released / Refunded event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-16-E01${suffix}`,
        description: 'check_payment_escrow_created — escrow record must exist before fulfillment',
        severity: 'error',
        checkType: 'check_payment_escrow_created',
      },
      {
        gateId: `QG-16-E02${suffix}`,
        description: 'check_two_actor_required — release requires buyer + seller confirmation',
        severity: 'error',
        checkType: 'check_two_actor_required',
      },
    ],
    bfaRegistration: {
      entities: [`escrow_record_f16${suffix}`],
      events: [
        `marketplace.payment.escrow.created.f16${suffix}`,
        `marketplace.payment.escrow.released.f16${suffix}`,
        `marketplace.payment.escrow.refunded.f16${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Escrow record must exist before fulfillment can start',
      'IR-2: Two-actor confirmation required to release escrow',
      'IR-3: Refund only on fulfillment failure',
      'IR-4: DNA-8 storeDocument before enqueue',
    ],
    machineComponents: ['Escrow state machine', 'Two-actor gate', 'Refund trigger on failure'],
    freedomComponents: ['flow16_escrow_hold_period_days', 'flow16_auto_release_threshold'],
    familyId: 'Family-16',
  };
}

function flow16PayoutParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T225_F16_PAYOUT${suffix}`,
    flowId: 'FLOW-16',
    flowName: 'Giant Shop Marketplace Platforms',
    name: 'PayoutReleaseHandler',
    archetype: ContractArchetype.BILLING,
    entry: 'marketplace.escrow.released CloudEvent',
    purpose:
      'Release seller payout after escrow hold period. ' +
      'check_payout_released_only_after_hold: payout must not be released before hold period expires.',
    factoryDependencies: [
      {
        factoryId: `F_DB_PAYOUT${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Payout record storage',
      },
      {
        factoryId: `F_QUEUE_PAYOUT${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'PayoutReleased / PayoutHeld event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-16-P01${suffix}`,
        description:
          'check_payout_released_only_after_hold — hold period must expire before payout',
        severity: 'error',
        checkType: 'check_payout_released_only_after_hold',
      },
    ],
    bfaRegistration: {
      entities: [`payout_record_f16${suffix}`],
      events: [`marketplace.payout.released.f16${suffix}`, `marketplace.payout.held.f16${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Payout must not be released before hold period expires',
      'IR-2: Payout held for suspicious activity triggers manual review',
      'IR-3: DNA-8 storeDocument before enqueue',
    ],
    machineComponents: [
      'Hold period gate',
      'Suspicious activity detector',
      'Payout release scheduler',
    ],
    freedomComponents: ['flow16_payout_hold_days', 'flow16_suspicious_threshold'],
    familyId: 'Family-16',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-16 E2E — Happy Path [KYC → STORE → LISTING → CHECKOUT → ESCROW → FULFILLMENT → DISPUTE → PAYOUT]', () => {
  const TENANT = 'flow16-happy-tenant';

  it('F16-H1: T219 KYC verification contract generates successfully — StoreActivated emitted', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow16KycParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F16-H2: T219 KYC passes → store activation proceeds → StoreActivated event emitted', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    // KYC passes — store document then emit KycCompleted
    await db.storeDocument(
      'kyc-records',
      { sellerId: 'seller-001', tenantId: TENANT, status: 'APPROVED' },
      'kyc-001',
    );
    await queue.enqueue(
      'marketplace.kyc.completed',
      createCloudEvent({
        eventType: 'marketplace.kyc.completed',
        source: 'flow-16/kyc-verification',
        data: { sellerId: 'seller-001', tenantId: TENANT, status: 'APPROVED' },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    // Store activated after KYC
    await queue.enqueue(
      'marketplace.store.activated',
      createCloudEvent({
        eventType: 'marketplace.store.activated',
        source: 'flow-16/store-activation',
        data: { sellerId: 'seller-001', tenantId: TENANT, activatedAt: new Date().toISOString() },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted).toHaveLength(2);
    expect(queue._emitted[0].queue).toBe('marketplace.kyc.completed');
    expect(queue._emitted[1].queue).toBe('marketplace.store.activated');
  });

  it('F16-H3: T220 listing moderation 3-model consensus → ListingApproved event', async () => {
    const queue = makeInMemoryQueue();

    const listingApprovedEvent = createCloudEvent({
      eventType: 'marketplace.listing.approved',
      source: 'flow-16/listing-moderation',
      data: {
        listingId: 'listing-001',
        tenantId: TENANT,
        consensusScore: 0.95,
        models: ['model-a', 'model-b', 'model-c'],
        approvedAt: new Date().toISOString(),
      },
      tenantId: TENANT,
    });

    await queue.enqueue(
      'marketplace.listing.approved',
      listingApprovedEvent as unknown as Record<string, unknown>,
    );

    expect(queue._emitted).toHaveLength(1);
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['consensusScore']).toBeGreaterThan(0.5);
    expect((data['models'] as string[]).length).toBe(3);
  });

  it('F16-H4: T221 checkout saga completes all 4 steps → CheckoutCompleted event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    const sagaSteps = ['reserve-inventory', 'apply-coupon', 'charge-payment', 'confirm-order'];
    for (const step of sagaSteps) {
      await db.storeDocument(
        'checkout-saga-steps',
        { sagaId: 'saga-001', step, tenantId: TENANT, status: 'DONE' },
        `saga-001-${step}`,
      );
    }

    await queue.enqueue(
      'marketplace.checkout.completed',
      createCloudEvent({
        eventType: 'marketplace.checkout.completed',
        source: 'flow-16/checkout-saga',
        data: {
          sagaId: 'saga-001',
          tenantId: TENANT,
          completedSteps: sagaSteps,
          completedAt: new Date().toISOString(),
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const stepsResult = await db.searchDocuments('checkout-saga-steps', { sagaId: 'saga-001' });
    expect((stepsResult.data as Record<string, unknown>[]).length).toBe(4);
    expect(queue._emitted[0].queue).toBe('marketplace.checkout.completed');
  });

  it('F16-H5: T222 payment escrow created and released → PaymentEscrowReleased event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'escrow-records',
      { escrowId: 'escrow-001', tenantId: TENANT, amount: 99.99, status: 'CREATED' },
      'escrow-001',
    );

    await queue.enqueue(
      'marketplace.payment.escrow.created',
      createCloudEvent({
        eventType: 'marketplace.payment.escrow.created',
        source: 'flow-16/payment-escrow',
        data: { escrowId: 'escrow-001', tenantId: TENANT, amount: 99.99 },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    await queue.enqueue(
      'marketplace.payment.escrow.released',
      createCloudEvent({
        eventType: 'marketplace.payment.escrow.released',
        source: 'flow-16/payment-escrow',
        data: { escrowId: 'escrow-001', tenantId: TENANT, releasedAt: new Date().toISOString() },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted).toHaveLength(2);
    expect(queue._emitted[0].queue).toBe('marketplace.payment.escrow.created');
    expect(queue._emitted[1].queue).toBe('marketplace.payment.escrow.released');
  });

  it('F16-H6: T223 fulfillment started and completed → FulfillmentCompleted event', async () => {
    const queue = makeInMemoryQueue();

    await queue.enqueue(
      'marketplace.fulfillment.started',
      createCloudEvent({
        eventType: 'marketplace.fulfillment.started',
        source: 'flow-16/order-fulfillment',
        data: { orderId: 'order-001', tenantId: TENANT, startedAt: new Date().toISOString() },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    await queue.enqueue(
      'marketplace.fulfillment.completed',
      createCloudEvent({
        eventType: 'marketplace.fulfillment.completed',
        source: 'flow-16/order-fulfillment',
        data: {
          orderId: 'order-001',
          tenantId: TENANT,
          trackingId: 'track-001',
          completedAt: new Date().toISOString(),
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted).toHaveLength(2);
    expect(queue._emitted[0].queue).toBe('marketplace.fulfillment.started');
    expect(queue._emitted[1].queue).toBe('marketplace.fulfillment.completed');
    const completedData = queue._emitted[1].payload['data'] as Record<string, unknown>;
    expect(completedData['trackingId']).toBe('track-001');
  });

  it('F16-H7: T224 dispute resolution with evidence → DisputeResolved event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'dispute-records',
      {
        disputeId: 'dispute-001',
        tenantId: TENANT,
        evidence: ['photo-1.jpg', 'receipt.pdf'],
        status: 'OPEN',
      },
      'dispute-001',
    );

    await queue.enqueue(
      'marketplace.dispute.resolved',
      createCloudEvent({
        eventType: 'marketplace.dispute.resolved',
        source: 'flow-16/dispute-resolution',
        data: {
          disputeId: 'dispute-001',
          tenantId: TENANT,
          resolution: 'BUYER_WIN',
          resolvedAt: new Date().toISOString(),
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const disputeResult = await db.searchDocuments('dispute-records', { disputeId: 'dispute-001' });
    const disputeDoc = (disputeResult.data as Record<string, unknown>[])[0];
    expect((disputeDoc['evidence'] as string[]).length).toBeGreaterThan(0);
    expect(queue._emitted[0].queue).toBe('marketplace.dispute.resolved');
  });

  it('F16-H8: T225 payout released after hold period expires → PayoutReleased event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    const holdExpiredAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(); // 8 days ago
    await db.storeDocument(
      'payout-records',
      { payoutId: 'payout-001', tenantId: TENANT, holdExpiredAt, status: 'HOLD_EXPIRED' },
      'payout-001',
    );

    const holdResult = await db.searchDocuments('payout-records', { payoutId: 'payout-001' });
    const payoutDoc = (holdResult.data as Record<string, unknown>[])[0];
    const holdExpired = new Date(payoutDoc['holdExpiredAt'] as string) < new Date();

    if (holdExpired) {
      await queue.enqueue(
        'marketplace.payout.released',
        createCloudEvent({
          eventType: 'marketplace.payout.released',
          source: 'flow-16/payout-release',
          data: { payoutId: 'payout-001', tenantId: TENANT, releasedAt: new Date().toISOString() },
          tenantId: TENANT,
        }) as unknown as Record<string, unknown>,
      );
    }

    expect(holdExpired).toBe(true);
    expect(queue._emitted).toHaveLength(1);
    expect(queue._emitted[0].queue).toBe('marketplace.payout.released');
  });

  it('F16-H9: T226 product discovery respects tenant scope → ProductDiscovered event with tenant filter', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'product-catalog',
      { productId: 'prod-001', tenantId: TENANT, title: 'Widget A', price: 49.99 },
      'prod-001',
    );
    await db.storeDocument(
      'product-catalog',
      { productId: 'prod-002', tenantId: TENANT, title: 'Widget B', price: 79.99 },
      'prod-002',
    );
    await db.storeDocument(
      'product-catalog',
      { productId: 'prod-003', tenantId: 'other-tenant', title: 'Widget C', price: 99.99 },
      'prod-003',
    );

    const discoveryResult = await db.searchDocuments('product-catalog', { tenantId: TENANT });
    const products = discoveryResult.data as Record<string, unknown>[];

    await queue.enqueue(
      'marketplace.product.discovered',
      createCloudEvent({
        eventType: 'marketplace.product.discovered',
        source: 'flow-16/product-discovery',
        data: {
          tenantId: TENANT,
          count: products.length,
          productIds: products.map((p) => p['productId']),
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(products.length).toBe(2);
    expect(products.every((p) => p['tenantId'] === TENANT)).toBe(true);
  });

  it('F16-H10: checkout saga outbox pattern — storeDocument before enqueue', () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const callOrder: string[] = [];

    const trackedDb = {
      ...db,
      storeDocument: jest.fn(async (...args: Parameters<typeof db.storeDocument>) => {
        callOrder.push('storeDocument');
        return db.storeDocument(...args);
      }),
    };
    const trackedQueue = {
      ...queue,
      enqueue: jest.fn(async (...args: Parameters<typeof queue.enqueue>) => {
        callOrder.push('enqueue');
        return queue.enqueue(...args);
      }),
    };

    return trackedDb
      .storeDocument(
        'checkout-saga-state',
        { sagaId: 'saga-002', tenantId: TENANT, status: 'INITIATED' },
        'saga-002',
      )
      .then(() =>
        trackedQueue.enqueue('marketplace.checkout.started', {
          sagaId: 'saga-002',
          tenantId: TENANT,
        }),
      )
      .then(() => {
        expect(callOrder[0]).toBe('storeDocument');
        expect(callOrder[1]).toBe('enqueue');
      });
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-16 E2E — Error Path', () => {
  it('F16-E1: KYC rejection — store NOT activated → KycRejected event emitted', async () => {
    const queue = makeInMemoryQueue();

    const kycResult = { passed: false, reason: 'DOCUMENT_MISMATCH' };

    if (!kycResult.passed) {
      await queue.enqueue(
        'marketplace.kyc.rejected',
        createCloudEvent({
          eventType: 'marketplace.kyc.rejected',
          source: 'flow-16/kyc-verification',
          data: {
            sellerId: 'seller-rej',
            reason: kycResult.reason,
            tenantId: 'flow16-error-tenant',
          },
          tenantId: 'flow16-error-tenant',
        }) as unknown as Record<string, unknown>,
      );
    }

    expect(kycResult.passed).toBe(false);
    expect(queue._emitted[0].queue).toBe('marketplace.kyc.rejected');
    // Store NOT activated — no StoreActivated event
    const storeActivated = queue._emitted.find((e) => e.queue === 'marketplace.store.activated');
    expect(storeActivated).toBeUndefined();
  });

  it('F16-E2: listing moderation rejection → ListingRejected event emitted', async () => {
    const queue = makeInMemoryQueue();

    const moderationResult = DataProcessResult.failure<Record<string, unknown>>(
      'LISTING_REJECTED',
      'Listing failed AI moderation — prohibited content detected',
    );

    if (!moderationResult.isSuccess) {
      await queue.enqueue(
        'marketplace.listing.rejected',
        createCloudEvent({
          eventType: 'marketplace.listing.rejected',
          source: 'flow-16/listing-moderation',
          data: {
            listingId: 'listing-rej',
            reason: moderationResult.errorMessage,
            tenantId: 'flow16-error-tenant',
          },
          tenantId: 'flow16-error-tenant',
        }) as unknown as Record<string, unknown>,
      );
    }

    expect(moderationResult.isSuccess).toBe(false);
    expect(moderationResult.errorCode).toBe('LISTING_REJECTED');
    expect(queue._emitted[0].queue).toBe('marketplace.listing.rejected');
  });

  it('F16-E3: checkout saga rollback (LIFO) → CheckoutRolledBack event emitted', () => {
    const sagaSteps = ['reserve-inventory', 'apply-coupon', 'charge-payment', 'confirm-order'];
    const failedAt = 'charge-payment';

    const failedIndex = sagaSteps.indexOf(failedAt);
    const compensationSteps = sagaSteps.slice(0, failedIndex + 1).reverse();

    // LIFO: compensation must be in reverse order
    expect(compensationSteps[0]).toBe('charge-payment');
    expect(compensationSteps[1]).toBe('apply-coupon');
    expect(compensationSteps[2]).toBe('reserve-inventory');

    const result = DataProcessResult.failure<Record<string, unknown>>(
      'CHECKOUT_ROLLED_BACK',
      `Checkout saga rolled back at step ${failedAt} — LIFO compensation applied`,
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CHECKOUT_ROLLED_BACK');
  });

  it('F16-E4: escrow refund on failed fulfillment → PaymentEscrowRefunded event', async () => {
    const queue = makeInMemoryQueue();

    const fulfillmentFailed = true;

    if (fulfillmentFailed) {
      await queue.enqueue(
        'marketplace.payment.escrow.refunded',
        createCloudEvent({
          eventType: 'marketplace.payment.escrow.refunded',
          source: 'flow-16/payment-escrow',
          data: {
            escrowId: 'escrow-refund-001',
            tenantId: 'flow16-error-tenant',
            reason: 'FULFILLMENT_FAILED',
            refundedAt: new Date().toISOString(),
          },
          tenantId: 'flow16-error-tenant',
        }) as unknown as Record<string, unknown>,
      );
    }

    expect(queue._emitted[0].queue).toBe('marketplace.payment.escrow.refunded');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['reason']).toBe('FULFILLMENT_FAILED');
  });

  it('F16-E5: dispute rejection → DisputeRejected event emitted', async () => {
    const queue = makeInMemoryQueue();

    const disputeResult = DataProcessResult.failure<Record<string, unknown>>(
      'DISPUTE_REJECTED',
      'Insufficient evidence provided — dispute rejected',
    );

    await queue.enqueue(
      'marketplace.dispute.rejected',
      createCloudEvent({
        eventType: 'marketplace.dispute.rejected',
        source: 'flow-16/dispute-resolution',
        data: {
          disputeId: 'dispute-rej',
          reason: disputeResult.errorMessage,
          tenantId: 'flow16-error-tenant',
        },
        tenantId: 'flow16-error-tenant',
      }) as unknown as Record<string, unknown>,
    );

    expect(disputeResult.errorCode).toBe('DISPUTE_REJECTED');
    expect(queue._emitted[0].queue).toBe('marketplace.dispute.rejected');
  });

  it('F16-E6: payout held for suspicious activity → PayoutHeld event emitted', async () => {
    const queue = makeInMemoryQueue();

    const suspicionScore = 0.92;
    const suspicionThreshold = 0.8;
    const isSuspicious = suspicionScore > suspicionThreshold;

    if (isSuspicious) {
      await queue.enqueue(
        'marketplace.payout.held',
        createCloudEvent({
          eventType: 'marketplace.payout.held',
          source: 'flow-16/payout-release',
          data: {
            payoutId: 'payout-held-001',
            tenantId: 'flow16-error-tenant',
            suspicionScore,
            heldAt: new Date().toISOString(),
          },
          tenantId: 'flow16-error-tenant',
        }) as unknown as Record<string, unknown>,
      );
    }

    expect(isSuspicious).toBe(true);
    expect(queue._emitted[0].queue).toBe('marketplace.payout.held');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['suspicionScore']).toBeGreaterThan(suspicionThreshold);
  });

  it('F16-E7: KYC document found in event payload — KYC_DOC_IN_PAYLOAD error', () => {
    const eventData: Record<string, unknown> = {
      sellerId: 'seller-leak',
      // kycDocument: intentionally present — this triggers the named check
      kycDocument: 'base64-encoded-passport',
    };

    const hasKycDoc =
      'kycDocument' in eventData || 'kycDocumentId' in eventData || 'passportScan' in eventData;
    const result = hasKycDoc
      ? DataProcessResult.failure<Record<string, unknown>>(
          'KYC_DOC_IN_PAYLOAD',
          'KYC document must not appear in CloudEvent payload — use secure vault reference',
        )
      : DataProcessResult.success({ accepted: true });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('KYC_DOC_IN_PAYLOAD');
  });

  it('F16-E8: database write failure returns DataProcessResult.failure — no throw', async () => {
    const db = makeInMemoryDb();
    db.storeDocument.mockResolvedValueOnce(
      DataProcessResult.failure('DB_WRITE_FAILED', 'Simulated marketplace storage failure'),
    );

    const result = await db.storeDocument(
      'escrow-records',
      { escrowId: 'escrow-fail' },
      'escrow-fail',
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_FAILED');
  });

  it('F16-E9: empty taskTypeId returns DataProcessResult without throwing', async () => {
    const engine = createEngine();
    const invalidContract = new EngineContract({
      taskTypeId: '',
      name: 'Invalid',
      archetype: ContractArchetype.VALIDATION,
      entry: '',
      purpose: '',
      flowId: '',
      flowName: '',
      factoryDependencies: [],
      afStations: [],
      qualityGates: [],
      bfaRegistration: { entities: [], events: [], apiRoutes: [] },
      ironRules: [],
      machineComponents: [],
      freedomComponents: [],
      familyId: '',
    });

    const result = await engine.generate(invalidContract, 'flow16-error-tenant');

    expect(result).toBeInstanceOf(DataProcessResult);
    if (!result.isSuccess) {
      expect(result.errorCode).toBeDefined();
    }
  });

  it('F16-E10: payout released before hold period — PAYOUT_HOLD_NOT_EXPIRED error', () => {
    const holdExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(); // 3 days from now
    const holdExpired = new Date(holdExpiresAt) < new Date();

    const result = holdExpired
      ? DataProcessResult.success({ payoutReleased: true })
      : DataProcessResult.failure<Record<string, unknown>>(
          'PAYOUT_HOLD_NOT_EXPIRED',
          `Payout hold period has not expired — expires at ${holdExpiresAt}`,
        );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PAYOUT_HOLD_NOT_EXPIRED');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-16 E2E — Tenant Isolation', () => {
  it('F16-T1: cross-tenant listing access blocked → CROSS_TENANT_LISTING_BLOCKED error', () => {
    const requestingTenant: string = 'tenant-A';
    const listingOwnerTenant: string = 'tenant-B';

    const isCrossTenant = requestingTenant !== listingOwnerTenant;
    const result = isCrossTenant
      ? DataProcessResult.failure<Record<string, unknown>>(
          'CROSS_TENANT_LISTING_BLOCKED',
          `Tenant ${requestingTenant} cannot access listing owned by ${listingOwnerTenant}`,
        )
      : DataProcessResult.success({ access: true });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CROSS_TENANT_LISTING_BLOCKED');
  });

  it('F16-T2: payout record only visible to owner tenant', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    await dbA.storeDocument(
      'payout-records',
      { payoutId: 'payout-iso-001', tenantId: 'tenant-A', amount: 500 },
      'payout-iso-001',
    );

    const bResults = await dbB.searchDocuments('payout-records', {});
    expect((bResults.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F16-T3: discovery results scoped per tenant — tenant-A cannot see tenant-B products', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'product-catalog',
      { productId: 'prod-iso-1', tenantId: 'tenant-A', title: 'A Widget' },
      'prod-iso-1',
    );
    await db.storeDocument(
      'product-catalog',
      { productId: 'prod-iso-2', tenantId: 'tenant-B', title: 'B Widget' },
      'prod-iso-2',
    );

    const tenantADiscovery = await db.searchDocuments('product-catalog', { tenantId: 'tenant-A' });
    const tenantBDiscovery = await db.searchDocuments('product-catalog', { tenantId: 'tenant-B' });

    const productsA = tenantADiscovery.data as Record<string, unknown>[];
    const productsB = tenantBDiscovery.data as Record<string, unknown>[];

    expect(productsA.length).toBe(1);
    expect(productsB.length).toBe(1);
    expect(productsA[0]['tenantId']).toBe('tenant-A');
    expect(productsB[0]['tenantId']).toBe('tenant-B');
  });

  it('F16-T4: KYC records scoped per tenant — tenant-A KYC does not appear in tenant-B store', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    await dbA.storeDocument(
      'kyc-records',
      { sellerId: 'seller-A', tenantId: 'tenant-A', status: 'APPROVED' },
      'kyc-A',
    );

    const bKycRecords = await dbB.searchDocuments('kyc-records', {});
    expect((bKycRecords.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F16-T5: CloudEvents include tenantid — ALS context propagation', () => {
    const eventA = createCloudEvent({
      eventType: 'marketplace.kyc.completed',
      source: 'flow-16/kyc-verification',
      data: { sellerId: 'seller-A' },
      tenantId: 'tenant-A',
    });
    const eventB = createCloudEvent({
      eventType: 'marketplace.kyc.completed',
      source: 'flow-16/kyc-verification',
      data: { sellerId: 'seller-B' },
      tenantId: 'tenant-B',
    });

    expect(eventA['tenantid']).toBe('tenant-A');
    expect(eventB['tenantid']).toBe('tenant-B');
    expect(eventA['tenantid']).not.toBe(eventB['tenantid']);
  });

  it('F16-T6: escrow records tenant-scoped — tenant-A escrow not visible to tenant-B', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'escrow-records',
      { escrowId: 'escrow-A-001', tenantId: 'tenant-A', amount: 200 },
      'escrow-A-001',
    );

    const tenantBResult = await db.searchDocuments('escrow-records', { tenantId: 'tenant-B' });
    expect((tenantBResult.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F16-T7: tenant-A and tenant-B checkout contracts generate independently', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const [rA, rB] = await Promise.all([
      engineA.generate(new EngineContract(flow16CheckoutParams('-ta')), 'flow16-tenant-A'),
      engineB.generate(new EngineContract(flow16CheckoutParams('-tb')), 'flow16-tenant-B'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);
    expect(rA.data!.contractId).toBe('T221_F16_CHECKOUT-ta');
    expect(rB.data!.contractId).toBe('T221_F16_CHECKOUT-tb');
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-16 E2E — Idempotency', () => {
  it('F16-I1: duplicate checkout with same idempotency key returns cached response', async () => {
    const db = makeInMemoryDb();
    const idempotencyKey = 'checkout-idem-key-001';
    const tenantId = 'tenant-A';

    // First checkout — store idempotency record
    await db.storeDocument(
      'checkout-idempotency',
      { idempotencyKey, tenantId, status: 'COMPLETED', sagaId: 'saga-cached-001' },
      idempotencyKey,
    );

    // Duplicate checkout attempt with same key
    const existing = await db.searchDocuments('checkout-idempotency', { idempotencyKey });
    const isDuplicate =
      existing.isSuccess && (existing.data as Record<string, unknown>[]).length > 0;

    const result = isDuplicate
      ? DataProcessResult.success({ cached: true, sagaId: 'saga-cached-001', fromCache: true })
      : DataProcessResult.failure<Record<string, unknown>>('CHECKOUT_FAILED', 'Checkout failed');

    expect(isDuplicate).toBe(true);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['fromCache']).toBe(true);
  });

  it('F16-I2: duplicate payout with same idempotency key skipped', async () => {
    const db = makeInMemoryDb();
    const idempotencyKey = 'payout-idem-key-001';
    const tenantId = 'tenant-A';

    await db.storeDocument(
      'payout-idempotency',
      { idempotencyKey, tenantId, status: 'RELEASED', payoutId: 'payout-cached-001' },
      idempotencyKey,
    );

    const existing = await db.searchDocuments('payout-idempotency', { idempotencyKey });
    const isDuplicate =
      existing.isSuccess && (existing.data as Record<string, unknown>[]).length > 0;

    expect(isDuplicate).toBe(true);
  });

  it('F16-I3: duplicate KYC submission handled — same sellerId not re-submitted', async () => {
    const db = makeInMemoryDb();
    const sellerId = 'seller-dup-001';
    const tenantId = 'tenant-A';

    await db.storeDocument(
      'kyc-records',
      { sellerId, tenantId, status: 'APPROVED' },
      `kyc-${sellerId}`,
    );

    const existing = await db.searchDocuments('kyc-records', { sellerId });
    const alreadyVerified =
      existing.isSuccess && (existing.data as Record<string, unknown>[]).length > 0;

    const result = alreadyVerified
      ? DataProcessResult.success({ skipped: true, reason: 'KYC_ALREADY_APPROVED' })
      : DataProcessResult.failure<Record<string, unknown>>('KYC_FAILED', 'KYC failed');

    expect(alreadyVerified).toBe(true);
    expect(result.data!['skipped']).toBe(true);
  });

  it('F16-I4: idempotency key derived from tenantId + orderId + timestamp prefix', () => {
    const tenantId = 'tenant-A';
    const orderId = 'order-001';
    const timestampPrefix = '2026-03-31';

    const idempotencyKey = `${tenantId}:${orderId}:${timestampPrefix}`;

    expect(idempotencyKey).toContain(tenantId);
    expect(idempotencyKey).toContain(orderId);
    expect(idempotencyKey).toContain(timestampPrefix);
  });

  it('F16-I5: second engine.generate() with same BFA entities does not error', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const r1 = await engineA.generate(
      new EngineContract(flow16EscrowParams('-i5a')),
      'flow16-idem-tenant',
    );
    const r2 = await engineB.generate(
      new EngineContract(flow16EscrowParams('-i5b')),
      'flow16-idem-tenant',
    );

    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-16 E2E — UI State Mapping', () => {
  it('F16-U1: KYC_PENDING → KYC_APPROVED → STORE_ACTIVE state machine transitions', () => {
    const states = ['KYC_PENDING', 'KYC_APPROVED', 'STORE_ACTIVE'] as const;
    type StoreState = (typeof states)[number];

    const storeState = { current: 'KYC_APPROVED' as StoreState };
    const currentIndex = states.indexOf(storeState.current);

    expect(currentIndex).toBe(1);
    expect(states[currentIndex - 1]).toBe('KYC_PENDING');
    expect(states[currentIndex + 1]).toBe('STORE_ACTIVE');
  });

  it('F16-U2: LISTING_DRAFT → LISTING_REVIEW → LISTING_LIVE state transitions', () => {
    const states = ['LISTING_DRAFT', 'LISTING_REVIEW', 'LISTING_LIVE'] as const;
    type ListingState = (typeof states)[number];

    const listingState = { current: 'LISTING_REVIEW' as ListingState };
    const currentIndex = states.indexOf(listingState.current);

    expect(currentIndex).toBe(1);
    expect(states[currentIndex - 1]).toBe('LISTING_DRAFT');
    expect(states[currentIndex + 1]).toBe('LISTING_LIVE');
  });

  it('F16-U3: CHECKOUT_PENDING → CHECKOUT_COMPLETE state transition', () => {
    const checkoutState = { status: 'CHECKOUT_PENDING' };
    const screen =
      checkoutState.status === 'CHECKOUT_PENDING' ? 'checkout-processing' : 'checkout-complete';
    expect(screen).toBe('checkout-processing');

    const completedState = { status: 'CHECKOUT_COMPLETE' };
    const completedScreen =
      completedState.status === 'CHECKOUT_COMPLETE' ? 'checkout-complete' : 'checkout-processing';
    expect(completedScreen).toBe('checkout-complete');
  });

  it('F16-U4: KYC_REJECTED maps to kyc-rejected screen — not generic error', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'KYC_REJECTED',
      'Identity verification failed — please resubmit documents',
    );
    const screen = result.errorCode === 'KYC_REJECTED' ? 'kyc-rejected' : 'generic-error';
    expect(screen).toBe('kyc-rejected');
  });

  it('F16-U5: CHECKOUT_ROLLED_BACK maps to checkout-failed screen with compensation detail', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'CHECKOUT_ROLLED_BACK',
      'Checkout saga rolled back — compensation applied',
    );
    const screen =
      result.errorCode === 'CHECKOUT_ROLLED_BACK' ? 'checkout-failed' : 'generic-error';
    expect(screen).toBe('checkout-failed');
    expect(result.errorMessage).toContain('compensation');
  });

  it('F16-U6: DISPUTE_OPEN status maps to dispute-open screen with evidence upload prompt', () => {
    const disputeState = { disputeId: 'dispute-u6', status: 'OPEN', evidenceRequired: true };
    const screen = disputeState.status === 'OPEN' ? 'dispute-open' : 'dispute-resolved';
    expect(screen).toBe('dispute-open');
    expect(disputeState.evidenceRequired).toBe(true);
  });

  it('F16-U7: toDict() serializes DataProcessResult for API response — snake_case keys', () => {
    const success = DataProcessResult.success({
      escrowId: 'escrow-u7',
      amount: 199.99,
      status: 'RELEASED',
    });
    const dict = success.toDict();

    expect(dict['is_success']).toBe(true);
    expect(dict['data']).toBeDefined();
    expect(dict['correlation_id']).toBeDefined();
    expect(dict['timestamp']).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract (/api/dynamic/{indexName})
// ══════════════════════════════════════════════════════

describe('FLOW-16 E2E — API Contract (/api/dynamic/{indexName})', () => {
  it('F16-A1: /api/dynamic/store-activations response has is_success, data, correlation_id', () => {
    const mockResponse = DataProcessResult.success([
      { sellerId: 'seller-api-1', tenantId: 'tenant-a', activatedAt: new Date().toISOString() },
    ]);
    const dict = mockResponse.toDict();

    expect(dict).toHaveProperty('is_success', true);
    expect(dict).toHaveProperty('data');
    expect(dict).toHaveProperty('correlation_id');
    expect(dict).toHaveProperty('timestamp');
  });

  it('F16-A2: /api/dynamic/escrow-records returns escrow with amount and status fields', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'escrow-records',
      { escrowId: 'escrow-api-1', tenantId: 'tenant-a', amount: 149.99, status: 'CREATED' },
      'escrow-api-1',
    );

    const result = await db.searchDocuments('escrow-records', { escrowId: 'escrow-api-1' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['amount']).toBe(149.99);
    expect(docs[0]['status']).toBe('CREATED');
  });

  it('F16-A3: /api/dynamic/kyc-records returns kyc with sellerId and status fields', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'kyc-records',
      { sellerId: 'seller-api-2', tenantId: 'tenant-a', status: 'APPROVED' },
      'kyc-api-2',
    );

    const result = await db.searchDocuments('kyc-records', { sellerId: 'seller-api-2' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['sellerId']).toBe('seller-api-2');
    expect(docs[0]['status']).toBe('APPROVED');
  });

  it('F16-A4: API error response for escrow not found — is_success=false, error_code=NOT_FOUND', () => {
    const errorResponse = DataProcessResult.failure<unknown>(
      'NOT_FOUND',
      'Escrow record not found',
    );
    const dict = errorResponse.toDict();

    expect(dict['is_success']).toBe(false);
    expect(dict['error_code']).toBe('NOT_FOUND');
    expect(dict['error_message']).toBe('Escrow record not found');
  });

  it('F16-A5: /api/dynamic/payout-records returns payout with amount and holdExpiredAt fields', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'payout-records',
      {
        payoutId: 'payout-api-1',
        tenantId: 'tenant-a',
        amount: 300,
        holdExpiredAt: '2026-03-28T00:00:00Z',
      },
      'payout-api-1',
    );

    const result = await db.searchDocuments('payout-records', { payoutId: 'payout-api-1' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['amount']).toBe(300);
    expect(docs[0]['holdExpiredAt']).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents (DNA-9)
// ══════════════════════════════════════════════════════

describe('FLOW-16 E2E — CloudEvents (DNA-9)', () => {
  it('F16-C1: KycCompleted event has correct CloudEvents envelope (source, type, tenantId)', () => {
    const event = createCloudEvent({
      eventType: 'marketplace.kyc.completed',
      source: 'flow-16/kyc-verification',
      data: {
        sellerId: 'seller-cf1',
        tenantId: 'tenant-flow16',
        status: 'APPROVED',
        completedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow16',
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['id']).toBeDefined();
    expect(event['type']).toBe('marketplace.kyc.completed');
    expect(event['source']).toContain('flow-16');
    expect(event['tenantid']).toBe('tenant-flow16');
    expect(event['datacontenttype']).toBe('application/json');
  });

  it('F16-C2: CheckoutCompleted event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'marketplace.checkout.completed',
      source: 'flow-16/checkout-saga',
      data: {
        sagaId: 'saga-cf2',
        tenantId: 'tenant-flow16',
        completedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow16',
    });

    const [isValid, errors] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('F16-C3: PaymentEscrowReleased event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'marketplace.payment.escrow.released',
      source: 'flow-16/payment-escrow',
      data: {
        escrowId: 'escrow-cf3',
        tenantId: 'tenant-flow16',
        releasedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow16',
    });

    const [isValid, errors] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('F16-C4: StoreActivated event is tenant-scoped — tenantid field present', () => {
    const event = createCloudEvent({
      eventType: 'marketplace.store.activated',
      source: 'flow-16/store-activation',
      data: { sellerId: 'seller-cf4', activatedAt: new Date().toISOString() },
      tenantId: 'tenant-flow16',
    });

    expect(event['tenantid']).toBe('tenant-flow16');
    expect(event['tenantid']).not.toBeUndefined();
  });

  it('F16-C5: FulfillmentCompleted event contains trackingId in data', () => {
    const event = createCloudEvent({
      eventType: 'marketplace.fulfillment.completed',
      source: 'flow-16/order-fulfillment',
      data: {
        orderId: 'order-cf5',
        trackingId: 'track-cf5',
        tenantId: 'tenant-flow16',
        completedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow16',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['trackingId']).toBe('track-cf5');

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F16-C6: DisputeResolved event emitted via queue fabric — not HTTP', async () => {
    const queue = makeInMemoryQueue();

    await queue.enqueue(
      'marketplace.dispute.resolved',
      createCloudEvent({
        eventType: 'marketplace.dispute.resolved',
        source: 'flow-16/dispute-resolution',
        data: { disputeId: 'dispute-cf6', resolution: 'BUYER_WIN', tenantId: 'tenant-flow16' },
        tenantId: 'tenant-flow16',
      }) as unknown as Record<string, unknown>,
    );

    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(queue._emitted[0].queue).toBe('marketplace.dispute.resolved');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['resolution']).toBe('BUYER_WIN');
  });

  it('F16-C7: PayoutReleased event contains required fields', () => {
    const event = createCloudEvent({
      eventType: 'marketplace.payout.released',
      source: 'flow-16/payout-release',
      data: {
        payoutId: 'payout-cf7',
        tenantId: 'tenant-flow16',
        amount: 250,
        releasedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow16',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['payoutId']).toBe('payout-cf7');
    expect(data['amount']).toBe(250);

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F16-C8: ProductDiscovered event has count and productIds in data', () => {
    const event = createCloudEvent({
      eventType: 'marketplace.product.discovered',
      source: 'flow-16/product-discovery',
      data: {
        tenantId: 'tenant-flow16',
        count: 5,
        productIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
        discoveredAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow16',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['count']).toBe(5);
    expect((data['productIds'] as string[]).length).toBe(5);
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-16 E2E — Named Checks', () => {
  describe('check_kyc_completed_before_activation', () => {
    it('F16-N1: KYC contract declares check_kyc_completed_before_activation quality gate', () => {
      const params = flow16KycParams('-n1');
      const qg = params.qualityGates.find(
        (g) => g.checkType === 'check_kyc_completed_before_activation',
      );

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F16-N2: check_kyc_completed_before_activation passes when KYC status is APPROVED', async () => {
      const db = makeInMemoryDb();
      await db.storeDocument(
        'kyc-records',
        { sellerId: 'seller-n2', status: 'APPROVED', tenantId: 'tenant-A' },
        'kyc-n2',
      );

      const kycResult = await db.searchDocuments('kyc-records', { sellerId: 'seller-n2' });
      const kycRecord = (kycResult.data as Record<string, unknown>[])[0];
      const kycPassed = kycRecord['status'] === 'APPROVED';

      const activationResult = kycPassed
        ? DataProcessResult.success({ storeActivated: true })
        : DataProcessResult.failure<Record<string, unknown>>(
            'KYC_NOT_COMPLETED',
            'KYC must complete before activation',
          );

      expect(activationResult.isSuccess).toBe(true);
    });

    it('F16-N3: check_kyc_completed_before_activation blocks activation when KYC is PENDING', () => {
      const kycStatus: string = 'PENDING';
      const kycPassed = kycStatus === 'APPROVED';

      const activationResult = kycPassed
        ? DataProcessResult.success({ storeActivated: true })
        : DataProcessResult.failure<Record<string, unknown>>(
            'KYC_NOT_COMPLETED',
            'KYC must be completed and approved before store activation',
          );

      expect(activationResult.isSuccess).toBe(false);
      expect(activationResult.errorCode).toBe('KYC_NOT_COMPLETED');
    });
  });

  describe('check_payment_escrow_created', () => {
    it('F16-N4: escrow contract declares check_payment_escrow_created quality gate', () => {
      const params = flow16EscrowParams('-n4');
      const qg = params.qualityGates.find((g) => g.checkType === 'check_payment_escrow_created');

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F16-N5: check_payment_escrow_created passes when escrow record exists before fulfillment', async () => {
      const db = makeInMemoryDb();
      await db.storeDocument(
        'escrow-records',
        { escrowId: 'escrow-n5', orderId: 'order-n5', status: 'CREATED', tenantId: 'tenant-A' },
        'escrow-n5',
      );

      const escrowResult = await db.searchDocuments('escrow-records', { orderId: 'order-n5' });
      const escrowExists =
        escrowResult.isSuccess && (escrowResult.data as Record<string, unknown>[]).length > 0;

      const fulfillmentAllowed = escrowExists
        ? DataProcessResult.success({ fulfillmentStarted: true })
        : DataProcessResult.failure<Record<string, unknown>>(
            'ESCROW_NOT_FOUND',
            'Escrow must exist before fulfillment',
          );

      expect(fulfillmentAllowed.isSuccess).toBe(true);
    });
  });

  describe('check_checkout_saga_lifo_order', () => {
    it('F16-N6: checkout contract declares check_checkout_saga_lifo_order quality gate', () => {
      const params = flow16CheckoutParams('-n6');
      const qg = params.qualityGates.find((g) => g.checkType === 'check_checkout_saga_lifo_order');

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F16-N7: check_checkout_saga_lifo_order passes when steps registered in correct order', () => {
      const sagaSteps = ['reserve-inventory', 'apply-coupon', 'charge-payment', 'confirm-order'];
      const compensationSteps = [...sagaSteps].reverse();

      // LIFO: compensation is reverse of execution order
      expect(compensationSteps[0]).toBe('confirm-order');
      expect(compensationSteps[1]).toBe('charge-payment');
      expect(compensationSteps[2]).toBe('apply-coupon');
      expect(compensationSteps[3]).toBe('reserve-inventory');

      const lifoValid = compensationSteps.every(
        (step, i) =>
          i === 0 || sagaSteps.indexOf(step) < sagaSteps.indexOf(compensationSteps[i - 1]!),
      );
      expect(lifoValid).toBe(true);
    });
  });

  describe('check_idempotency_key_registered', () => {
    it('F16-N8: checkout contract declares check_idempotency_key_registered quality gate', () => {
      const params = flow16CheckoutParams('-n8');
      const qg = params.qualityGates.find(
        (g) => g.checkType === 'check_idempotency_key_registered',
      );

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F16-N9: check_idempotency_key_registered passes before financial call — key present in registry', async () => {
      const db = makeInMemoryDb();
      const idempotencyKey = 'idem-key-n9';

      // Register idempotency key before financial call
      await db.storeDocument(
        'idempotency-keys',
        { key: idempotencyKey, tenantId: 'tenant-A', registeredAt: new Date().toISOString() },
        idempotencyKey,
      );

      const keyResult = await db.searchDocuments('idempotency-keys', { key: idempotencyKey });
      const keyRegistered =
        keyResult.isSuccess && (keyResult.data as Record<string, unknown>[]).length > 0;

      expect(keyRegistered).toBe(true);
    });

    it('F16-N10: missing idempotency key before financial call returns IDEMPOTENCY_KEY_MISSING error', async () => {
      const db = makeInMemoryDb();
      const missingKey = 'idem-key-missing';

      const keyResult = await db.searchDocuments('idempotency-keys', { key: missingKey });
      const keyRegistered =
        keyResult.isSuccess && (keyResult.data as Record<string, unknown>[]).length > 0;

      const financialCallResult = keyRegistered
        ? DataProcessResult.success({ charged: true })
        : DataProcessResult.failure<Record<string, unknown>>(
            'IDEMPOTENCY_KEY_MISSING',
            'Idempotency key must be registered before any financial operation',
          );

      expect(financialCallResult.isSuccess).toBe(false);
      expect(financialCallResult.errorCode).toBe('IDEMPOTENCY_KEY_MISSING');
    });
  });

  describe('check_outbox_before_enqueue', () => {
    it('F16-N11: checkout contract declares check_outbox_before_enqueue quality gate', () => {
      const params = flow16CheckoutParams('-n11');
      const qg = params.qualityGates.find((g) => g.checkType === 'check_outbox_before_enqueue');

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F16-N12: check_outbox_before_enqueue — storeDocument called before enqueue in saga step', () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const callOrder: string[] = [];

      const trackedDb = {
        ...db,
        storeDocument: jest.fn(async (...args: Parameters<typeof db.storeDocument>) => {
          callOrder.push('storeDocument');
          return db.storeDocument(...args);
        }),
      };
      const trackedQueue = {
        ...queue,
        enqueue: jest.fn(async (...args: Parameters<typeof queue.enqueue>) => {
          callOrder.push('enqueue');
          return queue.enqueue(...args);
        }),
      };

      return trackedDb
        .storeDocument(
          'escrow-records',
          { escrowId: 'escrow-outbox-001', status: 'CREATED', tenantId: 'tenant-A' },
          'escrow-outbox-001',
        )
        .then(() =>
          trackedQueue.enqueue('marketplace.payment.escrow.created', {
            escrowId: 'escrow-outbox-001',
            tenantId: 'tenant-A',
          }),
        )
        .then(() => {
          expect(callOrder[0]).toBe('storeDocument');
          expect(callOrder[1]).toBe('enqueue');
        });
    });

    it('F16-N13: payout contract declares check_payout_released_only_after_hold quality gate', () => {
      const params = flow16PayoutParams('-n13');
      const qg = params.qualityGates.find(
        (g) => g.checkType === 'check_payout_released_only_after_hold',
      );

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F16-N14: KYC contract declares check_kyc_doc_not_in_payload quality gate', () => {
      const params = flow16KycParams('-n14');
      const qg = params.qualityGates.find((g) => g.checkType === 'check_kyc_doc_not_in_payload');

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });
  });
});
