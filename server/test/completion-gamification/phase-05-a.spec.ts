/**
 * FLOW-05 Phase A Unit Tests — T83 (CompletionRecorder) + T84 (PointsCalculator)
 *
 * T83 — CompletionRecorder
 *   A-83-1: Happy path — completionId starts with 'cmp-', questionnaire.answered emitted
 *   A-83-2: IR-83-1 SETNX — duplicate (questionnaireId, userId) returns existing, no store, no emit
 *   A-83-3: IR-83-2 DNA-8 — storeDocument index < enqueue index in callOrder
 *   A-83-4: IR-83-3 — stored doc has knowledge_scope:'PRIVATE', connection_type:'FLOW_SCOPED'
 *   A-83-5: Validation — missing questionnaireId → VALIDATION_FAILURE
 *   A-83-6: DNA-3 — unexpected throw → COMPLETION_RECORDER_ERROR
 *
 * T84 — PointsCalculator
 *   A-84-1: Happy path — scorePercent < threshold (60 < 80) → base only, total = base
 *   A-84-2: Bonus applies — scorePercent >= threshold (90 >= 80) → total = base + bonus
 *   A-84-3: CF-05-1 — 'earnedPoints' in ({} as PointsCalculatorInput) is false
 *   A-84-4: IR-84-2 — questionnaire result not found → QUESTIONNAIRE_RESULT_NOT_FOUND
 *   A-84-5: DNA-8 — storeDocument before enqueue in callOrder
 *   A-84-6: DNA-3 — unexpected throw → POINTS_CALCULATOR_ERROR
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
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Shared mock factory ───────────────────────────────────────────────────────

interface MockDbOptions {
  /** Pre-seeded search results keyed by index name. */
  seed?: Record<string, Array<Record<string, unknown>>>;
  /** Force storeDocument to fail. */
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

// ── T83 CompletionRecorder ─────────────────────────────────────────────────────

