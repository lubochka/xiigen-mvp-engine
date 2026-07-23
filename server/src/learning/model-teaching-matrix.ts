/**
 * ModelTeachingMatrix — runs one task type across multiple AI×RAG combinations.
 *
 * Workflow per combination:
 *   1. Restore to clean baseline (or empty if none specified)
 *   2. Submit task through AF pipeline with THIS combo (mock in Phase A)
 *   3. Capture AF-9 score (round 1)
 *   4. Run PromptEvolver if score < threshold
 *   5. Re-submit with improved prompt (round 2)
 *   6. Capture AF-9 score (round 2)
 *   7. Snapshot the learning state
 *   8. Record: { combo, score1, score2, delta, cost }
 *
 * Output: Comparison report with recommendations.
 *
 * DNA-3: Returns DataProcessResult.
 * DNA-5: tenantId scoped.
 *
 * FLOW-0 Prerequisite: Session 4.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { LearningSnapshotService } from './learning-snapshot.service';

// ── Types ────────────────────────────────────────────

export interface MatrixCombination {
  readonly aiProvider: string;
  readonly ragProvider: string;
  readonly dockerProfile?: string;
  readonly estimatedCostPerRun: string;
}

export interface MatrixRunResult {
  readonly combination: MatrixCombination;
  readonly round1Score: number;
  readonly round2Score: number;
  readonly delta: number;
  readonly promptEvolved: boolean;
  readonly snapshotId: string;
  readonly durationMs: number;
  readonly error?: string;
}

export interface MatrixReport {
  readonly matrixRunId: string;
  readonly taskType: string;
  readonly tenantId: string;
  readonly createdAt: string;
  readonly baselineSnapshotId: string | null;
  readonly results: MatrixRunResult[];
  readonly recommendation: {
    bestFree: string | null;
    bestPaid: string | null;
    bestValue: string | null;
  };
}

export interface MatrixRunOptions {
  readonly combinations?: MatrixCombination[];
  readonly baselineSnapshotId?: string;
  readonly scoreThreshold?: number;
}

// ── Default Combinations ─────────────────────────────

export const DEFAULT_MATRIX: MatrixCombination[] = [
  { aiProvider: 'mock', ragProvider: 'inmemory', estimatedCostPerRun: '$0' },
  {
    aiProvider: 'ollama:qwen2.5-coder:7b',
    ragProvider: 'inmemory',
    dockerProfile: 'local-llm',
    estimatedCostPerRun: '$0',
  },
  {
    aiProvider: 'ollama:qwen2.5-coder:7b',
    ragProvider: 'nano-graphrag',
    dockerProfile: 'local-llm,open-source',
    estimatedCostPerRun: '$0',
  },
  {
    aiProvider: 'ollama:mistral:7b',
    ragProvider: 'inmemory',
    dockerProfile: 'local-llm',
    estimatedCostPerRun: '$0',
  },
  { aiProvider: 'claude-sonnet', ragProvider: 'inmemory', estimatedCostPerRun: '$0.50' },
  { aiProvider: 'claude-sonnet', ragProvider: 'pinecone', estimatedCostPerRun: '$0.60' },
  { aiProvider: 'openai:gpt-4o', ragProvider: 'inmemory', estimatedCostPerRun: '$0.80' },
];

// ── Runner ───────────────────────────────────────────

/** Minimal interface for the AF pipeline runner (Phase B+ injection). */
interface IAfPipelineRunner {
  execute(params: {
    tenantId: string;
    taskType: string;
    providerId: string;
    ragProvider: string;
  }): Promise<{ isSuccess: boolean; data?: { judgment?: { score?: number } } }>;
}

@Injectable()
export class ModelTeachingMatrix {
  constructor(
    private readonly snapshotService: LearningSnapshotService,
    @Optional() private readonly afPipelineRunner?: IAfPipelineRunner,
  ) {}

