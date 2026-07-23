/**
 * SecretsServiceFactory — bridges Factory Pattern (Layer 1) to SECRETS Fabric (Layer 0).
 *
 * Extends IExternalServiceFactory<ISecretsService>.
 * createAsync() delegates to SecretsFabricResolver.resolve(path).
 * Validates context.fabricType === SECRETS before delegation.
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
import { ISecretsService } from '../interfaces/secrets.interface';
import { SecretsFabricResolver } from './fabric-resolver';

@Injectable()
export class SecretsServiceFactory extends IExternalServiceFactory<ISecretsService> {
  static readonly FABRIC_TYPE = FabricType.SECRETS;
  static readonly FACTORY_ID = 'FABRIC_SECRETS';
  static readonly INTERFACE_NAME = 'ISecretsService';

  constructor(private readonly resolver: SecretsFabricResolver) {
    super();
  }

  /**
   * Resolve an ISecretsService via the SECRETS fabric.
   * context.config.path is passed as the path hint to the resolver.
   */
  async createAsync(
    context: FactoryResolutionContext,
  ): Promise<DataProcessResult<ISecretsService>> {
    if (context.fabricType !== FabricType.SECRETS) {
      return DataProcessResult.failure(
        'WRONG_FABRIC',
        `SecretsServiceFactory requires fabricType='${FabricType.SECRETS}', ` +
          `got '${context.fabricType}'`,
      );
    }

    const path = context.config?.path as string | undefined;

    try {
      return await this.resolver.resolve(path);
    } catch (err) {
      return DataProcessResult.failure(
        'FACTORY_CREATE_ERROR',
        `SecretsServiceFactory.createAsync failed for ${context.factoryId}: ${err}`,
      );
    }
  }

  async healthCheck(
    context: FactoryResolutionContext,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (context.fabricType !== FabricType.SECRETS) {
      return DataProcessResult.failure(
        'WRONG_FABRIC',
        `SecretsServiceFactory requires fabricType='${FabricType.SECRETS}'`,
      );
    }

    try {
      const result = await this.resolver.resolve();
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          'HEALTH_CHECK_FAILED',
          `SECRETS fabric unhealthy: ${result.errorMessage}`,
        );
      }
      return DataProcessResult.success({
        fabric: FabricType.SECRETS,
        status: 'healthy',
        cached_providers: this.resolver.cachedProviders,
      });
    } catch (err) {
      return DataProcessResult.failure('HEALTH_CHECK_ERROR', `SECRETS health check error: ${err}`);
    }
  }
}
