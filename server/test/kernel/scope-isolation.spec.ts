/**
 * Tests for DNA-5: ScopeIsolation — tenantId on EVERY operation.
 * Ported from Python: tests/unit/test_scope_isolation.py
 */

import {
  ScopeContext,
  validateScope,
  enforceScope,
  requireTenantId,
  DataProcessResult,
} from '../../src/kernel';

describe('validateScope', () => {
  it('should accept valid tenant_id', () => {
    const result = validateScope('T-001');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe('T-001');
  });

  it('should strip whitespace', () => {
    const result = validateScope('  T-001  ');
    expect(result.data).toBe('T-001');
  });

  it('should reject null', () => {
    const result = validateScope(null);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCOPE_MISSING');
  });

  it('should reject undefined', () => {
    const result = validateScope(undefined);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCOPE_MISSING');
  });

  it('should reject empty string', () => {
    const result = validateScope('');
    expect(result.isSuccess).toBe(false);
  });

  it('should reject whitespace-only string', () => {
    const result = validateScope('   ');
    expect(result.isSuccess).toBe(false);
  });
});

describe('enforceScope', () => {
  it('should stamp tenant_id onto document', () => {
    const doc = { name: 'test' };
    const result = enforceScope(doc, 'T-001');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['tenant_id']).toBe('T-001');
    expect(result.data!['name']).toBe('test');
  });

  it('should not mutate input document', () => {
    const doc: Record<string, unknown> = { name: 'test' };
    enforceScope(doc, 'T-001');
    expect(doc['tenant_id']).toBeUndefined();
  });

  it('should allow matching tenant_id', () => {
    const doc = { name: 'test', tenant_id: 'T-001' };
    const result = enforceScope(doc, 'T-001');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['tenant_id']).toBe('T-001');
  });

  it('should return failure on mismatched tenant_id (DNA-3 — no throw)', () => {
    const doc = { name: 'test', tenant_id: 'T-002' };
    const result = enforceScope(doc, 'T-001');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCOPE_VIOLATION');
    expect(result.errorMessage).toContain('Scope violation');
  });
});

describe('ScopeContext', () => {
  it('should create with minimal params', () => {
    const ctx = new ScopeContext({ tenantId: 'T-001' });
    expect(ctx.tenantId).toBe('T-001');
    expect(ctx.userId).toBeUndefined();
    expect(ctx.roles).toEqual([]);
  });

  it('should create with full params', () => {
    const ctx = new ScopeContext({
      tenantId: 'T-001',
      userId: 'U-1',
      roles: ['admin'],
      correlationId: 'COR-1',
    });
    expect(ctx.userId).toBe('U-1');
    expect(ctx.roles).toContain('admin');
    expect(ctx.correlationId).toBe('COR-1');
  });

  it('should serialize to dict', () => {
    const ctx = new ScopeContext({ tenantId: 'T-001', userId: 'U-1' });
    const d = ctx.toDict();
    expect(d['tenant_id']).toBe('T-001');
    expect(d['user_id']).toBe('U-1');
  });

  it('should omit optional fields from dict when not set', () => {
    const ctx = new ScopeContext({ tenantId: 'T-001' });
    const d = ctx.toDict();
    expect(d['user_id']).toBeUndefined();
    expect(d['correlation_id']).toBeUndefined();
    expect(d['roles']).toBeUndefined();
  });

  it('should be immutable (frozen)', () => {
    const ctx = new ScopeContext({ tenantId: 'T-001' });
    // Object.freeze prevents mutation — attempting to set throws in strict mode
    expect(() => {
      (ctx as any).tenantId = 'T-002';
    }).toThrow();
  });

  it('should have frozen roles array', () => {
    const ctx = new ScopeContext({ tenantId: 'T-001', roles: ['admin'] });
    expect(() => {
      (ctx.roles as string[]).push('superadmin');
    }).toThrow();
  });
});

describe('requireTenantId decorator', () => {
  it('should pass through with valid tenant_id (sync)', () => {
    const fn = requireTenantId((tenantId: string, data: Record<string, unknown>) => {
      return DataProcessResult.success(data);
    });
    const result = fn('T-001', { x: 1 }) as DataProcessResult;
    expect(result.isSuccess).toBe(true);
  });

  it('should return failure with empty tenant_id (sync)', () => {
    const fn = requireTenantId((tenantId: string, data: Record<string, unknown>) => {
      return DataProcessResult.success(data);
    });
    const result = fn('', { x: 1 }) as DataProcessResult;
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCOPE_MISSING');
  });

  it('should pass through with valid tenant_id (async)', async () => {
    const fn = requireTenantId(async (tenantId: string, data: Record<string, unknown>) => {
      return DataProcessResult.success(data);
    });
    const result = await fn('T-001', { x: 1 });
    expect(result.isSuccess).toBe(true);
  });

  it('should return failure with empty tenant_id (async)', async () => {
    const fn = requireTenantId(async (tenantId: string) => {
      return DataProcessResult.success(true);
    });
    // When tenant_id is empty, requireTenantId returns DataProcessResult synchronously
    const result = fn('') as DataProcessResult;
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCOPE_MISSING');
  });
});
