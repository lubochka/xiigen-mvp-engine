/**
 * StreakManager (T96) — unit tests
 *
 * Fixed UTC anchor for deterministic date math:
 *   TEST_AT    = '2026-04-12T12:00:00.000Z'
 *   utcMs      = 1775995200000
 *   localDate  = Math.floor(1775995200000 / 86_400_000) = 20555  (offset=0)
 *
 *   GRACE_AT   = '2026-04-12T00:30:00.000Z'
 *   utcMs      = 1775953800000
 *   localDate  = Math.floor(1775953800000 / 86_400_000) = 20555  (offset=0)
 *   localMidnight of 20555 in UTC = 20555 * 86_400_000 = 1775952000000
 *   hoursIntoDay = (1775953800000 - 1775952000000) / 3_600_000 = 0.5 h  → within 2h grace
 *
 * Test coverage:
 *   1.  New user (no prior) → streak=1, multiplier=1.1, idempotent=false
 *   2.  Consecutive day → streak extends (lastStreak+1)
 *   3.  Same local day → idempotent: no store, no emit
 *   4.  Gap > grace → streak resets to 1
 *   5.  Within grace window (localDate = lastLocalDate+2, early morning) → extends
 *   6.  DNA-8: storeDocument BEFORE streak.updated enqueue
 *   7.  CF-05-2: missing userTimezoneOffset (not a number) → VALIDATION_FAILURE
 *   8.  Validation: missing completionId → failure
 *   9.  Validation: missing userId → failure
 *  10.  Validation: missing tenantId → failure
 *  11.  storeDocument failure → failure, no emit
 *  12.  DNA-3: unexpected throw → STREAK_MANAGER_ERROR
 *  13.  knowledge_scope: 'PRIVATE' in stored record
 *  14.  streak.updated payload contains currentStreak, streakMultiplier, userId
 *  15.  FREEDOM multiplier step override
 *  16.  longestStreak tracks maximum (currentStreak > prior longest → updated)
 */

import { StreakManager, StreakManagerInput } from './streak-manager.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

/** '2026-04-12T12:00:00.000Z' → localDate(offset=0) = 20191 */
const TEST_AT = '2026-04-12T12:00:00.000Z';
/** '2026-04-12T00:30:00.000Z' → localDate(offset=0) = 20190, ≈0.167h into day */
const GRACE_AT = '2026-04-12T00:30:00.000Z';

const LOCAL_DATE_TODAY = 20555; // localDate for TEST_AT='2026-04-12T12:00:00.000Z', offset=0
const LOCAL_DATE_YESTERDAY = 20554; // one day before TEST_AT
// GRACE_AT='2026-04-12T00:30:00.000Z' also lands on day 20555 (30min after midnight)

