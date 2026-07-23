/**
 * PasswordHasherServiceFactory — IExternalServiceFactory<IPasswordHasherService>.
 *
 * Rule 12: every external dependency resolved through createAsync().
 * A0.5 ships the BcryptPasswordHasherProvider as the sole concrete.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IExternalServiceFactory } from '../../factories/factory-interfaces';
import { FabricType } from '../../factories/fabric-type';
import { FactoryResolutionContext } from '../../factories/resolution-context';
import { IPasswordHasherService } from '../interfaces/password-hasher.service.interface';
import { BcryptPasswordHasherProvider } from './bcrypt-password-hasher.provider';

@Injectable()
export class PasswordHasherServiceFactory extends IExternalServiceFactory<IPasswordHasherService> {
  static readonly FABRIC_TYPE = FabricType.AUTH;
  static readonly FACTORY_ID = 'FABRIC_AUTH_PASSWORD_HASHER';
  static readonly INTERFACE_NAME = 'IPasswordHasherService';

  constructor(private readonly provider: BcryptPasswordHasherProvider) {
    super();
  }

  async createAsync(
    context: FactoryResolutionContext,
  ): Promise<DataProcessResult<IPasswordHasherService>> {
    if (context.fabricType !== FabricType.AUTH) {
      return DataProcessResult.failure(
        'WRONG_FABRIC_TYPE',
        `PasswordHasherServiceFactory expects fabricType=${FabricType.AUTH}, got ${context.fabricType}`,
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
        `PasswordHasherServiceFactory expects fabricType=${FabricType.AUTH}, got ${context.fabricType}`,
      );
    }
    const result = await this.provider.healthCheck();
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'HEALTH_CHECK_FAILED',
        result.errorMessage ?? 'health check failed',
      );
    }
    return DataProcessResult.success({ provider: 'bcryptjs', healthy: result.data });
  }
}
