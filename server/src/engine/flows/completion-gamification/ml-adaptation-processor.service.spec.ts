/**
 * MLAdaptationProcessor (T89) — unit tests
 *
 * Iron rules under test:
 *   IR-89-1: count ceiling — recommendedModules.length > maxChanges → applied=false, reason='COUNT_CEILING'
 *   IR-89-2: protected modules — all recommended modules in PROTECTED_MODULES → applied=false, reason='ALL_PROTECTED'
 *   IR-89-3: recency cooldown — last adaptation within cooldownDays → applied=false, reason='TOO_RECENT'
 *   DNA-8:   storeDocument BEFORE ml.adaptation.completed enqueue
 *   DNA-3:   all methods return DataProcessResult<T> — never throw
 *
 * Dates used:
 *   baseInput.processedAt = '2026-04-12T10:00:00.000Z'  (today)
 *   TOO_RECENT_AT         = '2026-04-10T10:00:00.000Z'  (2 days ago, within default cooldown=7)
 *   OUTSIDE_COOLDOWN_AT   = '2026-04-04T10:00:00.000Z'  (8 days ago, outside default cooldown=7)
 */

import {
  MLAdaptationProcessor,
  MLAdaptationProcessorInput,
} from './ml-adaptation-processor.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

const TOO_RECENT_AT = '2026-04-10T10:00:00.000Z'; // 2 days before '2026-04-12T10:00:00.000Z'
const OUTSIDE_COOLDOWN_AT = '2026-04-04T10:00:00.000Z'; // 8 days before '2026-04-12T10:00:00.000Z'

describe('MLAdaptationProcessor (T89)', () => {
  let callOrder: string[];

  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let service: MLAdaptationProcessor;

  const baseInput: MLAdaptationProcessorInput = {
    requestId: 'mlr-001',
    userId: 'u-abc',
    tenantId: 't-xyz',
    recommendedModules: ['module-a', 'module-b'],
    processedAt: '2026-04-12T10:00:00.000Z',
  };

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

    service = new MLAdaptationProcessor(mockDb as any, mockQueue as any);
  });

  // ── 1. All guards pass → applied=true, storeDocument + enqueue called ─────

  it('all guards pass: applied=true, storeDocument and enqueue called', async () => {
    const result = await service.process(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.applied).toBe(true);
    expect(result.data!.adaptationRecordId).toBeDefined();
    expect(result.data!.appliedModules).toEqual(['module-a', 'module-b']);
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
  });

  // ── 2. IR-89-1: count ceiling exceeded ───────────────────────────────────

  it('IR-89-1: recommendedModules.length > maxChanges → applied=false, COUNT_CEILING, no store, no emit', async () => {
    // Default maxChanges=5; provide 6 modules to exceed ceiling
    const input: MLAdaptationProcessorInput = {
      ...baseInput,
      recommendedModules: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'],
    };

    const result = await service.process(input);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.applied).toBe(false);
    expect(result.data!.reason).toBe('COUNT_CEILING');
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 3. IR-89-2: all recommended modules are protected ────────────────────

  it('IR-89-2: all recommended modules are protected → applied=false, ALL_PROTECTED, no store', async () => {
    const input: MLAdaptationProcessorInput = {
      ...baseInput,
      recommendedModules: ['core-onboarding', 'mandatory-compliance'],
    };

    const result = await service.process(input);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.applied).toBe(false);
    expect(result.data!.reason).toBe('ALL_PROTECTED');
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
  });

  // ── 4. IR-89-2: some modules protected, some not → only non-protected applied

  it('IR-89-2: mixed modules — only non-protected modules in appliedModules', async () => {
    const input: MLAdaptationProcessorInput = {
      ...baseInput,
      recommendedModules: ['core-onboarding', 'module-a', 'mandatory-compliance', 'module-b'],
    };

    const result = await service.process(input);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.applied).toBe(true);
    expect(result.data!.appliedModules).toEqual(['module-a', 'module-b']);
  });

  // ── 5. IR-89-3: too recent (within cooldown) ─────────────────────────────

  it('IR-89-3: last adaptation within cooldown → applied=false, TOO_RECENT, no store', async () => {
    mockDb.searchDocuments.mockImplementation(async (index: string) => {
      if (index === 'xiigen-ml-adaptations') {
        return DataProcessResult.success([
          {
            adaptation_record_id: 'mla-old',
            user_id: 'u-abc',
            adapted_at: TOO_RECENT_AT,
          },
        ]);
      }
      return DataProcessResult.success([]);
    });

    const result = await service.process(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.applied).toBe(false);
    expect(result.data!.reason).toBe('TOO_RECENT');
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
  });

  // ── 6. IR-89-3: just outside cooldown → guard passes, applied=true ────────

  it('IR-89-3: last adaptation just outside cooldown (8 days, cooldown=7) → applied=true', async () => {
    mockDb.searchDocuments.mockImplementation(async (index: string) => {
      if (index === 'xiigen-ml-adaptations') {
        return DataProcessResult.success([
          {
            adaptation_record_id: 'mla-old',
            user_id: 'u-abc',
            adapted_at: OUTSIDE_COOLDOWN_AT,
          },
        ]);
      }
      return DataProcessResult.success([]);
    });

    const result = await service.process(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.applied).toBe(true);
  });

  // ── 7. DNA-8: storeDocument BEFORE enqueue ───────────────────────────────

  it('DNA-8: storeDocument called BEFORE ml.adaptation.completed enqueue', async () => {
    await service.process(baseInput);

    expect(callOrder[0]).toBe('storeDocument');
    expect(callOrder[1]).toBe('enqueue');
  });

  // ── 8. knowledge_scope: 'PRIVATE' in stored doc ──────────────────────────

  it('stored adaptation record has knowledge_scope PRIVATE', async () => {
    await service.process(baseInput);

    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  // ── 9. ml.adaptation.completed payload ───────────────────────────────────

  it('ml.adaptation.completed payload contains adaptationRecordId, userId, appliedModules', async () => {
    await service.process(baseInput);

    const [eventType, payload] = mockQueue.enqueue.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(eventType).toBe('ml.adaptation.completed');
    expect(payload['adaptationRecordId']).toBeDefined();
    expect(payload['userId']).toBe('u-abc');
    expect(payload['appliedModules']).toEqual(['module-a', 'module-b']);
  });

  // ── 10. Validation: missing requestId ────────────────────────────────────

  it('returns VALIDATION_FAILURE for missing requestId', async () => {
    const result = await service.process({ ...baseInput, requestId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  // ── 11. Validation: missing userId ───────────────────────────────────────

  it('returns VALIDATION_FAILURE for missing userId', async () => {
    const result = await service.process({ ...baseInput, userId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  // ── 12. Validation: missing tenantId ─────────────────────────────────────

  it('returns VALIDATION_FAILURE for missing tenantId', async () => {
    const result = await service.process({ ...baseInput, tenantId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  // ── 13. storeDocument failure → failure, no emit ─────────────────────────

  it('returns failure and does not emit when storeDocument fails', async () => {
    mockDb.storeDocument.mockImplementation(async () =>
      DataProcessResult.failure('DB_WRITE_ERROR', 'ES write failed'),
    );

    const result = await service.process(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_ERROR');
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 14. DNA-3: unexpected throw → ML_ADAPTATION_PROCESSOR_ERROR ──────────

  it('DNA-3: returns ML_ADAPTATION_PROCESSOR_ERROR on unexpected throw', async () => {
    mockDb.searchDocuments.mockRejectedValue(new Error('crash'));

    const result = await service.process(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ML_ADAPTATION_PROCESSOR_ERROR');
  });
});
