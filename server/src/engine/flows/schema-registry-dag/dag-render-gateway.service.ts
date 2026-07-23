/**
 * T199 DagRenderGateway [DATA_PIPELINE]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T199-1: Delegates to existing DagRendererHandler — NEVER re-implements Mermaid rendering.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { DagRendererHandler } from '../../dag/dag-renderer.handler';
import { DagScope } from '../../dag/dag-node.types';

@Injectable()
export class DagRenderGatewayService extends MicroserviceBase {
  constructor(private readonly dagRenderer: DagRendererHandler) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T199',
        serviceName: 'DagRenderGatewayService',
        flowId: 'FLOW-11',
      }),
    });
  }

  /** Delegate to DagRendererHandler — no Mermaid generation in T199. */
  async renderDag(flowId: string, scope?: DagScope): Promise<DataProcessResult<string>> {
    return this.dagRenderer.renderDag(flowId, scope);
  }
}
