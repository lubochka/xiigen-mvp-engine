/**
 * RerankerStep — Unit Tests (T458).
 *
 * Tests:
 *   RS-1:  missing tenantId → UNSCOPED_QUERY
 *   RS-2:  missing queryText → MISSING_QUERY_TEXT
 *   RS-3:  empty items → success with empty results
 *   RS-4:  items reranked by AI score (highest first)
 *   RS-5:  original_rank preserved in output
 *   RS-6:  topN limits output length
 *   RS-7:  AI failure falls back to original score
 *   RS-8:  DB store failure → error propagated
 *   RS-9:  rerankId is non-empty string
 *   RS-10: CF-606 input shape accepted: { content, score, source_type }
 */

import { RerankerStep } from '../../src/engine/flows/rag-optimization/reranker-step.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-rs-test';
const QUERY = 'What are enterprise RAG patterns?';

const ITEMS = [
  { content: 'item A', score: 0.5, source_type: 'vector' },
  { content: 'item B', score: 0.8, source_type: 'graph' },
  { content: 'item C', score: 0.3, source_type: 'hybrid' },
];

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

function makeAi(scores: number[]) {
  let call = 0;
  return {
    generate: jest.fn(async () =>
      DataProcessResult.success({ score: scores[call++ % scores.length] }),
    ),
  } as any;
}

function makeFailingAi() {
  return {
    generate: jest.fn(async () => DataProcessResult.failure('AI_ERROR', 'model unavailable')),
  } as any;
}

describe('RerankerStep — Unit (T458)', () => {
  it('RS-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new RerankerStep(makeDb(), makeAi([0.9]));
    const r = await svc.rerank('', QUERY, ITEMS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('RS-2: missing queryText → MISSING_QUERY_TEXT', async () => {
    const svc = new RerankerStep(makeDb(), makeAi([0.9]));
    const r = await svc.rerank(TENANT, '', ITEMS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_QUERY_TEXT');
  });

  it('RS-3: empty items → success with empty results', async () => {
    const svc = new RerankerStep(makeDb(), makeAi([]));
    const r = await svc.rerank(TENANT, QUERY, []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.items).toHaveLength(0);
    expect(r.data!.totalReranked).toBe(0);
  });

  it('RS-4: items reranked by AI score, highest first', async () => {
    // AI scores: item A=0.2, item B=0.9, item C=0.5
    const svc = new RerankerStep(makeDb(), makeAi([0.2, 0.9, 0.5]));
    const r = await svc.rerank(TENANT, QUERY, ITEMS, 3);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.items[0].rerank_score).toBe(0.9);
    expect(r.data!.items[0].content).toBe('item B');
  });

  it('RS-5: original_rank preserved from input order', async () => {
    const svc = new RerankerStep(makeDb(), makeAi([0.9, 0.1, 0.5]));
    const r = await svc.rerank(TENANT, QUERY, ITEMS, 3);
    expect(r.isSuccess).toBe(true);
    // Find item A which was rank 1 in input
    const itemA = r.data!.items.find((i) => i.content === 'item A');
    expect(itemA?.original_rank).toBe(1);
  });

  it('RS-6: topN limits output length', async () => {
    const svc = new RerankerStep(makeDb(), makeAi([0.9, 0.8, 0.7]));
    const r = await svc.rerank(TENANT, QUERY, ITEMS, 2);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.items.length).toBeLessThanOrEqual(2);
  });

  it('RS-7: AI failure falls back to original score', async () => {
    const svc = new RerankerStep(makeDb(), makeFailingAi());
    const r = await svc.rerank(TENANT, QUERY, [ITEMS[0]], 1);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.items[0].rerank_score).toBe(ITEMS[0].score); // fallback
  });

  it('RS-8: DB store failure → error propagated', async () => {
    const svc = new RerankerStep(makeFailingDb(), makeAi([0.9]));
    const r = await svc.rerank(TENANT, QUERY, ITEMS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('RS-9: rerankId is non-empty string', async () => {
    const svc = new RerankerStep(makeDb(), makeAi([0.9, 0.8, 0.7]));
    const r = await svc.rerank(TENANT, QUERY, ITEMS);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.rerankId.length).toBeGreaterThan(0);
  });

  it('RS-10: CF-606 input shape accepted — content + score + source_type', async () => {
    const cf606Items = [{ content: 'hybrid content', score: 0.75, source_type: 'hybrid' }];
    const svc = new RerankerStep(makeDb(), makeAi([0.8]));
    const r = await svc.rerank(TENANT, QUERY, cf606Items);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.items[0].source_type).toBe('hybrid');
  });
});
