/**
 * LocalAuthStrategy — FLOW-01 Phase A1.
 *
 * Passport-local adapter. Extracts `email` + `password` from the request body
 * and delegates credential validation to AuthService.
 *
 * Uniform failure semantics: any validateCredentials failure (not-found,
 * unverified, wrong password, cross-tenant) surfaces the same
 * UnauthorizedException to the caller — no field-level leak (FLOW-01-RAG-03).
 *
 * Strategy name: `local` → used via `@UseGuards(AuthGuard('local'))` on
 * POST /api/auth/login.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.dto';

@Injectable()
export class LocalAuthStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  /**
   * Passport contract: resolve on success, reject on failure.
   * DNA-3 adapter: AuthService returns DataProcessResult; we map failure→throw.
   */
  async validate(email: string, password: string): Promise<AuthenticatedUser> {
    const result = await this.authService.validateCredentials(email, password);
    if (!result.isSuccess || !result.data) {
      throw new UnauthorizedException({
        code: result.errorCode ?? 'INVALID_CREDENTIALS',
        message: 'credentials rejected',
      });
    }
    return result.data;
  }
}
