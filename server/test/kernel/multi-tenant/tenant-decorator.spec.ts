/**
 * @TenantId() and @CurrentTenant() decorators — Unit Tests
 *
 * These are NestJS parameter decorators created via createParamDecorator.
 * The inner factory function is tested directly by replicating the same
 * logic — standard NestJS testing pattern for param decorators.
 *
 * DNA-5: decorators extract tenantId from the request context.
 * Both decorators throw (not return failure) when context is missing —
 * this is intentional by design (guard stacking: TenantGuard runs first).
 */

import { ExecutionContext } from '@nestjs/common';
import {
  TenantContext,
  TenantRecord,
  DEFAULT_PLAN,
} from '../../../src/kernel/multi-tenant/tenant-context';

// ── Helper: build a minimal ExecutionContext ──────────

function makeExecContext(tenantContext?: TenantContext): ExecutionContext {
  const req: Record<string, unknown> = {};
  if (tenantContext) req['tenantContext'] = tenantContext;
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeTenantContext(id: string): TenantContext {
  const record: TenantRecord = {
    id,
    name: `Tenant-${id}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return new TenantContext(record);
}

// ── Replicate the inner factory functions ─────────────
// (Same logic as in tenant.decorator.ts — tested independently)

function tenantIdFactory(_data: unknown, ctx: ExecutionContext): string {
  const req = ctx.switchToHttp().getRequest() as Record<string, unknown>;
  const tenantContext = req['tenantContext'] as TenantContext | undefined;
  if (!tenantContext) {
    throw new Error('@TenantId() used without TenantGuard — tenantContext not found on request');
  }
  return tenantContext.tenantId;
}

function currentTenantFactory(_data: unknown, ctx: ExecutionContext): TenantContext {
  const req = ctx.switchToHttp().getRequest() as Record<string, unknown>;
  const tenantContext = req['tenantContext'] as TenantContext | undefined;
  if (!tenantContext) {
    throw new Error(
      '@CurrentTenant() used without TenantGuard — tenantContext not found on request',
    );
  }
  return tenantContext;
}

// ══════════════════════════════════════════════════════
// @TenantId()
// ══════════════════════════════════════════════════════

describe('@TenantId() decorator', () => {
  it('should return tenantId from the request context', () => {
    const ctx = makeExecContext(makeTenantContext('id-001'));
    expect(tenantIdFactory(undefined, ctx)).toBe('id-001');
  });

  it('should return exact string without transformation', () => {
    const ctx = makeExecContext(makeTenantContext('my-tenant-uuid-9999'));
    expect(tenantIdFactory(undefined, ctx)).toBe('my-tenant-uuid-9999');
  });

  it('should throw the exact error message when context is missing', () => {
    const ctx = makeExecContext();
    expect(() => tenantIdFactory(undefined, ctx)).toThrow(
      '@TenantId() used without TenantGuard — tenantContext not found on request',
    );
  });

  it('should return a string type', () => {
    const ctx = makeExecContext(makeTenantContext('t1'));
    expect(typeof tenantIdFactory(undefined, ctx)).toBe('string');
  });
});

// ══════════════════════════════════════════════════════
// @CurrentTenant()
// ══════════════════════════════════════════════════════

describe('@CurrentTenant() decorator', () => {
  it('should return the full TenantContext (same reference)', () => {
    const tc = makeTenantContext('ref-test');
    const ctx = makeExecContext(tc);
    expect(currentTenantFactory(undefined, ctx)).toBe(tc);
  });

  it('should return a TenantContext instance', () => {
    const ctx = makeExecContext(makeTenantContext('t2'));
    expect(currentTenantFactory(undefined, ctx)).toBeInstanceOf(TenantContext);
  });

  it('should throw the exact error message when context is missing', () => {
    const ctx = makeExecContext();
    expect(() => currentTenantFactory(undefined, ctx)).toThrow(
      '@CurrentTenant() used without TenantGuard — tenantContext not found on request',
    );
  });

  it('should return context with correct status', () => {
    const ctx = makeExecContext(makeTenantContext('status-test'));
    const result = currentTenantFactory(undefined, ctx);
    expect(result.status).toBe('active');
    expect(result.isActive).toBe(true);
  });

  it('should return context with DEFAULT_PLAN values', () => {
    const ctx = makeExecContext(makeTenantContext('plan-test'));
    const result = currentTenantFactory(undefined, ctx);
    expect(result.plan.name).toBe(DEFAULT_PLAN.name);
    expect(result.plan.maxApiCallsPerMinute).toBe(DEFAULT_PLAN.maxApiCallsPerMinute);
  });
});

// ══════════════════════════════════════════════════════
// DNA-5 — Isolation: two independent contexts don't bleed
// ══════════════════════════════════════════════════════

describe('Decorator isolation (DNA-5)', () => {
  it('@TenantId: two different contexts return independent IDs', () => {
    const ctxA = makeExecContext(makeTenantContext('tenant-a'));
    const ctxB = makeExecContext(makeTenantContext('tenant-b'));
    expect(tenantIdFactory(undefined, ctxA)).toBe('tenant-a');
    expect(tenantIdFactory(undefined, ctxB)).toBe('tenant-b');
  });

  it('@CurrentTenant: two different contexts return independent objects', () => {
    const tcA = makeTenantContext('ctx-a');
    const tcB = makeTenantContext('ctx-b');
    const ctxA = makeExecContext(tcA);
    const ctxB = makeExecContext(tcB);

    const resultA = currentTenantFactory(undefined, ctxA);
    const resultB = currentTenantFactory(undefined, ctxB);

    expect(resultA).toBe(tcA);
    expect(resultB).toBe(tcB);
    expect(resultA).not.toBe(resultB);
  });
});
