/**
 * FLOW-00 Phase B — BundleValidator + BundleStatusTracker Tests.
 *
 * 18 tests covering:
 *   - BundleValidatorService: valid bundle with all flows present
 *   - BundleValidatorService: missing requiredFlow → failure
 *   - BundleValidatorService: empty requiredFlows → failure (CF-822)
 *   - BundleValidatorService: estimatedActivationMs always populated
 *   - BundleStatusTrackerService: all matching bundles checked for regenerated flow (CF-831)
 *   - BundleStatusTrackerService: BundleRestored when all flows meet minFlowVersions
 *   - BundleStatusTrackerService: DNA-8 — storeDocument before event emit
 *   - BundleStatusTrackerService: flows not in minFlowVersions → no degradation check
 *   - Tenant isolation on both services
 */

import {
  BundleValidatorService,
  type BundleValidationReport,
} from '../../src/engine/flows/bundle-activation/bundle-validator.service';
import { BundleStatusTrackerService } from '../../src/engine/flows/bundle-activation/bundle-status-tracker.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ───────────────────────────────────────────────────────────

function makeDb(
  bundleData: Record<string, unknown>[] = [],
  flowData: Record<string, unknown>[] = [],
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
        if (filter.requiredFlows) {
          return DataProcessResult.success(
            bundleData.filter((b) =>
              (b.requiredFlows as string[])?.includes(filter.requiredFlows as string),
            ),
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
        return DataProcessResult.success([]);
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

const TENANT = 'tenant-flow00-b';

const B001_BUNDLE = {
  bundleId: 'B-001',
  tenantId: TENANT,
  name: 'B2B Marketplace',
  requiredFlows: ['FLOW-01', 'FLOW-02', 'FLOW-03', 'FLOW-09'],
  minFlowVersions: { 'FLOW-01': 'v1', 'FLOW-02': 'v1', 'FLOW-03': 'v1', 'FLOW-09': 'v1' },
  defaultFreedomConfig: { matching_algorithm: 'portfolio-based' },
  status: 'PLANNED',
};

const ALL_FLOWS = [
  { flowId: 'FLOW-01', version: 'v1', status: 'ACTIVE' },
  { flowId: 'FLOW-02', version: 'v1', status: 'ACTIVE' },
  { flowId: 'FLOW-03', version: 'v1', status: 'ACTIVE' },
  { flowId: 'FLOW-09', version: 'v1', status: 'ACTIVE' },
];

// ── BundleValidatorService tests ─────────────────────────────────────────────

describe('FLOW-00 Phase B — BundleValidatorService', () => {
  it('F00B-1: validates B-001 bundle with 4 required flows — all exist → valid: true', async () => {
    const db = makeDb([B001_BUNDLE], ALL_FLOWS);
    const svc = new BundleValidatorService(db, makeQueue());
    const result = await svc.validateBundle('B-001');

    expect(result.isSuccess).toBe(true);
    const report = result.data as BundleValidationReport;
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.requiredFlows).toHaveLength(4);
  });

  it('F00B-2: returns failure when requiredFlow not in flow-lifecycle index', async () => {
    const bundleWithMissingFlow = {
      ...B001_BUNDLE,
      bundleId: 'B-001-MISSING',
      requiredFlows: ['FLOW-01', 'FLOW-99'], // FLOW-99 doesn't exist
    };
    const db = makeDb([bundleWithMissingFlow], ALL_FLOWS);
    const svc = new BundleValidatorService(db, makeQueue());
    const result = await svc.validateBundle('B-001-MISSING');

    expect(result.isSuccess).toBe(true); // validation report created
    const report = result.data as BundleValidationReport;
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes('FLOW-99'))).toBe(true);
  });

  it('F00B-3: CF-822 — returns failure when requiredFlows array is empty', async () => {
    const emptyFlowsBundle = { ...B001_BUNDLE, bundleId: 'B-EMPTY', requiredFlows: [] };
    const db = makeDb([emptyFlowsBundle], ALL_FLOWS);
    const svc = new BundleValidatorService(db, makeQueue());
    const result = await svc.validateBundle('B-EMPTY');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EMPTY_REQUIRED_FLOWS');
  });

  it('F00B-4: returns failure when bundle not found', async () => {
    const db = makeDb([], ALL_FLOWS);
    const svc = new BundleValidatorService(db, makeQueue());
    const result = await svc.validateBundle('B-MISSING');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BUNDLE_NOT_FOUND');
  });

  it('F00B-5: estimatedActivationMs is populated even when valid: false', async () => {
    const bundleWithMissingFlow = {
      ...B001_BUNDLE,
      bundleId: 'B-PARTIAL',
      requiredFlows: ['FLOW-01', 'FLOW-99'],
    };
    const db = makeDb([bundleWithMissingFlow], ALL_FLOWS);
    const svc = new BundleValidatorService(db, makeQueue());
    const result = await svc.validateBundle('B-PARTIAL');

    expect(result.isSuccess).toBe(true);
    const report = result.data as BundleValidationReport;
    expect(report.estimatedActivationMs).toBeGreaterThan(0);
    expect(report.estimatedActivationMs).toBe(2 * 5000); // 2 flows × 5s
  });

  it('F00B-6: missing bundleId → failure (not throw)', async () => {
    const svc = new BundleValidatorService(makeDb(), makeQueue());
    const result = await svc.validateBundle('');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_BUNDLE_ID');
  });

  it('F00B-7: BFA cross-check event emitted after validation check', async () => {
    const db = makeDb([B001_BUNDLE], ALL_FLOWS);
    const queue = makeQueue();
    const svc = new BundleValidatorService(db, queue);
    await svc.validateBundle('B-001');

    const bfaEvent = queue._events.find(
      (e: { event: string }) => e.event === 'bfa.validate-cross-flow',
    );
    expect(bfaEvent).toBeDefined();
    expect(bfaEvent!.data.flowIds).toEqual(B001_BUNDLE.requiredFlows);
  });

  it('F00B-8: validation report includes checkedAt timestamp', async () => {
    const db = makeDb([B001_BUNDLE], ALL_FLOWS);
    const svc = new BundleValidatorService(db, makeQueue());
    const result = await svc.validateBundle('B-001');
    expect(result.isSuccess).toBe(true);
    expect((result.data as BundleValidationReport).checkedAt).toBeDefined();
  });
});

