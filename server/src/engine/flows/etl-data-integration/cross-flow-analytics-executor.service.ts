/**
 * T222 CrossFlowAnalyticsExecutor [activation]
 * FLOW-14: ETL & Data Integration
 *
 * PURPOSE: Cross-flow analytics requiring FLOW-13 peer to be ACTIVE.
 * RLS applied before returning results. Results include rlsApplied: true.
 *
 * Iron rules:
 *   IR-1: FLOW-13 MUST be ACTIVE before execution (peerFlowMustBeActive BFA check).
 *   IR-2: RLS (F463) MUST be applied before returning cross-flow results.
 *   IR-3: tenantId isolation enforced on all cross-flow data.
 *   IR-4: CrossFlowQueryCompleted includes sourceFlows: ["FLOW-13"] and rlsApplied: true.
 *   IR-5: No direct HTTP to FLOW-13 services — queue fabric only (Rule 11).
 *   IR-6: storeDocument BEFORE enqueue. DNA-8.
 *
 * Emits: CrossFlowQueryCompleted
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { RLS_POLICY_SERVICE } from './etl-platform-tokens';

interface IRlsPolicyService {
  applyPolicies(
    connectorId: string,
    tenantId: string,
    records: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]>;
}

const CROSS_FLOW_RESULTS_INDEX = 'xiigen-cross-flow-query-results';
const FLOW_REGISTRY_INDEX = 'xiigen-flow-registry';

@Injectable()
export class CrossFlowAnalyticsExecutorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(RLS_POLICY_SERVICE) private readonly rlsPolicy: IRlsPolicyService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T222',
        serviceName: 'CrossFlowAnalyticsExecutorService',
        flowId: 'FLOW-14',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  async execute(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const connectorId = event['connectorId'] as string;
    const queryPayload = event['queryPayload'] as Record<string, unknown>;

    if (!connectorId || !queryPayload) {
      return DataProcessResult.failure(
        'VALIDATION_FAILED',
        'connectorId and queryPayload are required',
      );
    }

    // IR-1: Verify FLOW-13 is ACTIVE (peerFlowMustBeActive BFA check)
    // IR-5: Check via DB registry — no direct HTTP to FLOW-13 services (Rule 11)
    const flow13Status = await this.dbFabric.searchDocuments(FLOW_REGISTRY_INDEX, {
      flowId: 'FLOW-13',
      status: 'ACTIVE',
    });

    const flow13Active =
      flow13Status.isSuccess && Array.isArray(flow13Status.data) && flow13Status.data.length > 0;

    if (!flow13Active) {
      return DataProcessResult.failure(
        'PEER_FLOW_INACTIVE',
        'FLOW-13 (DataWarehouseAnalytics) must be ACTIVE before cross-flow analytics can execute',
      );
    }

    // Execute cross-flow analytics query using DB (no direct HTTP)
    const rawResults = await this.dbFabric.searchDocuments('xiigen-warehouse-mart-records', {
      ...queryPayload,
      tenantId, // IR-3: tenantId isolation
    });

    const resultRows =
      rawResults.isSuccess && Array.isArray(rawResults.data)
        ? (rawResults.data as Record<string, unknown>[])
        : [];

    // IR-2: Apply RLS before returning results
    const rlsFiltered = await this.rlsPolicy.applyPolicies(connectorId, tenantId, resultRows);

    // IR-6: storeDocument BEFORE enqueue (DNA-8)
    const resultId = `cross-flow:${tenantId}:${connectorId}:${Date.now()}`;
    const storeResult = await this.dbFabric.storeDocument(
      CROSS_FLOW_RESULTS_INDEX,
      {
        connectorId,
        tenantId,
        knowledgeScope: 'PRIVATE',
        sourceFlows: ['FLOW-13'],
        resultCount: rlsFiltered.length,
        rlsApplied: true,
        executedAt: new Date().toISOString(),
      },
      resultId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        storeResult.errorMessage ?? 'Result store failed',
      );
    }

    // IR-4: CrossFlowQueryCompleted includes sourceFlows and rlsApplied
    await this.queueFabric.enqueue('CrossFlowQueryCompleted', {
      connectorId,
      tenantId,
      sourceFlows: ['FLOW-13'],
      resultCount: rlsFiltered.length,
      rlsApplied: true,
      executedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      results: rlsFiltered,
      sourceFlows: ['FLOW-13'],
      rlsApplied: true,
    });
  }
}
