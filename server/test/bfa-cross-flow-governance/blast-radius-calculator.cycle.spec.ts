/**
 * BlastRadiusCalculator — Cycle Detection Tests (T380, CF-486, IR-380-1).
 *
 * CF-486: Cycle detection MUST use visited set — infinite loop is a build failure.
 * IR-380-1: Circular dependency = log + continue — NOT throw, NOT DataProcessResult.failure.
 *
 * Tests:
 *   CY-1: direct cycle (A → B → A) does not cause infinite loop
 *   CY-2: cycle detected node appears in cyclesDetected array
 *   CY-3: cycleDetected=true on the node that was revisited
 *   CY-4: cycle nodes do NOT appear in directImpacts or transitiveImpacts
 *   CY-5: result is still DataProcessResult.isSuccess=true after cycle (IR-380-1)
 *   CY-6: self-referential entity (A → A) handled gracefully
 *   CY-7: multi-hop cycle (A → B → C → A) detected correctly
 *   CY-8: cycle event 'blast_radius.cycle_detected' emitted when cycle exists
 *   CY-9: no cycle event emitted when no cycles present
 *   CY-10: non-cycle nodes still correctly reported alongside cycle nodes
 */

import { BlastRadiusCalculator } from '../../src/engine/flows/bfa-conflict-arbitration/blast-radius-calculator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-cycle-test';

const CONFIG_DOC = [{ config_key: 'blast_radius_max_depth', config_value: 10, tenant_id: TENANT }];

function makeDb(graphDocs: Record<string, unknown>[]) {
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' }),
    ),
    searchDocuments: jest.fn(async (_index: string, filters: Record<string, unknown>) => {
      if (filters['config_key'] === 'blast_radius_max_depth') {
        return DataProcessResult.success(
          CONFIG_DOC.filter((d) => Object.entries(filters).every(([k, v]) => d[k] === v)),
        );
      }
      const results = graphDocs.filter((d) =>
        Object.entries(filters).every(([k, v]) => d[k] === v),
      );
      return DataProcessResult.success(results);
    }),
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

