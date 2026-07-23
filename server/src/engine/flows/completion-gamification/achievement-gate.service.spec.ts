/**
 * AchievementGate (T87) — unit tests
 *
 * Test coverage:
 *   1.  Happy path — new achievement unlocked, storeDocument + emit called
 *   2.  IR-87-1: duplicate (userId, achievementId) → alreadyHeld, no store, no emit
 *   3.  IR-87-1: history read is FIRST DB call before storeDocument (call order)
 *   4.  IR-87-2 / DNA-8: storeDocument BEFORE achievement.unlocked enqueue (call order)
 *   5.  No criteria triggered → success with empty unlocked array
 *   6.  FREEDOM criteria override applied (custom achievementId)
 *   7.  Multiple achievements: some new, some already held — correct split
 *   8.  storeDocument failure mid-loop → failure returned, no further emit
 *   9.  Validation: missing completionId → failure
 *  10.  Validation: missing userId → failure
 *  11.  Validation: missing tenantId → failure
 *  12.  Unexpected throw → ACHIEVEMENT_GATE_ERROR (DNA-3)
 *  13.  knowledge_scope: 'PRIVATE' in stored achievement record
 *  14.  achievement.unlocked payload contains achievementId, userId, tenantId
 *  15.  Streak-based achievement fires when currentStreak meets threshold
 *  16.  Streak-based achievement does NOT fire when currentStreak below threshold
 */

