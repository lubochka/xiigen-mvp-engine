/**
 * LocalAuthStrategy tests — FLOW-01 Phase A1.
 *
 * Adapter between passport-local and AuthService.validateCredentials.
 * On failure, must throw UnauthorizedException with the uniform shape.
 */

import { UnauthorizedException } from '@nestjs/common';

import { DataProcessResult } from '../../kernel/data-process-result';
import { AuthenticatedUser } from '../auth.dto';
import { AuthService } from '../auth.service';
import { LocalAuthStrategy } from '../local.strategy';

class StubAuthService {
  public lastCall?: { email: string; password: string };
  public response: DataProcessResult<AuthenticatedUser> = DataProcessResult.success({
    userId: 'u-1',
    email: 'alice@acme.test',
    tenantId: 'acme',
    roles: ['tenant-user'],
  });

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<DataProcessResult<AuthenticatedUser>> {
    this.lastCall = { email, password };
    return this.response;
  }
}

describe('LocalAuthStrategy', () => {
  let auth: StubAuthService;
  let strategy: LocalAuthStrategy;

  beforeEach(() => {
    auth = new StubAuthService();
    strategy = new LocalAuthStrategy(auth as unknown as AuthService);
  });

  it('returns the AuthenticatedUser when validateCredentials succeeds', async () => {
    const user = await strategy.validate('alice@acme.test', 'pw');
    expect(user.userId).toBe('u-1');
    expect(user.email).toBe('alice@acme.test');
    expect(auth.lastCall).toEqual({ email: 'alice@acme.test', password: 'pw' });
  });

  it('throws UnauthorizedException with error code when validateCredentials fails', async () => {
    auth.response = DataProcessResult.failure('INVALID_CREDENTIALS', 'rejected');
    await expect(strategy.validate('x@y.test', 'bad')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('surface failures carry the uniform INVALID_CREDENTIALS code', async () => {
    auth.response = DataProcessResult.failure('INVALID_CREDENTIALS', 'rejected');
    try {
      await strategy.validate('x@y.test', 'bad');
      fail('expected UnauthorizedException');
    } catch (e) {
      expect(e).toBeInstanceOf(UnauthorizedException);
      const resp = (e as UnauthorizedException).getResponse() as Record<string, unknown>;
      expect(resp['code']).toBe('INVALID_CREDENTIALS');
    }
  });
});
