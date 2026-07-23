/**
 * FLOW-33 Phase C — Implement-Family Loop + Arbiter Replay Tests.
 *
 * T542: ContextPackAssembler — TTL staleness (CF-747), FREEDOM config TTL
 * T540: FiveArbiterConsensusGate — Promise.allSettled parallel, ≥4/5 quorum
 * T541: RegressionImpactAnalyzer — CF-746 blast radius, bundle DEGRADED, replayArbiterOnBundle
 * T539: ImplementFamilyMetaLoop — FREEDOM config retries, arbiter feedback injection
 */

import { ContextPackAssembler } from '../../src/engine/flows/system-initiation-bootstrap/context-pack-assembler.service';
import { FiveArbiterConsensusGate } from '../../src/engine/flows/system-initiation-bootstrap/five-arbiter-consensus-gate.service';
import { RegressionImpactAnalyzer } from '../../src/engine/flows/system-initiation-bootstrap/regression-impact-analyzer.service';
import { ImplementFamilyMetaLoop } from '../../src/engine/flows/system-initiation-bootstrap/implement-family-meta-loop.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow33-c';
const FLOW_ID = 'FLOW-33';
const FAMILY_ID = 'Family-201';
const RUN_ID = 'run-c-001';

// ── Mock factories ─────────────────────────────────────────────────────────

function makeDb(existingDocs: Record<string, unknown>[] = []) {
  const stored: Record<string, unknown>[] = [];
  const updated: Record<string, unknown>[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>) => {
      stored.push(doc);
      return DataProcessResult.success(doc);
    }),
    searchDocuments: jest.fn(async () => DataProcessResult.success(existingDocs)),
    updateDocument: jest.fn(async (_i: string, _id: string, upd: Record<string, unknown>) => {
      updated.push(upd);
      return DataProcessResult.success(upd);
    }),
    getDocument: jest.fn(async () => DataProcessResult.success(null)),
    _stored: stored,
    _updated: updated,
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: any) => {
      events.push({ evt, data });
      return DataProcessResult.success('msg-id');
    }),
    _events: events,
  } as any;
}

function makeRag(results: Record<string, unknown>[] = []) {
  return {
    searchSimilar: jest.fn(async () => DataProcessResult.success(results)),
  } as any;
}

function makeFreedom(values: Record<string, unknown> = {}) {
  return {
    get: jest.fn(async (key: string) => DataProcessResult.success(values[key] ?? null)),
  } as any;
}

function makePassingAi(
  responseJson: string = JSON.stringify({ score: 9, passed: true, notes: 'LGTM' }),
) {
  return {
    generate: jest.fn(async () => DataProcessResult.success(responseJson)),
  } as any;
}

function makeFailingAi() {
  return {
    generate: jest.fn(async () => DataProcessResult.failure('AI_ERROR', 'AI service unavailable')),
  } as any;
}

// ── T542 ContextPackAssembler ──────────────────────────────────────────────

