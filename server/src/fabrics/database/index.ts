/**
 * Database Fabric — all exports.
 * Interfaces come from ../interfaces. This barrel exports providers + infrastructure.
 */

// Base types
export {
  DatabaseProviderType,
  defaultDatabaseConfig,
  getConnectionString,
  sanitizeIdentifier,
} from './base';
export type {
  DatabaseProviderConfig,
  IAsyncElasticsearchClient,
  IAsyncPGPool,
  IAsyncPGConnection,
  EsIndexResult,
  EsGetResult,
  EsSearchResult,
  EsBulkResult,
  EsCountResult,
} from './base';

// Provider Registry
export { DatabaseProviderRegistry } from './provider-registry';
export type { DatabaseProviderFactory } from './provider-registry';

// Fabric Resolver
export { DatabaseFabricResolver } from './fabric-resolver';
export type { DatabaseResolverConfig } from './fabric-resolver';

// InMemory Provider (P2.2)
export { InMemoryDatabaseProvider } from './in-memory.provider';

// Elasticsearch Provider (P3.2)
export { ElasticsearchProvider } from './elasticsearch.provider';

// PostgreSQL Provider (P3.3)
export { PostgreSQLProvider } from './postgresql.provider';

// Module (P3.5)
export { DatabaseModule } from './database.module';
