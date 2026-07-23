/**
 * FLOW-00 Phase C — BundleActivationOrchestrator Tests.
 *
 * 18 tests covering:
 *   - activateBundle: CF-824 — invalid validation report rejected
 *   - activateBundle: CF-826 — DRY_RUN before FULL on each flow
 *   - activateBundle: CF-828 — FREEDOM config pre-populated (additive only)
 *   - activateBundle: DNA-8 — storeDocument before BundleActivated event
 *   - activateBundle: FLOW-01 always first in activation order
 *   - activateBundle: per-flow progress events emitted
 *   - activateBundle: activation record returned with correct shape
 *   - activateBundle: missing bundleId → failure (not throw)
 *   - activateBundle: DRY_RUN failure halts activation
 *   - activateBundle: FULL failure halts activation
 *   - orderByDependency: FLOW-01 first, others numeric
 *   - CF-828: existing FREEDOM config keys NOT overwritten
 */

import {
  BundleActivationOrchestratorService,
  type ActivationRecord,
} from '../../src/engine/flows/bundle-activation/bundle-activation-orchestrator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ───────────────────────────────────────────────────────────

function makeDb(
  bundleData: Record<string, unknown>[] = [],
  flowData: Record<string, unknown>[] = [],
  freedomData: Record<string, unknown>[] = [],
) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      return DataProcessResult.success({ ...doc });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      if (index === 'solution-bundles') {
        if (filter.bundleId) {
          return DataProcessResult.success(
            bundleData.filter((b) => b.bundleId === filter.bundleId),
          );
        }
        return DataProcessResult.success(bundleData);
      }
      if (index === 'flow-lifecycle') {
        if (filter.flowId) {
          return DataProcessResult.success(flowData.filter((f) => f.flowId === filter.flowId));
        }
        return DataProcessResult.success(flowData);
      }
      if (index === 'freedom-config') {
        return DataProcessResult.success(freedomData);
      }
      return DataProcessResult.success([]);
    }),
    _stored: stored,
  } as any;
}

function makeQueue() {
  const events: Array<{ event: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (event: string, data: Record<string, unknown>) => {
      events.push({ event, data });
      return DataProcessResult.success('msg-id');
    }),
    _events: events,
  } as any;
}

function makeFlowOrchestrator(failOnDryRun?: string, failOnFull?: string) {
  return {
    bootstrapFlow: jest.fn(async (flowId: string, opts: { mode: string }) => {
      if (opts.mode === 'DRY_RUN' && failOnDryRun && flowId === failOnDryRun) {
        return DataProcessResult.failure(
          'DRY_RUN_ERROR',
          `Simulated DRY_RUN failure for ${flowId}`,
        );
      }
      if (opts.mode === 'FULL' && failOnFull && flowId === failOnFull) {
        return DataProcessResult.failure('FULL_ERROR', `Simulated FULL failure for ${flowId}`);
      }
      return DataProcessResult.success({ flowId, mode: opts.mode });
    }),
  } as any;
}

const TENANT = 'tenant-flow00-c';

const B001_BUNDLE = {
  bundleId: 'B-001',
  tenantId: TENANT,
  name: 'B2B Marketplace',
  requiredFlows: ['FLOW-01', 'FLOW-02', 'FLOW-03'],
  minFlowVersions: { 'FLOW-01': 'v1', 'FLOW-02': 'v1', 'FLOW-03': 'v1' },
  defaultFreedomConfig: { matching_algorithm: 'portfolio-based', max_matches: 50 },
  status: 'PLANNED',
};

const VALID_REPORT = {
  bundleId: 'B-001',
  valid: true,
  errors: [],
  warnings: [],
  requiredFlows: ['FLOW-01', 'FLOW-02', 'FLOW-03'],
  estimatedActivationMs: 15000,
  checkedAt: new Date().toISOString(),
};

const ALL_FLOWS = [
  { flowId: 'FLOW-01', version: 'v1', status: 'ACTIVE' },
  { flowId: 'FLOW-02', version: 'v1', status: 'ACTIVE' },
  { flowId: 'FLOW-03', version: 'v1', status: 'ACTIVE' },
];

