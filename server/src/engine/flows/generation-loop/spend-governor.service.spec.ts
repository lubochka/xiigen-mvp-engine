import 'reflect-metadata';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { SpendGovernorService, SpendSession } from './spend-governor.service';

const makeSession = (overrides: Partial<SpendSession> = {}): SpendSession => ({
  sessionId: 'sess-001',
  flowId: 'FLOW-35',
  accumulatedCostUsd: 0,
  roundCount: 1,
  startedAt: new Date().toISOString(),
  ...overrides,
});

const makeDb = () => ({
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
});

const makeFreedom = (limit: number) => ({
  getConfig: jest.fn().mockResolvedValue(DataProcessResult.success(limit)),
});

describe('SpendGovernorService', () => {
  // ── POSITIVE ───────────────────────────────────────────────────────────────

  it('CONTINUE when accumulated cost is below limit', async () => {
    const db = makeDb();
    const svc = new SpendGovernorService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(10),
    );
    const result = await svc.checkSpend(makeSession({ accumulatedCostUsd: 5 }));
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('CONTINUE');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('HALT when accumulated cost equals limit (boundary)', async () => {
    const db = makeDb();
    const svc = new SpendGovernorService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(10),
    );
    const result = await svc.checkSpend(makeSession({ accumulatedCostUsd: 10 }));
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('HALT');
  });

  it('HALT when accumulated cost exceeds limit', async () => {
    const db = makeDb();
    const svc = new SpendGovernorService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(10),
    );
    const result = await svc.checkSpend(makeSession({ accumulatedCostUsd: 12.5 }));
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('HALT');
    expect(result.data!.reason).toContain('12.5');
  });

  it('DNA-8: stores spend.limit.exceeded event BEFORE returning HALT', async () => {
    const db = makeDb();
    const stored: string[] = [];
    db.storeDocument.mockImplementation(async (index: string) => {
      stored.push(index);
      return DataProcessResult.success({});
    });
    const svc = new SpendGovernorService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(10),
    );
    await svc.checkSpend(makeSession({ accumulatedCostUsd: 15 }));
    expect(stored).toContain('spend-events');
    expect(db.storeDocument).toHaveBeenCalledWith(
      'spend-events',
      expect.objectContaining({ event: 'spend.limit.exceeded' }),
    );
  });

  it('recordRoundCost: accumulates cost across rounds', async () => {
    const db = makeDb();
    // Simulate 2 prior rounds of $2 each
    db.searchDocuments.mockResolvedValue(
      DataProcessResult.success([{ costUsd: 2 }, { costUsd: 2 }]),
    );
    const svc = new SpendGovernorService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(10),
    );
    const result = await svc.recordRoundCost('sess-001', 3);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(7); // 2 + 2 + 3
    expect(db.storeDocument).toHaveBeenCalledWith(
      'spend-events',
      expect.objectContaining({ event: 'round.cost', costUsd: 3 }),
    );
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('DNA-3: returns failure when FREEDOM config unavailable', async () => {
    const db = makeDb();
    const badFreedom = {
      getConfig: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('FREEDOM_ERR', 'unreachable')),
    };
    const svc = new SpendGovernorService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      badFreedom,
    );
    const result = await svc.checkSpend(makeSession({ accumulatedCostUsd: 5 }));
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FREEDOM_ERR');
  });

  it('DNA-3: returns failure when storeDocument fails on HALT', async () => {
    const db = makeDb();
    db.storeDocument.mockResolvedValue(DataProcessResult.failure('STORE_FAIL', 'ES down'));
    const svc = new SpendGovernorService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(10),
    );
    const result = await svc.checkSpend(makeSession({ accumulatedCostUsd: 20 }));
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STORE_FAIL');
  });

  it('recordRoundCost: returns failure when searchDocuments fails', async () => {
    const db = makeDb();
    db.searchDocuments.mockResolvedValue(DataProcessResult.failure('SEARCH_ERR', 'ES down'));
    const svc = new SpendGovernorService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(10),
    );
    const result = await svc.recordRoundCost('sess-001', 1);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SEARCH_ERR');
  });
});
