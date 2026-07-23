/**
 * Database Fabric — base types, enums, and protocol interfaces.
 *
 * Protocol interfaces match the external SDK shapes (Elasticsearch, PostgreSQL)
 * so providers can be tested with mock objects without importing real SDKs.
 *
 * Phase 3.1: Types only. Concrete providers in P3.2/P3.3.
 */

// ── Provider Type Enum ───────────────────────────────

export enum DatabaseProviderType {
  IN_MEMORY = 'in_memory',
  ELASTICSEARCH = 'elasticsearch',
  POSTGRESQL = 'postgresql',
}

// ── Provider Config ──────────────────────────────────

export interface DatabaseProviderConfig {
  readonly providerType: DatabaseProviderType;
  readonly hosts: readonly string[];
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
  readonly options: Record<string, unknown>;
  /** Per-index overrides: { 'orders': 'postgresql', 'logs': 'elasticsearch' } */
  readonly indexOverrides: Record<string, string>;
}

/** Sensible defaults for config. */
export function defaultDatabaseConfig(
  overrides?: Partial<DatabaseProviderConfig>,
): DatabaseProviderConfig {
  return {
    providerType: DatabaseProviderType.IN_MEMORY,
    hosts: ['localhost'],
    port: 0,
    database: '',
    username: '',
    password: '',
    options: {},
    indexOverrides: {},
    ...overrides,
  };
}

/** Build a connection string from config. */
export function getConnectionString(config: DatabaseProviderConfig): string {
  const host = config.hosts[0] ?? 'localhost';
  switch (config.providerType) {
    case DatabaseProviderType.ELASTICSEARCH: {
      const port = config.port || 9200;
      return `http://${host}:${port}`;
    }
    case DatabaseProviderType.POSTGRESQL: {
      const port = config.port || 5432;
      return `postgresql://${config.username}:${config.password}@${host}:${port}/${config.database}`;
    }
    default:
      return 'in-memory://';
  }
}

// ── Elasticsearch Protocol Interface ─────────────────
// Matches the @elastic/elasticsearch AsyncElasticsearch API surface we use.
// Tests inject mock objects implementing this interface.

export interface EsIndexResult {
  _id: string;
  _index: string;
  result: string;
  _version?: number;
}

export interface EsGetResult {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
  found: boolean;
}

export interface EsSearchResult {
  hits: {
    total: { value: number; relation: string };
    hits: Array<{
      _id: string;
      _index: string;
      _source: Record<string, unknown>;
      _score?: number;
    }>;
  };
}

export interface EsBulkResult {
  errors: boolean;
  items: Array<{
    index?: { _id: string; status: number; error?: Record<string, unknown> };
  }>;
}

export interface EsCountResult {
  count: number;
}

export interface IAsyncElasticsearchClient {
  index(params: {
    index: string;
    document: Record<string, unknown>;
    id?: string;
    refresh?: string;
  }): Promise<EsIndexResult>;

  get(params: { index: string; id: string }): Promise<EsGetResult>;

  search(params: { index: string; body: Record<string, unknown> }): Promise<EsSearchResult>;

  delete(params: { index: string; id: string; refresh?: string }): Promise<Record<string, unknown>>;

  bulk(params: {
    operations: Array<Record<string, unknown>>;
    refresh?: string;
  }): Promise<EsBulkResult>;

  count(params: { index: string; body?: Record<string, unknown> }): Promise<EsCountResult>;

  ping(): Promise<boolean>;

  close(): Promise<void>;

  indices: {
    create(params: {
      index: string;
      body?: Record<string, unknown>;
    }): Promise<Record<string, unknown>>;
  };
}

// ── PostgreSQL Protocol Interfaces ───────────────────
// Matches the asyncpg / pg Pool + Connection API surface we use.

export interface IAsyncPGConnection {
  execute(query: string, ...args: unknown[]): Promise<string>;

  fetchrow(query: string, ...args: unknown[]): Promise<Record<string, unknown> | null>;

  fetch(query: string, ...args: unknown[]): Promise<Array<Record<string, unknown>>>;

  fetchval(query: string, ...args: unknown[]): Promise<unknown>;

  executemany(query: string, args: unknown[][]): Promise<void>;
}

export interface IAsyncPGPool {
  acquire(): Promise<IAsyncPGConnection>;

  release(connection: IAsyncPGConnection): Promise<void>;

  close(): Promise<void>;
}

// ── SQL Identifier Sanitizer ─────────────────────────

/**
 * Sanitize a string for use as a SQL identifier (table/column name).
 * Removes anything that isn't alphanumeric or underscore.
 * Prevents SQL injection in dynamically-built table names.
 */
export function sanitizeIdentifier(input: string): string {
  return input.replace(/[^a-zA-Z0-9_]/g, '');
}