// ── BundleActivationOrchestratorService tests ────────────────────────────────

describe('FLOW-00 Phase C — BundleActivationOrchestratorService', () => {
  it('F00C-1: missing bundleId → failure (not throw)', async () => {
    const svc = new BundleActivationOrchestratorService(
      makeDb(),
      makeQueue(),
      makeFlowOrchestrator(),
    );
    const result = await svc.activateBundle('', VALID_REPORT);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_BUNDLE_ID');
  });

  it('F00C-2: CF-824 — invalid validation report → failure before any provisioning', async () => {
    const flowOrchestrator = makeFlowOrchestrator();
    const svc = new BundleActivationOrchestratorService(
      makeDb([B001_BUNDLE], ALL_FLOWS),
      makeQueue(),
      flowOrchestrator,
    );
    const invalidReport = { ...VALID_REPORT, valid: false };
    const result = await svc.activateBundle('B-001', invalidReport);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_BUNDLE');
    // No flows should have been bootstrapped
    expect(flowOrchestrator.bootstrapFlow).not.toHaveBeenCalled();
  });

  it('F00C-3: bundle not found in solution-bundles → failure', async () => {
    const svc = new BundleActivationOrchestratorService(
      makeDb([], ALL_FLOWS),
      makeQueue(),
      makeFlowOrchestrator(),
    );
    const result = await svc.activateBundle('B-MISSING', VALID_REPORT);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BUNDLE_NOT_FOUND');
  });

  it('F00C-4: CF-826 — DRY_RUN called before FULL for each flow', async () => {
    const flowOrchestrator = makeFlowOrchestrator();
    const db = makeDb([B001_BUNDLE], ALL_FLOWS);
    const svc = new BundleActivationOrchestratorService(db, makeQueue(), flowOrchestrator);
    await svc.activateBundle('B-001', VALID_REPORT);

    const calls = flowOrchestrator.bootstrapFlow.mock.calls as [string, { mode: string }][];
    // For each flow: DRY_RUN should come before FULL
    const flowIds = ['FLOW-01', 'FLOW-02', 'FLOW-03'];
    for (const flowId of flowIds) {
      const dryRunIdx = calls.findIndex(([id, opts]) => id === flowId && opts.mode === 'DRY_RUN');
      const fullIdx = calls.findIndex(([id, opts]) => id === flowId && opts.mode === 'FULL');
      expect(dryRunIdx).toBeGreaterThan(-1);
      expect(fullIdx).toBeGreaterThan(dryRunIdx);
    }
  });

  it('F00C-5: DRY_RUN failure for a flow → returns DRY_RUN_FAILED, stops activation', async () => {
    const db = makeDb([B001_BUNDLE], ALL_FLOWS);
    const flowOrchestrator = makeFlowOrchestrator('FLOW-02');
    const svc = new BundleActivationOrchestratorService(db, makeQueue(), flowOrchestrator);
    const result = await svc.activateBundle('B-001', VALID_REPORT);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DRY_RUN_FAILED');
    // FLOW-03 should not have been attempted
    const calls = flowOrchestrator.bootstrapFlow.mock.calls as [string, { mode: string }][];
    const flow03Calls = calls.filter(([id]) => id === 'FLOW-03');
    expect(flow03Calls).toHaveLength(0);
  });

  it('F00C-6: FULL activation failure → returns ACTIVATION_FAILED', async () => {
    const db = makeDb([B001_BUNDLE], ALL_FLOWS);
    const flowOrchestrator = makeFlowOrchestrator(undefined, 'FLOW-01');
    const svc = new BundleActivationOrchestratorService(db, makeQueue(), flowOrchestrator);
    const result = await svc.activateBundle('B-001', VALID_REPORT);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ACTIVATION_FAILED');
  });

  it('F00C-7: FLOW-01 always first in activation order', async () => {
    // Report has flows out of numeric order — FLOW-01 should still come first
    const reportWithUnorderedFlows = {
      ...VALID_REPORT,
      requiredFlows: ['FLOW-03', 'FLOW-02', 'FLOW-01'],
    };
    const flowOrchestrator = makeFlowOrchestrator();
    const db = makeDb([B001_BUNDLE], ALL_FLOWS);
    const svc = new BundleActivationOrchestratorService(db, makeQueue(), flowOrchestrator);
    await svc.activateBundle('B-001', reportWithUnorderedFlows);

    const calls = flowOrchestrator.bootstrapFlow.mock.calls as [string, { mode: string }][];
    // First DRY_RUN call should be for FLOW-01
    expect(calls[0][0]).toBe('FLOW-01');
    expect(calls[0][1].mode).toBe('DRY_RUN');
  });

  it('F00C-8: orderByDependency — FLOW-01 first, then numeric', () => {
    const svc = new BundleActivationOrchestratorService(
      makeDb(),
      makeQueue(),
      makeFlowOrchestrator(),
    );
    const result = svc.orderByDependency(['FLOW-09', 'FLOW-01', 'FLOW-03', 'FLOW-02']);
    expect(result[0]).toBe('FLOW-01');
    expect(result).toEqual(['FLOW-01', 'FLOW-02', 'FLOW-03', 'FLOW-09']);
  });

  it('F00C-9: DNA-8 — storeDocument called before BundleActivated enqueue', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
        if (index === 'solution-bundles') return DataProcessResult.success([B001_BUNDLE]);
        if (index === 'flow-lifecycle')
          return DataProcessResult.success(ALL_FLOWS.filter((f) => f.flowId === filter.flowId));
        if (index === 'freedom-config') return DataProcessResult.success([]);
        return DataProcessResult.success([]);
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async (event: string) => {
        callOrder.push(`enqueue:${event}`);
        return DataProcessResult.success('id');
      }),
    } as any;

    const svc = new BundleActivationOrchestratorService(db, queue, makeFlowOrchestrator());
    await svc.activateBundle('B-001', VALID_REPORT);

    // The final 'bundle-activations' storeDocument should come before 'bundle-activation.bundle-activated'
    const storeIdx = callOrder.lastIndexOf('storeDocument');
    const activatedIdx = callOrder.indexOf('enqueue:bundle-activation.bundle-activated');
    expect(storeIdx).toBeGreaterThan(-1);
    expect(activatedIdx).toBeGreaterThan(storeIdx);
  });

  it('F00C-10: CF-828 — FREEDOM config pre-populated with defaultFreedomConfig keys', async () => {
    const db = makeDb([B001_BUNDLE], ALL_FLOWS, []); // no existing freedom config
    const queue = makeQueue();
    const svc = new BundleActivationOrchestratorService(db, queue, makeFlowOrchestrator());
    await svc.activateBundle('B-001', VALID_REPORT);

    const freedomStore = db._stored.find((s: { index: string }) => s.index === 'freedom-config');
    expect(freedomStore).toBeDefined();
    expect(freedomStore.doc.matching_algorithm).toBe('portfolio-based');
    expect(freedomStore.doc.max_matches).toBe(50);
  });

  it('F00C-11: CF-828 — existing FREEDOM config key NOT overwritten', async () => {
    // Existing config already has matching_algorithm set
    const existingFreedom = { matching_algorithm: 'existing-algo' };
    const db = makeDb([B001_BUNDLE], ALL_FLOWS, [existingFreedom]);
    const svc = new BundleActivationOrchestratorService(db, makeQueue(), makeFlowOrchestrator());
    await svc.activateBundle('B-001', VALID_REPORT);

    // matching_algorithm should NOT be stored (already exists)
    const freedomStore = db._stored.find(
      (s: { index: string; doc: Record<string, unknown> }) =>
        s.index === 'freedom-config' && 'matching_algorithm' in s.doc,
    );
    expect(freedomStore).toBeUndefined();
  });

  it('F00C-12: activation record returned with bundleId, activatedAt, flowVersionsAtActivation', async () => {
    const db = makeDb([B001_BUNDLE], ALL_FLOWS);
    const svc = new BundleActivationOrchestratorService(db, makeQueue(), makeFlowOrchestrator());
    const result = await svc.activateBundle('B-001', VALID_REPORT);

    expect(result.isSuccess).toBe(true);
    const record = result.data as ActivationRecord;
    expect(record.bundleId).toBe('B-001');
    expect(record.activatedAt).toBeDefined();
    expect(record.flowVersionsAtActivation).toBeDefined();
    expect(record.requiredFlowsActivated).toHaveLength(3);
  });

  it('F00C-13: flow-lifecycle storeDocument called once per flow (DNA-8)', async () => {
    const db = makeDb([B001_BUNDLE], ALL_FLOWS);
    const svc = new BundleActivationOrchestratorService(db, makeQueue(), makeFlowOrchestrator());
    await svc.activateBundle('B-001', VALID_REPORT);

    const lifecycleStores = db._stored.filter(
      (s: { index: string }) => s.index === 'flow-lifecycle',
    );
    expect(lifecycleStores).toHaveLength(3); // one per flow
  });

  it('F00C-14: per-flow progress events emitted after each flow activation', async () => {
    const db = makeDb([B001_BUNDLE], ALL_FLOWS);
    const queue = makeQueue();
    const svc = new BundleActivationOrchestratorService(db, queue, makeFlowOrchestrator());
    await svc.activateBundle('B-001', VALID_REPORT);

    const progressEvents = queue._events.filter(
      (e: { event: string }) => e.event === 'bundle-activation.flow-activation-progress',
    );
    expect(progressEvents).toHaveLength(3);
    expect(progressEvents[0].data.flowsActivated).toBe(1);
    expect(progressEvents[1].data.flowsActivated).toBe(2);
    expect(progressEvents[2].data.flowsActivated).toBe(3);
  });

  it('F00C-15: BundleActivated event data includes bundleId and requiredFlowsActivated', async () => {
    const db = makeDb([B001_BUNDLE], ALL_FLOWS);
    const queue = makeQueue();
    const svc = new BundleActivationOrchestratorService(db, queue, makeFlowOrchestrator());
    await svc.activateBundle('B-001', VALID_REPORT);

    const activatedEvent = queue._events.find(
      (e: { event: string }) => e.event === 'bundle-activation.bundle-activated',
    );
    expect(activatedEvent).toBeDefined();
    expect(activatedEvent!.data.bundleId).toBe('B-001');
    expect(activatedEvent!.data.requiredFlowsActivated as string[]).toHaveLength(3);
  });

  it('F00C-16: no requiredFlows in validation report → NO_REQUIRED_FLOWS failure', async () => {
    const reportNoFlows = { ...VALID_REPORT, requiredFlows: [] };
    const svc = new BundleActivationOrchestratorService(
      makeDb([B001_BUNDLE], ALL_FLOWS),
      makeQueue(),
      makeFlowOrchestrator(),
    );
    const result = await svc.activateBundle('B-001', reportNoFlows);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_REQUIRED_FLOWS');
  });

  it('F00C-17: bundle with empty defaultFreedomConfig → no freedom-config storeDocument', async () => {
    const bundleNoFreedom = { ...B001_BUNDLE, bundleId: 'B-NO-FREEDOM', defaultFreedomConfig: {} };
    const report = { ...VALID_REPORT, bundleId: 'B-NO-FREEDOM' };
    const db = makeDb([bundleNoFreedom], ALL_FLOWS, []);
    const svc = new BundleActivationOrchestratorService(db, makeQueue(), makeFlowOrchestrator());
    await svc.activateBundle('B-NO-FREEDOM', report);

    const freedomStore = db._stored.find((s: { index: string }) => s.index === 'freedom-config');
    expect(freedomStore).toBeUndefined();
  });

  it('F00C-18: activation record stored in bundle-activations index with bundleId as doc id', async () => {
    const db = makeDb([B001_BUNDLE], ALL_FLOWS);
    const svc = new BundleActivationOrchestratorService(db, makeQueue(), makeFlowOrchestrator());
    await svc.activateBundle('B-001', VALID_REPORT);

    const activationStore = db._stored.find(
      (s: { index: string; id: string }) => s.index === 'bundle-activations' && s.id === 'B-001',
    );
    expect(activationStore).toBeDefined();
    expect(activationStore.doc.bundleId).toBe('B-001');
  });
});
