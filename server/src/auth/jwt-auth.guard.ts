/**
 * GlobalJwtAuthGuard — FLOW-01 Phase A4 (V-06).
 *
 * Wraps `@nestjs/passport`'s `AuthGuard('jwt')` so it can be registered as a
 * global APP_GUARD while still allowing specific routes to opt out via the
 * `@Public()` decorator.
 *
 * Execution flow
 * --------------
 * 1. Guard's `canActivate()` runs on EVERY incoming HTTP request (global tier).
 * 2. It reads the IS_PUBLIC_KEY metadata from BOTH the handler and its class
 *    (handler metadata overrides class metadata — allows one-off public
 *    methods on an otherwise-guarded controller).
 * 3. If the route is marked `@Public()` → returns `true` immediately.
 * 4. Otherwise → delegates to the base `AuthGuard('jwt')` which invokes
 *    JwtAuthStrategy.authenticate(). Behaviour is identical to
 *    `@UseGuards(AuthGuard('jwt'))` at route level: success populates
 *    `req.user`, failure throws UnauthorizedException.
 *
 * Why extend AuthGuard('jwt') rather than reimplement
 * ---------------------------------------------------
 * - Keeps the passport strategy + mixin plumbing intact.
 * - Inherits @nestjs/passport's option surface (callback handling, err
 *   mapping) without duplicating it.
 * - Tests can stub `canActivate` on the parent for unit coverage and rely on
 *   a full integration test to verify the Reflector / strategy chain.
 *
 * Why IS_PUBLIC_KEY override semantics
 * ------------------------------------
 * Handler-level @Public() MUST override class-level enforcement so a
 * controller that's 99 % guarded can declare one public method (e.g. an
 * OAuth callback nested under /api/account). `getAllAndOverride([handler,
 * class])` gives us exactly that: handler takes precedence, class is the
 * fallback.
 *
 * @connectionType PROTOCOL_PERIPHERAL
 * @flowId FLOW-01
 */

import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class GlobalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