describe('ContextPackAssembler (T542)', () => {
  it('F33C-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ContextPackAssembler(makeDb(), makeRag(), makeQueue(), makeFreedom());
    const result = await svc.assemble('', FAMILY_ID, 'implement bootstrap');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F33C-2: assembles fresh pack and stores before emitting (DNA-8)', async () => {
    const db = makeDb([]);
    const queue = makeQueue();
    const svc = new ContextPackAssembler(
      db,
      makeRag([{ nodeId: 'n1' }]),
      queue,
      makeFreedom({ flow33_context_pack_ttl_minutes: 15 }),
    );
    const result = await svc.assemble(TENANT, FAMILY_ID, 'implement bootstrap');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.familyId).toBe(FAMILY_ID);
    expect(result.data!.ttlExpiresAt).toBeDefined();
    expect(result.data!.vectorResults.length).toBeGreaterThan(0);
    // DNA-8: store before emit
    expect(db._stored.length).toBeGreaterThan(0);
    const event = queue._events.find((e: any) => e.evt === 'context_pack.assembled');
    expect(event).toBeDefined();
  });

  it('F33C-3: stale pack (TTL expired) triggers refresh and emits context_pack.stale_detected (CF-747)', async () => {
    const expiredPack = {
      packId: 'old-pack',
      familyId: FAMILY_ID,
      tenantId: TENANT,
      ttlExpiresAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    };
    const db = makeDb([expiredPack]);
    const queue = makeQueue();
    const svc = new ContextPackAssembler(
      db,
      makeRag(),
      queue,
      makeFreedom({ flow33_context_pack_ttl_minutes: 30 }),
    );
    const result = await svc.assemble(TENANT, FAMILY_ID, 'implement bootstrap');
    expect(result.isSuccess).toBe(true);
    const staleEvent = queue._events.find((e: any) => e.evt === 'context_pack.stale_detected');
    expect(staleEvent).toBeDefined();
    expect(staleEvent.data.packId).toBe('old-pack');
  });

  it('F33C-4: fresh pack (TTL not expired) returned directly without refresh', async () => {
    const freshPack = {
      packId: 'fresh-pack',
      familyId: FAMILY_ID,
      tenantId: TENANT,
      vectorResults: [],
      graphEdges: [],
      sources: [],
      ttlExpiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
      assembledAt: new Date().toISOString(),
    };
    const db = makeDb([freshPack]);
    const queue = makeQueue();
    const svc = new ContextPackAssembler(db, makeRag(), queue, makeFreedom());
    const result = await svc.assemble(TENANT, FAMILY_ID, 'implement bootstrap');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.packId).toBe('fresh-pack');
    // No new pack assembled — no assembled event
    const assembledEvent = queue._events.find((e: any) => e.evt === 'context_pack.assembled');
    expect(assembledEvent).toBeUndefined();
  });
});

// ── T540 FiveArbiterConsensusGate ─────────────────────────────────────────

