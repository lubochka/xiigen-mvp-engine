/**
 * FLOW-23 GAP-23-6: Code Export AF-9 Quality Gate Contracts
 * BFA Rules: CF-446
 * Error Correction: score-zero
 * Task Type: T363 (CodeExportGate)
 * Factories: F971 (ICodeExportService), F972 (ICodeQualityGate)
 */

import { DataProcessResult } from '../kernel/data-process-result';

/**
 * CF-446: Code export quality threshold.
 * FRACTIONAL — never use 80 or 80.0.
 * AF-9 scores are always in [0.0, 1.0].
 */
export const EXPORT_QUALITY_THRESHOLD = 0.8; // FRACTIONAL

/**
 * Event emitted when AF-9 gate fails.
 * Must include 'deficit' field (how far below threshold).
 */
export const EXPORT_QUALITY_EVENT_FAILED = 'com.xiigen.code.export.quality.failed';
export const EXPORT_QUALITY_EVENT_PASSED = 'com.xiigen.code.export.completed';

export const CODE_QUALITY_GATE = 'CODE_QUALITY_GATE';

/**
 * AF-9 quality gate service.
 * CF-446: score is fractional [0.0, 1.0].
 */
export interface ICodeQualityGate {
  /**
   * Get AF-9 quality judgment for a snapshot.
   * Returns fractional score — never integer.
   */
  getJudgment(canvasSnapshotId: string): Promise<
    DataProcessResult<{
      snapshotId: string;
      score: number; // FRACTIONAL: 0.0 to 1.0
      threshold: number; // Always EXPORT_QUALITY_THRESHOLD (0.8)
      passed: boolean; // score >= 0.8
      assessedAt: string;
      dimensions: Record<string, unknown>; // Per-dimension breakdown
    }>
  >;

  /**
   * Trigger AF-9 assessment for a snapshot.
   * Returns assessmentId for polling.
   */
  requestAssessment(canvasSnapshotId: string): Promise<
    DataProcessResult<{
      assessmentId: string;
      estimatedCompletionAt: string;
    }>
  >;
}

export const CODE_EXPORT_SERVICE = 'CODE_EXPORT_SERVICE';

export interface ICodeExportService {
  export(
    snapshotId: string, // Export from snapshot — NOT raw canvasId
    options: Record<string, unknown>, // DNA-1
  ): Promise<
    DataProcessResult<{
      exportId: string;
      snapshotId: string;
      format: string;
      exportedAt: string;
      downloadUrl: string;
    }>
  >;
}
