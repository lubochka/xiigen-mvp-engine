/**
 * TenantGuard — NestJS Guard that enforces tenant validation on every request.
 *
 * Flow:
 * 1. Reads X-Tenant-Id from request header
 * 2. Looks up tenant in TenantRegistry
 * 3. Validates tenant is active
 * 4. Blocks request if any check fails
 *
 * Works with TenantContextMiddleware which sets the TenantContext
 * into AsyncLocalStorage before this guard runs.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { TenantContext, TENANT_CONTEXT_KEY } from './tenant-context';

export const TENANT_HEADER = 'x-tenant-id';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly cls: ClsService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers?.[TENANT_HEADER] as string | undefined;

    // Step 1: Header must be present
    if (!tenantId || tenantId.trim() === '') {
      throw new HttpException(
        {
          is_success: false,
          error_code: 'TENANT_MISSING',
          error_message: `Header '${TENANT_HEADER}' is required`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Step 2: TenantContext must be in CLS (set by middleware)
    const tenantContext = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
    if (!tenantContext) {
      throw new HttpException(
        {
          is_success: false,
          error_code: 'TENANT_NOT_RESOLVED',
          error_message: `Tenant '${tenantId}' could not be resolved`,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Step 3: Tenant must be active
    if (!tenantContext.isActive) {
      throw new HttpException(
        {
          is_success: false,
          error_code: 'TENANT_INACTIVE',
          error_message: `Tenant '${tenantId}' is ${tenantContext.status}`,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Attach to request for @TenantId() decorator
    request['tenantContext'] = tenantContext;
    return true;
  }
}
