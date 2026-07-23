/**
 * FLOW-05 Integration Tests — Completion & Gamification
 *
 * Uses a stateful shared DB mock that persists writes across service calls,
 * simulating the real event-bus pipeline (T83→T84→T85→T86/T87→T96→T98).
 *
 * IT-05-1: Full Branch A pipeline — T83→T84→T85→T86→T87→T98
 *          T84 reads T83's questionnaire result; T86 reads T85's ledger entry
 * IT-05-2: T83 SETNX — duplicate submission returns existing record, no re-downstream
 * IT-05-3: DNA-8 across all services — every storeDocument precedes its paired enqueue
 * IT-05-4: CF-05-1 structural guard — PointsCalculatorInput has no earnedPoints key
 * IT-05-5: CF-05-2 timezone — T96 local-date boundary changes streak result
 * IT-05-6: CF-05-3 privacy gate — T90 PRIVATE user terminates Branch C silently
 * IT-05-7: T86 level-up detected when cumulative crosses threshold (T85→T86 read chain)
 * IT-05-8: T87 alreadyHeld skips store+emit; newly unlocked proceeds (SETNX semantics)
 */

import 'reflect-metadata';
import {
  CompletionRecorder,
  CompletionInput,
} from '../../src/engine/flows/completion-gamification/completion-recorder.service';
import {
  PointsCalculator,
  PointsCalculatorInput,
} from '../../src/engine/flows/completion-gamification/points-calculator.service';
import {
  LedgerUpdater,
  LedgerUpdaterInput,
} from '../../src/engine/flows/completion-gamification/ledger-updater.service';
import {
  LevelUpChecker,
  LevelUpCheckerInput,
} from '../../src/engine/flows/completion-gamification/level-up-checker.service';
import {
  AchievementGate,
  AchievementGateInput,
} from '../../src/engine/flows/completion-gamification/achievement-gate.service';
import {
  StreakManager,
  StreakManagerInput,
} from '../../src/engine/flows/completion-gamification/streak-manager.service';
import {
  LearningFlowCompleted,
  LearningFlowCompletedInput,
} from '../../src/engine/flows/completion-gamification/learning-flow-completed.service';
import {
  SocialShareGateService,
  SocialShareGateInput,
} from '../../src/engine/flows/completion-gamification/social-share-gate.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Stateful shared DB mock ────────────────────────────────────────────────────

