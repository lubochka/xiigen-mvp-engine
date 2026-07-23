import { Module } from '@nestjs/common';
import { FabricsModule } from '../../../fabrics/fabrics.module';
import { CycleOutcomeClassifier } from './cycle-outcome-classifier.service';
import { RagQualityUpdater } from './rag-quality-updater.service';
import { DistilledRuleExtractor } from './distilled-rule-extractor.service';

@Module({
  imports: [FabricsModule],
  providers: [CycleOutcomeClassifier, RagQualityUpdater, DistilledRuleExtractor],
  exports: [CycleOutcomeClassifier, RagQualityUpdater, DistilledRuleExtractor],
})
export class RagQualityFeedbackPhaseBcModule {}
