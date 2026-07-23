/**
 * MultiTenantModule — Wires all tenant management components.
 *
 * Provides: TenantRegistry, TenantGuard, TenantContextMiddleware
 * Exports: All of the above for use by other modules.
 */

import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { TenantRegistry } from './tenant-registry.service';
import { TenantGuard } from './tenant.guard';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { SubdomainTenantMiddleware } from './subdomain-tenant.middleware';
import { ByokKeyStoreService } from './byok-key-store.service';
import { TenantContextResolver } from './tenant-context.resolver';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      middleware: { mount: true },
    }),
  ],
  providers: [TenantRegistry, TenantGuard, ByokKeyStoreService, TenantContextResolver],
  exports: [TenantRegistry, TenantGuard, ClsModule, ByokKeyStoreService, TenantContextResolver],
})
export class MultiTenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SubdomainTenantMiddleware, TenantContextMiddleware).forRoutes('*');
  }
}
