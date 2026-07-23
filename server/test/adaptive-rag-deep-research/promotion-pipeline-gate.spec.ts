/**
 * PromotionPipelineGate — Unit Tests (T455).
 *
 * Tests:
 *   PPG-1:  missing tenantId → UNSCOPED_QUERY
 *   PPG-2:  missing assetId → MISSING_ASSET_ID
 *   PPG-3:  missing requestedBy → MISSING_ACTOR
 *   PPG-4:  BFA config not found → default allow
 *   PPG-5:  BFA config allowed=false → PROMOTION_BLOCKED
 *   PPG-6:  BFA config allowed=true → success
 *   PPG-7:  storeDocument() called BEFORE enqueue() — DNA-8
 *   PPG-8:  DB store failure → error propagated
 *   PPG-9:  approved event emitted to rag.promotion.approved
 *   PPG-10: rejected event emitted to rag.promotion.rejected when blocked
 *   PPG-11: gateRef is non-empty string
 */

import { PromotionPipelineGate } from '../../src/engine/flows/rag-optimization/promotion-pipeline-gate.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-ppg-test';
const ASSET = 'asset-ppg-001';
const ACTOR = 'user-admin';

function makeDb(bfaAllowed?: boolean) {
  return {
    searchDocuments: jest.fn(async () => {
      if (bfaAllowed === undefined) return DataProcessResult.success([]);
      return DataProcessResult.success([{ allowed: bfaAllowed }]);
    }),
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

describe('PromotionPipelineGate — Unit (T455)', () => {
  it('PPG-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new PromotionPipelineGate(makeDb(), makeQueue());
    const r = await svc.checkPromotion('', ASSET, ACTOR);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('PPG-2: missing assetId → MISSING_ASSET_ID', async () => {
    const svc = new PromotionPipelineGate(makeDb(), makeQueue());
    const r = await svc.checkPromotion(TENANT, '', ACTOR);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_ASSET_ID');
  });

  it('PPG-3: missing requestedBy → MISSING_ACTOR', async () => {
    const svc = new PromotionPipelineGate(makeDb(), makeQueue());
    const r = await svc.checkPromotion(TENANT, ASSET, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_ACTOR');
  });

  it('PPG-4: BFA config not found → default allow', async () => {
    const svc = new PromotionPipelineGate(makeDb(undefined), makeQueue());
    const r = await svc.checkPromotion(TENANT, ASSET, ACTOR);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.allowed).toBe(true);
  });

  it('PPG-5: BFA config allowed=false → PROMOTION_BLOCKED', async () => {
    const svc = new PromotionPipelineGate(makeDb(false), makeQueue());
    const r = await svc.checkPromotion(TENANT, ASSET, ACTOR);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('PROMOTION_BLOCKED');
  });

  it('PPG-6: BFA config allowed=true → success', async () => {
    const svc = new PromotionPipelineGate(makeDb(true), makeQueue());
    const r = await svc.checkPromotion(TENANT, ASSET, ACTOR);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.allowed).toBe(true);
  });

  it('PPG-7: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new PromotionPipelineGate(db, queue);
    await svc.checkPromotion(TENANT, ASSET, ACTOR);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('PPG-8: DB store failure → error propagated', async () => {
    const svc = new PromotionPipelineGate(makeFailingDb(), makeQueue());
    const r = await svc.checkPromotion(TENANT, ASSET, ACTOR);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('PPG-9: approved event emitted to rag.promotion.approved', async () => {
    const queue = makeQueue();
    const svc = new PromotionPipelineGate(makeDb(true), queue);
    await svc.checkPromotion(TENANT, ASSET, ACTOR);
    expect(queue.enqueue).toHaveBeenCalledWith('rag.promotion.approved', expect.any(Object));
  });

  it('PPG-10: rejected event emitted to rag.promotion.rejected when blocked', async () => {
    const queue = makeQueue();
    const svc = new PromotionPipelineGate(makeDb(false), queue);
    await svc.checkPromotion(TENANT, ASSET, ACTOR);
    expect(queue.enqueue).toHaveBeenCalledWith('rag.promotion.rejected', expect.any(Object));
  });

  it('PPG-11: gateRef is non-empty string', async () => {
    const svc = new PromotionPipelineGate(makeDb(true), makeQueue());
    const r = await svc.checkPromotion(TENANT, ASSET, ACTOR);
    expect(r.data!.gateRef.length).toBeGreaterThan(0);
  });
});
