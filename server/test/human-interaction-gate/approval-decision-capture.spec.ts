/**
 * ApprovalDecisionCapture — Unit Tests (T414).
 *
 * Tests:
 *   ADC-1:  missing tenantId → UNSCOPED_QUERY
 *   ADC-2:  missing requestId → MISSING_REQUEST_ID
 *   ADC-3:  missing decision → MISSING_DECISION
 *   ADC-4:  invalid decision value → INVALID_DECISION
 *   ADC-5:  missing decidedBy → MISSING_DECIDED_BY
 *   ADC-6:  valid APPROVED decision → success
 *   ADC-7:  valid REJECTED decision → success
 *   ADC-8:  decisionId is non-empty string
 *   ADC-9:  decidedAt is ISO string
 *   ADC-10: SETNX idempotency — second call returns existing (duplicate=true)
 *   ADC-11: duplicate=false on first call
 *   ADC-12: storeDocument() called BEFORE enqueue() — DNA-8
 *   ADC-13: DB store failure → error propagated
 *   ADC-14: approval.decision.captured event emitted
 */

import { ApprovalDecisionCapture } from '../../src/engine/flows/human-approval-gate/approval-decision-capture.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-adc-test';
const REQUEST_ID = 'req-12345';
const DECIDED_BY = 'user-manager';

function makeDb(existing?: Record<string, unknown>) {
  return {
    searchDocuments: jest.fn(async () =>
      existing ? DataProcessResult.success([existing]) : DataProcessResult.success([]),
    ),
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

describe('ApprovalDecisionCapture — Unit (T414)', () => {
  it('ADC-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ApprovalDecisionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision('', REQUEST_ID, 'APPROVED', DECIDED_BY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('ADC-2: missing requestId → MISSING_REQUEST_ID', async () => {
    const svc = new ApprovalDecisionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(TENANT, '', 'APPROVED', DECIDED_BY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_REQUEST_ID');
  });

  it('ADC-3: missing decision → MISSING_DECISION', async () => {
    const svc = new ApprovalDecisionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(TENANT, REQUEST_ID, '' as any, DECIDED_BY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_DECISION');
  });

  it('ADC-4: invalid decision value → INVALID_DECISION', async () => {
    const svc = new ApprovalDecisionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(TENANT, REQUEST_ID, 'MAYBE' as any, DECIDED_BY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_DECISION');
  });

  it('ADC-5: missing decidedBy → MISSING_DECIDED_BY', async () => {
    const svc = new ApprovalDecisionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(TENANT, REQUEST_ID, 'APPROVED', '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_DECIDED_BY');
  });

  it('ADC-6: valid APPROVED decision → success', async () => {
    const svc = new ApprovalDecisionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(TENANT, REQUEST_ID, 'APPROVED', DECIDED_BY);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.decision).toBe('APPROVED');
  });

  it('ADC-7: valid REJECTED decision → success', async () => {
    const svc = new ApprovalDecisionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(TENANT, REQUEST_ID, 'REJECTED', DECIDED_BY);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.decision).toBe('REJECTED');
  });

  it('ADC-8: decisionId is non-empty string', async () => {
    const svc = new ApprovalDecisionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(TENANT, REQUEST_ID, 'APPROVED', DECIDED_BY);
    expect(r.data!.decisionId.length).toBeGreaterThan(0);
  });

  it('ADC-9: decidedAt is ISO string', async () => {
    const svc = new ApprovalDecisionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(TENANT, REQUEST_ID, 'APPROVED', DECIDED_BY);
    expect(r.data!.decidedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('ADC-10: SETNX idempotency — second call returns existing (duplicate=true)', async () => {
    const existingDecision = {
      decision_id: 'ad-existing',
      decision: 'APPROVED',
      decided_at: '2026-01-01T00:00:00Z',
      request_id: REQUEST_ID,
    };
    const db = makeDb(existingDecision);
    const svc = new ApprovalDecisionCapture(db, makeQueue());
    const r = await svc.captureDecision(TENANT, REQUEST_ID, 'APPROVED', DECIDED_BY);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.duplicate).toBe(true);
    expect(r.data!.decisionId).toBe('ad-existing');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('ADC-11: duplicate=false on first call', async () => {
    const svc = new ApprovalDecisionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(TENANT, REQUEST_ID, 'APPROVED', DECIDED_BY);
    expect(r.data!.duplicate).toBe(false);
  });

  it('ADC-12: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new ApprovalDecisionCapture(db, queue);
    await svc.captureDecision(TENANT, REQUEST_ID, 'APPROVED', DECIDED_BY);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('ADC-13: DB store failure → error propagated', async () => {
    const svc = new ApprovalDecisionCapture(makeFailingDb(), makeQueue());
    const r = await svc.captureDecision(TENANT, REQUEST_ID, 'APPROVED', DECIDED_BY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('ADC-14: approval.decision.captured event emitted', async () => {
    const queue = makeQueue();
    const svc = new ApprovalDecisionCapture(makeDb(), queue);
    await svc.captureDecision(TENANT, REQUEST_ID, 'APPROVED', DECIDED_BY);
    expect(queue.enqueue).toHaveBeenCalledWith('approval.decision.captured', expect.any(Object));
  });
});
