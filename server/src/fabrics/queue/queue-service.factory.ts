/**
 * QueueServiceFactory — bridges Factory Pattern (Layer 1) to QUEUE Fabric (Layer 0).
 *
 * Extends IExternalServiceFactory<IQueueService>.
 * createAsync() delegates to QueueFabricResolver.resolve(queueName).
 * Validates context.fabricType === QUEUE before delegation.
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
import { IQueueService } from '../interfaces/queue.interface';
import { QueueFabricResolver } from './fabric-resolver';

@Injectable()
export class QueueServiceFactory extends IExternalServiceFactory<IQueueService> {
  static readonly FABRIC_TYPE = FabricType.QUEUE;
  static readonly FACTORY_ID = 'FABRIC_QUEUE';
  static readonly INTERFACE_NAME = 'IQueueService';

  constructor(private readonly resolver: QueueFabricResolver) {
    super();
  }

  /**
   * Resolve an IQueueService via the QUEUE fabric.
   * context.config.queue_name is passed as the queue hint to the resolver.
   */
  async createAsync(context: FactoryResolutionContext): Promise<DataProcessResult<IQueueService>> {
    if (context.fabricType !== FabricType.QUEUE) {
      return DataProcessResult.failure(
        'WRONG_FABRIC',
        `QueueServiceFactory requires fabricType='${FabricType.QUEUE}', ` +
          `got '${context.fabricType}'`,
      );
    }

    const queueName = context.config?.queue_name as string | undefined;

    try {
      return await this.resolver.resolve(queueName);
    } catch (err) {
      return DataProcessResult.failure(
        'FACTORY_CREATE_ERROR',
        `QueueServiceFactory.createAsync failed for ${context.factoryId}: ${err}`,
      );
    }
  }

  async healthCheck(
    context: FactoryResolutionContext,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (context.fabricType !== FabricType.QUEUE) {
      return DataProcessResult.failure(
        'WRONG_FABRIC',
        `QueueServiceFactory requires fabricType='${FabricType.QUEUE}'`,
      );
    }

    try {
      const result = await this.resolver.resolve();
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          'HEALTH_CHECK_FAILED',
          `QUEUE fabric unhealthy: ${result.errorMessage}`,
        );
      }
      return DataProcessResult.success({
        fabric: FabricType.QUEUE,
        status: 'healthy',
        cached_providers: this.resolver.cachedProviders,
      });
    } catch (err) {
      return DataProcessResult.failure('HEALTH_CHECK_ERROR', `QUEUE health check error: ${err}`);
    }
  }
}
