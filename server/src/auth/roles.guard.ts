/**
 * RolesGuard — FLOW-01 Phase A4 role-based access control guard.
 *
 * Enforces role requirements declared via @Roles() on controllers and handlers.
 * Reads the verified ScopeContext from CLS (written by ScopeEnrichmentInterceptor
 * after JwtAuthStrategy confirms the token). At least one declared role must
 * be present in ScopeContext.roles for the request to proceed (OR semantics).
 *
 * Failure taxonomy (all 403 FORBIDDEN):
 *
 *   NO_SCOPE       — ScopeContext absent; JwtAuthGuard likely didn't run first,
 *                    or the route is @Public() but still has @Roles() (wiring bug).
 *   INSUFFICIENT_ROLE — Scope present but none of the required roles match.
 *
 * Guard ordering note
 * -------------------
 * RolesGuard must run AFTER GlobalJwtAuthGuard (which verifies the token and
 * triggers ScopeEnrichmentInterceptor to write ScopeContext into CLS). At
 * route level this means:
 *
 *     @UseGuards(GlobalJwtAuthGuard, RolesGuard)   // correct ordering
 *
 * As an APP_GUARD it runs after GlobalJwtAuthGuard because GlobalJwtAuthGuard
 * is registered first in the providers array. NestJS executes APP_GUARDs in
 * registration order.
 *
 * @connectionType PROTOCOL_PERIPHERAL
 * @flowId FLOW-01
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';

import { ScopeContext, SCOPE_CONTEXT_KEY } from '../kernel/scope-isolation';
import { ROLES_KEY } from './roles.decorator';

/** Produce a 403 payload with stable error_code shape. */
function forbidden(code: string, message: string): HttpException {
  return new HttpException(
    { is_success: false, error_code: code, error_message: message },
    HttpStatus.FORBIDDEN,
  );
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      // Route didn't declare role requirements — pass through.
      return true;
    }

    const scope = this.cls.get<ScopeContext>(SCOPE_CONTEXT_KEY);
    if (!scope) {
      throw forbidden('NO_SCOPE', 'roles-guarded route reached without a verified principal');
    }

    const hasAtLeastOne = requiredRoles.some((role) => scope.hasRole(role));
    if (!hasAtLeastOne) {
      throw forbidden('INSUFFICIENT_ROLE', `one of [${requiredRoles.join(', ')}] required`);
    }

    return true;
  }
}
