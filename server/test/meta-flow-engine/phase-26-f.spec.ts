/**
 * FLOW-26 Phase F — Learning, Governance & Meta-Orchestration Tests (T408–T412).
 *
 * T408 SelfExtensionLearner
 * T409 FlowEvolutionTracker
 * T410 MetaFlowAuditEmitter
 * T411 ExtensionHealthScorer
 * T412 MetaFlowOrchestrator
 */

import { SelfExtensionLearner } from '../../src/engine/flows/flow-extension-engine/self-extension-learner.service';
import { FlowEvolutionTracker } from '../../src/engine/flows/flow-extension-engine/flow-evolution-tracker.service';
import { MetaFlowAuditEmitter } from '../../src/engine/flows/flow-extension-engine/meta-flow-audit-emitter.service';
import { ExtensionHealthScorer } from '../../src/engine/flows/flow-extension-engine/extension-health-scorer.service';
import { MetaFlowOrchestrator } from '../../src/engine/flows/flow-extension-engine/meta-flow-orchestrator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow26-f';
const FLOW_ID = 'FLOW-99';
const VERSION = 'v1.0.0';
const ACTOR_ID = 'actor-001';

const HEALTHY_METRICS = { errorRate: 0.02, latencyMs: 200, successRate: 0.98 };
const DEGRADED_METRICS = { errorRate: 0.3, latencyMs: 3000, successRate: 0.6 };
const UNHEALTHY_METRICS = { errorRate: 0.8, latencyMs: 9000, successRate: 0.2 };

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(existingDocs: Record<string, unknown>[] = []) {
  const stored: Record<string, unknown>[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc, _id: id ?? 'x' });
    }),
    searchDocuments: jest.fn(async () => DataProcessResult.success(existingDocs)),
    _stored: stored,
  } as any;
}