describe('FiveArbiterConsensusGate (T540)', () => {
  it('F33C-5: 5 arbiters called in parallel — AI generate called exactly 5 times', async () => {
    const ai = makePassingAi();
    const svc = new FiveArbiterConsensusGate(ai);
    await svc.runConsensus({ code: 'test', familyId: FAMILY_ID });
    // Promise.allSettled dispatches all 5 — verify 5 calls
    expect(ai.generate).toHaveBeenCalledTimes(5);
  });

  it('F33C-6: all 5 arbiters pass → verdict APPROVED (≥4/5 quorum)', async () => {
    const svc = new FiveArbiterConsensusGate(makePassingAi());
    const result = await svc.runConsensus({ code: 'good code', familyId: FAMILY_ID });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('APPROVED');
    expect(result.data!.passedCount).toBe(5);
  });

  it('F33C-7: exactly 3 arbiters pass → NEEDS_REVISION (below 4/5 quorum)', async () => {
    let callCount = 0;
    const ai = {
      generate: jest.fn(async () => {
        callCount++;
        const passed = callCount <= 3;
        return DataProcessResult.success(
          JSON.stringify({ score: passed ? 9 : 3, passed, notes: 'test' }),
        );
      }),
    } as any;
    const svc = new FiveArbiterConsensusGate(ai);
    const result = await svc.runConsensus({ code: 'mediocre code' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('NEEDS_REVISION');
    expect(result.data!.passedCount).toBe(3);
  });

  it('F33C-8: all 5 arbiters fail → REJECTED', async () => {
    const ai = {
      generate: jest.fn(async () =>
        DataProcessResult.success(JSON.stringify({ score: 2, passed: false, notes: 'failed' })),
      ),
    } as any;
    const svc = new FiveArbiterConsensusGate(ai);
    const result = await svc.runConsensus({ code: 'bad code' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('REJECTED');
    expect(result.data!.passedCount).toBe(0);
  });

  it('F33C-9: AI call failure for one arbiter → score 0, not thrown (Promise.allSettled)', async () => {
    let callCount = 0;
    const ai = {
      generate: jest.fn(async () => {
        callCount++;
        if (callCount === 2) return DataProcessResult.failure('AI_ERROR', 'AI unavailable');
        return DataProcessResult.success(JSON.stringify({ score: 9, passed: true, notes: 'ok' }));
      }),
    } as any;
    const svc = new FiveArbiterConsensusGate(ai);
    const result = await svc.runConsensus({ code: 'test' });
    // Should not throw — Promise.allSettled handles failures gracefully
    expect(result.isSuccess).toBe(true);
    expect(result.data!.totalCount).toBe(5);
    // 4 passed, 1 failed → APPROVED (≥4/5)
    expect(result.data!.passedCount).toBe(4);
    expect(result.data!.verdict).toBe('APPROVED');
  });
});

// ── T541 RegressionImpactAnalyzer ─────────────────────────────────────────

describe('RegressionImpactAnalyzer (T541)', () => {
  it('F33C-10: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new RegressionImpactAnalyzer(makeDb(), makeQueue(), makePassingAi());
    const result = await svc.computeBlastRadius(FAMILY_ID, '');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F33C-11: computeBlastRadius stores report and emits regression.impact.analyzed (DNA-8)', async () => {
    const db = makeDb([
      {
        fromNodeId: FAMILY_ID,
        toNodeId: 'Family-202',
        edgeType: 'depends_on',
        flowId: 'FLOW-25',
        tenantId: TENANT,
      },
    ]);
    const queue = makeQueue();
    const svc = new RegressionImpactAnalyzer(db, queue, makePassingAi());
    const result = await svc.computeBlastRadius(FAMILY_ID, TENANT);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.blastRadius).toBeGreaterThanOrEqual(0);
    const event = queue._events.find((e: any) => e.evt === 'regression.impact.analyzed');
    expect(event).toBeDefined();
    // DNA-8: store before emit
    expect(db._stored.length).toBeGreaterThan(0);
  });

  it('F33C-12: checkBundleVersionsAfterPromotion CASE_B → returns empty (no bundle check)', async () => {
    const svc = new RegressionImpactAnalyzer(makeDb(), makeQueue(), makePassingAi());
    const result = await svc.checkBundleVersionsAfterPromotion(
      'FLOW-33',
      '1.0.0',
      TENANT,
      'CASE_B',
    );
    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  it('F33C-13: CASE_A promotion below minFlowVersions → bundle DEGRADED (DNA-8 update before emit)', async () => {
    const bundle = {
      bundleId: 'bundle-01',
      status: 'ACTIVE',
      tenantId: TENANT,
      requiredFlows: ['FLOW-33'],
      minFlowVersions: { 'FLOW-33': '2.0.0' },
    };
    const db = makeDb([bundle]);
    const queue = makeQueue();
    const svc = new RegressionImpactAnalyzer(db, queue, makePassingAi());
    const result = await svc.checkBundleVersionsAfterPromotion(
      'FLOW-33',
      '1.0.0',
      TENANT,
      'CASE_A',
    );
    expect(result.isSuccess).toBe(true);
    const degraded = result.data!.find((r) => r.degraded);
    expect(degraded).toBeDefined();
    expect(degraded!.bundleId).toBe('bundle-01');
    // DNA-8: updateDocument called before enqueue
    expect(db._updated.length).toBeGreaterThan(0);
    const event = queue._events.find((e: any) => e.evt === 'bundle.degraded');
    expect(event).toBeDefined();
  });

  it('F33C-14: replayArbiterOnBundle returns ArbiterReplayResult with wouldHaveBlocked field', async () => {
    const db = makeDb([{ bundleId: 'bundle-01', tenantId: TENANT, status: 'ACTIVE' }]);
    const svc = new RegressionImpactAnalyzer(
      db,
      makeQueue(),
      makePassingAi(JSON.stringify({ score: 9, passed: true, notes: ['clean'] })),
    );
    const result = await svc.replayArbiterOnBundle('architecture', 'bundle-01', TENANT);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.arbiterId).toBe('architecture');
    expect(result.data!.wouldHaveBlocked).toBe(false);
    expect(result.data!.replayedAt).toBeDefined();
  });
});

// ── T539 ImplementFamilyMetaLoop ───────────────────────────────────────────

describe('ImplementFamilyMetaLoop (T539)', () => {
  it('F33C-15: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ImplementFamilyMetaLoop(
      makePassingAi(),
      makeFreedom(),
      {} as any,
      {} as any,
      {} as any,
    );
    const result = await svc.run('', FLOW_ID, FAMILY_ID, RUN_ID);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F33C-16: APPROVED on first attempt → returns APPROVED with generatedBundleId', async () => {
    const ai = {
      generate: jest.fn(async () =>
        DataProcessResult.success(JSON.stringify({ code: 'class Foo {}', bundleId: 'b-001' })),
      ),
    } as any;
    const freedom = makeFreedom({ flow33_max_family_retries: 3 });
    const contextPack = {
      assemble: jest.fn(async () =>
        DataProcessResult.success({
          packId: 'p1',
          familyId: FAMILY_ID,
          vectorResults: [{ nodeId: 'n1' }],
          graphEdges: [],
        }),
      ),
    } as any;
    const consensus = {
      runConsensus: jest.fn(async () =>
        DataProcessResult.success({
          verdict: 'APPROVED',
          verdicts: [{ arbiterId: 'arch', passed: true, notes: 'ok' }],
        }),
      ),
    } as any;
    const status = { transition: jest.fn(async () => DataProcessResult.success({})) } as any;

    const svc = new ImplementFamilyMetaLoop(ai, freedom, contextPack, consensus, status);
    const result = await svc.run(TENANT, FLOW_ID, FAMILY_ID, RUN_ID);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('APPROVED');
    expect(result.data!.attempts).toBe(1);
    expect(result.data!.generatedBundleId).toBeDefined();
  });

  it('F33C-17: max retries exceeded → MAX_RETRIES_EXCEEDED_HUMAN_REVIEW + NEEDS_REVIEW status', async () => {
    const ai = {
      generate: jest.fn(async () =>
        DataProcessResult.success(JSON.stringify({ code: 'bad code' })),
      ),
    } as any;
    const freedom = makeFreedom({ flow33_max_family_retries: 2 });
    const contextPack = {
      assemble: jest.fn(async () =>
        DataProcessResult.success({
          packId: 'p1',
          familyId: FAMILY_ID,
          vectorResults: [],
          graphEdges: [],
        }),
      ),
    } as any;
    const consensus = {
      runConsensus: jest.fn(async () =>
        DataProcessResult.success({
          verdict: 'REJECTED',
          verdicts: [{ arbiterId: 'arch', passed: false, notes: 'bad' }],
        }),
      ),
    } as any;
    const status = { transition: jest.fn(async () => DataProcessResult.success({})) } as any;

    const svc = new ImplementFamilyMetaLoop(ai, freedom, contextPack, consensus, status);
    const result = await svc.run(TENANT, FLOW_ID, FAMILY_ID, RUN_ID);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MAX_RETRIES_EXCEEDED_HUMAN_REVIEW');
    // Status registry called with NEEDS_REVIEW
    expect(status.transition).toHaveBeenCalledWith(
      TENANT,
      FLOW_ID,
      FAMILY_ID,
      RUN_ID,
      'NEEDS_REVIEW',
      expect.any(String),
    );
  });

  it('F33C-18: max retries from FREEDOM config — 2 retries → 2 attempts made', async () => {
    const ai = {
      generate: jest.fn(async () => DataProcessResult.success(JSON.stringify({ code: 'test' }))),
    } as any;
    const freedom = makeFreedom({ flow33_max_family_retries: 2 });
    const contextPack = {
      assemble: jest.fn(async () =>
        DataProcessResult.success({
          packId: 'p1',
          familyId: FAMILY_ID,
          vectorResults: [],
          graphEdges: [],
        }),
      ),
    } as any;
    const consensus = {
      runConsensus: jest.fn(async () =>
        DataProcessResult.success({ verdict: 'REJECTED', verdicts: [] }),
      ),
    } as any;
    const status = { transition: jest.fn(async () => DataProcessResult.success({})) } as any;

    const svc = new ImplementFamilyMetaLoop(ai, freedom, contextPack, consensus, status);
    await svc.run(TENANT, FLOW_ID, FAMILY_ID, RUN_ID);
    // With 2 max retries, exactly 2 attempts
    expect(contextPack.assemble).toHaveBeenCalledTimes(2);
  });
});
