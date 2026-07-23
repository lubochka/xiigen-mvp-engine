/**
 * AuthController tests — FLOW-01 Phase A1.
 *
 * Unit-tests the three routes directly (not via HTTP):
 *   - login  : req.user (from AuthGuard('local')) → authService.login → DataProcessResult
 *   - refresh: body.token → authService.refresh
 *   - me     : req.user (from AuthGuard('jwt')) → DataProcessResult wrapped
 *
 * HTTP-level guard wiring is a boot-smoke concern covered by V-06 (Phase A4).
 */

import { UnauthorizedException } from '@nestjs/common';

import { DataProcessResult } from '../../kernel/data-process-result';
import { AuthController } from '../auth.controller';
import {
  AuthenticatedUser,
  JwtVerifiedPrincipal,
  LoginResponseDto,
} from '../auth.dto';
import { AuthService } from '../auth.service';

class StubAuthService {
  public loginResponse: DataProcessResult<LoginResponseDto> = DataProcessResult.success({
    token: 'jwt.new',
    expiresAt: 9_999,
    jti: 'jti-1',
    userId: 'u-1',
    roles: ['tenant-user'],
  });
  public refreshResponse: DataProcessResult<LoginResponseDto> = DataProcessResult.success({
    token: 'jwt.refreshed',
    expiresAt: 19_999,
    jti: 'jti-2',
    userId: 'u-1',
    roles: ['tenant-user'],
  });
  public lastLogin?: { email: string; password: string };
  public lastRefreshToken?: string;

  async login(
    email: string,
    password: string,
  ): Promise<DataProcessResult<LoginResponseDto>> {
    this.lastLogin = { email, password };
    return this.loginResponse;
  }
  async refresh(token: string): Promise<DataProcessResult<LoginResponseDto>> {
    this.lastRefreshToken = token;
    return this.refreshResponse;
  }
}

function authenticatedUser(): AuthenticatedUser {
  return {
    userId: 'u-1',
    email: 'alice@acme.test',
    tenantId: 'acme',
    roles: ['tenant-user'],
  };
}

function jwtPrincipal(): JwtVerifiedPrincipal {
  return {
    userId: 'u-1',
    tenantId: 'acme',
    roles: ['tenant-admin'],
    jti: 'jti-abc',
    expiresAt: 2_000_000,
  };
}

describe('AuthController', () => {
  let auth: StubAuthService;
  let controller: AuthController;

  beforeEach(() => {
    auth = new StubAuthService();
    controller = new AuthController(auth as unknown as AuthService);
  });

  describe('login', () => {
    it('delegates to AuthService.login using req.user.email + body.password', async () => {
      const req = { user: authenticatedUser() };
      const result = await controller.login(
        { email: 'alice@acme.test', password: 'pw' },
        req,
      );
      expect(result.isSuccess).toBe(true);
      expect(result.data?.token).toBe('jwt.new');
      expect(auth.lastLogin).toEqual({ email: 'alice@acme.test', password: 'pw' });
    });

    it('throws UnauthorizedException when req.user is missing', async () => {
      const req = {};
      await expect(
        controller.login({ email: 'x', password: 'y' }, req),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('delegates to AuthService.refresh with body.token', async () => {
      const result = await controller.refresh({ token: 'old.jwt' });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.token).toBe('jwt.refreshed');
      expect(auth.lastRefreshToken).toBe('old.jwt');
    });

    it('propagates failure from AuthService.refresh', async () => {
      auth.refreshResponse = DataProcessResult.failure('TOKEN_EXPIRED', 'expired');
      const result = await controller.refresh({ token: 'dead.jwt' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('TOKEN_EXPIRED');
    });
  });

  describe('me', () => {
    it('wraps req.user (the JWT-verified principal) in success', async () => {
      const req = { user: jwtPrincipal() };
      const result = await controller.me(req);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual(jwtPrincipal());
    });

    it('throws UnauthorizedException when req.user is missing', async () => {
      const req = {};
      await expect(controller.me(req)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
