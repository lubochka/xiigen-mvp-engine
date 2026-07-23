/**
 * LearningController — API endpoints for the AI Learning & Feedback Loop.
 *
 * GET  /learning/feedback          — query feedback records
 * POST /learning/feedback/:id/human — add human feedback
 * GET  /learning/models/ranking    — model ranking per task type
 * GET  /learning/prompts/versions  — list prompt versions
 * POST /learning/prompts/evolve    — trigger prompt evolution
 * GET  /learning/rag/weights       — RAG pattern quality weights
 * POST /learning/quality/score     — score a code snippet
 * GET  /learning/stats             — learning system overview
 *
 * DNA-1: All responses are Record<string, unknown>.
 * DNA-3: Uses DataProcessResult internally.
 *
 * Phase 12.5.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { PersistentFeedbackStore } from '../learning/feedback-store';
import { RealCodeQualityScorer } from '../learning/quality-scorer';
import { ModelPreferenceTracker } from '../learning/model-preference';
import { PromptVersionStore } from '../learning/prompt-version-store';
import { PromptAbTester } from '../learning/prompt-ab-tester';
import { PromptEvolver, type IAiProviderLike } from '../learning/prompt-evolver';
import { RagQualityTracker } from '../learning/rag-quality-tracker';
import { feedbackRecordToDict, type HumanFeedback } from '../learning/feedback-types';

@Injectable()
export class LearningController {
  constructor(
    private readonly feedbackStore: PersistentFeedbackStore,
    private readonly qualityScorer: RealCodeQualityScorer,
    private readonly modelTracker: ModelPreferenceTracker,
    private readonly promptStore: PromptVersionStore,
    private readonly abTester: PromptAbTester,
    private readonly evolver: PromptEvolver,
    private readonly ragTracker: RagQualityTracker,
  ) {}

  /**
   * GET /learning/feedback — query feedback records.
   */
  getFeedback(
    tenantId: string,
    taskType?: string,
    modelId?: string,
  ): DataProcessResult<Record<string, unknown>> {
    const result = this.feedbackStore.query({ tenantId, taskType, modelId });
    if (!result.isSuccess) return result as unknown as DataProcessResult<Record<string, unknown>>;

    return DataProcessResult.success({
      records: result.data!.map(feedbackRecordToDict),
      count: result.data!.length,
    });
  }

  /**
   * POST /learning/feedback/:id/human — add human feedback.
   */
  addHumanFeedback(
    feedbackId: string,
    humanFeedback: HumanFeedback,
  ): DataProcessResult<Record<string, unknown>> {
    const result = this.feedbackStore.addHumanFeedback(feedbackId, humanFeedback);
    if (!result.isSuccess) return result as unknown as DataProcessResult<Record<string, unknown>>;

    return DataProcessResult.success({
      feedback_id: feedbackId,
      human_feedback: { rating: humanFeedback.rating, comment: humanFeedback.comment ?? null },
      updated: true,
    });
  }

  /**
   * GET /learning/models/ranking — model ranking per task type.
   */
  getModelRanking(tenantId: string, taskType?: string): DataProcessResult<Record<string, unknown>> {
    const result = taskType
      ? this.modelTracker.getRanking(tenantId, taskType)
      : this.modelTracker.getGlobalRanking(tenantId);

    if (!result.isSuccess) return result as unknown as DataProcessResult<Record<string, unknown>>;

    return DataProcessResult.success({
      rankings: result.data!,
      task_type: taskType ?? 'global',
      count: result.data!.length,
    });
  }

  /**
   * GET /learning/prompts/versions — list prompt versions.
   */
  getPromptVersions(taskType?: string): DataProcessResult<Record<string, unknown>> {
    const result = this.promptStore.listVersions(taskType);
    if (!result.isSuccess) return result as unknown as DataProcessResult<Record<string, unknown>>;

    return DataProcessResult.success({
      versions: result.data!.map((v) => ({
        id: v.id,
        task_type: v.taskType,
        role: v.role,
        version: v.version,
        status: v.status,
        created_at: v.createdAt,
      })),
      count: result.data!.length,
    });
  }

  /**
   * POST /learning/prompts/evolve — trigger prompt evolution.
   */
  async evolvePrompt(
    tenantId: string,
    taskType: string,
    role: string,
    aiProvider: IAiProviderLike,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const result = await this.evolver.evolvePrompt(tenantId, taskType, role, aiProvider);
    if (!result.isSuccess) return result as unknown as DataProcessResult<Record<string, unknown>>;

    const v = result.data!;
    return DataProcessResult.success({
      evolved: true,
      version_id: v.id,
      task_type: v.taskType,
      role: v.role,
      version: v.version,
      status: v.status,
    });
  }

  /**
   * GET /learning/rag/weights — RAG pattern quality weights.
   */
  getRagWeights(tenantId: string, topN = 20): DataProcessResult<Record<string, unknown>> {
    const result = this.ragTracker.getTopPatterns(tenantId, topN);
    if (!result.isSuccess) return result as unknown as DataProcessResult<Record<string, unknown>>;

    return DataProcessResult.success({
      patterns: result.data!,
      count: result.data!.length,
    });
  }

  /**
   * POST /learning/quality/score — score a code snippet.
   */
  scoreCode(
    code: string,
    spec: Record<string, unknown>,
  ): DataProcessResult<Record<string, unknown>> {
    const result = this.qualityScorer.score(code, spec);
    if (!result.isSuccess) return result as unknown as DataProcessResult<Record<string, unknown>>;

    const score = result.data!;
    return DataProcessResult.success({
      total: score.total,
      dimensions: score.dimensions.map((d) => ({
        name: d.name,
        score: d.score,
        weight: d.weight,
        details: d.details ?? null,
      })),
    });
  }

  /**
   * GET /learning/stats — learning system overview.
   */
  getStats(tenantId: string): DataProcessResult<Record<string, unknown>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const feedbackStats = this.feedbackStore.getStats(tenantId);
    const globalRanking = this.modelTracker.getGlobalRanking(tenantId);
    const allVersions = this.promptStore.listVersions();
    const topPatterns = this.ragTracker.getTopPatterns(tenantId, 10);

    return DataProcessResult.success({
      feedback: feedbackStats.isSuccess
        ? {
            total_records: feedbackStats.data!.totalRecords,
            pass_rate: feedbackStats.data!.passRate,
            avg_score: feedbackStats.data!.avgScore,
            model_breakdown: feedbackStats.data!.modelBreakdown,
          }
        : { total_records: 0 },
      models: globalRanking.isSuccess
        ? {
            rankings: globalRanking.data!,
            count: globalRanking.data!.length,
          }
        : { rankings: [], count: 0 },
      prompts: allVersions.isSuccess
        ? {
            total_versions: allVersions.data!.length,
            champions: allVersions.data!.filter((v) => v.status === 'champion').length,
            candidates: allVersions.data!.filter((v) => v.status === 'candidate').length,
            retired: allVersions.data!.filter((v) => v.status === 'retired').length,
          }
        : { total_versions: 0 },
      rag: topPatterns.isSuccess
        ? {
            tracked_patterns: topPatterns.data!.length,
            top_patterns: topPatterns.data!.slice(0, 5),
          }
        : { tracked_patterns: 0 },
    });
  }
}
