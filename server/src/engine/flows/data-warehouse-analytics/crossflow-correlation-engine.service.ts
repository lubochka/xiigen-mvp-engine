/**
 * T180 CrossFlowCorrelationEngine [analytics_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Correlates data across multiple tenant flows while enforcing strict
 * tenant isolation on all cross-flow joins.
 *
 * Iron rules:
 *   IR-1: Cross-flow joins MUST include tenantId in every predicate â€” no cross-tenant correlation.
 *   IR-2: sourceFlows must list all flows contributing data (minimum 2).
 *   IR-3: All cross-flow reads must be read-only â€” never mutate source flow data.
 *   IR-4: storeDocument(correlation) BEFORE enqueue(CrossFlowCorrelationReported). DNA-8.
 *
 * Emits: warehouse.crossflow.correlation
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const WAREHOUSE_EVENTS_INDEX = 'xiigen-warehouse-events';
const CROSSFLOW_CORRELATIONS_INDEX = 'xiigen-crossflow-correlations';

@Injectable()
export class CrossFlowCorrelationEngineService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T180',
        serviceName: 'CrossFlowCorrelationEngineService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Correlate data across multiple source flows.
   * IR-1: tenantId in every join predicate.
   * IR-2: sourceFlows.length >= 2.
   * IR-3: Read-only â€” no mutations to source flow indices.
   * IR-4: storeDocument BEFORE enqueue. DNA-8.
   */
  async correlate(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const correlationId = event['correlationId'] as string;
    const sourceFlows = (event['sourceFlows'] as string[]) ?? [];
    const correlationWindow = event['correlationWindow'] as string;

    // IR-2: Minimum 2 source flows
    if (!correlationId || sourceFlows.length < 2) {
      return DataProcessResult.failure(
        'INSUFFICIENT_SOURCES',
        'correlationId and at least 2 sourceFlows are required',
      );
    }

    const correlationResults: Record<string, unknown>[] = [];

    // IR-1: Every read includes tenantId predicate
    // IR-3: Read-only â€” searchDocuments only, no storeDocument on source indices
    for (const flowId of sourceFlows) {
      const flowResult = await this.dbFabric.searchDocuments(WAREHOUSE_EVENTS_INDEX, {
        tenantId, // IR-1: tenantId in every predicate
        sourceFlowId: flowId,
      });

      if (flowResult.isSuccess) {
        correlationResults.push({
          flowId,
          eventCount: (flowResult.data ?? []).length,
        });
      }
    }

    const now = new Date().toISOString();

    const correlation: Record<string, unknown> = {
      correlationId,
      tenantId,
      sourceFlows,
      correlationWindow: correlationWindow ?? 'UNSPECIFIED',
      flowResults: correlationResults,
      correlatedAt: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbFabric.storeDocument(
      CROSSFLOW_CORRELATIONS_INDEX,
      correlation,
      correlationId,
    );
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    await this.queueFabric.enqueue('WarehouseCrossFlowCorrelationReported', {
      tenantId,
      correlationId,
      sourceFlows,
      flowResults: correlationResults,
      correlatedAt: now,
    });

    return DataProcessResult.success({
      correlationId,
      sourceFlows,
      flowResults: correlationResults,
    });
  }
}
