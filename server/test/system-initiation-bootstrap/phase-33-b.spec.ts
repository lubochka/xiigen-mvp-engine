/**
 * FLOW-33 Phase B — Bootstrap Infrastructure Tests.
 *
 * T536: BootstrapOrchestrator — sentinel state machine + DRY_RUN (IR-DRY-1)
 * T537: GraphRAGTwoLayerSeeder — Layer 1 before Layer 2 (CF-743)
 * T538: ImplementationStatusRegistry — SETNX composite key + state machine (CF-739)
 */

import { BootstrapOrchestrator } from '../../src/engine/flows/system-initiation-bootstrap/bootstrap-orchestrator.service';
import { GraphRAGTwoLayerSeeder } from '../../src/engine/flows/system-initiation-bootstrap/graphrag-two-layer-seeder.service';
import { ImplementationStatusRegistry } from '../../src/engine/flows/system-initiation-bootstrap/implementation-status-registry.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow33-b';
const FLOW_ID = 'FLOW-33';
const FAMILY_ID = 'Family-200';
const RUN_ID = 'run-001';

// ── Mock factories ─────────────────────────────────────────────────────────

function makeDb(existingDocs: Record<string, unknown>[] = []) {
  const stored: Record<string, unknown>[] = [];
  const updated: Record<string, unknown>[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, _id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc });
    }),
    searchDocuments: jest.fn(async () => DataProcessResult.success(existingDocs)),
    updateDocument: jest.fn(async (_i: string, _id: string, upd: Record<string, unknown>) => {
      updated.push(upd);
      return DataProcessResult.success(upd);
    }),
    _stored: stored,
    _updated: updated,
  } as any;
}

