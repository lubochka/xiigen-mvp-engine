/**
 * TenantContextMiddleware — Unit Tests
 *
 * P26 FIX-6 behaviour:
 *   - Engine-internal paths → skip validation, call next()
 *   - Missing/empty X-Tenant-Id header → 403 TENANT_MISSING
 *   - Tenant not found → 403 TENANT_NOT_FOUND
 *   - Tenant suspended/inactive → 403 TENANT_INACTIVE
 *   - Tenant active → set TenantContext in CLS, call next()
 *
 * DNA coverage:
 *   DNA-5: tenantId enters the request chain here
 *   DNA-3: never throws — returns DataProcessResult equivalent via HTTP 403
 */

import { TenantContextMiddleware } from '../../../src/kernel/multi-tenant/tenant-context.middleware';
import { TenantRegistry } from '../../../src/kernel/multi-tenant/tenant-registry.service';
import {
  TenantContext,
  TENANT_CONTEXT_KEY,
  DEFAULT_PLAN,
  TenantRecord,
} from '../../../src/kernel/multi-tenant/tenant-context';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { TENANT_HEADER } from '../../../src/kernel/multi-tenant/tenant.guard';
import type { Request, Response, NextFunction } from 'express';

// ── Test helpers ──────────────────────────────────────

function makeTenantRecord(
  id: string,
  status: 'active' | 'inactive' | 'suspended' = 'active',
): TenantRecord {
  return {
    id,
    name: `Tenant-${id}`,
    status,
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeReq(tenantId?: string, path = '/api/some-resource'): Partial<Request> {
  return {
    headers: tenantId !== undefined ? { [TENANT_HEADER]: tenantId } : {},
    path,
    url: path,
  };
}

function makeRegistry(
  tenantId: string,
  result: 'found-active' | 'found-inactive' | 'found-suspended' | 'not-found',
): TenantRegistry {
  let returnValue: DataProcessResult<TenantRecord>;
  switch (result) {
    case 'found-active':
      returnValue = DataProcessResult.success(makeTenantRecord(tenantId, 'active'));
      break;
    case 'found-inactive':
      returnValue = DataProcessResult.success(makeTenantRecord(tenantId, 'inactive'));
      break;
    case 'found-suspended':
      returnValue = DataProcessResult.success(makeTenantRecord(tenantId, 'suspended'));
      break;
    case 'not-found':
      returnValue = DataProcessResult.failure('NOT_FOUND', 'Tenant not found');
      break;
  }
  return {
    findById: jest.fn().mockResolvedValue(returnValue),
  } as unknown as TenantRegistry;
}

function makeCls() {
  const store = new Map<string, unknown>();
  const clsObj = {
    set: jest.fn((key: string, value: unknown) => store.set(key, value)),
    get: jest.fn((key: string) => store.get(key)),
    // run() creates a CLS context and executes the callback; mock executes immediately
    run: jest.fn(<T>(callback: () => T): T => callback()),
    _store: store,
  };
  return clsObj;
}

function makeRes() {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  return {
    status: statusMock,
    json: jsonMock,
    _statusMock: statusMock,
    _jsonMock: jsonMock,
  };
}

// ══════════════════════════════════════════════════════
// TenantContextMiddleware
// ══════════════════════════════════════════════════════

describe('TenantContextMiddleware', () => {
  describe('header present — tenant found and active', () => {
    it('should set TenantContext in CLS when tenant exists and is active', async () => {
      const cls = makeCls();
      const registry = makeRegistry('t-abc', 'found-active');
      const mw = new TenantContextMiddleware(cls as any, registry);
      const next: NextFunction = jest.fn();
      const res = makeRes();

      await mw.use(makeReq('t-abc') as Request, res as unknown as Response, next);

      expect(registry.findById).toHaveBeenCalledWith('t-abc');
      expect(cls.set).toHaveBeenCalledWith(TENANT_CONTEXT_KEY, expect.any(TenantContext));
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should trim whitespace from header before lookup', async () => {
      const cls = makeCls();
      const registry = makeRegistry('t-trim', 'found-active');
      const mw = new TenantContextMiddleware(cls as any, registry);
      const next: NextFunction = jest.fn();
      const res = makeRes();

      await mw.use(makeReq('  t-trim  ') as Request, res as unknown as Response, next);

      expect(registry.findById).toHaveBeenCalledWith('t-trim');
      expect(next).toHaveBeenCalled();
    });

    it('should store context with the correct tenantId', async () => {
      const cls = makeCls();
      const registry = makeRegistry('t-xyz', 'found-active');
      const mw = new TenantContextMiddleware(cls as any, registry);
      const next: NextFunction = jest.fn();
      const res = makeRes();

      await mw.use(makeReq('t-xyz') as Request, res as unknown as Response, next);

      const stored = cls._store.get(TENANT_CONTEXT_KEY) as TenantContext;
      expect(stored).toBeInstanceOf(TenantContext);
      expect(stored.tenantId).toBe('t-xyz');
    });
  });

  describe('header present — tenant NOT found', () => {
    it('should return 403 TENANT_NOT_FOUND and NOT call next()', async () => {
      const cls = makeCls();
      const registry = makeRegistry('ghost', 'not-found');
      const mw = new TenantContextMiddleware(cls as any, registry);
      const next: NextFunction = jest.fn();
      const res = makeRes();

      await mw.use(makeReq('ghost') as Request, res as unknown as Response, next);

      expect(cls.set).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res._jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error_code: 'TENANT_NOT_FOUND' }),
      );
    });
  });

  describe('header present — tenant suspended or inactive', () => {
    it('should return 403 TENANT_INACTIVE for suspended tenant', async () => {
      const cls = makeCls();
      const registry = makeRegistry('suspended-co', 'found-suspended');
      const mw = new TenantContextMiddleware(cls as any, registry);
      const next: NextFunction = jest.fn();
      const res = makeRes();

      await mw.use(makeReq('suspended-co') as Request, res as unknown as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res._jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error_code: 'TENANT_INACTIVE' }),
      );
    });

    it('should return 403 TENANT_INACTIVE for inactive tenant', async () => {
      const cls = makeCls();
      const registry = makeRegistry('inactive-co', 'found-inactive');
      const mw = new TenantContextMiddleware(cls as any, registry);
      const next: NextFunction = jest.fn();
      const res = makeRes();

      await mw.use(makeReq('inactive-co') as Request, res as unknown as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res._jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error_code: 'TENANT_INACTIVE' }),
      );
    });
  });

  describe('header absent or empty', () => {
    it('should return 403 TENANT_MISSING when header is missing', async () => {
      const cls = makeCls();
      const registry = { findById: jest.fn() } as unknown as TenantRegistry;
      const mw = new TenantContextMiddleware(cls as any, registry);
      const next: NextFunction = jest.fn();
      const res = makeRes();

      await mw.use(makeReq() as Request, res as unknown as Response, next);

      expect(registry.findById).not.toHaveBeenCalled();
      expect(cls.set).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res._jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error_code: 'TENANT_MISSING' }),
      );
    });

    it('should return 403 TENANT_MISSING when header is whitespace-only', async () => {
      const cls = makeCls();
      const registry = { findById: jest.fn() } as unknown as TenantRegistry;
      const mw = new TenantContextMiddleware(cls as any, registry);
      const next: NextFunction = jest.fn();
      const res = makeRes();

      await mw.use(makeReq('   ') as Request, res as unknown as Response, next);

      expect(registry.findById).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('bypass paths — skip validation entirely', () => {
    const bypassPaths = [
      '/api/docs',
      '/api/health',
      '/api/ready',
      '/api/live',
      '/api/openapi.json',
    ];

    for (const path of bypassPaths) {
      it(`should skip validation and call next() for ${path}`, async () => {
        const cls = makeCls();
        const registry = { findById: jest.fn() } as unknown as TenantRegistry;
        const mw = new TenantContextMiddleware(cls as any, registry);
        const next: NextFunction = jest.fn();
        const res = makeRes();

        await mw.use(makeReq(undefined, path) as Request, res as unknown as Response, next);

        expect(registry.findById).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
      });
    }
  });

  describe('DNA-5 — tenant isolation', () => {
    it('should store different contexts for different tenant IDs', async () => {
      // Tenant A middleware
      const clsA = makeCls();
      const registryA = makeRegistry('ta', 'found-active');
      const mwA = new TenantContextMiddleware(clsA as any, registryA);
      await mwA.use(makeReq('ta') as Request, makeRes() as unknown as Response, jest.fn());

      // Tenant B middleware
      const clsB = makeCls();
      const registryB = makeRegistry('tb', 'found-active');
      const mwB = new TenantContextMiddleware(clsB as any, registryB);
      await mwB.use(makeReq('tb') as Request, makeRes() as unknown as Response, jest.fn());

      const ctxA = clsA._store.get(TENANT_CONTEXT_KEY) as TenantContext;
      const ctxB = clsB._store.get(TENANT_CONTEXT_KEY) as TenantContext;

      expect(ctxA.tenantId).toBe('ta');
      expect(ctxB.tenantId).toBe('tb');
      expect(ctxA.tenantId).not.toBe(ctxB.tenantId);
    });
  });
});
