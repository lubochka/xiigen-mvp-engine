/**
 * ApiModule — NestJS module for all HTTP API controllers.
 *
 * Provides:
 *   HealthController, TenantController — existing controllers
 *   FlowHttpController                — S21: engine HTTP endpoints
 *
 * Imports:
 *   BootstrapModule        — for HealthReporter
 *   InfrastructureModule   — provides FlowApiController (the @Injectable service)
 *                            which FlowHttpController delegates to.
 *
 * S21: Full API module wiring.
 */

import { Module } from '@nestjs/common';
import { BootstrapModule } from '../bootstrap/bootstrap.module';
import { InfrastructureModule } from '../engine/infrastructure.module';
import { FreedomModule } from '../freedom/freedom.module';
import { HealthController } from './health.controller';
import { TenantController } from './tenant.controller';
import { TenantHttpController } from './tenant-http.controller';
import { KeyStatusController } from './key-status.controller';
import { FlowHttpController } from './flow-http.controller';
import { EngineProgressController } from './engine-progress.controller';
// GAP-1: external entry point for Cycle 1-3 chain
import { CycleChainController } from './cycle-chain.controller';
// GAP-V-03: CYCLE-4 PENDING_IMPLEMENTATION query + update endpoint
import { Cycle4Controller } from './cycle4.controller';
// GAP-2: per-node visibility records queryable by runId
import { CycleVisibilityController } from './cycle-visibility.controller';
// Phase 3: topology contract API + run state for TopologyViewer
import { TopologyController } from './topology.controller';
// Track 0 Turn 5 (v13 Finding Q): per-tenant flow definition CRUD + mapper.
import { FlowDefinitionsController } from './flow-definitions.controller';
import { FlowDefinitionsMapper } from './flow-definitions.mapper';
// Track 0 Turn 7 (v22 Finding CC): topology response mapper (TenantTopology → TopologyContract).
import { TopologyResponseMapper } from './topology-response.mapper';
// Track 0 Turn 12 (Track 2): sharable flow marketplace — publish/browse/install.
import { MarketplacePackageController } from './marketplace-package.controller';
// Track 0 Turn 15: FLOW-18 visual flow engine thin HTTP surface + provider module.
import { VisualFlowEngineController } from './visual-flow-engine.controller';
import { VisualFlowEngineModule } from '../engine/flows/visual-flow-engine/visual-flow-engine.module';
import { ForkFlowModule } from '../engine/flows/module-lifecycle/fork-flow.module';
// FLOW-47 Turn 5 (T661): platform-level tenant provisioning controller.
import { TenantProvisioningController } from './tenant-provisioning.controller';
// FLOW-46 Phase B: Platform Agent (Super Engine Assistant) HTTP surface.
import { AgentController } from './agent.controller';
// FLOW-47 Turn 5 — needs TenantProvisionerService from InfrastructureModule
// (already imported above via the existing imports list).

@Module({
  // Track 0 Turn 15: VisualFlowEngineModule exports T617-T620 so the controller can inject them.
  imports: [
    BootstrapModule,
    InfrastructureModule,
    FreedomModule,
    VisualFlowEngineModule,
    ForkFlowModule,
  ],
  // HealthController + TenantController are @Injectable() services — they live in providers.
  // FlowHttpController + EngineProgressController + CycleChainController + TenantHttpController are @Controllers.
  controllers: [
    FlowHttpController,
    EngineProgressController,
    CycleChainController,
    TenantHttpController,
    KeyStatusController,
    Cycle4Controller,
    CycleVisibilityController,
    TopologyController,
    // Track 0 Turn 5: per-tenant flow definition CRUD
    FlowDefinitionsController,
    // Track 0 Turn 12 (Track 2): sharable flow marketplace
    MarketplacePackageController,
    // Track 0 Turn 15 (v13 Finding Q): FLOW-18 visual flow engine thin routes
    VisualFlowEngineController,
    // FLOW-47 Turn 5 (T661): POST /api/tenants/provision
    TenantProvisioningController,
    // FLOW-46 Phase B: POST /api/agent/run + GET /api/agent/sessions/:id
    AgentController,
  ],
  providers: [
    HealthController,
    TenantController,
    // Track 0 Turn 5: FlowDefinitionsMapper (injected by FlowDefinitionsController)
    FlowDefinitionsMapper,
    // Track 0 Turn 7 (v22 Finding CC): TopologyResponseMapper (injected by TopologyController)
    TopologyResponseMapper,
  ],
  exports: [HealthController, TenantController],
})
export class ApiModule {}
