/**
 * LedgerUpdater (T85) — unit tests
 *
 * Test coverage:
 *   1.  Happy path — base + bonus * streakMultiplier = effectiveTotal
 *   2.  IR-85-1: only ONE storeDocument call (no separate read-then-write)
 *   3.  IR-85-2 / DNA-8: storeDocument called BEFORE gamification.batch.stored enqueue
 *   4.  IR-85-3: streak multiplier from T96 applied at merge time (multiplier > 1.0)
 *   5.  Multiplier 1.0 (no streak bonus) → effectiveTotal == base + bonus
 *   6.  effectiveTotal rounded to nearest integer
 *   7.  DB storeDocument failure → failure, no emit
 *   8.  Validation: missing completionId → failure
 *   9.  Validation: missing userId → failure
 *  10.  Validation: missing tenantId → failure
 *  11.  Validation: missing pointBreakdown → failure
 *  12.  Validation: missing streakData → failure
 *  13.  Unexpected throw → LEDGER_UPDATER_ERROR (DNA-3)
 *  14.  knowledge_scope: 'PRIVATE' in stored document
 *  15.  gamification.batch.stored payload contains ledgerEntryId + effectiveTotal + pointBreakdown
 *  16.  streakSnapshot forwarded in event payload unchanged
 */

import { LedgerUpdater, LedgerUpdaterInput } from './ledger-updater.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('LedgerUpdater (T85)', () => {
  let callOrder: string[];

  let mockDb: { storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let service: LedgerUpdater;

  const baseInput: LedgerUpdaterInput = {
    completionId: 'cmp-001',
    questionnaireId: 'q-001',
    userId: 'u-abc',
    tenantId: 't-xyz',
    pointBreakdown: {
      base: 10,
      bonus: 5,
      multiplier: 1.0,
      total: 15,
    },
    streakData: {
      currentStreak: 3,
      longestStreak: 5,
      streakUpdatedAt: '2026-04-12T10:00:00.000Z',
      streakMultiplier: 1.2,
    },
    processedAt: '2026-04-12T10:00:00.000Z',
  };

  beforeEach(() => {
    callOrder = [];

    mockDb = {
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

    service = new LedgerUpdater(mockDb as any, mockQueue as any);
  });

  // ── 1. Happy path — effectiveTotal = (base + bonus) * multiplier ──────────

  it('computes effectiveTotal as (base + bonus) * streakMultiplier', async () => {
    // (10 + 5) * 1.2 = 18
    const result = await service.update(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.effectiveTotal).toBe(18);
  });

  // ── 2. IR-85-1: ONE storeDocument call only ───────────────────────────────

  it('IR-85-1: exactly ONE storeDocument call — no separate read-then-write', async () => {
    await service.update(baseInput);
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
  });

  // ── 3. IR-85-2 / DNA-8: storeDocument BEFORE enqueue ─────────────────────

  it('IR-85-2 DNA-8: storeDocument called BEFORE gamification.batch.stored enqueue', async () => {
    await service.update(baseInput);
    expect(callOrder[0]).toBe('storeDocument');
    expect(callOrder[1]).toBe('enqueue');
    expect(callOrder).toHaveLength(2);
  });

  // ── 4. IR-85-3: streak multiplier from T96 applied ───────────────────────

  it('IR-85-3: applies streakMultiplier from T96 (> 1.0) at merge time', async () => {
    const input: LedgerUpdaterInput = {
      ...baseInput,
      streakData: { ...baseInput.streakData, streakMultiplier: 1.5 },
    };
    // (10 + 5) * 1.5 = 22.5 → rounds to 23
    const result = await service.update(input);
    expect(result.data!.effectiveTotal).toBe(23);

    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['streak_multiplier']).toBe(1.5);
    expect(doc['effective_total']).toBe(23);
  });

  // ── 5. Multiplier 1.0 → effectiveTotal == base + bonus ───────────────────

  it('multiplier 1.0 (no streak): effectiveTotal equals base + bonus', async () => {
    const input: LedgerUpdaterInput = {
      ...baseInput,
      streakData: { ...baseInput.streakData, streakMultiplier: 1.0 },
    };
    const result = await service.update(input);
    expect(result.data!.effectiveTotal).toBe(15); // 10 + 5
  });

  // ── 6. effectiveTotal rounded to nearest integer ──────────────────────────

  it('effectiveTotal is rounded to nearest integer', async () => {
    const input: LedgerUpdaterInput = {
      ...baseInput,
      pointBreakdown: { ...baseInput.pointBreakdown, base: 7, bonus: 0, total: 7 },
      streakData: { ...baseInput.streakData, streakMultiplier: 1.3 },
    };
    // 7 * 1.3 = 9.1 → rounds to 9
    const result = await service.update(input);
    expect(result.data!.effectiveTotal).toBe(9);
  });

  // ── 7. DB storeDocument failure → no emit ────────────────────────────────

  it('returns failure and does not emit when storeDocument fails', async () => {
    mockDb.storeDocument.mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.failure('DB_WRITE_ERROR', 'ES write failed');
    });

    const result = await service.update(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_ERROR');
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 8–12. Validation failures ─────────────────────────────────────────────

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

  it('returns failure for missing pointBreakdown', async () => {
    const r = await service.update({ ...baseInput, pointBreakdown: null as any });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing streakData', async () => {
    const r = await service.update({ ...baseInput, streakData: null as any });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  // ── 13. Unexpected throw → LEDGER_UPDATER_ERROR ───────────────────────────

  it('DNA-3: returns LEDGER_UPDATER_ERROR on unexpected throw', async () => {
    mockDb.storeDocument.mockRejectedValue(new Error('Unexpected crash'));
    const result = await service.update(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('LEDGER_UPDATER_ERROR');
    expect(result.errorMessage).toContain('Unexpected crash');
  });

  // ── 14. knowledge_scope: 'PRIVATE' ───────────────────────────────────────

  it('stored document has knowledge_scope PRIVATE', async () => {
    await service.update(baseInput);
    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  // ── 15. gamification.batch.stored payload ────────────────────────────────

  it('gamification.batch.stored payload contains ledgerEntryId, effectiveTotal, pointBreakdown', async () => {
    const result = await service.update(baseInput);

    const [eventType, payload] = mockQueue.enqueue.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(eventType).toBe('gamification.batch.stored');
    expect(payload['ledgerEntryId']).toBe(result.data!.ledgerEntryId);
    expect(payload['effectiveTotal']).toBe(18);
    expect(payload['pointBreakdown']).toEqual(
      expect.objectContaining({ base: 10, bonus: 5, effectiveTotal: 18 }),
    );
    expect(payload['userId']).toBe('u-abc');
    expect(payload['tenantId']).toBe('t-xyz');
  });

  // ── 16. streakSnapshot forwarded unchanged ────────────────────────────────

  it('streakSnapshot forwarded in event payload unchanged', async () => {
    await service.update(baseInput);

    const [, payload] = mockQueue.enqueue.mock.calls[0] as [string, Record<string, unknown>];
    const snap = payload['streakSnapshot'] as typeof baseInput.streakData;
    expect(snap.currentStreak).toBe(3);
    expect(snap.longestStreak).toBe(5);
    expect(snap.streakMultiplier).toBe(1.2);
  });
});