function makeFailingDb() {
  return {
    storeDocument: jest.fn(async () => DataProcessResult.failure('STORAGE_FAILED', 'write error')),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
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

// ── T408 SelfExtensionLearner ─────────────────────────────────────────────────

describe('SelfExtensionLearner (T408)', () => {
  it('F26F-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new SelfExtensionLearner(makeDb(), makeQueue()).learn('', FLOW_ID, {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26F-2: valid args → success, queued=true', async () => {
    const r = await new SelfExtensionLearner(makeDb(), makeQueue()).learn(TENANT, FLOW_ID, {
      outcome: 'success',
    });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.queued).toBe(true);
  });

  it('F26F-3: flowId echoed in result', async () => {
    const r = await new SelfExtensionLearner(makeDb(), makeQueue()).learn(TENANT, FLOW_ID, {});
    expect(r.data!.flowId).toBe(FLOW_ID);
  });

  it('F26F-4: SCORE-0 flag stored in document', async () => {
    const db = makeDb();
    await new SelfExtensionLearner(db, makeQueue()).learn(TENANT, FLOW_ID, {});
    expect(db._stored[0]['scoreFlag']).toBe('SCORE-0');
  });

  it('F26F-5: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new SelfExtensionLearner(db, queue).learn(TENANT, FLOW_ID, {});
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26F-6: emits flow.extension.learned', async () => {
    const queue = makeQueue();
    await new SelfExtensionLearner(makeDb(), queue).learn(TENANT, FLOW_ID, {});
    expect(queue.enqueue).toHaveBeenCalledWith('flow.extension.learned', expect.any(Object));
  });

  it('F26F-7: DB store failure → error propagated', async () => {
    const r = await new SelfExtensionLearner(makeFailingDb(), makeQueue()).learn(
      TENANT,
      FLOW_ID,
      {},
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });
});

// ── T409 FlowEvolutionTracker ─────────────────────────────────────────────────

describe('FlowEvolutionTracker (T409)', () => {
  it('F26F-8: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new FlowEvolutionTracker(makeDb(), makeQueue()).track('', FLOW_ID, VERSION, {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26F-9: valid args → success', async () => {
    const r = await new FlowEvolutionTracker(makeDb(), makeQueue()).track(
      TENANT,
      FLOW_ID,
      VERSION,
      { added: ['T500'] },
    );
    expect(r.isSuccess).toBe(true);
  });

  it('F26F-10: missing version → MISSING_VERSION', async () => {
    const r = await new FlowEvolutionTracker(makeDb(), makeQueue()).track(TENANT, FLOW_ID, '', {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_VERSION');
  });

  it('F26F-11: flowId and version echoed in result', async () => {
    const r = await new FlowEvolutionTracker(makeDb(), makeQueue()).track(
      TENANT,
      FLOW_ID,
      VERSION,
      {},
    );
    expect(r.data!.flowId).toBe(FLOW_ID);
    expect(r.data!.version).toBe(VERSION);
  });

  it('F26F-12: each call creates new entry (INSERT-ONLY, no idempotency)', async () => {
    const db = makeDb();
    await new FlowEvolutionTracker(db, makeQueue()).track(TENANT, FLOW_ID, VERSION, {});
    await new FlowEvolutionTracker(db, makeQueue()).track(TENANT, FLOW_ID, VERSION, {});
    expect(db.storeDocument).toHaveBeenCalledTimes(2);
  });

  it('F26F-13: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new FlowEvolutionTracker(db, queue).track(TENANT, FLOW_ID, VERSION, {});
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26F-14: emits flow.evolution.tracked', async () => {
    const queue = makeQueue();
    await new FlowEvolutionTracker(makeDb(), queue).track(TENANT, FLOW_ID, VERSION, {});
    expect(queue.enqueue).toHaveBeenCalledWith('flow.evolution.tracked', expect.any(Object));
  });
});

// ── T410 MetaFlowAuditEmitter ─────────────────────────────────────────────────

describe('MetaFlowAuditEmitter (T410)', () => {
  it('F26F-15: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new MetaFlowAuditEmitter(makeDb(), makeQueue()).emit(
      '',
      'flow.deployed',
      FLOW_ID,
      ACTOR_ID,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26F-16: valid args → success', async () => {
    const r = await new MetaFlowAuditEmitter(makeDb(), makeQueue()).emit(
      TENANT,
      'flow.deployed',
      FLOW_ID,
      ACTOR_ID,
    );
    expect(r.isSuccess).toBe(true);
  });

  it('F26F-17: missing eventType → MISSING_EVENT_TYPE', async () => {
    const r = await new MetaFlowAuditEmitter(makeDb(), makeQueue()).emit(
      TENANT,
      '',
      FLOW_ID,
      ACTOR_ID,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_EVENT_TYPE');
  });

  it('F26F-18: missing actorId → MISSING_ACTOR_ID', async () => {
    const r = await new MetaFlowAuditEmitter(makeDb(), makeQueue()).emit(
      TENANT,
      'flow.deployed',
      FLOW_ID,
      '',
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_ACTOR_ID');
  });

  it('F26F-19: eventType and entityId echoed in result', async () => {
    const r = await new MetaFlowAuditEmitter(makeDb(), makeQueue()).emit(
      TENANT,
      'flow.deployed',
      FLOW_ID,
      ACTOR_ID,
    );
    expect(r.data!.eventType).toBe('flow.deployed');
    expect(r.data!.entityId).toBe(FLOW_ID);
  });

  it('F26F-20: INSERT-ONLY — each call creates new audit entry', async () => {
    const db = makeDb();
    await new MetaFlowAuditEmitter(db, makeQueue()).emit(
      TENANT,
      'flow.deployed',
      FLOW_ID,
      ACTOR_ID,
    );
    await new MetaFlowAuditEmitter(db, makeQueue()).emit(
      TENANT,
      'flow.deployed',
      FLOW_ID,
      ACTOR_ID,
    );
    expect(db.storeDocument).toHaveBeenCalledTimes(2);
  });

  it('F26F-21: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new MetaFlowAuditEmitter(db, queue).emit(TENANT, 'flow.deployed', FLOW_ID, ACTOR_ID);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26F-22: emits metaflow.audit.emitted', async () => {
    const queue = makeQueue();
    await new MetaFlowAuditEmitter(makeDb(), queue).emit(
      TENANT,
      'flow.deployed',
      FLOW_ID,
      ACTOR_ID,
    );
    expect(queue.enqueue).toHaveBeenCalledWith('metaflow.audit.emitted', expect.any(Object));
  });
});

// ── T411 ExtensionHealthScorer ────────────────────────────────────────────────

describe('ExtensionHealthScorer (T411)', () => {
  it('F26F-23: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new ExtensionHealthScorer(makeDb(), makeQueue()).score(
      '',
      FLOW_ID,
      HEALTHY_METRICS,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26F-24: healthy metrics → HEALTHY status', async () => {
    const r = await new ExtensionHealthScorer(makeDb(), makeQueue()).score(
      TENANT,
      FLOW_ID,
      HEALTHY_METRICS,
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('HEALTHY');
  });

  it('F26F-25: degraded metrics → DEGRADED status', async () => {
    const r = await new ExtensionHealthScorer(makeDb(), makeQueue()).score(
      TENANT,
      FLOW_ID,
      DEGRADED_METRICS,
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('DEGRADED');
  });

  it('F26F-26: unhealthy metrics → UNHEALTHY status', async () => {
    const r = await new ExtensionHealthScorer(makeDb(), makeQueue()).score(
      TENANT,
      FLOW_ID,
      UNHEALTHY_METRICS,
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('UNHEALTHY');
  });

  it('F26F-27: healthScore between 0 and 1', async () => {
    const r = await new ExtensionHealthScorer(makeDb(), makeQueue()).score(
      TENANT,
      FLOW_ID,
      HEALTHY_METRICS,
    );
    expect(r.data!.healthScore).toBeGreaterThanOrEqual(0);
    expect(r.data!.healthScore).toBeLessThanOrEqual(1);
  });

  it('F26F-28: invalid errorRate → INVALID_METRIC', async () => {
    const bad = { errorRate: 1.5, latencyMs: 100, successRate: 0.9 };
    const r = await new ExtensionHealthScorer(makeDb(), makeQueue()).score(TENANT, FLOW_ID, bad);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_METRIC');
  });

  it('F26F-29: flowId echoed in result', async () => {
    const r = await new ExtensionHealthScorer(makeDb(), makeQueue()).score(
      TENANT,
      FLOW_ID,
      HEALTHY_METRICS,
    );
    expect(r.data!.flowId).toBe(FLOW_ID);
  });

  it('F26F-30: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new ExtensionHealthScorer(db, queue).score(TENANT, FLOW_ID, HEALTHY_METRICS);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26F-31: emits flow.extension.scored', async () => {
    const queue = makeQueue();
    await new ExtensionHealthScorer(makeDb(), queue).score(TENANT, FLOW_ID, HEALTHY_METRICS);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.extension.scored', expect.any(Object));
  });
});

// ── T412 MetaFlowOrchestrator ─────────────────────────────────────────────────

describe('MetaFlowOrchestrator (T412)', () => {
  it('F26F-32: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new MetaFlowOrchestrator(makeDb(), makeQueue()).orchestrate('', FLOW_ID, {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26F-33: valid args → success with INITIATED status', async () => {
    const r = await new MetaFlowOrchestrator(makeDb(), makeQueue()).orchestrate(
      TENANT,
      FLOW_ID,
      {},
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('INITIATED');
  });

  it('F26F-34: flowId echoed in result', async () => {
    const r = await new MetaFlowOrchestrator(makeDb(), makeQueue()).orchestrate(
      TENANT,
      FLOW_ID,
      {},
    );
    expect(r.data!.flowId).toBe(FLOW_ID);
  });

  it('F26F-35: idempotent — second call returns existing without re-orchestrating', async () => {
    const existing = [
      {
        runId: 'existing-run',
        flowId: FLOW_ID,
        status: 'INITIATED',
        initiatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    const db = makeDb(existing);
    const r = await new MetaFlowOrchestrator(db, makeQueue()).orchestrate(TENANT, FLOW_ID, {});
    expect(r.data!.runId).toBe('existing-run');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('F26F-36: storeDocument() BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    await new MetaFlowOrchestrator(db, queue).orchestrate(TENANT, FLOW_ID, {});
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26F-37: emits metaflow.orchestration.initiated', async () => {
    const queue = makeQueue();
    await new MetaFlowOrchestrator(makeDb(), queue).orchestrate(TENANT, FLOW_ID, {});
    expect(queue.enqueue).toHaveBeenCalledWith(
      'metaflow.orchestration.initiated',
      expect.any(Object),
    );
  });

  it('F26F-38: DB store failure → error propagated', async () => {
    const r = await new MetaFlowOrchestrator(makeFailingDb(), makeQueue()).orchestrate(
      TENANT,
      FLOW_ID,
      {},
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });
});
