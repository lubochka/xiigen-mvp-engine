/**
 * BlastRadiusCalculator — Unit Tests (T380).
 *
 * Tests:
 *   BR-1: empty graph (no dependants) returns empty report with NONE impacts
 *   BR-2: single direct dependant appears in directImpacts (hopDepth=1)
 *   BR-3: transitive dependants appear in transitiveImpacts (hopDepth>1)
 *   BR-4: report has all required fields
 *   BR-5: totalImpacted = directImpacts.length + transitiveImpacts.length
 *   BR-6: maxHopReached equals deepest node's hopDepth
 *   BR-7: missing changeEntityId returns failure
 *   BR-8: empty tenantId returns UNSCOPED_QUERY failure
 *   BR-9: storeDocument called once per calculateBlastRadius
 *   BR-10: enqueue called with 'blast_radius.calculated' event
 *   BR-11: storeDocument failure propagates as DataProcessResult.failure
 *   BR-12: enqueue NOT called when storeDocument fails (DNA-8)
 */

import { BlastRadiusCalculator } from '../../src/engine/flows/bfa-conflict-arbitration/blast-radius-calculator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { DependencySeverity } from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';

const TENANT = 'tenant-blast-test';

/** Flat graph: ROOT → A → B */
const GRAPH: Record<string, unknown>[] = [
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
];

/** Config doc: max_depth=5 */
const CONFIG_DOC: Record<string, unknown>[] = [
  { config_key: 'blast_radius_max_depth', config_value: 5, tenant_id: TENANT },
];

function makeDb(
  graphDocs: Record<string, unknown>[] = [],
  configDocs: Record<string, unknown>[] = CONFIG_DOC,
) {
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' }),
    ),
    searchDocuments: jest.fn(async (_index: string, filters: Record<string, unknown>) => {
      // Serve config
      if (filters['config_key'] === 'blast_radius_max_depth') {
        const results = configDocs.filter((d) =>
          Object.entries(filters).every(([k, v]) => d[k] === v),
        );
        return DataProcessResult.success(results);
      }
      // Serve graph edges
      const results = graphDocs.filter((d) =>
        Object.entries(filters).every(([k, v]) => d[k] === v),
      );
      return DataProcessResult.success(results);
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

describe('BlastRadiusCalculator — Unit (T380)', () => {
  it('BR-1: empty graph returns empty report with zero impacts', async () => {
    const svc = new BlastRadiusCalculator(makeDb([]), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.directImpacts).toHaveLength(0);
    expect(result.data!.transitiveImpacts).toHaveLength(0);
    expect(result.data!.totalImpacted).toBe(0);
  });

  it('BR-2: single direct dependant appears in directImpacts (hopDepth=1)', async () => {
    const db = makeDb([
      {
        entity_id: 'ServiceA',
        entity_class: 'service',
        depends_on: 'ROOT',
        severity: 'HIGH',
        tenant_id: TENANT,
      },
    ]);
    const svc = new BlastRadiusCalculator(db, makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    expect(result.data!.directImpacts).toHaveLength(1);
    expect(result.data!.directImpacts[0].entityId).toBe('ServiceA');
    expect(result.data!.directImpacts[0].hopDepth).toBe(1);
    expect(result.data!.transitiveImpacts).toHaveLength(0);
  });

  it('BR-3: transitive dependants appear in transitiveImpacts (hopDepth>1)', async () => {
    const svc = new BlastRadiusCalculator(makeDb(GRAPH), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);

    expect(result.data!.directImpacts).toHaveLength(1); // ServiceA at depth 1
    expect(result.data!.transitiveImpacts).toHaveLength(1); // ServiceB at depth 2
    expect(result.data!.transitiveImpacts[0].entityId).toBe('ServiceB');
    expect(result.data!.transitiveImpacts[0].hopDepth).toBe(2);
  });

  it('BR-4: report has all required fields', async () => {
    const svc = new BlastRadiusCalculator(makeDb(GRAPH), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);
    const report = result.data!;

    expect(report).toHaveProperty('reportId');
    expect(report).toHaveProperty('changeEntityId', 'ROOT');
    expect(report).toHaveProperty('tenantId', TENANT);
    expect(report).toHaveProperty('directImpacts');
    expect(report).toHaveProperty('transitiveImpacts');
    expect(report).toHaveProperty('totalImpacted');
    expect(report).toHaveProperty('maxHopReached');
    expect(report).toHaveProperty('depthLimitReached');
    expect(report).toHaveProperty('cyclesDetected');
    expect(report).toHaveProperty('createdAt');
  });

  it('BR-5: totalImpacted = directImpacts.length + transitiveImpacts.length', async () => {
    const svc = new BlastRadiusCalculator(makeDb(GRAPH), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);
    const report = result.data!;

    expect(report.totalImpacted).toBe(
      report.directImpacts.length + report.transitiveImpacts.length,
    );
  });

  it('BR-6: maxHopReached equals deepest node hopDepth', async () => {
    const svc = new BlastRadiusCalculator(makeDb(GRAPH), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);
    expect(result.data!.maxHopReached).toBe(2);
  });

  it('BR-7: missing changeEntityId returns failure', async () => {
    const svc = new BlastRadiusCalculator(makeDb([]), makeQueue());
    const result = await svc.calculateBlastRadius('', TENANT);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_ENTITY_ID');
  });

  it('BR-8: empty tenantId returns UNSCOPED_QUERY failure', async () => {
    const svc = new BlastRadiusCalculator(makeDb([]), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', '');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSCOPED_QUERY');
    expect(result.errorMessage).toContain('CF-476');
  });

  it('BR-9: storeDocument called exactly once per calculateBlastRadius', async () => {
    const db = makeDb(GRAPH);
    const svc = new BlastRadiusCalculator(db, makeQueue());
    await svc.calculateBlastRadius('ROOT', TENANT);
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
  });

  it("BR-10: enqueue called with 'blast_radius.calculated' event", async () => {
    const queue = makeQueue();
    const svc = new BlastRadiusCalculator(makeDb(GRAPH), queue);
    await svc.calculateBlastRadius('ROOT', TENANT);

    const blastEvent = queue._emitted.find((e: any) => e.evt === 'blast_radius.calculated');
    expect(blastEvent).toBeDefined();
    expect(blastEvent.data).toHaveProperty('report_id');
    expect(blastEvent.data).toHaveProperty('change_entity_id', 'ROOT');
  });

  it('BR-11: storeDocument failure propagates as DataProcessResult.failure', async () => {
    const svc = new BlastRadiusCalculator(makeFailingDb(), makeQueue());
    const result = await svc.calculateBlastRadius('ROOT', TENANT);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_ERROR');
  });

  it('BR-12: enqueue NOT called when storeDocument fails (DNA-8)', async () => {
    const queue = makeQueue();
    const svc = new BlastRadiusCalculator(makeFailingDb(), queue);
    await svc.calculateBlastRadius('ROOT', TENANT);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
