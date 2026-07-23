/**
 * PasswordHasherServiceFactory tests — FLOW-01 Phase A0.5.
 *
 * Validates IExternalServiceFactory<IPasswordHasherService> contract.
 */

import { FabricType } from '../../../factories/fabric-type';
import { createResolutionContext } from '../../../factories/resolution-context';
import { PasswordHasherServiceFactory } from '../password-hasher-service.factory';
import { BcryptPasswordHasherProvider } from '../bcrypt-password-hasher.provider';

// bcryptjs with rounds=12 can take 2s+ per hash; under full-suite worker load the
// default 5s jest timeout is insufficient. Give each test 30s headroom.
jest.setTimeout(30000);

describe('PasswordHasherServiceFactory', () => {
  let provider: BcryptPasswordHasherProvider;
  let factory: PasswordHasherServiceFactory;

  beforeEach(() => {
    provider = new BcryptPasswordHasherProvider();
    factory = new PasswordHasherServiceFactory(provider);
  });

  it('static metadata: FABRIC_TYPE=auth, FACTORY_ID=FABRIC_AUTH_PASSWORD_HASHER, INTERFACE_NAME=IPasswordHasherService', () => {
    expect(PasswordHasherServiceFactory.FABRIC_TYPE).toBe(FabricType.AUTH);
    expect(PasswordHasherServiceFactory.FACTORY_ID).toBe('FABRIC_AUTH_PASSWORD_HASHER');
    expect(PasswordHasherServiceFactory.INTERFACE_NAME).toBe('IPasswordHasherService');
  });

  it('createAsync with wrong fabricType returns WRONG_FABRIC_TYPE', async () => {
    const ctx = createResolutionContext({
      tenantId: 'tenantA',
      factoryId: 'FABRIC_AUTH_PASSWORD_HASHER',
      interfaceName: 'IPasswordHasherService',
      fabricType: FabricType.SECRETS,
    });
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('WRONG_FABRIC_TYPE');
  });

  it('createAsync with AUTH fabricType returns the BcryptPasswordHasherProvider instance', async () => {
    const ctx = createResolutionContext({
      tenantId: 'tenantA',
      factoryId: 'FABRIC_AUTH_PASSWORD_HASHER',
      interfaceName: 'IPasswordHasherService',
      fabricType: FabricType.AUTH,
    });
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(provider);
  });

  it('healthCheck propagates provider health (bcryptjs healthy=true)', async () => {
    const ctx = createResolutionContext({
      tenantId: 'tenantA',
      factoryId: 'FABRIC_AUTH_PASSWORD_HASHER',
      interfaceName: 'IPasswordHasherService',
      fabricType: FabricType.AUTH,
    });
    const result = await factory.healthCheck(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({ provider: 'bcryptjs', healthy: true });
  });
});
