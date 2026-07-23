/**
 * FLOW-33 Phase D — Integration Tests.
 *
 * Full 3-case after-regeneration protocol:
 *   CASE A — within threshold → auto-promote → ACTIVE/REGRESSED
 *   CASE B — exceeds threshold → EscalationBriefing (options A/B/C) — STOP
 *   CASE C — empty blast radius → ACTIVE immediately
 *
 * Bundle version check after CASE A and CASE C.
 * CASE B: flow not promoted — bundle unaffected.
 */

import { Flow33Integration } from '../../src/engine/flows/system-initiation-bootstrap/flow33-integration.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow33-d';
const FLOW_ID = 'FLOW-33';

const EMPTY_BLAST = {
  reportId: 'r1',
  familyId: 'Family-200',
  tenantId: TENANT,
  affectedFlows: [],
  affectedFamilies: [],
  blastRadius: 0,
};
const SMALL_BLAST = {
  reportId: 'r2',
  familyId: 'Family-200',
  tenantId: TENANT,
  affectedFlows: ['FLOW-25'],
  affectedFamilies: ['Family-147'],
  blastRadius: 1,
};
const LARGE_BLAST = {
  reportId: 'r3',
  familyId: 'Family-200',
  tenantId: TENANT,
  affectedFlows: ['FLOW-25', 'FLOW-26', 'FLOW-29'],
  affectedFamilies: ['Family-147', 'Family-149', 'Family-151', 'Family-153'],
  blastRadius: 4,
};

// ── Mocks ─────────────────────────────────────────────────────────────────

function makeDb(existingDocs: Record<string, unknown>[] = [], crossFlowFailures: boolean = false) {
  const stored: Record<string, unknown>[] = [];
  const updated: Record<string, unknown>[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>) => {
      stored.push(doc);
      return DataProcessResult.success(doc);
    }),
    searchDocuments: jest.fn(async (index: string, _filter: Record<string, unknown>) => {
      if (index === 'flow33-cross-flow-tests') {
        return DataProcessResult.success(crossFlowFailures ? [{ status: 'FAILED' }] : []);
      }
      return DataProcessResult.success(existingDocs);
    }),
    updateDocument: jest.fn(async (_i: string, _id: string, upd: Record<string, unknown>) => {
      updated.push(upd);
      return DataProcessResult.success(upd);
    }),
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

function makeFreedom(values: Record<string, unknown> = {}) {
  return {
    get: jest.fn(async (key: string) => DataProcessResult.success(values[key] ?? null)),
  } as any;
}

// ── Phase D Tests ─────────────────────────────────────────────────────────

