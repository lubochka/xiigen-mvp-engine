/**
 * AfStationsModule — NestJS module for AF stations and pipeline.
 *
 * Provides:
 *   - AF station classes used for legacy tests + direct station access
 *   - AfPipeline (delegates to GenericNodeExecutor)
 *   - PipelineConfig
 *
 * The old sub-engines (InventoryEngine, SynthesisEngine, JudgmentEngine) and
 * af3-prompt-library have been retired. GenericNodeExecutor is the single path.
 *
 * Imports:
 *   - GuardrailsModule — for DnaPatternValidator, PromotionLadder, BFA
 *   - EngineModule     — provides GenericNodeExecutor for AfPipeline
 */

import { Module } from '@nestjs/common';
import { GuardrailsModule } from '../guardrails/guardrails.module';
import { EngineModule } from '../engine/engine.module';

// Stations
import { RagContextStation } from './af4-rag-context';
import { PlanningStation } from './af2-planning';
import { CodeReviewStation } from './af6-code-review';
import { SecurityStation } from './af8-security';
import { FeedbackStation } from './af11-feedback';

// Pipeline
import { AfPipeline } from './af-pipeline';
import { PipelineConfig } from './pipeline-config';
@Module({
  imports: [GuardrailsModule, EngineModule],
  providers: [
    RagContextStation,
    PlanningStation,
    CodeReviewStation,
    SecurityStation,
    FeedbackStation,
    AfPipeline,
    {
      provide: PipelineConfig,
      useFactory: () => PipelineConfig.default(),
    },
  ],
  exports: [
    RagContextStation,
    PlanningStation,
    CodeReviewStation,
    SecurityStation,
    FeedbackStation,
    AfPipeline,
    PipelineConfig,
  ],
})
export class AfStationsModule {}
