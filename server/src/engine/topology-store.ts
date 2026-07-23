/**
 * TopologyStore — reads flow topology definitions from xiigen-flow-definitions.
 * Returns null gracefully for unknown task types (not an error).
 * Required before GenericNodeExecutor (Task S5-A).
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';

export interface TopologyNode {
  nodeId: string;
  nodeType: string;
  config?: Record<string, unknown>;
}

export interface TopologyEdge {
  from: string;
  to: string;
  condition?: string;
}

export interface FlowTopology {
  flowId: string;
  taskTypeId: string;
  version: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

@Injectable()
export class TopologyStore {
  private readonly logger = new Logger(TopologyStore.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async getTopology(taskTypeId: string): Promise<DataProcessResult<FlowTopology | null>> {
    const result = await this.db.searchDocuments('xiigen-flow-definitions', { taskTypeId });
    if (!result.isSuccess || !result.data || result.data.length === 0) {
      // Not an error — unknown task types return null gracefully
      this.logger.debug(`No topology found for taskTypeId=${taskTypeId}`);
      return DataProcessResult.success(null);
    }
    const sorted = [...result.data].sort((a, b) =>
      String(b['version']).localeCompare(String(a['version'])),
    );
    return DataProcessResult.success(sorted[0] as unknown as FlowTopology);
  }

  async storeTopology(topology: FlowTopology): Promise<DataProcessResult<FlowTopology>> {
    await this.db.storeDocument(
      'xiigen-flow-definitions',
      topology as unknown as Record<string, unknown>,
      `${topology.taskTypeId}::${topology.version}`,
    );
    return DataProcessResult.success(topology);
  }

  async listTopologies(flowId?: string): Promise<DataProcessResult<FlowTopology[]>> {
    const filters: Record<string, unknown> = {};
    if (flowId) filters['flowId'] = flowId;
    const result = await this.db.searchDocuments('xiigen-flow-definitions', filters);
    if (!result.isSuccess || !result.data) {
      return DataProcessResult.success([]);
    }
    return DataProcessResult.success(result.data as unknown as FlowTopology[]);
  }
}
