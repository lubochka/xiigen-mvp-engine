/**
 * LevelUpChecker (T86) — unit tests
 *
 * Test coverage:
 *   1.  No threshold crossed → success({levelUp:false}), no storeDocument, no emit
 *   2.  Threshold crossed → levelUp:true, newLevel set
 *   3.  IR-86-1: FREEDOM config threshold override applied
 *   4.  IR-86-3 / DNA-8: storeDocument called BEFORE level.up.detected enqueue
 *   5.  Multiple thresholds — highest level achieved is returned
 *   6.  DB storeDocument failure → failure, no emit
 *   7.  Validation: missing completionId → failure
 *   8.  Validation: missing userId → failure
 *   9.  Validation: missing tenantId → failure
 *  10.  Unexpected throw → LEVEL_UP_CHECKER_ERROR (DNA-3)
 *  11.  knowledge_scope: 'PRIVATE' in stored document
 *  12.  level.up.detected payload contains previousLevel, newLevel, userId
 *  13.  Already at achieved level → no-op success (idempotent)
 *  14.  Empty ledger (no prior points) → level 1, no level-up
 */

import { LevelUpChecker, LevelUpCheckerInput } from './level-up-checker.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('LevelUpChecker (T86)', () => {
  let callOrder: string[];

  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let service: LevelUpChecker;

  const baseInput: LevelUpCheckerInput = {
    completionId: 'cmp-001',
    userId: 'u-abc',
    tenantId: 't-xyz',
    effectiveTotal: 50,
    processedAt: '2026-04-12T10:00:00.000Z',
  };

  /** Build a ledger mock that sums to `cumulativePoints`. */
  function buildLedgerMock(cumulativePoints: number, currentLevel = 1) {
    return jest.fn().mockImplementation(async (index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-gamification-ledger') {
        return DataProcessResult.success([{ effective_total: cumulativePoints }]);
      }
      if (index === 'xiigen-user-levels') {
        return DataProcessResult.success([{ level: currentLevel }]);
      }
      // FREEDOM config — default thresholds [100, 300, 600]
      return DataProcessResult.success([]);
    });
  }

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      searchDocuments: buildLedgerMock(50), // 50 pts cumulative, level 1
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
    };

    mockQueue = {
      enqueue: jest.fn().mockImplementation(async () => {
        callOrder.push('enqueue');
      }),
    };

    service = new LevelUpChecker(mockDb as any, mockQueue as any);
  });

  // ── 1. No threshold crossed ───────────────────────────────────────────────

  it('returns success({levelUp:false}) when no threshold crossed — no write, no emit', async () => {
    // cumulative = 50, default thresholds start at 100 → no level-up
    const result = await service.check(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.levelUp).toBe(false);
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 2. Threshold crossed → levelUp ───────────────────────────────────────

  it('emits LevelUpDetected and returns levelUp:true when threshold crossed', async () => {
    mockDb.searchDocuments = buildLedgerMock(120); // 120 pts >= 100 threshold → level 2

    const result = await service.check(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.levelUp).toBe(true);
    expect(result.data!.newLevel).toBe(2);
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
  });

  // ── 3. IR-86-1: FREEDOM threshold override ───────────────────────────────

  it('IR-86-1: applies FREEDOM config threshold override', async () => {
    mockDb.searchDocuments = jest.fn().mockImplementation(async (index: string) => {
      if (index === 'xiigen-gamification-ledger') {
        return DataProcessResult.success([{ effective_total: 60 }]);
      }
      if (index === 'xiigen-user-levels') {
        return DataProcessResult.success([{ level: 1 }]);
      }
      if (index === 'freedom_configs') {
        return DataProcessResult.success([
          {
            config_key: 'flow05_level_thresholds',
            config_value: [50, 150, 400], // override: level 2 at 50 pts
          },
        ]);
      }
      return DataProcessResult.success([]);
    });

    const result = await service.check(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.levelUp).toBe(true);
    expect(result.data!.newLevel).toBe(2); // 60 >= 50 → level 2
  });

  // ── 4. DNA-8: storeDocument BEFORE enqueue ───────────────────────────────

  it('DNA-8: storeDocument called BEFORE level.up.detected enqueue', async () => {
    mockDb.searchDocuments = buildLedgerMock(120);

    await service.check(baseInput);

    expect(callOrder[0]).toBe('storeDocument');
    expect(callOrder[1]).toBe('enqueue');
  });

  // ── 5. Multiple thresholds — highest achieved level returned ─────────────

  it('returns highest achieved level when multiple thresholds crossed', async () => {
    mockDb.searchDocuments = buildLedgerMock(650); // 650 >= 600 → level 4

    const result = await service.check(baseInput);

    expect(result.data!.newLevel).toBe(4);
  });

  // ── 6. DB storeDocument failure → no emit ────────────────────────────────

  it('returns failure and does not emit when storeDocument fails', async () => {
    mockDb.searchDocuments = buildLedgerMock(120);
    mockDb.storeDocument.mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.failure('DB_WRITE_ERROR', 'write failed');
    });

    const result = await service.check(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_ERROR');
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 7–9. Validation failures ──────────────────────────────────────────────

  it('returns failure for missing completionId', async () => {
    const r = await service.check({ ...baseInput, completionId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing userId', async () => {
    const r = await service.check({ ...baseInput, userId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing tenantId', async () => {
    const r = await service.check({ ...baseInput, tenantId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  // ── 10. Unexpected throw → LEVEL_UP_CHECKER_ERROR ────────────────────────

  it('DNA-3: returns LEVEL_UP_CHECKER_ERROR on unexpected throw', async () => {
    mockDb.searchDocuments.mockRejectedValue(new Error('crash'));
    const result = await service.check(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('LEVEL_UP_CHECKER_ERROR');
  });

  // ── 11. knowledge_scope: 'PRIVATE' ───────────────────────────────────────

  it('stored level record has knowledge_scope PRIVATE', async () => {
    mockDb.searchDocuments = buildLedgerMock(120);
    await service.check(baseInput);
    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  // ── 12. level.up.detected payload shape ──────────────────────────────────

  it('level.up.detected payload contains previousLevel, newLevel, userId', async () => {
    mockDb.searchDocuments = buildLedgerMock(120, 1);
    await service.check(baseInput);

    const [eventType, payload] = mockQueue.enqueue.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(eventType).toBe('level.up.detected');
    expect(payload['previousLevel']).toBe(1);
    expect(payload['newLevel']).toBe(2);
    expect(payload['userId']).toBe('u-abc');
  });

  // ── 13. Already at achieved level → no-op success ────────────────────────

  it('no-op when user already holds the level that would be achieved (idempotent)', async () => {
    // cumulative = 120 → would be level 2, but user is already level 2
    mockDb.searchDocuments = buildLedgerMock(120, 2);

    const result = await service.check(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.levelUp).toBe(false);
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
  });

  // ── 14. Empty ledger → level 1, no level-up ──────────────────────────────

  it('empty ledger results in 0 cumulative points — no level-up', async () => {
    mockDb.searchDocuments = jest.fn().mockResolvedValue(DataProcessResult.success([]));

    const result = await service.check(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.levelUp).toBe(false);
  });
});
