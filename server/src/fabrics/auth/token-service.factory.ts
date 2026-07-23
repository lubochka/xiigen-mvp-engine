/**
 * TokenServiceFactory — IExternalServiceFactory<ITokenService>.
 *
 * Rule 12: every external dependency resolved through createAsync().
 * A0.5 ships the JwtTokenProvider as the sole concrete — provider choice is
 * config-time, not per-call. Future: RS256 asymmetric / KMS-backed variants.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IExternalServiceFactory } from '../../factories/factory-interfaces';
import { FabricType } from '../../factories/fabric-type';
import { FactoryResolutionContext } from '../../factories/resolution-context';
import { ITokenService } from '../interfaces/token.service.interface';
import { JwtTokenProvider } from './jwt-token.provider';

@Injectable()
export class TokenServiceFactory extends IExternalServiceFactory<ITokenService> {
  static readonly FABRIC_TYPE = FabricType.AUTH;
  static readonly FACTORY_ID = 'FABRIC_AUTH_TOKEN';
  static readonly INTERFACE_NAME = 'ITokenService';

  constructor(private readonly provider: JwtTokenProvider) {
    super();
  }

  async createAsync(context: FactoryResolutionContext): Promise<DataProcessResult<ITokenService>> {
    if (context.fabricType !== FabricType.AUTH) {
      return DataProcessResult.failure(
        'WRONG_FABRIC_TYPE',
        `TokenServiceFactory expects fabricType=${FabricType.AUTH}, got ${context.fabricType}`,
      );
    }
    return DataProcessResult.success(this.provider);
  }

  async healthCheck(
    context: FactoryResolutionContext,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (context.fabricType !== FabricType.AUTH) {
      return DataProcessResult.failure(
        'WRONG_FABRIC_TYPE',
        `TokenServiceFactory expects fabricType=${FabricType.AUTH}, got ${context.fabricType}`,
      );
    }
    const result = await this.provider.healthCheck();
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'HEALTH_CHECK_FAILED',
        result.errorMessage ?? 'health check failed',
      );
    }
    return DataProcessResult.success({ provider: 'jwt', healthy: result.data });
  }
}
