/**
 * FLOW-05 Phase C Unit Tests — T87 (AchievementGate) + T96 (StreakManager)
 *
 * T87 — AchievementGate
 *   C-87-1: Happy path — qualifies for 1 achievement → unlocked:['first-completion'], alreadyHeld:[], achievement.unlocked emitted
 *   C-87-2: SETNX — already holds achievement → alreadyHeld:['first-completion'], unlocked:[], no storeDocument, no emit for that achievement
 *   C-87-3: Mixed — holds one achievement, qualifies for new → alreadyHeld:['a'], unlocked:['b']
 *   C-87-4: DNA-8 — storeDocument before achievement.unlocked emit in callOrder
 *   C-87-5: No criteria met — effectiveTotal=0 → both arrays empty, success
 *   C-87-6: DNA-3 — unexpected throw → ACHIEVEMENT_GATE_ERROR
 *
 * T96 — StreakManager
 *   C-96-1: Happy path — next-day completion → streak incremented from 2 to 3, streak.updated emitted
 *   C-96-2: CF-05-2 — missing userTimezoneOffset (undefined) → VALIDATION_FAILURE
 *   C-96-3: CF-05-2 — userTimezoneOffset is a string → VALIDATION_FAILURE
 *   C-96-4: Same-day idempotency — localDateNumber matches lastLocalDate → success, no store, no emit
 *   C-96-5: Grace window — localDateNumber = lastLocalDate + 2, within grace hours of local midnight → extends streak
 *   C-96-6: DNA-3 — unexpected throw → STREAK_MANAGER_ERROR
 */

import 'reflect-metadata';
import {
  AchievementGate,
  AchievementGateInput,
} from '../../src/engine/flows/completion-gamification/achievement-gate.service';
import {
  StreakManager,
  StreakManagerInput,
} from '../../src/engine/flows/completion-gamification/streak-manager.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Shared mock factory ───────────────────────────────────────────────────────

interface MockDbOptions {
  seed?: Record<string, Array<Record<string, unknown>>>;
  storeFails?: boolean;
}

function makeDb(callOrder: string[], opts: MockDbOptions = {}) {
  const seed = opts.seed ?? {};
  const storeFails = opts.storeFails ?? false;

  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, _filter: Record<string, unknown>) => {
        const rows = seed[index] ?? [];
        return DataProcessResult.success(rows);
      }),
    storeDocument: jest.fn().mockImplementation(async () => {
      callOrder.push('storeDocument');
      if (storeFails) {
        return DataProcessResult.failure('STORE_ERROR', 'forced store failure');
      }
      return DataProcessResult.success({});
    }),
  };
}

