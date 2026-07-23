/**
 * FreedomModule — NestJS module for FREEDOM config infrastructure.
 *
 * Provides:
 *   - FreedomConfigManager (tenant-scoped config CRUD)
 *   - ConfigBuilder (resolves $secret: and $env: references)
 *
 * Phase 7.5: Module wiring.
 */

import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { FreedomConfigManager } from './config-manager';
import { ConfigBuilder } from './config-builder';
import { FREEDOM_CONFIG_SERVICE } from './freedom-config.interface';

@Module({
  // ClsModule supplies ClsService used by FreedomConfigManager.get() to read
  // tenantId from AsyncLocalStorage (DNA-5). The owning app registers
  // ClsModule.forRoot({ global: true }) at boot; this import makes the
  // dependency explicit so FreedomModule can be consumed standalone in tests.
  imports: [ClsModule],
  providers: [
    FreedomConfigManager,
    ConfigBuilder,
    // Bind the Symbol token so services that inject FREEDOM_CONFIG_SERVICE
    // receive the FreedomConfigManager instance (retroactive-development: engine fix)
    {
      provide: FREEDOM_CONFIG_SERVICE,
      useExisting: FreedomConfigManager,
    },
  ],
  exports: [FreedomConfigManager, ConfigBuilder, FREEDOM_CONFIG_SERVICE],
})
export class FreedomModule {}
