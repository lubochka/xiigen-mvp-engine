/**
 * ApprovalRequestCreator — Unit Tests (T413).
 *
 * Tests:
 *   ARC-1:  missing tenantId → UNSCOPED_QUERY
 *   ARC-2:  missing workflowId → MISSING_WORKFLOW_ID
 *   ARC-3:  missing stepId → MISSING_STEP_ID
 *   ARC-4:  missing reviewerGroup → MISSING_REVIEWER_GROUP
 *   ARC-5:  valid args → success with status QUEUED
 *   ARC-6:  requestId is non-empty string
 *   ARC-7:  notifiedAt is ISO string
 *   ARC-8:  workflowId echoed in result
 *   ARC-9:  reviewerGroup echoed in result
 *   ARC-10: storeDocument() called BEFORE enqueue() — DNA-8
 *   ARC-11: DB store failure → error propagated
 *   ARC-12: approval.request.created event emitted
 */

import { ApprovalRequestCreator } from '../../src/engine/flows/human-approval-gate/approval-request-creator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-arc-test';
const WORKFLOW = 'wf-101';
const STEP = 'step-review';
const REVIEWER = 'group-approvers';

function makeDb() {
  return {
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
    ),
  } as any;
}

function makeFailingDb() {
  return {
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

describe('ApprovalRequestCreator — Unit (T413)', () => {
  it('ARC-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ApprovalRequestCreator(makeDb(), makeQueue());
    const r = await svc.createRequest('', WORKFLOW, STEP, REVIEWER);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('ARC-2: missing workflowId → MISSING_WORKFLOW_ID', async () => {
    const svc = new ApprovalRequestCreator(makeDb(), makeQueue());
    const r = await svc.createRequest(TENANT, '', STEP, REVIEWER);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_WORKFLOW_ID');
  });

  it('ARC-3: missing stepId → MISSING_STEP_ID', async () => {
    const svc = new ApprovalRequestCreator(makeDb(), makeQueue());
    const r = await svc.createRequest(TENANT, WORKFLOW, '', REVIEWER);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_STEP_ID');
  });

  it('ARC-4: missing reviewerGroup → MISSING_REVIEWER_GROUP', async () => {
    const svc = new ApprovalRequestCreator(makeDb(), makeQueue());
    const r = await svc.createRequest(TENANT, WORKFLOW, STEP, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_REVIEWER_GROUP');
  });

  it('ARC-5: valid args → success with status QUEUED', async () => {
    const svc = new ApprovalRequestCreator(makeDb(), makeQueue());
    const r = await svc.createRequest(TENANT, WORKFLOW, STEP, REVIEWER);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('QUEUED');
  });

  it('ARC-6: requestId is non-empty string', async () => {
    const svc = new ApprovalRequestCreator(makeDb(), makeQueue());
    const r = await svc.createRequest(TENANT, WORKFLOW, STEP, REVIEWER);
    expect(r.data!.requestId.length).toBeGreaterThan(0);
  });

  it('ARC-7: notifiedAt is ISO string', async () => {
    const svc = new ApprovalRequestCreator(makeDb(), makeQueue());
    const r = await svc.createRequest(TENANT, WORKFLOW, STEP, REVIEWER);
    expect(r.data!.notifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('ARC-8: workflowId echoed in result', async () => {
    const svc = new ApprovalRequestCreator(makeDb(), makeQueue());
    const r = await svc.createRequest(TENANT, WORKFLOW, STEP, REVIEWER);
    expect(r.data!.workflowId).toBe(WORKFLOW);
  });

  it('ARC-9: reviewerGroup echoed in result', async () => {
    const svc = new ApprovalRequestCreator(makeDb(), makeQueue());
    const r = await svc.createRequest(TENANT, WORKFLOW, STEP, REVIEWER);
    expect(r.data!.reviewerGroup).toBe(REVIEWER);
  });

  it('ARC-10: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
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
    const svc = new ApprovalRequestCreator(db, queue);
    await svc.createRequest(TENANT, WORKFLOW, STEP, REVIEWER);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('ARC-11: DB store failure → error propagated', async () => {
    const svc = new ApprovalRequestCreator(makeFailingDb(), makeQueue());
    const r = await svc.createRequest(TENANT, WORKFLOW, STEP, REVIEWER);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('ARC-12: approval.request.created event emitted', async () => {
    const queue = makeQueue();
    const svc = new ApprovalRequestCreator(makeDb(), queue);
    await svc.createRequest(TENANT, WORKFLOW, STEP, REVIEWER);
    expect(queue.enqueue).toHaveBeenCalledWith('approval.request.created', expect.any(Object));
  });
});
