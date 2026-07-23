/**
 * T208 DagVisualizationGateway [ROUTING]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T208-1: Routing only — delegates to T199/T197.
 *   IR-T208-2: Cache TTL from FREEDOM config.
 *   IR-T208-3: Unknown format → RouteRejected.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DagRenderGatewayService } from './dag-render-gateway.service';
import { DagTopologyBuilderService } from './dag-topology-builder.service';
import { DagScope } from '../../dag/dag-node.types';

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

const FREEDOM_INDEX = 'freedom_configs';

export interface VisualizationRequest {
  format: string;
  flowId?: string;
  scope?: string;
}

export interface VisualizationResult {
  format: string;
  content: string | Record<string, unknown>;
  fromCache: boolean;
}

@Injectable()
export class DagVisualizationGatewayService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
    private readonly tenantContext: TenantContextLookup,
    private readonly renderGateway: DagRenderGatewayService,
    private readonly topologyBuilder: DagTopologyBuilderService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T208',
        serviceName: 'DagVisualizationGatewayService',
        flowId: 'FLOW-11',
      }),
    });
  }

  private getTenantId(): string {
    const resolved = this.tenantContext.getCurrentTenantId?.();
    if (resolved?.isSuccess && typeof resolved.data === 'string' && resolved.data.length > 0) {
      return resolved.data;
    }
    const legacyTenant = this.tenantContext.get?.('tenant')?.tenantId;
    return legacyTenant ?? 'unknown';
  }
  /** Route visualization request to T199 (mermaid) or T197 (json topology). Unknown → RouteRejected. */
  async visualize(request: VisualizationRequest): Promise<DataProcessResult<VisualizationResult>> {
    try {
      if (request.format === 'mermaid') {
        // Delegate to T199 DagRenderGateway
        const scope = request.scope as DagScope | undefined;
        const result = await this.renderGateway.renderDag(request.flowId ?? 'FLOW-11', scope);
        if (!result.isSuccess) {
          return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
        }
        return DataProcessResult.success({
          format: 'mermaid',
          content: result.data!,
          fromCache: false,
        });
      }

      if (request.format === 'json') {
        // Delegate to T197 DagTopologyBuilder
        const result = await this.topologyBuilder.buildTopology();
        if (!result.isSuccess) {
          return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
        }
        return DataProcessResult.success({
          format: 'json',
          content: result.data! as unknown as Record<string, unknown>,
          fromCache: false,
        });
      }

      // IR-T208-3: Unknown format → RouteRejected
      await this.queueService.enqueue('RouteRejected', {
        format: request.format,
        reason: 'unknown_format',
        tenantId: this.getTenantId(),
      });
      return DataProcessResult.failure(
        'ROUTE_REJECTED',
        `Unknown visualization format: ${request.format}`,
      );
    } catch (err) {
      return DataProcessResult.failure(
        'VISUALIZATION_ERROR',
        `DagVisualizationGateway threw: ${String(err)}`,
      );
    }
  }

  /** Cache TTL from FREEDOM config — IR-T208-2. */
  async getCacheTtlMs(): Promise<number> {
    const tenantId = this.getTenantId();
    const cfg = await this.dbService.searchDocuments(FREEDOM_INDEX, {
      tenantId,
      config_key: 'flow11_schema_registry_visualization_cache_ttl_ms',
      task_type: 'xiigen-engine',
    });
    if (cfg.isSuccess && (cfg.data ?? []).length > 0) {
      const val = parseInt(
        String((cfg.data![0] as Record<string, unknown>)['config_value'] ?? ''),
        10,
      );
      if (!isNaN(val) && val > 0) return val;
    }
    return 5 * 60 * 1000; // 5 minutes default
  }
}