function makeFailingDb() {
  return {
    storeDocument: jest.fn(async () => DataProcessResult.failure('STORAGE_FAILED', 'write error')),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    updateDocument: jest.fn(async () => DataProcessResult.failure('UPDATE_FAILED', 'update error')),
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

function makeRag() {
  const indexed: any[] = [];
  return {
    indexDocument: jest.fn(async (_i: string, doc: Record<string, unknown>) => {
      indexed.push(doc);
      return DataProcessResult.success('idx-id');
    }),
    _indexed: indexed,
  } as any;
}

// ── T536 BootstrapOrchestrator ─────────────────────────────────────────────

describe('BootstrapOrchestrator (T536)', () => {
  it('F33B-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new BootstrapOrchestrator(makeDb(), makeQueue());
    const result = await svc.run({ flowId: FLOW_ID, tenantId: '', executionMode: 'FULL' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F33B-2: DRY_RUN returns DryRunValidationReport without storing or emitting (IR-DRY-1)', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new BootstrapOrchestrator(db, queue);
    const result = await svc.run({
      flowId: FLOW_ID,
      tenantId: TENANT,
      executionMode: 'DRY_RUN',
      planBundleId: 'bundle-123',
    });
    expect(result.isSuccess).toBe(true);
    const report = result.data as any;
    expect(report).toHaveProperty('valid');
    expect(report).toHaveProperty('errors');
    expect(report).toHaveProperty('artifactsValidated');
    // IR-DRY-1: no state mutations — no enqueue calls for phase completion
    const phaseCompleteEvents = queue._events.filter(
      (e: any) => e.evt === 'bootstrap.phase.completed',
    );
    expect(phaseCompleteEvents).toHaveLength(0);
    const completeEvents = queue._events.filter((e: any) => e.evt === 'bootstrap.completed');
    expect(completeEvents).toHaveLength(0);
  });

  it('F33B-3: DRY_RUN with valid bundle → valid=true, errors empty', async () => {
    const db = makeDb([{ bundleId: 'bundle-123', tenantId: TENANT }]);
    const svc = new BootstrapOrchestrator(db, makeQueue());
    const result = await svc.run({
      flowId: FLOW_ID,
      tenantId: TENANT,
      executionMode: 'DRY_RUN',
      planBundleId: 'bundle-123',
    });
    expect(result.isSuccess).toBe(true);
    const report = result.data as any;
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('F33B-4: DRY_RUN without planBundleId → valid=false, error present', async () => {
    const svc = new BootstrapOrchestrator(makeDb(), makeQueue());
    const result = await svc.run({ flowId: FLOW_ID, tenantId: TENANT, executionMode: 'DRY_RUN' });
    expect(result.isSuccess).toBe(true);
    const report = result.data as any;
    expect(report.valid).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it('F33B-5: FULL run on already-COMPLETED sentinel → ALREADY_COMPLETED error', async () => {
    const db = makeDb([{ flowId: FLOW_ID, tenantId: TENANT, status: 'COMPLETED' }]);
    const svc = new BootstrapOrchestrator(db, makeQueue());
    const result = await svc.run({ flowId: FLOW_ID, tenantId: TENANT, executionMode: 'FULL' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ALREADY_COMPLETED');
  });

  it('F33B-6: FULL run with missing bundle → PARTIAL_IMPORT_ROLLED_BACK (CF-742)', async () => {
    // Bundle not found in DB → atomic import fails → rollback
    const db = makeDb([]);
    const svc = new BootstrapOrchestrator(db, makeQueue());
    const result = await svc.run({
      flowId: FLOW_ID,
      tenantId: TENANT,
      executionMode: 'FULL',
      planBundleId: 'missing-bundle',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PARTIAL_IMPORT_ROLLED_BACK');
  });

  it('F33B-7: readSentinel with missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new BootstrapOrchestrator(makeDb(), makeQueue());
    const result = await svc.readSentinel(FLOW_ID, '');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F33B-8: readSentinel when none exists → returns null', async () => {
    const svc = new BootstrapOrchestrator(makeDb([]), makeQueue());
    const result = await svc.readSentinel(FLOW_ID, TENANT);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeNull();
  });
});

// ── T537 GraphRAGTwoLayerSeeder ───────────────────────────────────────────────

describe('GraphRAGTwoLayerSeeder (T537)', () => {
  it('F33B-9: Layer 2 blocked if Layer 1 NOT_STARTED (CF-743)', async () => {
    const db = makeDb([]); // No layer1 seeding state = NOT_STARTED
    const svc = new GraphRAGTwoLayerSeeder(db, makeRag(), makeQueue());
    const result = await svc.seedLayer2(TENANT, [
      { edgeId: 'e1', fromNodeId: 'n1', toNodeId: 'n2', edgeType: 'depends_on', flowId: 'FLOW-25' },
    ]);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('LAYER1_NOT_COMPLETE');
    expect(result.errorMessage).toMatch(/CF-743/);
  });

  it('F33B-10: seedLayer1 stores node and emits graphrag.layer1.completed', async () => {
    const db = makeDb([]);
    const rag = makeRag();
    const queue = makeQueue();
    const svc = new GraphRAGTwoLayerSeeder(db, rag, queue);
    const result = await svc.seedLayer1(TENANT, [
      {
        nodeId: 'n1',
        nodeType: 'task_type',
        content: 'T536 BootstrapOrchestrator',
        metadata: { flowId: 'FLOW-33' },
      },
    ]);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.layer).toBe(1);
    expect(result.data!.nodeIds).toContain('n1');
    const event = queue._events.find((e: any) => e.evt === 'graphrag.layer1.completed');
    expect(event).toBeDefined();
  });

  it('F33B-11: seedLayer2 with COMPLETE Layer 1 → succeeds and emits graphrag.layer2.completed', async () => {
    const db = makeDb([{ tenantId: TENANT, layer: 1, status: 'COMPLETE' }]);
    const rag = makeRag();
    const queue = makeQueue();
    const svc = new GraphRAGTwoLayerSeeder(db, rag, queue);
    const result = await svc.seedLayer2(TENANT, [
      { edgeId: 'e1', fromNodeId: 'n1', toNodeId: 'n2', edgeType: 'cross_flow', flowId: 'FLOW-33' },
    ]);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.layer).toBe(2);
    const event = queue._events.find((e: any) => e.evt === 'graphrag.layer2.completed');
    expect(event).toBeDefined();
  });
});

// ── T538 ImplementationStatusRegistry ─────────────────────────────────────────

describe('ImplementationStatusRegistry (T538)', () => {
  it('F33B-12: registerRun creates PENDING record and emits implementation.status.pending', async () => {
    const db = makeDb([]);
    const queue = makeQueue();
    const svc = new ImplementationStatusRegistry(db, queue);
    const result = await svc.registerRun(TENANT, FLOW_ID, FAMILY_ID, RUN_ID);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.currentStatus).toBe('PENDING');
    const event = queue._events.find((e: any) => e.evt === 'implementation.status.pending');
    expect(event).toBeDefined();
  });

  it('F33B-13: duplicate runId → DUPLICATE_RUN_BLOCKED (SETNX)', async () => {
    const db = makeDb([
      {
        runId: RUN_ID,
        tenantId: TENANT,
        flowId: FLOW_ID,
        familyId: FAMILY_ID,
        compositeKey: `${TENANT}::${FLOW_ID}::${FAMILY_ID}::${RUN_ID}`,
      },
    ]);
    const svc = new ImplementationStatusRegistry(db, makeQueue());
    const result = await svc.registerRun(TENANT, FLOW_ID, FAMILY_ID, RUN_ID);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DUPLICATE_RUN_BLOCKED');
  });

  it('F33B-14: PENDING→IN_PROGRESS→COMPLETED valid transitions (CF-739 state machine)', async () => {
    const db = makeDb([]);
    const queue = makeQueue();
    const svc = new ImplementationStatusRegistry(db, queue);

    // Register PENDING
    await svc.registerRun(TENANT, FLOW_ID, FAMILY_ID, RUN_ID);

    // Mock the getStatus to return PENDING record
    db.searchDocuments = jest.fn(async () =>
      DataProcessResult.success([
        {
          runId: RUN_ID,
          tenantId: TENANT,
          flowId: FLOW_ID,
          familyId: FAMILY_ID,
          status: 'PENDING',
          transitionHistory: [],
          compositeKey: `${TENANT}::${FLOW_ID}::${FAMILY_ID}::${RUN_ID}`,
        },
      ]),
    );

    const toInProgress = await svc.transition(TENANT, FLOW_ID, FAMILY_ID, RUN_ID, 'IN_PROGRESS');
    expect(toInProgress.isSuccess).toBe(true);
    expect(toInProgress.data!.currentStatus).toBe('IN_PROGRESS');

    // Now mock IN_PROGRESS for next transition
    db.searchDocuments = jest.fn(async () =>
      DataProcessResult.success([
        {
          runId: RUN_ID,
          tenantId: TENANT,
          flowId: FLOW_ID,
          familyId: FAMILY_ID,
          status: 'IN_PROGRESS',
          transitionHistory: [],
          compositeKey: `${TENANT}::${FLOW_ID}::${FAMILY_ID}::${RUN_ID}`,
        },
      ]),
    );

    const toCompleted = await svc.transition(TENANT, FLOW_ID, FAMILY_ID, RUN_ID, 'COMPLETED');
    expect(toCompleted.isSuccess).toBe(true);
    expect(toCompleted.data!.currentStatus).toBe('COMPLETED');
  });
});
