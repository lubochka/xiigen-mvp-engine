import { Module } from '@nestjs/common';
import { FabricsModule } from '../../../fabrics/fabrics.module';
import { StackCouplingAuditor } from './stack-coupling-auditor.service';
import { HybridGenesisPromptBuilder } from './hybrid-genesis-prompt-builder.service';
import { StackCompatibilityReporter } from './stack-compatibility-reporter.service';
import { StackPortingOrchestrator } from './stack-porting-orchestrator.service';

@Module({
  imports: [FabricsModule],
  providers: [
    StackCouplingAuditor,
    HybridGenesisPromptBuilder,
    StackCompatibilityReporter,
    StackPortingOrchestrator,
  ],
  exports: [
    StackCouplingAuditor,
    HybridGenesisPromptBuilder,
    StackCompatibilityReporter,
    StackPortingOrchestrator,
  ],
})
export class EngineSelfAwarenessPhasesBEModule {}