describe('StreakManager (T96)', () => {
  let callOrder: string[];

  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let service: StreakManager;

  const baseInput: StreakManagerInput = {
    completionId: 'cmp-001',
    userId: 'u-abc',
    tenantId: 't-xyz',
    userTimezoneOffset: 0,
    processedAt: TEST_AT,
  };

  /** Build a streak mock that returns a prior record for xiigen-streak-records. */
  function buildPriorMock(
    localDateNumber: number,
    currentStreak: number,
    longestStreak: number,
    streakMultiplier = 1.0,
  ) {
    return jest.fn().mockImplementation(async (index: string) => {
      if (index === 'xiigen-streak-records') {
        return DataProcessResult.success([
          {
            streak_record_id: 'str-old',
            local_date_number: localDateNumber,
            current_streak: currentStreak,
            longest_streak: longestStreak,
            streak_multiplier: streakMultiplier,
            streak_updated_at: TEST_AT,
          },
        ]);
      }
      return DataProcessResult.success([]); // FREEDOM defaults
    });
  }

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      searchDocuments: jest.fn().mockImplementation(async () => DataProcessResult.success([])),
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

    service = new StreakManager(mockDb as any, mockQueue as any);
  });

  // ── 1. New user → streak=1, multiplier=1.1 ───────────────────────────────

  it('new user: streak=1, multiplier=1.1, idempotent=false', async () => {
    // searchDocuments returns [] for streak index
    const result = await service.update(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.currentStreak).toBe(1);
    expect(result.data!.streakMultiplier).toBe(1.1);
    expect(result.data!.idempotent).toBe(false);
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
  });

  // ── 2. Consecutive day → extend ──────────────────────────────────────────

  it('consecutive local day: extends streak by 1', async () => {
    mockDb.searchDocuments = buildPriorMock(LOCAL_DATE_YESTERDAY, 3, 3);

    const result = await service.update(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.currentStreak).toBe(4); // 3 + 1
  });

  // ── 3. Same day → idempotent ──────────────────────────────────────────────

  it('same local day: idempotent — no store, no emit', async () => {
    mockDb.searchDocuments = buildPriorMock(LOCAL_DATE_TODAY, 2, 5, 1.2);

    const result = await service.update(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.idempotent).toBe(true);
    expect(result.data!.currentStreak).toBe(2);
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 4. Gap > grace → reset ────────────────────────────────────────────────

  it('gap exceeds grace window: streak resets to 1', async () => {
    // Last on day 20180 (11 days before today)
    mockDb.searchDocuments = buildPriorMock(20180, 7, 7);

    const result = await service.update(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.currentStreak).toBe(1);
  });

  // ── 5. Within grace window → extend ──────────────────────────────────────

  it('within grace window (localDate=lastLocalDate+2, early morning): extends streak', async () => {
    // GRACE_AT → localDate = 20555; last on 20553 → gap=2 but 0.5h into day < 2h grace
    mockDb.searchDocuments = buildPriorMock(20553, 5, 5);

    const result = await service.update({ ...baseInput, processedAt: GRACE_AT });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.currentStreak).toBe(6); // 5 + 1
  });

  // ── 6. DNA-8: storeDocument BEFORE enqueue ────────────────────────────────

  it('DNA-8: storeDocument called BEFORE streak.updated enqueue', async () => {
    await service.update(baseInput);

    expect(callOrder[0]).toBe('storeDocument');
    expect(callOrder[1]).toBe('enqueue');
  });

  // ── 7. CF-05-2: missing userTimezoneOffset (not a number) ────────────────

  it('CF-05-2: userTimezoneOffset not a number → VALIDATION_FAILURE', async () => {
    const r = await service.update({ ...baseInput, userTimezoneOffset: undefined as any });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  // ── 8–10. Validation failures ─────────────────────────────────────────────

  it('returns failure for missing completionId', async () => {
    const r = await service.update({ ...baseInput, completionId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing userId', async () => {
    const r = await service.update({ ...baseInput, userId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing tenantId', async () => {
    const r = await service.update({ ...baseInput, tenantId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  // ── 11. storeDocument failure → no emit ──────────────────────────────────

  it('returns failure and does not emit when storeDocument fails', async () => {
    mockDb.storeDocument.mockImplementation(async () =>
      DataProcessResult.failure('DB_WRITE_ERROR', 'ES write failed'),
    );

    const result = await service.update(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_ERROR');
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 12. DNA-3: unexpected throw → STREAK_MANAGER_ERROR ───────────────────

  it('DNA-3: returns STREAK_MANAGER_ERROR on unexpected throw', async () => {
    mockDb.searchDocuments.mockRejectedValue(new Error('crash'));
    const result = await service.update(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STREAK_MANAGER_ERROR');
  });

  // ── 13. knowledge_scope: 'PRIVATE' ───────────────────────────────────────

  it('stored streak record has knowledge_scope PRIVATE', async () => {
    await service.update(baseInput);
    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  // ── 14. streak.updated payload ────────────────────────────────────────────

  it('streak.updated payload contains currentStreak, streakMultiplier, userId', async () => {
    await service.update(baseInput);

    const [eventType, payload] = mockQueue.enqueue.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(eventType).toBe('streak.updated');
    expect(payload['currentStreak']).toBe(1);
    expect(payload['streakMultiplier']).toBe(1.1);
    expect(payload['userId']).toBe('u-abc');
  });

  // ── 15. FREEDOM multiplier step override ─────────────────────────────────

  it('FREEDOM multiplier step override: custom step=0.2 → multiplier=1.2 for streak=1', async () => {
    // Mock must be key-aware: only return override for multiplier_step; let other keys use defaults
    mockDb.searchDocuments.mockImplementation(
      async (index: string, filter: Record<string, unknown>) => {
        if (
          index === 'freedom_configs' &&
          filter['config_key'] === 'flow05_streak_multiplier_step'
        ) {
          return DataProcessResult.success([
            {
              config_key: 'flow05_streak_multiplier_step',
              config_value: 0.2,
            },
          ]);
        }
        return DataProcessResult.success([]); // all other keys: defaults
      },
    );

    const result = await service.update(baseInput);

    expect(result.data!.streakMultiplier).toBe(1.2); // 1.0 + 1 * 0.2
  });

  // ── 16. longestStreak tracks maximum ─────────────────────────────────────

  it('longestStreak updated when currentStreak exceeds prior longest', async () => {
    mockDb.searchDocuments = buildPriorMock(LOCAL_DATE_YESTERDAY, 9, 9); // streak=9 → 10

    const result = await service.update(baseInput);

    expect(result.data!.currentStreak).toBe(10);
    expect(result.data!.longestStreak).toBe(10); // new maximum
  });

  it('longestStreak unchanged when currentStreak does not exceed prior longest', async () => {
    // prior longest=10, streak=2 → new streak=3, longest stays 10
    mockDb.searchDocuments = buildPriorMock(LOCAL_DATE_YESTERDAY, 2, 10);

    const result = await service.update(baseInput);

    expect(result.data!.currentStreak).toBe(3);
    expect(result.data!.longestStreak).toBe(10); // unchanged
  });
});
