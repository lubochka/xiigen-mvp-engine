/**
 * Unit tests for FlowRagSeedBase — P21 RAG Seeding Standard.
 *
 * Tests via concrete TestRagSeed subclass.
 * DNA-3: Verifies that no test scenario causes a thrown exception.
 * DNA-2: Verifies buildSearchFilter-based upsert logic.
 */

import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';
import { IDatabaseService } from '../fabrics/interfaces/database.interface';

// ── Concrete test subclass ────────────────────────────────────────────────────

class TestRagSeed extends FlowRagSeedBase {
  readonly domainId = 'test-domain';

  private readonly patterns = [
    { patternId: 'PAT-001', name: 'Fabric Injection Pattern', category: 'architecture' },
    { patternId: 'PAT-002', name: 'DataProcessResult Pattern', category: 'error-handling' },
  ];

  private readonly bfaRules = [
    { patternId: 'BFA-001', rule: 'CF-100: No direct DB imports', severity: 'ERROR' },
  ];

  private readonly designRecords = [
    { patternId: 'DR-001', title: 'ADR-001: Fabric-first architecture', status: 'ACCEPTED' },
  ];

  async indexPatterns(): Promise<DataProcessResult<number>> {
    let count = 0;
    for (const pattern of this.patterns) {
      const result = await this.upsertPattern(pattern);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    let count = 0;
    for (const rule of this.bfaRules) {
      const result = await this.upsertPattern(rule);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    let count = 0;
    for (const record of this.designRecords) {
      const result = await this.upsertPattern(record);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }
}

// ── Mock factory ──────────────────────────────────────────────────────────────

function makeMockDb(): jest.Mocked<IDatabaseService> {
  return {
    storeDocument: jest.fn(),
    searchDocuments: jest.fn(),
    getDocument: jest.fn(),
    deleteDocument: jest.fn(),
    bulkStore: jest.fn(),
    countDocuments: jest.fn(),
  } as unknown as jest.Mocked<IDatabaseService>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FlowRagSeedBase', () => {
  let mockDb: jest.Mocked<IDatabaseService>;
  let seed: TestRagSeed;

  beforeEach(() => {
    mockDb = makeMockDb();
    seed = new TestRagSeed(mockDb);

    // Default: patterns do not exist (empty search result)
    mockDb.searchDocuments.mockResolvedValue(DataProcessResult.success([]));
    // Default: store succeeds
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({ _id: 'stored' }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('indexPatterns() returns DataProcessResult<number> — never throws', async () => {
    const result = await seed.indexPatterns();

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(2); // 2 patterns
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(2);
  });

  it('indexBfaRules() returns DataProcessResult<number>', async () => {
    const result = await seed.indexBfaRules();

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(1); // 1 BFA rule
  });

  it('indexDesignRecords() returns DataProcessResult<number>', async () => {
    const result = await seed.indexDesignRecords();

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(1); // 1 design record
  });

  it('seedAll() returns total count of all indexed docs', async () => {
    const result = await seed.seedAll();

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(4); // 2 patterns + 1 BFA + 1 design record
  });

  it('seedAll() is idempotent — second call returns same result (upsert check)', async () => {
    // Second call: patterns already exist
    mockDb.searchDocuments.mockResolvedValue(
      DataProcessResult.success([{ patternId: 'PAT-001', _id: 'existing' }]),
    );

    const result = await seed.seedAll();

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    // storeDocument NOT called — all patterns already exist
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    // Count still reflects the number of processed docs (upsert returns success)
    expect(result.data).toBe(4);
  });

  it('seedAll() propagates DataProcessResult.failure on db error — never throws', async () => {
    mockDb.searchDocuments.mockResolvedValue(
      DataProcessResult.failure('DB_DOWN', 'Elasticsearch unavailable'),
    );

    let caughtError: unknown = null;
    let result: DataProcessResult<number> | null = null;

    try {
      result = await seed.seedAll();
    } catch (e) {
      caughtError = e;
    }

    // DNA-3: must NOT throw
    expect(caughtError).toBeNull();
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result!.isSuccess).toBe(false);
    expect(result!.errorCode).toBe('DB_DOWN');
  });
});
