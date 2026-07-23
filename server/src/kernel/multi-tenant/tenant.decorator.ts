/**
 * @TenantId() — NestJS parameter decorator.
 * Reads tenantId from TenantContext on the request.
 * Services never parse headers directly.
 *
 * Usage:
 *   @Get('something')
 *   async doSomething(@TenantId() tenantId: string) { ... }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from './tenant-context';

export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const tenantContext: TenantContext | undefined = request['tenantContext'];
  if (!tenantContext) {
    throw new Error('@TenantId() used without TenantGuard — tenantContext not found on request');
  }
  return tenantContext.tenantId;
});

/**
 * @CurrentTenant() — returns the full TenantContext, not just the ID.
 * Use when you need plan info, config overrides, or API keys.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext: TenantContext | undefined = request['tenantContext'];
    if (!tenantContext) {
      throw new Error(
        '@CurrentTenant() used without TenantGuard — tenantContext not found on request',
      );
    }
    return tenantContext;
  },
);