import { AchievementGate, AchievementGateInput } from './achievement-gate.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('AchievementGate (T87)', () => {
  let callOrder: string[];

  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let service: AchievementGate;

  const baseInput: AchievementGateInput = {
    completionId: 'cmp-001',
    questionnaireId: 'q-001',
    userId: 'u-abc',
    tenantId: 't-xyz',
    effectiveTotal: 15, // triggers 'first-completion' (minPoints:1)
    currentStreak: 1, // does NOT trigger 'streak-3' (minStreak:3)
    processedAt: '2026-04-12T10:00:00.000Z',
  };

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      searchDocuments: jest.fn().mockImplementation(async (index: string) => {
        if (index === 'xiigen-achievements') {
          return DataProcessResult.success([]); // no existing achievements
        }
        // FREEDOM config — return empty (use defaults)
        return DataProcessResult.success([]);
      }),
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

    service = new AchievementGate(mockDb as any, mockQueue as any);
  });

  // ── 1. Happy path — new achievement unlocked ─────────────────────────────

  it('unlocks first-completion achievement and emits achievement.unlocked', async () => {
    const result = await service.evaluate(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.unlocked).toContain('first-completion');
    expect(result.data!.alreadyHeld).toHaveLength(0);
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
  });

  // ── 2. IR-87-1: duplicate → alreadyHeld, no store/emit ───────────────────

  it('IR-87-1: returns alreadyHeld and skips store+emit for existing achievement', async () => {
    mockDb.searchDocuments.mockImplementation(async (index: string) => {
      if (index === 'xiigen-achievements') {
        return DataProcessResult.success([
          {
            achievement_id: 'first-completion',
            user_id: 'u-abc',
          },
        ]);
      }
      return DataProcessResult.success([]);
    });

    const result = await service.evaluate(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.unlocked).toHaveLength(0);
    expect(result.data!.alreadyHeld).toContain('first-completion');
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 3. IR-87-1: history read is FIRST DB call ────────────────────────────

  it('IR-87-1: history read (searchDocuments on achievements) is called before storeDocument', async () => {
    const dbCallOrder: string[] = [];

    mockDb.searchDocuments.mockImplementation(async (index: string) => {
      dbCallOrder.push(`search:${index}`);
      return DataProcessResult.success([]);
    });
    mockDb.storeDocument.mockImplementation(async () => {
      dbCallOrder.push('storeDocument');
      return DataProcessResult.success({});
    });

    await service.evaluate(baseInput);

    const achievementSearchIdx = dbCallOrder.findIndex((c) => c === 'search:xiigen-achievements');
    const storeIdx = dbCallOrder.findIndex((c) => c === 'storeDocument');
    expect(achievementSearchIdx).toBeGreaterThanOrEqual(0);
    expect(storeIdx).toBeGreaterThan(achievementSearchIdx);
  });

  // ── 4. IR-87-2 / DNA-8: storeDocument BEFORE enqueue ────────────────────

  it('IR-87-2 DNA-8: storeDocument called BEFORE achievement.unlocked enqueue', async () => {
    await service.evaluate(baseInput);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  // ── 5. No criteria triggered → empty unlocked ────────────────────────────

  it('returns empty unlocked array when no criteria triggered', async () => {
    // effectiveTotal=0 — below all thresholds
    const result = await service.evaluate({ ...baseInput, effectiveTotal: 0, currentStreak: 0 });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.unlocked).toHaveLength(0);
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
  });

  // ── 6. FREEDOM criteria override ─────────────────────────────────────────

  it('applies FREEDOM achievement criteria override', async () => {
    mockDb.searchDocuments.mockImplementation(async (index: string) => {
      if (index === 'freedom_configs') {
        return DataProcessResult.success([
          {
            config_key: 'flow05_achievement_criteria',
            config_value: [{ achievementId: 'custom-ach', label: 'Custom', minPoints: 10 }],
          },
        ]);
      }
      return DataProcessResult.success([]);
    });

    const result = await service.evaluate(baseInput); // effectiveTotal=15 >= 10

    expect(result.data!.unlocked).toContain('custom-ach');
    expect(result.data!.unlocked).not.toContain('first-completion');
  });

  // ── 7. Multiple achievements — correct split ──────────────────────────────

  it('correctly splits unlocked vs alreadyHeld for multiple achievements', async () => {
    // Trigger both default achievements (streak=3, points>=1)
    const input: AchievementGateInput = { ...baseInput, currentStreak: 3, effectiveTotal: 15 };
    mockDb.searchDocuments.mockImplementation(
      async (index: string, filter: Record<string, unknown>) => {
        if (index === 'xiigen-achievements') {
          // Only 'first-completion' is already held; 'streak-3' is new
          if (filter['achievement_id'] === 'first-completion') {
            return DataProcessResult.success([{ achievement_id: 'first-completion' }]);
          }
          return DataProcessResult.success([]);
        }
        return DataProcessResult.success([]);
      },
    );

    const result = await service.evaluate(input);

    expect(result.data!.unlocked).toContain('streak-3');
    expect(result.data!.alreadyHeld).toContain('first-completion');
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
  });

  // ── 8. storeDocument failure → return failure immediately ────────────────

  it('returns failure when storeDocument fails during unlock', async () => {
    mockDb.storeDocument.mockImplementation(async () =>
      DataProcessResult.failure('DB_WRITE_ERROR', 'ES write failed'),
    );

    const result = await service.evaluate(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_ERROR');
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 9–11. Validation failures ─────────────────────────────────────────────

  it('returns failure for missing completionId', async () => {
    const r = await service.evaluate({ ...baseInput, completionId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing userId', async () => {
    const r = await service.evaluate({ ...baseInput, userId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing tenantId', async () => {
    const r = await service.evaluate({ ...baseInput, tenantId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  // ── 12. Unexpected throw → ACHIEVEMENT_GATE_ERROR ────────────────────────

  it('DNA-3: returns ACHIEVEMENT_GATE_ERROR on unexpected throw', async () => {
    mockDb.searchDocuments.mockRejectedValue(new Error('crash'));
    const result = await service.evaluate(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ACHIEVEMENT_GATE_ERROR');
  });

  // ── 13. knowledge_scope: 'PRIVATE' ───────────────────────────────────────

  it('stored achievement record has knowledge_scope PRIVATE', async () => {
    await service.evaluate(baseInput);
    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  // ── 14. achievement.unlocked payload ─────────────────────────────────────

  it('achievement.unlocked payload contains achievementId, userId, tenantId', async () => {
    await service.evaluate(baseInput);

    const [eventType, payload] = mockQueue.enqueue.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(eventType).toBe('achievement.unlocked');
    expect(payload['achievementId']).toBe('first-completion');
    expect(payload['userId']).toBe('u-abc');
    expect(payload['tenantId']).toBe('t-xyz');
  });

  // ── 15. Streak-based achievement fires when streak meets threshold ─────────

  it('streak-3 achievement unlocked when currentStreak >= 3', async () => {
    const result = await service.evaluate({ ...baseInput, currentStreak: 3 });

    expect(result.data!.evaluated).toContain('streak-3');
    expect(result.data!.unlocked).toContain('streak-3');
  });

  // ── 16. Streak-based achievement NOT fired below threshold ────────────────

  it('streak-3 achievement NOT triggered when currentStreak < 3', async () => {
    // currentStreak=1 (default) — below streak-3 threshold
    const result = await service.evaluate({ ...baseInput, currentStreak: 1 });

    expect(result.data!.evaluated ?? []).not.toContain('streak-3');
  });
});
