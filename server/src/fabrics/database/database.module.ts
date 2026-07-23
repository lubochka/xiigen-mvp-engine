/**
 * DatabaseModule — NestJS module for the Database Fabric.
 *
 * Registers:
 *   - DatabaseProviderRegistry (with all 3 providers: InMemory, ES, PG)
 *   - DatabaseFabricResolver (config-driven routing)
 *   - All concrete providers (InMemoryDatabaseProvider, ElasticsearchProvider, PostgreSQLProvider)
 *
 * Default: InMemory provider. Config switches to ES/PG.
 * The registry and resolver are exported for use by the factory layer (P6).
 *
 * Phase 3.5: Full wiring. Does NOT break FabricsModule's Symbol token bindings.
 */

import { Module, Global } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { InMemoryDatabaseProvider } from './in-memory.provider';
import { ElasticsearchProvider } from './elasticsearch.provider';
import { PostgreSQLProvider } from './postgresql.provider';
import { DatabaseProviderRegistry } from './provider-registry';
import { DatabaseFabricResolver, DatabaseResolverConfig } from './fabric-resolver';
import { DatabaseProviderType, IAsyncElasticsearchClient, IAsyncPGPool } from './base';

/** Default resolver config — uses InMemory, no overrides. */
const DEFAULT_DB_RESOLVER_CONFIG: DatabaseResolverConfig = {
  defaultProvider: DatabaseProviderType.IN_MEMORY,
};

@Global()
@Module({
  providers: [
    // ── Provider Registry (knows all available providers) ──
    {
      provide: DatabaseProviderRegistry,
      useFactory: (cls: ClsService) => {
        const registry = new DatabaseProviderRegistry();

        // Register InMemory provider factory
        registry.register(
          DatabaseProviderType.IN_MEMORY,
          async () => new InMemoryDatabaseProvider(cls),
          { description: 'InMemory database for dev/test' },
        );

        // Register Elasticsearch provider factory
        // (creates with a mock-like client placeholder — real client injected at P13)
        registry.register(
          DatabaseProviderType.ELASTICSEARCH,
          async (config) => {
            // In real deployment, config would contain the ES client instance
            // For now, this factory exists so the resolver can route to it
            const client = config['client'] as IAsyncElasticsearchClient | undefined;
            if (!client) {
              throw new Error(
                'ElasticsearchProvider requires "client" in config. ' +
                  'Set DATABASE_PROVIDER=in_memory for dev or provide a real ES client.',
              );
            }
            return new ElasticsearchProvider(cls, client, config);
          },
          { description: 'Elasticsearch 8.x provider' },
        );

        // Register PostgreSQL provider factory
        registry.register(
          DatabaseProviderType.POSTGRESQL,
          async (config) => {
            const pool = config['pool'] as IAsyncPGPool | undefined;
            if (!pool) {
              throw new Error(
                'PostgreSQLProvider requires "pool" in config. ' +
                  'Set DATABASE_PROVIDER=in_memory for dev or provide a real PG pool.',
              );
            }
            return new PostgreSQLProvider(cls, pool, config);
          },
          { description: 'PostgreSQL 16+ provider (JSONB storage)' },
        );

        return registry;
      },
      inject: [ClsService],
    },

    // ── Fabric Resolver (config → provider routing) ──
    {
      provide: DatabaseFabricResolver,
      useFactory: (registry: DatabaseProviderRegistry) => {
        // TODO: Read config from environment/config service in P7
        return new DatabaseFabricResolver(DEFAULT_DB_RESOLVER_CONFIG, registry);
      },
      inject: [DatabaseProviderRegistry],
    },
  ],
  exports: [DatabaseProviderRegistry, DatabaseFabricResolver],
})
export class DatabaseModule {}
