/**
 * GamificationAnalytics (T97) — unit tests
 *
 * Archetype: OBSERVABILITY — pure store, no queue emit.
 *
 * Test coverage:
 *   1.  Happy path — storeDocument called once, no enqueue
 *   2.  analyticsRecordId returned in result
 *   3.  knowledge_scope: 'PRIVATE' in stored record
 *   4.  streakSnapshot forwarded in stored doc
 *   5.  streakSnapshot null when omitted
 *   6.  Validation: missing ledgerEntryId → failure
 *   7.  Validation: missing completionId → failure
 *   8.  Validation: missing userId → failure
 *   9.  Validation: missing tenantId → failure
 *  10.  storeDocument failure → failure
 *  11.  DNA-3: unexpected throw → GAMIFICATION_ANALYTICS_ERROR
 */

import {
  GamificationAnalytics,
  GamificationAnalyticsInput,
} from './gamification-analytics.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('GamificationAnalytics (T97)', () => {
  let mockDb: { storeDocument: jest.Mock };
  let service: GamificationAnalytics;

  const baseInput: GamificationAnalyticsInput = {
    ledgerEntryId: 'led-001',
    completionId: 'cmp-001',
    userId: 'u-abc',
    tenantId: 't-xyz',
    effectiveTotal: 18,
    pointBreakdown: { base: 10, bonus: 5, multiplier: 1.2, effectiveTotal: 18 },
    streakSnapshot: { currentStreak: 3, streakMultiplier: 1.3 },
    processedAt: '2026-04-12T10:00:00.000Z',
  };

  beforeEach(() => {
    mockDb = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };

    service = new GamificationAnalytics(mockDb as any);
  });

  // ── 1. Happy path — one storeDocument, no emit ────────────────────────────

  it('stores analytics record and does not emit (OBSERVABILITY — no enqueue)', async () => {
    const result = await service.record(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
  });

  // ── 2. analyticsRecordId returned ────────────────────────────────────────

  it('returns analyticsRecordId in result', async () => {
    const result = await service.record(baseInput);

    expect(result.data!.analyticsRecordId).toBeTruthy();
    expect(typeof result.data!.analyticsRecordId).toBe('string');
  });

  // ── 3. knowledge_scope: 'PRIVATE' ────────────────────────────────────────

  it('stored analytics record has knowledge_scope PRIVATE', async () => {
    await service.record(baseInput);
    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  // ── 4. streakSnapshot forwarded ──────────────────────────────────────────

  it('streakSnapshot is forwarded into stored document', async () => {
    await service.record(baseInput);
    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['streak_snapshot']).toEqual({ currentStreak: 3, streakMultiplier: 1.3 });
  });

  // ── 5. streakSnapshot null when omitted ──────────────────────────────────

  it('streak_snapshot is null in stored doc when input.streakSnapshot omitted', async () => {
    const input: GamificationAnalyticsInput = { ...baseInput, streakSnapshot: undefined };
    await service.record(input);
    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['streak_snapshot']).toBeNull();
  });

  // ── 6–9. Validation failures ──────────────────────────────────────────────

  it('returns failure for missing ledgerEntryId', async () => {
    const r = await service.record({ ...baseInput, ledgerEntryId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing completionId', async () => {
    const r = await service.record({ ...baseInput, completionId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing userId', async () => {
    const r = await service.record({ ...baseInput, userId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing tenantId', async () => {
    const r = await service.record({ ...baseInput, tenantId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  // ── 10. storeDocument failure ─────────────────────────────────────────────

  it('returns failure when storeDocument fails', async () => {
    mockDb.storeDocument.mockResolvedValue(
      DataProcessResult.failure('DB_WRITE_ERROR', 'ES write failed'),
    );

    const result = await service.record(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_ERROR');
  });

  // ── 11. DNA-3: unexpected throw → GAMIFICATION_ANALYTICS_ERROR ───────────

  it('DNA-3: returns GAMIFICATION_ANALYTICS_ERROR on unexpected throw', async () => {
    mockDb.storeDocument.mockRejectedValue(new Error('crash'));
    const result = await service.record(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('GAMIFICATION_ANALYTICS_ERROR');
  });
});
