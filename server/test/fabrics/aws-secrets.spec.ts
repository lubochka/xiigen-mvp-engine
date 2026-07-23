/**
 * P5.2 Tests — AWS Secrets Manager Provider
 *
 * Tests: get (success, not found, cached, cache expired), set (create/update),
 *        delete, list (metadata only), health (success/failure), cache invalidation,
 *        no client → failure, no tenant → failure, DNA-3.
 */

import { ClsService } from 'nestjs-cls';
import { AWSSecretsManagerProvider } from '../../src/fabrics/secrets/aws.provider';
import { IAsyncSecretsManagerClient } from '../../src/fabrics/secrets/protocols';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TENANT_CONTEXT_KEY } from '../../src/kernel/multi-tenant/tenant-context';
import { makeActiveTenant } from '../helpers/tenant-test.helper';

function createMockClient(): jest.Mocked<IAsyncSecretsManagerClient> {
  return {
    getSecretValue: jest.fn(),
    putSecretValue: jest.fn(),
    createSecret: jest.fn(),
    deleteSecret: jest.fn(),
    listSecrets: jest.fn(),
  };
}

function createTestSetup(tenantId?: string, cacheTtl = 300) {
  const client = createMockClient();
  const clsStore = new Map<string, unknown>();

  if (tenantId) {
    clsStore.set(TENANT_CONTEXT_KEY, makeActiveTenant(tenantId));
  }

  const cls = {
    get: jest.fn((key: string) => clsStore.get(key)),
    set: jest.fn((key: string, val: unknown) => clsStore.set(key, val)),
  } as unknown as ClsService;

  const provider = new AWSSecretsManagerProvider(cls, client, {
    cacheTtlSeconds: cacheTtl,
    prefix: 'xiigen',
    region: 'us-east-1',
  });

  return { provider, client, cls, clsStore };
}

