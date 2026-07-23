/**
 * KernelModule — Foundation module for the entire XIIGen engine.
 *
 * Provides:
 * - DNA pattern primitives (DataProcessResult, ParseDocument, BuildSearchFilter, etc.)
 * - Multi-tenant core (TenantRegistry, TenantGuard, TenantContext, etc.)
 * - MicroserviceBase + DynamicController
 *
 * Every other module in the engine imports KernelModule.
 */

import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  providers: [],
  exports: [],
})
export class KernelModule {}
