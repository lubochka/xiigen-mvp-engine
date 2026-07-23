/**
 * InfrastructureModule — wires the operational support layer:
 *   FlowLifecycleManagerService, TenantProvisionerService,
 *   OutboxRelayService, BfaCrossFlowValidator.
 *
 * Also re-exports the FlowApiController service so that
 * FlowHttpController (in ApiModule) can be built on top of it.
 *
 * POST /api/promotion/promote is wired via FlowHttpController (S21),
 * which lives in ApiModule and imports this module.
 *
 * S20: Infrastructure module wiring.
 */

import { Module } from '@nestjs/common';
import { FlowLifecycleManagerService } from './flow-lifecycle-manager.service';
import { TenantProvisionerService } from './tenant-provisioner.service';
import { OutboxRelayService } from './outbox-relay.service';
import { BfaCrossFlowValidator } from '../guardrails/bfa-cross-flow-validator';
import { FlowApiController } from '../api/flow-api.controller';
import { EngineModule } from './engine.module';

@Module({
  imports: [EngineModule],
  providers: [
    FlowLifecycleManagerService,
    TenantProvisionerService,
    OutboxRelayService,
    BfaCrossFlowValidator,
    // FlowApiController is an @Injectable service (not a @Controller).
    // It aggregates executor, promptLibrary, snapshotService, and ladder.
    FlowApiController,
  ],
  exports: [
    EngineModule, // re-export entire EngineModule so ApiModule sees all EngineModule exports
    FlowLifecycleManagerService,
    TenantProvisionerService,
    OutboxRelayService,
    BfaCrossFlowValidator,
    FlowApiController,
  ],
})
export class InfrastructureModule {}
