/**
 * Tests for InMemory Secrets Provider.
 * Verifies CRUD, versioning, Iron Rule (no values in list), tenant isolation.
 */

import { InMemorySecretsProvider } from '../../src/fabrics/secrets/in-memory.provider';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

function mockCls(tenantId: string) {
  const tenant = new TenantContext({
    id: tenantId,
    name: `T-${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return {
    get: jest
      .fn()
      .mockImplementation((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)),
  } as any;
}

function mockClsEmpty() {
  return { get: jest.fn().mockReturnValue(undefined) } as any;
}

describe('InMemorySecretsProvider', () => {
  describe('setSecret', () => {
    it('should store a secret and return path + version', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      const result = await svc.setSecret('xiigen/ai/anthropic_key', 'sk-secret-123');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['path']).toBe('xiigen/ai/anthropic_key');
      expect(result.data!['version']).toBeDefined();
      expect(result.data!['provider']).toBe('in_memory');
    });

    it('should update existing secret with new version', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      const v1 = await svc.setSecret('key', 'value-1');
      const v2 = await svc.setSecret('key', 'value-2');
      expect(v1.data!['version']).not.toBe(v2.data!['version']);

      const fetched = await svc.getSecret('key');
      expect(fetched.data!['value']).toBe('value-2');
    });

    it('should reject empty path', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      const result = await svc.setSecret('', 'value');
      expect(result.errorCode).toBe('INVALID_PATH');
    });

    it('should reject null value', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      const result = await svc.setSecret('key', null as any);
      expect(result.errorCode).toBe('INVALID_VALUE');
    });

    it('should store metadata', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      await svc.setSecret('key', 'val', { source: 'admin', env: 'prod' });
      // Metadata is stored but only reported in list as has_metadata boolean
    });

    it('should fail without tenant context', async () => {
      const svc = new InMemorySecretsProvider(mockClsEmpty());
      const result = await svc.setSecret('key', 'val');
      expect(result.errorCode).toBe('NO_TENANT');
    });
  });

  describe('getSecret', () => {
    it('should retrieve a stored secret', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      await svc.setSecret('db/password', 'p@ssw0rd');
      const result = await svc.getSecret('db/password');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['value']).toBe('p@ssw0rd');
      expect(result.data!['provider']).toBe('in_memory');
    });

    it('should return NOT_FOUND for missing secret', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      const result = await svc.getSecret('nonexistent');
      expect(result.errorCode).toBe('SECRET_NOT_FOUND');
    });

    it('should check version when requested', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      const set = await svc.setSecret('key', 'val');
      const version = set.data!['version'] as string;

      const ok = await svc.getSecret('key', version);
      expect(ok.isSuccess).toBe(true);

      const mismatch = await svc.getSecret('key', 'wrong-version');
      expect(mismatch.errorCode).toBe('VERSION_MISMATCH');
    });

    it('should reject empty path', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      const result = await svc.getSecret('');
      expect(result.errorCode).toBe('INVALID_PATH');
    });
  });

  describe('deleteSecret', () => {
    it('should delete an existing secret', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      await svc.setSecret('temp/key', 'val');
      const result = await svc.deleteSecret('temp/key');
      expect(result.isSuccess).toBe(true);

      const after = await svc.getSecret('temp/key');
      expect(after.errorCode).toBe('SECRET_NOT_FOUND');
    });

    it('should return NOT_FOUND for missing secret', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      const result = await svc.deleteSecret('nonexistent');
      expect(result.errorCode).toBe('SECRET_NOT_FOUND');
    });
  });

  describe('listSecrets (Iron Rule: no values)', () => {
    it('should list secret metadata', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      await svc.setSecret('ai/anthropic', 'sk-ant');
      await svc.setSecret('ai/openai', 'sk-oai');
      await svc.setSecret('db/postgres', 'pgpass');

      const result = await svc.listSecrets();
      expect(result.isSuccess).toBe(true);
      expect(result.data!.length).toBe(3);
    });

    it('should NEVER include secret values in list results', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      await svc.setSecret('sensitive/key', 'SUPER_SECRET_VALUE');

      const result = await svc.listSecrets();
      const json = JSON.stringify(result.data);
      expect(json).not.toContain('SUPER_SECRET_VALUE');
      expect(result.data![0]['value']).toBeUndefined();
    });

    it('should filter by prefix', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      await svc.setSecret('ai/anthropic', 'k1');
      await svc.setSecret('ai/openai', 'k2');
      await svc.setSecret('db/postgres', 'k3');

      const aiOnly = await svc.listSecrets('ai/');
      expect(aiOnly.data!.length).toBe(2);

      const dbOnly = await svc.listSecrets('db/');
      expect(dbOnly.data!.length).toBe(1);
    });

    it('should report has_metadata flag', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      await svc.setSecret('with-meta', 'val', { env: 'prod' });
      await svc.setSecret('no-meta', 'val');

      const result = await svc.listSecrets();
      const withMeta = result.data!.find((s) => s['path'] === 'with-meta');
      const noMeta = result.data!.find((s) => s['path'] === 'no-meta');
      expect(withMeta!['has_metadata']).toBe(true);
      expect(noMeta!['has_metadata']).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      const result = await svc.healthCheck();
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(true);
    });
  });

  describe('tenant isolation', () => {
    it('should isolate secrets between tenants', async () => {
      const svcA = new InMemorySecretsProvider(mockCls('tA'));
      await svcA.setSecret('shared/path', 'secret-A');

      const svcB = new InMemorySecretsProvider(mockCls('tB'));
      const result = await svcB.getSecret('shared/path');
      expect(result.errorCode).toBe('SECRET_NOT_FOUND');
    });

    it('should isolate list results', async () => {
      const svcA = new InMemorySecretsProvider(mockCls('tA'));
      await svcA.setSecret('a/key', 'val-a');

      const svcB = new InMemorySecretsProvider(mockCls('tB'));
      await svcB.setSecret('b/key', 'val-b');

      const listA = await svcA.listSecrets();
      expect(listA.data!.length).toBe(1);
      expect(listA.data![0]['path']).toBe('a/key');
    });
  });

  describe('testing helpers', () => {
    it('should report count', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      expect(svc.count).toBe(0);
      await svc.setSecret('k1', 'v1');
      await svc.setSecret('k2', 'v2');
      expect(svc.count).toBe(2);
    });

    it('should clear all secrets', async () => {
      const svc = new InMemorySecretsProvider(mockCls('t1'));
      await svc.setSecret('k1', 'v1');
      svc.clear();
      expect(svc.count).toBe(0);
    });
  });
});
