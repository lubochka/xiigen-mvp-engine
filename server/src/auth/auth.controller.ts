/**
 * AuthController — FLOW-01 Phase A1.
 *
 * REST endpoints under /api/auth:
 *   POST /api/auth/login    — local guard validates credentials → issues JWT
 *   POST /api/auth/refresh  — verifies + re-issues a fresh JWT
 *   GET  /api/auth/me       — jwt guard attaches verified principal → returns it
 *
 * TenantContextMiddleware is globally applied in AppModule, so the tenantId
 * is already in CLS by the time the guard/controller run.
 *
 * All responses are Record<string, unknown> (DNA-1). All business failures
 * propagate through DataProcessResult → HTTP 200-with-failure payload for
 * consistency with the rest of the engine.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { DataProcessResult } from '../kernel/data-process-result';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import {
  LoginRequestDto,
  LoginResponseDto,
  RefreshRequestDto,
  AuthenticatedUser,
  JwtVerifiedPrincipal,
} from './auth.dto';

interface RequestWithUser<U> {
  user?: U;
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login.
   *
   * LocalAuthStrategy runs first (via AuthGuard('local')), validating the
   * credentials and attaching AuthenticatedUser to req.user. We then issue a
   * fresh token for that user.
   */
  @Post('login')
  @Public()
  @UseGuards(AuthGuard('local'))
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() _body: LoginRequestDto,
    @Req() req: RequestWithUser<AuthenticatedUser>,
  ): Promise<DataProcessResult<LoginResponseDto>> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    }
    // Credentials already validated by LocalAuthStrategy — issue tokens directly.
    // This avoids a second hash compare round-trip under parallel load.
    return this.authService.login(user.email, _body.password);
  }

  /**
   * POST /api/auth/refresh.
   *
   * Accepts a valid JWT (not yet expired) and returns a freshly issued one
   * with new jti + exp. Subject + roles + custom claims are preserved.
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshRequestDto): Promise<DataProcessResult<LoginResponseDto>> {
    return this.authService.refresh(body.token);
  }

  /**
   * GET /api/auth/me.
   *
   * Returns the decoded principal for the supplied bearer token. Requires a
   * valid token — JwtAuthStrategy rejects anything else with 401 via passport.
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async me(
    @Req() req: RequestWithUser<JwtVerifiedPrincipal>,
    @Headers('authorization') _authHeader?: string,
  ): Promise<DataProcessResult<JwtVerifiedPrincipal>> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID' });
    }
    return DataProcessResult.success(user);
  }
}
