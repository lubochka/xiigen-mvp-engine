/**
 * AppModule — Root NestJS module wiring all 11 phases of XIIGen.
 *
 * Phase 1: KernelModule + MultiTenantModule (DNA patterns, tenant management)
 * Phase 2: FabricsModule (6 fabric interfaces + providers)
 * Phase 3–5: (included in FabricsModule: Database, Queue, AI, RAG, Secrets)
 * Phase 6: FactoriesModule + EngineContractsModule
 * Phase 7: GuardrailsModule + FreedomModule (BFA, DNA, Promotion, FREEDOM)
 * Phase 8: AfStationsModule (11 AF stations, 3 sub-engines, pipeline)
 * Phase 9: EngineModule + BootstrapModule + ApiModule
 * Phase 10: React.js Client (separate project)
 * Phase 11: RagInitModule + DocGenModule (RAG ingestion + doc generation)
 *
 * S22: Added ScheduleModule.forRoot() (required for @Cron decorators to fire)
 *      and InfrastructureModule + OutboxSchedulerService.
 */

import { Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { KernelModule } from './kernel/kernel.module';
import { MultiTenantModule } from './kernel/multi-tenant/multi-tenant.module';
import { FabricsModule } from './fabrics/fabrics.module';
import { FactoriesModule } from './factories/factories.module';
import { EngineContractsModule } from './engine-contracts/engine-contracts.module';
import { GuardrailsModule } from './guardrails/guardrails.module';
import { FreedomModule } from './freedom/freedom.module';
import { AfStationsModule } from './af-stations/af-stations.module';
import { EngineModule } from './engine/engine.module';
import { InfrastructureModule } from './engine/infrastructure.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { ApiModule } from './api/api.module';
import { RagInitModule } from './rag-init/rag-init.module';
import { DocGenModule } from './doc-gen/doc-gen.module';
import { LearningModule } from './learning/learning.module';
import { AuthModule } from './auth/auth.module';
import { GlobalJwtAuthGuard, RolesGuard, ScopeEnrichmentInterceptor } from './auth';
import { OutboxSchedulerService } from './engine/outbox-scheduler.service';
import { EngineBootstrapper } from './bootstrap/engine-bootstrapper';

@Module({
  imports: [
    // S22: ScheduleModule must be registered FIRST for @Cron decorators to fire
    ScheduleModule.forRoot(),
    // Phase 1: Kernel + Multi-Tenant
    KernelModule,
    MultiTenantModule,
    // Phase 2–5: Fabrics (Database, Queue, AI Engine, RAG, Secrets, Flow Engine)
    FabricsModule,
    // Phase 6: Factories + Engine Contracts
    FactoriesModule,
    EngineContractsModule,
    // Phase 7: Guardrails (BFA, DNA, Promotion) + FREEDOM Config
    GuardrailsModule,
    FreedomModule,
    // Phase 8: AF Stations (11 stations, 3 sub-engines, pipeline)
    AfStationsModule,
    // Phase 9: Engine + Infrastructure + Bootstrap + API
    EngineModule,
    InfrastructureModule,
    BootstrapModule,
    ApiModule,
    // Phase 11: RAG Ingestion + Doc Generation
    RagInitModule,
    DocGenModule,
    // Phase 12: Learning & Feedback Loop
    LearningModule,
    // FLOW-01 Phase A1: Platform Auth foundation (AuthService extends MicroserviceBase,
    // AuthController exposes /api/auth/{login,refresh,me}, plus local+jwt strategies).
    // Depends on AuthFabricModule (global) shipped in A0.5.
    AuthModule,
  ],
  providers: [
    // S22: OutboxSchedulerService uses @Cron — must be a provider in the root module
    OutboxSchedulerService,
    // WRITE-TIME-2: EngineBootstrapper seeds ES indices + flow registry on startup.
    // FlowRegistryService is exported by EngineModule (imported above).
    EngineBootstrapper,
    // FLOW-01 Phase A4 (V-06) + Phase B1 remediation (DEV-115, 2026-04-25).
    //
    // APP_INTERCEPTOR wiring: ScopeEnrichmentInterceptor provides a defensive
    // secondary write of ScopeContext into CLS, covering auth paths that
    // don't flow through JwtAuthStrategy (future SSO / API-key strategies,
    // HTTP tests that set req.user directly, custom middleware). The primary
    // ScopeContext write happens in JwtAuthStrategy.authenticate() on success
    // (Phase A4). Double-writes are idempotent.
    //
    // MasterTenantGuard is NOT registered here as APP_GUARD. Phase B1
    // integration testing (42-cell HTTP auth matrix) proved the global-guard
    // placement cannot work: NestJS runs global APP_GUARDs BEFORE route-level
    // guards, so MasterTenantGuard would run before AuthGuard('jwt') could
    // populate ScopeContext — the scope would always be missing and every
    // master-tenant-only request would fail with NO_SCOPE 403. The guard is
    // instead intended to be applied at the route level alongside the JWT
    // guard in guaranteed order, e.g.:
    //
    //     @UseGuards(AuthGuard('jwt'), MasterTenantGuard)
    //     @MasterTenantOnly()
    //     @Get('/governance/bfa-rules')
    //     readRules() { ... }
    //
    // NestJS runs multi-guard @UseGuards() in declaration order, so
    // AuthGuard('jwt') populates ScopeContext via JwtAuthStrategy first,
    // then MasterTenantGuard reads it. This is the only ordering that
    // produces correct semantics for the @MasterTenantOnly enforcement.
    //
    // No production routes currently use @MasterTenantOnly (it ships as
    // infrastructure for future cross-tenant governance, BFA, DNA scan, and
    // plugin-adapter endpoints), so removing the APP_GUARD registration is
    // a no-op for existing behaviour.
    { provide: APP_INTERCEPTOR, useClass: ScopeEnrichmentInterceptor },
    // FLOW-01 Phase A4 — auth posture flip: every NestJS @Controller route requires
    // a valid JWT unless the handler or class is decorated with @Public().
    // Raw Express routes registered in main.ts bypass NestJS guards entirely.
    { provide: APP_GUARD, useClass: GlobalJwtAuthGuard },
    // FLOW-01 Phase A4 — role enforcement: routes decorated with @Roles() enforce
    // the declared role set. Pass-through when @Roles() is absent. Runs after
    // GlobalJwtAuthGuard because JwtAuthStrategy.authenticate() writes ScopeContext
    // to CLS before calling success() — CLS is ready by the time RolesGuard runs.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly engineBootstrapper: EngineBootstrapper) {}

  async onModuleInit(): Promise<void> {
    await this.engineBootstrapper.bootstrap();
  }
}
