/**
 * AiServiceFactory — bridges Factory Pattern (Layer 1) to AI_ENGINE Fabric (Layer 0).
 *
 * Extends IExternalServiceFactory<IAiProvider>.
 * createAsync() delegates to AiFabricResolver.resolve(modelId).
 * Validates context.fabricType === AI_ENGINE before delegation.
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
import { IAiProvider } from '../interfaces/ai-provider.interface';
import { AiFabricResolver } from './fabric-resolver';

@Injectable()
export class AiServiceFactory extends IExternalServiceFactory<IAiProvider> {
  static readonly FABRIC_TYPE = FabricType.AI_ENGINE;
  static readonly FACTORY_ID = 'FABRIC_AI_ENGINE';
  static readonly INTERFACE_NAME = 'IAiProvider';

  constructor(private readonly resolver: AiFabricResolver) {
    super();
  }

  /**
   * Resolve an IAiProvider via the AI_ENGINE fabric.
   * context.config.model_id is passed as the model hint to the resolver.
   */
  async createAsync(context: FactoryResolutionContext): Promise<DataProcessResult<IAiProvider>> {
    if (context.fabricType !== FabricType.AI_ENGINE) {
      return DataProcessResult.failure(
        'WRONG_FABRIC',
        `AiServiceFactory requires fabricType='${FabricType.AI_ENGINE}', ` +
          `got '${context.fabricType}'`,
      );
    }

    const modelId = context.config?.model_id as string | undefined;

    try {
      return await this.resolver.resolve(modelId);
    } catch (err) {
      return DataProcessResult.failure(
        'FACTORY_CREATE_ERROR',
        `AiServiceFactory.createAsync failed for ${context.factoryId}: ${err}`,
      );
    }
  }

  async healthCheck(
    context: FactoryResolutionContext,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (context.fabricType !== FabricType.AI_ENGINE) {
      return DataProcessResult.failure(
        'WRONG_FABRIC',
        `AiServiceFactory requires fabricType='${FabricType.AI_ENGINE}'`,
      );
    }

    try {
      const result = await this.resolver.resolve();
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          'HEALTH_CHECK_FAILED',
          `AI_ENGINE fabric unhealthy: ${result.errorMessage}`,
        );
      }
      return DataProcessResult.success({
        fabric: FabricType.AI_ENGINE,
        status: 'healthy',
        cached_providers: this.resolver.cachedProviders,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'HEALTH_CHECK_ERROR',
        `AI_ENGINE health check error: ${err}`,
      );
    }
  }
}
