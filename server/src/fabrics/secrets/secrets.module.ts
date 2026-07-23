/**
 * SecretsModule — NestJS module for the Secrets Fabric.
 *
 * Registers:
 *   - SecretsProviderRegistry (with all 3 providers: InMemory, EnvVar, AWS)
 *   - SecretsFabricResolver (config-driven routing with path-prefix overrides)
 *
 * Default: InMemory provider. Config switches to EnvVar/AWS.
 * AWS provider requires IAsyncSecretsManagerClient injected via config (P13).
 *
 * Phase 5.4: Full wiring. Does NOT break FabricsModule's Symbol token bindings.
 */

import { Module, Global } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { InMemorySecretsProvider } from './in-memory.provider';
import { VaultSecretsProvider } from './vault.provider';
import { EnvVarSecretsProvider } from './env-var.provider';
import { AWSSecretsManagerProvider } from './aws.provider';
import { SecretsProviderRegistry } from './provider-registry';
import { SecretsFabricResolver, SecretsResolverConfig } from './fabric-resolver';
import { SecretsProviderType } from './base';
import { IAsyncSecretsManagerClient } from './protocols';

/** Default resolver config — uses InMemory, no overrides. */
const DEFAULT_SECRETS_RESOLVER_CONFIG: SecretsResolverConfig = {
  defaultProvider: SecretsProviderType.IN_MEMORY,
};

@Global()
@Module({
  providers: [
    // ── Provider Registry (knows all available providers) ──
    {
      provide: SecretsProviderRegistry,
      useFactory: (cls: ClsService) => {
        const registry = new SecretsProviderRegistry();

        // Register InMemory provider factory
        registry.register(
          SecretsProviderType.IN_MEMORY,
          async () => new InMemorySecretsProvider(cls),
          { description: 'InMemory secrets for dev/test' },
        );

        registry.register(
          SecretsProviderType.VAULT,
          async () => new VaultSecretsProvider(cls),
          { description: 'Vault KV v2 secrets for local/platform deployment' },
        );

        // Register EnvVar provider factory
        registry.register(
          SecretsProviderType.ENV_VAR,
          async (config) => {
            const environ = config['environ'] as Record<string, string | undefined> | undefined;
            return new EnvVarSecretsProvider(cls, environ);
          },
          { description: 'Environment variable secrets provider' },
        );

        // Register AWS Secrets Manager provider factory
        registry.register(
          SecretsProviderType.AWS_SECRETS_MANAGER,
          async (config) => {
            const client = config['client'] as IAsyncSecretsManagerClient | undefined;
            if (!client) {
              throw new Error(
                'AWSSecretsManagerProvider requires "client" in config. ' +
                  'Set SECRETS_PROVIDER=in_memory for dev or provide a real AWS SM client.',
              );
            }
            return new AWSSecretsManagerProvider(cls, client, config);
          },
          { description: 'AWS Secrets Manager provider (with TTL cache)' },
        );

        return registry;
      },
      inject: [ClsService],
    },

    // ── Fabric Resolver (config → provider routing) ──
    {
      provide: SecretsFabricResolver,
      useFactory: (registry: SecretsProviderRegistry) => {
        // TODO: Read config from environment/config service in P7
        return new SecretsFabricResolver(DEFAULT_SECRETS_RESOLVER_CONFIG, registry);
      },
      inject: [SecretsProviderRegistry],
    },
  ],
  exports: [SecretsProviderRegistry, SecretsFabricResolver],
})
export class SecretsModule {}
