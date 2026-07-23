/**
 * Secrets base types and protocol interface tests.
 *
 * Validates provider types, provider config, and IAsyncSecretsManagerClient protocol.
 * Protocol validation: compile-time (TypeScript) + runtime (method name checks).
 */

import {
  SecretsProviderType,
  ALL_SECRETS_PROVIDER_TYPES,
  SecretsProviderConfig,
  defaultSecretsConfig,
  isValidSecretsProvider,
  secretsConfigToDict,
} from '../../src/fabrics/secrets/base';

import {
  IAsyncSecretsManagerClient,
  SECRETS_MANAGER_REQUIRED_METHODS,
  SmGetSecretValueResult,
  SmPutSecretValueResult,
  SmCreateSecretResult,
  SmDeleteSecretResult,
  SmListSecretsResult,
} from '../../src/fabrics/secrets/protocols';

// ═══════════════════════════════════════════════════════
// SecretsProviderType Enum
// ═══════════════════════════════════════════════════════

describe('SecretsProviderType', () => {
  it('should have exactly 4 provider types', () => {
    expect(ALL_SECRETS_PROVIDER_TYPES).toHaveLength(4);
  });

  it.each([
    ['IN_MEMORY', 'in_memory'],
    ['ENV_VAR', 'env_var'],
    ['AWS_SECRETS_MANAGER', 'aws_secrets_manager'],
    ['VAULT', 'vault'],
  ])('should have %s = "%s"', (key, value) => {
    expect(SecretsProviderType[key as keyof typeof SecretsProviderType]).toBe(value);
  });

  it('should have unique values (no duplicates)', () => {
    const values = Object.values(SecretsProviderType);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ═══════════════════════════════════════════════════════
// SecretsProviderConfig
// ═══════════════════════════════════════════════════════

describe('SecretsProviderConfig', () => {
  describe('defaultSecretsConfig()', () => {
    it('should return sensible defaults', () => {
      const config = defaultSecretsConfig();
      expect(config.providerType).toBe(SecretsProviderType.IN_MEMORY);
      expect(config.region).toBe('us-east-1');
      expect(config.prefix).toBe('xiigen');
      expect(config.cacheTtlSeconds).toBe(300);
      expect(config.pathOverrides).toEqual({});
      expect(config.options).toEqual({});
    });

    it('should allow partial overrides', () => {
      const config = defaultSecretsConfig({
        providerType: SecretsProviderType.AWS_SECRETS_MANAGER,
        region: 'eu-west-1',
        cacheTtlSeconds: 600,
      });
      expect(config.providerType).toBe(SecretsProviderType.AWS_SECRETS_MANAGER);
      expect(config.region).toBe('eu-west-1');
      expect(config.cacheTtlSeconds).toBe(600);
      // Non-overridden fields keep defaults
      expect(config.prefix).toBe('xiigen');
      expect(config.pathOverrides).toEqual({});
    });

    it('should have no undefined fields', () => {
      const config = defaultSecretsConfig();
      for (const [key, value] of Object.entries(config)) {
        expect(value).not.toBeUndefined();
      }
    });

    it('should override to ENV_VAR for local dev', () => {
      const config = defaultSecretsConfig({
        providerType: SecretsProviderType.ENV_VAR,
        cacheTtlSeconds: 0,
      });
      expect(config.providerType).toBe(SecretsProviderType.ENV_VAR);
      expect(config.cacheTtlSeconds).toBe(0);
    });
  });

  describe('isValidSecretsProvider()', () => {
    it('should accept all valid provider types', () => {
      for (const provider of ALL_SECRETS_PROVIDER_TYPES) {
        expect(isValidSecretsProvider(provider)).toBe(true);
      }
    });

    it('should reject invalid provider types', () => {
      expect(isValidSecretsProvider('nonexistent')).toBe(false);
      expect(isValidSecretsProvider('')).toBe(false);
      expect(isValidSecretsProvider('IN_MEMORY')).toBe(false); // uppercase
      expect(isValidSecretsProvider('hashicorp_vault')).toBe(false);
    });
  });

  describe('secretsConfigToDict()', () => {
    it('should serialize to snake_case dict', () => {
      const config = defaultSecretsConfig({
        providerType: SecretsProviderType.AWS_SECRETS_MANAGER,
        region: 'eu-west-1',
      });
      const dict = secretsConfigToDict(config);
      expect(dict['provider_type']).toBe('aws_secrets_manager');
      expect(dict['region']).toBe('eu-west-1');
      expect(dict['prefix']).toBe('xiigen');
      expect(dict['cache_ttl_seconds']).toBe(300);
      expect(dict['path_overrides']).toEqual({});
      expect(dict['options']).toEqual({});
    });
  });
});

// ═══════════════════════════════════════════════════════
// IAsyncSecretsManagerClient Protocol
// ═══════════════════════════════════════════════════════

describe('IAsyncSecretsManagerClient protocol', () => {
  // Build a mock that conforms to the protocol interface
  function createMockClient(): IAsyncSecretsManagerClient {
    return {
      getSecretValue: jest.fn().mockResolvedValue({
        Name: 'test-secret',
        SecretString: 'secret-value',
        VersionId: 'v1',
      } satisfies SmGetSecretValueResult),

      putSecretValue: jest.fn().mockResolvedValue({
        Name: 'test-secret',
        VersionId: 'v2',
      } satisfies SmPutSecretValueResult),

      createSecret: jest.fn().mockResolvedValue({
        Name: 'new-secret',
        VersionId: 'v1',
      } satisfies SmCreateSecretResult),

      deleteSecret: jest.fn().mockResolvedValue({
        Name: 'test-secret',
        DeletionDate: new Date(),
      } satisfies SmDeleteSecretResult),

      listSecrets: jest.fn().mockResolvedValue({
        SecretList: [{ Name: 'secret-1' }, { Name: 'secret-2' }],
      } satisfies SmListSecretsResult),
    };
  }

  it('should require exactly 5 methods', () => {
    expect(SECRETS_MANAGER_REQUIRED_METHODS).toHaveLength(5);
  });

  it('should list all required method names', () => {
    expect(SECRETS_MANAGER_REQUIRED_METHODS).toEqual([
      'getSecretValue',
      'putSecretValue',
      'createSecret',
      'deleteSecret',
      'listSecrets',
    ]);
  });

  it('should create a conforming mock client', () => {
    const client = createMockClient();
    for (const method of SECRETS_MANAGER_REQUIRED_METHODS) {
      expect(typeof (client as any)[method]).toBe('function');
    }
  });

  describe('getSecretValue', () => {
    it('should return SmGetSecretValueResult', async () => {
      const client = createMockClient();
      const result = await client.getSecretValue({ SecretId: 'test' });
      expect(result.Name).toBe('test-secret');
      expect(result.SecretString).toBe('secret-value');
      expect(result.VersionId).toBe('v1');
    });
  });

  describe('putSecretValue', () => {
    it('should return SmPutSecretValueResult', async () => {
      const client = createMockClient();
      const result = await client.putSecretValue({
        SecretId: 'test',
        SecretString: 'new-value',
      });
      expect(result.Name).toBe('test-secret');
      expect(result.VersionId).toBe('v2');
    });
  });

  describe('createSecret', () => {
    it('should return SmCreateSecretResult', async () => {
      const client = createMockClient();
      const result = await client.createSecret({
        Name: 'new-secret',
        SecretString: 'value',
      });
      expect(result.Name).toBe('new-secret');
      expect(result.VersionId).toBe('v1');
    });
  });

  describe('deleteSecret', () => {
    it('should return SmDeleteSecretResult', async () => {
      const client = createMockClient();
      const result = await client.deleteSecret({
        SecretId: 'test',
        ForceDeleteWithoutRecovery: true,
      });
      expect(result.Name).toBe('test-secret');
      expect(result.DeletionDate).toBeInstanceOf(Date);
    });
  });

  describe('listSecrets', () => {
    it('should return SmListSecretsResult', async () => {
      const client = createMockClient();
      const result = await client.listSecrets({ MaxResults: 10 });
      expect(result.SecretList).toHaveLength(2);
      expect(result.SecretList![0].Name).toBe('secret-1');
    });

    it('should accept empty params', async () => {
      const client = createMockClient();
      const result = await client.listSecrets();
      expect(result.SecretList).toBeDefined();
    });
  });
});
