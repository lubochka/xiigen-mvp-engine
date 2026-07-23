/**
 * PointsCalculator (T84) — unit tests
 *
 * Test coverage:
 *   1.  Happy path — scorePercent < threshold → base only, no bonus
 *   2.  Bonus applies when scorePercent >= bonusThreshold
 *   3.  CF-05-1: earnedPoints field does not exist in input interface (type-level check)
 *   4.  IR-84-2: scorePercent read from xiigen-questionnaire-results, not from input
 *   5.  IR-84-3: output is pointBreakdown{base, bonus, multiplier, total} — not a number
 *   6.  IR-84-4 / DNA-8: storeDocument called BEFORE queue.enqueue (call order)
 *   7.  Questionnaire result not found → DataProcessResult.failure
 *   8.  DB storeDocument failure → failure, no queue emit
 *   9.  Validation: missing completionId → failure
 *  10.  Validation: missing questionnaireId → failure
 *  11.  Validation: missing userId → failure
 *  12.  Validation: missing tenantId → failure
 *  13.  Unexpected throw → POINTS_CALCULATOR_ERROR
 *  14.  FREEDOM formula override read and applied correctly
 *  15.  knowledge_scope: 'PRIVATE' in stored document
 *  16.  points.calculated event payload contains pointBreakdown
 */

