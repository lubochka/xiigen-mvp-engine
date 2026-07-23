/**
 * FLOW-05 Phase B Unit Tests — T85 (LedgerUpdater) + T86 (LevelUpChecker)
 *
 * T85 — LedgerUpdater
 *   B-85-1: Happy path — effectiveTotal = Math.round((base + bonus) * multiplier), ledger entry stored
 *   B-85-2: IR-85-1 — exactly ONE storeDocument call
 *   B-85-3: IR-85-2 DNA-8 — storeDocument before gamification.batch.stored emit in callOrder
 *   B-85-4: IR-85-3 — streak multiplier > 1.0 applied correctly (1.5x gives higher total)
 *   B-85-5: knowledge_scope:'PRIVATE' in stored ledger doc
 *   B-85-6: DNA-3 — unexpected throw → LEDGER_UPDATER_ERROR
 *
 * T86 — LevelUpChecker
 *   B-86-1: No threshold crossed → success({ levelUp:false }), no storeDocument, no enqueue
 *   B-86-2: Cumulative >= threshold → levelUp:true, newLevel:2
 *   B-86-3: IR-86-1 — FREEDOM config thresholds used ([100,300,600])
 *   B-86-4: IR-86-3 DNA-8 — storeDocument before level.up.detected enqueue
 *   B-86-5: knowledge_scope:'PRIVATE' in stored level record
 *   B-86-6: DNA-3 — unexpected throw → LEVEL_UP_CHECKER_ERROR
 */

import 'reflect-metadata';
import {
  LedgerUpdater,
  LedgerUpdaterInput,
} from '../../src/engine/flows/completion-gamification/ledger-updater.service';
import {
  LevelUpChecker,
  LevelUpCheckerInput,
} from '../../src/engine/flows/completion-gamification/level-up-checker.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Shared mock factory ───────────────────────────────────────────────────────

function makeDb(
  callOrder: string[],
  searchImpl?: (index: string, filter: Record<string, unknown>) => DataProcessResult<unknown[]>,
) {
  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, filter: Record<string, unknown>) => {
        if (searchImpl) return searchImpl(index, filter);
        return DataProcessResult.success([]);
      }),
    storeDocument: jest.fn().mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.success({});
    }),
  };
}

function makeQueue(callOrder: string[]) {
  const _enqueued: Array<{ eventType: string; data: unknown }> = [];
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, data: unknown) => {
      callOrder.push('enqueue');
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
}

// ── T85 LedgerUpdater ─────────────────────────────────────────────────────────

describe('T85 LedgerUpdater', () => {
  function makeBaseInput(overrides: Partial<LedgerUpdaterInput> = {}): LedgerUpdaterInput {
    return {
      completionId: 'cmp-001',
      questionnaireId: 'q-001',
      userId: 'u-001',
      tenantId: 'tenant-001',
      pointBreakdown: { base: 10, bonus: 5, multiplier: 1.0, total: 15 },
      streakData: {
        currentStreak: 3,
        longestStreak: 5,
        streakUpdatedAt: '2026-04-12T10:00:00Z',
        streakMultiplier: 1.0,
      },
      ...overrides,
    };
  }

  it('B-85-1: happy path — effectiveTotal = Math.round((base + bonus) * streakMultiplier), entry stored', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new LedgerUpdater(db as any, queue as any);

    const result = await svc.update(makeBaseInput());

    expect(result.isSuccess).toBe(true);
    // base=10 bonus=5 multiplier=1.0 → effectiveTotal = Math.round(15 * 1.0) = 15
    expect(result.data!.effectiveTotal).toBe(15);
    expect(result.data!.ledgerEntryId).toMatch(/^le-/);
  });

  it('B-85-2: IR-85-1 — exactly ONE storeDocument call', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new LedgerUpdater(db as any, queue as any);

    await svc.update(makeBaseInput());

    expect(db.storeDocument).toHaveBeenCalledTimes(1);
  });

  it('B-85-3: IR-85-2 DNA-8 — storeDocument before gamification.batch.stored emit', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new LedgerUpdater(db as any, queue as any);

    await svc.update(makeBaseInput());

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
    expect(queue._enqueued[0].eventType).toBe('gamification.batch.stored');
  });

  it('B-85-4: IR-85-3 — streak multiplier 1.5x applied correctly', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new LedgerUpdater(db as any, queue as any);

    const input = makeBaseInput({
      pointBreakdown: { base: 10, bonus: 5, multiplier: 1.0, total: 15 },
      streakData: {
        currentStreak: 7,
        longestStreak: 10,
        streakUpdatedAt: '2026-04-12T10:00:00Z',
        streakMultiplier: 1.5,
      },
    });

    const result = await svc.update(input);

    expect(result.isSuccess).toBe(true);
    // Math.round((10 + 5) * 1.5) = Math.round(22.5) = 23
    expect(result.data!.effectiveTotal).toBe(23);
    expect(result.data!.effectiveTotal).toBeGreaterThan(15);
  });

  it('B-85-5: knowledge_scope PRIVATE in stored ledger doc', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new LedgerUpdater(db as any, queue as any);

    await svc.update(makeBaseInput());

    const [_index, doc] = db.storeDocument.mock.calls[0] as [
      string,
      Record<string, unknown>,
      string,
    ];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  it('B-85-6: DNA-3 — unexpected throw returns LEDGER_UPDATER_ERROR', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db gone')),
      storeDocument: jest.fn().mockRejectedValue(new Error('db gone')),
    };
    const queue = makeQueue(callOrder);
    const svc = new LedgerUpdater(db as any, queue as any);

    const result = await svc.update(makeBaseInput());

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('LEDGER_UPDATER_ERROR');
  });
});

