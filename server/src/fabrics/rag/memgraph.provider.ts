/**
 * MemgraphProvider — IRagService implementation for Memgraph in-memory graph database.
 * Resolved via fabric config. Service code NEVER imports this directly.
 *
 * Uses Memgraph's Neo4j-compatible HTTP REST API:
 *   POST /db/neo4j/tx/commit — execute Cypher statements
 *
 * Tenant isolation: tenant_id property on every graph node.
 * Graph label: RagDoc. No SDK — raw HTTP only.
 *
 * DNA compliance:
 * - DNA-1: All docs are Record<string, unknown>
 * - DNA-2: Empty fields auto-skipped in Cypher filter building
 * - DNA-3: All methods return DataProcessResult
 * - DNA-5: Tenant from CLS, no tenantId parameter
 *
 * Open-source local alternative: self-hosted, Docker-ready, cost = $0.
 * Port: 7474 (HTTP) | 7687 (Bolt — not used here)
 *
 * Phase: open-source fabric integration for self-implementation.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IRagService } from '../interfaces/rag.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

export interface MemgraphConfig {
  /** Memgraph HTTP API base URL. Default: http://localhost:7474 */
  baseUrl?: string;
  /** Default number of results. Default: 10 */
  defaultTopK?: number;
  /** Basic auth username. Default: undefined (no auth) */
  username?: string;
  /** Basic auth password. Default: undefined (no auth) */
  password?: string;
}

/** Shape of a Memgraph HTTP API statement. */
interface CypherStatement {
  statement: string;
  parameters?: Record<string, unknown>;
}

/** Shape of a Memgraph HTTP API response row. */
interface MemgraphRow {
  row: unknown[];
}

@Injectable()
export class MemgraphProvider extends IRagService {
  private readonly baseUrl: string;
  private readonly defaultTopK: number;
  private readonly authHeader: string | undefined;

