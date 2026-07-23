/**
 * Tests for TenantContext — immutable tenant context object.
 */

import { TenantContext, TenantRecord, DEFAULT_PLAN, TENANT_CONTEXT_KEY } from '../../../src/kernel';

function makeTenantRecord(overrides?: Partial<TenantRecord>): TenantRecord {
  return {
    id: 'tenant-abc',
    name: 'Acme Corp',
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: { 'ai.defaultModel': 'claude-sonnet' },
    apiKeys: { anthropic: 'sk-ant-xxx', openai: 'sk-oai-yyy' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('TenantContext', () => {
  describe('construction', () => {
    it('should create from TenantRecord', () => {
      const ctx = new TenantContext(makeTenantRecord());
      expect(ctx.tenantId).toBe('tenant-abc');
      expect(ctx.tenantName).toBe('Acme Corp');
      expect(ctx.status).toBe('active');
      expect(ctx.plan.name).toBe('free');
    });

    it('should copy plan values', () => {
      const record = makeTenantRecord({
        plan: { ...DEFAULT_PLAN, name: 'pro', maxTokensPerDay: 1_000_000 },
      });
      const ctx = new TenantContext(record);
      expect(ctx.plan.name).toBe('pro');
      expect(ctx.plan.maxTokensPerDay).toBe(1_000_000);
    });
  });

  describe('isActive', () => {
    it('should return true for active tenant', () => {
      const ctx = new TenantContext(makeTenantRecord({ status: 'active' }));
      expect(ctx.isActive).toBe(true);
    });

    it('should return false for inactive tenant', () => {
      const ctx = new TenantContext(makeTenantRecord({ status: 'inactive' }));
      expect(ctx.isActive).toBe(false);
    });

    it('should return false for suspended tenant', () => {
      const ctx = new TenantContext(makeTenantRecord({ status: 'suspended' }));
      expect(ctx.isActive).toBe(false);
    });
  });

  describe('getConfigOverride', () => {
    it('should return override when present', () => {
      const ctx = new TenantContext(makeTenantRecord());
      expect(ctx.getConfigOverride('ai.defaultModel')).toBe('claude-sonnet');
    });

    it('should return undefined when not present', () => {
      const ctx = new TenantContext(makeTenantRecord());
      expect(ctx.getConfigOverride('nonexistent.key')).toBeUndefined();
    });
  });

  describe('getApiKey', () => {
    it('should return key for known provider', () => {
      const ctx = new TenantContext(makeTenantRecord());
      expect(ctx.getApiKey('anthropic')).toBe('sk-ant-xxx');
      expect(ctx.getApiKey('openai')).toBe('sk-oai-yyy');
    });

    it('should return undefined for unknown provider', () => {
      const ctx = new TenantContext(makeTenantRecord());
      expect(ctx.getApiKey('deepseek')).toBeUndefined();
    });
  });

  describe('toSafeDict', () => {
    it('should serialize without exposing API keys', () => {
      const ctx = new TenantContext(makeTenantRecord());
      const safe = ctx.toSafeDict();
      expect(safe['tenant_id']).toBe('tenant-abc');
      expect(safe['tenant_name']).toBe('Acme Corp');
      expect(safe['status']).toBe('active');
      expect(safe['plan']).toBe('free');
      expect(safe['api_key_providers']).toEqual(['anthropic', 'openai']);
      // Must NOT contain actual key values
      expect(JSON.stringify(safe)).not.toContain('sk-ant');
      expect(JSON.stringify(safe)).not.toContain('sk-oai');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const ctx = new TenantContext(makeTenantRecord());
      expect(() => {
        (ctx as any).tenantId = 'hacked';
      }).toThrow();
    });

    it('should have frozen plan', () => {
      const ctx = new TenantContext(makeTenantRecord());
      expect(() => {
        (ctx.plan as any).name = 'hacked';
      }).toThrow();
    });

    it('should have frozen configOverrides', () => {
      const ctx = new TenantContext(makeTenantRecord());
      expect(() => {
        (ctx.configOverrides as any)['new.key'] = 'val';
      }).toThrow();
    });

    it('should have frozen apiKeys', () => {
      const ctx = new TenantContext(makeTenantRecord());
      expect(() => {
        (ctx.apiKeys as any)['new'] = 'val';
      }).toThrow();
    });

    it('should not be affected by mutations to the source record', () => {
      const record = makeTenantRecord();
      const ctx = new TenantContext(record);
      // Mutate the source — context should be unaffected
      (record as any).name = 'Mutated';
      // TenantRecord is a plain interface, but TenantContext copies values
      expect(ctx.tenantName).toBe('Acme Corp');
    });
  });

  describe('TENANT_CONTEXT_KEY', () => {
    it('should be the string "tenant"', () => {
      expect(TENANT_CONTEXT_KEY).toBe('tenant');
    });
  });

  describe('DEFAULT_PLAN', () => {
    it('should have expected defaults', () => {
      expect(DEFAULT_PLAN.name).toBe('free');
      expect(DEFAULT_PLAN.maxApiCallsPerMinute).toBe(60);
      expect(DEFAULT_PLAN.maxTokensPerDay).toBe(100_000);
      expect(DEFAULT_PLAN.maxStorageMb).toBe(500);
    });

    it('should be frozen', () => {
      expect(() => {
        (DEFAULT_PLAN as any).name = 'hacked';
      }).toThrow();
    });
  });
});
