/**
 * QuotaEnforcer unit tests — P26 FIX-5.
 *
 * guardQuota() returns DataProcessResult — never throws.
 * DNA-3 compliance.
 */

import 'reflect-metadata';
import { QuotaEnforcer } from './quota-enforcer';
import { DataProcessResult } from '../data-process-result';
import { ITenantRegistry } from './tenant-registry.interface';

function makeRegistry(override?: Partial<ITenantRegistry>): ITenantRegistry {
  return {
    findById: jest.fn(),
    findByName: jest.fn(),
    list: jest.fn(),
    checkQuota: jest.fn(),
    provisionTenant: jest.fn(),
    getTenant: jest.fn(),
    validateTenantExists: jest.fn(),
    suspendTenant: jest.fn(),
    deleteTenant: jest.fn(),
    ...override,
  } as ITenantRegistry;
}

describe('QuotaEnforcer.guardQuota', () => {
  // ── POSITIVE ──────────────────────────��──────────────────────────────────��

  it('returns success when quota check passes (ok: true)', async () => {
    const registry = makeRegistry({
      checkQuota: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ ok: true, remaining: 50, resource: 'api_calls' }),
        ),
    });
    const enforcer = new QuotaEnforcer(registry);
    const result = await enforcer.guardQuota('acme', 'api_calls', 10);
    expect(result.isSuccess).toBe(true);
  });

  it('calls registry.checkQuota with correct arguments', async () => {
    const checkQuota = jest
      .fn()
      .mockResolvedValue(
        DataProcessResult.success({ ok: true, remaining: 100, resource: 'tokens' }),
      );
    const registry = makeRegistry({ checkQuota });
    const enforcer = new QuotaEnforcer(registry);
    await enforcer.guardQuota('acme', 'tokens', 25);
    expect(checkQuota).toHaveBeenCalledWith('acme', 'tokens', 25);
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('returns QUOTA_EXCEEDED failure when ok is false', async () => {
    const registry = makeRegistry({
      checkQuota: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ ok: false, remaining: 0, resource: 'api_calls' }),
        ),
    });
    const enforcer = new QuotaEnforcer(registry);
    const result = await enforcer.guardQuota('acme', 'api_calls', 100);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('QUOTA_EXCEEDED');
  });

  it('propagates registry failure as-is', async () => {
    const registry = makeRegistry({
      checkQuota: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('TENANT_NOT_FOUND', 'Tenant acme not found')),
    });
    const enforcer = new QuotaEnforcer(registry);
    const result = await enforcer.guardQuota('acme', 'api_calls', 1);
    expect(result.isSuccess).toBe(false);
  });

  it('QUOTA_EXCEEDED error message contains resource name and remaining count', async () => {
    const registry = makeRegistry({
      checkQuota: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ ok: false, remaining: 0, resource: 'tokens' }),
        ),
    });
    const enforcer = new QuotaEnforcer(registry);
    const result = await enforcer.guardQuota('acme', 'tokens', 999);
    expect(result.errorMessage).toContain('tokens');
    expect(result.errorMessage).toContain('0');
  });

  it('DNA-3: never throws even when registry throws', async () => {
    const registry = makeRegistry({
      checkQuota: jest.fn().mockRejectedValue(new Error('network error')),
    });
    const enforcer = new QuotaEnforcer(registry);
    let threw = false;
    try {
      await enforcer.guardQuota('acme', 'api_calls', 1);
    } catch {
      threw = true;
    }
    // DNA-3: service should not throw; if registry throws we expect
    // either a graceful failure result or the throw to propagate
    // (depending on implementation). This test documents current behavior.
    expect(threw).toBe(false);
  });
});
