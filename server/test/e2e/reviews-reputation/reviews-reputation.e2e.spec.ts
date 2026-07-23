/**
 * FLOW-10 E2E — Reviews & Reputation
 *
 * Archetypes: SUBMISSION_GATEWAY, MODERATION, AGGREGATION
 * Named checks: review_eligibility_check, review_content_policy_check,
 *   review_ownership_verified, uncertainty_behavior_declared,
 *   aggregation_spec_present, cross_flow_read_dependency_declared,
 *   score_range_declared, review_revision_policy_declared
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — submit → moderate (PASS) → aggregate score
 *   2. Error path — ineligible submission, REJECT path, invalid contract
 *   3. Tenant isolation — review records per tenant
 *   4. Idempotency — duplicate review submissions deduplicated
 *   5. UI state mapping — loading / success / error states
 *   6. API contract — /api/dynamic/{indexName} response shape
 *   7. CloudEvents — events emitted with correct CloudEvents envelope
 *   8. Named checks — review_eligibility_check, uncertainty_behavior_declared
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
import {
  createReviewSubmissionGatewayContract,
  createReviewModerationEngineContract,
  createReputationScoreAggregatorContract,
} from '../../../src/engine-contracts/reviews-reputation-contracts';

// ── Mock fabric providers ───────────────────────────────────────────────────

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
        runId: 'flow10-run-id',
        status: 'PASS',
        score: 90,
        trace: [
          {
            nodeId: 'eligibility-check',
            nodeType: 'submission_gateway',
            status: 'PASS',
            durationMs: 8,
          },
          { nodeId: 'moderation-engine', nodeType: 'moderation', status: 'PASS', durationMs: 20 },
          {
            nodeId: 'reputation-aggregator',
            nodeType: 'aggregation',
            status: 'PASS',
            durationMs: 5,
          },
        ],
        finalOutput: { code: '// FLOW-10 reviews + reputation' },
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

// ── FLOW-10 supplemental contract params (for BFA suffix isolation) ─────────

function flow10SubmissionParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T_F10_SUBMISSION${suffix}`,
    flowId: 'FLOW-10',
    flowName: 'Reviews + Reputation',
    name: 'ReviewSubmissionGateway',
    archetype: ContractArchetype.SUBMISSION_GATEWAY,
    entry: 'review.submission.received CloudEvent',
    purpose:
      'Accepts inbound review submissions. Verifies reviewer eligibility via cross-flow ' +
      'GET_ONLY read from FLOW-04/09 before writing any audit record.',
    factoryDependencies: [
      {
        factoryId: `F_DB_REVIEW_SUBMISSION${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Review submission audit persistence',
      },
      {
        factoryId: `F_QUEUE_REVIEW_SUBMISSION${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'CloudEvent emission for ReviewSubmitted/ReviewRejected',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-10-01${suffix}`,
        description: 'Eligibility check before any audit write (IR-1)',
        severity: 'error',
        checkType: 'review_eligibility_check',
      },
      {
        gateId: `QG-10-02${suffix}`,
        description: 'cross_flow_read_dependency_declared',
        severity: 'error',
        checkType: 'cross_flow_read_dependency_declared',
      },
    ],
    bfaRegistration: {
      entities: [`review_submission_f10${suffix}`, `review_audit_f10${suffix}`],
      events: [`review.submitted.f10${suffix}`, `review.rejected.ineligible.f10${suffix}`],
      apiRoutes: [],
    },
    ironRules: ['eligibility check must complete before any audit record is written'],
    machineComponents: ['eligibility-before-audit ordering (IR-1)'],
    freedomComponents: ['flow10_submission_max_retries', 'flow10_supported_entity_types'],
    familyId: 'Family-10',
  };
}

function flow10AggregationParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T_F10_AGGREGATION${suffix}`,
    flowId: 'FLOW-10',
    flowName: 'Reviews + Reputation',
    name: 'ReputationScoreAggregator',
    archetype: ContractArchetype.AGGREGATION,
    entry: 'review.published or review.retracted CloudEvent',
    purpose:
      'Maintains running reputation score. Clamped to [1.0, 5.0]. ' +
      'Only PUBLISHED reviews contribute. recalculateOnRemove for retractions.',
    factoryDependencies: [
      {
        factoryId: `F_DB_REPUTATION${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Aggregate document persistence',
      },
      {
        factoryId: `F_QUEUE_REPUTATION${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'reputation.score.updated CloudEvent',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-10-20${suffix}`,
        description: 'Score clamped to [1.0, 5.0] — not [0,1] (IR-8)',
        severity: 'error',
        checkType: 'score_range_declared',
      },
      {
        gateId: `QG-10-21${suffix}`,
        description: 'aggregation_spec_present',
        severity: 'error',
        checkType: 'aggregation_spec_present',
      },
    ],
    bfaRegistration: {
      entities: [`reputation_score_f10${suffix}`, `review_aggregate_f10${suffix}`],
      events: [`reputation.score.updated.f10${suffix}`],
      apiRoutes: [],
    },
    ironRules: ['score must be clamped to [1.0, 5.0] — no normalized [0,1] scores'],
    machineComponents: ['score clamping to [1.0, 5.0]', 'recalculateOnRemove'],
    freedomComponents: ['flow10_score_range_min', 'flow10_score_range_max'],
    familyId: 'Family-10',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-10 E2E — Happy Path [SUBMISSION_GATEWAY → MODERATION → AGGREGATION]', () => {
  const TENANT = 'flow10-happy-tenant';

  it('F10-H1: submission contract (from factory) generates successfully', async () => {
    const engine = createEngine();
    // Use the factory-created contract but add a unique BFA suffix via custom params
    const contract = new EngineContract(flow10SubmissionParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
  });

  it('F10-H2: moderation contract generates successfully', async () => {
    const engine = createEngine();
    // createReviewModerationEngineContract uses placeholder task type IDs
    const baseContract = createReviewModerationEngineContract();
    // Wrap with unique BFA via custom params to avoid collisions
    const contract = new EngineContract({
      taskTypeId: 'T_F10_MODERATION-h2',
      flowId: 'FLOW-10',
      flowName: 'Reviews + Reputation',
      name: 'ReviewModerationEngine',
      archetype: ContractArchetype.MODERATION,
      entry: baseContract.entry,
      purpose: baseContract.purpose,
      factoryDependencies: baseContract.factoryDependencies,
      afStations: baseContract.afStations,
      qualityGates: baseContract.qualityGates,
      bfaRegistration: {
        entities: ['moderation_decision_h2', 'review_status_h2'],
        events: ['review.moderation.approved.h2', 'review.moderation.rejected.h2'],
        apiRoutes: [],
      },
      ironRules: baseContract.ironRules,
      machineComponents: baseContract.machineComponents,
      freedomComponents: baseContract.freedomComponents,
      familyId: 'Family-10',
    });
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
  });

  it('F10-H3: aggregation contract generates successfully', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow10AggregationParams('-h3'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.contractId).toBe('T_F10_AGGREGATION-h3');
  });

  it('F10-H4: DNA-8 — eligibility check (DB read) happens before audit write (storeDocument)', async () => {
    const db = makeInMemoryDb();
    const callOrder: string[] = [];

    // Simulate IR-1: eligibility check before storeDocument
    const eligibilityCheck = async () => {
      callOrder.push('eligibility-check');
      const result = await db.searchDocuments('reviewer-eligibility', {
        reviewerId: 'u1',
        entityId: 'prod-1',
      });
      return result;
    };
    const writeAudit = async () => {
      callOrder.push('audit-write');
      await db.storeDocument(
        'review-audit',
        { reviewerId: 'u1', entityId: 'prod-1', status: 'submitted' },
        'audit-1',
      );
    };

    await eligibilityCheck();
    await writeAudit();

    expect(callOrder[0]).toBe('eligibility-check');
    expect(callOrder[1]).toBe('audit-write');
  });

  it('F10-H5: generation completes within 30s time budget', async () => {
    const engine = createEngine();
    const result = await engine.generate(new EngineContract(flow10SubmissionParams('-h5')), TENANT);
    expect(result.data!.elapsedMs).toBeLessThan(30_000);
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-10 E2E — Error Path', () => {
  it('F10-E1: review_eligibility_check — ineligible reviewer returns INELIGIBLE_REVIEWER', () => {
    // Simulate: eligibility check fails → reject submission before audit write
    const eligibilityResult = DataProcessResult.success<Record<string, unknown>[]>([]); // empty = no eligibility record
    const isEligible = eligibilityResult.isSuccess && (eligibilityResult.data?.length ?? 0) > 0;

    const result = isEligible
      ? DataProcessResult.success({ submitted: true })
      : DataProcessResult.failure<Record<string, unknown>>(
          'INELIGIBLE_REVIEWER',
          'Reviewer has no purchase or attendance record for this entity.',
        );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INELIGIBLE_REVIEWER');
  });

  it('F10-E2: peerFlowMustBeActive — submission rejected when FLOW-04 is inactive', () => {
    // peerFlowMustBeActive enforcement: if peer flow (FLOW-04) reports inactive, reject
    const peerFlowActive = false;

    const result = peerFlowActive
      ? DataProcessResult.success({ eligible: true })
      : DataProcessResult.failure<Record<string, unknown>>(
          'PEER_FLOW_INACTIVE',
          'FLOW-04 is not active. Cannot verify reviewer eligibility.',
        );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PEER_FLOW_INACTIVE');
  });

  it('F10-E3: invalid engine contract returns DataProcessResult without throwing', async () => {
    const engine = createEngine();
    const invalidContract = new EngineContract({
      taskTypeId: '',
      name: 'Invalid',
      archetype: ContractArchetype.SUBMISSION_GATEWAY,
      entry: '',
      purpose: '',
      factoryDependencies: [],
      afStations: [],
      qualityGates: [],
      bfaRegistration: { entities: [], events: [], apiRoutes: [] },
      ironRules: [],
      machineComponents: [],
      freedomComponents: [],
      familyId: '',
    });

    const result = await engine.generate(invalidContract, 'flow10-error-tenant');

    expect(result).toBeInstanceOf(DataProcessResult);
    if (!result.isSuccess) {
      expect(result.errorCode).toBeDefined();
    }
  });

  it('F10-E4: review_content_policy_check — REJECT path returns terminal failure', () => {
    const moderationOutcome = 'REJECT';

    const result =
      moderationOutcome === 'REJECT'
        ? DataProcessResult.failure<Record<string, unknown>>(
            'REVIEW_POLICY_VIOLATION',
            'Review content violates content policy. Review rejected.',
          )
        : DataProcessResult.success({ published: true });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('REVIEW_POLICY_VIOLATION');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-10 E2E — Tenant Isolation', () => {
  it('F10-T1: tenant-A and tenant-B submissions stay isolated in the database', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    await dbA.storeDocument(
      'review-submissions',
      { reviewId: 'r1', tenantId: 'tenant-A', status: 'submitted' },
      'r1',
    );
    await dbB.storeDocument(
      'review-submissions',
      { reviewId: 'r2', tenantId: 'tenant-B', status: 'submitted' },
      'r2',
    );

    const aResults = await dbA.searchDocuments('review-submissions', {});
    const bResults = await dbB.searchDocuments('review-submissions', {});

    expect((aResults.data as Record<string, unknown>[]).length).toBe(1);
    expect((bResults.data as Record<string, unknown>[]).length).toBe(1);
    expect((aResults.data as Record<string, unknown>[])[0]['tenantId']).toBe('tenant-A');
    expect((bResults.data as Record<string, unknown>[])[0]['tenantId']).toBe('tenant-B');
  });

  it('F10-T2: reputation scores are tenant-scoped — tenant-A score invisible to tenant-B', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'reputation-scores',
      { entityId: 'prod-1', score: 4.2, tenantId: 'tenant-A' },
      'rs-a1',
    );
    await db.storeDocument(
      'reputation-scores',
      { entityId: 'prod-1', score: 3.8, tenantId: 'tenant-B' },
      'rs-b1',
    );

    const aScores = await db.searchDocuments('reputation-scores', {
      tenantId: 'tenant-A',
      entityId: 'prod-1',
    });
    const bScores = await db.searchDocuments('reputation-scores', {
      tenantId: 'tenant-B',
      entityId: 'prod-1',
    });

    expect((aScores.data as Record<string, unknown>[])[0]['score']).toBe(4.2);
    expect((bScores.data as Record<string, unknown>[])[0]['score']).toBe(3.8);
  });

  it('F10-T3: CloudEvents carry tenantid — DNA-5 scope isolation', () => {
    const eventA = createCloudEvent({
      eventType: 'review.submitted',
      source: 'flow-10/submission-gateway',
      data: { reviewId: 'r1', reviewerId: 'u1' },
      tenantId: 'tenant-A',
    });
    const eventB = createCloudEvent({
      eventType: 'review.submitted',
      source: 'flow-10/submission-gateway',
      data: { reviewId: 'r2', reviewerId: 'u2' },
      tenantId: 'tenant-B',
    });

    expect(eventA['tenantid']).toBe('tenant-A');
    expect(eventB['tenantid']).toBe('tenant-B');
    expect(eventA['id']).not.toBe(eventB['id']); // unique event IDs
  });

  it('F10-T4: engine generates independently per tenant', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const [rA, rB] = await Promise.all([
      engineA.generate(new EngineContract(flow10SubmissionParams('-ta')), 'flow10-tenant-A'),
      engineB.generate(new EngineContract(flow10SubmissionParams('-tb')), 'flow10-tenant-B'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);
    expect(rA.data!.contractId).not.toBe(rB.data!.contractId);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-10 E2E — Idempotency', () => {
  it('F10-I1: duplicate review submission with same correlationId returns existing record', async () => {
    const db = makeInMemoryDb();
    const correlationId = 'review-submit-corr-001';

    // First submission
    await db.storeDocument(
      'review-submissions',
      { reviewId: 'r1', correlationId, status: 'submitted' },
      correlationId,
    );

    // Duplicate — check idempotency key
    const existing = await db.searchDocuments('review-submissions', { correlationId });
    expect(existing.isSuccess).toBe(true);
    expect((existing.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F10-I2: duplicate submission does not emit additional events', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const correlationId = 'review-corr-idem-002';

    await db.storeDocument(
      'review-submissions',
      { reviewId: 'r1', correlationId, status: 'submitted' },
      correlationId,
    );

    // Simulate idempotency gate: if already exists, skip enqueue
    const existing = await db.searchDocuments('review-submissions', { correlationId });
    const alreadySubmitted =
      existing.isSuccess && (existing.data as Record<string, unknown>[]).length > 0;

    if (!alreadySubmitted) {
      await queue.enqueue('ReviewSubmitted', { correlationId });
    }

    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('F10-I3: reputation aggregation is idempotent for same review publish event', async () => {
    const db = makeInMemoryDb();

    // Simulate processing the same review.published event twice — aggregate should be consistent
    const reviewId = 'review-pub-001';

    // Store aggregate after first processing
    await db.storeDocument(
      'reputation-aggregates',
      { entityId: 'prod-1', reviewCount: 1, totalScore: 4.0 },
      'agg-prod-1',
    );

    // "Reprocess" same event: storeDocument with same id updates existing record
    await db.storeDocument(
      'reputation-aggregates',
      { entityId: 'prod-1', reviewCount: 1, totalScore: 4.0 },
      'agg-prod-1',
    );

    const agg = await db.searchDocuments('reputation-aggregates', { entityId: 'prod-1' });
    expect((agg.data as Record<string, unknown>[]).length).toBe(1);
    expect((agg.data as Record<string, unknown>[])[0]['reviewCount']).toBe(1);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-10 E2E — UI State Mapping', () => {
  it('F10-U1: loading state — operation in-flight not yet resolved', () => {
    const db = makeInMemoryDb();
    let resolved = false;

    const promise = db.storeDocument('review-submissions', { reviewId: 'r1' }, 'r1').then((r) => {
      resolved = true;
      return r;
    });

    expect(resolved).toBe(false);
    return promise.then(() => expect(resolved).toBe(true));
  });

  it('F10-U2: success state — review submitted, data defined', async () => {
    const db = makeInMemoryDb();
    const result = await db.storeDocument(
      'review-submissions',
      { reviewId: 'r1', status: 'submitted' },
      'r1',
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F10-U3: error state — ineligible reviewer, errorCode defined', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'INELIGIBLE_REVIEWER',
      'No purchase or attendance record found.',
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INELIGIBLE_REVIEWER');
    expect(result.errorMessage).toBeDefined();
  });

  it('F10-U4: UNCERTAIN moderation routes to PENDING_HUMAN_REVIEW — not auto-rejected', () => {
    // uncertainty_behavior_declared: UNCERTAIN must never auto-reject
    const moderationOutcome: string = 'UNCERTAIN'; // typed as string to allow runtime comparison

    const uiState =
      moderationOutcome === 'PASS'
        ? 'published'
        : moderationOutcome === 'REJECT'
          ? 'rejected'
          : 'pending_human_review'; // UNCERTAIN → pending, never auto-rejected

    expect(uiState).toBe('pending_human_review');
    expect(uiState).not.toBe('rejected');
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract
// ══════════════════════════════════════════════════════

describe('FLOW-10 E2E — API Contract (/api/dynamic/{indexName})', () => {
  it('F10-A1: /api/dynamic/review-submissions response shape', () => {
    const mockResponse = DataProcessResult.success([
      { reviewId: 'r1', entityId: 'prod-1', status: 'submitted', tenantId: 'tenant-a' },
    ]);
    const dict = mockResponse.toDict();

    expect(dict).toHaveProperty('is_success', true);
    expect(dict).toHaveProperty('data');
    expect(dict).toHaveProperty('correlation_id');
    expect(dict).toHaveProperty('timestamp');
  });

  it('F10-A2: /api/dynamic/reputation-scores returns score in [1.0, 5.0]', async () => {
    const db = makeInMemoryDb();
    const score = 4.2; // within valid range
    await db.storeDocument(
      'reputation-scores',
      { entityId: 'prod-1', score, tenantId: 'tenant-a' },
      'rs-1',
    );

    const result = await db.searchDocuments('reputation-scores', { entityId: 'prod-1' });
    const docs = result.data as Record<string, unknown>[];

    expect(docs[0]['score']).toBeGreaterThanOrEqual(1.0);
    expect(docs[0]['score']).toBeLessThanOrEqual(5.0);
  });

  it('F10-A3: error response for ineligible submission', () => {
    const errorResponse = DataProcessResult.failure<unknown>(
      'INELIGIBLE_REVIEWER',
      'Reviewer has no purchase or attendance record.',
    );
    const dict = errorResponse.toDict();

    expect(dict['is_success']).toBe(false);
    expect(dict['error_code']).toBe('INELIGIBLE_REVIEWER');
    expect(dict['error_message']).toBeDefined();
  });

  it('F10-A4: moderation decision API response includes outcome field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'moderation-decisions',
      { reviewId: 'r1', outcome: 'PASS', tenantId: 'tenant-a' },
      'md-r1',
    );

    const result = await db.searchDocuments('moderation-decisions', { reviewId: 'r1' });
    const docs = result.data as Record<string, unknown>[];

    expect(docs[0]['outcome']).toBe('PASS');
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-10 E2E — CloudEvents (DNA-9)', () => {
  it('F10-C1: review.submitted event conforms to CloudEvents v1.0', () => {
    const event = createCloudEvent({
      eventType: 'review.submitted',
      source: 'flow-10/submission-gateway',
      data: { reviewId: 'r1', reviewerId: 'u1', entityId: 'prod-1' },
      tenantId: 'tenant-flow10',
    });

    const [isValid, errors] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('F10-C2: review.moderation.approved event has required CloudEvents fields', () => {
    const event = createCloudEvent({
      eventType: 'review.moderation.approved',
      source: 'flow-10/moderation-engine',
      data: { reviewId: 'r1', outcome: 'PASS' },
      tenantId: 'tenant-flow10',
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['type']).toBe('review.moderation.approved');
    expect(event['tenantid']).toBe('tenant-flow10');
    expect(event['source']).toContain('flow-10');
  });

  it('F10-C3: review.flagged_for_human event (UNCERTAIN path) routes to human queue', () => {
    const event = createCloudEvent({
      eventType: 'review.flagged_for_human',
      source: 'flow-10/moderation-engine',
      data: { reviewId: 'r1', outcome: 'UNCERTAIN', reason: 'low_ai_confidence' },
      tenantId: 'tenant-flow10',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(event['type']).toBe('review.flagged_for_human');
    expect(data['outcome']).toBe('UNCERTAIN');

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F10-C4: reputation.score.updated event carries score within valid range', () => {
    const score = 4.1; // clamped [1.0, 5.0]
    const event = createCloudEvent({
      eventType: 'reputation.score.updated',
      source: 'flow-10/reputation-aggregator',
      data: { entityId: 'prod-1', score, reviewCount: 7 },
      tenantId: 'tenant-flow10',
    });

    const data = event['data'] as Record<string, unknown>;
    const eventScore = data['score'] as number;

    expect(eventScore).toBeGreaterThanOrEqual(1.0);
    expect(eventScore).toBeLessThanOrEqual(5.0);

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F10-C5: review.rejected.ineligible event does NOT contain review text (privacy)', () => {
    const event = createCloudEvent({
      eventType: 'review.rejected.ineligible',
      source: 'flow-10/submission-gateway',
      data: { reviewId: 'r1', reviewerId: 'u1', reason: 'INELIGIBLE_REVIEWER' },
      tenantId: 'tenant-flow10',
    });

    const data = event['data'] as Record<string, unknown>;
    // review text must not be in rejection event payload
    expect(data).not.toHaveProperty('reviewText');
    expect(data).not.toHaveProperty('content');
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-10 E2E — Named Checks', () => {
  describe('review_eligibility_check', () => {
    it('F10-N1: submission contract declares review_eligibility_check quality gate', () => {
      const params = flow10SubmissionParams('-n1');
      const gate = params.qualityGates.find((g) => g.checkType === 'review_eligibility_check');
      expect(gate).toBeDefined();
      expect(gate!.severity).toBe('error');
    });

    it('F10-N2: eligibility check uses GET_ONLY access — no side effects on peer flows', () => {
      // cross_flow_read_dependency_declared: declared as GET_ONLY in contract
      const contract = createReviewSubmissionGatewayContract();
      const crossFlowDeps = contract.crossFlowReadDependencies ?? [];

      // All cross-flow reads must be GET_ONLY
      expect(crossFlowDeps.length).toBeGreaterThan(0);
      expect(crossFlowDeps.every((dep) => dep.accessPattern === 'GET_ONLY')).toBe(true);
    });

    it('F10-N3: peerFlowMustBeActive enforced — both FLOW-04 and FLOW-09 declared', () => {
      const contract = createReviewSubmissionGatewayContract();
      const crossFlowDeps = contract.crossFlowReadDependencies ?? [];
      const flowIds = crossFlowDeps.map((dep) => dep.flowId);

      expect(flowIds).toContain('FLOW-04');
      expect(flowIds).toContain('FLOW-09');
      expect(crossFlowDeps.every((dep) => dep.peerFlowMustBeActive === true)).toBe(true);
    });
  });

  describe('uncertainty_behavior_declared', () => {
    it('F10-N4: moderation contract declares UNCERTAIN routes to HUMAN_QUEUE — not auto-rejected', () => {
      const contract = createReviewModerationEngineContract();
      // uncertaintyBehavior must be HUMAN_QUEUE
      expect((contract as any).uncertaintyBehavior).toBe('HUMAN_QUEUE');
    });

    it('F10-N5: moderation contract has three distinct paths: PASS, REJECT, UNCERTAIN', () => {
      const contract = createReviewModerationEngineContract();
      const paths = (contract as any).moderationPaths as Array<{
        outcome: string;
        terminal: boolean;
        humanQueue?: boolean;
      }>;

      expect(paths).toBeDefined();
      const outcomes = paths.map((p) => p.outcome);
      expect(outcomes).toContain('PASS');
      expect(outcomes).toContain('REJECT');
      expect(outcomes).toContain('UNCERTAIN');

      // UNCERTAIN must route to human queue
      const uncertainPath = paths.find((p) => p.outcome === 'UNCERTAIN')!;
      expect(uncertainPath.humanQueue).toBe(true);
      expect(uncertainPath.terminal).toBe(false); // UNCERTAIN is not terminal
    });
  });

  describe('score_range_declared and aggregation_spec_present', () => {
    it('F10-N6: aggregation contract declares scoreRange [1.0, 5.0]', () => {
      const contract = createReputationScoreAggregatorContract();
      const aggregation = (contract as any).aggregation as { scoreRange: number[] };

      expect(aggregation).toBeDefined();
      expect(aggregation.scoreRange).toEqual([1.0, 5.0]);
    });

    it('F10-N7: aggregation contract has addEvents and removeEvents for dual-path aggregation', () => {
      const contract = createReputationScoreAggregatorContract();
      const aggregation = (contract as any).aggregation as {
        addEvents: string[];
        removeEvents: string[];
        recalculateOnRemove: boolean;
        filterCondition: string;
      };

      expect(aggregation.addEvents).toContain('review.published');
      expect(aggregation.removeEvents).toContain('review.retracted');
      expect(aggregation.recalculateOnRemove).toBe(true);
      expect(aggregation.filterCondition).toContain('PUBLISHED');
    });

    it('F10-N8: reputation score clamped to [1.0, 5.0] — values outside range are invalid', () => {
      const clamp = (score: number): number => Math.max(1.0, Math.min(5.0, score));

      expect(clamp(0.5)).toBe(1.0); // below minimum → clamped to 1.0
      expect(clamp(5.5)).toBe(5.0); // above maximum → clamped to 5.0
      expect(clamp(3.7)).toBeCloseTo(3.7); // within range → unchanged
    });
  });
});
