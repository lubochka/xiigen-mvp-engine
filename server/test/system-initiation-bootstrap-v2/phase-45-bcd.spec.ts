/**
 * FLOW-45 Phases B-D — T602-T604 History Bootstrap Services Tests.
 *
 * 24 tests covering:
 *
 * AR-1..AR-6: ArchPhilosophyRetriever (T602)
 *   AR-1: retrieves all GLOBAL patterns (no filter)
 *   AR-2: filters by patternType
 *   AR-3: CF-804 — only knowledgeScope=GLOBAL patterns returned
 *   AR-4: empty result — no patterns found (returns totalReturned=0)
 *   AR-5: DB failure → ARCH_PHILOSOPHY_RETRIEVAL_FAILED
 *   AR-6: DNA-3 — unexpected throw → DataProcessResult.failure
 *
 * PS-1..PS-6: PhilosophyPatternSummarizer (T603)
 *   PS-1: groups patterns by patternType — one summary per group
 *   PS-2: DNA-7 — same summarizationRunId is idempotent (no re-store)
 *   PS-3: DNA-8 — storeDocument before enqueue(PhilosophySummaryReady)
 *   PS-4: returns groupsCreated + patternsProcessed counts
 *   PS-5: missing summarizationRunId → MISSING_SUMMARIZATION_RUN_ID failure
 *   PS-6: empty patterns → groupsCreated=0, patternsProcessed=0
 *
 * HO-1..HO-8: HistoryBootstrapOrchestrator (T604)
 *   HO-1: COMPLETE status when seed + retrieve + summarize all succeed
 *   HO-2: PARTIAL status when seed succeeds but retrieve returns 0 patterns
 *   HO-3: DNA-7 — same bootstrapRunId returns existing result (idempotent)
 *   HO-4: DNA-8 — storeDocument to xiigen-bootstrap-completions BEFORE enqueue
 *   HO-5: enqueue HistoryBootstrapCompleted after completion record stored
 *   HO-6: missing bootstrapRunId → MISSING_BOOTSTRAP_RUN_ID failure
 *   HO-7: orchestrationResult includes seedCount + retrievedCount + summarizedGroups
 *   HO-8: DNA-3 — unexpected throw → DataProcessResult.failure
 *
 * MT-1..MT-4: missing/invalid inputs
 *   MT-1: ArchPhilosophyRetriever with DB returning failure
 *   MT-2: PhilosophyPatternSummarizer with empty patterns
 *   MT-3: HistoryBootstrapOrchestrator with empty bootstrapRunId
 *   MT-4: all services return DataProcessResult (never throw)
 */

import 'reflect-metadata';
import { ArchPhilosophyRetriever } from '../../src/bootstrap/arch-philosophy-retriever.service';
import { PhilosophyPatternSummarizer } from '../../src/bootstrap/philosophy-pattern-summarizer.service';
import { HistoryBootstrapOrchestrator } from '../../src/bootstrap/history-bootstrap-orchestrator.service';
import { BootstrapFromDocumentsService } from '../../src/bootstrap/bootstrap-from-documents.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeMockDb(
  searchResults: Array<Record<string, unknown>> = [],
  idempotencyResults: Array<Record<string, unknown>> = [],
) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      return DataProcessResult.success({ ...doc });
    }),
    searchDocuments: jest.fn(async (index: string, _filter: unknown) => {
      if (index.includes('idempotency')) {
        return DataProcessResult.success(idempotencyResults);
      }
      return DataProcessResult.success(searchResults);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _stored: stored,
  } as any;
}

function makeMockQueue() {
  const emitted: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      emitted.push({ eventType, data });
      return DataProcessResult.success('msg-id');
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    _emitted: emitted,
  } as any;
}

function makeMockSeeder(patternsSeeded = 5): Partial<BootstrapFromDocumentsService> {
  return {
    seedArchPhilosophy: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ patternsSeeded, patternsFailed: 0 })),
  };
}

const SAMPLE_PATTERNS: Array<Record<string, unknown>> = [
  {
    patternId: 'AP-001',
    patternType: 'FABRIC_FIRST',
    knowledgeScope: 'GLOBAL',
    description: 'Fabric first',
  },
  {
    patternId: 'AP-002',
    patternType: 'FABRIC_FIRST',
    knowledgeScope: 'GLOBAL',
    description: 'No typed models',
  },
  {
    patternId: 'AP-003',
    patternType: 'DATA_INTEGRITY',
    knowledgeScope: 'GLOBAL',
    description: 'DNA-8 outbox',
  },
  {
    patternId: 'AP-004',
    patternType: 'MULTI_TENANT',
    knowledgeScope: 'GLOBAL',
    description: 'Tenant via CLS',
  },
  {
    patternId: 'AP-005',
    patternType: 'RESULT_PATTERN',
    knowledgeScope: 'GLOBAL',
    description: 'DNA-3 result',
  },
];

