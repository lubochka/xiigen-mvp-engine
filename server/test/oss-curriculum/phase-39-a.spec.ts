/**
 * FLOW-39 Phase A — T597-T600 OSS Curriculum Services Tests.
 *
 * 28 tests covering:
 *
 * CT-1..CT-6: CurriculumTierAssigner (T597)
 *   CT-1: ROUTING archetype → tier 1
 *   CT-2: ORCHESTRATION archetype → tier 4
 *   CT-3: IRON-TIER-MAP — all 5 archetypes map correctly
 *   CT-4: DNA-7 — same dpoTripleId returns existing tier (idempotent, no re-store)
 *   CT-5: DNA-8 — storeDocument before enqueue(CurriculumTierAssigned)
 *   CT-6: unknown archetype → UNKNOWN_ARCHETYPE failure
 *
 * SR-1..SR-6: ShadowRunOrchestrator (T598)
 *   SR-1: submits to 3 default OSS models
 *   SR-2: CF-804 — ossModel + cycleId present in every stored record
 *   SR-3: IRON-ASYNC — emits ShadowRunsSubmitted (not awaiting grade responses)
 *   SR-4: custom ossModels override defaults
 *   SR-5: DNA-8 — storeDocument per model before enqueue
 *   SR-6: missing cycleId → MISSING_CYCLE_ID failure
 *
 * LS-1..LS-6: LearningSignalCollector (T599)
 *   LS-1: IRON-3-SIGNAL — exactly 3 signals stored
 *   LS-2: grade_trend computed (IMPROVING when current > previous)
 *   LS-3: grade_trend STATIC when no previous
 *   LS-4: DNA-7 — same shadowRunId idempotent
 *   LS-5: DNA-8 — storeDocument before enqueue(LearningSignalRecorded)
 *   LS-6: missing shadowRunId → MISSING_SHADOW_RUN_ID failure
 *
 * PT-1..PT-5: CurriculumProgressTracker (T600)
 *   PT-1: DEFERRED when signals < minCycles
 *   PT-2: IRON-PLATEAU — PLATEAU_DETECTED returns recommendation=PRE_SEEDING_RECOMMENDED
 *   PT-3: IRON-PLATEAU — no automatic action (only recommendation returned)
 *   PT-4: IMPROVING status detected
 *   PT-5: DNA-8 — storeDocument before enqueue(ProgressChecked)
 *
 * MT-1..MT-5: missing/invalid inputs
 *   MT-1: CurriculumTierAssigner missing dpoTripleId → failure
 *   MT-2: ShadowRunOrchestrator missing dpoTripleId → failure
 *   MT-3: LearningSignalCollector missing required fields → failure
 *   MT-4: CurriculumProgressTracker missing required fields → failure
 *   MT-5: DNA-3 — throw wrapping (all services return failure, not throw)
 */

import 'reflect-metadata';
import {
  CurriculumTierAssigner,
  ARCHETYPE_TIER_MAP,
} from '../../src/engine/flows/oss-curriculum/curriculum-tier-assigner.service';
import {
  ShadowRunOrchestrator,
  DEFAULT_OSS_MODELS,
} from '../../src/engine/flows/oss-curriculum/shadow-run-orchestrator.service';
import {
  LearningSignalCollector,
  LEARNING_SIGNAL_KEYS,
} from '../../src/engine/flows/oss-curriculum/learning-signal-collector.service';
import { CurriculumProgressTracker } from '../../src/engine/flows/oss-curriculum/curriculum-progress-tracker.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeMockDb(
  existingTier?: Record<string, unknown>,
  existingSignals?: Array<Record<string, unknown>>,
) {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn(async (index: string) => {
      if (index === 'xiigen-curriculum-tiers' && existingTier) {
        return DataProcessResult.success([existingTier]);
      }
      if (index === 'xiigen-learning-signals' && existingSignals) {
        return DataProcessResult.success(existingSignals);
      }
      return DataProcessResult.success([]);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as any;
}

function makeMockQueue() {
  const enqueued: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      enqueued.push({ eventType, data });
      return DataProcessResult.success('msg-1');
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success('dlq-1')),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.failure('TIMEOUT', '')),
    _enqueued: enqueued,
  } as any;
}

beforeEach(() => jest.clearAllMocks());

// ── CurriculumTierAssigner (T597) ────────────────────────────────────────────

