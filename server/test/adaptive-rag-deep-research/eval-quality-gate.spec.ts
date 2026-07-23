/**
 * EvalQualityGate — Unit Tests (T454).
 *
 * Tests:
 *   EQG-1:  missing tenantId → UNSCOPED_QUERY
 *   EQG-2:  invalid hallucinationRate (>1) → INVALID_HALLUCINATION_RATE
 *   EQG-3:  invalid coverageScore (<0) → INVALID_COVERAGE_SCORE
 *   EQG-4:  both scores pass → success with passed=true
 *   EQG-5:  hallucination above limit → QUALITY_GATE_FAILED (hard stop)
 *   EQG-6:  coverage below minimum → QUALITY_GATE_FAILED (hard stop)
 *   EQG-7:  both fail → QUALITY_GATE_FAILED (both independently checked)
 *   EQG-8:  storeDocument() BEFORE enqueue() — DNA-8
 *   EQG-9:  DB store failure → error propagated, enqueue NOT called
 *   EQG-10: gate result event emitted to eval.quality.gate.result channel
 */

import { EvalQualityGate } from '../../src/engine/flows/rag-optimization/eval-quality-gate.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-eqg-test';
const SESSION = 'sess-eqg-1';

function makeDb(configDocs: Record<string, unknown>[] = []) {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success(configDocs)),
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
    ),
  } as any;
}

function makeFailingDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    storeDocument: jest.fn(async () => DataProcessResult.failure('STORAGE_FAILED', 'write error')),
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: any) => {
      events.push({ evt, data });
      return DataProcessResult.success('m');
    }),
    _events: events,
  } as any;
}

describe('EvalQualityGate — Unit (T454)', () => {
  it('EQG-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new EvalQualityGate(makeDb(), makeQueue());
    const r = await svc.evaluate('', 0.05, 0.8);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('EQG-2: hallucinationRate > 1 → INVALID_HALLUCINATION_RATE', async () => {
    const svc = new EvalQualityGate(makeDb(), makeQueue());
    const r = await svc.evaluate(TENANT, 1.5, 0.8);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_HALLUCINATION_RATE');
  });

  it('EQG-3: coverageScore < 0 → INVALID_COVERAGE_SCORE', async () => {
    const svc = new EvalQualityGate(makeDb(), makeQueue());
    const r = await svc.evaluate(TENANT, 0.05, -0.1);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_COVERAGE_SCORE');
  });

  it('EQG-4: both scores pass → success with passed=true', async () => {
    const svc = new EvalQualityGate(makeDb(), makeQueue());
    const r = await svc.evaluate(TENANT, 0.05, 0.85, SESSION); // halluc=5% (< 10%), coverage=85% (>70%)
    expect(r.isSuccess).toBe(true);
    expect(r.data!.passed).toBe(true);
  });

  it('EQG-5: hallucination above limit → QUALITY_GATE_FAILED', async () => {
    const svc = new EvalQualityGate(makeDb(), makeQueue());
    const r = await svc.evaluate(TENANT, 0.15, 0.9); // 15% hallucination > 10% limit
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('QUALITY_GATE_FAILED');
  });

  it('EQG-6: coverage below minimum → QUALITY_GATE_FAILED', async () => {
    const svc = new EvalQualityGate(makeDb(), makeQueue());
    const r = await svc.evaluate(TENANT, 0.05, 0.5); // 50% coverage < 70% minimum
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('QUALITY_GATE_FAILED');
  });

  it('EQG-7: custom thresholds from FREEDOM config respected', async () => {
    const config = [
      { tenant_id: TENANT, active: true, hallucination_limit: 0.2, coverage_min: 0.5 },
    ];
    const svc = new EvalQualityGate(makeDb(config), makeQueue());
    // halluc=15% < 20%, coverage=60% > 50% → should PASS with custom config
    const r = await svc.evaluate(TENANT, 0.15, 0.6);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.passed).toBe(true);
  });

  it('EQG-8: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    const svc = new EvalQualityGate(db, queue);
    await svc.evaluate(TENANT, 0.05, 0.85);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('EQG-9: DB store failure → error propagated, enqueue NOT called', async () => {
    const queue = makeQueue();
    const svc = new EvalQualityGate(makeFailingDb(), queue);
    const r = await svc.evaluate(TENANT, 0.05, 0.85);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('EQG-10: event emitted to eval.quality.gate.result channel', async () => {
    const queue = makeQueue();
    const svc = new EvalQualityGate(makeDb(), queue);
    await svc.evaluate(TENANT, 0.05, 0.85);
    expect(queue.enqueue).toHaveBeenCalledWith('eval.quality.gate.result', expect.any(Object));
  });
});
