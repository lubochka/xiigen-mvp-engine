/**
 * TokenServiceFactory tests — FLOW-01 Phase A0.5.
 *
 * Validates IExternalServiceFactory<ITokenService> contract: fabricType gating +
 * createAsync returns JwtTokenProvider + healthCheck propagates provider health.
 */

import { ClsService } from 'nestjs-cls';

import { DataProcessResult } from '../../../kernel/data-process-result';
import { FabricType } from '../../../factories/fabric-type';
import { createResolutionContext } from '../../../factories/resolution-context';
import { ISecretsService } from '../../interfaces/secrets.interface';
import { TokenServiceFactory } from '../token-service.factory';
import { JwtTokenProvider } from '../jwt-token.provider';

class MinimalCls {
  get<T>(_key: string): T | undefined {
    return undefined;
  }
}

class MinimalSecrets implements Partial<ISecretsService> {
  async getSecret(): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.failure('SECRET_NOT_FOUND', 'not seeded');
  }
  async setSecret(): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.failure('NOT_IMPL', '');
  }
  async deleteSecret(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.failure('NOT_IMPL', '');
  }
  async listSecrets(): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    return DataProcessResult.failure('NOT_IMPL', '');
  }
  async healthCheck(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(true);
  }
}

describe('TokenServiceFactory', () => {
  let provider: JwtTokenProvider;
  let factory: TokenServiceFactory;

  beforeEach(() => {
    provider = new JwtTokenProvider(
      new MinimalCls() as unknown as ClsService,
      new MinimalSecrets() as unknown as ISecretsService,
    );
    factory = new TokenServiceFactory(provider);
  });

  it('static metadata: FABRIC_TYPE=auth, FACTORY_ID=FABRIC_AUTH_TOKEN, INTERFACE_NAME=ITokenService', () => {
    expect(TokenServiceFactory.FABRIC_TYPE).toBe(FabricType.AUTH);
    expect(TokenServiceFactory.FACTORY_ID).toBe('FABRIC_AUTH_TOKEN');
    expect(TokenServiceFactory.INTERFACE_NAME).toBe('ITokenService');
  });

  it('createAsync with wrong fabricType returns WRONG_FABRIC_TYPE', async () => {
    const ctx = createResolutionContext({
      tenantId: 'tenantA',
      factoryId: 'FABRIC_AUTH_TOKEN',
      interfaceName: 'ITokenService',
      fabricType: FabricType.DATABASE,
    });
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('WRONG_FABRIC_TYPE');
  });

  it('createAsync with AUTH fabricType returns the JwtTokenProvider instance', async () => {
    const ctx = createResolutionContext({
      tenantId: 'tenantA',
      factoryId: 'FABRIC_AUTH_TOKEN',
      interfaceName: 'ITokenService',
      fabricType: FabricType.AUTH,
    });
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(provider);
  });

  it('healthCheck propagates provider health (jwt healthy=true)', async () => {
    const ctx = createResolutionContext({
      tenantId: 'tenantA',
      factoryId: 'FABRIC_AUTH_TOKEN',
      interfaceName: 'ITokenService',
      fabricType: FabricType.AUTH,
    });
    const result = await factory.healthCheck(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({ provider: 'jwt', healthy: true });
  });
});
