/**
 * PromptVersionPromoter — Unit Tests (T450).
 *
 * Tests:
 *   PVP-1:  missing tenantId → UNSCOPED_QUERY
 *   PVP-2:  missing promptId → MISSING_PROMPT_ID
 *   PVP-3:  invalid fromStatus → INVALID_STATUS
 *   PVP-4:  ARCHIVED status → ALREADY_ARCHIVED
 *   PVP-5:  DRAFT → CANDIDATE
 *   PVP-6:  CANDIDATE → TESTED
 *   PVP-7:  TESTED → ACTIVE
 *   PVP-8:  ACTIVE → ARCHIVED
 *   PVP-9:  storeDocument() called BEFORE enqueue() — DNA-8
 *   PVP-10: DB store failure → error propagated
 *   PVP-11: promotion event emitted to rag.prompt.promoted
 *   PVP-12: versionId is non-empty string
 *   PVP-13: fromStatus and toStatus echoed in result
 */

import {
  PromptVersionPromoter,
  PromptVersionStatus,
} from '../../src/engine/flows/rag-optimization/prompt-version-promoter.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-pvp-test';
const PROMPT = 'prompt-pvp-001';

function makeDb() {
  const stored: any[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc, _id: id ?? 'x' });
    }),
    _stored: stored,
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

describe('PromptVersionPromoter — Unit (T450)', () => {
  it('PVP-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new PromptVersionPromoter(makeDb(), makeQueue());
    const r = await svc.promote('', PROMPT, 'DRAFT');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('PVP-2: missing promptId → MISSING_PROMPT_ID', async () => {
    const svc = new PromptVersionPromoter(makeDb(), makeQueue());
    const r = await svc.promote(TENANT, '', 'DRAFT');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_PROMPT_ID');
  });

  it('PVP-3: invalid fromStatus → INVALID_STATUS', async () => {
    const svc = new PromptVersionPromoter(makeDb(), makeQueue());
    const r = await svc.promote(TENANT, PROMPT, 'UNKNOWN' as PromptVersionStatus);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_STATUS');
  });

  it('PVP-4: ARCHIVED status → ALREADY_ARCHIVED', async () => {
    const svc = new PromptVersionPromoter(makeDb(), makeQueue());
    const r = await svc.promote(TENANT, PROMPT, 'ARCHIVED');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('ALREADY_ARCHIVED');
  });

  it('PVP-5: DRAFT → CANDIDATE', async () => {
    const svc = new PromptVersionPromoter(makeDb(), makeQueue());
    const r = await svc.promote(TENANT, PROMPT, 'DRAFT');
    expect(r.isSuccess).toBe(true);
    expect(r.data!.fromStatus).toBe('DRAFT');
    expect(r.data!.toStatus).toBe('CANDIDATE');
  });

  it('PVP-6: CANDIDATE → TESTED', async () => {
    const svc = new PromptVersionPromoter(makeDb(), makeQueue());
    const r = await svc.promote(TENANT, PROMPT, 'CANDIDATE');
    expect(r.data!.toStatus).toBe('TESTED');
  });

  it('PVP-7: TESTED → ACTIVE', async () => {
    const svc = new PromptVersionPromoter(makeDb(), makeQueue());
    const r = await svc.promote(TENANT, PROMPT, 'TESTED');
    expect(r.data!.toStatus).toBe('ACTIVE');
  });

  it('PVP-8: ACTIVE → ARCHIVED', async () => {
    const svc = new PromptVersionPromoter(makeDb(), makeQueue());
    const r = await svc.promote(TENANT, PROMPT, 'ACTIVE');
    expect(r.data!.toStatus).toBe('ARCHIVED');
  });

  it('PVP-9: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new PromptVersionPromoter(db, queue);
    await svc.promote(TENANT, PROMPT, 'DRAFT');
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('PVP-10: DB store failure → error propagated', async () => {
    const svc = new PromptVersionPromoter(makeFailingDb(), makeQueue());
    const r = await svc.promote(TENANT, PROMPT, 'DRAFT');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('PVP-11: promotion event emitted to rag.prompt.promoted', async () => {
    const queue = makeQueue();
    const svc = new PromptVersionPromoter(makeDb(), queue);
    await svc.promote(TENANT, PROMPT, 'DRAFT');
    expect(queue.enqueue).toHaveBeenCalledWith('rag.prompt.promoted', expect.any(Object));
  });

  it('PVP-12: versionId is non-empty string', async () => {
    const svc = new PromptVersionPromoter(makeDb(), makeQueue());
    const r = await svc.promote(TENANT, PROMPT, 'DRAFT');
    expect(r.data!.versionId.length).toBeGreaterThan(0);
  });

  it('PVP-13: fromStatus and toStatus echoed in result', async () => {
    const svc = new PromptVersionPromoter(makeDb(), makeQueue());
    const r = await svc.promote(TENANT, PROMPT, 'CANDIDATE');
    expect(r.data!.fromStatus).toBe('CANDIDATE');
    expect(r.data!.toStatus).toBe('TESTED');
  });
});
