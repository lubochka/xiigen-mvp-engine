/**
 * P5.2 Tests — EnvVar Secrets Provider
 *
 * Tests: get (found/not found), set, delete, list (prefix, values never returned),
 *        path mapping, tenant isolation, health check, no tenant → failure, DNA-3.
 */

import { ClsService } from 'nestjs-cls';
import { EnvVarSecretsProvider, EnvironMap } from '../../src/fabrics/secrets/env-var.provider';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TENANT_CONTEXT_KEY } from '../../src/kernel/multi-tenant/tenant-context';
import { makeActiveTenant } from '../helpers/tenant-test.helper';

function createTestSetup(tenantId?: string) {
  const environ: EnvironMap = {};
  const clsStore = new Map<string, unknown>();

  if (tenantId) {
    clsStore.set(TENANT_CONTEXT_KEY, makeActiveTenant(tenantId));
  }

  const cls = {
    get: jest.fn((key: string) => clsStore.get(key)),
    set: jest.fn((key: string, val: unknown) => clsStore.set(key, val)),
  } as unknown as ClsService;

  const provider = new EnvVarSecretsProvider(cls, environ);
  return { provider, cls, environ };
}

describe('EnvVarSecretsProvider', () => {
  // ── Path Mapping ─────────────────────────────────

  describe('mapPathToEnvVar()', () => {
    it('should map slashes to underscores and uppercase', () => {
      const { provider } = createTestSetup('acme');
      expect(provider.mapPathToEnvVar('acme', 'xiigen/ai/key')).toBe('TENANT_ACME_XIIGEN_AI_KEY');
    });

    it('should sanitize special characters', () => {
      const { provider } = createTestSetup('acme');
      expect(provider.mapPathToEnvVar('acme', 'xi!gen/a@i/k#ey')).toBe('TENANT_ACME_XIGEN_AI_KEY');
    });

    it('should isolate by tenant prefix', () => {
      const { provider } = createTestSetup('acme');
      const a = provider.mapPathToEnvVar('tenant-a', 'secret');
      const b = provider.mapPathToEnvVar('tenant-b', 'secret');
      expect(a).not.toBe(b);
      expect(a).toBe('TENANT_TENANTA_SECRET');
      expect(b).toBe('TENANT_TENANTB_SECRET');
    });
  });

  // ── getSecret ─────────────────────────────────────

  describe('getSecret()', () => {
    it('should return secret when env var exists', async () => {
      const { provider, environ } = createTestSetup('acme');
      environ['TENANT_ACME_XIIGEN_AI_KEY'] = 'sk-12345';

      const result = await provider.getSecret('xiigen/ai/key');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['value']).toBe('sk-12345');
      expect(result.data!['provider']).toBe('env_var');
      expect(result.data!['version']).toBe('env');
    });

    it('should return failure when env var not set', async () => {
      const { provider } = createTestSetup('acme');
      const result = await provider.getSecret('xiigen/ai/missing');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SECRET_NOT_FOUND');
    });

    it('should fail with empty path', async () => {
      const { provider } = createTestSetup('acme');
      const result = await provider.getSecret('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_PATH');
    });

    it('should fail without tenant context — DNA-5', async () => {
      const { provider } = createTestSetup(); // no tenant
      const result = await provider.getSecret('xiigen/ai/key');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_TENANT');
    });
  });

  // ── setSecret ─────────────────────────────────────

  describe('setSecret()', () => {
    it('should set env var', async () => {
      const { provider, environ } = createTestSetup('acme');
      const result = await provider.setSecret('xiigen/ai/key', 'new-key');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['provider']).toBe('env_var');
      expect(environ['TENANT_ACME_XIIGEN_AI_KEY']).toBe('new-key');
    });

    it('should overwrite existing value', async () => {
      const { provider, environ } = createTestSetup('acme');
      environ['TENANT_ACME_XIIGEN_AI_KEY'] = 'old';
      await provider.setSecret('xiigen/ai/key', 'new');
      expect(environ['TENANT_ACME_XIIGEN_AI_KEY']).toBe('new');
    });

    it('should fail with null value', async () => {
      const { provider } = createTestSetup('acme');
      const result = await provider.setSecret('path', null as any);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_VALUE');
    });

    it('should fail without tenant — DNA-5', async () => {
      const { provider } = createTestSetup();
      const result = await provider.setSecret('path', 'val');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_TENANT');
    });
  });

  // ── deleteSecret ──────────────────────────────────

  describe('deleteSecret()', () => {
    it('should delete existing env var', async () => {
      const { provider, environ } = createTestSetup('acme');
      environ['TENANT_ACME_KEY'] = 'val';
      const result = await provider.deleteSecret('key');
      expect(result.isSuccess).toBe(true);
      expect(environ['TENANT_ACME_KEY']).toBeUndefined();
    });

    it('should fail when env var not set', async () => {
      const { provider } = createTestSetup('acme');
      const result = await provider.deleteSecret('missing');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SECRET_NOT_FOUND');
    });
  });

  // ── listSecrets ───────────────────────────────────

  describe('listSecrets()', () => {
    it('should list matching env vars for tenant', async () => {
      const { provider, environ } = createTestSetup('acme');
      environ['TENANT_ACME_KEY1'] = 'val1';
      environ['TENANT_ACME_KEY2'] = 'val2';
      environ['TENANT_OTHER_KEY3'] = 'val3'; // different tenant
      environ['UNRELATED'] = 'nope';

      const result = await provider.listSecrets();
      expect(result.isSuccess).toBe(true);
      expect(result.data!).toHaveLength(2);
    });

    it('IRON RULE: should NEVER return secret values in list', async () => {
      const { provider, environ } = createTestSetup('acme');
      environ['TENANT_ACME_SECRET'] = 'super-secret-value';

      const result = await provider.listSecrets();
      expect(result.isSuccess).toBe(true);
      const entry = result.data![0];
      expect(entry['value']).toBeUndefined();
      expect(JSON.stringify(entry)).not.toContain('super-secret-value');
    });

    it('should filter by prefix', async () => {
      const { provider, environ } = createTestSetup('acme');
      environ['TENANT_ACME_XIIGEN_AI_KEY'] = 'a';
      environ['TENANT_ACME_XIIGEN_DB_KEY'] = 'b';
      environ['TENANT_ACME_OTHER'] = 'c';

      const result = await provider.listSecrets('xiigen');
      expect(result.isSuccess).toBe(true);
      expect(result.data!).toHaveLength(2);
    });
  });

  // ── Tenant Isolation ──────────────────────────────

  describe('tenant isolation', () => {
    it('should isolate secrets between tenants', async () => {
      const environ: EnvironMap = {};
      const clsStore = new Map<string, unknown>();
      const cls = {
        get: jest.fn((key: string) => clsStore.get(key)),
        set: jest.fn((key: string, val: unknown) => clsStore.set(key, val)),
      } as unknown as ClsService;
      const provider = new EnvVarSecretsProvider(cls, environ);

      // Tenant A sets secret
      clsStore.set(TENANT_CONTEXT_KEY, makeActiveTenant('a'));
      await provider.setSecret('key', 'value-a');

      // Tenant B cannot see it
      clsStore.set(TENANT_CONTEXT_KEY, makeActiveTenant('b'));
      const result = await provider.getSecret('key');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SECRET_NOT_FOUND');
    });
  });

  // ── healthCheck ───────────────────────────────────

  describe('healthCheck()', () => {
    it('should always return healthy', async () => {
      const { provider } = createTestSetup('acme');
      const result = await provider.healthCheck();
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(true);
    });
  });

  // ── DNA-3 compliance ──────────────────────────────

  describe('DNA-3: DataProcessResult', () => {
    it('should return DataProcessResult for all methods', async () => {
      const { provider } = createTestSetup('acme');
      const methods = ['getSecret', 'setSecret', 'deleteSecret', 'listSecrets', 'healthCheck'];
      for (const method of methods) {
        let result: DataProcessResult<any>;
        if (method === 'setSecret') {
          result = await (provider as any)[method]('p', 'v');
        } else if (method === 'healthCheck') {
          result = await (provider as any)[method]();
        } else {
          result = await (provider as any)[method]('p');
        }
        expect(result).toBeInstanceOf(DataProcessResult);
      }
    });
  });
});
