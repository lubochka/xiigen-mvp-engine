/**
 * DependencyIndexQuery — DNA-2 Filter Tests (T376, IR-376-1).
 *
 * IR-376-1: entity_class and access_type are skipped when empty (DNA-2 BuildSearchFilter).
 * Ensures filters are only forwarded when they have non-empty values.
 *
 * Tests:
 *   F-1: entityClass filter is forwarded when provided
 *   F-2: entityClass filter is SKIPPED when empty (IR-376-1 / DNA-2)
 *   F-3: accessType filter is forwarded when provided
 *   F-4: accessType filter is SKIPPED when empty (IR-376-1 / DNA-2)
 *   F-5: both entityClass and accessType forwarded when both provided
 *   F-6: neither entityClass nor accessType forwarded when both empty
 *   F-7: filters do not include undefined keys (clean filter object)
 *   F-8: maxDepth is optional — query works without it
 */

import { DependencyIndexQuery } from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-filter-test';

function makeCapturingDb() {
  const capturedFilters: Record<string, unknown>[] = [];
  const db = {
    searchDocuments: jest.fn(async (_index: string, filters: Record<string, unknown>) => {
      capturedFilters.push({ ...filters });
      return DataProcessResult.success([]);
    }),
    _capturedFilters: capturedFilters,
  } as any;
  return db;
}

describe('DependencyIndexQuery — DNA-2 Filter Behavior (IR-376-1)', () => {
  it('F-1: entityClass filter forwarded when provided', async () => {
    const db = makeCapturingDb();
    const svc = new DependencyIndexQuery(db);
    await svc.queryDependencies({ entityId: 'OrderSchema', entityClass: 'service' }, TENANT);

    expect(db._capturedFilters[0]).toHaveProperty('entity_class', 'service');
  });

  it('F-2: entityClass filter SKIPPED when empty (IR-376-1 / DNA-2)', async () => {
    const db = makeCapturingDb();
    const svc = new DependencyIndexQuery(db);
    await svc.queryDependencies({ entityId: 'OrderSchema', entityClass: '' }, TENANT);

    expect(db._capturedFilters[0]).not.toHaveProperty('entity_class');
  });

  it('F-3: accessType filter forwarded when provided', async () => {
    const db = makeCapturingDb();
    const svc = new DependencyIndexQuery(db);
    await svc.queryDependencies({ entityId: 'OrderSchema', accessType: 'write' }, TENANT);

    expect(db._capturedFilters[0]).toHaveProperty('access_type', 'write');
  });

  it('F-4: accessType filter SKIPPED when empty (IR-376-1 / DNA-2)', async () => {
    const db = makeCapturingDb();
    const svc = new DependencyIndexQuery(db);
    await svc.queryDependencies({ entityId: 'OrderSchema', accessType: '' }, TENANT);

    expect(db._capturedFilters[0]).not.toHaveProperty('access_type');
  });

  it('F-5: both entityClass and accessType forwarded when both provided', async () => {
    const db = makeCapturingDb();
    const svc = new DependencyIndexQuery(db);
    await svc.queryDependencies(
      { entityId: 'OrderSchema', entityClass: 'controller', accessType: 'read' },
      TENANT,
    );

    const filters = db._capturedFilters[0];
    expect(filters).toHaveProperty('entity_class', 'controller');
    expect(filters).toHaveProperty('access_type', 'read');
  });

  it('F-6: neither entityClass nor accessType forwarded when both empty', async () => {
    const db = makeCapturingDb();
    const svc = new DependencyIndexQuery(db);
    await svc.queryDependencies(
      { entityId: 'OrderSchema', entityClass: '', accessType: '' },
      TENANT,
    );

    const filters = db._capturedFilters[0];
    expect(filters).not.toHaveProperty('entity_class');
    expect(filters).not.toHaveProperty('access_type');
    // Required fields still present
    expect(filters).toHaveProperty('tenant_id', TENANT);
    expect(filters).toHaveProperty('depends_on', 'OrderSchema');
  });

  it('F-7: undefined optional fields do not pollute the filter object', async () => {
    const db = makeCapturingDb();
    const svc = new DependencyIndexQuery(db);
    // omit optional fields entirely
    await svc.queryDependencies({ entityId: 'OrderSchema' }, TENANT);

    const filters = db._capturedFilters[0];
    expect(Object.keys(filters)).not.toContain('entity_class');
    expect(Object.keys(filters)).not.toContain('access_type');
  });

  it('F-8: maxDepth is optional — query succeeds without it', async () => {
    const db = makeCapturingDb();
    const svc = new DependencyIndexQuery(db);
    const result = await svc.queryDependencies({ entityId: 'OrderSchema' }, TENANT);
    expect(result.isSuccess).toBe(true);
  });
});
