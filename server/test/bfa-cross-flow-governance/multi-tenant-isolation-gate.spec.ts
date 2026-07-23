/**
 * MultiTenantIsolationGate — Unit Tests (T386).
 *
 * Tests:
 *   MTG-1:  missing tenantId in validateTenantAccess → UNSCOPED_QUERY
 *   MTG-2:  missing flowId in validateTenantAccess → MISSING_FLOW_ID
 *   MTG-3:  tenant not in bfa-freedom-config → TENANT_NOT_CONFIGURED (IR-386-1)
 *   MTG-4:  tenant found in config → success with configured=true
 *   MTG-5:  configVersion defaults to '1.0' when not in config doc
 *   MTG-6:  configVersion is read from config doc when present
 *   MTG-7:  assertScopedQuery with missing tenantId → UNSCOPED_QUERY
 *   MTG-8:  assertScopedQuery with tenantId present → success
 *   MTG-9:  DB failure in config lookup → propagates error code
 */

import { MultiTenantIsolationGate } from '../../src/engine/flows/bfa-conflict-arbitration/multi-tenant-isolation-gate.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-mtg-test';

function makeConfiguredDb(configVersion?: string) {
  return {
    searchDocuments: jest.fn(async () => {
      const doc: Record<string, unknown> = {
        tenant_id: TENANT,
        config_key: 'flow25_bfa_enabled',
        config_version: configVersion,
      };
      return DataProcessResult.success([doc]);
    }),
    storeDocument: jest.fn(),
  } as any;
}

function makeUnconfiguredDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    storeDocument: jest.fn(),
  } as any;
}

function makeFailingDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.failure('DB_ERROR', 'Search failed')),
    storeDocument: jest.fn(),
  } as any;
}

describe('MultiTenantIsolationGate — Unit (T386)', () => {
  it('MTG-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new MultiTenantIsolationGate(makeUnconfiguredDb());
    const r = await svc.validateTenantAccess('');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('MTG-2: missing flowId → MISSING_FLOW_ID', async () => {
    const svc = new MultiTenantIsolationGate(makeConfiguredDb());
    const r = await svc.validateTenantAccess(TENANT, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_FLOW_ID');
  });

  it('MTG-3: tenant not configured → TENANT_NOT_CONFIGURED (IR-386-1)', async () => {
    const svc = new MultiTenantIsolationGate(makeUnconfiguredDb());
    const r = await svc.validateTenantAccess(TENANT);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('TENANT_NOT_CONFIGURED');
    expect(r.errorMessage).toContain('IR-386-1');
  });

  it('MTG-4: tenant found in config → success with configured=true', async () => {
    const svc = new MultiTenantIsolationGate(makeConfiguredDb('2.0'));
    const r = await svc.validateTenantAccess(TENANT);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.configured).toBe(true);
    expect(r.data!.tenantId).toBe(TENANT);
    expect(r.data!.flowId).toBe('FLOW-25');
  });

  it('MTG-5: configVersion defaults to 1.0 when absent', async () => {
    const svc = new MultiTenantIsolationGate(makeConfiguredDb(undefined));
    const r = await svc.validateTenantAccess(TENANT);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.configVersion).toBe('1.0');
  });

  it('MTG-6: configVersion is read from config doc', async () => {
    const svc = new MultiTenantIsolationGate(makeConfiguredDb('3.5'));
    const r = await svc.validateTenantAccess(TENANT);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.configVersion).toBe('3.5');
  });

  it('MTG-7: assertScopedQuery with missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new MultiTenantIsolationGate(makeUnconfiguredDb());
    const r = await svc.assertScopedQuery('', 'fetchDependencies');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
    expect(r.errorMessage).toContain('CF-476');
  });

  it('MTG-8: assertScopedQuery with tenantId → success', async () => {
    const svc = new MultiTenantIsolationGate(makeUnconfiguredDb());
    const r = await svc.assertScopedQuery(TENANT, 'fetchDependencies');
    expect(r.isSuccess).toBe(true);
  });

  it('MTG-9: DB failure in config lookup → propagates error code', async () => {
    const svc = new MultiTenantIsolationGate(makeFailingDb());
    const r = await svc.validateTenantAccess(TENANT);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('TENANT_NOT_CONFIGURED');
  });
});
