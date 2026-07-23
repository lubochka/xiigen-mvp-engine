/**
 * HybridRetrievalFusion — Unit Tests (T444).
 *
 * Tests:
 *   HRF-1:  missing tenantId → UNSCOPED_QUERY
 *   HRF-2:  empty vector + empty graph → success with empty items
 *   HRF-3:  output items have CF-606 shape: { content, score, source_type, fusion_score }
 *   HRF-4:  items deduplicated by content before fusion
 *   HRF-5:  item appearing in both lists gets source_type='hybrid'
 *   HRF-6:  items sorted by fusion_score descending
 *   HRF-7:  DB store failure → error propagated
 *   HRF-8:  fusionId is non-empty string
 *   HRF-9:  items from vector-only source have source_type='vector'
 *   HRF-10: items from graph-only source have source_type='graph'
 */

import { HybridRetrievalFusion } from '../../src/engine/flows/rag-optimization/hybrid-retrieval-fusion.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { RetrievalItem } from '../../src/engine/flows/rag-optimization/vector-retrieval-step.service';
import { CommunityResult } from '../../src/engine/flows/rag-optimization/graph-rag-community-query.service';

const TENANT = 'tenant-hrf-test';

const V1: RetrievalItem = {
  content: 'vector result A',
  score: 0.9,
  source_type: 'vector',
  metadata: {},
};
const V2: RetrievalItem = {
  content: 'vector result B',
  score: 0.7,
  source_type: 'vector',
  metadata: {},
};
const G1: CommunityResult = {
  communityId: 'c-1',
  relevanceScore: 0.8,
  summaryExcerpt: 'graph result X',
  source_type: 'graph',
};
const SHARED_GRAPH: CommunityResult = {
  communityId: 'c-dup',
  relevanceScore: 0.85,
  summaryExcerpt: 'vector result A',
  source_type: 'graph',
};

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

describe('HybridRetrievalFusion — Unit (T444)', () => {
  it('HRF-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new HybridRetrievalFusion(makeDb());
    const r = await svc.fuse('', [], []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('HRF-2: empty inputs → success with empty items', async () => {
    const svc = new HybridRetrievalFusion(makeDb());
    const r = await svc.fuse(TENANT, [], []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.items).toHaveLength(0);
    expect(r.data!.totalFused).toBe(0);
  });

  it('HRF-3: output items have CF-606 shape: content, score, source_type, fusion_score', async () => {
    const svc = new HybridRetrievalFusion(makeDb());
    const r = await svc.fuse(TENANT, [V1], [G1]);
    expect(r.isSuccess).toBe(true);
    for (const item of r.data!.items) {
      expect(item).toHaveProperty('content');
      expect(item).toHaveProperty('score');
      expect(item).toHaveProperty('source_type');
      expect(item).toHaveProperty('fusion_score');
    }
  });

  it('HRF-4: items deduplicated by content before fusion', async () => {
    const dup: RetrievalItem = {
      content: 'vector result A',
      score: 0.5,
      source_type: 'vector',
      metadata: {},
    };
    const svc = new HybridRetrievalFusion(makeDb());
    const r = await svc.fuse(TENANT, [V1, dup], []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.totalFused).toBe(1); // deduped
  });

  it('HRF-5: content in both vector and graph → source_type=hybrid', async () => {
    const svc = new HybridRetrievalFusion(makeDb());
    const r = await svc.fuse(TENANT, [V1], [SHARED_GRAPH]);
    expect(r.isSuccess).toBe(true);
    const hybridItem = r.data!.items.find((i) => i.source_type === 'hybrid');
    expect(hybridItem).toBeDefined();
  });

  it('HRF-6: items sorted by fusion_score descending', async () => {
    const svc = new HybridRetrievalFusion(makeDb());
    const r = await svc.fuse(TENANT, [V1, V2], [G1]);
    expect(r.isSuccess).toBe(true);
    const scores = r.data!.items.map((i) => i.fusion_score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  it('HRF-7: DB store failure → error propagated', async () => {
    const svc = new HybridRetrievalFusion(makeFailingDb());
    const r = await svc.fuse(TENANT, [V1], []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('HRF-8: fusionId is non-empty string', async () => {
    const svc = new HybridRetrievalFusion(makeDb());
    const r = await svc.fuse(TENANT, [], []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.fusionId.length).toBeGreaterThan(0);
  });

  it('HRF-9: vector-only items have source_type=vector', async () => {
    const svc = new HybridRetrievalFusion(makeDb());
    const r = await svc.fuse(TENANT, [V1], []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.items[0].source_type).toBe('vector');
  });

  it('HRF-10: graph-only items have source_type=graph', async () => {
    const svc = new HybridRetrievalFusion(makeDb());
    const r = await svc.fuse(TENANT, [], [G1]);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.items[0].source_type).toBe('graph');
  });
});
