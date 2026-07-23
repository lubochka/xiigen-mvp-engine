/**
 * ApprovalChainOrchestrator — Unit Tests (T419).
 *
 * Tests:
 *   ACO-1:  missing tenantId → UNSCOPED_QUERY
 *   ACO-2:  missing workflowId → MISSING_WORKFLOW_ID
 *   ACO-3:  empty steps → MISSING_STEPS
 *   ACO-4:  valid args → success
 *   ACO-5:  chainId is non-empty string
 *   ACO-6:  stepCount matches steps array length
 *   ACO-7:  startedAt is ISO string
 *   ACO-8:  SEQUENTIAL mode from FREEDOM config
 *   ACO-9:  PARALLEL mode from FREEDOM config
 *   ACO-10: defaults to SEQUENTIAL when config unavailable
 *   ACO-11: storeDocument() called BEFORE enqueue() — DNA-8
 *   ACO-12: DB store failure → error propagated
 *   ACO-13: approval.chain.started event emitted
 */

import { ApprovalChainOrchestrator } from '../../src/engine/flows/human-approval-gate/approval-chain-orchestrator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-aco-test';
const WORKFLOW_ID = 'wf-chain-001';
const STEPS = ['step-1', 'step-2', 'step-3'];

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

function makeConfig(mode?: string) {
  return {
    get: jest.fn(async () =>
      mode !== undefined
        ? DataProcessResult.success({ mode })
        : DataProcessResult.failure('NOT_FOUND', 'no config'),
    ),
  } as any;
}

describe('ApprovalChainOrchestrator — Unit (T419)', () => {
  it('ACO-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ApprovalChainOrchestrator(makeDb(), makeQueue(), makeConfig('SEQUENTIAL'));
    const r = await svc.startChain('', WORKFLOW_ID, STEPS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('ACO-2: missing workflowId → MISSING_WORKFLOW_ID', async () => {
    const svc = new ApprovalChainOrchestrator(makeDb(), makeQueue(), makeConfig('SEQUENTIAL'));
    const r = await svc.startChain(TENANT, '', STEPS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_WORKFLOW_ID');
  });

  it('ACO-3: empty steps → MISSING_STEPS', async () => {
    const svc = new ApprovalChainOrchestrator(makeDb(), makeQueue(), makeConfig('SEQUENTIAL'));
    const r = await svc.startChain(TENANT, WORKFLOW_ID, []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_STEPS');
  });

  it('ACO-4: valid args → success', async () => {
    const svc = new ApprovalChainOrchestrator(makeDb(), makeQueue(), makeConfig('SEQUENTIAL'));
    const r = await svc.startChain(TENANT, WORKFLOW_ID, STEPS);
    expect(r.isSuccess).toBe(true);
  });

  it('ACO-5: chainId is non-empty string', async () => {
    const svc = new ApprovalChainOrchestrator(makeDb(), makeQueue(), makeConfig('SEQUENTIAL'));
    const r = await svc.startChain(TENANT, WORKFLOW_ID, STEPS);
    expect(r.data!.chainId.length).toBeGreaterThan(0);
  });

  it('ACO-6: stepCount matches steps array length', async () => {
    const svc = new ApprovalChainOrchestrator(makeDb(), makeQueue(), makeConfig('SEQUENTIAL'));
    const r = await svc.startChain(TENANT, WORKFLOW_ID, STEPS);
    expect(r.data!.stepCount).toBe(STEPS.length);
  });

  it('ACO-7: startedAt is ISO string', async () => {
    const svc = new ApprovalChainOrchestrator(makeDb(), makeQueue(), makeConfig('SEQUENTIAL'));
    const r = await svc.startChain(TENANT, WORKFLOW_ID, STEPS);
    expect(r.data!.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('ACO-8: SEQUENTIAL mode from FREEDOM config', async () => {
    const svc = new ApprovalChainOrchestrator(makeDb(), makeQueue(), makeConfig('SEQUENTIAL'));
    const r = await svc.startChain(TENANT, WORKFLOW_ID, STEPS);
    expect(r.data!.mode).toBe('SEQUENTIAL');
  });

  it('ACO-9: PARALLEL mode from FREEDOM config', async () => {
    const svc = new ApprovalChainOrchestrator(makeDb(), makeQueue(), makeConfig('PARALLEL'));
    const r = await svc.startChain(TENANT, WORKFLOW_ID, STEPS);
    expect(r.data!.mode).toBe('PARALLEL');
  });

  it('ACO-10: defaults to SEQUENTIAL when config unavailable', async () => {
    const svc = new ApprovalChainOrchestrator(makeDb(), makeQueue(), makeConfig(undefined));
    const r = await svc.startChain(TENANT, WORKFLOW_ID, STEPS);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.mode).toBe('SEQUENTIAL');
  });

  it('ACO-11: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new ApprovalChainOrchestrator(db, queue, makeConfig('SEQUENTIAL'));
    await svc.startChain(TENANT, WORKFLOW_ID, STEPS);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('ACO-12: DB store failure → error propagated', async () => {
    const svc = new ApprovalChainOrchestrator(
      makeFailingDb(),
      makeQueue(),
      makeConfig('SEQUENTIAL'),
    );
    const r = await svc.startChain(TENANT, WORKFLOW_ID, STEPS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('ACO-13: approval.chain.started event emitted', async () => {
    const queue = makeQueue();
    const svc = new ApprovalChainOrchestrator(makeDb(), queue, makeConfig('SEQUENTIAL'));
    await svc.startChain(TENANT, WORKFLOW_ID, STEPS);
    expect(queue.enqueue).toHaveBeenCalledWith('approval.chain.started', expect.any(Object));
  });
});
