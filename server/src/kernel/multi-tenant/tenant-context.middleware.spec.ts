/**
 * TenantContextMiddleware unit tests — P26 FIX-6.
 *
 * Verifies 403 enforcement and engine-path bypass.
 */

import 'reflect-metadata';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { DataProcessResult } from '../data-process-result';
import { TenantRecord } from './tenant-context';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeActiveRecord(id = 'acme'): TenantRecord {
  return {
    id,
    name: id,
    status: 'active',
    plan: {},
    createdAt: new Date().toISOString(),
  } as TenantRecord;
}

function makeRegistry(tenantRecord?: TenantRecord) {
  return {
    findById: jest
      .fn()
      .mockResolvedValue(
        tenantRecord
          ? DataProcessResult.success(tenantRecord)
          : DataProcessResult.failure('TENANT_NOT_FOUND', 'not found'),
      ),
    findByName: jest.fn(),
    list: jest.fn(),
    checkQuota: jest.fn(),
    provisionTenant: jest.fn(),
    getTenant: jest.fn(),
    validateTenantExists: jest.fn(),
    suspendTenant: jest.fn(),
    deleteTenant: jest.fn(),
  };
}

function makeCls() {
  const store: Record<string, unknown> = {};
  return {
    run: jest.fn((fn: () => unknown) => fn()),
    set: jest.fn((key: string, val: unknown) => {
      store[key] = val;
    }),
    get: jest.fn((key: string) => store[key]),
    _store: store,
  };
}

function makeReq(path: string, tenantId?: string): any {
  return {
    path,
    url: path,
    headers: tenantId ? { 'x-tenant-id': tenantId } : {},
  };
}

function makeRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('TenantContextMiddleware', () => {
  // ── BYPASS PATHS ──────────────────────────────────────────────────────────

  it('bypasses validation for /api/health', async () => {
    const registry = makeRegistry();
    const cls = makeCls();
    const mw = new TenantContextMiddleware(cls as any, registry as any);
    const next = jest.fn();
    const req = makeReq('/api/health');
    const res = makeRes();
    await mw.use(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('bypasses validation for /api/docs path', async () => {
    const registry = makeRegistry();
    const cls = makeCls();
    const mw = new TenantContextMiddleware(cls as any, registry as any);
    const next = jest.fn();
    await mw.use(makeReq('/api/docs'), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  // ── 403 ENFORCEMENT ───────────────────────────────────────────────────────

  it('returns 403 TENANT_MISSING when X-Tenant-Id header is absent', async () => {
    const registry = makeRegistry();
    const cls = makeCls();
    const mw = new TenantContextMiddleware(cls as any, registry as any);
    const res = makeRes();
    const next = jest.fn();
    await mw.use(makeReq('/api/cycle-chain/run'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error_code: 'TENANT_MISSING' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 TENANT_NOT_FOUND for unknown tenant', async () => {
    const registry = makeRegistry(); // no record → failure
    const cls = makeCls();
    const mw = new TenantContextMiddleware(cls as any, registry as any);
    const res = makeRes();
    const next = jest.fn();
    await mw.use(makeReq('/api/cycle-chain/run', 'ghost-tenant'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error_code: 'TENANT_NOT_FOUND' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 TENANT_INACTIVE for suspended tenant', async () => {
    const suspended = { ...makeActiveRecord('acme'), status: 'suspended' } as TenantRecord;
    const registry = makeRegistry(suspended);
    const cls = makeCls();
    const mw = new TenantContextMiddleware(cls as any, registry as any);
    const res = makeRes();
    const next = jest.fn();
    await mw.use(makeReq('/api/cycle-chain/run', 'acme'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error_code: 'TENANT_INACTIVE' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ── HAPPY PATH ────────────────────────────────────────────────────────────

  it('calls next() and sets TenantContext in CLS for active tenant', async () => {
    const tenant = makeActiveRecord('acme');
    const registry = makeRegistry(tenant);
    const cls = makeCls();
    const mw = new TenantContextMiddleware(cls as any, registry as any);
    const next = jest.fn();
    await mw.use(makeReq('/api/cycle-chain/run', 'acme'), makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(cls.set).toHaveBeenCalled();
  });

  it('DNA-3: does not throw on any path', async () => {
    const registry = makeRegistry();
    const cls = makeCls();
    const mw = new TenantContextMiddleware(cls as any, registry as any);
    let threw = false;
    try {
      await mw.use(makeReq('/api/cycle-chain/run'), makeRes(), jest.fn());
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});
