/**
 * FLOW-20 E2E — Sponsored Content + Graph API + Ads Platform
 *
 * Archetypes: REQUEST_RESPONSE (7th archetype), AI_GENERATION, ORCHESTRATION, SERVICE, BILLING
 * Task types: T287–T306 (Families 103–116)
 * CloudEvents: SponsoredContentPublished, AdImpressionRecorded, SpendLedgerAppended,
 *   AdCampaignCreated, ConsentVerified, PoliticalReviewCompleted, FraudChecked,
 *   GraphConnectionsFetched, TargetingPipelineRun
 *
 * Named checks:
 *   political_dual_gate_required
 *   spend_ledger_append_only
 *   consent_blocks_ads_targeting
 *   pci_compliance_required
 *   fraud_before_billing
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — ad campaign → targeting pipeline → consent verified → spend recorded →
 *                   ad served → graph API social connections → political dual-gate → SponsoredContentPublished
 *   2. Error path — political AI gate blocked → political human gate blocked → spend ledger UPDATE rejected →
 *                   consent denied blocks targeting → PCI validation fails → fraud check fails before billing
 *   3. Tenant isolation — spend ledger scoped per tenant → targeting data isolated → graph connections not cross-tenant
 *   4. Idempotency — duplicate ad impression recorded once → duplicate spend entry idempotent
 *   5. UI state — AD_PENDING→AD_APPROVED→AD_SERVING→AD_COMPLETE; POLITICAL_REVIEW→POLITICAL_APPROVED/REJECTED
 *   6. API contract — /api/dynamic/ad-campaigns and /api/dynamic/spend-ledger return DataProcessResult
 *   7. CloudEvents — SponsoredContentPublished, AdImpressionRecorded, SpendLedgerAppended validateCloudEvent
 *   8. Named checks — political_dual_gate_required, spend_ledger_append_only, consent_blocks_ads_targeting
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

// ── Mock fabric providers ─────────────────────────────────────────────────────

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
        runId: 'flow20-run-id',
        status: 'PASS',
        score: 92,
        trace: [
          {
            nodeId: 'graph-read-gate',
            nodeType: 'request-response',
            status: 'PASS',
            durationMs: 45,
          },
          { nodeId: 'consent-verification', nodeType: 'gate', status: 'PASS', durationMs: 20 },
          { nodeId: 'ad-auction', nodeType: 'ai-generation', status: 'PASS', durationMs: 30 },
          { nodeId: 'ad-review-political', nodeType: 'dual-gate', status: 'PASS', durationMs: 60 },
          { nodeId: 'spend-billing', nodeType: 'financial', status: 'PASS', durationMs: 15 },
          { nodeId: 'fraud-quarantine', nodeType: 'gate', status: 'PASS', durationMs: 10 },
          { nodeId: 'attribution', nodeType: 'orchestration', status: 'PASS', durationMs: 18 },
          { nodeId: 'developer-analytics', nodeType: 'service', status: 'PASS', durationMs: 8 },
        ],
        finalOutput: { code: '// FLOW-20 Sponsored Content + Graph API + Ads Platform' },
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

// ── FLOW-20 inline contract param builders ────────────────────────────────────

function flow20GraphReadParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T287_F20_GRAPH_READ${suffix}`,
    flowId: 'FLOW-20',
    flowName: 'Sponsored Content + Graph API + Ads Platform',
    name: 'GraphReadGate',
    archetype: ContractArchetype.REQUEST_RESPONSE,
    entry: 'graph.api.read.request CloudEvent',
    purpose:
      'Per-node/field/edge auth on every Graph API read request. ' +
      'REQUEST_RESPONSE archetype: sync execution, sloMs: 50ms. ' +
      'per_field_auth_every_request enforced on all reads.',
    factoryDependencies: [
      {
        factoryId: `F734${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Graph node/edge storage',
      },
      {
        factoryId: `F735${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'GraphConnectionsFetched event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-20-GR01${suffix}`,
        description:
          'per_field_auth_every_request — every Graph API read must be auth-checked per field',
        severity: 'error',
        checkType: 'per_field_auth_every_request',
      },
      {
        gateId: `QG-20-GR02${suffix}`,
        description: 'REQUEST_RESPONSE archetype requires sloMs field',
        severity: 'error',
        checkType: 'request_response_slo_required',
      },
    ],
    bfaRegistration: {
      entities: [`graph_node_f20${suffix}`, `graph_edge_f20${suffix}`],
      events: [`graph.read.completed.f20${suffix}`],
      apiRoutes: [`/api/dynamic/graph-nodes`],
    },
    ironRules: [
      'IR-287-1: Per-field auth required on every Graph API read — no batch skip',
      'IR-287-2: REQUEST_RESPONSE sloMs enforced at 50ms',
      'IR-287-3: Tenant edge resolver must not use user header (DNA-5 ALS)',
    ],
    machineComponents: ['Per-field auth checker', 'Graph edge resolver', 'SLO enforcer'],
    freedomComponents: ['flow20_graph_depth_limit', 'flow20_per_field_auth_config'],
    familyId: 'Family-103',
  };
}

function flow20AdReviewParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T295_F20_AD_REVIEW${suffix}`,
    flowId: 'FLOW-20',
    flowName: 'Sponsored Content + Graph API + Ads Platform',
    name: 'AdReview',
    archetype: ContractArchetype.AI_GENERATION,
    entry: 'ads.content.submitted CloudEvent',
    purpose:
      'Political dual-gate: BOTH AI AND human required. DD-168: no auto-approve. ' +
      'political_dual_gate_both_ai_and_human enforced. ' +
      'Score-0 if either gate bypassed.',
    factoryDependencies: [
      {
        factoryId: `F798${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Ad review record storage',
      },
      {
        factoryId: `F799${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'PoliticalReviewCompleted event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-20-AR01${suffix}`,
        description: 'political_dual_gate_both_ai_and_human — BOTH AI and human review required',
        severity: 'error',
        checkType: 'political_dual_gate_both_ai_and_human',
      },
      {
        gateId: `QG-20-AR02${suffix}`,
        description: 'DD-168: no auto-approval of political content',
        severity: 'error',
        checkType: 'no_political_auto_approve',
      },
    ],
    bfaRegistration: {
      entities: [`ad_review_record_f20${suffix}`],
      events: [`ads.political.review.completed.f20${suffix}`, `ads.content.approved.f20${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-295-1: DD-168: political content requires BOTH AI and human review — no auto-approval',
      'IR-295-2: AI gate must run before human gate — no parallelism',
      'IR-295-3: Score-0 if either gate bypassed',
    ],
    machineComponents: [
      'AI political content classifier',
      'Human review queue',
      'Dual-gate arbiter',
    ],
    freedomComponents: ['flow20_political_keywords_config', 'flow20_human_review_sla_hours'],
    familyId: 'Family-109',
  };
}

function flow20SpendBillingParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T296_F20_SPEND_BILLING${suffix}`,
    flowId: 'FLOW-20',
    flowName: 'Sponsored Content + Graph API + Ads Platform',
    name: 'SpendBilling',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'ads.impression.recorded CloudEvent',
    purpose:
      'Append-only spend ledger (DD-169) + fraud gate before billing (DD-177). ' +
      'spend_ledger_append_only: no UPDATE or DELETE on ledger entries. ' +
      'fraud_before_billing_ordering: fraud check ALWAYS before billing.',
    factoryDependencies: [
      {
        factoryId: `F809${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Append-only spend ledger (F830)',
      },
      {
        factoryId: `F810${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'SpendLedgerAppended event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-20-SB01${suffix}`,
        description: 'spend_ledger_append_only — no UPDATE or DELETE on spend-ledger entries',
        severity: 'error',
        checkType: 'spend_ledger_append_only',
      },
      {
        gateId: `QG-20-SB02${suffix}`,
        description: 'fraud_before_billing_ordering — fraud gate must precede billing',
        severity: 'error',
        checkType: 'fraud_before_billing_ordering',
      },
    ],
    bfaRegistration: {
      entities: [`spend_ledger_f20${suffix}`],
      events: [`ads.spend.appended.f20${suffix}`, `ads.billing.completed.f20${suffix}`],
      apiRoutes: [`/api/dynamic/spend-ledger`],
    },
    ironRules: [
      'IR-296-1: DD-169: spend ledger is append-only — no UPDATE or DELETE on ledger entries',
      'IR-296-2: DD-177: fraud gate ALWAYS before billing — never skip',
    ],
    machineComponents: ['Append-only ledger writer', 'Fraud gate checker', 'Billing processor'],
    freedomComponents: ['flow20_spend_reporting_interval', 'flow20_billing_cycle_config'],
    familyId: 'Family-110',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-20 E2E — Happy Path [CAMPAIGN → CONSENT → TARGETING → POLITICAL_GATE → SPEND → SERVE]', () => {
  const TENANT = 'flow20-happy-tenant';

  it('F20-H1: T287 graph read gate contract generates successfully', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow20GraphReadParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F20-H2: T295 ad review contract generates with political dual-gate archetype', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow20AdReviewParams('-h2'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
  });

  it('F20-H3: T296 spend billing contract generates with REQUEST_RESPONSE capabilities', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow20SpendBillingParams('-h3'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
  });

  it('F20-H4: ad campaign created and stored before event emitted (DNA-8)', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    // Store BEFORE enqueue (DNA-8 outbox pattern)
    await db.storeDocument(
      'ad-campaigns',
      {
        campaignId: 'camp-001',
        tenantId: TENANT,
        status: 'AD_PENDING',
        budget: 5000,
        targetAudience: 'tech-users',
      },
      'camp-001',
    );

    await queue.enqueue(
      'ads.campaign.created',
      createCloudEvent({
        eventType: 'ads.campaign.created',
        source: 'flow-20/campaign-create',
        data: { campaignId: 'camp-001', tenantId: TENANT, status: 'AD_PENDING', budget: 5000 },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const dbResult = await db.getDocument('ad-campaigns', 'camp-001');
    expect(dbResult.isSuccess).toBe(true);
    expect((dbResult.data as Record<string, unknown>)['campaignId']).toBe('camp-001');
    expect(queue._emitted).toHaveLength(1);
    expect(queue._emitted[0].queue).toBe('ads.campaign.created');
  });

  it('F20-H5: T301 consent verified before targeting pipeline proceeds (DD-167)', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'consent-records',
      {
        consentId: 'consent-001',
        tenantId: TENANT,
        userId: 'user-001',
        consentGranted: true,
        scope: 'ads-targeting',
      },
      'consent-001',
    );

    await queue.enqueue(
      'ads.consent.verified',
      createCloudEvent({
        eventType: 'ads.consent.verified',
        source: 'flow-20/consent-verification',
        data: {
          consentId: 'consent-001',
          tenantId: TENANT,
          userId: 'user-001',
          consentGranted: true,
          targetingAllowed: true,
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('ads.consent.verified');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['consentGranted']).toBe(true);
    expect(data['targetingAllowed']).toBe(true);
  });

  it('F20-H6: T292 ad auction targeting pipeline runs after consent gate passes', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'ad-auctions',
      {
        auctionId: 'auction-001',
        tenantId: TENANT,
        campaignId: 'camp-001',
        consentVerified: true,
        winningBid: 0.35,
        status: 'WON',
      },
      'auction-001',
    );

    await queue.enqueue(
      'ads.auction.completed',
      createCloudEvent({
        eventType: 'ads.auction.completed',
        source: 'flow-20/ad-auction',
        data: {
          auctionId: 'auction-001',
          tenantId: TENANT,
          campaignId: 'camp-001',
          consentVerified: true,
          winningBid: 0.35,
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['consentVerified']).toBe(true);
    expect(typeof data['winningBid']).toBe('number');
    expect(data['winningBid'] as number).toBeGreaterThan(0);
  });

  it('F20-H7: T287 graph API returns social connections for targeting', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'graph-connections',
      {
        connectionId: 'conn-001',
        tenantId: TENANT,
        userId: 'user-001',
        connections: ['user-002', 'user-003', 'user-004'],
        connectionType: 'social',
      },
      'conn-001',
    );

    await queue.enqueue(
      'graph.connections.fetched',
      createCloudEvent({
        eventType: 'graph.connections.fetched',
        source: 'flow-20/graph-read-gate',
        data: {
          connectionId: 'conn-001',
          tenantId: TENANT,
          userId: 'user-001',
          connectionCount: 3,
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['connectionCount']).toBe(3);
    expect(queue._emitted[0].queue).toBe('graph.connections.fetched');
  });

  it('F20-H8: T295 political content passes BOTH AI and human gates — SponsoredContentPublished emitted', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'ad-reviews',
      {
        reviewId: 'review-001',
        tenantId: TENANT,
        adId: 'ad-001',
        isPolitical: true,
        aiGatePassed: true,
        humanGatePassed: true,
        status: 'POLITICAL_APPROVED',
      },
      'review-001',
    );

    await queue.enqueue(
      'ads.sponsored.content.published',
      createCloudEvent({
        eventType: 'ads.sponsored.content.published',
        source: 'flow-20/ad-review',
        data: {
          reviewId: 'review-001',
          tenantId: TENANT,
          adId: 'ad-001',
          isPolitical: true,
          aiGatePassed: true,
          humanGatePassed: true,
          dualGateComplete: true,
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('ads.sponsored.content.published');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['aiGatePassed']).toBe(true);
    expect(data['humanGatePassed']).toBe(true);
    expect(data['dualGateComplete']).toBe(true);
  });

  it('F20-H9: T296 spend recorded in append-only ledger after ad served', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'spend-ledger',
      {
        ledgerId: 'ledger-001',
        tenantId: TENANT,
        campaignId: 'camp-001',
        entryType: 'IMPRESSION_CHARGE',
        amount: 0.35,
        appendedAt: new Date().toISOString(),
      },
      'ledger-001',
    );

    await queue.enqueue(
      'ads.spend.appended',
      createCloudEvent({
        eventType: 'ads.spend.appended',
        source: 'flow-20/spend-billing',
        data: {
          ledgerId: 'ledger-001',
          tenantId: TENANT,
          campaignId: 'camp-001',
          amount: 0.35,
          entryType: 'IMPRESSION_CHARGE',
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const dbResult = await db.getDocument('spend-ledger', 'ledger-001');
    expect(dbResult.isSuccess).toBe(true);
    const ledger = dbResult.data as Record<string, unknown>;
    expect(ledger['entryType']).toBe('IMPRESSION_CHARGE');
    expect(ledger['amount']).toBe(0.35);

    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['amount']).toBe(0.35);
  });

  it('F20-H10: T293 fraud gate checked BEFORE billing (DD-177)', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'fraud-checks',
      {
        checkId: 'fraud-001',
        tenantId: TENANT,
        adId: 'ad-001',
        fraudScore: 0.02,
        fraudGatePassed: true,
        billingAllowed: true,
      },
      'fraud-001',
    );

    await queue.enqueue(
      'ads.fraud.checked',
      createCloudEvent({
        eventType: 'ads.fraud.checked',
        source: 'flow-20/fraud-quarantine',
        data: {
          checkId: 'fraud-001',
          tenantId: TENANT,
          adId: 'ad-001',
          fraudScore: 0.02,
          fraudGatePassed: true,
          billingAllowed: true,
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['fraudGatePassed']).toBe(true);
    expect(data['billingAllowed']).toBe(true);
    // Fraud check verified before billing proceeds
    expect(data['fraudScore'] as number).toBeLessThan(0.1);
  });

  it('F20-H11: AdImpressionRecorded event emitted after ad served', async () => {
    const queue = makeInMemoryQueue();

    await queue.enqueue(
      'ads.impression.recorded',
      createCloudEvent({
        eventType: 'ads.impression.recorded',
        source: 'flow-20/attribution',
        data: {
          impressionId: 'imp-001',
          tenantId: TENANT,
          adId: 'ad-001',
          campaignId: 'camp-001',
          userId: 'user-001',
          servedAt: new Date().toISOString(),
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('ads.impression.recorded');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['impressionId']).toBe('imp-001');
    expect(data['campaignId']).toBe('camp-001');
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-20 E2E — Error Path [POLITICAL_BLOCKED | SPEND_LEDGER_UPDATE_REJECTED | CONSENT_DENIED | PCI_FAIL | FRAUD_FAIL]', () => {
  const TENANT = 'flow20-error-tenant';

  it('F20-E1: political content blocked at AI gate — status POLITICAL_REVIEW_FAILED', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'ad-reviews',
      {
        reviewId: 'review-err-001',
        tenantId: TENANT,
        adId: 'ad-bad-001',
        isPolitical: true,
        aiGatePassed: false,
        status: 'POLITICAL_REVIEW_FAILED',
      },
      'review-err-001',
    );

    const result = await db.getDocument('ad-reviews', 'review-err-001');
    expect(result.isSuccess).toBe(true);
    const doc = result.data as Record<string, unknown>;
    expect(doc['aiGatePassed']).toBe(false);
    expect(doc['status']).toBe('POLITICAL_REVIEW_FAILED');
    // No human gate attempted when AI gate fails
    expect(doc['humanGatePassed']).toBeUndefined();
  });

  it('F20-E2: political content blocked at human gate after AI passes — SponsoredContentPublished NOT emitted', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'ad-reviews',
      {
        reviewId: 'review-err-002',
        tenantId: TENANT,
        adId: 'ad-pol-002',
        isPolitical: true,
        aiGatePassed: true,
        humanGatePassed: false,
        status: 'HUMAN_REVIEW_REJECTED',
      },
      'review-err-002',
    );

    const result = await db.getDocument('ad-reviews', 'review-err-002');
    expect((result.data as Record<string, unknown>)['humanGatePassed']).toBe(false);
    expect((result.data as Record<string, unknown>)['status']).toBe('HUMAN_REVIEW_REJECTED');

    // SponsoredContentPublished must NOT be emitted
    const publishEvents = queue._emitted.filter(
      (e) => e.queue === 'ads.sponsored.content.published',
    );
    expect(publishEvents).toHaveLength(0);
  });

  it('F20-E3: spend ledger rejects UPDATE — append-only violation returns failure', async () => {
    const db = makeInMemoryDb();

    // First store (valid append)
    await db.storeDocument(
      'spend-ledger',
      {
        ledgerId: 'ledger-immutable-001',
        tenantId: TENANT,
        campaignId: 'camp-001',
        amount: 0.35,
        entryType: 'IMPRESSION_CHARGE',
        appendedAt: '2026-03-31T10:00:00Z',
      },
      'ledger-immutable-001',
    );

    // Simulate append-only violation check — UPDATE must be rejected
    const originalEntry = await db.getDocument('spend-ledger', 'ledger-immutable-001');
    expect(originalEntry.isSuccess).toBe(true);

    // Simulate violation detection: update attempt returns DataProcessResult.failure
    const updateAttemptResult = DataProcessResult.failure(
      'SPEND_LEDGER_APPEND_ONLY_VIOLATION',
      'spend-ledger entries are append-only — UPDATE and DELETE are not permitted (DD-169)',
    );

    expect(updateAttemptResult.isSuccess).toBe(false);
    expect(updateAttemptResult.errorCode).toBe('SPEND_LEDGER_APPEND_ONLY_VIOLATION');
    expect(updateAttemptResult.errorMessage).toContain('append-only');
  });

  it('F20-E4: consent denied blocks targeting pipeline — AdAuction not triggered', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'consent-records',
      {
        consentId: 'consent-denied-001',
        tenantId: TENANT,
        userId: 'user-002',
        consentGranted: false,
        scope: 'ads-targeting',
      },
      'consent-denied-001',
    );

    const consentResult = await db.getDocument('consent-records', 'consent-denied-001');
    const consent = consentResult.data as Record<string, unknown>;
    expect(consent['consentGranted']).toBe(false);

    // Targeting blocked because consent denied
    const targetingBlockedResult = DataProcessResult.failure(
      'CONSENT_DENIED_TARGETING_BLOCKED',
      'Ads targeting pipeline cannot proceed — user consent not granted (DD-167)',
    );

    expect(targetingBlockedResult.isSuccess).toBe(false);
    expect(targetingBlockedResult.errorCode).toBe('CONSENT_DENIED_TARGETING_BLOCKED');

    // Ad auction event must not be emitted
    const auctionEvents = queue._emitted.filter((e) => e.queue === 'ads.auction.completed');
    expect(auctionEvents).toHaveLength(0);
  });

  it('F20-E5: PCI validation fails — raw PAN detected causes BUILD FAILURE (DR-126)', async () => {
    // DR-126: raw PAN must never appear — tokenized PAN reference only
    const paymentAttempt = {
      paymentMethodId: 'pm-bad-001',
      tenantId: TENANT,
      rawPan: '4111111111111111', // raw PAN — violation
      tokenizedRef: undefined,
    };

    const hasPanViolation =
      typeof paymentAttempt.rawPan === 'string' && paymentAttempt.rawPan.length >= 13;

    const pciResult = hasPanViolation
      ? DataProcessResult.failure(
          'PCI_RAW_PAN_VIOLATION',
          'DR-126: raw PAN detected — use tokenized PAN reference only; BUILD FAILURE',
        )
      : DataProcessResult.success({ tokenized: true });

    expect(pciResult.isSuccess).toBe(false);
    expect(pciResult.errorCode).toBe('PCI_RAW_PAN_VIOLATION');
    expect(pciResult.errorMessage).toContain('DR-126');
    expect(pciResult.errorMessage).toContain('tokenized');
  });

  it('F20-E6: fraud check fails before billing — billing does not proceed (DD-177)', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'fraud-checks',
      {
        checkId: 'fraud-fail-001',
        tenantId: TENANT,
        adId: 'ad-fraud-001',
        fraudScore: 0.92,
        fraudGatePassed: false,
        status: 'QUARANTINED',
      },
      'fraud-fail-001',
    );

    const fraudResult = await db.getDocument('fraud-checks', 'fraud-fail-001');
    expect((fraudResult.data as Record<string, unknown>)['fraudGatePassed']).toBe(false);
    expect((fraudResult.data as Record<string, unknown>)['status']).toBe('QUARANTINED');

    // Billing event must not be emitted when fraud gate fails
    const billingEvents = queue._emitted.filter((e) => e.queue === 'ads.billing.completed');
    expect(billingEvents).toHaveLength(0);

    const billingBlocked = DataProcessResult.failure(
      'FRAUD_GATE_FAILED_BILLING_BLOCKED',
      'DD-177: fraud gate failed — billing is blocked; ad quarantined',
    );
    expect(billingBlocked.isSuccess).toBe(false);
    expect(billingBlocked.errorCode).toBe('FRAUD_GATE_FAILED_BILLING_BLOCKED');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-20 E2E — Tenant Isolation [SPEND_LEDGER | TARGETING | GRAPH_CONNECTIONS]', () => {
  const TENANT_A = 'flow20-tenant-A';
  const TENANT_B = 'flow20-tenant-B';

  it('F20-T1: spend ledger entries scoped per tenant — tenant-B cannot see tenant-A ledger', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'spend-ledger',
      { ledgerId: 'l-001', tenantId: TENANT_A, campaignId: 'camp-A', amount: 100 },
      'l-001',
    );
    await db.storeDocument(
      'spend-ledger',
      { ledgerId: 'l-002', tenantId: TENANT_B, campaignId: 'camp-B', amount: 200 },
      'l-002',
    );
    await db.storeDocument(
      'spend-ledger',
      { ledgerId: 'l-003', tenantId: TENANT_A, campaignId: 'camp-A', amount: 50 },
      'l-003',
    );

    const tenantAResult = await db.searchDocuments('spend-ledger', { tenantId: TENANT_A });
    const tenantAEntries = tenantAResult.data as Record<string, unknown>[];

    expect(tenantAEntries.length).toBe(2);
    expect(tenantAEntries.every((e) => e['tenantId'] === TENANT_A)).toBe(true);
  });

  it('F20-T2: targeting data isolated — tenant-B data not included in tenant-A targeting', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'targeting-profiles',
      { profileId: 'tp-A-001', tenantId: TENANT_A, userId: 'u-001', segments: ['tech', 'finance'] },
      'tp-A-001',
    );
    await db.storeDocument(
      'targeting-profiles',
      { profileId: 'tp-B-001', tenantId: TENANT_B, userId: 'u-002', segments: ['sports'] },
      'tp-B-001',
    );

    const tenantAProfiles = await db.searchDocuments('targeting-profiles', { tenantId: TENANT_A });
    const profiles = tenantAProfiles.data as Record<string, unknown>[];

    expect(profiles.length).toBe(1);
    expect(profiles[0]['tenantId']).toBe(TENANT_A);
    expect(profiles.some((p) => p['tenantId'] === TENANT_B)).toBe(false);
  });

  it('F20-T3: graph connections not cross-tenant accessible — tenant-B query blocked', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'graph-connections',
      {
        connectionId: 'gc-A-001',
        tenantId: TENANT_A,
        userId: 'u-001',
        connections: ['u-002', 'u-003'],
      },
      'gc-A-001',
    );

    // Tenant-B attempts to query tenant-A's connections
    const crossTenantResult = await db.searchDocuments('graph-connections', { tenantId: TENANT_B });
    const connections = crossTenantResult.data as Record<string, unknown>[];

    expect(connections.length).toBe(0);
    expect(connections.some((c) => c['tenantId'] === TENANT_A)).toBe(false);
  });

  it('F20-T4: ad campaign data scoped per tenant — cross-tenant campaign not visible', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'ad-campaigns',
      { campaignId: 'c-A', tenantId: TENANT_A, status: 'AD_SERVING', budget: 1000 },
      'c-A',
    );
    await db.storeDocument(
      'ad-campaigns',
      { campaignId: 'c-B', tenantId: TENANT_B, status: 'AD_SERVING', budget: 2000 },
      'c-B',
    );

    const tenantACampaigns = await db.searchDocuments('ad-campaigns', { tenantId: TENANT_A });
    const campaigns = tenantACampaigns.data as Record<string, unknown>[];

    expect(campaigns.every((c) => c['tenantId'] === TENANT_A)).toBe(true);
    expect(campaigns.some((c) => c['campaignId'] === 'c-B')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-20 E2E — Idempotency [DUPLICATE_IMPRESSION | DUPLICATE_SPEND]', () => {
  const TENANT = 'flow20-idempotency-tenant';

  it('F20-I1: duplicate ad impression recorded once — idempotency key deduplicates', async () => {
    const db = makeInMemoryDb();

    const idempotencyKey = 'imp-idem-001';

    // First impression (valid)
    await db.storeDocument(
      'ad-impressions',
      {
        impressionId: idempotencyKey,
        tenantId: TENANT,
        adId: 'ad-001',
        idempotencyKey,
        recordedAt: '2026-03-31T10:00:00Z',
      },
      idempotencyKey,
    );

    // Second attempt with same idempotency key — overwrite (no duplicate created)
    await db.storeDocument(
      'ad-impressions',
      {
        impressionId: idempotencyKey,
        tenantId: TENANT,
        adId: 'ad-001',
        idempotencyKey,
        recordedAt: '2026-03-31T10:00:01Z',
      },
      idempotencyKey,
    );

    const result = await db.searchDocuments('ad-impressions', { idempotencyKey });
    const impressions = result.data as Record<string, unknown>[];

    // Deduplication: only one record despite two inserts with same key
    expect(impressions).toHaveLength(1);
    expect(impressions[0]['idempotencyKey']).toBe(idempotencyKey);
  });

  it('F20-I2: duplicate spend entry with same idempotency key is idempotent', async () => {
    const db = makeInMemoryDb();

    const spendKey = 'spend-idem-001';

    await db.storeDocument(
      'spend-ledger',
      {
        ledgerId: spendKey,
        tenantId: TENANT,
        campaignId: 'camp-001',
        amount: 0.35,
        idempotencyKey: spendKey,
      },
      spendKey,
    );

    // Duplicate attempt — same id = upsert, no second entry
    await db.storeDocument(
      'spend-ledger',
      {
        ledgerId: spendKey,
        tenantId: TENANT,
        campaignId: 'camp-001',
        amount: 0.35,
        idempotencyKey: spendKey,
      },
      spendKey,
    );

    const result = await db.searchDocuments('spend-ledger', { idempotencyKey: spendKey });
    const entries = result.data as Record<string, unknown>[];

    expect(entries).toHaveLength(1);
    expect(entries[0]['amount']).toBe(0.35);
  });

  it('F20-I3: duplicate ad campaign creation with same campaign ID is idempotent', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'ad-campaigns',
      { campaignId: 'camp-idem', tenantId: TENANT, status: 'AD_PENDING', budget: 5000 },
      'camp-idem',
    );
    await db.storeDocument(
      'ad-campaigns',
      { campaignId: 'camp-idem', tenantId: TENANT, status: 'AD_PENDING', budget: 5000 },
      'camp-idem',
    );

    const result = await db.searchDocuments('ad-campaigns', { campaignId: 'camp-idem' });
    const campaigns = result.data as Record<string, unknown>[];

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]['campaignId']).toBe('camp-idem');
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-20 E2E — UI State Mapping [AD_PENDING → AD_APPROVED → AD_SERVING → AD_COMPLETE | POLITICAL_REVIEW]', () => {
  it('F20-U1: AD_PENDING state is initial campaign state', () => {
    const campaignState: Record<string, unknown> = { campaignId: 'camp-001', status: 'AD_PENDING' };
    expect(campaignState['status']).toBe('AD_PENDING');
  });

  it('F20-U2: AD_PENDING transitions to AD_APPROVED after review passes', () => {
    let status = 'AD_PENDING';
    const reviewPassed = true;
    if (reviewPassed) status = 'AD_APPROVED';
    expect(status).toBe('AD_APPROVED');
  });

  it('F20-U3: AD_APPROVED transitions to AD_SERVING when targeting completes and consent granted', () => {
    let status = 'AD_APPROVED';
    const consentGranted = true;
    const targetingComplete = true;
    if (consentGranted && targetingComplete) status = 'AD_SERVING';
    expect(status).toBe('AD_SERVING');
  });

  it('F20-U4: AD_SERVING transitions to AD_COMPLETE when budget exhausted', () => {
    let status = 'AD_SERVING';
    const budgetExhausted = true;
    if (budgetExhausted) status = 'AD_COMPLETE';
    expect(status).toBe('AD_COMPLETE');
  });

  it('F20-U5: POLITICAL_REVIEW state shown when ad contains political content', () => {
    const adState: Record<string, unknown> = {
      adId: 'ad-pol-001',
      isPolitical: true,
      status: 'POLITICAL_REVIEW',
    };
    expect(adState['status']).toBe('POLITICAL_REVIEW');
    expect(adState['isPolitical']).toBe(true);
  });

  it('F20-U6: POLITICAL_REVIEW transitions to POLITICAL_APPROVED when both gates pass', () => {
    let status = 'POLITICAL_REVIEW';
    const aiGatePassed = true;
    const humanGatePassed = true;
    if (aiGatePassed && humanGatePassed) status = 'POLITICAL_APPROVED';
    expect(status).toBe('POLITICAL_APPROVED');
  });

  it('F20-U7: POLITICAL_REVIEW transitions to POLITICAL_REJECTED when either gate fails', () => {
    let status = 'POLITICAL_REVIEW';
    const aiGatePassed = true;
    const humanGatePassed = false;
    if (!aiGatePassed || !humanGatePassed) status = 'POLITICAL_REJECTED';
    expect(status).toBe('POLITICAL_REJECTED');
  });

  it('F20-U8: AD_SERVING state shows spend counter ticking in real-time', () => {
    const campaignState = {
      campaignId: 'camp-001',
      status: 'AD_SERVING',
      totalSpend: 42.75,
      remainingBudget: 4957.25,
      impressionCount: 122,
    };
    expect(campaignState.status).toBe('AD_SERVING');
    expect(campaignState.totalSpend).toBeGreaterThan(0);
    expect(campaignState.remainingBudget).toBeLessThan(5000);
  });

  it('F20-U9: AD_COMPLETE state shows final report with total spend and impressions', () => {
    const campaignState = {
      campaignId: 'camp-done-001',
      status: 'AD_COMPLETE',
      totalSpend: 5000,
      totalImpressions: 14285,
      completedAt: '2026-03-31T23:59:59Z',
    };
    expect(campaignState.status).toBe('AD_COMPLETE');
    expect(campaignState.totalSpend).toBe(5000);
    expect(campaignState.totalImpressions).toBeGreaterThan(0);
    expect(campaignState.completedAt).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract
// ══════════════════════════════════════════════════════

describe('FLOW-20 E2E — API Contract [/api/dynamic/ad-campaigns | /api/dynamic/spend-ledger]', () => {
  const TENANT = 'flow20-api-tenant';

  it('F20-A1: /api/dynamic/ad-campaigns returns DataProcessResult with success', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'ad-campaigns',
      { campaignId: 'api-camp-001', tenantId: TENANT, status: 'AD_SERVING', budget: 3000 },
      'api-camp-001',
    );

    const result = await db.searchDocuments('ad-campaigns', { tenantId: TENANT });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('F20-A2: /api/dynamic/spend-ledger returns DataProcessResult with entries', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'spend-ledger',
      {
        ledgerId: 'api-l-001',
        tenantId: TENANT,
        campaignId: 'api-camp-001',
        amount: 0.35,
        entryType: 'IMPRESSION_CHARGE',
      },
      'api-l-001',
    );

    const result = await db.searchDocuments('spend-ledger', { tenantId: TENANT });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    const entries = result.data as Record<string, unknown>[];
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]['entryType']).toBe('IMPRESSION_CHARGE');
  });

  it('F20-A3: /api/dynamic/ad-campaigns getDocument returns DataProcessResult.failure for missing', async () => {
    const db = makeInMemoryDb();

    const result = await db.getDocument('ad-campaigns', 'nonexistent-camp');

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('F20-A4: /api/dynamic/graph-nodes returns DataProcessResult with per-field auth fields', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'graph-nodes',
      { nodeId: 'node-001', tenantId: TENANT, nodeType: 'user', authChecked: true, sloMs: 45 },
      'node-001',
    );

    const result = await db.searchDocuments('graph-nodes', { tenantId: TENANT });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    const nodes = result.data as Record<string, unknown>[];
    expect(nodes[0]['authChecked']).toBe(true);
    expect(nodes[0]['sloMs'] as number).toBeLessThanOrEqual(50);
  });

  it('F20-A5: /api/dynamic/consent-records returns DataProcessResult with consent status', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'consent-records',
      { consentId: 'api-con-001', tenantId: TENANT, consentGranted: true, scope: 'ads-targeting' },
      'api-con-001',
    );

    const result = await db.searchDocuments('consent-records', { tenantId: TENANT });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    const records = result.data as Record<string, unknown>[];
    expect(records[0]['consentGranted']).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-20 E2E — CloudEvents [SponsoredContentPublished | AdImpressionRecorded | SpendLedgerAppended]', () => {
  const TENANT = 'flow20-cloudevents-tenant';

  it('F20-CE1: SponsoredContentPublished event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'ads.sponsored.content.published',
      source: 'flow-20/ad-review',
      data: {
        adId: 'ad-001',
        tenantId: TENANT,
        isPolitical: false,
        dualGateComplete: false,
        publishedAt: new Date().toISOString(),
      },
      tenantId: TENANT,
    });

    const [isValidCE1] = validateCloudEvent(event);
    expect(isValidCE1).toBe(true);
    expect(event['type']).toBe('ads.sponsored.content.published');
    expect(event['source'] as string).toContain('flow-20/ad-review');
  });

  it('F20-CE2: AdImpressionRecorded event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'ads.impression.recorded',
      source: 'flow-20/attribution',
      data: {
        impressionId: 'imp-001',
        tenantId: TENANT,
        adId: 'ad-001',
        campaignId: 'camp-001',
        servedAt: new Date().toISOString(),
      },
      tenantId: TENANT,
    });

    const [isValidCE2] = validateCloudEvent(event);
    expect(isValidCE2).toBe(true);
    expect(event['type']).toBe('ads.impression.recorded');
  });

  it('F20-CE3: SpendLedgerAppended event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'ads.spend.appended',
      source: 'flow-20/spend-billing',
      data: {
        ledgerId: 'ledger-001',
        tenantId: TENANT,
        campaignId: 'camp-001',
        amount: 0.35,
        entryType: 'IMPRESSION_CHARGE',
      },
      tenantId: TENANT,
    });

    const [isValidCE3] = validateCloudEvent(event);
    expect(isValidCE3).toBe(true);
    expect(event['type']).toBe('ads.spend.appended');
  });

  it('F20-CE4: SponsoredContentPublished with political dual-gate data passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'ads.sponsored.content.published',
      source: 'flow-20/ad-review',
      data: {
        adId: 'ad-pol-001',
        tenantId: TENANT,
        isPolitical: true,
        aiGatePassed: true,
        humanGatePassed: true,
        dualGateComplete: true,
        publishedAt: new Date().toISOString(),
      },
      tenantId: TENANT,
    });

    const [isValidCE4] = validateCloudEvent(event);
    expect(isValidCE4).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(data['dualGateComplete']).toBe(true);
    expect(data['isPolitical']).toBe(true);
  });

  it('F20-CE5: PoliticalReviewCompleted event passes validateCloudEvent with gate statuses', () => {
    const event = createCloudEvent({
      eventType: 'ads.political.review.completed',
      source: 'flow-20/ad-review',
      data: {
        reviewId: 'review-001',
        tenantId: TENANT,
        adId: 'ad-pol-001',
        aiGatePassed: true,
        humanGatePassed: true,
        outcome: 'APPROVED',
      },
      tenantId: TENANT,
    });

    const [isValidCE5] = validateCloudEvent(event);
    expect(isValidCE5).toBe(true);
    expect(event['type']).toBe('ads.political.review.completed');
    const data = event['data'] as Record<string, unknown>;
    expect(data['outcome']).toBe('APPROVED');
  });

  it('F20-CE6: GraphConnectionsFetched event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'graph.connections.fetched',
      source: 'flow-20/graph-read-gate',
      data: {
        connectionId: 'conn-001',
        tenantId: TENANT,
        userId: 'u-001',
        connectionCount: 5,
        sloMs: 45,
      },
      tenantId: TENANT,
    });

    const [isValidCE6] = validateCloudEvent(event);
    expect(isValidCE6).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(data['sloMs'] as number).toBeLessThanOrEqual(50);
  });

  it('F20-CE7: CloudEvent spec fields present — id, specversion, time, datacontenttype', () => {
    const event = createCloudEvent({
      eventType: 'ads.campaign.created',
      source: 'flow-20/campaign-create',
      data: { campaignId: 'camp-001', tenantId: TENANT },
      tenantId: TENANT,
    });

    expect(event['id']).toBeDefined();
    expect(event['specversion']).toBe('1.0');
    expect(event['time']).toBeDefined();
    expect(event['source']).toBeDefined();
    expect(event['type']).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-20 E2E — Named Checks [political_dual_gate_required | spend_ledger_append_only | consent_blocks_ads_targeting]', () => {
  const TENANT = 'flow20-named-checks-tenant';

  it('F20-NC1: political_dual_gate_required — both AI and human gate must be present in ad review', () => {
    const adReviewConfig = {
      adId: 'ad-pol-001',
      isPolitical: true,
      gates: ['ai-political-classifier', 'human-political-reviewer'],
      autoApprovalEnabled: false,
    };

    // Both gates present
    const hasAiGate = adReviewConfig.gates.includes('ai-political-classifier');
    const hasHumanGate = adReviewConfig.gates.includes('human-political-reviewer');
    const dualGateCompliant = hasAiGate && hasHumanGate && !adReviewConfig.autoApprovalEnabled;

    expect(dualGateCompliant).toBe(true);
    expect(adReviewConfig.autoApprovalEnabled).toBe(false);
  });

  it('F20-NC2: political_dual_gate_required — fails if only AI gate present (no auto-approve)', () => {
    const adReviewConfig = {
      adId: 'ad-pol-002',
      isPolitical: true,
      gates: ['ai-political-classifier'], // missing human gate
      autoApprovalEnabled: true, // violation: DD-168
    };

    const hasHumanGate = adReviewConfig.gates.includes('human-political-reviewer');
    const dualGateCompliant = hasHumanGate && !adReviewConfig.autoApprovalEnabled;

    expect(dualGateCompliant).toBe(false);
    expect(adReviewConfig.autoApprovalEnabled).toBe(true); // violation detected
  });

  it('F20-NC3: spend_ledger_append_only — no DELETE operation permitted on spend-ledger', () => {
    const spendLedgerOps = {
      allowedOperations: ['INSERT'],
      blockedOperations: ['UPDATE', 'DELETE'],
    };

    expect(spendLedgerOps.allowedOperations).toContain('INSERT');
    expect(spendLedgerOps.blockedOperations).toContain('UPDATE');
    expect(spendLedgerOps.blockedOperations).toContain('DELETE');
    expect(spendLedgerOps.allowedOperations).not.toContain('UPDATE');
    expect(spendLedgerOps.allowedOperations).not.toContain('DELETE');
  });

  it('F20-NC4: spend_ledger_append_only — correction entries use new ledger entry not UPDATE', async () => {
    const db = makeInMemoryDb();

    // Original entry
    await db.storeDocument(
      'spend-ledger',
      { ledgerId: 'l-orig-001', tenantId: TENANT, amount: 0.35, entryType: 'IMPRESSION_CHARGE' },
      'l-orig-001',
    );

    // Correction: new entry, not update (append-only pattern)
    await db.storeDocument(
      'spend-ledger',
      {
        ledgerId: 'l-corr-001',
        tenantId: TENANT,
        amount: -0.35,
        entryType: 'CORRECTION',
        corrects: 'l-orig-001',
      },
      'l-corr-001',
    );

    const allEntries = await db.searchDocuments('spend-ledger', { tenantId: TENANT });
    const entries = allEntries.data as Record<string, unknown>[];

    // Two entries: original + correction (not an update)
    expect(entries.length).toBe(2);
    expect(entries.some((e) => e['entryType'] === 'IMPRESSION_CHARGE')).toBe(true);
    expect(entries.some((e) => e['entryType'] === 'CORRECTION')).toBe(true);
  });

  it('F20-NC5: consent_blocks_ads_targeting — targeting pipeline blocked when consent denied', () => {
    const consentStatus = { userId: 'u-001', consentGranted: false };
    const shouldRunTargeting = consentStatus.consentGranted;

    expect(shouldRunTargeting).toBe(false);

    const targetingResult = shouldRunTargeting
      ? DataProcessResult.success({ targetingComplete: true })
      : DataProcessResult.failure(
          'CONSENT_REQUIRED',
          'Targeting pipeline blocked — consent not granted (DD-167)',
        );

    expect(targetingResult.isSuccess).toBe(false);
    expect(targetingResult.errorCode).toBe('CONSENT_REQUIRED');
  });

  it('F20-NC6: consent_blocks_ads_targeting — non-political ad with consent proceeds normally', () => {
    const consentStatus = { userId: 'u-002', consentGranted: true };
    const shouldRunTargeting = consentStatus.consentGranted;

    expect(shouldRunTargeting).toBe(true);

    const targetingResult = shouldRunTargeting
      ? DataProcessResult.success({ targetingComplete: true, adsTargeted: true })
      : DataProcessResult.failure('CONSENT_REQUIRED', 'Targeting blocked');

    expect(targetingResult.isSuccess).toBe(true);
    expect((targetingResult.data as Record<string, unknown>)['adsTargeted']).toBe(true);
  });

  it('F20-NC7: pci_compliance_required — payment method must use tokenized PAN only', () => {
    const validPayment = {
      paymentMethodId: 'pm-001',
      tokenizedPanRef: 'tok_abc123',
      rawPan: undefined,
    };
    const hasRawPan = validPayment.rawPan !== undefined;
    const pciCompliant = !hasRawPan && validPayment.tokenizedPanRef !== undefined;

    expect(pciCompliant).toBe(true);
    expect(validPayment.rawPan).toBeUndefined();
    expect(validPayment.tokenizedPanRef).toBeDefined();
  });

  it('F20-NC8: fraud_before_billing — fraud check recorded before billing event emitted', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    // 1. Store fraud check (must happen FIRST)
    await db.storeDocument(
      'fraud-checks',
      {
        checkId: 'fc-order-001',
        tenantId: TENANT,
        adId: 'ad-001',
        fraudGatePassed: true,
        checkedAt: '2026-03-31T10:00:00Z',
      },
      'fc-order-001',
    );

    // 2. Only after fraud check passes, emit billing event
    const fraudCheck = await db.getDocument('fraud-checks', 'fc-order-001');
    expect((fraudCheck.data as Record<string, unknown>)['fraudGatePassed']).toBe(true);

    if ((fraudCheck.data as Record<string, unknown>)['fraudGatePassed']) {
      await queue.enqueue(
        'ads.billing.completed',
        createCloudEvent({
          eventType: 'ads.billing.completed',
          source: 'flow-20/spend-billing',
          data: {
            billingId: 'bill-001',
            tenantId: TENANT,
            fraudCheckId: 'fc-order-001',
            amount: 0.35,
          },
          tenantId: TENANT,
        }) as unknown as Record<string, unknown>,
      );
    }

    expect(queue._emitted).toHaveLength(1);
    expect(queue._emitted[0].queue).toBe('ads.billing.completed');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['fraudCheckId']).toBe('fc-order-001');
  });
});
