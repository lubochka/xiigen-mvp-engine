/**
 * DatabaseServiceFactory — bridges Factory Pattern (Layer 1) to DATABASE Fabric (Layer 0).
 *
 * Extends IExternalServiceFactory<IDatabaseService>.
 * createAsync() delegates to DatabaseFabricResolver.resolve(index).
 * Validates context.fabricType === DATABASE before delegation.
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
import { IDatabaseService } from '../interfaces/database.interface';
import { DatabaseFabricResolver } from './fabric-resolver';

@Injectable()
export class DatabaseServiceFactory extends IExternalServiceFactory<IDatabaseService> {
  static readonly FABRIC_TYPE = FabricType.DATABASE;
  static readonly FACTORY_ID = 'FABRIC_DATABASE';
  static readonly INTERFACE_NAME = 'IDatabaseService';

  constructor(private readonly resolver: DatabaseFabricResolver) {
    super();
  }

  /**
   * Resolve an IDatabaseService via the DATABASE fabric.
   * context.config.index is passed as the index hint to the resolver.
   */
  async createAsync(
    context: FactoryResolutionContext,
  ): Promise<DataProcessResult<IDatabaseService>> {
    // Validate fabric type
    if (context.fabricType !== FabricType.DATABASE) {
      return DataProcessResult.failure(
        'WRONG_FABRIC',
        `DatabaseServiceFactory requires fabricType='${FabricType.DATABASE}', ` +
          `got '${context.fabricType}'`,
      );
    }

    const index = context.config?.index as string | undefined;

    try {
      return await this.resolver.resolve(index);
    } catch (err) {
      return DataProcessResult.failure(
        'FACTORY_CREATE_ERROR',
        `DatabaseServiceFactory.createAsync failed for ${context.factoryId}: ${err}`,
      );
    }
  }

  /**
   * Health check delegates to the resolver.
   */
  async healthCheck(
    context: FactoryResolutionContext,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (context.fabricType !== FabricType.DATABASE) {
      return DataProcessResult.failure(
        'WRONG_FABRIC',
        `DatabaseServiceFactory requires fabricType='${FabricType.DATABASE}'`,
      );
    }

    try {
      const result = await this.resolver.resolve();
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          'HEALTH_CHECK_FAILED',
          `DATABASE fabric unhealthy: ${result.errorMessage}`,
        );
      }
      return DataProcessResult.success({
        fabric: FabricType.DATABASE,
        status: 'healthy',
        cached_providers: this.resolver.cachedProviders,
      });
    } catch (err) {
      return DataProcessResult.failure('HEALTH_CHECK_ERROR', `DATABASE health check error: ${err}`);
    }
  }
}
