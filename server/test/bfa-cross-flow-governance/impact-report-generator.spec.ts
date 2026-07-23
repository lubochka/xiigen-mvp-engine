/**
 * ImpactReportGenerator — Unit + CF-489 Tests (T382).
 *
 * Tests:
 *   R-1: returns isSuccess=true for valid inputs
 *   R-2: report always has exactly 4 decision options (CF-491)
 *   R-3: FORCE_PROCEED available=false when actor lacks bfa:override (CF-489)
 *   R-4: FORCE_PROCEED available=true when actor has bfa:override (CF-489)
 *   R-5: FORCE_PROCEED requiresPermission=true in all cases
 *   R-6: APPROVE, REJECT, DEFER are always available regardless of permissions
 *   R-7: CRITICAL severity + no blast radius impacts returns failure (IR-382-1)
 *   R-8: LOW severity + no blast radius impacts is OK (IR-382-1 only for HIGH/CRITICAL)
 *   R-9: storeDocument called before enqueue (DNA-8)
 *   R-10: enqueue NOT called when storeDocument fails
 *   R-11: report emits 'impact_report.generated' event
 *   R-12: renders web, cli, and chat channels
 *   R-13: precedentSuggestions empty when < 3 precedents found (CF-490)
 *   R-14: missing sessionId returns failure
 *   R-15: missing tenantId returns UNSCOPED_QUERY failure
 */

import {
  ImpactReportGenerator,
  DecisionOption,
} from '../../src/engine/flows/bfa-conflict-arbitration/impact-report-generator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { DependencySeverity } from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';
import { ConflictReport } from '../../src/engine/flows/bfa-conflict-arbitration/severity-aggregator.service';
import { BlastRadiusReport } from '../../src/engine/flows/bfa-conflict-arbitration/blast-radius-calculator.service';

const TENANT = 'tenant-report-test';

function makeConflictReport(
  severity: DependencySeverity = DependencySeverity.HIGH,
): ConflictReport {
  return {
    reportId: 'cr-001',
    changeType: 'SCHEMA_CHANGE',
    entityId: 'OrderSchema',
    entries: [],
    finalMaxSeverity: severity,
    staticOverrideApplied: false,
    createdAt: new Date().toISOString(),
    status: 'pending_arbitration',
  };
}

function makeBlastRadiusReport(directCount = 1, transitiveCount = 1): BlastRadiusReport {
  return {
    reportId: 'br-001',
    changeEntityId: 'OrderSchema',
    tenantId: TENANT,
    directImpacts: Array.from({ length: directCount }, (_, i) => ({
      entityId: `DirectService${i}`,
      entityClass: 'service',
      hopDepth: 1,
      reachableVia: 'OrderSchema',
      severity: DependencySeverity.HIGH,
      cycleDetected: false,
    })),
    transitiveImpacts: Array.from({ length: transitiveCount }, (_, i) => ({
      entityId: `TransService${i}`,
      entityClass: 'service',
      hopDepth: 2,
      reachableVia: `DirectService${i}`,
      severity: DependencySeverity.MEDIUM,
      cycleDetected: false,
    })),
    totalImpacted: directCount + transitiveCount,
    maxHopReached: transitiveCount > 0 ? 2 : 1,
    depthLimitReached: false,
    cyclesDetected: [],
    createdAt: new Date().toISOString(),
  };
}

function makeEmptyBlastRadiusReport(): BlastRadiusReport {
  return {
    reportId: 'br-empty',
    changeEntityId: 'OrderSchema',
    tenantId: TENANT,
    directImpacts: [],
    transitiveImpacts: [],
    totalImpacted: 0,
    maxHopReached: 0,
    depthLimitReached: false,
    cyclesDetected: [],
    createdAt: new Date().toISOString(),
  };
}

function makeDb(precedentDocs: Record<string, unknown>[] = []) {
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' }),
    ),
    searchDocuments: jest.fn(async (_i: string, filters: Record<string, unknown>) => {
      // Return precedent docs for precedent queries
      if (filters['change_type'] !== undefined) {
        return DataProcessResult.success(
          precedentDocs.filter((d) => Object.entries(filters).every(([k, v]) => d[k] === v)),
        );
      }
      return DataProcessResult.success([]);
    }),
  } as any;
}

function makeFailingDb() {
  return {
    storeDocument: jest.fn(async () => DataProcessResult.failure('DB_ERROR', 'Write failed')),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
  } as any;
}