function makeQueue(callOrder: string[]) {
  const _enqueued: Array<{ eventType: string; data: unknown }> = [];
  const mock = {
    enqueue: jest.fn().mockImplementation(async (eventType: string, data: unknown) => {
      callOrder.push('enqueue');
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
  return mock;
}

// ── Seed helpers ──────────────────────────────────────────────────────────────

/** Freedom config row for achievement criteria. */
function achievementCriteriaSeed(
  criteria: Array<{
    achievementId: string;
    label?: string;
    minPoints?: number;
    minStreak?: number;
  }>,
): Record<string, Array<Record<string, unknown>>> {
  return {
    freedom_configs: [
      {
        config_key: 'flow05_achievement_criteria',
        config_value: criteria,
      },
    ],
  };
}

/** Freedom config rows for streak grace hours (default 2). */
function streakConfigSeed(graceHours = 2): Record<string, Array<Record<string, unknown>>> {
  return {
    freedom_configs: [
      {
        config_key: 'flow05_streak_grace_hours',
        config_value: graceHours,
      },
    ],
  };
}

// ── T87 AchievementGate ───────────────────────────────────────────────────────

describe('T87 AchievementGate', () => {
  const baseInput: AchievementGateInput = {
    completionId: 'cmp-001',
    questionnaireId: 'q-001',
    userId: 'u-001',
    tenantId: 'tenant-001',
    effectiveTotal: 15,
    currentStreak: 1,
    processedAt: '2026-04-12T10:00:00.000Z',
  };

  it('C-87-1: happy path — qualifies for 1 achievement → unlocked contains first-completion, alreadyHeld empty, achievement.unlocked emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      seed: {
        ...achievementCriteriaSeed([
          { achievementId: 'first-completion', label: 'First Completion', minPoints: 1 },
        ]),
        'xiigen-achievements': [],
      },
    });
    const queue = makeQueue(callOrder);
    const svc = new AchievementGate(db as any, queue as any);

    const result = await svc.evaluate(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.unlocked).toContain('first-completion');
    expect(result.data!.alreadyHeld).toHaveLength(0);
    expect(queue._enqueued.some((e) => e.eventType === 'achievement.unlocked')).toBe(true);
  });

  it('C-87-2: SETNX — already holds achievement → alreadyHeld contains it, unlocked empty, no storeDocument, no emit', async () => {
    const callOrder: string[] = [];
    const existingAchievement: Record<string, unknown> = {
      achievement_id: 'first-completion',
      user_id: 'u-001',
    };
    const db = makeDb(callOrder, {
      seed: {
        ...achievementCriteriaSeed([
          { achievementId: 'first-completion', label: 'First Completion', minPoints: 1 },
        ]),
        'xiigen-achievements': [existingAchievement],
      },
    });
    const queue = makeQueue(callOrder);
    const svc = new AchievementGate(db as any, queue as any);

    const result = await svc.evaluate(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.alreadyHeld).toContain('first-completion');
    expect(result.data!.unlocked).toHaveLength(0);
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('C-87-3: mixed — holds achievement-a, qualifies for achievement-b → alreadyHeld:["a"], unlocked:["b"]', async () => {
    const callOrder: string[] = [];
    const existingAchievement: Record<string, unknown> = {
      achievement_id: 'a',
      user_id: 'u-001',
    };
    const db = makeDb(callOrder, {
      seed: {
        freedom_configs: [
          {
            config_key: 'flow05_achievement_criteria',
            config_value: [
              { achievementId: 'a', label: 'Achievement A', minPoints: 1 },
              { achievementId: 'b', label: 'Achievement B', minPoints: 5 },
            ],
          },
        ],
        'xiigen-achievements': [existingAchievement],
      },
    });
    // Override searchDocuments to return existingAchievement only when querying for achievement_id='a'
    db.searchDocuments = jest
      .fn()
      .mockImplementation(async (index: string, filter: Record<string, unknown>) => {
        if (index === 'freedom_configs') {
          return DataProcessResult.success([
            {
              config_key: 'flow05_achievement_criteria',
              config_value: [
                { achievementId: 'a', label: 'Achievement A', minPoints: 1 },
                { achievementId: 'b', label: 'Achievement B', minPoints: 5 },
              ],
            },
          ]);
        }
        if (index === 'xiigen-achievements' && filter['achievement_id'] === 'a') {
          return DataProcessResult.success([existingAchievement]);
        }
        if (index === 'xiigen-achievements' && filter['achievement_id'] === 'b') {
          return DataProcessResult.success([]);
        }
        return DataProcessResult.success([]);
      });
    const queue = makeQueue(callOrder);
    const svc = new AchievementGate(db as any, queue as any);

    const result = await svc.evaluate({ ...baseInput, effectiveTotal: 10 });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.alreadyHeld).toContain('a');
    expect(result.data!.unlocked).toContain('b');
  });

  it('C-87-4: DNA-8 — storeDocument occurs before achievement.unlocked enqueue in callOrder', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      seed: {
        ...achievementCriteriaSeed([
          { achievementId: 'first-completion', label: 'First Completion', minPoints: 1 },
        ]),
        'xiigen-achievements': [],
      },
    });
    const queue = makeQueue(callOrder);
    const svc = new AchievementGate(db as any, queue as any);

    await svc.evaluate(baseInput);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('C-87-5: no criteria met — effectiveTotal=0 → unlocked and alreadyHeld both empty, success', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      seed: {
        ...achievementCriteriaSeed([
          { achievementId: 'high-scorer', label: 'High Scorer', minPoints: 100 },
        ]),
        'xiigen-achievements': [],
      },
    });
    const queue = makeQueue(callOrder);
    const svc = new AchievementGate(db as any, queue as any);

    const result = await svc.evaluate({ ...baseInput, effectiveTotal: 0 });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.unlocked).toHaveLength(0);
    expect(result.data!.alreadyHeld).toHaveLength(0);
  });

  it('C-87-6: DNA-3 — unexpected throw returns ACHIEVEMENT_GATE_ERROR', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db explosion')),
      storeDocument: jest.fn(),
    };
    const queue = makeQueue(callOrder);
    const svc = new AchievementGate(db as any, queue as any);

    const result = await svc.evaluate(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ACHIEVEMENT_GATE_ERROR');
  });
});

// ── T96 StreakManager ─────────────────────────────────────────────────────────
//
// April 12, 2026 UTC epoch days:
//   Math.floor(Date.parse('2026-04-12T00:00:00.000Z') / 86_400_000) = 20555
//
// localDateNumber = Math.floor((utcMs + userTimezoneOffset * 60_000) / 86_400_000)
// For offset=0, processedAt='2026-04-12T10:00:00.000Z' → localDateNumber = 20555.

