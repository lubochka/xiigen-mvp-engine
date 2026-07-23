import { Module } from '@nestjs/common';
import { FabricsModule } from '../../../fabrics/fabrics.module';
import { DpoToRagPromoter } from './dpo-to-rag-promoter.service';
import { RagQualitySeedsService } from './rag-quality-seeds.service';

@Module({
  imports: [FabricsModule],
  providers: [DpoToRagPromoter, RagQualitySeedsService],
  exports: [DpoToRagPromoter, RagQualitySeedsService],
})
export class RagQualityFeedbackPhaseAModule {}