function makeQueue() {
  const emitted: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
      emitted.push({ evt, data });
      return DataProcessResult.success('msg-1');
    }),
    _emitted: emitted,
  } as any;
}

const NO_OVERRIDE_PERMS = ['bfa:read'];
const WITH_OVERRIDE_PERMS = ['bfa:read', 'bfa:override'];

describe('ImpactReportGenerator — Unit + CF-489 (T382)', () => {
  it('R-1: returns isSuccess=true for valid inputs', async () => {
    const svc = new ImpactReportGenerator(makeDb(), makeQueue());
    const result = await svc.generateReport(
      'sess-001',
      TENANT,
      makeConflictReport(),
      makeBlastRadiusReport(),
      NO_OVERRIDE_PERMS,
      'web',
    );
    expect(result.isSuccess).toBe(true);
  });

  it('R-2: report always has exactly 4 decision options (CF-491)', async () => {
    const svc = new ImpactReportGenerator(makeDb(), makeQueue());
    const result = await svc.generateReport(
      'sess-002',
      TENANT,
      makeConflictReport(),
      makeBlastRadiusReport(),
      NO_OVERRIDE_PERMS,
      'web',
    );
    expect(result.data!.decisionOptions).toHaveLength(4);
    const options = result.data!.decisionOptions.map((o) => o.option);
    expect(options).toContain(DecisionOption.APPROVE);
    expect(options).toContain(DecisionOption.REJECT);
    expect(options).toContain(DecisionOption.DEFER);
    expect(options).toContain(DecisionOption.FORCE_PROCEED);
  });

  it('R-3: FORCE_PROCEED available=false when actor lacks bfa:override (CF-489)', async () => {
    const svc = new ImpactReportGenerator(makeDb(), makeQueue());
    const result = await svc.generateReport(
      'sess-003',
      TENANT,
      makeConflictReport(),
      makeBlastRadiusReport(),
      NO_OVERRIDE_PERMS,
      'web',
    );
    const fp = result.data!.decisionOptions.find((o) => o.option === DecisionOption.FORCE_PROCEED)!;
    expect(fp.available).toBe(false);
    expect(result.data!.forceProceedAvailable).toBe(false);
  });

  it('R-4: FORCE_PROCEED available=true when actor has bfa:override (CF-489)', async () => {
    const svc = new ImpactReportGenerator(makeDb(), makeQueue());
    const result = await svc.generateReport(
      'sess-004',
      TENANT,
      makeConflictReport(),
      makeBlastRadiusReport(),
      WITH_OVERRIDE_PERMS,
      'web',
    );
    const fp = result.data!.decisionOptions.find((o) => o.option === DecisionOption.FORCE_PROCEED)!;
    expect(fp.available).toBe(true);
    expect(result.data!.forceProceedAvailable).toBe(true);
  });

  it('R-5: FORCE_PROCEED requiresPermission=true in all cases', async () => {
    for (const perms of [NO_OVERRIDE_PERMS, WITH_OVERRIDE_PERMS]) {
      const svc = new ImpactReportGenerator(makeDb(), makeQueue());
      const result = await svc.generateReport(
        'sess-005',
        TENANT,
        makeConflictReport(),
        makeBlastRadiusReport(),
        perms,
        'web',
      );
      const fp = result.data!.decisionOptions.find(
        (o) => o.option === DecisionOption.FORCE_PROCEED,
      )!;
      expect(fp.requiresPermission).toBe(true);
    }
  });

  it('R-6: APPROVE, REJECT, DEFER always available regardless of permissions', async () => {
    const svc = new ImpactReportGenerator(makeDb(), makeQueue());
    const result = await svc.generateReport(
      'sess-006',
      TENANT,
      makeConflictReport(),
      makeBlastRadiusReport(),
      NO_OVERRIDE_PERMS,
      'web',
    );
    const nonFp = result.data!.decisionOptions.filter(
      (o) => o.option !== DecisionOption.FORCE_PROCEED,
    );
    for (const opt of nonFp) {
      expect(opt.available).toBe(true);
    }
  });

  it('R-7: CRITICAL severity + empty blast radius → failure (IR-382-1)', async () => {
    const svc = new ImpactReportGenerator(makeDb(), makeQueue());
    const result = await svc.generateReport(
      'sess-007',
      TENANT,
      makeConflictReport(DependencySeverity.CRITICAL),
      makeEmptyBlastRadiusReport(),
      NO_OVERRIDE_PERMS,
      'web',
    );
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('IR382_MISSING_IMPACTED_FLOWS');
    expect(result.errorMessage).toContain('IR-382-1');
  });

  it('R-8: LOW severity + empty blast radius is OK (IR-382-1 only for HIGH/CRITICAL)', async () => {
    const svc = new ImpactReportGenerator(makeDb(), makeQueue());
    const result = await svc.generateReport(
      'sess-008',
      TENANT,
      makeConflictReport(DependencySeverity.LOW),
      makeEmptyBlastRadiusReport(),
      NO_OVERRIDE_PERMS,
      'cli',
    );
    expect(result.isSuccess).toBe(true);
  });

  it('R-9: storeDocument called BEFORE enqueue (DNA-8)', async () => {
    const callOrder: string[] = [];
    const db: any = {
      storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
        callOrder.push('store');
        return DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' });
      }),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    };
    const queue: any = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('msg');
      }),
    };

    const svc = new ImpactReportGenerator(db, queue);
    await svc.generateReport(
      'sess-009',
      TENANT,
      makeConflictReport(),
      makeBlastRadiusReport(),
      NO_OVERRIDE_PERMS,
      'web',
    );

    expect(callOrder.indexOf('store')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('R-10: enqueue NOT called when storeDocument fails', async () => {
    const queue = makeQueue();
    const svc = new ImpactReportGenerator(makeFailingDb(), queue);
    await svc.generateReport(
      'sess-010',
      TENANT,
      makeConflictReport(),
      makeBlastRadiusReport(),
      NO_OVERRIDE_PERMS,
      'web',
    );
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it("R-11: report emits 'impact_report.generated' event", async () => {
    const queue = makeQueue();
    const svc = new ImpactReportGenerator(makeDb(), queue);
    await svc.generateReport(
      'sess-011',
      TENANT,
      makeConflictReport(),
      makeBlastRadiusReport(),
      NO_OVERRIDE_PERMS,
      'web',
    );

    const evt = queue._emitted.find((e: any) => e.evt === 'impact_report.generated');
    expect(evt).toBeDefined();
    expect(evt.data).toHaveProperty('session_id', 'sess-011');
  });

  it('R-12: renders web, cli, and chat channels without error', async () => {
    for (const channel of ['web', 'cli', 'chat'] as const) {
      const svc = new ImpactReportGenerator(makeDb(), makeQueue());
      const result = await svc.generateReport(
        'sess-012',
        TENANT,
        makeConflictReport(),
        makeBlastRadiusReport(),
        NO_OVERRIDE_PERMS,
        channel,
      );
      expect(result.isSuccess).toBe(true);
      expect(result.data!.channel).toBe(channel);
      expect(result.data!.renderedContent.length).toBeGreaterThan(0);
    }
  });

  it('R-13: precedentSuggestions empty when < 3 precedents found (CF-490)', async () => {
    // Only 2 precedent docs — below threshold
    const precedents = [
      { tenant_id: TENANT, change_type: 'SCHEMA_CHANGE', summary: 'Precedent A' },
      { tenant_id: TENANT, change_type: 'SCHEMA_CHANGE', summary: 'Precedent B' },
    ];
    const svc = new ImpactReportGenerator(makeDb(precedents), makeQueue());
    const result = await svc.generateReport(
      'sess-013',
      TENANT,
      makeConflictReport(),
      makeBlastRadiusReport(),
      NO_OVERRIDE_PERMS,
      'web',
    );
    expect(result.data!.precedentSuggestions).toHaveLength(0);
  });

  it('R-14: missing sessionId returns failure', async () => {
    const svc = new ImpactReportGenerator(makeDb(), makeQueue());
    const result = await svc.generateReport(
      '',
      TENANT,
      makeConflictReport(),
      makeBlastRadiusReport(),
      NO_OVERRIDE_PERMS,
      'web',
    );
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_SESSION_ID');
  });

  it('R-15: missing tenantId returns UNSCOPED_QUERY failure', async () => {
    const svc = new ImpactReportGenerator(makeDb(), makeQueue());
    const result = await svc.generateReport(
      'sess-015',
      '',
      makeConflictReport(),
      makeBlastRadiusReport(),
      NO_OVERRIDE_PERMS,
      'web',
    );
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSCOPED_QUERY');
  });
});
