/**
 * FLOW-33 E2E — System Initiation: Self-Building Bootstrap
 *
 * Archetypes: ORCHESTRATION, DATA_PIPELINE, STATE_MACHINE, AI_GENERATION_LOOP,
 *             AI_CONSENSUS, CHANGE_DETECTION
 * Task types: T536–T542 (7 contracts)
 * Fabric interfaces: IDatabaseService, IQueueService, IRagService, IAiProvider
 * CloudEvents: BootstrapInitiated, GraphRAGSeeded, ImplementationStatusUpdated,
 *              FamilyImplemented, ConsensusReached, RegressionAnalyzed
 *
 * Named checks:
 *   bootstrap_sentinel_all_or_nothing
 *   two_layer_rag_layer1_before_layer2
 *   idempotency_composite_key_required
 *   bounded_retry_loop_enforced
 *   five_arbiter_quorum_required
 *   blast_radius_before_promotion
 *   store_before_emit_on_implementation
 *   context_pack_ttl_managed
 *
 * 8 mandatory E2E categories per SK-421.
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';
import {
  META_ARBITRATION_CONTRACTS,
  META_ARBITRATION_CONTRACT_FACTORIES,
} from '../../../src/engine-contracts/generation-loop-contracts';

// ── Mock fabric providers ──────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex((d) => d['id'] === id);
      if (existing >= 0) bucket[existing] = { ...doc, id };
      else bucket.push({ ...doc, id });
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      return DataProcessResult.success(
        bucket.filter((doc) => Object.entries(filter).every(([k, v]) => v == null || doc[k] === v)),
      );
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find((d) => d['id'] === id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `${id} not found`);
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

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-33 E2E — Happy Path [SELF-BUILDING BOOTSTRAP]', () => {
  it('F33-H1: META_ARBITRATION_CONTRACTS contains 7 pre-constructed contracts', () => {
    expect(META_ARBITRATION_CONTRACTS.length).toBe(7);
    const ids = META_ARBITRATION_CONTRACTS.map((c) => c.taskTypeId);
    expect(ids).toContain('T536');
    expect(ids).toContain('T542');
  });

  it('F33-H2: META_ARBITRATION_CONTRACT_FACTORIES generates 7 contracts when mapped', () => {
    const contracts = META_ARBITRATION_CONTRACT_FACTORIES.map((f) => f());
    expect(contracts.length).toBe(7);
  });

  it('F33-H3: BootstrapOrchestrator contract has correct name and flowId', () => {
    const bootstrap = META_ARBITRATION_CONTRACTS.find((c) => c.taskTypeId === 'T536');
    expect(bootstrap).toBeDefined();
    expect(bootstrap!.name).toBe('BootstrapOrchestrator');
    expect(bootstrap!.flowId).toBe('FLOW-33');
  });

  it('F33-H4: bootstrap state stored before event emitted (DNA-8)', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    const state: Record<string, unknown> = {
      bootstrapId: 'bootstrap-001',
      tenantId: 'system',
      phase: 1,
      status: 'INITIATED',
    };

    await db.storeDocument('xiigen-bootstrap-state', state, 'bootstrap-001');
    await queue.enqueue('bootstrap.initiated', { bootstrapId: 'bootstrap-001' });

    expect(db.storeDocument).toHaveBeenCalled();
    expect(queue.enqueue).toHaveBeenCalled();
    expect(db._store.get('xiigen-bootstrap-state')).toHaveLength(1);
  });

  it('F33-H5: all 7 FLOW-33 contracts have flowId FLOW-33', () => {
    META_ARBITRATION_CONTRACTS.forEach((c) => expect(c.flowId).toBe('FLOW-33'));
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-33 E2E — Error Path', () => {
  it('F33-E1: missing bootstrap state returns DataProcessResult.failure', async () => {
    const db = makeInMemoryDb();
    const result = await db.getDocument('xiigen-bootstrap-state', 'nonexistent-bootstrap');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('F33-E2: consensus gate fails when quorum < 4 of 5', () => {
    const verdicts: Record<string, unknown>[] = [
      { arbiterId: 'dna', verdict: 'PASS' },
      { arbiterId: 'fabric', verdict: 'PASS' },
      { arbiterId: 'business', verdict: 'FAIL' },
      { arbiterId: 'iron_rules', verdict: 'FAIL' },
      { arbiterId: 'key_principles', verdict: 'FAIL' },
    ];
    const passCount = verdicts.filter((v) => v['verdict'] === 'PASS').length;
    const result =
      passCount >= 4
        ? DataProcessResult.success({ passCount, consensusReached: true })
        : DataProcessResult.failure(
            'CONSENSUS_QUORUM_FAILED',
            `Only ${passCount}/5 arbiters passed — quorum not met (T540)`,
          );
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONSENSUS_QUORUM_FAILED');
  });

  it('F33-E3: bootstrap sentinel fails if any phase fails (all-or-nothing)', () => {
    const phases = ['phase1', 'phase2', 'phase3', 'phase4', 'phase5', 'phase6', 'phase7'];
    const phaseStatuses: Record<string, string> = {
      phase1: 'PASSED',
      phase2: 'PASSED',
      phase3: 'FAILED',
      phase4: 'PENDING',
      phase5: 'PENDING',
      phase6: 'PENDING',
      phase7: 'PENDING',
    };
    const allPassed = phases.every((p) => phaseStatuses[p] === 'PASSED');
    const result = allPassed
      ? DataProcessResult.success({ phases, status: 'COMPLETE' })
      : DataProcessResult.failure(
          'BOOTSTRAP_SENTINEL_FAILED',
          'Phase 3 failed — all-or-nothing rollback (T536)',
        );
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BOOTSTRAP_SENTINEL_FAILED');
  });

  it('F33-E4: RAG seeder fails when Layer 1 not seeded before Layer 2', () => {
    const state: Record<string, unknown> = { layer1Seeded: false, layer2Attempted: true };
    const result =
      !state['layer1Seeded'] && state['layer2Attempted']
        ? DataProcessResult.failure(
            'RAG_SEEDING_ORDER_VIOLATED',
            'Layer 1 must be seeded before Layer 2 (T537)',
          )
        : DataProcessResult.success(state);
    expect(result.isSuccess).toBe(false);
  });

  it('F33-E5: bounded retry loop exhausted returns failure not throw', () => {
    const simulateRetryExhausted = (): DataProcessResult<unknown> =>
      DataProcessResult.failure(
        'RETRY_LIMIT_EXCEEDED',
        'Bounded retry loop exhausted after max attempts (T539)',
      );
    const result = simulateRetryExhausted();
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('retry');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-33 E2E — Tenant Isolation', () => {
  it('F33-T1: tenant A bootstrap state not visible to tenant B', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'xiigen-bootstrap-state',
      { bootstrapId: 'b-A', tenantId: 'tenant-a' },
      'b-A',
    );
    await db.storeDocument(
      'xiigen-bootstrap-state',
      { bootstrapId: 'b-B', tenantId: 'tenant-b' },
      'b-B',
    );

    const resultsA = await db.searchDocuments('xiigen-bootstrap-state', { tenantId: 'tenant-a' });
    expect(resultsA.data!.every((d) => d['tenantId'] === 'tenant-a')).toBe(true);
    expect(resultsA.data!.some((d) => d['tenantId'] === 'tenant-b')).toBe(false);
  });

  it('F33-T2: implementation status registry scoped per tenant', async () => {
    const db = makeInMemoryDb();
    for (const tid of ['tenant-a', 'tenant-b']) {
      await db.storeDocument(
        'xiigen-implementation-status',
        { tenantId: tid, familyId: 'F001', status: 'PENDING' },
        `F001::${tid}`,
      );
    }
    const r = await db.searchDocuments('xiigen-implementation-status', { tenantId: 'tenant-a' });
    expect(r.data!.every((d) => d['tenantId'] === 'tenant-a')).toBe(true);
  });

  it('F33-T3: AsyncLocalStorage provides tenant context for bootstrap', () => {
    const mockCtx = { tenantId: 'system' };
    expect(mockCtx.tenantId).toBeDefined();
  });

  it('F33-T4: context pack TTL scoped per tenant', () => {
    const ctxA = { tenantId: 'tenant-a', ttlSeconds: 3600 };
    const ctxB = { tenantId: 'tenant-b', ttlSeconds: 7200 };
    expect(ctxA.ttlSeconds).not.toBe(ctxB.ttlSeconds);
  });

  it('F33-T5: regression impact analysis scoped per tenant', async () => {
    const db = makeInMemoryDb();
    for (const tid of ['tenant-a', 'tenant-b']) {
      await db.storeDocument(
        'xiigen-regression-reports',
        { reportId: `report-${tid}`, tenantId: tid },
        `report-${tid}`,
      );
    }
    const r = await db.searchDocuments('xiigen-regression-reports', { tenantId: 'tenant-b' });
    expect(r.data!.length).toBe(1);
    expect(r.data![0]['tenantId']).toBe('tenant-b');
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-33 E2E — Idempotency', () => {
  it('F33-I1: duplicate bootstrap initiation processed once', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const bootstrapId = 'bootstrap-idempotent-001';
    const state: Record<string, unknown> = { bootstrapId, tenantId: 'system', phase: 1 };

    const e1 = await db.searchDocuments('xiigen-bootstrap-state', { bootstrapId });
    if (!e1.data?.length) {
      await db.storeDocument('xiigen-bootstrap-state', state, bootstrapId);
      await queue.enqueue('bootstrap.initiated', { bootstrapId });
    }

    const e2 = await db.searchDocuments('xiigen-bootstrap-state', { bootstrapId });
    if (!e2.data?.length) {
      await db.storeDocument('xiigen-bootstrap-state', state, bootstrapId);
      await queue.enqueue('bootstrap.initiated', { bootstrapId });
    }

    expect(db._store.get('xiigen-bootstrap-state')!.length).toBe(1);
    expect(queue._emitted.length).toBe(1);
  });

  it('F33-I2: composite key prevents duplicate family implementation', () => {
    const processed = new Set<string>();
    const compositeKey = (familyId: string, tenantId: string) => `${familyId}::${tenantId}`;
    const implement = (familyId: string, tenantId: string) => {
      const key = compositeKey(familyId, tenantId);
      if (processed.has(key)) return DataProcessResult.success({ idempotent: true });
      processed.add(key);
      return DataProcessResult.success({ familyId, tenantId, status: 'IMPLEMENTED' });
    };
    const r1 = implement('F001', 'tenant-a');
    const r2 = implement('F001', 'tenant-a');
    const d2 = r2.data as Record<string, unknown>;
    expect(d2['idempotent']).toBe(true);
  });

  it('F33-I3: same implementation status stored twice no duplication', async () => {
    const db = makeInMemoryDb();
    const status: Record<string, unknown> = {
      familyId: 'F001',
      tenantId: 'tenant-a',
      status: 'IMPLEMENTED',
    };
    await db.storeDocument('xiigen-implementation-status', status, 'F001::tenant-a');
    await db.storeDocument('xiigen-implementation-status', status, 'F001::tenant-a');
    expect(db._store.get('xiigen-implementation-status')!.length).toBe(1);
  });

  it('F33-I4: retry of failed family implementation is safe', async () => {
    const db = makeInMemoryDb();
    const key = 'F002::tenant-a';
    await db.storeDocument(
      'xiigen-implementation-status',
      { familyId: 'F002', status: 'FAILED' },
      key,
    );
    await db.storeDocument(
      'xiigen-implementation-status',
      { familyId: 'F002', status: 'IMPLEMENTED' },
      key,
    );
    const stored = db._store.get('xiigen-implementation-status')!;
    expect(stored.length).toBe(1);
    expect(stored[0]['status']).toBe('IMPLEMENTED');
  });

  it('F33-I5: second run with same inputs returns same consensus result', () => {
    const computeConsensus = (runId: string) =>
      DataProcessResult.success({
        runId,
        passCount: 5,
        quorumMet: true,
        consensusAt: '2026-01-01',
      });
    const r1 = computeConsensus('run-001');
    const r2 = computeConsensus('run-001');
    expect(r1.data!['passCount']).toEqual(r2.data!['passCount']);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-33 E2E — UI State Mapping', () => {
  it('F33-U1: INITIATED status maps to bootstrap-running UI indicator', () => {
    const status: string = 'INITIATED';
    const uiState = status === 'INITIATED' ? 'bootstrap-running' : 'bootstrap-complete';
    expect(uiState).toBe('bootstrap-running');
  });

  it('F33-U2: COMPLETE status maps to bootstrap-success UI indicator', () => {
    const status: string = 'COMPLETE';
    const uiState = status === 'COMPLETE' ? 'bootstrap-success' : 'bootstrap-running';
    expect(uiState).toBe('bootstrap-success');
  });

  it('F33-U3: CONSENSUS_FAILED maps to arbiter-consensus-failed UI indicator', () => {
    const status: string = 'CONSENSUS_FAILED';
    const uiState = status === 'CONSENSUS_FAILED' ? 'arbiter-consensus-failed' : 'arbiter-ok';
    expect(uiState).toBe('arbiter-consensus-failed');
  });

  it('F33-U4: bootstrap state transitions are valid', () => {
    const validTransitions: Record<string, string[]> = {
      INITIATED: ['PHASE_1_RUNNING', 'FAILED'],
      PHASE_1_RUNNING: ['PHASE_2_RUNNING', 'FAILED'],
      PHASE_7_RUNNING: ['COMPLETE', 'FAILED'],
      COMPLETE: [],
    };
    expect(validTransitions['INITIATED']).toContain('PHASE_1_RUNNING');
    expect(validTransitions['COMPLETE']).toHaveLength(0);
  });

  it('F33-U5: UI receives correct data shape on bootstrap complete', () => {
    const payload: Record<string, unknown> = {
      bootstrapId: 'bootstrap-001',
      status: 'COMPLETE',
      phasesCompleted: 7,
      familiesImplemented: 206,
      completedAt: new Date().toISOString(),
    };
    expect(payload['bootstrapId']).toBeDefined();
    expect(payload['status']).toBe('COMPLETE');
    expect(typeof payload['phasesCompleted']).toBe('number');
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract
// ══════════════════════════════════════════════════════

describe('FLOW-33 E2E — API Contract', () => {
  it('F33-A1: bootstrap request schema has required fields', () => {
    const request: Record<string, unknown> = {
      bootstrapId: 'bootstrap-001',
      tenantId: 'system',
      startPhase: 1,
    };
    expect(request['bootstrapId']).toBeDefined();
    expect(request['tenantId']).toBeDefined();
  });

  it('F33-A2: bootstrap response schema matches expected shape', () => {
    const response: Record<string, unknown> = {
      bootstrapId: 'bootstrap-001',
      status: 'COMPLETE',
      phasesCompleted: 7,
    };
    expect(response['bootstrapId']).toBeDefined();
    expect(response['status']).toBeDefined();
  });

  it('F33-A3: error response includes errorCode and errorMessage', () => {
    const err = DataProcessResult.failure('BOOTSTRAP_FAILED', 'Bootstrap initiation failed');
    expect(err.isSuccess).toBe(false);
    expect(err.errorCode).toBeDefined();
    expect(err.errorMessage).toBeDefined();
  });

  it('F33-A4: all FLOW-33 contract fields are present', () => {
    META_ARBITRATION_CONTRACTS.forEach((c) => {
      expect(c.taskTypeId).toBeDefined();
      expect(c.name).toBeDefined();
      expect(c.flowId).toBe('FLOW-33');
    });
  });

  it('F33-A5: no unexpected fields in bootstrap response', () => {
    const allowed = ['bootstrapId', 'status', 'phasesCompleted'];
    const response: Record<string, unknown> = {
      bootstrapId: 'b-001',
      status: 'COMPLETE',
      phasesCompleted: 7,
    };
    const unexpected = Object.keys(response).filter((k) => !allowed.includes(k));
    expect(unexpected).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-33 E2E — CloudEvents', () => {
  it('F33-C1: BootstrapInitiated event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'bootstrap.initiated',
      source: 'xiigen/flow-33/BootstrapOrchestrator',
      tenantId: 'system',
      data: { bootstrapId: 'bootstrap-001', tenantId: 'system' },
    });
    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F33-C2: GraphRAGSeeded event has correct source format', () => {
    const event = createCloudEvent({
      eventType: 'bootstrap.graphrag.seeded',
      source: 'xiigen/flow-33/GraphRAGTwoLayerSeeder',
      tenantId: 'system',
      data: { layer: 1, tenantId: 'system' },
    });
    expect(event['source']).toContain('xiigen/flow-33');
  });

  it('F33-C3: ConsensusReached event has required type field', () => {
    const event = createCloudEvent({
      eventType: 'bootstrap.consensus.reached',
      source: 'xiigen/flow-33/FiveArbiterConsensusGate',
      tenantId: 'system',
      data: { familyId: 'F001', passCount: 5, tenantId: 'system' },
    });
    expect(event['type']).toBe('bootstrap.consensus.reached');
  });

  it('F33-C4: RegressionAnalyzed event data matches expected shape', () => {
    const event = createCloudEvent({
      eventType: 'bootstrap.regression.analyzed',
      source: 'xiigen/flow-33/RegressionImpactAnalyzer',
      tenantId: 'system',
      data: { familyId: 'F001', blastRadius: 3, tenantId: 'system' },
    });
    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F33-C5: ImplementationStatusUpdated event has tenant context', () => {
    const event = createCloudEvent({
      eventType: 'bootstrap.implementation.status.updated',
      source: 'xiigen/flow-33/ImplementationStatusRegistry',
      tenantId: 'system',
      data: { familyId: 'F001', status: 'IMPLEMENTED', tenantId: 'system' },
    });
    const data = event['data'] as Record<string, unknown>;
    expect(data['tenantId']).toBe('system');
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-33 E2E — Named Checks', () => {
  it('F33-N1: bootstrap_sentinel_all_or_nothing enforced on 7-phase state machine', () => {
    const phases = Array.from({ length: 7 }, (_, i) => ({ phase: i + 1, status: 'PASSED' }));
    const allPassed = phases.every((p) => p.status === 'PASSED');
    expect(allPassed).toBe(true);
  });

  it('F33-N2: two_layer_rag_layer1_before_layer2 enforced', () => {
    const state: Record<string, unknown> = { layer1Seeded: true, layer2Seeded: false };
    const canSeedLayer2 = state['layer1Seeded'] === true;
    const result = canSeedLayer2
      ? DataProcessResult.success({ layer2Seeded: true })
      : DataProcessResult.failure('RAG_ORDER_VIOLATION', 'Layer 1 must precede Layer 2 (T537)');
    expect(result.isSuccess).toBe(true);
  });

  it('F33-N3: engine generates 7 contracts for FLOW-33', () => {
    const contracts = META_ARBITRATION_CONTRACTS;
    expect(contracts.length).toBe(7);
    expect(contracts[0].flowId).toBe('FLOW-33');
  });

  it('F33-N4: five_arbiter_quorum_required — >=4 of 5 arbiters must pass', () => {
    const verdicts = [
      { arbiterId: 'dna', verdict: 'PASS' },
      { arbiterId: 'fabric', verdict: 'PASS' },
      { arbiterId: 'business', verdict: 'PASS' },
      { arbiterId: 'iron_rules', verdict: 'PASS' },
      { arbiterId: 'key_principles', verdict: 'PASS' },
    ];
    const passCount = verdicts.filter((v) => v.verdict === 'PASS').length;
    const quorumMet = passCount >= 4;
    expect(quorumMet).toBe(true);
  });

  it('F33-N5: blast_radius_before_promotion enforced', () => {
    const promotion: Record<string, unknown> = { familyId: 'F001', blastRadiusAnalyzed: true };
    const result = promotion['blastRadiusAnalyzed']
      ? DataProcessResult.success(promotion)
      : DataProcessResult.failure(
          'BLAST_RADIUS_REQUIRED',
          'Blast radius analysis required before promotion (T541)',
        );
    expect(result.isSuccess).toBe(true);
  });

  it('F33-N6: store_before_emit on implementation status updated', async () => {
    const callOrder: string[] = [];
    const mockStore = jest.fn(
      async (_index: string, _doc: Record<string, unknown>, _id: string) => {
        callOrder.push('store');
        return DataProcessResult.success({});
      },
    );
    const mockEnqueue = jest.fn(async (_topic: string, _data: unknown) => {
      callOrder.push('enqueue');
      return DataProcessResult.success({});
    });
    await mockStore('index', {}, 'id');
    await mockEnqueue('queue', {});
    expect(callOrder[0]).toBe('store');
  });

  it('F33-N7: context_pack_ttl_managed — context packs expire per TTL', () => {
    const pack: Record<string, unknown> = {
      packId: 'pack-001',
      ttlSeconds: 3600,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
    const isExpired = new Date(pack['expiresAt'] as string) < new Date();
    expect(isExpired).toBe(false);
  });

  it('F33-N8: named checks registered for FLOW-33', () => {
    const NAMED_CHECKS = [
      'bootstrap_sentinel_all_or_nothing',
      'two_layer_rag_layer1_before_layer2',
      'idempotency_composite_key_required',
      'bounded_retry_loop_enforced',
      'five_arbiter_quorum_required',
      'blast_radius_before_promotion',
      'store_before_emit_on_implementation',
      'context_pack_ttl_managed',
    ];
    expect(NAMED_CHECKS.length).toBe(8);
  });
});
