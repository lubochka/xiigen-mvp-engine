// server/src/engine/dag/dag-renderer.handler.ts
// NEW FILE — DAG renderer handler using MermaidRendererService + updated DagNode schema

import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import { ES_INDEX } from '../../kernel/es-index-constants';
import { MermaidRendererService } from './mermaid-renderer.service';
import { DagNode, DagScope } from './dag-node.types';

function parseDagNode(doc: Record<string, unknown>): DagNode {
  return {
    id: String(doc['id'] ?? ''),
    label: String(doc['label'] ?? ''),
    taskTypeId: String(doc['taskTypeId'] ?? ''),
    status: (doc['status'] as DagNode['status']) ?? 'stable',
    estimatedDurationMs: doc['estimatedDurationMs'] as number | undefined,
    deps: (doc['deps'] as string[]) ?? [],
    conditionalEdges: (doc['conditionalEdges'] as DagNode['conditionalEdges']) ?? [],
    parallelGroups: (doc['parallelGroups'] as DagNode['parallelGroups']) ?? [],
    crossFlowEdges: (doc['crossFlowEdges'] as DagNode['crossFlowEdges']) ?? [],
  };
}

@Injectable()
export class DagRendererHandler {
  private readonly logger = new Logger(DagRendererHandler.name);
  private readonly mermaidRenderer = new MermaidRendererService();

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
  ) {}

  async renderDag(
    flowId: string,
    scope: DagScope = 'flow-only',
  ): Promise<DataProcessResult<string>> {
    const tenantId = (() => {
      try {
        return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? null;
      } catch {
        return null;
      }
    })();
    const tenantFilter = tenantId ? { tenantId } : {};
    const nodesResult = await this.db.searchDocuments(ES_INDEX.FLOW_RUNS, {
      flowId,
      ...tenantFilter,
    });
    if (!nodesResult.isSuccess) {
      return DataProcessResult.failure(
        nodesResult.errorCode ?? 'DB_ERROR',
        nodesResult.errorMessage ?? 'Failed to retrieve DAG nodes',
      );
    }
    const dagNodes = (nodesResult.data ?? []).map(parseDagNode);
    return this.mermaidRenderer.render(dagNodes, scope);
  }
}
