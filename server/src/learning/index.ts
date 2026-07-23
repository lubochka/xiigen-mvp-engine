/**
 * Learning — barrel export.
 * Phase 12.1: Feedback types + PersistentFeedbackStore + RealCodeQualityScorer.
 * Phase 12.2: ModelPreferenceTracker + ModelSelectionStrategy + DispatcherIntegration.
 * Phase 12.3: PromptVersion types + PromptVersionStore + PromptAbTester.
 * Phase 12.4: PromptEvolver + RagQualityTracker + RagWeightIntegrator.
 * Phase 12.5: LearningModule.
 */
export * from './feedback-types';
export * from './feedback-store';
export * from './quality-scorer';
export * from './model-preference';
export * from './model-selection';
export * from './dispatcher-integration';
export * from './prompt-types';
export * from './prompt-version-store';
export * from './prompt-ab-tester';
export * from './prompt-evolver';
export * from './rag-quality-tracker';
export * from './rag-weight-integrator';
export { LearningSnapshotService } from './learning-snapshot.service';
export type {
  LearningSnapshot,
  SnapshotMetadata,
  SnapshotComparison,
} from './learning-snapshot.service';
export { ModelTeachingMatrix, DEFAULT_MATRIX } from './model-teaching-matrix';
export type { MatrixCombination, MatrixRunResult, MatrixReport } from './model-teaching-matrix';
export * from './learning.module';