describe('Flow33Integration — 3-Case After-Regeneration Protocol', () => {
  it('F33D-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new Flow33Integration(makeDb(), makeQueue(), makeFreedom());
    const result = await svc.applyAfterRegenerationProtocol(FLOW_ID, '1.0.0', '', EMPTY_BLAST);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F33D-2: CASE C — empty blast radius → ACTIVE immediately, no escalation', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new Flow33Integration(db, queue, makeFreedom());
    const result = await svc.applyAfterRegenerationProtocol(FLOW_ID, '1.0.0', TENANT, EMPTY_BLAST);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.promotionCase).toBe('CASE_C');
    expect(result.data!.newStatus).toBe('ACTIVE');
    expect(result.data!.escalationBriefing).toBeUndefined();
    // flow.status.active emitted
    const activeEvent = queue._events.find((e: any) => e.evt === 'flow.status.active');
    expect(activeEvent).toBeDefined();
    // DNA-8: stored before emit
    expect(db._stored.length).toBeGreaterThan(0);
  });

  it('F33D-3: CASE A — within threshold → PROMOTED then ACTIVE (no cross-flow failures)', async () => {
    const db = makeDb([], false); // no cross-flow failures
    const queue = makeQueue();
    // D-VIS-1 thresholds: directDeps=0, transitiveDeps=2. SMALL_BLAST has 1 flow, 1 family — within 2 transitive limit
    const freedom = makeFreedom({
      blast_radius_promotion_threshold: { directDependencies: 1, transitiveDependencies: 5 },
    });
    const svc = new Flow33Integration(db, queue, freedom);
    const result = await svc.applyAfterRegenerationProtocol(FLOW_ID, '2.0.0', TENANT, SMALL_BLAST);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.promotionCase).toBe('CASE_A');
    expect(result.data!.newStatus).toBe('ACTIVE');
    const promotedEvent = queue._events.find((e: any) => e.evt === 'flow.status.promoted');
    expect(promotedEvent).toBeDefined();
    const activeEvent = queue._events.find((e: any) => e.evt === 'flow.status.active');
    expect(activeEvent).toBeDefined();
  });

  it('F33D-4: CASE A — cross-flow test failures → REGRESSED (not ACTIVE)', async () => {
    const db = makeDb([], true); // cross-flow failures
    const queue = makeQueue();
    const freedom = makeFreedom({
      blast_radius_promotion_threshold: { directDependencies: 5, transitiveDependencies: 10 },
    });
    const svc = new Flow33Integration(db, queue, freedom);
    const result = await svc.applyAfterRegenerationProtocol(FLOW_ID, '1.0.0', TENANT, SMALL_BLAST);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.promotionCase).toBe('CASE_A');
    expect(result.data!.newStatus).toBe('REGRESSED');
    const regressedEvent = queue._events.find((e: any) => e.evt === 'flow.status.regressed');
    expect(regressedEvent).toBeDefined();
  });

  it('F33D-5: CASE B — exceeds threshold → EscalationBriefing with options A/B/C (requiresApproval)', async () => {
    const db = makeDb();
    const queue = makeQueue();
    // Default thresholds: directDeps=0, transitiveDeps=2. LARGE_BLAST: 3 flows, 4 families — exceeds both
    const svc = new Flow33Integration(db, queue, makeFreedom());
    const result = await svc.applyAfterRegenerationProtocol(FLOW_ID, '1.0.0', TENANT, LARGE_BLAST);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.promotionCase).toBe('CASE_B');
    expect(result.data!.newStatus).toBe('REGRESSED');
    const briefing = result.data!.escalationBriefing!;
    expect(briefing).toBeDefined();
    expect(briefing.requiresApproval).toBe(true);
    expect(briefing.options.A).toBeDefined();
    expect(briefing.options.B).toBeDefined();
    expect(briefing.options.C).toBeDefined();
    // flow.status.regressed emitted
    const regressedEvent = queue._events.find((e: any) => e.evt === 'flow.status.regressed');
    expect(regressedEvent).toBeDefined();
  });

  it('F33D-6: CASE B — flow NOT promoted → no bundle.degraded emitted (bundle unaffected)', async () => {
    const bundle = {
      bundleId: 'b-01',
      status: 'ACTIVE',
      tenantId: TENANT,
      requiredFlows: [FLOW_ID],
      minFlowVersions: { [FLOW_ID]: '2.0.0' },
    };
    const db = makeDb([bundle]);
    const queue = makeQueue();
    const svc = new Flow33Integration(db, queue, makeFreedom());
    await svc.applyAfterRegenerationProtocol(FLOW_ID, '1.0.0', TENANT, LARGE_BLAST);
    const degradedEvent = queue._events.find((e: any) => e.evt === 'bundle.degraded');
    expect(degradedEvent).toBeUndefined(); // CASE B: no promotion → no bundle check
  });

  it('F33D-7: CASE C — bundle DEGRADED when promoted version < minFlowVersions (DNA-8)', async () => {
    const bundle = {
      bundleId: 'b-02',
      status: 'ACTIVE',
      tenantId: TENANT,
      requiredFlows: [FLOW_ID],
      minFlowVersions: { [FLOW_ID]: '2.0.0' },
    };
    const db = makeDb([bundle]);
    const queue = makeQueue();
    const svc = new Flow33Integration(db, queue, makeFreedom());
    const result = await svc.applyAfterRegenerationProtocol(FLOW_ID, '1.0.0', TENANT, EMPTY_BLAST);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.bundleChecks!.some((c) => c.degraded)).toBe(true);
    // DNA-8: update BEFORE emit
    expect(db._updated.some((u: any) => u.status === 'DEGRADED')).toBe(true);
    const degradedEvent = queue._events.find((e: any) => e.evt === 'bundle.degraded');
    expect(degradedEvent).toBeDefined();
  });

  it('F33D-8: CASE A — bundle stays ACTIVE when promoted version >= minFlowVersions', async () => {
    const bundle = {
      bundleId: 'b-03',
      status: 'ACTIVE',
      tenantId: TENANT,
      requiredFlows: [FLOW_ID],
      minFlowVersions: { [FLOW_ID]: '1.0.0' },
    };
    const db = makeDb([bundle]);
    const queue = makeQueue();
    const freedom = makeFreedom({
      blast_radius_promotion_threshold: { directDependencies: 5, transitiveDependencies: 10 },
    });
    const svc = new Flow33Integration(db, queue, freedom);
    const result = await svc.applyAfterRegenerationProtocol(FLOW_ID, '2.0.0', TENANT, SMALL_BLAST);
    expect(result.isSuccess).toBe(true);
    const bundleChecks = result.data!.bundleChecks ?? [];
    const bundleCheck = bundleChecks.find((c) => c.bundleId === 'b-03');
    if (bundleCheck) {
      expect(bundleCheck.degraded).toBe(false);
    }
    const degradedEvent = queue._events.find((e: any) => e.evt === 'bundle.degraded');
    expect(degradedEvent).toBeUndefined();
  });

  it('F33D-9: blast_radius_promotion_threshold read from FREEDOM config (D-VIS-1)', async () => {
    const freedom = makeFreedom({
      blast_radius_promotion_threshold: { directDependencies: 0, transitiveDependencies: 2 },
    });
    const svc = new Flow33Integration(makeDb(), makeQueue(), freedom);
    // SMALL_BLAST: 1 direct flow. Default directDeps=0 → 1 > 0 → CASE_B
    const result = await svc.applyAfterRegenerationProtocol(FLOW_ID, '1.0.0', TENANT, SMALL_BLAST);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.promotionCase).toBe('CASE_B');
    expect(freedom.get).toHaveBeenCalledWith('blast_radius_promotion_threshold');
  });

  it('F33D-10: CASE C DNA-8 verified — storeDocument called before any enqueue', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
      updateDocument: jest.fn(async () => DataProcessResult.success({})),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
      _events: [] as any[],
    } as any;
    const svc = new Flow33Integration(db, queue, makeFreedom());
    await svc.applyAfterRegenerationProtocol(FLOW_ID, '1.0.0', TENANT, EMPTY_BLAST);
    const firstStore = callOrder.indexOf('store');
    const firstEnqueue = callOrder.indexOf('enqueue');
    expect(firstStore).toBeLessThan(firstEnqueue);
  });
});