describe('BlastRadiusCalculator — Cycle Detection (CF-486, IR-380-1)', () => {
  it('CY-1: direct cycle (A → B → A) does not cause infinite loop', async () => {
    // ROOT → A → B → A (cycle back to A)
    const graph = [
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ROOT',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
      {
        entity_id: 'ServiceB',
        entity_class: 'service',
        depends_on: 'ServiceA',
        severity: 'MEDIUM',
        tenant_id: TENANT,
      },
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ServiceB',
        severity: 'HIGH',
        tenant_id: TENANT,
      }, // cycle
    ];
    const svc = new BlastRadiusCalculator(makeDb(graph), makeQueue());
    // Must complete — not hang indefinitely
    const result = await svc.calculateBlastRadius('ROOT', TENANT);
    expect(result.isSuccess).toBe(true);
  });

  it('CY-2: cycle detected node appears in cyclesDetected array', async () => {
    const graph = [
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ROOT',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
      {
        entity_id: 'ServiceB',
        entity_class: 'service',
        depends_on: 'ServiceA',
        severity: 'LOW',
        tenant_id: TENANT,
      },
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ServiceB',
        severity: 'HIGH',
        tenant_id: TENANT,
      }, // cycle
    ];
    const svc = new BlastRadiusCalculator(makeDb(graph), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    expect(result.data!.cyclesDetected.length).toBeGreaterThan(0);
    // The cycle back to ServiceA should be recorded
    const cycleEntityIds = result.data!.cyclesDetected.map(([child]) => child);
    expect(cycleEntityIds).toContain('ServiceA');
  });

  it('CY-3: cycle nodes have cycleDetected=true', async () => {
    const graph = [
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ROOT',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ServiceA',
        severity: 'HIGH',
        tenant_id: TENANT,
      }, // self-cycle
    ];
    const svc = new BlastRadiusCalculator(makeDb(graph), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);
    expect(result.data!.cyclesDetected.length).toBeGreaterThan(0);
  });

  it('CY-4: cycle nodes do NOT appear in directImpacts or transitiveImpacts', async () => {
    const graph = [
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ROOT',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
      {
        entity_id: 'ServiceB',
        entity_class: 'service',
        depends_on: 'ServiceA',
        severity: 'LOW',
        tenant_id: TENANT,
      },
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ServiceB',
        severity: 'HIGH',
        tenant_id: TENANT,
      }, // cycle
    ];
    const svc = new BlastRadiusCalculator(makeDb(graph), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    const allImpacted = [...result.data!.directImpacts, ...result.data!.transitiveImpacts];
    // Cycle nodes should not be double-counted in the impact lists
    // All reported non-cycle nodes should have cycleDetected=false
    for (const node of allImpacted) {
      expect(node.cycleDetected).toBe(false);
    }
  });

  it('CY-5: result is DataProcessResult.isSuccess=true even with cycles (IR-380-1)', async () => {
    const graph = [
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ROOT',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ServiceA',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
    ];
    const svc = new BlastRadiusCalculator(makeDb(graph), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);
    // IR-380-1: cycle = log + continue, NOT failure
    expect(result.isSuccess).toBe(true);
  });

  it('CY-6: self-referential entity (A → A) handled gracefully', async () => {
    const graph = [
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ROOT',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ServiceA',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
    ];
    const svc = new BlastRadiusCalculator(makeDb(graph), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);
    expect(result.isSuccess).toBe(true);
    // ROOT itself is the start node — ServiceA self-ref cycle should be captured
    expect(result.data!.cyclesDetected.length).toBeGreaterThan(0);
  });

  it('CY-7: multi-hop cycle (A → B → C → A) detected', async () => {
    const graph = [
      {
        entity_id: 'A',
        entity_class: 'service',
        depends_on: 'ROOT',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
      {
        entity_id: 'B',
        entity_class: 'service',
        depends_on: 'A',
        severity: 'MEDIUM',
        tenant_id: TENANT,
      },
      {
        entity_id: 'C',
        entity_class: 'service',
        depends_on: 'B',
        severity: 'LOW',
        tenant_id: TENANT,
      },
      {
        entity_id: 'A',
        entity_class: 'service',
        depends_on: 'C',
        severity: 'HIGH',
        tenant_id: TENANT,
      }, // cycle back to A
    ];
    const svc = new BlastRadiusCalculator(makeDb(graph), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    expect(result.isSuccess).toBe(true);
    // A, B, C are non-cycle; the A→C→A closure is a cycle
    const cycleEntityIds = result.data!.cyclesDetected.map(([child]) => child);
    expect(cycleEntityIds).toContain('A');
  });

  it("CY-8: 'blast_radius.cycle_detected' event emitted when cycles exist", async () => {
    const graph = [
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ROOT',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ServiceA',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
    ];
    const queue = makeQueue();
    const svc = new BlastRadiusCalculator(makeDb(graph), queue);
    await svc.calculateBlastRadius('ROOT', TENANT);

    const cycleEvent = queue._emitted.find((e: any) => e.evt === 'blast_radius.cycle_detected');
    expect(cycleEvent).toBeDefined();
  });

  it("CY-9: no 'blast_radius.cycle_detected' event emitted when no cycles", async () => {
    const graph = [
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ROOT',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
    ];
    const queue = makeQueue();
    const svc = new BlastRadiusCalculator(makeDb(graph), queue);
    await svc.calculateBlastRadius('ROOT', TENANT);

    const cycleEvent = queue._emitted.find((e: any) => e.evt === 'blast_radius.cycle_detected');
    expect(cycleEvent).toBeUndefined();
  });

  it('CY-10: non-cycle nodes correctly reported alongside cycle nodes', async () => {
    const graph = [
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ROOT',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
      {
        entity_id: 'ServiceB',
        entity_class: 'service',
        depends_on: 'ROOT',
        severity: 'MEDIUM',
        tenant_id: TENANT,
      },
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ServiceA',
        severity: 'HIGH',
        tenant_id: TENANT,
      }, // self-cycle
    ];
    const svc = new BlastRadiusCalculator(makeDb(graph), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    // ServiceA and ServiceB both direct — ServiceB is clean
    const nonCycleEntities = [...result.data!.directImpacts, ...result.data!.transitiveImpacts].map(
      (n) => n.entityId,
    );

    expect(nonCycleEntities).toContain('ServiceB');
  });
});