describe('FLOW-39 Phase A — CurriculumTierAssigner (T597)', () => {
  it('CT-1: ROUTING archetype → tier 1', async () => {
    const svc = new CurriculumTierAssigner(makeMockDb(), makeMockQueue());
    const result = await svc.assign({
      dpoTripleId: 'DPO-001',
      taskTypeId: 'T-001',
      archetype: 'ROUTING',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.curriculumTier).toBe(1);
  });

  it('CT-2: ORCHESTRATION archetype → tier 4', async () => {
    const svc = new CurriculumTierAssigner(makeMockDb(), makeMockQueue());
    const result = await svc.assign({
      dpoTripleId: 'DPO-002',
      taskTypeId: 'T-002',
      archetype: 'ORCHESTRATION',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.curriculumTier).toBe(4);
  });

  it('CT-3: IRON-TIER-MAP — all 5 archetypes map correctly', async () => {
    const expected: Record<string, number> = {
      ROUTING: 1,
      DATA_PIPELINE: 2,
      PROCESSING: 3,
      ORCHESTRATION: 4,
      SCHEDULED: 5,
    };
    for (const [archetype, tier] of Object.entries(expected)) {
      expect(ARCHETYPE_TIER_MAP[archetype]).toBe(tier);
    }
  });

  it('CT-4: DNA-7 — same dpoTripleId returns existing (idempotent, no re-store)', async () => {
    const existingTier = {
      idempotencyKey: 'tier-assign-DPO-003',
      assignResult: { dpoTripleId: 'DPO-003', curriculumTier: 3 },
    };
    const db = makeMockDb(existingTier);
    const queue = makeMockQueue();
    const svc = new CurriculumTierAssigner(db, queue);

    const result = await svc.assign({
      dpoTripleId: 'DPO-003',
      taskTypeId: 'T-003',
      archetype: 'PROCESSING',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.curriculumTier).toBe(3);
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('CT-5: DNA-8 — storeDocument before enqueue(CurriculumTierAssigned)', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new CurriculumTierAssigner(db, queue);

    const callOrder: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementation(async () => {
      callOrder.push('store');
      return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementation(async () => {
      callOrder.push('enqueue');
      return DataProcessResult.success('msg-1');
    });

    await svc.assign({ dpoTripleId: 'DPO-004', taskTypeId: 'T-004', archetype: 'DATA_PIPELINE' });

    expect(callOrder.indexOf('store')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('CT-6: unknown archetype → UNKNOWN_ARCHETYPE failure', async () => {
    const svc = new CurriculumTierAssigner(makeMockDb(), makeMockQueue());
    const result = await svc.assign({
      dpoTripleId: 'DPO-005',
      taskTypeId: 'T-005',
      archetype: 'UNKNOWN_TYPE',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNKNOWN_ARCHETYPE');
  });
});

// ── ShadowRunOrchestrator (T598) ─────────────────────────────────────────────

describe('FLOW-39 Phase A — ShadowRunOrchestrator (T598)', () => {
  it('SR-1: submits to 3 default OSS models', async () => {
    const svc = new ShadowRunOrchestrator(makeMockDb(), makeMockQueue());
    const result = await svc.orchestrate({
      dpoTripleId: 'DPO-010',
      winningNodeId: 'NODE-1',
      curriculumTier: 3,
      cycleId: 'CYCLE-1',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.submittedModels).toHaveLength(3);
    expect(result.data!.submittedModels).toEqual(expect.arrayContaining([...DEFAULT_OSS_MODELS]));
  });

  it('SR-2: CF-804 — ossModel + cycleId in every stored record', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new ShadowRunOrchestrator(db, queue);

    await svc.orchestrate({
      dpoTripleId: 'DPO-011',
      winningNodeId: 'NODE-2',
      curriculumTier: 2,
      cycleId: 'CYCLE-2',
    });

    const storeCalls = (db.storeDocument as jest.Mock).mock.calls;
    for (const call of storeCalls) {
      const doc = call[1] as Record<string, unknown>;
      expect(doc['ossModel']).toBeTruthy(); // CF-804: ossModel required
      expect(doc['cycleId']).toBeTruthy(); // CF-804: cycleId required
    }
  });

  it('SR-3: IRON-ASYNC — emits ShadowRunsSubmitted, not a grade event', async () => {
    const queue = makeMockQueue();
    const svc = new ShadowRunOrchestrator(makeMockDb(), queue);

    await svc.orchestrate({
      dpoTripleId: 'DPO-012',
      winningNodeId: 'NODE-3',
      curriculumTier: 1,
      cycleId: 'CYCLE-3',
    });

    expect(queue.enqueue).toHaveBeenCalledWith('ShadowRunsSubmitted', expect.any(Object));
    const eventTypes = (queue.enqueue as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(eventTypes).not.toContain('ShadowRunsGraded');
  });

  it('SR-4: custom ossModels override defaults', async () => {
    const svc = new ShadowRunOrchestrator(makeMockDb(), makeMockQueue());
    const result = await svc.orchestrate({
      dpoTripleId: 'DPO-013',
      winningNodeId: 'NODE-4',
      curriculumTier: 5,
      cycleId: 'CYCLE-4',
      ossModels: ['custom-model:7b'],
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.submittedModels).toEqual(['custom-model:7b']);
    expect(result.data!.shadowRunIds).toHaveLength(1);
  });

  it('SR-5: DNA-8 — storeDocument before enqueue', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new ShadowRunOrchestrator(db, queue);

    const callOrder: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementation(async () => {
      callOrder.push('store');
      return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementation(async () => {
      callOrder.push('enqueue');
      return DataProcessResult.success('msg-1');
    });

    await svc.orchestrate({
      dpoTripleId: 'DPO-014',
      winningNodeId: 'NODE-5',
      curriculumTier: 3,
      cycleId: 'CYCLE-5',
    });

    const lastStore = callOrder.lastIndexOf('store');
    const firstEnqueue = callOrder.indexOf('enqueue');
    expect(lastStore).toBeLessThan(firstEnqueue);
  });

  it('SR-6: missing cycleId → MISSING_CYCLE_ID failure', async () => {
    const svc = new ShadowRunOrchestrator(makeMockDb(), makeMockQueue());
    const result = await svc.orchestrate({
      dpoTripleId: 'DPO-015',
      winningNodeId: 'NODE-6',
      curriculumTier: 3,
      cycleId: '',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_CYCLE_ID');
  });
});

// ── LearningSignalCollector (T599) ────────────────────────────────────────────

describe('FLOW-39 Phase A — LearningSignalCollector (T599)', () => {
  it('LS-1: IRON-3-SIGNAL — exactly 3 signals stored', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new LearningSignalCollector(db, queue);

    const result = await svc.collect({
      shadowRunId: 'SR-001',
      ossModel: 'llama3:8b',
      cycleId: 'CYCLE-10',
      grade: 0.8,
      ragContextSize: 5,
      graphContextSize: 3,
    });

    expect(result.isSuccess).toBe(true);
    const signals = result.data!.signals;
    expect(Object.keys(signals)).toHaveLength(3);
    for (const key of LEARNING_SIGNAL_KEYS) {
      expect(signals).toHaveProperty(key);
    }
  });

  it('LS-2: grade_trend IMPROVING when current > previous', async () => {
    const prevShadowRun = {
      shadowRunId: 'SR-000',
      ossModel: 'llama3:8b',
      grade: 0.6,
      submittedAt: '2026-01-01T00:00:00Z',
    };
    const db = makeMockDb();
    // Override: idempotency check (xiigen-learning-signals) returns empty;
    // shadow run history (xiigen-shadow-runs) returns the previous run
    (db.searchDocuments as jest.Mock).mockImplementation(async (index: string) => {
      if (index === 'xiigen-shadow-runs') return DataProcessResult.success([prevShadowRun]);
      return DataProcessResult.success([]);
    });
    const svc = new LearningSignalCollector(db, makeMockQueue());

    const result = await svc.collect({
      shadowRunId: 'SR-002',
      ossModel: 'llama3:8b',
      cycleId: 'CYCLE-11',
      grade: 0.8,
      ragContextSize: 5,
      graphContextSize: 3,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.signals['grade_trend']).toBe('IMPROVING');
  });

  it('LS-3: grade_trend STATIC when no previous records', async () => {
    const svc = new LearningSignalCollector(makeMockDb(), makeMockQueue());

    const result = await svc.collect({
      shadowRunId: 'SR-003',
      ossModel: 'codellama:13b',
      cycleId: 'CYCLE-12',
      grade: 0.7,
      ragContextSize: 4,
      graphContextSize: 2,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.signals['grade_trend']).toBe('STATIC');
  });

  it('LS-4: DNA-7 — same shadowRunId idempotent', async () => {
    const existingSignal = {
      idempotencyKey: 'signals-SR-004',
      collectResult: {
        signalRecordId: 'SIG-SR-004',
        signals: { grade_trend: 'STATIC', rag_context_size: 3, graph_context_size: 2 },
      },
    };
    const db = makeMockDb(existingSignal as any);
    const queue = makeMockQueue();
    const svc = new LearningSignalCollector(db, queue);

    // Override searchDocuments to return existing for SIGNALS_INDEX
    (db.searchDocuments as jest.Mock).mockImplementation(async (index: string) => {
      if (index === 'xiigen-learning-signals') return DataProcessResult.success([existingSignal]);
      return DataProcessResult.success([]);
    });

    const result = await svc.collect({
      shadowRunId: 'SR-004',
      ossModel: 'llama3:8b',
      cycleId: 'CYCLE-13',
      grade: 0.8,
      ragContextSize: 5,
      graphContextSize: 3,
    });

    expect(result.isSuccess).toBe(true);
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('LS-5: DNA-8 — storeDocument before enqueue(LearningSignalRecorded)', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new LearningSignalCollector(db, queue);

    const callOrder: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementation(async () => {
      callOrder.push('store');
      return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementation(async () => {
      callOrder.push('enqueue');
      return DataProcessResult.success('msg-1');
    });

    await svc.collect({
      shadowRunId: 'SR-005',
      ossModel: 'deepseek-coder:6.7b',
      cycleId: 'CYCLE-14',
      grade: 0.75,
      ragContextSize: 4,
      graphContextSize: 3,
    });

    expect(callOrder.indexOf('store')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('LS-6: missing shadowRunId → MISSING_SHADOW_RUN_ID failure', async () => {
    const svc = new LearningSignalCollector(makeMockDb(), makeMockQueue());
    const result = await svc.collect({
      shadowRunId: '',
      ossModel: 'llama3:8b',
      cycleId: 'CYCLE-15',
      grade: 0.7,
      ragContextSize: 3,
      graphContextSize: 2,
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_SHADOW_RUN_ID');
  });
});

// ── CurriculumProgressTracker (T600) ─────────────────────────────────────────

describe('FLOW-39 Phase A — CurriculumProgressTracker (T600)', () => {
  it('PT-1: DEFERRED when signals < minCycles', async () => {
    const svc = new CurriculumProgressTracker(makeMockDb(), makeMockQueue());
    // no signals → fewer than minCycles
    const result = await svc.track({
      dpoTripleId: 'DPO-020',
      ossModel: 'llama3:8b',
      station: 'PROCESSING',
      cycleId: 'CYCLE-20',
      minCycles: 3,
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.progressStatus).toBe('DEFERRED');
    expect(result.data!.recommendation).toBeNull();
  });

  it('PT-2: IRON-PLATEAU — PLATEAU_DETECTED returns PRE_SEEDING_RECOMMENDED', async () => {
    // 3 STATIC signals
    const staticSignals = Array.from({ length: 3 }, (_, i) => ({
      ossModel: 'llama3:8b',
      collectedAt: `2026-01-0${i + 1}T00:00:00Z`,
      signals: { grade_trend: 'STATIC', rag_context_size: 3, graph_context_size: 2 },
    }));
    const db = makeMockDb(undefined, staticSignals);
    const svc = new CurriculumProgressTracker(db, makeMockQueue());

    const result = await svc.track({
      dpoTripleId: 'DPO-021',
      ossModel: 'llama3:8b',
      station: 'PROCESSING',
      cycleId: 'CYCLE-21',
      minCycles: 3,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.progressStatus).toBe('PLATEAU_DETECTED');
    expect(result.data!.recommendation).toBe('PRE_SEEDING_RECOMMENDED');
  });

  it('PT-3: IRON-PLATEAU — recommendation only, no automatic action (success returned)', async () => {
    const staticSignals = Array.from({ length: 3 }, (_, i) => ({
      ossModel: 'codellama:13b',
      collectedAt: `2026-01-0${i + 1}T00:00:00Z`,
      signals: { grade_trend: 'STATIC', rag_context_size: 2, graph_context_size: 1 },
    }));
    const db = makeMockDb(undefined, staticSignals);
    const svc = new CurriculumProgressTracker(db, makeMockQueue());

    // Must return success (not failure) even on PLATEAU_DETECTED — recommendation only
    const result = await svc.track({
      dpoTripleId: 'DPO-022',
      ossModel: 'codellama:13b',
      station: 'DATA_PIPELINE',
      cycleId: 'CYCLE-22',
      minCycles: 3,
    });

    expect(result.isSuccess).toBe(true); // IRON-PLATEAU: success, not failure
    expect(result.data!.progressStatus).toBe('PLATEAU_DETECTED');
  });

  it('PT-4: IMPROVING status detected', async () => {
    const improvingSignals = [
      {
        ossModel: 'llama3:8b',
        collectedAt: '2026-01-01T00:00:00Z',
        signals: { grade_trend: 'STATIC', rag_context_size: 2, graph_context_size: 1 },
      },
      {
        ossModel: 'llama3:8b',
        collectedAt: '2026-01-02T00:00:00Z',
        signals: { grade_trend: 'IMPROVING', rag_context_size: 3, graph_context_size: 2 },
      },
      {
        ossModel: 'llama3:8b',
        collectedAt: '2026-01-03T00:00:00Z',
        signals: { grade_trend: 'IMPROVING', rag_context_size: 4, graph_context_size: 3 },
      },
    ];
    const db = makeMockDb(undefined, improvingSignals);
    const svc = new CurriculumProgressTracker(db, makeMockQueue());

    const result = await svc.track({
      dpoTripleId: 'DPO-023',
      ossModel: 'llama3:8b',
      station: 'ORCHESTRATION',
      cycleId: 'CYCLE-23',
      minCycles: 3,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.progressStatus).toBe('IMPROVING');
    expect(result.data!.recommendation).toBeNull();
  });

  it('PT-5: DNA-8 — storeDocument before enqueue(ProgressChecked)', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new CurriculumProgressTracker(db, queue);

    const callOrder: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementation(async () => {
      callOrder.push('store');
      return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementation(async () => {
      callOrder.push('enqueue');
      return DataProcessResult.success('msg-1');
    });

    await svc.track({
      dpoTripleId: 'DPO-024',
      ossModel: 'llama3:8b',
      station: 'ROUTING',
      cycleId: 'CYCLE-24',
    });

    expect(callOrder.indexOf('store')).toBeLessThan(callOrder.indexOf('enqueue'));
  });
});

// ── MT: missing/invalid inputs ────────────────────────────────────────────────

describe('FLOW-39 Phase A — missing inputs (MT)', () => {
  it('MT-1: CurriculumTierAssigner missing dpoTripleId → failure', async () => {
    const svc = new CurriculumTierAssigner(makeMockDb(), makeMockQueue());
    const result = await svc.assign({ dpoTripleId: '', taskTypeId: 'T-001', archetype: 'ROUTING' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_DPO_TRIPLE_ID');
  });

  it('MT-2: ShadowRunOrchestrator missing dpoTripleId → failure', async () => {
    const svc = new ShadowRunOrchestrator(makeMockDb(), makeMockQueue());
    const result = await svc.orchestrate({
      dpoTripleId: '',
      winningNodeId: 'NODE-1',
      curriculumTier: 3,
      cycleId: 'CYCLE-1',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_DPO_TRIPLE_ID');
  });

  it('MT-3: LearningSignalCollector missing ossModel → failure', async () => {
    const svc = new LearningSignalCollector(makeMockDb(), makeMockQueue());
    const result = await svc.collect({
      shadowRunId: 'SR-001',
      ossModel: '',
      cycleId: 'CYCLE-1',
      grade: 0.8,
      ragContextSize: 3,
      graphContextSize: 2,
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_REQUIRED_FIELDS');
  });

  it('MT-4: CurriculumProgressTracker missing dpoTripleId → failure', async () => {
    const svc = new CurriculumProgressTracker(makeMockDb(), makeMockQueue());
    const result = await svc.track({
      dpoTripleId: '',
      ossModel: 'llama3:8b',
      station: 'ROUTING',
      cycleId: 'CYCLE-1',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_REQUIRED_FIELDS');
  });

  it('MT-5: DNA-3 — throw wrapped by CurriculumTierAssigner → failure', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    (db.storeDocument as jest.Mock).mockRejectedValue(new Error('crash'));
    const svc = new CurriculumTierAssigner(db, queue);

    const result = await svc.assign({
      dpoTripleId: 'DPO-999',
      taskTypeId: 'T-999',
      archetype: 'ROUTING',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('TIER_ASSIGNER_ERROR');
  });
});