describe('AWSSecretsManagerProvider', () => {
  // ── Secret name mapping ───────────────────────────

  describe('buildSecretName()', () => {
    it('should build {prefix}/{tenantId}/{path}', () => {
      const { provider } = createTestSetup('acme');
      expect(provider.buildSecretName('acme', 'ai/key')).toBe('xiigen/acme/ai/key');
    });
  });

  // ── getSecret ─────────────────────────────────────

  describe('getSecret()', () => {
    it('should return secret from AWS', async () => {
      const { provider, client } = createTestSetup('acme');
      client.getSecretValue.mockResolvedValue({
        SecretString: 'sk-12345',
        VersionId: 'v1',
        ARN: 'arn:aws:sm:us-east-1:123:secret:xiigen/acme/ai/key',
      });

      const result = await provider.getSecret('ai/key');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['value']).toBe('sk-12345');
      expect(result.data!['version']).toBe('v1');
      expect(result.data!['provider']).toBe('aws_secrets_manager');
      expect(result.data!['cached']).toBe(false);
      expect(client.getSecretValue).toHaveBeenCalledWith({
        SecretId: 'xiigen/acme/ai/key',
      });
    });

    it('should return cached result on second call', async () => {
      const { provider, client } = createTestSetup('acme');
      client.getSecretValue.mockResolvedValue({
        SecretString: 'sk-12345',
        VersionId: 'v1',
      });

      await provider.getSecret('ai/key');
      const result = await provider.getSecret('ai/key');

      expect(result.isSuccess).toBe(true);
      expect(result.data!['cached']).toBe(true);
      expect(client.getSecretValue).toHaveBeenCalledTimes(1); // Only one API call
    });

    it('should bypass cache when version is specified', async () => {
      const { provider, client } = createTestSetup('acme');
      client.getSecretValue.mockResolvedValue({
        SecretString: 'sk-12345',
        VersionId: 'v2',
      });

      await provider.getSecret('ai/key');
      await provider.getSecret('ai/key', 'v2');

      expect(client.getSecretValue).toHaveBeenCalledTimes(2);
    });

    it('should refresh cache after TTL expires', async () => {
      const { provider, client } = createTestSetup('acme', 0); // TTL = 0 → no caching
      client.getSecretValue.mockResolvedValue({
        SecretString: 'val',
        VersionId: 'v1',
      });

      await provider.getSecret('key');
      const result = await provider.getSecret('key');

      expect(result.data!['cached']).toBe(false);
      expect(client.getSecretValue).toHaveBeenCalledTimes(2); // Both calls hit AWS
    });

    it('should return failure for not found secret', async () => {
      const { provider, client } = createTestSetup('acme');
      client.getSecretValue.mockRejectedValue(new Error('ResourceNotFoundException'));

      const result = await provider.getSecret('missing');
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
      const result = await provider.getSecret('key');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_TENANT');
    });

    it('should handle generic AWS errors', async () => {
      const { provider, client } = createTestSetup('acme');
      client.getSecretValue.mockRejectedValue(new Error('InternalServiceError'));

      const result = await provider.getSecret('key');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_ERROR');
    });
  });

  // ── setSecret ─────────────────────────────────────

  describe('setSecret()', () => {
    it('should update existing secret via putSecretValue', async () => {
      const { provider, client } = createTestSetup('acme');
      client.putSecretValue.mockResolvedValue({
        VersionId: 'v2',
        ARN: 'arn:test',
      });

      const result = await provider.setSecret('ai/key', 'new-value');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['version']).toBe('v2');
      expect(client.putSecretValue).toHaveBeenCalledWith({
        SecretId: 'xiigen/acme/ai/key',
        SecretString: 'new-value',
      });
    });

    it('should create secret when put returns not found', async () => {
      const { provider, client } = createTestSetup('acme');
      client.putSecretValue.mockRejectedValue(new Error('ResourceNotFoundException'));
      client.createSecret.mockResolvedValue({
        VersionId: 'v1',
        ARN: 'arn:new',
      });

      const result = await provider.setSecret('ai/new-key', 'value');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['created']).toBe(true);
      expect(client.createSecret).toHaveBeenCalledWith(
        expect.objectContaining({ Name: 'xiigen/acme/ai/new-key', SecretString: 'value' }),
      );
    });

    it('should invalidate cache on set', async () => {
      const { provider, client } = createTestSetup('acme');
      client.getSecretValue.mockResolvedValue({ SecretString: 'old', VersionId: 'v1' });
      client.putSecretValue.mockResolvedValue({ VersionId: 'v2' });

      await provider.getSecret('key'); // populate cache
      expect(provider.cacheSize).toBe(1);

      await provider.setSecret('key', 'new');
      expect(provider.cacheSize).toBe(0); // cache invalidated
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
    it('should delete with ForceDeleteWithoutRecovery', async () => {
      const { provider, client } = createTestSetup('acme');
      client.deleteSecret.mockResolvedValue({ Name: 'test' });

      const result = await provider.deleteSecret('key');
      expect(result.isSuccess).toBe(true);
      expect(client.deleteSecret).toHaveBeenCalledWith({
        SecretId: 'xiigen/acme/key',
        ForceDeleteWithoutRecovery: true,
      });
    });

    it('should invalidate cache on delete', async () => {
      const { provider, client } = createTestSetup('acme');
      client.getSecretValue.mockResolvedValue({ SecretString: 'val', VersionId: 'v1' });
      client.deleteSecret.mockResolvedValue({});

      await provider.getSecret('key');
      expect(provider.cacheSize).toBe(1);

      await provider.deleteSecret('key');
      expect(provider.cacheSize).toBe(0);
    });

    it('should fail for not found', async () => {
      const { provider, client } = createTestSetup('acme');
      client.deleteSecret.mockRejectedValue(new Error('ResourceNotFoundException'));

      const result = await provider.deleteSecret('missing');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SECRET_NOT_FOUND');
    });
  });

  // ── listSecrets ───────────────────────────────────

  describe('listSecrets()', () => {
    it('should list metadata from AWS', async () => {
      const { provider, client } = createTestSetup('acme');
      client.listSecrets.mockResolvedValue({
        SecretList: [
          { Name: 'xiigen/acme/key1', ARN: 'arn:1', LastChangedDate: new Date('2025-01-01') },
          { Name: 'xiigen/acme/key2', ARN: 'arn:2' },
        ],
      });

      const result = await provider.listSecrets();
      expect(result.isSuccess).toBe(true);
      expect(result.data!).toHaveLength(2);
      expect(result.data![0]['provider']).toBe('aws_secrets_manager');
    });

    it('IRON RULE: should NEVER return secret values in list', async () => {
      const { provider, client } = createTestSetup('acme');
      client.listSecrets.mockResolvedValue({
        SecretList: [{ Name: 'xiigen/acme/key1' }],
      });

      const result = await provider.listSecrets();
      const entry = result.data![0];
      expect(entry['value']).toBeUndefined();
      expect(entry['SecretString']).toBeUndefined();
    });

    it('should filter by tenant prefix', async () => {
      const { provider, client } = createTestSetup('acme');
      client.listSecrets.mockResolvedValue({ SecretList: [] });

      await provider.listSecrets('ai/');
      expect(client.listSecrets).toHaveBeenCalledWith({
        Filters: [{ Key: 'name', Values: ['xiigen/acme/ai/'] }],
      });
    });
  });

  // ── healthCheck ───────────────────────────────────

  describe('healthCheck()', () => {
    it('should return healthy when AWS responds', async () => {
      const { provider, client } = createTestSetup('acme');
      client.listSecrets.mockResolvedValue({ SecretList: [] });

      const result = await provider.healthCheck();
      expect(result.isSuccess).toBe(true);
      expect(client.listSecrets).toHaveBeenCalledWith({ MaxResults: 1 });
    });

    it('should return unhealthy when AWS fails', async () => {
      const { provider, client } = createTestSetup('acme');
      client.listSecrets.mockRejectedValue(new Error('AccessDeniedException'));

      const result = await provider.healthCheck();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('UNHEALTHY');
    });
  });

  // ── Cache invalidation ────────────────────────────

  describe('invalidateCache()', () => {
    it('should clear all cache', async () => {
      const { provider, client } = createTestSetup('acme');
      client.getSecretValue.mockResolvedValue({ SecretString: 'v', VersionId: 'v1' });

      await provider.getSecret('k1');
      await provider.getSecret('k2');
      expect(provider.cacheSize).toBe(2);

      provider.invalidateCache();
      expect(provider.cacheSize).toBe(0);
    });

    it('should clear cache for specific tenant + path', async () => {
      const { provider, client } = createTestSetup('acme');
      client.getSecretValue.mockResolvedValue({ SecretString: 'v', VersionId: 'v1' });

      await provider.getSecret('k1');
      await provider.getSecret('k2');
      expect(provider.cacheSize).toBe(2);

      provider.invalidateCache('acme', 'k1');
      expect(provider.cacheSize).toBe(1);
    });

    it('should clear all cache for a tenant', async () => {
      const { provider, client } = createTestSetup('acme');
      client.getSecretValue.mockResolvedValue({ SecretString: 'v', VersionId: 'v1' });

      await provider.getSecret('k1');
      await provider.getSecret('k2');

      provider.invalidateCache('acme');
      expect(provider.cacheSize).toBe(0);
    });
  });

  // ── DNA-3 compliance ──────────────────────────────

  describe('DNA-3: DataProcessResult', () => {
    it('should return DataProcessResult for all methods', async () => {
      const { provider, client } = createTestSetup('acme');
      client.getSecretValue.mockRejectedValue(new Error('test'));
      client.putSecretValue.mockRejectedValue(new Error('test'));
      client.deleteSecret.mockRejectedValue(new Error('test'));
      client.listSecrets.mockRejectedValue(new Error('test'));

      const results = await Promise.all([
        provider.getSecret('p'),
        provider.setSecret('p', 'v'),
        provider.deleteSecret('p'),
        provider.listSecrets(),
        provider.healthCheck(),
      ]);

      for (const r of results) {
        expect(r).toBeInstanceOf(DataProcessResult);
      }
    });
  });
});
