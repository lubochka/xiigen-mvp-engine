import { Module } from '@nestjs/common';
import { FabricsModule } from '../../../fabrics/fabrics.module';
import { CurriculumTierAssigner } from './curriculum-tier-assigner.service';
import { ShadowRunOrchestrator } from './shadow-run-orchestrator.service';
import { LearningSignalCollector } from './learning-signal-collector.service';
import { CurriculumProgressTracker } from './curriculum-progress-tracker.service';

@Module({
  imports: [FabricsModule],
  providers: [
    CurriculumTierAssigner,
    ShadowRunOrchestrator,
    LearningSignalCollector,
    CurriculumProgressTracker,
  ],
  exports: [
    CurriculumTierAssigner,
    ShadowRunOrchestrator,
    LearningSignalCollector,
    CurriculumProgressTracker,
  ],
})
export class OssCurriculumModule {}