// ── T86 LevelUpChecker ────────────────────────────────────────────────────────

describe('T86 LevelUpChecker', () => {
  const baseInput: LevelUpCheckerInput = {
    completionId: 'cmp-001',
    userId: 'u-001',
    tenantId: 'tenant-001',
    effectiveTotal: 50,
  };

  /** FREEDOM config doc with thresholds [100, 300, 600]. */
  const freedomThresholdsDoc: Record<string, unknown> = {
    config_key: 'flow05_level_thresholds',
    config_value: [100, 300, 600],
  };

  /**
   * Build a DB mock for T86.
   * @param ledgerEntries  All entries in xiigen-gamification-ledger for this user.
   * @param currentLevel   Level stored in xiigen-user-levels (default 1, omit for fresh user).
   */
  function makeT86Db(
    callOrder: string[],
    ledgerEntries: Array<Record<string, unknown>>,
    currentLevel?: number,
  ) {
    const levelDocs: Array<Record<string, unknown>> =
      currentLevel !== undefined
        ? [{ level_record_id: 'lv-existing', user_id: 'u-001', level: currentLevel }]
        : [];

    return {
      searchDocuments: jest
        .fn()
        .mockImplementation(async (index: string, _filter: Record<string, unknown>) => {
          if (index === 'xiigen-gamification-ledger') {
            return DataProcessResult.success(ledgerEntries);
          }
          if (index === 'xiigen-user-levels') {
            return DataProcessResult.success(levelDocs);
          }
          if (index === 'freedom_configs') {
            return DataProcessResult.success([freedomThresholdsDoc]);
          }
          return DataProcessResult.success([]);
        }),
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
    };
  }

  it('B-86-1: no threshold crossed — returns success({ levelUp:false }), no store, no emit', async () => {
    const callOrder: string[] = [];
    // cumulative = 50, threshold for level 2 = 100 → not crossed
    const ledger = [{ effective_total: 50, user_id: 'u-001' }];
    const db = makeT86Db(callOrder, ledger, 1);
    const queue = makeQueue(callOrder);
    const svc = new LevelUpChecker(db as any, queue as any);

    const result = await svc.check(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.levelUp).toBe(false);
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('B-86-2: cumulative >= first threshold → levelUp:true, newLevel:2', async () => {
    const callOrder: string[] = [];
    // cumulative = 120 >= 100 → level 2
    const ledger = [{ effective_total: 120, user_id: 'u-001' }];
    const db = makeT86Db(callOrder, ledger, 1);
    const queue = makeQueue(callOrder);
    const svc = new LevelUpChecker(db as any, queue as any);

    const result = await svc.check({ ...baseInput, effectiveTotal: 120 });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.levelUp).toBe(true);
    expect(result.data!.newLevel).toBe(2);
  });

  it('B-86-3: IR-86-1 — FREEDOM config thresholds [100,300,600] are read and applied', async () => {
    const callOrder: string[] = [];
    // cumulative = 350 >= 300 → level 3 (thresholds[1])
    const ledger = [{ effective_total: 350, user_id: 'u-001' }];
    const db = makeT86Db(callOrder, ledger, 1);
    const queue = makeQueue(callOrder);
    const svc = new LevelUpChecker(db as any, queue as any);

    const result = await svc.check({ ...baseInput, effectiveTotal: 350 });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.levelUp).toBe(true);
    // 350 >= 300 → level 3; not >= 600 so not level 4
    expect(result.data!.newLevel).toBe(3);
    // Verify FREEDOM config was queried
    const freedomCall = (
      db.searchDocuments.mock.calls as Array<[string, Record<string, unknown>]>
    ).find(([idx]) => idx === 'freedom_configs');
    expect(freedomCall).toBeDefined();
  });

  it('B-86-4: IR-86-3 DNA-8 — storeDocument before level.up.detected enqueue', async () => {
    const callOrder: string[] = [];
    const ledger = [{ effective_total: 150, user_id: 'u-001' }];
    const db = makeT86Db(callOrder, ledger, 1);
    const queue = makeQueue(callOrder);
    const svc = new LevelUpChecker(db as any, queue as any);

    await svc.check({ ...baseInput, effectiveTotal: 150 });

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
    expect(queue._enqueued[0].eventType).toBe('level.up.detected');
  });

  it('B-86-5: knowledge_scope PRIVATE in stored level record', async () => {
    const callOrder: string[] = [];
    const ledger = [{ effective_total: 150, user_id: 'u-001' }];
    const db = makeT86Db(callOrder, ledger, 1);
    const queue = makeQueue(callOrder);
    const svc = new LevelUpChecker(db as any, queue as any);

    await svc.check({ ...baseInput, effectiveTotal: 150 });

    const [_index, doc] = db.storeDocument.mock.calls[0] as [
      string,
      Record<string, unknown>,
      string,
    ];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  it('B-86-6: DNA-3 — unexpected throw returns LEVEL_UP_CHECKER_ERROR', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db down')),
      storeDocument: jest.fn(),
    };
    const queue = makeQueue(callOrder);
    const svc = new LevelUpChecker(db as any, queue as any);

    const result = await svc.check(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('LEVEL_UP_CHECKER_ERROR');
  });
});