describe('T96 StreakManager', () => {
  const BASE_PROCESSED_AT = '2026-04-12T10:00:00.000Z';
  const LOCAL_DATE_20555 = 20555; // April 12, 2026 (UTC, offset=0)
  const LOCAL_DATE_20554 = 20554; // April 11, 2026

  const baseInput: StreakManagerInput = {
    completionId: 'cmp-001',
    userId: 'u-001',
    tenantId: 'tenant-001',
    userTimezoneOffset: 0,
    processedAt: BASE_PROCESSED_AT,
  };

  /** Build a DB that returns an existing streak record and grace config. */
  function makeStreakDb(
    callOrder: string[],
    existingStreak: Record<string, unknown> | null,
    graceHours = 2,
  ) {
    const streakDocs: Array<Record<string, unknown>> = existingStreak ? [existingStreak] : [];
    return makeDb(callOrder, {
      seed: {
        freedom_configs: [
          {
            config_key: 'flow05_streak_grace_hours',
            config_value: graceHours,
          },
        ],
        'xiigen-streak-records': streakDocs,
      },
    });
  }

  it('C-96-1: happy path — next-day completion → streak incremented from 2 to 3, streak.updated emitted', async () => {
    const callOrder: string[] = [];
    const existingStreak: Record<string, unknown> = {
      user_id: 'u-001',
      current_streak: 2,
      longest_streak: 2,
      local_date_number: LOCAL_DATE_20554, // April 11
    };
    const db = makeStreakDb(callOrder, existingStreak);
    const queue = makeQueue(callOrder);
    const svc = new StreakManager(db as any, queue as any);

    // processedAt = April 12, offset=0 → localDateNumber=20555 = 20554+1 → next day
    const result = await svc.update(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.currentStreak).toBe(3);
    expect(queue._enqueued.some((e) => e.eventType === 'streak.updated')).toBe(true);
  });

  it('C-96-2: CF-05-2 — missing userTimezoneOffset (undefined) → VALIDATION_FAILURE', async () => {
    const callOrder: string[] = [];
    const db = makeStreakDb(callOrder, null);
    const queue = makeQueue(callOrder);
    const svc = new StreakManager(db as any, queue as any);

    const input = { ...baseInput } as Partial<StreakManagerInput>;
    delete input.userTimezoneOffset;

    const result = await svc.update(input as StreakManagerInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('C-96-3: CF-05-2 — userTimezoneOffset is a string → VALIDATION_FAILURE', async () => {
    const callOrder: string[] = [];
    const db = makeStreakDb(callOrder, null);
    const queue = makeQueue(callOrder);
    const svc = new StreakManager(db as any, queue as any);

    const result = await svc.update({
      ...baseInput,
      userTimezoneOffset: '+05:30' as unknown as number,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('C-96-4: same-day idempotency — localDateNumber matches lastLocalDate → success, no store, no emit', async () => {
    const callOrder: string[] = [];
    const existingStreak: Record<string, unknown> = {
      user_id: 'u-001',
      current_streak: 3,
      longest_streak: 3,
      local_date_number: LOCAL_DATE_20555, // same day as processedAt
    };
    const db = makeStreakDb(callOrder, existingStreak);
    const queue = makeQueue(callOrder);
    const svc = new StreakManager(db as any, queue as any);

    // processedAt = April 12 10:00 UTC, offset=0 → localDateNumber=20555 = same as record
    const result = await svc.update(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('C-96-5: grace window — localDateNumber = lastLocalDate + 2, within grace hours of local midnight → extends streak', async () => {
    // prior record: local_date_number=20553 (April 10)
    // processedAt = '2026-04-12T00:30:00.000Z' → utcMs = 1744416600000
    // localDateNumber = Math.floor((1744416600000 + 0) / 86400000) = Math.floor(20185.38...) — wait,
    // let's verify: 20555 days from epoch = April 12. 00:30 UTC = 20555*86400000 + 30*60000 = 1744473600000 + 1800000
    // Actually epoch day for April 12 00:00 UTC:
    // 2026-04-12T00:00:00Z = 20555 * 86400000 → processedAt '2026-04-12T00:30:00.000Z'
    // utcMs = 20555 * 86400000 + 30*60000
    // localDateNumber = Math.floor((20555*86400000 + 1800000 + 0) / 86400000)
    //                 = Math.floor(20555 + 1800000/86400000) = Math.floor(20555.020...) = 20555
    // prior record local_date_number = 20553
    // 20555 = 20553 + 2 AND 0.5 hours < 2 hours grace → extends streak
    const callOrder: string[] = [];
    const existingStreak: Record<string, unknown> = {
      user_id: 'u-001',
      current_streak: 4,
      longest_streak: 4,
      local_date_number: 20553, // April 10 (two days behind)
    };
    const db = makeStreakDb(callOrder, existingStreak, 2);
    const queue = makeQueue(callOrder);
    const svc = new StreakManager(db as any, queue as any);

    // 30 minutes into April 12 UTC → within 2h grace window of local midnight
    const result = await svc.update({
      ...baseInput,
      processedAt: '2026-04-12T00:30:00.000Z',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.currentStreak).toBe(5);
    expect(queue._enqueued.some((e) => e.eventType === 'streak.updated')).toBe(true);
  });

  it('C-96-6: DNA-3 — unexpected throw returns STREAK_MANAGER_ERROR', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db explosion')),
      storeDocument: jest.fn(),
    };
    const queue = makeQueue(callOrder);
    const svc = new StreakManager(db as any, queue as any);

    const result = await svc.update(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STREAK_MANAGER_ERROR');
  });
});
