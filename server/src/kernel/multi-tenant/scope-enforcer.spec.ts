/**
 * ScopeEnforcer — P26 FIX-3 Tests
 *
 * enforceScope() returns DataProcessResult — never throws.
 * DNA-3 compliance at kernel level.
 */

import { ScopeEnforcer } from './scope-enforcer';

describe('ScopeEnforcer.enforceScope', () => {
  it('returns success when tenants match', () => {
    const result = ScopeEnforcer.enforceScope('acme', 'acme', 'doc-123');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('returns failure(SCOPE_VIOLATION) when tenants differ', () => {
    const result = ScopeEnforcer.enforceScope('acme', 'beta', 'doc-123');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCOPE_VIOLATION');
    expect(result.errorMessage).toContain('acme');
    expect(result.errorMessage).toContain('doc-123');
    expect(result.errorMessage).toContain('beta');
  });

  it('never throws — catch block remains empty', () => {
    let threw = false;
    try {
      ScopeEnforcer.enforceScope('acme', 'other', 'res-1');
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  it('empty string tenants produce violation when they differ', () => {
    const result = ScopeEnforcer.enforceScope('', 'beta', 'res-99');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCOPE_VIOLATION');
  });

  it('same tenant with different resourceId still succeeds', () => {
    const r1 = ScopeEnforcer.enforceScope('acme', 'acme', 'res-A');
    const r2 = ScopeEnforcer.enforceScope('acme', 'acme', 'res-B');
    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
  });
});