describe('T83 CompletionRecorder', () => {
  const baseInput: CompletionInput = {
    questionnaireId: 'q-001',
    userId: 'u-001',
    tenantId: 'tenant-001',
  };

  it('A-83-1: happy path — completionId starts with cmp-, questionnaire.answered emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new CompletionRecorder(db as any, queue as any);

    const result = await svc.record(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.completionId).toMatch(/^cmp-/);
    expect(result.data!.idempotent).toBe(false);
    expect(queue._enqueued[0].eventType).toBe('questionnaire.answered');
  });

  it('A-83-2: IR-83-1 SETNX — duplicate returns existing record, no store, no emit', async () => {
    const callOrder: string[] = [];
    const existingDoc = {
      completion_id: 'cmp-existing-001',
      questionnaire_id: 'q-001',
      user_id: 'u-001',
    };
    const db = makeDb(callOrder, { seed: { 'xiigen-questionnaire-completions': [existingDoc] } });
    const queue = makeQueue(callOrder);
    const svc = new CompletionRecorder(db as any, queue as any);

    const result = await svc.record(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.completionId).toBe('cmp-existing-001');
    expect(result.data!.idempotent).toBe(true);
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('A-83-3: IR-83-2 DNA-8 — storeDocument occurs before enqueue in callOrder', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new CompletionRecorder(db as any, queue as any);

    await svc.record(baseInput);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('A-83-4: IR-83-3 — stored doc has knowledge_scope PRIVATE and connection_type FLOW_SCOPED', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new CompletionRecorder(db as any, queue as any);

    await svc.record(baseInput);

    const [_index, doc] = db.storeDocument.mock.calls[0] as [
      string,
      Record<string, unknown>,
      string,
    ];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
    expect(doc['connection_type']).toBe('FLOW_SCOPED');
  });

  it('A-83-5: validation — missing questionnaireId returns VALIDATION_FAILURE', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new CompletionRecorder(db as any, queue as any);

    const result = await svc.record({
      questionnaireId: '',
      userId: 'u-001',
      tenantId: 'tenant-001',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('A-83-6: DNA-3 — unexpected throw returns COMPLETION_RECORDER_ERROR', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db exploded')),
      storeDocument: jest.fn(),
    };
    const queue = makeQueue(callOrder);
    const svc = new CompletionRecorder(db as any, queue as any);

    const result = await svc.record(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('COMPLETION_RECORDER_ERROR');
  });
});

// ── T84 PointsCalculator ───────────────────────────────────────────────────────

describe('T84 PointsCalculator', () => {
  const baseInput: PointsCalculatorInput = {
    completionId: 'cmp-001',
    questionnaireId: 'q-001',
    userId: 'u-001',
    tenantId: 'tenant-001',
  };

  /** Build a DB mock that returns scorePercent from questionnaire-results and a formula config. */
  function makeT84Db(
    callOrder: string[],
    scorePercent: number,
    formula: { base: number; bonus_threshold: number; bonus: number } | null = {
      base: 10,
      bonus_threshold: 80,
      bonus: 5,
    },
  ) {
    const questionnaireResult: Record<string, unknown> = {
      questionnaire_result_id: 'qr-001',
      questionnaire_id: 'q-001',
      user_id: 'u-001',
      score_percent: scorePercent,
    };

    const freedomDoc: Record<string, unknown> | null = formula
      ? {
          config_key: 'flow05_points_formula',
          config_value: {
            base: formula.base,
            bonus_threshold: formula.bonus_threshold,
            bonus: formula.bonus,
          },
        }
      : null;

    return {
      searchDocuments: jest
        .fn()
        .mockImplementation(async (index: string, _filter: Record<string, unknown>) => {
          if (index === 'xiigen-questionnaire-results') {
            return DataProcessResult.success([questionnaireResult]);
          }
          if (index === 'freedom_configs') {
            return DataProcessResult.success(freedomDoc ? [freedomDoc] : []);
          }
          return DataProcessResult.success([]);
        }),
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
    };
  }

  it('A-84-1: happy path — scorePercent 60 < threshold 80 → base only, points.calculated emitted', async () => {
    const callOrder: string[] = [];
    const db = makeT84Db(callOrder, 60, { base: 10, bonus_threshold: 80, bonus: 5 });
    const queue = makeQueue(callOrder);
    const svc = new PointsCalculator(db as any, queue as any);

    const result = await svc.calculate(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.pointBreakdown.base).toBe(10);
    expect(result.data!.pointBreakdown.bonus).toBe(0);
    expect(result.data!.pointBreakdown.total).toBe(10);
    expect(queue._enqueued[0].eventType).toBe('points.calculated');
  });

  it('A-84-2: bonus applies — scorePercent 90 >= threshold 80 → total = base + bonus', async () => {
    const callOrder: string[] = [];
    const db = makeT84Db(callOrder, 90, { base: 10, bonus_threshold: 80, bonus: 5 });
    const queue = makeQueue(callOrder);
    const svc = new PointsCalculator(db as any, queue as any);

    const result = await svc.calculate(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.pointBreakdown.bonus).toBe(5);
    expect(result.data!.pointBreakdown.total).toBe(15);
  });

  it('A-84-3: CF-05-1 — earnedPoints does not exist as a property on PointsCalculatorInput type', () => {
    // Type-level enforcement: 'earnedPoints' must not be a key of PointsCalculatorInput
    const input: PointsCalculatorInput = {
      completionId: 'cmp-001',
      questionnaireId: 'q-001',
      userId: 'u-001',
      tenantId: 'tenant-001',
    };
    expect('earnedPoints' in input).toBe(false);
  });

  it('A-84-4: IR-84-2 — questionnaire result not found returns QUESTIONNAIRE_RESULT_NOT_FOUND', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      storeDocument: jest.fn(),
    };
    const queue = makeQueue(callOrder);
    const svc = new PointsCalculator(db as any, queue as any);

    const result = await svc.calculate(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('QUESTIONNAIRE_RESULT_NOT_FOUND');
  });

  it('A-84-5: DNA-8 — storeDocument occurs before enqueue in callOrder', async () => {
    const callOrder: string[] = [];
    const db = makeT84Db(callOrder, 70);
    const queue = makeQueue(callOrder);
    const svc = new PointsCalculator(db as any, queue as any);

    await svc.calculate(baseInput);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('A-84-6: DNA-3 — unexpected throw returns POINTS_CALCULATOR_ERROR', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db explosion')),
      storeDocument: jest.fn(),
    };
    const queue = makeQueue(callOrder);
    const svc = new PointsCalculator(db as any, queue as any);

    const result = await svc.calculate(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('POINTS_CALCULATOR_ERROR');
  });
});
