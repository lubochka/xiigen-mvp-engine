/**
 * AF-11: Feedback Station.
 *
 * Stores quality feedback per task type for the learning loop.
 * Aggregates: total_score, count, pass_count, fail_count.
 * In production, backed by Database Fabric (Elasticsearch).
 *
 * Phase 8.3: JUDGMENT sub-engine component.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { IAfStation, StationId, StationInput, StationOutput } from './base';

/** Aggregated feedback stats for a task type. */
export interface FeedbackStats {
  task_type: string;
  total_score: number;
  count: number;
  pass_count: number;
  fail_count: number;
  average_score: number;
  /** Total USD cost across all runs for this task type. */
  total_cost_usd: number;
  /** Average USD cost per run for this task type. */
  avg_cost_per_run: number;
}

@Injectable()
export class FeedbackStation extends IAfStation {
  readonly stationId = StationId.AF11_FEEDBACK;

  /**
   * In-memory feedback store.
   * Key: taskType, Value: array of feedback records.
   * Production: Elasticsearch via Database Fabric.
   */
  private readonly feedbackStore = new Map<string, Array<Record<string, unknown>>>();

  /**
   * Per-tenant skill effectiveness tracking.
   * Key: tenantId → skillKey → { withSkill: scores[], withoutSkill: scores[] }
   */
  private readonly skillStats = new Map<
    string,
    Map<string, { withSkill: number[]; withoutSkill: number[] }>
  >();

