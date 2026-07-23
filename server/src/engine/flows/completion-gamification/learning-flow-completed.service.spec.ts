/**
 * LearningFlowCompleted (T98) — unit tests
 *
 * Test coverage:
 *   1.  Happy path — storeDocument + emit learning.flow.completed
 *   2.  IR-98-2 / DNA-8: storeDocument called BEFORE learning.flow.completed enqueue
 *   3.  IR-98-1: stored doc has completion_gate_branch = 'BRANCH_A_ONLY'
 *   4.  learning.flow.completed payload shape: completionSummaryId, userId, tenantId, effectiveTotal
 *   5.  levelUp=true forwarded in payload and stored doc when present
 *   6.  levelUp defaults to false when absent
 *   7.  unlockedAchievements forwarded in payload when present
 *   8.  unlockedAchievements defaults to [] when absent
 *   9.  knowledge_scope: 'PRIVATE' in stored doc
 *  10.  Validation: missing completionId → failure
 *  11.  Validation: missing userId → failure
 *  12.  Validation: missing tenantId → failure
 *  13.  Validation: missing ledgerEntryId → failure
 *  14.  storeDocument failure → failure, no emit
 *  15.  DNA-3: unexpected throw → LEARNING_FLOW_COMPLETED_ERROR
 */

import {
  LearningFlowCompleted,
  LearningFlowCompletedInput,
} from './learning-flow-completed.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('LearningFlowCompleted (T98)', () => {
  let callOrder: string[];

  let mockDb: { storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let service: LearningFlowCompleted;

  const baseInput: LearningFlowCompletedInput = {
    completionId: 'cmp-001',
    questionnaireId: 'q-001',
    userId: 'u-abc',
    tenantId: 't-xyz',
    ledgerEntryId: 'led-001',
    effectiveTotal: 18,
    levelUp: false,
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

    service = new LearningFlowCompleted(mockDb as any, mockQueue as any);
  });

  // ── 1. Happy path ─────────────────────────────────────────────────────────

  it('stores completion summary and emits learning.flow.completed', async () => {
    const result = await service.complete(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.eventEmitted).toBe(true);
    expect(result.data!.completionSummaryId).toBeTruthy();
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
  });

  // ── 2. IR-98-2 / DNA-8: storeDocument BEFORE enqueue ────────────────────

  it('IR-98-2 DNA-8: storeDocument called BEFORE learning.flow.completed enqueue', async () => {
    await service.complete(baseInput);

    expect(callOrder[0]).toBe('storeDocument');
    expect(callOrder[1]).toBe('enqueue');
  });

  // ── 3. IR-98-1: completion_gate_branch = BRANCH_A_ONLY ───────────────────

  it('IR-98-1: stored doc has completion_gate_branch = BRANCH_A_ONLY', async () => {
    await service.complete(baseInput);
    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['completion_gate_branch']).toBe('BRANCH_A_ONLY');
  });

  // ── 4. payload shape ──────────────────────────────────────────────────────

  it('learning.flow.completed payload contains completionSummaryId, userId, tenantId, effectiveTotal', async () => {
    const result = await service.complete(baseInput);

    const [eventType, payload] = mockQueue.enqueue.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(eventType).toBe('learning.flow.completed');
    expect(payload['completionSummaryId']).toBe(result.data!.completionSummaryId);
    expect(payload['userId']).toBe('u-abc');
    expect(payload['tenantId']).toBe('t-xyz');
    expect(payload['effectiveTotal']).toBe(18);
  });

  // ── 5. levelUp=true forwarded ─────────────────────────────────────────────

  it('levelUp=true and newLevel forwarded in payload and stored doc', async () => {
    const input: LearningFlowCompletedInput = { ...baseInput, levelUp: true, newLevel: 2 };
    await service.complete(input);

    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    const [, payload] = mockQueue.enqueue.mock.calls[0] as [string, Record<string, unknown>];

    expect(doc['level_up']).toBe(true);
    expect(doc['new_level']).toBe(2);
    expect(payload['levelUp']).toBe(true);
    expect(payload['newLevel']).toBe(2);
  });

  // ── 6. levelUp defaults to false ─────────────────────────────────────────

  it('levelUp defaults to false in payload when absent from input', async () => {
    const input: LearningFlowCompletedInput = {
      ...baseInput,
      levelUp: undefined,
      newLevel: undefined,
    };
    await service.complete(input);

    const [, payload] = mockQueue.enqueue.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload['levelUp']).toBe(false);
    expect(payload['newLevel']).toBeNull();
  });

  // ── 7. unlockedAchievements forwarded ────────────────────────────────────

  it('unlockedAchievements forwarded in payload when present', async () => {
    const input: LearningFlowCompletedInput = {
      ...baseInput,
      unlockedAchievements: ['first-completion', 'streak-3'],
    };
    await service.complete(input);

    const [, payload] = mockQueue.enqueue.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload['unlockedAchievements']).toEqual(['first-completion', 'streak-3']);
  });

  // ── 8. unlockedAchievements defaults to [] ───────────────────────────────

  it('unlockedAchievements defaults to [] when absent from input', async () => {
    await service.complete(baseInput); // baseInput has no unlockedAchievements

    const [, payload] = mockQueue.enqueue.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload['unlockedAchievements']).toEqual([]);
  });

  // ── 9. knowledge_scope: 'PRIVATE' ────────────────────────────────────────

  it('stored completion summary has knowledge_scope PRIVATE', async () => {
    await service.complete(baseInput);
    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  // ── 10–13. Validation failures ───────────────────────────────────────────

  it('returns failure for missing completionId', async () => {
    const r = await service.complete({ ...baseInput, completionId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing userId', async () => {
    const r = await service.complete({ ...baseInput, userId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing tenantId', async () => {
    const r = await service.complete({ ...baseInput, tenantId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing ledgerEntryId', async () => {
    const r = await service.complete({ ...baseInput, ledgerEntryId: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('VALIDATION_FAILURE');
  });

  // ── 14. storeDocument failure → no emit ──────────────────────────────────

  it('returns failure and does not emit when storeDocument fails', async () => {
    mockDb.storeDocument.mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.failure('DB_WRITE_ERROR', 'ES write failed');
    });

    const result = await service.complete(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_ERROR');
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 15. DNA-3: unexpected throw ───────────────────────────────────────────

  it('DNA-3: returns LEARNING_FLOW_COMPLETED_ERROR on unexpected throw', async () => {
    mockDb.storeDocument.mockRejectedValue(new Error('crash'));
    const result = await service.complete(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('LEARNING_FLOW_COMPLETED_ERROR');
  });
});
