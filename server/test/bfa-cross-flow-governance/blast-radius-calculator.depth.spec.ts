/**
 * BlastRadiusCalculator — Depth Limit Tests (T380, CF-485).
 *
 * CF-485: Max traversal depth MUST come from FREEDOM config — never a hardcoded int.
 * Tests that depth is controlled by config and depthLimitReached flag is set correctly.
 *
 * Tests:
 *   DL-1: traversal stops at max_depth from FREEDOM config
 *   DL-2: depthLimitReached=true when graph exceeds configured depth
 *   DL-3: depthLimitReached=false when graph fits within configured depth
 *   DL-4: max_depth=1 traverses only direct dependants
 *   DL-5: max_depth=2 traverses direct and one transitive hop
 *   DL-6: FREEDOM config unavailable falls back to default (5) gracefully
 *   DL-7: max_depth=0 returns empty report (edge case — no traversal)
 *   DL-8: config value=3 stops traversal at hop 3
 */

import { BlastRadiusCalculator } from '../../src/engine/flows/bfa-conflict-arbitration/blast-radius-calculator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-depth-test';

/** Build a linear chain: ROOT → hop1 → hop2 → hop3 → hop4 → hop5 */
function makeLinearGraph(depth: number): Record<string, unknown>[] {
  const docs: Record<string, unknown>[] = [];
  let parent = 'ROOT';
  for (let i = 1; i <= depth; i++) {
    const entityId = `Hop${i}`;
    docs.push({
      entity_id: entityId,
      entity_class: 'service',
      depends_on: parent,
      severity: 'LOW',
      tenant_id: TENANT,
    });
    parent = entityId;
  }
  return docs;
}

function makeDb(graphDocs: Record<string, unknown>[], maxDepth: number | null = 5) {
  const configDocs =
    maxDepth !== null
      ? [{ config_key: 'blast_radius_max_depth', config_value: maxDepth, tenant_id: TENANT }]
      : [];

  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' }),
    ),
    searchDocuments: jest.fn(async (_index: string, filters: Record<string, unknown>) => {
      if (filters['config_key'] === 'blast_radius_max_depth') {
        return DataProcessResult.success(
          configDocs.filter((d) => Object.entries(filters).every(([k, v]) => d[k] === v)),
        );
      }
      return DataProcessResult.success(
        graphDocs.filter((d) => Object.entries(filters).every(([k, v]) => d[k] === v)),
      );
    }),
  } as any;
}

function makeQueue() {
  return {
    enqueue: jest.fn(async () => DataProcessResult.success('msg-1')),
  } as any;
}

describe('BlastRadiusCalculator — Depth Limit (CF-485)', () => {
  it('DL-1: traversal stops at max_depth from FREEDOM config', async () => {
    // 5-hop chain, max_depth=2 → only hops 1 and 2 should be reached
    const svc = new BlastRadiusCalculator(makeDb(makeLinearGraph(5), 2), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    const allNodes = [...result.data!.directImpacts, ...result.data!.transitiveImpacts];
    const maxHop = Math.max(...allNodes.map((n) => n.hopDepth), 0);
    expect(maxHop).toBeLessThanOrEqual(2);
  });

  it('DL-2: depthLimitReached=true when graph exceeds configured depth', async () => {
    // 5-hop chain, max_depth=2 → depth limit hit
    const svc = new BlastRadiusCalculator(makeDb(makeLinearGraph(5), 2), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);
    expect(result.data!.depthLimitReached).toBe(true);
  });

  it('DL-3: depthLimitReached=false when graph fits within configured depth', async () => {
    // 2-hop chain, max_depth=5 → no depth limit hit
    const svc = new BlastRadiusCalculator(makeDb(makeLinearGraph(2), 5), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);
    expect(result.data!.depthLimitReached).toBe(false);
  });

  it('DL-4: max_depth=1 traverses only direct dependants', async () => {
    const svc = new BlastRadiusCalculator(makeDb(makeLinearGraph(3), 1), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    // max_depth=1 means we check dependants of ROOT (depth 0 → 1) but don't go to depth 2
    expect(result.data!.directImpacts).toHaveLength(1);
    expect(result.data!.transitiveImpacts).toHaveLength(0);
  });

  it('DL-5: max_depth=2 traverses direct and one transitive hop', async () => {
    const svc = new BlastRadiusCalculator(makeDb(makeLinearGraph(4), 2), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    expect(result.data!.directImpacts).toHaveLength(1); // Hop1 at depth 1
    expect(result.data!.transitiveImpacts).toHaveLength(1); // Hop2 at depth 2
  });

  it('DL-6: FREEDOM config unavailable falls back to default depth (5) gracefully', async () => {
    // null config → no config docs → fallback to default 5
    const svc = new BlastRadiusCalculator(makeDb(makeLinearGraph(3), null), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    // 3-hop chain fits within default depth 5 → all 3 nodes reached
    expect(result.isSuccess).toBe(true);
    const total = result.data!.directImpacts.length + result.data!.transitiveImpacts.length;
    expect(total).toBe(3);
  });

  it('DL-7: invalid max_depth=0 in config falls back to default — graph still traversed', async () => {
    // config_value=0 is invalid (not > 0) → readMaxDepthFromConfig returns DEFAULT_MAX_DEPTH (5)
    // 3-hop chain fits within default 5 → all 3 nodes reached
    const svc = new BlastRadiusCalculator(makeDb(makeLinearGraph(3), 0), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    expect(result.isSuccess).toBe(true);
    // Falls back to default (5) — 3-hop chain fully traversed
    const total = result.data!.directImpacts.length + result.data!.transitiveImpacts.length;
    expect(total).toBe(3);
  });

  it('DL-8: config value=3 stops traversal at hop 3', async () => {
    const svc = new BlastRadiusCalculator(makeDb(makeLinearGraph(6), 3), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    const allNodes = [...result.data!.directImpacts, ...result.data!.transitiveImpacts];
    // Hops 1, 2, 3 should all be present
    expect(allNodes.find((n) => n.entityId === 'Hop1')).toBeDefined();
    expect(allNodes.find((n) => n.entityId === 'Hop2')).toBeDefined();
    expect(allNodes.find((n) => n.entityId === 'Hop3')).toBeDefined();
    // Hop4+ should NOT be present (beyond max_depth=3)
    expect(allNodes.find((n) => n.entityId === 'Hop4')).toBeUndefined();
    expect(result.data!.depthLimitReached).toBe(true);
  });
});
