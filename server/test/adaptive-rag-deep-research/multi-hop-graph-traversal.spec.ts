/**
 * MultiHopGraphTraversal — Unit Tests (T463).
 *
 * Tests:
 *   MHGT-1:  missing tenantId → UNSCOPED_QUERY
 *   MHGT-2:  missing startNodeId → MISSING_START_NODE
 *   MHGT-3:  maxDepth < 1 → INVALID_MAX_DEPTH
 *   MHGT-4:  node not found → success with empty nodes (partial result)
 *   MHGT-5:  visited-set prevents cycle re-visiting
 *   MHGT-6:  traversal respects maxDepth limit
 *   MHGT-7:  storeDocument() BEFORE enqueue() — DNA-8
 *   MHGT-8:  DB store failure → error propagated, enqueue NOT called
 *   MHGT-9:  traversalId is non-empty string
 *   MHGT-10: event emitted to retrieval.graph.traversal.completed
 */

import { MultiHopGraphTraversal } from '../../src/engine/flows/rag-optimization/multi-hop-graph-traversal.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-mhgt-test';
const NODE_A = 'node-a';
const NODE_B = 'node-b';

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

/** RAG that returns docs with neighbor lists */
function makeRag(nodeMap: Record<string, { content: string; neighbors: string[] }> = {}) {
  return {
    search: jest.fn(async (q: any) => {
      const nodeId = q?.filters?.node_id;
      if (nodeId && nodeMap[nodeId]) {
        return DataProcessResult.success([
          {
            content: nodeMap[nodeId].content,
            neighbors: nodeMap[nodeId].neighbors,
            metadata: {},
          },
        ]);
      }
      return DataProcessResult.success([]);
    }),
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

describe('MultiHopGraphTraversal — Unit (T463)', () => {
  it('MHGT-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new MultiHopGraphTraversal(makeDb(), makeQueue(), makeRag());
    const r = await svc.traverse('', NODE_A);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('MHGT-2: missing startNodeId → MISSING_START_NODE', async () => {
    const svc = new MultiHopGraphTraversal(makeDb(), makeQueue(), makeRag());
    const r = await svc.traverse(TENANT, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_START_NODE');
  });

  it('MHGT-3: maxDepth < 1 → INVALID_MAX_DEPTH', async () => {
    const svc = new MultiHopGraphTraversal(makeDb(), makeQueue(), makeRag());
    const r = await svc.traverse(TENANT, NODE_A, 0);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_MAX_DEPTH');
  });

  it('MHGT-4: node not in graph → success with empty nodes', async () => {
    const svc = new MultiHopGraphTraversal(makeDb(), makeQueue(), makeRag({}));
    const r = await svc.traverse(TENANT, NODE_A);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.nodes).toHaveLength(0);
  });

  it('MHGT-5: visited-set prevents cycle — A↔B loop does not re-visit', async () => {
    const nodeMap = {
      [NODE_A]: { content: 'node A content', neighbors: [NODE_B] },
      [NODE_B]: { content: 'node B content', neighbors: [NODE_A] }, // cycle back
    };
    const svc = new MultiHopGraphTraversal(makeDb(), makeQueue(), makeRag(nodeMap));
    const r = await svc.traverse(TENANT, NODE_A, 5);
    expect(r.isSuccess).toBe(true);
    const nodeIds = r.data!.nodes.map((n) => n.nodeId);
    // Each node appears at most once
    expect(new Set(nodeIds).size).toBe(nodeIds.length);
  });

  it('MHGT-6: traversal respects maxDepth=1 (only start node expanded)', async () => {
    const nodeMap = {
      [NODE_A]: { content: 'node A', neighbors: [NODE_B] },
      [NODE_B]: { content: 'node B', neighbors: [] },
    };
    const svc = new MultiHopGraphTraversal(makeDb(), makeQueue(), makeRag(nodeMap));
    const r = await svc.traverse(TENANT, NODE_A, 1);
    expect(r.isSuccess).toBe(true);
    // At depth 1: A (depth 0) and B (depth 1) are visited, but B's neighbors are not expanded
    const depths = r.data!.nodes.map((n) => n.hopDepth);
    expect(Math.max(...depths)).toBeLessThanOrEqual(1);
  });

  it('MHGT-7: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new MultiHopGraphTraversal(db, queue, makeRag({}));
    await svc.traverse(TENANT, NODE_A);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('MHGT-8: DB store failure → error propagated, enqueue NOT called', async () => {
    const queue = makeQueue();
    const svc = new MultiHopGraphTraversal(makeFailingDb(), queue, makeRag({}));
    const r = await svc.traverse(TENANT, NODE_A);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('MHGT-9: traversalId is non-empty string', async () => {
    const svc = new MultiHopGraphTraversal(makeDb(), makeQueue(), makeRag({}));
    const r = await svc.traverse(TENANT, NODE_A);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.traversalId.length).toBeGreaterThan(0);
  });

  it('MHGT-10: event emitted to retrieval.graph.traversal.completed', async () => {
    const queue = makeQueue();
    const svc = new MultiHopGraphTraversal(makeDb(), queue, makeRag({}));
    await svc.traverse(TENANT, NODE_A);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'retrieval.graph.traversal.completed',
      expect.any(Object),
    );
  });
});
