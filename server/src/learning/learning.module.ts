/**
 * LearningModule — NestJS module for the AI Learning & Feedback Loop.
 *
 * Provides all learning services from P12.1–P12.4:
 *   - PersistentFeedbackStore, RealCodeQualityScorer
 *   - ModelPreferenceTracker, ModelSelectionStrategy, DispatcherIntegration
 *   - PromptVersionStore, PromptAbTester, PromptEvolver
 *   - RagQualityTracker, RagWeightIntegrator
 *
 * Exports: All services (consumed by AfStationsModule, EngineModule, API).
 *
 * Phase 12.5: Module wiring.
 */

import { Module } from '@nestjs/common';
import { PersistentFeedbackStore } from './feedback-store';
import { RealCodeQualityScorer } from './quality-scorer';
import { ModelPreferenceTracker } from './model-preference';
import { ModelSelectionStrategy } from './model-selection';
import { DispatcherIntegration } from './dispatcher-integration';
import { PromptVersionStore } from './prompt-version-store';
import { PromptAbTester } from './prompt-ab-tester';
import { PromptEvolver } from './prompt-evolver';
import { RagQualityTracker } from './rag-quality-tracker';
import { RagWeightIntegrator } from './rag-weight-integrator';
import { LearningSnapshotService } from './learning-snapshot.service';
import { ModelTeachingMatrix } from './model-teaching-matrix';

@Module({
  providers: [
    // P12.1: Feedback + Quality Scoring
    PersistentFeedbackStore,
    RealCodeQualityScorer,

    // P12.2: Model Preference
    ModelPreferenceTracker,
    {
      provide: ModelSelectionStrategy,
      useFactory: (tracker: ModelPreferenceTracker) => new ModelSelectionStrategy(tracker),
      inject: [ModelPreferenceTracker],
    },
    {
      provide: DispatcherIntegration,
      useFactory: (tracker: ModelPreferenceTracker) => new DispatcherIntegration(tracker),
      inject: [ModelPreferenceTracker],
    },

    // P12.3: Prompt Versioning + A/B
    PromptVersionStore,
    {
      provide: PromptAbTester,
      useFactory: (store: PromptVersionStore) => new PromptAbTester(store),
      inject: [PromptVersionStore],
    },

    // P12.4: Prompt Evolution + RAG Quality
    {
      provide: PromptEvolver,
      useFactory: (feedbackStore: PersistentFeedbackStore, promptStore: PromptVersionStore) =>
        new PromptEvolver(feedbackStore, promptStore),
      inject: [PersistentFeedbackStore, PromptVersionStore],
    },
    RagQualityTracker,
    {
      provide: RagWeightIntegrator,
      useFactory: (tracker: RagQualityTracker) => new RagWeightIntegrator(tracker),
      inject: [RagQualityTracker],
    },

    // SESSION-2: Snapshot orchestration
    {
      provide: LearningSnapshotService,
      useFactory: (
        feedback: PersistentFeedbackStore,
        modelPref: ModelPreferenceTracker,
        promptStore: PromptVersionStore,
        ragQuality: RagQualityTracker,
        abTester: PromptAbTester,
      ) => new LearningSnapshotService(feedback, modelPref, promptStore, ragQuality, abTester),
      inject: [
        PersistentFeedbackStore,
        ModelPreferenceTracker,
        PromptVersionStore,
        RagQualityTracker,
        PromptAbTester,
      ],
    },

    // SESSION-4: Model Teaching Matrix
    {
      provide: ModelTeachingMatrix,
      useFactory: (snapshot: LearningSnapshotService) => new ModelTeachingMatrix(snapshot),
      inject: [LearningSnapshotService],
    },
  ],
  exports: [
    PersistentFeedbackStore,
    RealCodeQualityScorer,
    ModelPreferenceTracker,
    ModelSelectionStrategy,
    DispatcherIntegration,
    PromptVersionStore,
    PromptAbTester,
    PromptEvolver,
    RagQualityTracker,
    RagWeightIntegrator,
    LearningSnapshotService,
    ModelTeachingMatrix,
  ],
})
export class LearningModule {}
