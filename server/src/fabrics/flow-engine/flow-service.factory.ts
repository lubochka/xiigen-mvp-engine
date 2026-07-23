/**
 * FlowServiceFactory — bridges Factory Pattern (Layer 1) to FLOW_ENGINE Fabric (Layer 0).
 *
 * Extends IExternalServiceFactory<IFlowDefinition | IFlowOrchestrator>.
 * createAsync() delegates to FlowFabricResolver.
 *   - context.config.component === 'store' → resolves IFlowDefinition
 *   - context.config.component === 'orchestrator' → resolves IFlowOrchestrator
 *   - default → resolves IFlowOrchestrator
 * Validates context.fabricType === FLOW_ENGINE before delegation.
 *
 * DNA-3: All returns are DataProcessResult.
 *
 * Phase 6.2: Per-fabric bridge factory.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { FabricType } from '../../factories/fabric-type';
import { IExternalServiceFactory } from '../../factories/factory-interfaces';
import { FactoryResolutionContext } from '../../factories/resolution-context';
import { IFlowDefinition, IFlowOrchestrator } from '../interfaces/flow-orchestrator.interface';
import { FlowFabricResolver } from './fabric-resolver';

export type FlowComponent = IFlowDefinition | IFlowOrchestrator;

@Injectable()
export class FlowServiceFactory extends IExternalServiceFactory<FlowComponent> {
  static readonly FABRIC_TYPE = FabricType.FLOW_ENGINE;
  static readonly FACTORY_ID = 'FABRIC_FLOW_ENGINE';
  static readonly INTERFACE_NAME = 'IFlowDefinition|IFlowOrchestrator';

  constructor(private readonly resolver: FlowFabricResolver) {
    super();
  }

  /**
   * Resolve a flow engine component via the FLOW_ENGINE fabric.
   * context.config.component:
   *   'store' → IFlowDefinition
   *   'orchestrator' (default) → IFlowOrchestrator
   */
  async createAsync(context: FactoryResolutionContext): Promise<DataProcessResult<FlowComponent>> {
    if (context.fabricType !== FabricType.FLOW_ENGINE) {
      return DataProcessResult.failure(
        'WRONG_FABRIC',
        `FlowServiceFactory requires fabricType='${FabricType.FLOW_ENGINE}', ` +
          `got '${context.fabricType}'`,
      );
    }

    const component = (context.config?.component as string) ?? 'orchestrator';

    try {
      if (component === 'store') {
        return await this.resolver.resolveStore();
      }
      return await this.resolver.resolveOrchestrator();
    } catch (err) {
      return DataProcessResult.failure(
        'FACTORY_CREATE_ERROR',
        `FlowServiceFactory.createAsync failed for ${context.factoryId}: ${err}`,
      );
    }
  }

  async healthCheck(
    context: FactoryResolutionContext,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (context.fabricType !== FabricType.FLOW_ENGINE) {
      return DataProcessResult.failure(
        'WRONG_FABRIC',
        `FlowServiceFactory requires fabricType='${FabricType.FLOW_ENGINE}'`,
      );
    }

    try {
      const result = await this.resolver.resolve();
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          'HEALTH_CHECK_FAILED',
          `FLOW_ENGINE fabric unhealthy: ${result.errorMessage}`,
        );
      }
      return DataProcessResult.success({
        fabric: FabricType.FLOW_ENGINE,
        status: 'healthy',
        cached_providers: this.resolver.cachedProviders,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'HEALTH_CHECK_ERROR',
        `FLOW_ENGINE health check error: ${err}`,
      );
    }
  }
}
