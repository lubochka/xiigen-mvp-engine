/**
 * T184 QueryOptimizationAdvisor [query_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Provides read-only query optimization suggestions for tenant query patterns.
 * No quota check required â€” this is a read-only advisory service, not warehouse execution.
 *
 * Iron rules:
 *   IR-1: Optimization suggestions are read-only â€” no query execution.
 *   IR-2: Suggestions scoped to tenant query patterns only.
 *   IR-3: T187 quota check is NOT required (read-only, no warehouse execution).
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const WAREHOUSE_QUERY_PATTERNS_INDEX = 'xiigen-warehouse-query-patterns';

@Injectable()
export class QueryOptimizationAdvisorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T184',
        serviceName: 'QueryOptimizationAdvisorService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Generate optimization suggestions for a query.
   * IR-1: Read-only. IR-2: tenant-scoped. IR-3: No quota check.
   */
  async advise(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const queryId = event['queryId'] as string;
    const queryType = event['queryType'] as string;
    const queryPayload = (event['query'] as Record<string, unknown>) ?? {};

    if (!queryId) {
      return DataProcessResult.failure('MISSING_FIELDS', 'queryId is required');
    }

    // IR-2: Fetch tenant's historical query patterns â€” tenant-scoped, read-only
    const patternsResult = await this.dbFabric.searchDocuments(WAREHOUSE_QUERY_PATTERNS_INDEX, {
      tenantId,
      queryType,
    });

    const patterns = patternsResult.isSuccess ? (patternsResult.data ?? []) : [];
    const suggestions: Record<string, unknown>[] = [];

    // Analyze query for common optimization opportunities
    if (queryPayload['fullScan'] === true) {
      suggestions.push({
        type: 'ADD_INDEX',
        description:
          'Query performs a full table scan. Consider adding an index on the filter fields.',
        priority: 'HIGH',
      });
    }

    if (patterns.length > 10) {
      suggestions.push({
        type: 'CACHE_CANDIDATE',
        description: 'This query pattern runs frequently. Consider result caching.',
        priority: 'MEDIUM',
      });
    }

    if (queryPayload['joinCount'] && (queryPayload['joinCount'] as number) > 3) {
      suggestions.push({
        type: 'REDUCE_JOINS',
        description: 'Query has many joins. Consider denormalization or pre-aggregation.',
        priority: 'MEDIUM',
      });
    }

    // IR-1: No writes, no enqueue â€” advisory only
    return DataProcessResult.success({
      queryId,
      tenantId,
      suggestions,
      suggestionCount: suggestions.length,
    });
  }
}