  /**
   * Run the full matrix for a given task type.
   * Uses mock scores when afPipelineRunner is not injected (Phase A testing).
   */
  async runMatrix(
    tenantId: string,
    taskType: string,
    options: MatrixRunOptions = {},
  ): Promise<DataProcessResult<MatrixReport>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }
    if (!taskType) {
      return DataProcessResult.failure('MISSING_TASK', 'taskType required');
    }

    const combinations = options.combinations ?? DEFAULT_MATRIX;
    const threshold = options.scoreThreshold ?? 70;
    const matrixRunId = `matrix-${Date.now()}`;
    const results: MatrixRunResult[] = [];

    for (const combo of combinations) {
      const comboStart = Date.now();

      // Restore to baseline before each combo (fair comparison)
      if (options.baselineSnapshotId) {
        const restoreResult = this.snapshotService.restoreSnapshot(options.baselineSnapshotId);
        if (!restoreResult.isSuccess) {
          results.push({
            combination: combo,
            round1Score: 0,
            round2Score: 0,
            delta: 0,
            promptEvolved: false,
            snapshotId: '',
            durationMs: Date.now() - comboStart,
            error: `Baseline restore failed: ${restoreResult.errorMessage}`,
          });
          continue;
        }
      }

      // Run round 1
      const score1 = await this.runSingleGeneration(tenantId, taskType, combo);

      // Run PromptEvolver if below threshold (mocked in Phase A)
      const evolved = score1 < threshold;

      // Run round 2
      const score2 = await this.runSingleGeneration(tenantId, taskType, combo);

      // Snapshot after this combo
      const snapResult = this.snapshotService.createSnapshot(tenantId, {
        phase: 'matrix',
        aiProvider: combo.aiProvider,
        ragProvider: combo.ragProvider,
        flowId: 'FLOW-0',
        notes: `Matrix run ${matrixRunId} — taskType ${taskType}`,
      });

      results.push({
        combination: combo,
        round1Score: Math.round(score1 * 100) / 100,
        round2Score: Math.round(score2 * 100) / 100,
        delta: Math.round((score2 - score1) * 100) / 100,
        promptEvolved: evolved,
        snapshotId: snapResult.isSuccess ? snapResult.data!.snapshotId : '',
        durationMs: Date.now() - comboStart,
      });
    }

    return DataProcessResult.success({
      matrixRunId,
      taskType,
      tenantId,
      createdAt: new Date().toISOString(),
      baselineSnapshotId: options.baselineSnapshotId ?? null,
      results,
      recommendation: this.buildRecommendation(results),
    });
  }

  /** Return the default combination matrix (for inspection). */
  getDefaultMatrix(): MatrixCombination[] {
    return [...DEFAULT_MATRIX];
  }

  // ── Private ────────────────────────────────────────

  private async runSingleGeneration(
    _tenantId: string,
    _taskType: string,
    combo: MatrixCombination,
  ): Promise<number> {
    if (this.afPipelineRunner) {
      // Real pipeline run — Phase B+
      const result = await this.afPipelineRunner.execute({
        tenantId: _tenantId,
        taskType: _taskType,
        providerId: combo.aiProvider,
        ragProvider: combo.ragProvider,
      });
      return result.isSuccess ? (result.data?.judgment?.score ?? 0) : 0;
    }
    // Mock scores for Phase A (no real AI calls)
    return this.mockScore(combo.aiProvider);
  }

  private mockScore(provider: string): number {
    const scores: Record<string, number> = {
      mock: 45,
      'ollama:qwen2.5-coder:7b': 62,
      'ollama:mistral:7b': 58,
      'claude-sonnet': 81,
      'openai:gpt-4o': 76,
    };
    return scores[provider] ?? 50;
  }

  private buildRecommendation(results: MatrixRunResult[]): MatrixReport['recommendation'] {
    const successful = results.filter((r) => !r.error);
    if (successful.length === 0) {
      return { bestFree: null, bestPaid: null, bestValue: null };
    }

    const free = successful.filter((r) => r.combination.estimatedCostPerRun === '$0');
    const paid = successful.filter((r) => r.combination.estimatedCostPerRun !== '$0');

    const best = (arr: MatrixRunResult[]) =>
      arr.length === 0 ? null : arr.sort((a, b) => b.round2Score - a.round2Score)[0];

    const bestFreeResult = best(free);
    const bestPaidResult = best(paid);
    const bestValueResult = best([...free, ...paid]);

    const fmt = (r: MatrixRunResult | null) =>
      r
        ? `${r.combination.aiProvider} × ${r.combination.ragProvider} (score ${r.round2Score}, ${r.combination.estimatedCostPerRun})`
        : null;

    return {
      bestFree: fmt(bestFreeResult),
      bestPaid: fmt(bestPaidResult),
      bestValue: fmt(bestValueResult),
    };
  }
}
