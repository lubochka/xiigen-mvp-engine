import { Module, forwardRef } from '@nestjs/common';
import { CalibrationRunner } from './calibration-runner.service';
import { OssCurriculumRunner } from './oss-curriculum-runner.service';
import { CalibrationController } from './calibration.controller';
import { CycleChainService } from '../cycle-chain.service';
import { PlannerHandler } from '../node-handlers/planner.handler';
import { ConvergenceHandler } from '../node-handlers/convergence.handler';
import { DepthDecisionHandler } from '../node-handlers/depth-decision.handler';
import { DatabaseModule } from '../../fabrics/database/database.module';
import { ScopePortabilityModule } from '../scope/scope-portability.module';
import { FreedomModule } from '../../freedom/freedom.module';
import { AiEngineModule } from '../../fabrics/ai-engine/ai-engine.module';
// P3: GraduationResolverService wired here so CalibrationRunner can call graduateTier()
import { GraduationResolverService } from '../graduation-resolver.service';
import { CurriculumPromotionService } from './curriculum-promotion.service';
// P4: CycleGateService wires SK-402 + SK-403 into CycleChainService post-cycle gate
import { CycleGateService } from '../cycle-gate.service';
import { TeachingRoundService } from '../teaching-round.service';

@Module({
  imports: [
    DatabaseModule,
    FreedomModule,
    AiEngineModule,
    forwardRef(() => ScopePortabilityModule),
  ],
  providers: [
    CalibrationRunner,
    OssCurriculumRunner,
    CycleChainService,
    PlannerHandler,
    ConvergenceHandler,
    DepthDecisionHandler,
    // P3: graduation trigger — threshold-based promotion from OssCurriculumRunner
    GraduationResolverService,
    CurriculumPromotionService,
    // P4: post-cycle safety gate (SK-402 spend-governor + SK-403 security-circuit-breaker)
    CycleGateService,
    // ConvergenceHandler dependency — N-round self-judge loop
    TeachingRoundService,
  ],
  controllers: [CalibrationController],
  exports: [
    CalibrationRunner,
    OssCurriculumRunner,
    GraduationResolverService,
    CurriculumPromotionService,
    CycleGateService,
  ],
})
export class CalibrationModule {}