beforeEach(() => jest.clearAllMocks());

// ── ArchPhilosophyRetriever ───────────────────────────────────────────────────

describe('AR-1..AR-6: ArchPhilosophyRetriever (T602)', () => {
  it('AR-1: retrieves all GLOBAL patterns (no filter)', async () => {
    const db = makeMockDb(SAMPLE_PATTERNS);
    const svc = new ArchPhilosophyRetriever(db);

    const result = await svc.retrieve();

    expect(result.isSuccess).toBe(true);
    expect(result.data!.totalReturned).toBe(5);
    expect(result.data!.patterns).toHaveLength(5);
  });

  it('AR-2: filters by patternType when provided', async () => {
    const db = makeMockDb(SAMPLE_PATTERNS.filter((p) => p['patternType'] === 'FABRIC_FIRST'));
    const svc = new ArchPhilosophyRetriever(db);

    const result = await svc.retrieve({ patternType: 'FABRIC_FIRST' });

    expect(result.isSuccess).toBe(true);
    const searchCall = (db.searchDocuments as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(searchCall[1]).toMatchObject({ patternType: 'FABRIC_FIRST', knowledgeScope: 'GLOBAL' });
  });

  it('AR-3: CF-804 — knowledgeScope=GLOBAL always included in query filter', async () => {
    const db = makeMockDb([]);
    const svc = new ArchPhilosophyRetriever(db);

    await svc.retrieve();

    const searchCall = (db.searchDocuments as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(searchCall[1]).toMatchObject({ knowledgeScope: 'GLOBAL' });
  });

  it('AR-4: empty result — totalReturned=0', async () => {
    const db = makeMockDb([]);
    const svc = new ArchPhilosophyRetriever(db);

    const result = await svc.retrieve();

    expect(result.isSuccess).toBe(true);
    expect(result.data!.totalReturned).toBe(0);
    expect(result.data!.patterns).toHaveLength(0);
  });

  it('AR-5: DB failure → ARCH_PHILOSOPHY_RETRIEVAL_FAILED', async () => {
    const db = makeMockDb();
    (db.searchDocuments as jest.Mock).mockResolvedValue(
      DataProcessResult.failure('DB_DOWN', 'Connection refused'),
    );
    const svc = new ArchPhilosophyRetriever(db);

    const result = await svc.retrieve();

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ARCH_PHILOSOPHY_RETRIEVAL_FAILED');
  });

  it('AR-6: DNA-3 — unexpected throw → DataProcessResult.failure', async () => {
    const db = makeMockDb();
    (db.searchDocuments as jest.Mock).mockRejectedValue(new Error('socket timeout'));
    const svc = new ArchPhilosophyRetriever(db);

    const result = await svc.retrieve();

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ARCH_PHILOSOPHY_RETRIEVER_ERROR');
  });
});

// ── PhilosophyPatternSummarizer ───────────────────────────────────────────────

describe('PS-1..PS-6: PhilosophyPatternSummarizer (T603)', () => {
  it('PS-1: groups patterns by patternType — one summary stored per group', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new PhilosophyPatternSummarizer(db, queue);

    const result = await svc.summarize({
      summarizationRunId: 'SUM-001',
      patterns: SAMPLE_PATTERNS,
    });

    expect(result.isSuccess).toBe(true);
    // 4 unique patternTypes: FABRIC_FIRST, DATA_INTEGRITY, MULTI_TENANT, RESULT_PATTERN
    expect(result.data!.groupsCreated).toBe(4);
    expect(result.data!.patternsProcessed).toBe(5);
  });

  it('PS-2: DNA-7 — same summarizationRunId returns existing result (idempotent)', async () => {
    const existingResult = {
      summarizationRunId: 'SUM-002',
      groupsCreated: 3,
      patternsProcessed: 4,
    };
    const db = makeMockDb([], [{ summarizationRunId: 'SUM-002', summarizeResult: existingResult }]);
    const queue = makeMockQueue();
    const svc = new PhilosophyPatternSummarizer(db, queue);

    const result = await svc.summarize({
      summarizationRunId: 'SUM-002',
      patterns: SAMPLE_PATTERNS,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.groupsCreated).toBe(3);
    // storeDocument should NOT be called (idempotent return)
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('PS-3: DNA-8 — storeDocument before enqueue(PhilosophySummaryReady)', async () => {
    const callOrder: string[] = [];
    const db = makeMockDb();
    const queue = makeMockQueue();
    (db.storeDocument as jest.Mock).mockImplementation(async () => {
      callOrder.push('store');
      return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementation(async () => {
      callOrder.push('enqueue');
      return DataProcessResult.success('msg-id');
    });
    const svc = new PhilosophyPatternSummarizer(db, queue);

    await svc.summarize({ summarizationRunId: 'SUM-003', patterns: SAMPLE_PATTERNS });

    const enqueueIdx = callOrder.lastIndexOf('enqueue');
    const lastStoreIdx = callOrder.lastIndexOf('store');
    expect(lastStoreIdx).toBeLessThan(enqueueIdx);
  });

  it('PS-4: returns groupsCreated + patternsProcessed', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new PhilosophyPatternSummarizer(db, queue);

    const result = await svc.summarize({
      summarizationRunId: 'SUM-004',
      patterns: SAMPLE_PATTERNS,
    });

    expect(result.isSuccess).toBe(true);
    expect(typeof result.data!.groupsCreated).toBe('number');
    expect(typeof result.data!.patternsProcessed).toBe('number');
    expect(result.data!.summarizationRunId).toBe('SUM-004');
  });

  it('PS-5: missing summarizationRunId → MISSING_SUMMARIZATION_RUN_ID', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new PhilosophyPatternSummarizer(db, queue);

    const result = await svc.summarize({ summarizationRunId: '', patterns: SAMPLE_PATTERNS });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_SUMMARIZATION_RUN_ID');
  });

  it('PS-6: empty patterns → groupsCreated=0, patternsProcessed=0', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new PhilosophyPatternSummarizer(db, queue);

    const result = await svc.summarize({ summarizationRunId: 'SUM-005', patterns: [] });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.groupsCreated).toBe(0);
    expect(result.data!.patternsProcessed).toBe(0);
  });
});

// ── HistoryBootstrapOrchestrator ──────────────────────────────────────────────

describe('HO-1..HO-8: HistoryBootstrapOrchestrator (T604)', () => {
  function makeOrchestrator(
    db: ReturnType<typeof makeMockDb>,
    queue: ReturnType<typeof makeMockQueue>,
    seededCount = 5,
    retrievedPatterns = SAMPLE_PATTERNS,
  ) {
    const seeder = makeMockSeeder(seededCount) as BootstrapFromDocumentsService;
    const retriever: Partial<ArchPhilosophyRetriever> = {
      retrieve: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({
            patterns: retrievedPatterns,
            totalReturned: retrievedPatterns.length,
          }),
        ),
    };
    const summarizer: Partial<PhilosophyPatternSummarizer> = {
      summarize: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({
            summarizationRunId: 'sum',
            groupsCreated: 4,
            patternsProcessed: 5,
          }),
        ),
    };
    return new HistoryBootstrapOrchestrator(
      db,
      queue,
      seeder,
      retriever as ArchPhilosophyRetriever,
      summarizer as PhilosophyPatternSummarizer,
    );
  }

  it('HO-1: COMPLETE status when seed + retrieve + summarize all succeed', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = makeOrchestrator(db, queue);

    const result = await svc.orchestrate({ bootstrapRunId: 'RUN-001' });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.completionStatus).toBe('COMPLETE');
    expect(result.data!.seedCount).toBe(5);
    expect(result.data!.retrievedCount).toBe(5);
    expect(result.data!.summarizedGroups).toBe(4);
  });

  it('HO-2: PARTIAL status when seed succeeds but retrieve returns 0 patterns', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = makeOrchestrator(db, queue, 5, []);

    const result = await svc.orchestrate({ bootstrapRunId: 'RUN-002' });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.completionStatus).toBe('PARTIAL');
  });

  it('HO-3: DNA-7 — same bootstrapRunId returns existing result (idempotent)', async () => {
    const existingResult: Record<string, unknown> = {
      bootstrapRunId: 'RUN-003',
      seedCount: 7,
      retrievedCount: 7,
      summarizedGroups: 3,
      completionStatus: 'COMPLETE',
    };
    const db = makeMockDb([], [{ bootstrapRunId: 'RUN-003', orchestrationResult: existingResult }]);
    const queue = makeMockQueue();
    const svc = makeOrchestrator(db, queue);

    const result = await svc.orchestrate({ bootstrapRunId: 'RUN-003' });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.seedCount).toBe(7);
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('HO-4: DNA-8 — storeDocument to xiigen-bootstrap-completions before enqueue', async () => {
    const callOrder: string[] = [];
    const db = makeMockDb();
    const queue = makeMockQueue();
    (db.storeDocument as jest.Mock).mockImplementation(async (index: string) => {
      callOrder.push(`store:${index}`);
      return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementation(async () => {
      callOrder.push('enqueue');
      return DataProcessResult.success('msg-id');
    });
    const svc = makeOrchestrator(db, queue);

    await svc.orchestrate({ bootstrapRunId: 'RUN-004' });

    const completionStoreIdx = callOrder.findIndex(
      (e) => e === 'store:xiigen-bootstrap-completions',
    );
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(completionStoreIdx).toBeGreaterThanOrEqual(0);
    expect(completionStoreIdx).toBeLessThan(enqueueIdx);
  });

  it('HO-5: enqueue HistoryBootstrapCompleted after completion stored', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = makeOrchestrator(db, queue);

    await svc.orchestrate({ bootstrapRunId: 'RUN-005' });

    expect(queue.enqueue).toHaveBeenCalledWith(
      'HistoryBootstrapCompleted',
      expect.objectContaining({ bootstrapRunId: 'RUN-005', completionStatus: 'COMPLETE' }),
    );
  });

  it('HO-6: missing bootstrapRunId → MISSING_BOOTSTRAP_RUN_ID', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = makeOrchestrator(db, queue);

    const result = await svc.orchestrate({ bootstrapRunId: '' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_BOOTSTRAP_RUN_ID');
  });

  it('HO-7: orchestrationResult includes seedCount + retrievedCount + summarizedGroups', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = makeOrchestrator(db, queue, 3);

    const result = await svc.orchestrate({ bootstrapRunId: 'RUN-007' });

    expect(result.isSuccess).toBe(true);
    expect(typeof result.data!.seedCount).toBe('number');
    expect(typeof result.data!.retrievedCount).toBe('number');
    expect(typeof result.data!.summarizedGroups).toBe('number');
    expect(result.data!.bootstrapRunId).toBe('RUN-007');
  });

  it('HO-8: DNA-3 — unexpected throw → DataProcessResult.failure', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    (db.searchDocuments as jest.Mock).mockRejectedValue(new Error('unexpected crash'));
    const svc = makeOrchestrator(db, queue);

    const result = await svc.orchestrate({ bootstrapRunId: 'RUN-008' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('HISTORY_BOOTSTRAP_ORCHESTRATOR_ERROR');
  });
});

// ── Missing/invalid inputs ────────────────────────────────────────────────────

describe('MT-1..MT-4: missing/invalid inputs', () => {
  it('MT-1: ArchPhilosophyRetriever — DB failure returns failure result', async () => {
    const db = makeMockDb();
    (db.searchDocuments as jest.Mock).mockResolvedValue(
      DataProcessResult.failure('DB_ERROR', 'failed'),
    );
    const svc = new ArchPhilosophyRetriever(db);

    const result = await svc.retrieve();

    expect(result.isSuccess).toBe(false);
  });

  it('MT-2: PhilosophyPatternSummarizer — empty patterns stores zero groups', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new PhilosophyPatternSummarizer(db, queue);

    const result = await svc.summarize({ summarizationRunId: 'MT2', patterns: [] });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.groupsCreated).toBe(0);
  });

  it('MT-3: HistoryBootstrapOrchestrator — empty bootstrapRunId → failure', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const seeder = makeMockSeeder() as BootstrapFromDocumentsService;
    const retriever = { retrieve: jest.fn() } as unknown as ArchPhilosophyRetriever;
    const summarizer = { summarize: jest.fn() } as unknown as PhilosophyPatternSummarizer;
    const svc = new HistoryBootstrapOrchestrator(db, queue, seeder, retriever, summarizer);

    const result = await svc.orchestrate({ bootstrapRunId: '' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_BOOTSTRAP_RUN_ID');
  });

  it('MT-4: DNA-3 — all three services never throw (return failure result)', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();

    // Force throws on all underlying mocks
    (db.searchDocuments as jest.Mock).mockRejectedValue(new Error('db exploded'));

    const retriever = new ArchPhilosophyRetriever(db);
    const summarizer = new PhilosophyPatternSummarizer(db, queue);

    const r1 = await retriever.retrieve();
    const r2 = await summarizer.summarize({ summarizationRunId: 'MT4', patterns: [] });

    expect(r1.isSuccess).toBe(false);
    expect(r2.isSuccess).toBe(false);
    // Neither should have thrown
  });
});