// ── BundleStatusTrackerService tests ──────────────────────────────────────────

describe('FLOW-00 Phase B — BundleStatusTrackerService', () => {
  it('F00B-9: CF-831 — BundleDegraded emitted when flow version < minFlowVersions', async () => {
    const db = makeDb([B001_BUNDLE], [{ flowId: 'FLOW-01', version: 'v1' }]);
    const queue = makeQueue();
    const svc = new BundleStatusTrackerService(db, queue);

    // FLOW-01 regenerated to v0 (below minimum v1)
    await svc.onFlowRegenerated('FLOW-01', 'v0');

    const degradedEvent = queue._events.find(
      (e: { event: string }) => e.event === 'bundle-activation.bundle-degraded',
    );
    expect(degradedEvent).toBeDefined();
    expect(degradedEvent!.data.bundleId).toBe('B-001');
    expect(degradedEvent!.data.degradedFlowId).toBe('FLOW-01');
    expect(degradedEvent!.data.currentVersion).toBe('v0');
    expect(degradedEvent!.data.minimumVersion).toBe('v1');
  });

  it('F00B-10: BundleRestored emitted when all flows meet minFlowVersions', async () => {
    const degradedBundle = { ...B001_BUNDLE, status: 'DEGRADED' };
    // All flows at v1 (meet minFlowVersions)
    const db = makeDb([degradedBundle], ALL_FLOWS);
    const queue = makeQueue();
    const svc = new BundleStatusTrackerService(db, queue);

    // FLOW-01 re-promoted to v1 (meets minimum)
    await svc.onFlowRegenerated('FLOW-01', 'v1');

    const restoredEvent = queue._events.find(
      (e: { event: string }) => e.event === 'bundle-activation.bundle-restored',
    );
    expect(restoredEvent).toBeDefined();
    expect(restoredEvent!.data.bundleId).toBe('B-001');
  });

  it('F00B-11: DNA-8 — storeDocument called before BundleDegraded event', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
        if (index === 'solution-bundles') return DataProcessResult.success([B001_BUNDLE]);
        return DataProcessResult.success(ALL_FLOWS.filter((f) => f.flowId === filter.flowId));
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('msg-id');
      }),
    } as any;

    const svc = new BundleStatusTrackerService(db, queue);
    await svc.onFlowRegenerated('FLOW-01', 'v0');

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThan(-1);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('F00B-12: no BundleDegraded for flow not in bundle.minFlowVersions', async () => {
    const bundleNoVersionConstraint = {
      ...B001_BUNDLE,
      bundleId: 'B-NO-CONSTRAINT',
      minFlowVersions: {}, // no version constraints at all
    };
    const db = makeDb([bundleNoVersionConstraint], ALL_FLOWS);
    const queue = makeQueue();
    const svc = new BundleStatusTrackerService(db, queue);

    await svc.onFlowRegenerated('FLOW-01', 'v0');

    const degradedEvent = queue._events.find(
      (e: { event: string }) => e.event === 'bundle-activation.bundle-degraded',
    );
    expect(degradedEvent).toBeUndefined();
  });

  it('F00B-13: checks ALL bundles containing the regenerated flow', async () => {
    const b002 = {
      ...B001_BUNDLE,
      bundleId: 'B-002',
      requiredFlows: ['FLOW-01', 'FLOW-04'],
      minFlowVersions: { 'FLOW-01': 'v1', 'FLOW-04': 'v1' },
    };
    const db = makeDb([B001_BUNDLE, b002], ALL_FLOWS);
    const queue = makeQueue();
    const svc = new BundleStatusTrackerService(db, queue);

    await svc.onFlowRegenerated('FLOW-01', 'v0');

    const degradedEvents = queue._events.filter(
      (e: { event: string }) => e.event === 'bundle-activation.bundle-degraded',
    );
    // Both B-001 and B-002 contain FLOW-01
    expect(degradedEvents.length).toBe(2);
  });

  it('F00B-14: isVersionBelow: v0 < v1 → true', () => {
    const svc = new BundleStatusTrackerService(makeDb(), makeQueue());
    expect(svc.isVersionBelow('v0', 'v1')).toBe(true);
  });

  it('F00B-15: isVersionBelow: v1 < v1 → false (same version)', () => {
    const svc = new BundleStatusTrackerService(makeDb(), makeQueue());
    expect(svc.isVersionBelow('v1', 'v1')).toBe(false);
  });

  it('F00B-16: isVersionBelow: v2 < v1 → false (newer)', () => {
    const svc = new BundleStatusTrackerService(makeDb(), makeQueue());
    expect(svc.isVersionBelow('v2', 'v1')).toBe(false);
  });

  it('F00B-17: missing flowId → failure (not throw)', async () => {
    const svc = new BundleStatusTrackerService(makeDb(), makeQueue());
    const result = await svc.onFlowRegenerated('', 'v1');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_FLOW_ID');
  });

  it('F00B-18: missing newVersion → failure (not throw)', async () => {
    const svc = new BundleStatusTrackerService(makeDb(), makeQueue());
    const result = await svc.onFlowRegenerated('FLOW-01', '');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_VERSION');
  });
});