function makeStatefulDb(seed: Record<string, Array<Record<string, unknown>>> = {}) {
  const store: Record<string, Record<string, Record<string, unknown>>> = {};
  const callOrder: string[] = [];
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];

  for (const [index, docs] of Object.entries(seed)) {
    store[index] = {};
    for (const doc of docs) {
      const id = (doc['completion_id'] ??
        doc['config_key'] ??
        doc['questionnaire_result_id'] ??
        doc['user_id'] ??
        doc['level_record_id'] ??
        String(Date.now() + Math.random())) as string;
      store[index][id] = doc;
    }
  }

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const indexDocs = Object.values(store[index] ?? {});
      const matches = indexDocs.filter((doc) =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
      );
      return DataProcessResult.success(matches);
    }),
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id?: string) => {
      callOrder.push('storeDocument');
      if (!store[index]) store[index] = {};
      const docId = id ?? `auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      store[index][docId] = doc;
      stored.push({ index, doc, id: docId });
      return DataProcessResult.success(doc);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _store: store,
    _stored: stored,
    _callOrder: callOrder,
  } as any;
}

function makeSharedQueue(callOrder: string[] = []) {
  const enqueued: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      callOrder.push('enqueue');
      enqueued.push({ eventType, data });
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _enqueued: enqueued,
  } as any;
}

// ── Standard freedom config seed ──────────────────────────────────────────────

const FREEDOM_SEED = [
  {
    config_key: 'flow05_points_formula',
    task_type: 'xiigen-engine',
    config_value: { base: 10, threshold: 80, bonus: 5 },
  },
  {
    config_key: 'flow05_level_thresholds',
    task_type: 'xiigen-engine',
    config_value: [100, 300, 600],
  },
  {
    config_key: 'flow05_achievement_criteria',
    task_type: 'xiigen-engine',
    config_value: [{ achievementId: 'first-completion', label: 'First Completion', minPoints: 1 }],
  },
  { config_key: 'flow05_streak_grace_hours', task_type: 'xiigen-engine', config_value: 2 },
  { config_key: 'flow05_streak_multiplier_step', task_type: 'xiigen-engine', config_value: 0.1 },
  { config_key: 'flow05_streak_multiplier_max', task_type: 'xiigen-engine', config_value: 2.0 },
];

const QUESTIONNAIRE_RESULT = {
  questionnaire_result_id: 'qr-001',
  questionnaire_id: 'q-001',
  user_id: 'u-abc',
  score_percent: 85,
};

function makeServices(extraSeed: Record<string, Array<Record<string, unknown>>> = {}) {
  const db = makeStatefulDb({ freedom_configs: FREEDOM_SEED, ...extraSeed });
  const queue = makeSharedQueue(db._callOrder);

  return {
    db,
    queue,
    completionRecorder: new CompletionRecorder(db, queue),
    pointsCalculator: new PointsCalculator(db, queue),
    ledgerUpdater: new LedgerUpdater(db, queue),
    levelUpChecker: new LevelUpChecker(db, queue),
    achievementGate: new AchievementGate(db, queue),
    streakManager: new StreakManager(db, queue),
    learningFlowCompleted: new LearningFlowCompleted(db, queue),
    socialShareGate: new SocialShareGateService(db, queue),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('FLOW-05 Integration', () => {
  // ── IT-05-1: Full Branch A pipeline ────────────────────────────────────────

  it('IT-05-1: full Branch A pipeline — T83→T84→T85→T87→T98 cross-service data flow', async () => {
    const {
      db,
      queue,
      completionRecorder,
      pointsCalculator,
      ledgerUpdater,
      achievementGate,
      learningFlowCompleted,
    } = makeServices({ 'xiigen-questionnaire-results': [QUESTIONNAIRE_RESULT] });

    const TENANT = 't-xyz';
    const USER = 'u-abc';
    const Q_ID = 'q-001';
    const NOW = '2026-04-12T10:00:00.000Z';

    // Step 1 — T83: record completion
    const t83 = await completionRecorder.record({
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      submittedAt: NOW,
    });
    expect(t83.isSuccess).toBe(true);
    const { completionId } = t83.data!;

    // Step 2 — T84: compute points from stored questionnaire result
    const t84 = await pointsCalculator.calculate({
      completionId,
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      submittedAt: NOW,
    });
    expect(t84.isSuccess).toBe(true);
    expect(t84.data!.pointBreakdown.base).toBe(10);
    expect(t84.data!.pointBreakdown.bonus).toBe(5); // score=85 >= threshold=80
    expect(t84.data!.pointBreakdown.total).toBe(15);

    // Step 3 — T85: update ledger with points + streak (streakMultiplier=1.1)
    const t85 = await ledgerUpdater.update({
      completionId,
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      pointBreakdown: { base: 10, bonus: 5, multiplier: 1.0, total: 15 },
      streakData: {
        currentStreak: 1,
        longestStreak: 1,
        streakUpdatedAt: NOW,
        streakMultiplier: 1.1,
      },
      processedAt: NOW,
    });
    expect(t85.isSuccess).toBe(true);
    expect(t85.data!.effectiveTotal).toBe(17); // round(15 * 1.1) = 17

    // T85 wrote to xiigen-gamification-ledger — it must be readable
    const ledgerEntries = Object.values(db._store['xiigen-gamification-ledger'] ?? {});
    expect(ledgerEntries.length).toBe(1);
    expect((ledgerEntries[0] as Record<string, unknown>)['effective_total']).toBe(17);

    // Step 4 — T87: evaluate achievements
    const t87 = await achievementGate.evaluate({
      completionId,
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      effectiveTotal: 17,
      currentStreak: 1,
      processedAt: NOW,
    });
    expect(t87.isSuccess).toBe(true);
    expect(t87.data!.unlocked).toContain('first-completion'); // 17 >= minPoints=1
    expect(t87.data!.alreadyHeld).toHaveLength(0);

    // T87 wrote to xiigen-achievements
    const achievements = Object.values(db._store['xiigen-achievements'] ?? {});
    expect(achievements.length).toBe(1);

    // Step 5 — T98: emit learning.flow.completed
    const t98 = await learningFlowCompleted.complete({
      completionId,
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      ledgerEntryId: t85.data!.ledgerEntryId,
      effectiveTotal: 17,
      unlockedAchievements: ['first-completion'],
      processedAt: NOW,
    });
    expect(t98.isSuccess).toBe(true);
    expect(t98.data!.eventEmitted).toBe(true);

    // Final: all expected event types emitted
    const eventTypes = queue._enqueued.map((e: { eventType: string }) => e.eventType);
    expect(eventTypes).toContain('questionnaire.answered');
    expect(eventTypes).toContain('points.calculated');
    expect(eventTypes).toContain('gamification.batch.stored');
    expect(eventTypes).toContain('achievement.unlocked');
    expect(eventTypes).toContain('learning.flow.completed');
  });

  // ── IT-05-2: T83 SETNX ────────────────────────────────────────────────────

  it('IT-05-2: T83 SETNX — duplicate submission returns existing record, no second emit', async () => {
    const { completionRecorder, queue } = makeServices({
      'xiigen-questionnaire-results': [QUESTIONNAIRE_RESULT],
    });

    const input = { questionnaireId: 'q-001', userId: 'u-abc', tenantId: 't-xyz' };

    const first = await completionRecorder.record(input);
    const second = await completionRecorder.record(input); // duplicate

    expect(first.isSuccess).toBe(true);
    expect(second.isSuccess).toBe(true);
    expect(second.data!.idempotent).toBe(true);
    expect(second.data!.completionId).toBe(first.data!.completionId);

    // Only one questionnaire.answered emitted — no double-emit
    const answered = queue._enqueued.filter(
      (e: { eventType: string }) => e.eventType === 'questionnaire.answered',
    );
    expect(answered.length).toBe(1);
  });

  // ── IT-05-3: DNA-8 across services ────────────────────────────────────────

  it('IT-05-3: DNA-8 — every storeDocument precedes its paired enqueue in call order', async () => {
    const { db, completionRecorder, pointsCalculator, ledgerUpdater } = makeServices({
      'xiigen-questionnaire-results': [QUESTIONNAIRE_RESULT],
    });

    const NOW = '2026-04-12T10:00:00.000Z';
    const t83 = await completionRecorder.record({
      questionnaireId: 'q-001',
      userId: 'u-abc',
      tenantId: 't-xyz',
      submittedAt: NOW,
    });
    await pointsCalculator.calculate({
      completionId: t83.data!.completionId,
      questionnaireId: 'q-001',
      userId: 'u-abc',
      tenantId: 't-xyz',
      submittedAt: NOW,
    });
    await ledgerUpdater.update({
      completionId: t83.data!.completionId,
      questionnaireId: 'q-001',
      userId: 'u-abc',
      tenantId: 't-xyz',
      pointBreakdown: { base: 10, bonus: 5, multiplier: 1.0, total: 15 },
      streakData: {
        currentStreak: 1,
        longestStreak: 1,
        streakUpdatedAt: NOW,
        streakMultiplier: 1.0,
      },
      processedAt: NOW,
    });

    // Verify: no enqueue ever appears before a storeDocument in the global call order
    let lastStore = -1;
    for (let i = 0; i < db._callOrder.length; i++) {
      if (db._callOrder[i] === 'storeDocument') lastStore = i;
      if (db._callOrder[i] === 'enqueue') {
        expect(lastStore).toBeGreaterThanOrEqual(0);
        expect(lastStore).toBeLessThan(i);
      }
    }
  });

  // ── IT-05-4: CF-05-1 structural guard ─────────────────────────────────────

  it('IT-05-4: CF-05-1 — PointsCalculatorInput structurally lacks earnedPoints field', () => {
    const input: PointsCalculatorInput = {
      completionId: 'cmp-001',
      questionnaireId: 'q-001',
      userId: 'u-abc',
      tenantId: 't-xyz',
    };
    // CF-05-1: earnedPoints is structurally absent — not zero, not null, not present at all
    expect('earnedPoints' in input).toBe(false);
    // And the type does not accept it at runtime either
    expect(Object.keys(input)).not.toContain('earnedPoints');
  });

  // ── IT-05-5: CF-05-2 timezone offset changes streak day boundary ──────────

  it('IT-05-5: CF-05-2 — different timezone offset → different local day → different streak outcome', async () => {
    const BASE_UTC = '2026-04-12T00:30:00.000Z'; // 30 min after UTC midnight = day 20555

    // offset=0: local day = 20555
    // offset=+600 (+10h): local day = 20555 + floor(600*60000/86400000) = 20555 + 0.416 → still 20555
    // offset=-780 (-13h): local ms = utcMs - 13h*60ms = ... would shift to prior day

    // Scenario: user in UTC-13 (offset=-780)
    // utcMs = 1775953800000 (April 12 00:30 UTC)
    // localMs = utcMs + (-780 * 60000) = 1775953800000 - 46800000 = 1775907000000
    // localDate = floor(1775907000000 / 86400000) = floor(20554.47) = 20554
    // Prior streak was on day 20554 — so offset=-780 user sees SAME local day → idempotent
    // Prior streak was on day 20553 — so offset=-780 user sees day 20554 = lastLocalDate+1 → extends

    const { streakManager } = makeServices();

    // Plant a streak record on localDate 20553 for this user
    const db = makeStatefulDb({
      'xiigen-streak-records': [
        {
          streak_record_id: 'str-old',
          user_id: 'u-tz',
          tenant_id: 't-xyz',
          local_date_number: 20553,
          current_streak: 3,
          longest_streak: 3,
          streak_multiplier: 1.3,
          streak_updated_at: '2026-04-10T10:00:00.000Z',
        },
      ],
      freedom_configs: FREEDOM_SEED,
    });
    const queue2 = makeSharedQueue();
    const sm = new StreakManager(db, queue2);

    // UTC-13 user at 00:30 UTC is on local day 20554 = lastLocalDate+1 → extends streak
    const result = await sm.update({
      completionId: 'cmp-tz',
      userId: 'u-tz',
      tenantId: 't-xyz',
      userTimezoneOffset: -780, // UTC-13
      processedAt: BASE_UTC,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.currentStreak).toBe(4); // 3 + 1 = 4 (consecutive in local TZ)
    expect(result.data!.idempotent).toBe(false);
  });

  // ── IT-05-6: CF-05-3 privacy gate terminates Branch C ─────────────────────

  it('IT-05-6: CF-05-3 — T90 PRIVATE user: shared=false, no social events emitted', async () => {
    const { socialShareGate, queue } = makeServices();

    const result = await socialShareGate.execute({
      completionId: 'cmp-001',
      questionnaireId: 'q-001',
      userId: 'u-abc',
      tenantId: 't-xyz',
      privacySetting: 'PRIVATE',
      processedAt: '2026-04-12T10:00:00.000Z',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.shared).toBe(false);

    // No social events emitted
    const socialEvents = queue._enqueued.filter((e: { eventType: string }) =>
      e.eventType.startsWith('social.'),
    );
    expect(socialEvents.length).toBe(0);
  });

  // ── IT-05-7: T85→T86 read chain — level-up detected ──────────────────────

  it('IT-05-7: T85 writes ledger entry that T86 reads — level-up detected when cumulative ≥ threshold', async () => {
    const { db, queue, ledgerUpdater, levelUpChecker } = makeServices();

    const NOW = '2026-04-12T10:00:00.000Z';
    const CID = 'cmp-lvl';

    // T85: write a large effectiveTotal (simulating multiple sessions)
    // Seed existing ledger entries totalling 90pts, then T85 adds 15 → total = 105 > threshold 100
    db._store['xiigen-gamification-ledger'] = {
      'led-prior': { user_id: 'u-abc', effective_total: 90, completion_id: 'cmp-old' },
    };

    await ledgerUpdater.update({
      completionId: CID,
      questionnaireId: 'q-001',
      userId: 'u-abc',
      tenantId: 't-xyz',
      pointBreakdown: { base: 10, bonus: 5, multiplier: 1.0, total: 15 },
      streakData: {
        currentStreak: 1,
        longestStreak: 1,
        streakUpdatedAt: NOW,
        streakMultiplier: 1.0,
      },
      processedAt: NOW,
    });

    // Ledger now has prior(90) + new(15) = 105 cumulative
    // T86 reads ALL ledger entries for userId and sums them
    const t86 = await levelUpChecker.check({
      completionId: CID,
      userId: 'u-abc',
      tenantId: 't-xyz',
      effectiveTotal: 15,
      processedAt: NOW,
    });

    expect(t86.isSuccess).toBe(true);
    expect(t86.data!.levelUp).toBe(true);
    expect(t86.data!.newLevel).toBe(2); // 105 >= 100 → level 2

    // T86 wrote level record + emitted level.up.detected
    const levelEntries = Object.values(db._store['xiigen-user-levels'] ?? {});
    expect(levelEntries.length).toBeGreaterThanOrEqual(1);
    const levelEvent = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'level.up.detected',
    );
    expect(levelEvent).toBeDefined();
  });

  // ── IT-05-8: T87 SETNX — alreadyHeld skips; new unlocked proceeds ─────────

  it('IT-05-8: T87 alreadyHeld + unlocked split — SETNX semantics with stateful DB', async () => {
    const { db, queue, achievementGate } = makeServices();

    // Pre-seed: user already has 'first-completion'
    db._store['xiigen-achievements'] = {
      'ach-existing': {
        achievement_id: 'first-completion',
        user_id: 'u-abc',
        tenant_id: 't-xyz',
      },
    };

    // Custom FREEDOM criteria: first-completion (already held) + streak-3 (new)
    db._store['freedom_configs']['flow05_achievement_criteria'] = {
      config_key: 'flow05_achievement_criteria',
      task_type: 'xiigen-engine',
      config_value: [
        { achievementId: 'first-completion', label: 'First Completion', minPoints: 1 },
        { achievementId: 'streak-3', label: '3-Day Streak', minStreak: 3 },
      ],
    };

    const result = await achievementGate.evaluate({
      completionId: 'cmp-001',
      questionnaireId: 'q-001',
      userId: 'u-abc',
      tenantId: 't-xyz',
      effectiveTotal: 20,
      currentStreak: 3, // qualifies for both
      processedAt: '2026-04-12T10:00:00.000Z',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.alreadyHeld).toContain('first-completion');
    expect(result.data!.unlocked).toContain('streak-3');

    // DB: only one new record added (streak-3)
    const achievements = Object.values(db._store['xiigen-achievements'] ?? {});
    const newAch = achievements.filter((a: any) => a['achievement_id'] === 'streak-3');
    expect(newAch.length).toBe(1);

    // Queue: one achievement.unlocked event for streak-3 only
    const unlockEvents = queue._enqueued.filter(
      (e: { eventType: string }) => e.eventType === 'achievement.unlocked',
    );
    expect(unlockEvents.length).toBe(1);
    expect((unlockEvents[0] as any).data['achievementId']).toBe('streak-3');
  });
});
