/**
 * RagServiceFactory — bridges Factory Pattern (Layer 1) to RAG Fabric (Layer 0).
 *
 * Extends IExternalServiceFactory<IRagService>.
 * createAsync() delegates to RagFabricResolver.resolve(namespace).
 * Validates context.fabricType === RAG before delegation.
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
import { IRagService } from '../interfaces/rag.interface';
import { RagFabricResolver } from './fabric-resolver';

@Injectable()
export class RagServiceFactory extends IExternalServiceFactory<IRagService> {
  static readonly FABRIC_TYPE = FabricType.RAG;
  static readonly FACTORY_ID = 'FABRIC_RAG';
  static readonly INTERFACE_NAME = 'IRagService';

  constructor(private readonly resolver: RagFabricResolver) {
    super();
  }

  /**
   * Resolve an IRagService via the RAG fabric.
   * context.config.namespace is passed as the namespace hint to the resolver.
   */
  async createAsync(context: FactoryResolutionContext): Promise<DataProcessResult<IRagService>> {
    if (context.fabricType !== FabricType.RAG) {
      return DataProcessResult.failure(
        'WRONG_FABRIC',
        `RagServiceFactory requires fabricType='${FabricType.RAG}', ` +
          `got '${context.fabricType}'`,
      );
    }

    const namespace = context.config?.namespace as string | undefined;

    try {
      return await this.resolver.resolve(namespace);
    } catch (err) {
      return DataProcessResult.failure(
        'FACTORY_CREATE_ERROR',
        `RagServiceFactory.createAsync failed for ${context.factoryId}: ${err}`,
      );
    }
  }

  async healthCheck(
    context: FactoryResolutionContext,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (context.fabricType !== FabricType.RAG) {
      return DataProcessResult.failure(
        'WRONG_FABRIC',
        `RagServiceFactory requires fabricType='${FabricType.RAG}'`,
      );
    }

    try {
      const result = await this.resolver.resolve();
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          'HEALTH_CHECK_FAILED',
          `RAG fabric unhealthy: ${result.errorMessage}`,
        );
      }
      return DataProcessResult.success({
        fabric: FabricType.RAG,
        status: 'healthy',
        cached_providers: this.resolver.cachedProviders,
      });
    } catch (err) {
      return DataProcessResult.failure('HEALTH_CHECK_ERROR', `RAG health check error: ${err}`);
    }
  }
}