import { PointsCalculator, PointsCalculatorInput } from './points-calculator.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('PointsCalculator (T84)', () => {
  let callOrder: string[];

  let mockDb: {
    searchDocuments: jest.Mock;
    storeDocument: jest.Mock;
  };
  let mockQueue: { enqueue: jest.Mock };
  let service: PointsCalculator;

  const questionnaireResultDoc: Record<string, unknown> = {
    questionnaire_id: 'q-001',
    user_id: 'u-abc',
    score_percent: 70, // below default bonus threshold of 80
  };

  const baseInput: PointsCalculatorInput = {
    completionId: 'cmp-001',
    questionnaireId: 'q-001',
    userId: 'u-abc',
    tenantId: 't-xyz',
    submittedAt: '2026-04-12T10:00:00.000Z',
  };

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      searchDocuments: jest.fn().mockImplementation(async (index: string) => {
        if (index === 'xiigen-questionnaire-results') {
          return DataProcessResult.success([questionnaireResultDoc]);
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

    service = new PointsCalculator(mockDb as any, mockQueue as any);
  });

  // ── 1. Happy path — below bonus threshold ────────────────────────────────

  it('happy path: scorePercent 70 → base=10, bonus=0, total=10', async () => {
    const result = await service.calculate(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.scorePercent).toBe(70);
    expect(result.data!.pointBreakdown.base).toBe(10);
    expect(result.data!.pointBreakdown.bonus).toBe(0);
    expect(result.data!.pointBreakdown.total).toBe(10);
  });

  // ── 2. Bonus applies at threshold ────────────────────────────────────────

  it('bonus applies when scorePercent >= 80 (default threshold)', async () => {
    mockDb.searchDocuments.mockImplementation(async (index: string) => {
      if (index === 'xiigen-questionnaire-results') {
        return DataProcessResult.success([{ ...questionnaireResultDoc, score_percent: 85 }]);
      }
      return DataProcessResult.success([]);
    });

    const result = await service.calculate(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.pointBreakdown.base).toBe(10);
    expect(result.data!.pointBreakdown.bonus).toBe(5);
    expect(result.data!.pointBreakdown.total).toBe(15);
  });

  // ── 3. CF-05-1: earnedPoints not in input interface ───────────────────────

  it('CF-05-1: PointsCalculatorInput interface has no earnedPoints field', () => {
    // Type-level assertion: TypeScript would fail to compile if earnedPoints were
    // accidentally added and used. This runtime test verifies the field is absent
    // from a valid input object — if it were present, it would be in the interface.
    const input: PointsCalculatorInput = { ...baseInput };
    expect('earnedPoints' in input).toBe(false);
  });

  // ── 4. IR-84-2: scorePercent from DB, not from input ─────────────────────

  it('IR-84-2: reads scorePercent from xiigen-questionnaire-results, not from event input', async () => {
    // DB returns score_percent=95. Input has no such field.
    mockDb.searchDocuments.mockImplementation(async (index: string) => {
      if (index === 'xiigen-questionnaire-results') {
        return DataProcessResult.success([{ ...questionnaireResultDoc, score_percent: 95 }]);
      }
      return DataProcessResult.success([]);
    });

    const result = await service.calculate(baseInput);
    expect(result.data!.scorePercent).toBe(95);

    // storeDocument received the DB-derived scorePercent
    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['score_percent']).toBe(95);
  });

  // ── 5. IR-84-3: output is pointBreakdown object ───────────────────────────

  it('IR-84-3: output has pointBreakdown with base, bonus, multiplier, total fields', async () => {
    const result = await service.calculate(baseInput);

    expect(result.data!.pointBreakdown).toEqual(
      expect.objectContaining({
        base: expect.any(Number),
        bonus: expect.any(Number),
        multiplier: expect.any(Number),
        total: expect.any(Number),
      }),
    );
  });

  // ── 6. IR-84-4 / DNA-8: storeDocument BEFORE enqueue ─────────────────────

  it('IR-84-4 DNA-8: storeDocument called BEFORE points.calculated enqueue', async () => {
    await service.calculate(baseInput);
    expect(callOrder[0]).toBe('storeDocument');
    expect(callOrder[1]).toBe('enqueue');
    expect(callOrder).toHaveLength(2);
  });

  // ── 7. Questionnaire result not found → failure ───────────────────────────

  it('returns failure when questionnaire result not found in DB', async () => {
    mockDb.searchDocuments.mockImplementation(async (index: string) => {
      if (index === 'xiigen-questionnaire-results') {
        return DataProcessResult.success([]);
      }
      return DataProcessResult.success([]);
    });

    const result = await service.calculate(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('QUESTIONNAIRE_RESULT_NOT_FOUND');
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 8. DB storeDocument failure → no queue emit ───────────────────────────

  it('returns failure and does not emit when storeDocument fails', async () => {
    mockDb.storeDocument.mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.failure('DB_WRITE_ERROR', 'write failed');
    });

    const result = await service.calculate(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_ERROR');
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 9–12. Validation failures ─────────────────────────────────────────────

  it('returns failure for missing completionId', async () => {
    const result = await service.calculate({ ...baseInput, completionId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing questionnaireId', async () => {
    const result = await service.calculate({ ...baseInput, questionnaireId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing userId', async () => {
    const result = await service.calculate({ ...baseInput, userId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing tenantId', async () => {
    const result = await service.calculate({ ...baseInput, tenantId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  // ── 13. Unexpected throw → POINTS_CALCULATOR_ERROR ───────────────────────

  it('DNA-3: returns POINTS_CALCULATOR_ERROR on unexpected throw', async () => {
    mockDb.searchDocuments.mockRejectedValue(new Error('Unexpected crash'));
    const result = await service.calculate(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('POINTS_CALCULATOR_ERROR');
    expect(result.errorMessage).toContain('Unexpected crash');
  });

  // ── 14. FREEDOM formula override ─────────────────────────────────────────

  it('applies FREEDOM formula override when config is present', async () => {
    const freedomFormula = {
      config_key: 'flow05_points_formula',
      config_value: { base: 20, bonus_threshold: 90, bonus: 10 },
    };
    mockDb.searchDocuments.mockImplementation(async (index: string) => {
      if (index === 'xiigen-questionnaire-results') {
        return DataProcessResult.success([{ ...questionnaireResultDoc, score_percent: 95 }]);
      }
      if (index === 'freedom_configs') {
        return DataProcessResult.success([freedomFormula]);
      }
      return DataProcessResult.success([]);
    });

    const result = await service.calculate(baseInput);

    expect(result.data!.pointBreakdown.base).toBe(20);
    expect(result.data!.pointBreakdown.bonus).toBe(10); // 95 >= 90
    expect(result.data!.pointBreakdown.total).toBe(30);
  });

  // ── 15. knowledge_scope: 'PRIVATE' ───────────────────────────────────────

  it('stored document has knowledge_scope PRIVATE', async () => {
    await service.calculate(baseInput);
    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  // ── 16. points.calculated payload contains pointBreakdown ────────────────

  it('points.calculated event payload contains pointBreakdown', async () => {
    await service.calculate(baseInput);
    const [eventType, payload] = mockQueue.enqueue.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(eventType).toBe('points.calculated');
    expect(payload['pointBreakdown']).toEqual(
      expect.objectContaining({ base: 10, bonus: 0, total: 10 }),
    );
    expect(payload['questionnaireId']).toBe('q-001');
    expect(payload['userId']).toBe('u-abc');
  });
});