  constructor(
    private readonly cls: ClsService,
    config?: MemgraphConfig,
  ) {
    super();
    this.baseUrl = (config?.baseUrl ?? 'http://localhost:7474').replace(/\/$/, '');
    this.defaultTopK = config?.defaultTopK ?? 10;
    if (config?.username && config?.password) {
      this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    }
  }

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json',
    };
    if (this.authHeader) headers['authorization'] = this.authHeader;
    return headers;
  }

  /** Execute Cypher statements against Memgraph HTTP API. */
  private async cypher(statements: CypherStatement[]): Promise<DataProcessResult<MemgraphRow[][]>> {
    try {
      const response = await fetch(`${this.baseUrl}/db/neo4j/tx/commit`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({ statements }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return DataProcessResult.failure(
          'CYPHER_ERROR',
          `Memgraph HTTP ${response.status}: ${errText}`,
        );
      }

      const body = (await response.json()) as {
        results: Array<{ data: MemgraphRow[] }>;
        errors: Array<{ message: string }>;
      };

      if (body.errors && body.errors.length > 0) {
        return DataProcessResult.failure(
          'CYPHER_ERROR',
          `Memgraph query error: ${body.errors[0].message}`,
        );
      }

      const resultRows = body.results.map((r) => r.data ?? []);
      return DataProcessResult.success(resultRows);
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `Memgraph request failed: ${err}`);
    }
  }

  /** Extract node properties from a row result. */
  private rowToDoc(row: MemgraphRow): Record<string, unknown> {
    return (row.row[0] ?? {}) as Record<string, unknown>;
  }

  async ingest(
    documents: Array<Record<string, unknown>>,
    namespace?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!documents || documents.length === 0) {
      return DataProcessResult.failure('EMPTY_DOCUMENTS', 'No documents to ingest');
    }

    const ns = namespace ?? 'default';
    let ingested = 0;
    let failed = 0;

    for (const doc of documents) {
      const content = (doc['content'] ?? doc['text'] ?? JSON.stringify(doc)) as string;
      const docId = (doc['doc_id'] ?? randomUUID()) as string;

      const result = await this.cypher([
        {
          statement: `
          MERGE (n:RagDoc {id: $id, tenant_id: $tenant_id, namespace: $ns})
          SET n.content = $content,
              n.updated_at = $ts,
              n.source = $source,
              n.domain = $domain
          RETURN n
        `,
          parameters: {
            id: docId,
            tenant_id: tenantId,
            ns,
            content,
            ts: new Date().toISOString(),
            source: (doc['source'] ?? '') as string,
            domain: (doc['domain'] ?? '') as string,
          },
        },
      ]);

      if (result.isSuccess) {
        ingested++;
      } else {
        failed++;
      }
    }

    if (ingested === 0 && failed > 0) {
      return DataProcessResult.failure('INGEST_FAILED', `All ${failed} documents failed to ingest`);
    }

    return DataProcessResult.success({ ingested, failed, namespace: ns, tenant_id: tenantId });
  }

  async search(
    query: string,
    options?: { namespace?: string; filters?: Record<string, unknown>; topK?: number },
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!query || query.trim() === '') {
      return DataProcessResult.success([]);
    }

    const ns = options?.namespace ?? 'default';
    const topK = options?.topK ?? this.defaultTopK;

    // Build optional filter clauses (DNA-2: skip empty/null)
    const extraFilters: string[] = [];
    const params: Record<string, unknown> = {
      tenant_id: tenantId,
      ns,
      q: query.toLowerCase(),
      limit: topK,
    };

    if (options?.filters) {
      let fi = 0;
      for (const [k, v] of Object.entries(options.filters)) {
        if (v === null || v === undefined || v === '') continue;
        const paramKey = `filter_${fi++}`;
        extraFilters.push(`AND n.${k} = $${paramKey}`);
        params[paramKey] = v;
      }
    }

    const filterClause = extraFilters.join(' ');
    const cypherQuery = `
      MATCH (n:RagDoc)
      WHERE n.tenant_id = $tenant_id
        AND n.namespace = $ns
        AND toLower(n.content) CONTAINS $q
        ${filterClause}
      RETURN n
      LIMIT $limit
    `;

    const result = await this.cypher([{ statement: cypherQuery, parameters: params }]);
    if (!result.isSuccess)
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);

    const rows = result.data![0] ?? [];
    const docs = rows.map((r) => this.rowToDoc(r));

    return DataProcessResult.success(docs);
  }

  async buildContextPack(
    query: string,
    contextType: string,
    filters?: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);

    const searchResult = await this.search(query, { namespace: contextType, filters });
    if (!searchResult.isSuccess)
      return DataProcessResult.failure(
        'SEARCH_FAILED',
        searchResult.errorMessage ?? 'Search failed',
      );

    const documents = searchResult.data!;
    const contextParts: string[] = [];
    for (const doc of documents) {
      const text = (doc['content'] ?? doc['text'] ?? '') as string;
      if (text) contextParts.push(text);
    }
    const contextText = contextParts.join('\n---\n');

    return DataProcessResult.success({
      context_type: contextType,
      query,
      document_count: documents.length,
      context_text: contextText,
      token_estimate: contextText.split(/\s+/).length,
      documents,
      provider: 'memgraph',
      graph_label: 'RagDoc',
    });
  }

  async deleteByFilter(
    namespace: string,
    filters: Record<string, unknown>,
  ): Promise<DataProcessResult<number>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!namespace) {
      return DataProcessResult.failure('MISSING_NAMESPACE', 'namespace required');
    }

    const params: Record<string, unknown> = { tenant_id: tenantId, ns: namespace };
    const filterClauses: string[] = [];
    let fi = 0;

    for (const [k, v] of Object.entries(filters)) {
      if (v === null || v === undefined || v === '') continue;
      const paramKey = `filter_${fi++}`;
      filterClauses.push(`AND n.${k} = $${paramKey}`);
      params[paramKey] = v;
    }

    const countResult = await this.cypher([
      {
        statement: `
        MATCH (n:RagDoc)
        WHERE n.tenant_id = $tenant_id AND n.namespace = $ns ${filterClauses.join(' ')}
        RETURN count(n) AS cnt
      `,
        parameters: params,
      },
    ]);
    if (!countResult.isSuccess)
      return DataProcessResult.failure(countResult.errorCode!, countResult.errorMessage!);

    const countRow = countResult.data![0]?.[0];
    const deletedCount = (countRow?.row[0] ?? 0) as number;

    const deleteResult = await this.cypher([
      {
        statement: `
        MATCH (n:RagDoc)
        WHERE n.tenant_id = $tenant_id AND n.namespace = $ns ${filterClauses.join(' ')}
        DETACH DELETE n
      `,
        parameters: params,
      },
    ]);
    if (!deleteResult.isSuccess)
      return DataProcessResult.failure('DELETE_FAILED', deleteResult.errorMessage!);

    return DataProcessResult.success(deletedCount);
  }

  /** Check if Memgraph server is reachable. */
  async healthCheck(): Promise<DataProcessResult<Record<string, unknown>>> {
    const result = await this.cypher([{ statement: 'RETURN 1 AS ping', parameters: {} }]);
    if (!result.isSuccess) {
      return DataProcessResult.failure('UNHEALTHY', `Memgraph unreachable: ${result.errorMessage}`);
    }
    return DataProcessResult.success({
      status: 'healthy',
      provider: 'memgraph',
      base_url: this.baseUrl,
    });
  }
}
