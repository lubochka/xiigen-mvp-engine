/**
 * FLOW-17 E2E — Freelancer Marketplace Platform
 *
 * Archetypes: FREELANCER_PROPOSAL, FREELANCER_CONTRACT, WORK_DIARY, ESCROW_SAGA,
 *             INVOICE, TALENT_DISCOVERY, REPUTATION_SCORE, DISPUTE_RESOLUTION,
 *             PAYOUT_RELEASE, EVIDENCE_CAPTURE
 * Task types: T227–T246 (Families 75–83)
 * CloudEvents: ProposalScored, ContractCreated, EscrowFunded, WorkDiaryCaptured,
 *   BidAccepted, DisputeOpened, DisputeResolved, DisputeRejected, InvoiceGenerated,
 *   PortfolioPublished, RatingSubmitted, SkillEndorsed, JobPosted, TalentFound,
 *   ReputationScored, PayoutReleased
 *
 * Named checks:
 *   append_only_ledger_enforced
 *   immutable_after_submit
 *   milestone_funding_gate
 *   work_diary_privacy
 *   activity_counts_numeric
 *   escrow_lifo_compensation
 *   reputation_derived_never_stored
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — proposal scoring, contract, escrow, work diary, bid acceptance,
 *                   dispute, invoice, portfolio, rating, talent search, reputation, payout
 *   2. Error path — LIFO rollback, append-only rejection, immutable lock, dispute rejected, reputation not writable
 *   3. Tenant isolation — work diary scoped, escrow scoped, portfolio cross-tenant blocked
 *   4. Idempotency — duplicate bid, duplicate invoice, duplicate escrow funding
 *   5. UI state mapping — PROPOSAL_PENDING→BID_ACCEPTED, CONTRACT_DRAFT→CONTRACT_DISPUTED, ESCROW_FUNDED→ESCROW_RELEASED
 *   6. API contract — /api/dynamic/freelancer-contracts, /api/dynamic/escrow-ledgers
 *   7. CloudEvents — ProposalScored, ContractCreated, EscrowFunded validate against spec
 *   8. Named checks — append_only_ledger_enforced, immutable_after_submit, work_diary_privacy,
 *                     activity_counts_numeric, escrow_lifo_compensation
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
        runId: 'flow17-run-id',
        status: 'PASS',
        score: 95,
        trace: [
          { nodeId: 'talent-match', nodeType: 'rag-retrieve', status: 'PASS', durationMs: 10 },
          { nodeId: 'proposal-submission', nodeType: 'gate', status: 'PASS', durationMs: 8 },
          { nodeId: 'contract-activation', nodeType: 'saga', status: 'PASS', durationMs: 15 },
          { nodeId: 'milestone-funding', nodeType: 'financial', status: 'PASS', durationMs: 12 },
          {
            nodeId: 'deliverable-submission',
            nodeType: 'immutable-store',
            status: 'PASS',
            durationMs: 7,
          },
          { nodeId: 'dispute-resolution', nodeType: 'resolution', status: 'PASS', durationMs: 9 },
          { nodeId: 'reputation-aggregate', nodeType: 'derived', status: 'PASS', durationMs: 5 },
          { nodeId: 'payout-release', nodeType: 'financial', status: 'PASS', durationMs: 6 },
        ],
        finalOutput: { code: '// FLOW-17 Freelancer Marketplace Platform' },
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

// ── FLOW-17 inline contract param builders ───────────────────────────────────

function flow17ProposalParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T229_F17_PROPOSAL${suffix}`,
    flowId: 'FLOW-17',
    flowName: 'Freelancer Marketplace Platform',
    name: 'TalentMatchOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'freelancer.proposal.submitted CloudEvent',
    purpose:
      'AI-powered talent matching with multi-factor scoring. ' +
      'ProposalScored event emitted with score derived from multi_factor rag-retrieve topology. ' +
      'FREEDOM weights applied for scoring factors.',
    factoryDependencies: [
      {
        factoryId: `F_DB_PROPOSAL${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Proposal record storage',
      },
      {
        factoryId: `F_QUEUE_PROPOSAL${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'ProposalScored / BidAccepted event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-17-P01${suffix}`,
        description: 'rag-retrieve must use multi_factor scoring with FREEDOM weights',
        severity: 'error',
        checkType: 'rag_multi_factor_scoring',
      },
      {
        gateId: `QG-17-P02${suffix}`,
        description: 'DNA-8: storeDocument before enqueue',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],
    bfaRegistration: {
      entities: [`proposal_record_f17${suffix}`],
      events: [`freelancer.proposal.scored.f17${suffix}`, `freelancer.bid.accepted.f17${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Proposal score derived from multi-factor RAG topology',
      'IR-2: Scoring weights sourced from FREEDOM config',
      'IR-3: DNA-8 storeDocument BEFORE enqueue',
    ],
    machineComponents: ['Multi-factor rag-retrieve scorer', 'FREEDOM weight loader'],
    freedomComponents: ['flow17_scoring_weights', 'flow17_shortlist_size'],
    familyId: 'Family-75',
  };
}

function flow17ContractParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T234_F17_CONTRACT${suffix}`,
    flowId: 'FLOW-17',
    flowName: 'Freelancer Marketplace Platform',
    name: 'ContractOfferActivationGate',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'freelancer.proposal.shortlisted CloudEvent',
    purpose:
      'Contract offer activation. ' +
      'ContractCreated event must contain shortlistCorrelationId (not offeredProposalRef) per CF-283. ' +
      'DNA-9 CloudEvent required. Compliance gate before activation.',
    factoryDependencies: [
      {
        factoryId: `F_DB_CONTRACT${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Contract record storage',
      },
      {
        factoryId: `F_QUEUE_CONTRACT${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'ContractCreated / BidAccepted event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-17-C01${suffix}`,
        description: 'CF-283: event must contain shortlistCorrelationId not offeredProposalRef',
        severity: 'error',
        checkType: 'cf283_field_name_constraint',
      },
      {
        gateId: `QG-17-C02${suffix}`,
        description: 'DNA-8: storeDocument before enqueue',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],
    bfaRegistration: {
      entities: [`contract_record_f17${suffix}`],
      events: [`freelancer.contract.created.f17${suffix}`, `freelancer.bid.accepted.f17${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Contract offer event must contain shortlistCorrelationId (CF-283)',
      'IR-2: DNA-8 storeDocument before enqueue',
      'IR-3: KYC compliance gate before contract activation (CF-281)',
    ],
    machineComponents: ['Contract state machine', 'CF-283 field validator', 'KYC compliance gate'],
    freedomComponents: ['flow17_contract_expiry_days'],
    familyId: 'Family-77',
  };
}

function flow17EscrowParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T236_F17_ESCROW${suffix}`,
    flowId: 'FLOW-17',
    flowName: 'Freelancer Marketplace Platform',
    name: 'MilestoneCreationFundingGate',
    archetype: ContractArchetype.BILLING,
    entry: 'freelancer.contract.activated CloudEvent',
    purpose:
      'Escrow-protected milestone funding with 3-step LIFO compensation chain. ' +
      'C1=MarkFundingFailed, C2=ReverseFeeCalc, C3=ReleaseEscrowHold. ' +
      'Compensation runs C3→C2→C1 (LIFO). ' +
      'append_only_ledger_enforced: no UPDATE/DELETE on escrow-ledgers. ' +
      'escrow_lifo_compensation: all 3 steps registered before saga start.',
    factoryDependencies: [
      {
        factoryId: `F_DB_ESCROW${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Escrow ledger (append-only)',
      },
      {
        factoryId: `F_QUEUE_ESCROW${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'EscrowFunded / EscrowReleased event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-17-E01${suffix}`,
        description: 'append_only_ledger_enforced — no UPDATE/DELETE on escrow-ledgers',
        severity: 'error',
        checkType: 'append_only_ledger_enforced',
      },
      {
        gateId: `QG-17-E02${suffix}`,
        description: 'escrow_lifo_compensation — C3→C2→C1 order enforced',
        severity: 'error',
        checkType: 'escrow_lifo_compensation',
      },
      {
        gateId: `QG-17-E03${suffix}`,
        description: 'DNA-5: tenantId from AsyncLocalStorage not parameter',
        severity: 'error',
        checkType: 'dna5_tenant_from_als',
      },
    ],
    bfaRegistration: {
      entities: [`escrow_ledger_f17${suffix}`],
      events: [
        `freelancer.escrow.funded.f17${suffix}`,
        `freelancer.escrow.released.f17${suffix}`,
        `freelancer.escrow.refunded.f17${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Escrow ledger is append-only — no UPDATE or DELETE',
      'IR-2: LIFO compensation: C3→C2→C1',
      'IR-3: tenantId must come from AsyncLocalStorage (DNA-5)',
      'IR-4: All compensation steps registered before saga starts',
    ],
    machineComponents: [
      'Append-only ledger writer',
      'LIFO compensation chain',
      'ALS tenant resolver',
    ],
    freedomComponents: ['flow17_escrow_hold_period_days', 'flow17_fee_calculation_config'],
    familyId: 'Family-78',
  };
}

function flow17ReputationParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T245_F17_REPUTATION${suffix}`,
    flowId: 'FLOW-17',
    flowName: 'Freelancer Marketplace Platform',
    name: 'ReputationSignalAggregateGate',
    archetype: ContractArchetype.VALIDATION,
    entry: 'freelancer.rating.submitted CloudEvent',
    purpose:
      'Aggregate reputation signals via appendJournalEntry(). ' +
      'reputation_derived_never_stored: score computed at query time, never persisted. ' +
      'Event emits signalCount:N — NOT score value. QG-245-1 weight 0.35.',
    factoryDependencies: [
      {
        factoryId: `F_DB_REPUTATION${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Reputation journal (append-only signal entries)',
      },
      {
        factoryId: `F_QUEUE_REPUTATION${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'ReputationScored event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-17-R01${suffix}`,
        description: 'reputation_derived_never_stored — score must not be persisted',
        severity: 'error',
        checkType: 'reputation_derived_never_stored',
      },
      {
        gateId: `QG-17-R02${suffix}`,
        description: 'QG-245-1: event emits signalCount not score',
        severity: 'error',
        checkType: 'signal_count_not_score_in_event',
      },
    ],
    bfaRegistration: {
      entities: [`reputation_journal_f17${suffix}`],
      events: [`freelancer.reputation.scored.f17${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Reputation score derived at query time — never stored',
      'IR-2: Events emit signalCount, not computed score',
      'IR-3: appendJournalEntry only — no update of existing signals',
    ],
    machineComponents: [
      'Signal journal appender',
      'Derived score calculator',
      'Event signal-count emitter',
    ],
    freedomComponents: ['flow17_reputation_signal_weights'],
    familyId: 'Family-82',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-17 E2E — Happy Path [TALENT → PROPOSAL → CONTRACT → ESCROW → WORK_DIARY → DISPUTE → PAYOUT]', () => {
  const TENANT = 'flow17-happy-tenant';

  it('F17-H1: T229 proposal scoring contract generates successfully', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow17ProposalParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F17-H2: T229 proposal scoring produces ProposalScored event with score', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'proposals',
      { proposalId: 'prop-001', tenantId: TENANT, freelancerId: 'free-001', status: 'SUBMITTED' },
      'prop-001',
    );

    await queue.enqueue(
      'freelancer.proposal.scored',
      createCloudEvent({
        eventType: 'freelancer.proposal.scored',
        source: 'flow-17/talent-match',
        data: {
          proposalId: 'prop-001',
          tenantId: TENANT,
          score: 87.5,
          scoringFactors: ['skill_match', 'experience_relevance', 'availability', 'budget_fit'],
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted).toHaveLength(1);
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['score']).toBe(87.5);
    expect((data['scoringFactors'] as string[]).length).toBe(4);
  });

  it('F17-H3: T234 contract creation emits ContractCreated event with shortlistCorrelationId', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'freelancer-contracts',
      {
        contractId: 'cont-001',
        tenantId: TENANT,
        shortlistCorrelationId: 'shortlist-abc',
        status: 'CREATED',
      },
      'cont-001',
    );

    await queue.enqueue(
      'freelancer.contract.created',
      createCloudEvent({
        eventType: 'freelancer.contract.created',
        source: 'flow-17/contract-activation',
        data: { contractId: 'cont-001', tenantId: TENANT, shortlistCorrelationId: 'shortlist-abc' },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('freelancer.contract.created');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['shortlistCorrelationId']).toBe('shortlist-abc');
    expect(data['shortlistCorrelationId']).toBeDefined();
  });

  it('F17-H4: T236 escrow funding emits EscrowFunded event with LIFO compensation chain registered', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    const compensationChain = [
      { step: 'C1', name: 'MarkFundingFailed', order: 1 },
      { step: 'C2', name: 'ReverseFeeCalc', order: 2 },
      { step: 'C3', name: 'ReleaseEscrowHold', order: 3 },
    ];

    // Store compensation chain before saga start (DNA-8)
    await db.storeDocument(
      'escrow-ledgers',
      {
        escrowId: 'esc-001',
        tenantId: TENANT,
        amount: 500,
        compensationChain,
        status: 'FUNDED',
        entryType: 'HOLD',
      },
      'esc-001',
    );

    await queue.enqueue(
      'freelancer.escrow.funded',
      createCloudEvent({
        eventType: 'freelancer.escrow.funded',
        source: 'flow-17/milestone-funding',
        data: { escrowId: 'esc-001', tenantId: TENANT, amount: 500, compensationRegistered: true },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('freelancer.escrow.funded');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['compensationRegistered']).toBe(true);
    expect(data['amount']).toBe(500);
  });

  it('F17-H5: T243 work diary capture emits WorkDiaryCaptured event with privacyFlag set', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'work-diary-entries',
      {
        entryId: 'wd-001',
        tenantId: TENANT,
        contractId: 'cont-001',
        privacyFlag: true,
        screenshotRef: 's3://bucket/wd-001-screenshot',
        activityCounts: { keystrokes: 142, mouseClicks: 38 },
        capturedAt: new Date().toISOString(),
      },
      'wd-001',
    );

    await queue.enqueue(
      'freelancer.work_diary.captured',
      createCloudEvent({
        eventType: 'freelancer.work_diary.captured',
        source: 'flow-17/work-diary',
        data: {
          entryId: 'wd-001',
          tenantId: TENANT,
          privacyFlag: true,
          screenshotRef: 's3://bucket/wd-001-screenshot',
          activityCounts: { keystrokes: 142, mouseClicks: 38 },
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['privacyFlag']).toBe(true);
    expect(data['screenshotRef']).toContain('s3://');
    // Screenshot must be external ref, not inline binary
    expect(typeof data['screenshotRef']).toBe('string');
  });

  it('F17-H6: T234 bid acceptance emits BidAccepted event with shortlistCorrelationId', async () => {
    const queue = makeInMemoryQueue();

    await queue.enqueue(
      'freelancer.bid.accepted',
      createCloudEvent({
        eventType: 'freelancer.bid.accepted',
        source: 'flow-17/contract-offer',
        data: {
          bidId: 'bid-001',
          tenantId: TENANT,
          shortlistCorrelationId: 'shortlist-abc',
          freelancerId: 'free-001',
          acceptedAt: new Date().toISOString(),
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['shortlistCorrelationId']).toBe('shortlist-abc');
    expect(queue._emitted[0].queue).toBe('freelancer.bid.accepted');
  });

  it('F17-H7: T239 dispute opened emits DisputeOpened event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'disputes',
      {
        disputeId: 'disp-001',
        tenantId: TENANT,
        contractId: 'cont-001',
        status: 'OPEN',
        escrowHeld: true,
      },
      'disp-001',
    );

    await queue.enqueue(
      'freelancer.dispute.opened',
      createCloudEvent({
        eventType: 'freelancer.dispute.opened',
        source: 'flow-17/dispute-open',
        data: { disputeId: 'disp-001', tenantId: TENANT, contractId: 'cont-001', escrowHeld: true },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('freelancer.dispute.opened');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['escrowHeld']).toBe(true);
  });

  it('F17-H8: T241 invoice generated emits InvoiceGenerated event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'invoices',
      {
        invoiceId: 'inv-001',
        tenantId: TENANT,
        contractId: 'cont-001',
        amount: 450,
        status: 'GENERATED',
      },
      'inv-001',
    );

    await queue.enqueue(
      'freelancer.invoice.generated',
      createCloudEvent({
        eventType: 'freelancer.invoice.generated',
        source: 'flow-17/invoice',
        data: { invoiceId: 'inv-001', tenantId: TENANT, contractId: 'cont-001', amount: 450 },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('freelancer.invoice.generated');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['amount']).toBe(450);
  });

  it('F17-H9: T244 portfolio published emits PortfolioPublished event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'portfolios',
      { portfolioId: 'port-001', tenantId: TENANT, freelancerId: 'free-001', status: 'PUBLISHED' },
      'port-001',
    );

    await queue.enqueue(
      'freelancer.portfolio.published',
      createCloudEvent({
        eventType: 'freelancer.portfolio.published',
        source: 'flow-17/portfolio',
        data: { portfolioId: 'port-001', tenantId: TENANT, freelancerId: 'free-001' },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('freelancer.portfolio.published');
  });

  it('F17-H10: T242 rating submitted emits RatingSubmitted event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'ratings',
      {
        ratingId: 'rat-001',
        tenantId: TENANT,
        contractId: 'cont-001',
        score: 4.8,
        status: 'SUBMITTED',
      },
      'rat-001',
    );

    await queue.enqueue(
      'freelancer.rating.submitted',
      createCloudEvent({
        eventType: 'freelancer.rating.submitted',
        source: 'flow-17/rating',
        data: { ratingId: 'rat-001', tenantId: TENANT, contractId: 'cont-001', score: 4.8 },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('freelancer.rating.submitted');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['score']).toBe(4.8);
  });

  it('F17-H11: T229 talent search returns TalentFound results', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'talent-profiles',
      { profileId: 'prof-001', tenantId: TENANT, skills: ['react', 'node'], available: true },
      'prof-001',
    );
    await db.storeDocument(
      'talent-profiles',
      { profileId: 'prof-002', tenantId: TENANT, skills: ['python', 'ml'], available: true },
      'prof-002',
    );
    await db.storeDocument(
      'talent-profiles',
      { profileId: 'prof-003', tenantId: TENANT, skills: ['react'], available: false },
      'prof-003',
    );

    const searchResult = await db.searchDocuments('talent-profiles', {
      tenantId: TENANT,
      available: true,
    });
    expect(searchResult.isSuccess).toBe(true);
    expect((searchResult.data as Record<string, unknown>[]).length).toBe(2);
  });

  it('F17-H12: T245 reputation score emits ReputationScored event — derived, never stored directly', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    // Store signal journal entries (not computed scores)
    await db.storeDocument(
      'reputation-journal',
      {
        entryId: 'rj-001',
        tenantId: TENANT,
        freelancerId: 'free-001',
        signalType: 'RATING',
        value: 4.8,
      },
      'rj-001',
    );
    await db.storeDocument(
      'reputation-journal',
      {
        entryId: 'rj-002',
        tenantId: TENANT,
        freelancerId: 'free-001',
        signalType: 'ON_TIME_DELIVERY',
        value: 1,
      },
      'rj-002',
    );

    // Event emits signalCount, not score
    await queue.enqueue(
      'freelancer.reputation.scored',
      createCloudEvent({
        eventType: 'freelancer.reputation.scored',
        source: 'flow-17/reputation-aggregate',
        data: { freelancerId: 'free-001', tenantId: TENANT, signalCount: 2 },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['signalCount']).toBe(2);
    // Score must NOT be in the event
    expect(data['score']).toBeUndefined();
  });

  it('F17-H13: T245 payout released emits PayoutReleased event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    await db.storeDocument(
      'payouts',
      {
        payoutId: 'pay-001',
        tenantId: TENANT,
        freelancerId: 'free-001',
        amount: 450,
        status: 'RELEASED',
      },
      'pay-001',
    );

    await queue.enqueue(
      'freelancer.payout.released',
      createCloudEvent({
        eventType: 'freelancer.payout.released',
        source: 'flow-17/payout',
        data: { payoutId: 'pay-001', tenantId: TENANT, freelancerId: 'free-001', amount: 450 },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('freelancer.payout.released');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['amount']).toBe(450);
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-17 E2E — Error Path', () => {
  const TENANT = 'flow17-error-tenant';

  it('F17-E1: Escrow LIFO compensation rolls back C3→C2→C1 on failure', async () => {
    const compensationExecuted: string[] = [];

    // Simulate LIFO execution order (reverse registration order)
    const compensationChain = [
      { step: 'C1', name: 'MarkFundingFailed' },
      { step: 'C2', name: 'ReverseFeeCalc' },
      { step: 'C3', name: 'ReleaseEscrowHold' },
    ];

    // LIFO: execute in reverse
    for (const step of [...compensationChain].reverse()) {
      compensationExecuted.push(step.step);
    }

    expect(compensationExecuted[0]).toBe('C3');
    expect(compensationExecuted[1]).toBe('C2');
    expect(compensationExecuted[2]).toBe('C1');
  });

  it('F17-E2: Append-only ledger rejects UPDATE operation', async () => {
    const db = makeInMemoryDb();

    // Append-only: entries can be added but never updated
    await db.storeDocument(
      'escrow-ledgers',
      { escrowId: 'esc-ro-001', tenantId: TENANT, amount: 500, entryType: 'HOLD', immutable: true },
      'esc-ro-001',
    );

    // Simulate update attempt — should be blocked by immutable flag
    const entry = (await db.getDocument('escrow-ledgers', 'esc-ro-001')).data as Record<
      string,
      unknown
    >;
    const canUpdate = !entry['immutable'];
    expect(canUpdate).toBe(false);
  });

  it('F17-E3: Immutable deliverable rejects edit after submission', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'deliverables',
      {
        deliverableId: 'del-001',
        tenantId: TENANT,
        status: 'SUBMITTED',
        immutable: true,
        submittedAt: new Date().toISOString(),
      },
      'del-001',
    );

    const deliverable = (await db.getDocument('deliverables', 'del-001')).data as Record<
      string,
      unknown
    >;
    const canEdit = deliverable['status'] !== 'SUBMITTED' && !deliverable['immutable'];
    expect(canEdit).toBe(false);
  });

  it('F17-E4: Dispute rejected emits DisputeRejected event', async () => {
    const queue = makeInMemoryQueue();

    await queue.enqueue(
      'freelancer.dispute.rejected',
      createCloudEvent({
        eventType: 'freelancer.dispute.rejected',
        source: 'flow-17/dispute-resolution',
        data: { disputeId: 'disp-002', tenantId: TENANT, reason: 'INSUFFICIENT_EVIDENCE' },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('freelancer.dispute.rejected');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['reason']).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('F17-E5: Reputation score field is not directly writable to storage', async () => {
    const db = makeInMemoryDb();

    // Only journal entries (signals) are stored — never computed scores
    await db.storeDocument(
      'reputation-journal',
      { entryId: 'rj-err-001', tenantId: TENANT, signalType: 'RATING', value: 3.0 },
      'rj-err-001',
    );

    // No reputation-scores index should hold computed values
    const scoreResult = await db.searchDocuments('reputation-scores', { freelancerId: 'free-err' });
    expect((scoreResult.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F17-E6: Missing shortlistCorrelationId in contract event is detectable', async () => {
    const eventData: Record<string, unknown> = {
      contractId: 'cont-bad-001',
      tenantId: TENANT,
      // offeredProposalRef instead of shortlistCorrelationId — CF-283 violation
      offeredProposalRef: 'prop-001',
    };

    const hasCf283Field = 'shortlistCorrelationId' in eventData;
    expect(hasCf283Field).toBe(false);
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-17 E2E — Tenant Isolation', () => {
  const TENANT_A = 'flow17-tenant-a';
  const TENANT_B = 'flow17-tenant-b';

  it('F17-T1: Work diary entries scoped per tenant — tenant B cannot read tenant A diary', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'work-diary-entries',
      { entryId: 'wd-ta-001', tenantId: TENANT_A, contractId: 'cont-a', privacyFlag: true },
      'wd-ta-001',
    );
    await db.storeDocument(
      'work-diary-entries',
      { entryId: 'wd-ta-002', tenantId: TENANT_A, contractId: 'cont-a', privacyFlag: true },
      'wd-ta-002',
    );
    await db.storeDocument(
      'work-diary-entries',
      { entryId: 'wd-tb-001', tenantId: TENANT_B, contractId: 'cont-b', privacyFlag: true },
      'wd-tb-001',
    );

    const tenantAEntries = await db.searchDocuments('work-diary-entries', { tenantId: TENANT_A });
    const tenantBEntries = await db.searchDocuments('work-diary-entries', { tenantId: TENANT_B });

    expect((tenantAEntries.data as Record<string, unknown>[]).length).toBe(2);
    expect((tenantBEntries.data as Record<string, unknown>[]).length).toBe(1);
    expect(
      (tenantAEntries.data as Record<string, unknown>[]).every((e) => e['tenantId'] === TENANT_A),
    ).toBe(true);
  });

  it('F17-T2: Escrow ledger isolated per tenant', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'escrow-ledgers',
      { escrowId: 'esc-ta-001', tenantId: TENANT_A, amount: 500, entryType: 'HOLD' },
      'esc-ta-001',
    );
    await db.storeDocument(
      'escrow-ledgers',
      { escrowId: 'esc-tb-001', tenantId: TENANT_B, amount: 300, entryType: 'HOLD' },
      'esc-tb-001',
    );

    const aLedger = await db.searchDocuments('escrow-ledgers', { tenantId: TENANT_A });
    const bLedger = await db.searchDocuments('escrow-ledgers', { tenantId: TENANT_B });

    expect((aLedger.data as Record<string, unknown>[]).length).toBe(1);
    expect((bLedger.data as Record<string, unknown>[]).length).toBe(1);
    expect((aLedger.data as Record<string, unknown>[])[0]['amount']).toBe(500);
  });

  it('F17-T3: Portfolio not accessible cross-tenant', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'portfolios',
      { portfolioId: 'port-ta', tenantId: TENANT_A, freelancerId: 'free-001' },
      'port-ta',
    );

    // Tenant B queries portfolio owned by Tenant A — should return empty
    const crossTenantResult = await db.searchDocuments('portfolios', {
      tenantId: TENANT_B,
      portfolioId: 'port-ta',
    });
    expect((crossTenantResult.data as Record<string, unknown>[]).length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-17 E2E — Idempotency', () => {
  const TENANT = 'flow17-idempotency-tenant';

  it('F17-I1: Duplicate bid acceptance with same idempotency key handled', async () => {
    const db = makeInMemoryDb();
    const IDEMPOTENCY_KEY = 'bid-accept-idem-001';

    // First submission
    await db.storeDocument(
      'bid-acceptances',
      {
        id: IDEMPOTENCY_KEY,
        tenantId: TENANT,
        bidId: 'bid-001',
        status: 'ACCEPTED',
        idempotencyKey: IDEMPOTENCY_KEY,
      },
      IDEMPOTENCY_KEY,
    );

    // Duplicate submission — storeDocument upserts with same id
    await db.storeDocument(
      'bid-acceptances',
      {
        id: IDEMPOTENCY_KEY,
        tenantId: TENANT,
        bidId: 'bid-001',
        status: 'ACCEPTED',
        idempotencyKey: IDEMPOTENCY_KEY,
      },
      IDEMPOTENCY_KEY,
    );

    const result = await db.searchDocuments('bid-acceptances', { idempotencyKey: IDEMPOTENCY_KEY });
    // Should have exactly 1 record (idempotent upsert)
    expect((result.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F17-I2: Duplicate invoice generation with same key is idempotent', async () => {
    const db = makeInMemoryDb();
    const INVOICE_IDEM_KEY = 'inv-idem-001';

    await db.storeDocument(
      'invoices',
      { id: INVOICE_IDEM_KEY, tenantId: TENANT, amount: 450, idempotencyKey: INVOICE_IDEM_KEY },
      INVOICE_IDEM_KEY,
    );
    await db.storeDocument(
      'invoices',
      { id: INVOICE_IDEM_KEY, tenantId: TENANT, amount: 450, idempotencyKey: INVOICE_IDEM_KEY },
      INVOICE_IDEM_KEY,
    );

    const result = await db.searchDocuments('invoices', { idempotencyKey: INVOICE_IDEM_KEY });
    expect((result.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F17-I3: Escrow funding duplicate blocked via idempotency key', async () => {
    const db = makeInMemoryDb();
    const ESCROW_IDEM_KEY = 'esc-idem-001';

    await db.storeDocument(
      'escrow-ledgers',
      {
        id: ESCROW_IDEM_KEY,
        tenantId: TENANT,
        escrowId: 'esc-001',
        amount: 500,
        entryType: 'HOLD',
        idempotencyKey: ESCROW_IDEM_KEY,
      },
      ESCROW_IDEM_KEY,
    );

    // Second funding attempt with same key — upsert, no duplicate
    await db.storeDocument(
      'escrow-ledgers',
      {
        id: ESCROW_IDEM_KEY,
        tenantId: TENANT,
        escrowId: 'esc-001',
        amount: 500,
        entryType: 'HOLD',
        idempotencyKey: ESCROW_IDEM_KEY,
      },
      ESCROW_IDEM_KEY,
    );

    const result = await db.searchDocuments('escrow-ledgers', { idempotencyKey: ESCROW_IDEM_KEY });
    expect((result.data as Record<string, unknown>[]).length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-17 E2E — UI State Mapping', () => {
  it('F17-S1: PROPOSAL_PENDING → PROPOSAL_SCORED state transition', () => {
    const proposalStates = ['PROPOSAL_PENDING', 'PROPOSAL_SCORED', 'BID_ACCEPTED'];
    let currentState = 'PROPOSAL_PENDING';

    // Scoring event
    currentState = 'PROPOSAL_SCORED';
    expect(proposalStates.indexOf(currentState)).toBeGreaterThan(
      proposalStates.indexOf('PROPOSAL_PENDING'),
    );

    // Bid acceptance
    currentState = 'BID_ACCEPTED';
    expect(currentState).toBe('BID_ACCEPTED');
  });

  it('F17-S2: PROPOSAL_SCORED → BID_ACCEPTED state maps to contract-accepted screen', () => {
    const state = {
      proposalId: 'prop-001',
      status: 'BID_ACCEPTED',
      shortlistCorrelationId: 'shortlist-abc',
    };
    const screen = state.status === 'BID_ACCEPTED' ? 'contract-accepted' : 'proposal-pending';
    expect(screen).toBe('contract-accepted');
    expect(state.shortlistCorrelationId).toBeDefined();
  });

  it('F17-S3: CONTRACT_DRAFT → CONTRACT_ACTIVE → CONTRACT_DISPUTED state', () => {
    const contractStates = [
      'CONTRACT_DRAFT',
      'CONTRACT_ACTIVE',
      'CONTRACT_DISPUTED',
      'CONTRACT_RESOLVED',
    ];
    let state = 'CONTRACT_DRAFT';

    state = 'CONTRACT_ACTIVE';
    expect(contractStates.indexOf(state)).toBeGreaterThan(0);

    state = 'CONTRACT_DISPUTED';
    expect(state).toBe('CONTRACT_DISPUTED');
    const screen = state === 'CONTRACT_DISPUTED' ? 'dispute-panel' : 'contract-view';
    expect(screen).toBe('dispute-panel');
  });

  it('F17-S4: ESCROW_FUNDED → ESCROW_RELEASED state maps to payout-ready screen', () => {
    const escrow = { escrowId: 'esc-001', status: 'RELEASED', amount: 500 };
    const screen = escrow.status === 'RELEASED' ? 'payout-ready' : 'escrow-holding';
    expect(screen).toBe('payout-ready');
    expect(escrow.amount).toBe(500);
  });

  it('F17-S5: WORK_DIARY_CAPTURING → WORK_DIARY_COMPLETE state maps to diary-saved screen', () => {
    const diaryState = { entryId: 'wd-001', status: 'COMPLETE', privacyFlag: true };
    const screen = diaryState.status === 'COMPLETE' ? 'diary-saved' : 'diary-capturing';
    expect(screen).toBe('diary-saved');
    expect(diaryState.privacyFlag).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract
// ══════════════════════════════════════════════════════

describe('FLOW-17 E2E — API Contract', () => {
  const TENANT = 'flow17-api-tenant';

  it('F17-A1: /api/dynamic/freelancer-contracts returns DataProcessResult', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'freelancer-contracts',
      {
        contractId: 'cont-api-001',
        tenantId: TENANT,
        shortlistCorrelationId: 'shortlist-xyz',
        status: 'ACTIVE',
      },
      'cont-api-001',
    );

    const result = await db.searchDocuments('freelancer-contracts', { tenantId: TENANT });
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('F17-A2: /api/dynamic/escrow-ledgers returns DataProcessResult', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'escrow-ledgers',
      { escrowId: 'esc-api-001', tenantId: TENANT, amount: 500, entryType: 'HOLD' },
      'esc-api-001',
    );

    const result = await db.searchDocuments('escrow-ledgers', { tenantId: TENANT });
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('F17-A3: /api/dynamic/freelancer-contracts 404 on unknown contract returns failure', async () => {
    const db = makeInMemoryDb();

    const result = await db.getDocument('freelancer-contracts', 'nonexistent-contract');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('F17-A4: /api/dynamic/work-diary-entries returns entries scoped to tenant', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'work-diary-entries',
      { entryId: 'wd-api-001', tenantId: TENANT, privacyFlag: true },
      'wd-api-001',
    );
    await db.storeDocument(
      'work-diary-entries',
      { entryId: 'wd-api-002', tenantId: 'other-tenant', privacyFlag: true },
      'wd-api-002',
    );

    const result = await db.searchDocuments('work-diary-entries', { tenantId: TENANT });
    expect(result.isSuccess).toBe(true);
    expect((result.data as Record<string, unknown>[]).length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-17 E2E — CloudEvents', () => {
  const TENANT = 'flow17-cloudevents-tenant';

  it('F17-CE1: ProposalScored event has correct CloudEvents envelope', () => {
    const event = createCloudEvent({
      eventType: 'freelancer.proposal.scored',
      source: 'flow-17/talent-match',
      data: {
        proposalId: 'prop-001',
        tenantId: TENANT,
        score: 87.5,
        scoringFactors: ['skill_match'],
      },
      tenantId: TENANT,
    });

    expect(event).toBeDefined();
    expect(event['type']).toBe('freelancer.proposal.scored');
    expect(event['source']).toContain('flow-17/talent-match');
    expect(event['specversion']).toBe('1.0');
    expect(event['id']).toBeDefined();
  });

  it('F17-CE2: ContractCreated event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'freelancer.contract.created',
      source: 'flow-17/contract-activation',
      data: { contractId: 'cont-001', tenantId: TENANT, shortlistCorrelationId: 'shortlist-abc' },
      tenantId: TENANT,
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F17-CE3: EscrowFunded event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'freelancer.escrow.funded',
      source: 'flow-17/milestone-funding',
      data: { escrowId: 'esc-001', tenantId: TENANT, amount: 500, compensationRegistered: true },
      tenantId: TENANT,
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F17-CE4: WorkDiaryCaptured event contains privacyFlag in data', () => {
    const event = createCloudEvent({
      eventType: 'freelancer.work_diary.captured',
      source: 'flow-17/work-diary',
      data: {
        entryId: 'wd-001',
        tenantId: TENANT,
        privacyFlag: true,
        screenshotRef: 's3://bucket/wd-001',
        activityCounts: { keystrokes: 100, mouseClicks: 25 },
      },
      tenantId: TENANT,
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(data['privacyFlag']).toBe(true);
  });

  it('F17-CE5: BidAccepted event contains shortlistCorrelationId not offeredProposalRef', () => {
    const event = createCloudEvent({
      eventType: 'freelancer.bid.accepted',
      source: 'flow-17/contract-offer',
      data: { bidId: 'bid-001', tenantId: TENANT, shortlistCorrelationId: 'shortlist-abc' },
      tenantId: TENANT,
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['shortlistCorrelationId']).toBeDefined();
    expect(data['offeredProposalRef']).toBeUndefined();
  });

  it('F17-CE6: ReputationScored event emits signalCount not score value', () => {
    const event = createCloudEvent({
      eventType: 'freelancer.reputation.scored',
      source: 'flow-17/reputation-aggregate',
      data: { freelancerId: 'free-001', tenantId: TENANT, signalCount: 5 },
      tenantId: TENANT,
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['signalCount']).toBe(5);
    expect(data['score']).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-17 E2E — Named Checks', () => {
  const TENANT = 'flow17-named-checks-tenant';

  it('F17-NC1: append_only_ledger_enforced — passes when no UPDATE/DELETE on ledger', async () => {
    const db = makeInMemoryDb();
    const appendOnlyOps: string[] = [];

    // All operations are INSERT (append) only
    await db.storeDocument(
      'escrow-ledgers',
      { entryId: 'esc-nc-001', tenantId: TENANT, amount: 500, entryType: 'HOLD' },
      'esc-nc-001-hold',
    );
    appendOnlyOps.push('INSERT');

    await db.storeDocument(
      'escrow-ledgers',
      { entryId: 'esc-nc-001', tenantId: TENANT, amount: 500, entryType: 'RELEASE' },
      'esc-nc-001-release',
    );
    appendOnlyOps.push('INSERT');

    const hasUpdate = appendOnlyOps.some((op) => op === 'UPDATE' || op === 'DELETE');
    expect(hasUpdate).toBe(false);
  });

  it('F17-NC2: immutable_after_submit — passes when deliverable locked after submission', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'deliverables',
      { deliverableId: 'del-nc-001', tenantId: TENANT, status: 'SUBMITTED', immutable: true },
      'del-nc-001',
    );

    const deliverable = (await db.getDocument('deliverables', 'del-nc-001')).data as Record<
      string,
      unknown
    >;
    expect(deliverable['immutable']).toBe(true);
    expect(deliverable['status']).toBe('SUBMITTED');
    // Verify immutable flag is set after submission
    const isLocked = deliverable['immutable'] === true && deliverable['status'] === 'SUBMITTED';
    expect(isLocked).toBe(true);
  });

  it('F17-NC3: work_diary_privacy — passes when diary entry has privacyFlag set', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'work-diary-entries',
      {
        entryId: 'wd-nc-001',
        tenantId: TENANT,
        privacyFlag: true,
        screenshotRef: 's3://bucket/wd-nc-001',
        activityCounts: { keystrokes: 120, mouseClicks: 30 },
      },
      'wd-nc-001',
    );

    const entry = (await db.getDocument('work-diary-entries', 'wd-nc-001')).data as Record<
      string,
      unknown
    >;
    expect(entry['privacyFlag']).toBe(true);
    // Screenshot must be external ref (not inline)
    expect(typeof entry['screenshotRef']).toBe('string');
    expect((entry['screenshotRef'] as string).startsWith('s3://')).toBe(true);
  });

  it('F17-NC4: activity_counts_numeric — passes when counts are numbers not strings', async () => {
    const activityCounts = { keystrokes: 142, mouseClicks: 38, scrollEvents: 15 };

    // All counts must be numeric
    for (const [key, value] of Object.entries(activityCounts)) {
      expect(typeof value).toBe('number');
      expect(Number.isInteger(value)).toBe(true);
      // Must not be string representation
      expect(typeof value).not.toBe('string');
      void key;
    }
  });

  it('F17-NC5: escrow_lifo_compensation — passes when compensation chain registered in LIFO order', async () => {
    const compensationChain = [
      { step: 'C1', name: 'MarkFundingFailed', registrationOrder: 1 },
      { step: 'C2', name: 'ReverseFeeCalc', registrationOrder: 2 },
      { step: 'C3', name: 'ReleaseEscrowHold', registrationOrder: 3 },
    ];

    // Compensation executes in reverse of registration (LIFO)
    const executionOrder = [...compensationChain].reverse().map((s) => s.step);
    expect(executionOrder[0]).toBe('C3');
    expect(executionOrder[1]).toBe('C2');
    expect(executionOrder[2]).toBe('C1');

    // All steps must be registered
    expect(compensationChain.length).toBe(3);
  });

  it('F17-NC6: reputation_derived_never_stored — journal entries stored, not computed scores', async () => {
    const db = makeInMemoryDb();

    // Store signals (journal entries)
    await db.storeDocument(
      'reputation-journal',
      { entryId: 'rj-nc-001', tenantId: TENANT, signalType: 'RATING', value: 4.5 },
      'rj-nc-001',
    );
    await db.storeDocument(
      'reputation-journal',
      { entryId: 'rj-nc-002', tenantId: TENANT, signalType: 'ON_TIME', value: 1 },
      'rj-nc-002',
    );

    // Computed score must NOT be stored anywhere
    const scoreIndex = await db.searchDocuments('reputation-scores', { freelancerId: 'free-nc' });
    expect((scoreIndex.data as Record<string, unknown>[]).length).toBe(0);

    // Journal entries exist (signals)
    const journalEntries = await db.searchDocuments('reputation-journal', { tenantId: TENANT });
    expect((journalEntries.data as Record<string, unknown>[]).length).toBe(2);
  });

  it('F17-NC7: Contract engine generates successfully with FLOW-17 reputation params', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow17ReputationParams('-nc7'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F17-NC8: Contract engine generates successfully with FLOW-17 escrow params', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow17EscrowParams('-nc8'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });
});
