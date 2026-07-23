/**
 * CrossTenantConflictGuard — Unit Tests (T387).
 *
 * Tests:
 *   CTG-1:  missing tenantId → UNSCOPED_QUERY
 *   CTG-2:  missing changeId → MISSING_CHANGE_ID
 *   CTG-3:  empty affectedResources → success with zero counts
 *   CTG-4:  no cross-tenant overlap → success with zero counts
 *   CTG-5:  cross-tenant overlap found → CROSS_TENANT_OVERLAP (IR-387-1)
 *   CTG-6:  overlap count reflects aggregated values only — no raw tenant docs exposed (CF-501)
 *   CTG-7:  own-tenant protected resources do NOT trigger CROSS_TENANT_OVERLAP
 *   CTG-8:  DB failure → propagates error
 *   CTG-9:  registerProtectedResources with empty list → registered=0
 *   CTG-10: registerProtectedResources missing tenantId → UNSCOPED_QUERY
 *   CTG-11: registerProtectedResources stores one doc per resource
 */

import { CrossTenantConflictGuard } from '../../src/engine/flows/bfa-conflict-arbitration/cross-tenant-conflict-guard.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT_A = 'tenant-ctg-a';
const TENANT_B = 'tenant-ctg-b';
const CHANGE = 'chg-ctg-1';

function makeDb(foreignDocs: Record<string, unknown>[] = []) {
  const stored: Record<string, unknown>[] = [];
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success(foreignDocs)),
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      stored.push({ ...doc, _id: id ?? 'doc-1' });
      return DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' });
    }),
    _stored: stored,
  } as any;
}

function makeFailingDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.failure('DB_ERROR', 'Search failed')),
    storeDocument: jest.fn(async () => DataProcessResult.success({})),
  } as any;
}

describe('CrossTenantConflictGuard — Unit (T387)', () => {
  it('CTG-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new CrossTenantConflictGuard(makeDb());
    const r = await svc.checkForCrossTenantOverlap('', CHANGE, ['res-1']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('CTG-2: missing changeId → MISSING_CHANGE_ID', async () => {
    const svc = new CrossTenantConflictGuard(makeDb());
    const r = await svc.checkForCrossTenantOverlap(TENANT_A, '', ['res-1']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_CHANGE_ID');
  });

  it('CTG-3: empty affectedResources → success with zero counts', async () => {
    const svc = new CrossTenantConflictGuard(makeDb());
    const r = await svc.checkForCrossTenantOverlap(TENANT_A, CHANGE, []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.overlappingTenantCount).toBe(0);
    expect(r.data!.overlappingResourceCount).toBe(0);
  });

  it('CTG-4: no cross-tenant overlap → success with zero counts', async () => {
    const svc = new CrossTenantConflictGuard(makeDb([]));
    const r = await svc.checkForCrossTenantOverlap(TENANT_A, CHANGE, ['res-1', 'res-2']);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.overlappingTenantCount).toBe(0);
    expect(r.data!.overlappingResourceCount).toBe(0);
  });

  it('CTG-5: cross-tenant overlap found → CROSS_TENANT_OVERLAP (IR-387-1)', async () => {
    const foreignDocs = [{ tenant_id: TENANT_B, resource_id: 'res-1' }];
    const svc = new CrossTenantConflictGuard(makeDb(foreignDocs));
    const r = await svc.checkForCrossTenantOverlap(TENANT_A, CHANGE, ['res-1']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('CROSS_TENANT_OVERLAP');
    expect(r.errorMessage).toContain('IR-387-1');
  });

  it('CTG-6: overlap counts are aggregated — raw tenant names not exposed in result (CF-501)', async () => {
    const foreignDocs = [
      { tenant_id: TENANT_B, resource_id: 'res-1' },
      { tenant_id: TENANT_B, resource_id: 'res-2' },
    ];
    const svc = new CrossTenantConflictGuard(makeDb(foreignDocs));
    const r = await svc.checkForCrossTenantOverlap(TENANT_A, CHANGE, ['res-1', 'res-2']);
    // Result is a failure — check the error, NOT any data that would expose raw docs
    expect(r.isSuccess).toBe(false);
    expect(r.data).toBeUndefined();
  });

  it('CTG-7: own-tenant registrations do NOT trigger CROSS_TENANT_OVERLAP', async () => {
    const ownDocs = [{ tenant_id: TENANT_A, resource_id: 'res-1' }];
    const svc = new CrossTenantConflictGuard(makeDb(ownDocs));
    const r = await svc.checkForCrossTenantOverlap(TENANT_A, CHANGE, ['res-1']);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.overlappingTenantCount).toBe(0);
  });

  it('CTG-8: DB failure → propagates error', async () => {
    const svc = new CrossTenantConflictGuard(makeFailingDb());
    const r = await svc.checkForCrossTenantOverlap(TENANT_A, CHANGE, ['res-1']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });

  it('CTG-9: registerProtectedResources with empty list → registered=0', async () => {
    const svc = new CrossTenantConflictGuard(makeDb());
    const r = await svc.registerProtectedResources(TENANT_A, []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.registered).toBe(0);
  });

  it('CTG-10: registerProtectedResources missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new CrossTenantConflictGuard(makeDb());
    const r = await svc.registerProtectedResources('', ['res-1']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('CTG-11: registerProtectedResources stores one doc per resource', async () => {
    const db = makeDb();
    const svc = new CrossTenantConflictGuard(db);
    const r = await svc.registerProtectedResources(TENANT_A, ['res-1', 'res-2', 'res-3']);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.registered).toBe(3);
    expect(db.storeDocument).toHaveBeenCalledTimes(3);
  });
});
