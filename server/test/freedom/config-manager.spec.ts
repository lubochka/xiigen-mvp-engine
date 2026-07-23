/**
 * P7.4 Tests — FreedomConfigManager
 *
 * Tests: setConfig (valid, missing tenant, invalid doc), getConfig (found,
 * not found, fallback to default), getValue, deleteConfig, listConfigs,
 * tenant isolation, audit trail, DNA-3/DNA-5 compliance.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { FreedomConfigManager } from '../../src/freedom/config-manager';
import { makeConfigDoc } from '../../src/freedom/config-schema';

describe('FreedomConfigManager', () => {
  let manager: FreedomConfigManager;

  beforeEach(() => {
    manager = new FreedomConfigManager();
  });

  // ── setConfig ──────────────────────────────────────

  describe('setConfig', () => {
    it('should store a valid config', () => {
      const doc = makeConfigDoc({ configKey: 'ai.model', taskType: 'T44', value: 'claude' });
      const result = manager.setConfig('tenant-A', doc);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.config_key).toBe('ai.model');
      expect(result.data!.tenant_id).toBe('tenant-A');
    });

    it('should reject missing tenantId (DNA-5)', () => {
      const doc = makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'v' });
      const result = manager.setConfig('', doc);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_TENANT');
    });

    it('should reject invalid config doc', () => {
      const result = manager.setConfig('tenant-A', { value: 'no key' });
      expect(result.isSuccess).toBe(false);
    });

    it('should update existing config (not duplicate)', () => {
      const doc1 = makeConfigDoc({ configKey: 'ai.model', taskType: 'T44', value: 'claude' });
      const doc2 = makeConfigDoc({ configKey: 'ai.model', taskType: 'T44', value: 'gpt' });
      manager.setConfig('tenant-A', doc1);
      manager.setConfig('tenant-A', doc2);
      expect(manager.totalConfigs).toBe(1);
      const result = manager.getConfig('tenant-A', 'ai.model');
      expect(result.data!.value).toBe('gpt');
    });

    it('should add timestamps', () => {
      const doc = makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'v' });
      const result = manager.setConfig('tenant-A', doc);
      expect(result.data!.created_at).toBeDefined();
      expect(result.data!.updated_at).toBeDefined();
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const doc = makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'v' });
      expect(manager.setConfig('tenant-A', doc)).toBeInstanceOf(DataProcessResult);
    });
  });

  // ── getConfig ──────────────────────────────────────

  describe('getConfig', () => {
    it('should return stored config', () => {
      const doc = makeConfigDoc({ configKey: 'ai.model', taskType: 'T44', value: 'claude' });
      manager.setConfig('tenant-A', doc);
      const result = manager.getConfig('tenant-A', 'ai.model');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.value).toBe('claude');
    });

    it('should return failure when not found and no default', () => {
      const result = manager.getConfig('tenant-A', 'nonexistent');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should fall back to default when not set for tenant', () => {
      manager.setDefault('ai.model', 'default-model');
      const result = manager.getConfig('tenant-A', 'ai.model');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.value).toBe('default-model');
      expect(result.data!.is_default).toBe(true);
    });

    it('should prefer tenant config over default', () => {
      manager.setDefault('ai.model', 'default-model');
      const doc = makeConfigDoc({ configKey: 'ai.model', taskType: 'T44', value: 'tenant-model' });
      manager.setConfig('tenant-A', doc);
      const result = manager.getConfig('tenant-A', 'ai.model');
      expect(result.data!.value).toBe('tenant-model');
      expect(result.data!.is_default).toBeUndefined();
    });

    it('should reject missing tenantId (DNA-5)', () => {
      const result = manager.getConfig('', 'ai.model');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_TENANT');
    });
  });

  // ── getValue ───────────────────────────────────────

  describe('getValue', () => {
    it('should return just the value', () => {
      const doc = makeConfigDoc({ configKey: 'threshold', taskType: 'T44', value: 42 });
      manager.setConfig('tenant-A', doc);
      expect(manager.getValue('tenant-A', 'threshold')).toBe(42);
    });

    it('should return fallback when not found', () => {
      expect(manager.getValue('tenant-A', 'missing', 'fallback')).toBe('fallback');
    });

    it('should return undefined when no fallback', () => {
      expect(manager.getValue('tenant-A', 'missing')).toBeUndefined();
    });
  });

  // ── deleteConfig ───────────────────────────────────

  describe('deleteConfig', () => {
    it('should delete existing config', () => {
      const doc = makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'v' });
      manager.setConfig('tenant-A', doc);
      const result = manager.deleteConfig('tenant-A', 'x');
      expect(result.isSuccess).toBe(true);
      expect(manager.totalConfigs).toBe(0);
    });

    it('should fail when config not found', () => {
      const result = manager.deleteConfig('tenant-A', 'nonexistent');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should revert to default after delete', () => {
      manager.setDefault('x', 'default-val');
      const doc = makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'tenant-val' });
      manager.setConfig('tenant-A', doc);
      manager.deleteConfig('tenant-A', 'x');
      const result = manager.getConfig('tenant-A', 'x');
      expect(result.data!.value).toBe('default-val');
      expect(result.data!.is_default).toBe(true);
    });
  });

  // ── listConfigs ────────────────────────────────────

  describe('listConfigs', () => {
    it('should list all configs for a tenant', () => {
      manager.setConfig('tenant-A', makeConfigDoc({ configKey: 'a', taskType: 'T1', value: '1' }));
      manager.setConfig('tenant-A', makeConfigDoc({ configKey: 'b', taskType: 'T2', value: '2' }));
      const result = manager.listConfigs('tenant-A');
      expect(result.isSuccess).toBe(true);
      expect(result.data!).toHaveLength(2);
    });

    it('should filter by task_type', () => {
      manager.setConfig('tenant-A', makeConfigDoc({ configKey: 'a', taskType: 'T44', value: '1' }));
      manager.setConfig('tenant-A', makeConfigDoc({ configKey: 'b', taskType: 'T45', value: '2' }));
      const result = manager.listConfigs('tenant-A', 'T44');
      expect(result.data!).toHaveLength(1);
      expect(result.data![0].config_key).toBe('a');
    });
  });

  // ── Tenant Isolation ───────────────────────────────

  describe('tenant isolation', () => {
    it('should isolate configs between tenants', () => {
      manager.setConfig(
        'tenant-A',
        makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'A-val' }),
      );
      manager.setConfig(
        'tenant-B',
        makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'B-val' }),
      );

      expect(manager.getValue('tenant-A', 'x')).toBe('A-val');
      expect(manager.getValue('tenant-B', 'x')).toBe('B-val');
    });

    it('should not leak configs across tenants', () => {
      manager.setConfig(
        'tenant-A',
        makeConfigDoc({ configKey: 'secret', taskType: 'T1', value: 'A-secret' }),
      );
      const result = manager.getConfig('tenant-B', 'secret');
      expect(result.isSuccess).toBe(false); // tenant-B cannot see tenant-A
    });

    it('should list only own tenant configs', () => {
      manager.setConfig('tenant-A', makeConfigDoc({ configKey: 'a', taskType: 'T1', value: '1' }));
      manager.setConfig('tenant-B', makeConfigDoc({ configKey: 'b', taskType: 'T1', value: '2' }));
      const result = manager.listConfigs('tenant-A');
      expect(result.data!).toHaveLength(1);
      expect(result.data![0].config_key).toBe('a');
    });
  });

  // ── Audit Trail ────────────────────────────────────

  describe('audit trail', () => {
    it('should record create action', () => {
      manager.setConfig('tenant-A', makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'v' }));
      const trail = manager.getAuditTrail('tenant-A');
      expect(trail).toHaveLength(1);
      expect(trail[0].action).toBe('create');
      expect(trail[0].config_key).toBe('x');
    });

    it('should record update action', () => {
      manager.setConfig('tenant-A', makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'v1' }));
      manager.setConfig('tenant-A', makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'v2' }));
      const trail = manager.getAuditTrail('tenant-A');
      expect(trail).toHaveLength(2);
      expect(trail[1].action).toBe('update');
      expect(trail[1].old_value).toBe('v1');
      expect(trail[1].new_value).toBe('v2');
    });

    it('should record delete action', () => {
      manager.setConfig('tenant-A', makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'v' }));
      manager.deleteConfig('tenant-A', 'x');
      const trail = manager.getAuditTrail('tenant-A');
      expect(trail).toHaveLength(2);
      expect(trail[1].action).toBe('delete');
    });

    it('should filter audit by config_key', () => {
      manager.setConfig('tenant-A', makeConfigDoc({ configKey: 'a', taskType: 'T1', value: '1' }));
      manager.setConfig('tenant-A', makeConfigDoc({ configKey: 'b', taskType: 'T1', value: '2' }));
      const trail = manager.getAuditTrail('tenant-A', 'a');
      expect(trail).toHaveLength(1);
    });

    it('should isolate audit between tenants', () => {
      manager.setConfig('tenant-A', makeConfigDoc({ configKey: 'x', taskType: 'T1', value: '1' }));
      manager.setConfig('tenant-B', makeConfigDoc({ configKey: 'x', taskType: 'T1', value: '2' }));
      expect(manager.getAuditTrail('tenant-A')).toHaveLength(1);
      expect(manager.getAuditTrail('tenant-B')).toHaveLength(1);
    });
  });
});