  async execute(input: StationInput): Promise<DataProcessResult<StationOutput>> {
    if (!input.tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    const start = Date.now();
    const taskType = input.taskType || 'unknown';

    const skillsActive =
      (input.metadata.skill_blocks_active as string[]) ??
      (input.spec.skill_blocks_active as string[]) ??
      [];

    // Capture previous average for scoreDelta before recording
    const previousStats = this.getStats(taskType);
    const previousAvg = previousStats?.average_score ?? 0;

    // Build feedback record from the pipeline state
    const feedback = this.buildFeedback(input, taskType);
    this.recordFeedback(taskType, feedback, skillsActive);

    const stats = this.getStats(taskType);
    const scoreDelta = ((feedback.score as number) ?? 0) - previousAvg;

    return DataProcessResult.success(
      new StationOutput({
        stationId: this.stationId,
        success: true,
        data: {
          feedback_recorded: true,
          task_type: taskType,
          score: feedback.score,
          passed: feedback.passed,
          score_delta: scoreDelta,
          skills_active: skillsActive,
          stats: stats ? { ...stats } : null,
          total_feedback: this.totalFeedback,
        },
        elapsedMs: Date.now() - start,
      }),
    );
  }

  /** Record a feedback entry for a task type. skillsActive defaults to []. */
  recordFeedback(
    taskType: string,
    feedback: Record<string, unknown>,
    skillsActive: string[] = [],
  ): void {
    const existing = this.feedbackStore.get(taskType) ?? [];
    existing.push({
      ...feedback,
      skills_active: skillsActive,
      recorded_at: new Date().toISOString(),
    });
    this.feedbackStore.set(taskType, existing);

    // Update skill effectiveness tracking
    const tenantId = (feedback.tenant_id as string) ?? 'unknown';
    const score = (feedback.score as number) ?? 0;
    this.updateSkillStats(tenantId, skillsActive, score);
  }

  /**
   * Returns average score when skill was active vs not active.
   * Returns null when fewer than 3 samples in either bucket.
   */
  getSkillEffectiveness(tenantId: string, skillKey: string): Record<string, unknown> | null {
    const tenantSkills = this.skillStats.get(tenantId);
    if (!tenantSkills) return null;
    const data = tenantSkills.get(skillKey);
    if (!data || data.withSkill.length < 3 || data.withoutSkill.length < 3) return null;
    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    return {
      skillKey,
      avgWithSkill: avg(data.withSkill),
      avgWithoutSkill: avg(data.withoutSkill),
      sampleCount: data.withSkill.length + data.withoutSkill.length,
    };
  }

  /** Get aggregated stats for a task type. */
  getStats(taskType: string): FeedbackStats | null {
    const entries = this.feedbackStore.get(taskType);
    if (!entries || entries.length === 0) return null;

    let totalScore = 0;
    let passCount = 0;
    let failCount = 0;
    let totalCostUsd = 0;

    for (const entry of entries) {
      const score = (entry.score as number) ?? 0;
      totalScore += score;
      totalCostUsd += (entry.cost_usd as number) ?? 0;
      if (entry.passed) {
        passCount++;
      } else {
        failCount++;
      }
    }

    return {
      task_type: taskType,
      total_score: totalScore,
      count: entries.length,
      pass_count: passCount,
      fail_count: failCount,
      average_score: entries.length > 0 ? totalScore / entries.length : 0,
      total_cost_usd: totalCostUsd,
      avg_cost_per_run: entries.length > 0 ? totalCostUsd / entries.length : 0,
    };
  }

  /** Get pass rate for a task type (0–1). */
  getPassRate(taskType: string): number {
    const stats = this.getStats(taskType);
    if (!stats || stats.count === 0) return 0;
    return stats.pass_count / stats.count;
  }

  /** Total feedback entries across all task types. */
  get totalFeedback(): number {
    let count = 0;
    for (const entries of this.feedbackStore.values()) {
      count += entries.length;
    }
    return count;
  }

  /** List all task types with feedback. */
  listTaskTypes(): string[] {
    return [...this.feedbackStore.keys()];
  }

  /** Clear all feedback (for testing). */
  clear(): void {
    this.feedbackStore.clear();
    this.skillStats.clear();
  }

  // ── Private helpers ───────────────────────────────

  private updateSkillStats(tenantId: string, skillsActive: string[], score: number): void {
    if (!this.skillStats.has(tenantId)) {
      this.skillStats.set(tenantId, new Map());
    }
    const tenantMap = this.skillStats.get(tenantId)!;

    const ALL_SKILLS = ['SK-PLAN', 'SK-TEST', 'SK-DNA', 'SK-BFA', 'SK-DOCS'];
    for (const skillKey of ALL_SKILLS) {
      if (!tenantMap.has(skillKey)) {
        tenantMap.set(skillKey, { withSkill: [], withoutSkill: [] });
      }
      const data = tenantMap.get(skillKey)!;
      if (skillsActive.includes(skillKey)) {
        data.withSkill.push(score);
      } else {
        data.withoutSkill.push(score);
      }
    }
  }

  // ── Internal ──────────────────────────────────────

  private buildFeedback(input: StationInput, taskType: string): Record<string, unknown> {
    // Summarize scores from review/judgment
    const scoreValues = input.scores.map((s) => (s.score as number) ?? 0).filter((s) => s > 0);
    const avgScore =
      scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : 0;

    // Check review results for errors
    const hasErrors = input.reviewResults.some((r) => ((r.error_count as number) ?? 0) > 0);

    // Check if any findings block passage
    const passed = !hasErrors && avgScore >= 0;

    // Extract cost + token data from generation results
    let totalCostUsd = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let primaryModelId = 'unknown';
    for (const r of input.generationResults) {
      totalCostUsd += (r['cost'] as number) ?? 0;
      const tu = r['tokens_used'] as Record<string, number> | undefined;
      totalTokensIn += tu?.input ?? 0;
      totalTokensOut += tu?.output ?? 0;
      if (r['model'] && primaryModelId === 'unknown') {
        primaryModelId = r['model'] as string;
      }
    }

    // F1-1_F15 (R21): domain context enrichment for domain-tagged task types.
    // Reads domainContext and conflictsWith from input.metadata when present.
    // This enables DPO training data to carry cross-flow conflict awareness.
    const domainMeta = input.metadata['domainContext'] as Record<string, unknown> | undefined;
    const conflictsWith = input.metadata['conflictsWith'] as string[] | undefined;

    const baseFeedback: Record<string, unknown> = {
      task_type: taskType,
      tenant_id: input.tenantId,
      score: avgScore,
      passed,
      cost_usd: totalCostUsd,
      tokens_in: totalTokensIn,
      tokens_out: totalTokensOut,
      model_id: primaryModelId,
      generation_step_count: input.generationResults.length,
      review_issue_count: input.reviewResults.reduce(
        (sum, r) => sum + ((r.issue_count as number) ?? 0),
        0,
      ),
      score_count: scoreValues.length,
      code_length: input.code.length,
    };

    // Attach domain context when available (FLOW-15 Conflict 3 circuit-breaker pattern)
    if (domainMeta) {
      baseFeedback['domainContext'] = domainMeta;
    }
    if (conflictsWith && conflictsWith.length > 0) {
      baseFeedback['conflictsWith'] = conflictsWith;
    }

    return baseFeedback;
  }
}
