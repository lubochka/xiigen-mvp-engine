/**
 * PersistentFeedbackStore — stores and queries generation feedback.
 *
 * In-memory implementation backed by array.
 * Production: swap to IDatabaseService (Elasticsearch) via fabric.
 *
 * DNA-3: all methods return DataProcessResult.
 * DNA-5: tenantId required on all operations.
 *
 * Phase 12.1.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import {
  type FeedbackRecord,
  type FeedbackQuery,
  type FeedbackStats,
  type HumanFeedback,
} from './feedback-types';

@Injectable()
export class PersistentFeedbackStore {
  private readonly records: FeedbackRecord[] = [];

  /**
   * Store a feedback record.
   */
  record(feedback: FeedbackRecord): DataProcessResult<boolean> {
    if (!feedback.tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }
    if (!feedback.id) {
      return DataProcessResult.failure('MISSING_ID', 'feedback id is required');
    }

    // Reject duplicates
    if (this.records.some((r) => r.id === feedback.id)) {
      return DataProcessResult.failure('DUPLICATE', `Feedback ${feedback.id} already exists`);
    }

    this.records.push(feedback);
    return DataProcessResult.success(true);
  }

  /**
   * Query feedback records with filters.
   */
  query(query: FeedbackQuery): DataProcessResult<FeedbackRecord[]> {
    if (!query.tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    let results = this.records.filter((r) => r.tenantId === query.tenantId);

    if (query.taskType) {
      results = results.filter((r) => r.taskType === query.taskType);
    }
    if (query.modelId) {
      results = results.filter((r) => r.modelId === query.modelId);
    }
    if (query.fromDate) {
      results = results.filter((r) => r.createdAt >= query.fromDate!);
    }
    if (query.toDate) {
      results = results.filter((r) => r.createdAt <= query.toDate!);
    }
    if (query.minScore !== undefined) {
      results = results.filter((r) => r.qualityScore.total >= query.minScore!);
    }
    if (query.passed !== undefined) {
      results = results.filter((r) => r.passed === query.passed);
    }

    // Sort by createdAt descending (newest first)
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // Apply max results
    const maxResults = query.maxResults ?? 100;
    if (results.length > maxResults) {
      results = results.slice(0, maxResults);
    }

    return DataProcessResult.success(results);
  }

  /**
   * Get aggregated stats for a tenant (optionally filtered by task type).
   */
  getStats(tenantId: string, taskType?: string): DataProcessResult<FeedbackStats> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    let records = this.records.filter((r) => r.tenantId === tenantId);
    if (taskType) {
      records = records.filter((r) => r.taskType === taskType);
    }

    const totalRecords = records.length;
    const passCount = records.filter((r) => r.passed).length;
    const failCount = totalRecords - passCount;
    const passRate = totalRecords > 0 ? passCount / totalRecords : 0;

    const totalScore = records.reduce((sum, r) => sum + r.qualityScore.total, 0);
    const avgScore = totalRecords > 0 ? totalScore / totalRecords : 0;

    // Model breakdown
    const modelMap = new Map<string, { count: number; totalScore: number }>();
    for (const r of records) {
      const existing = modelMap.get(r.modelId) ?? { count: 0, totalScore: 0 };
      existing.count++;
      existing.totalScore += r.qualityScore.total;
      modelMap.set(r.modelId, existing);
    }

    const modelBreakdown: Record<string, { count: number; avgScore: number }> = {};
    for (const [modelId, data] of modelMap.entries()) {
      modelBreakdown[modelId] = {
        count: data.count,
        avgScore: Math.round((data.totalScore / data.count) * 10000) / 10000,
      };
    }

    return DataProcessResult.success({
      tenantId,
      taskType: taskType ?? null,
      totalRecords,
      passCount,
      failCount,
      passRate: Math.round(passRate * 10000) / 10000,
      avgScore: Math.round(avgScore * 10000) / 10000,
      modelBreakdown,
    });
  }

  /**
   * Get feedback records by model.
   */
  getByModel(
    tenantId: string,
    modelId: string,
    taskType?: string,
  ): DataProcessResult<FeedbackRecord[]> {
    return this.query({ tenantId, modelId, taskType });
  }

  /**
   * Add human feedback to an existing record.
   */
  addHumanFeedback(feedbackId: string, humanFeedback: HumanFeedback): DataProcessResult<boolean> {
    const record = this.records.find((r) => r.id === feedbackId);
    if (!record) {
      return DataProcessResult.failure('FEEDBACK_NOT_FOUND', `Feedback ${feedbackId} not found`);
    }

    // FeedbackRecord.humanFeedback is mutable for this operation
    (record as { humanFeedback?: HumanFeedback }).humanFeedback = humanFeedback;
    return DataProcessResult.success(true);
  }

  /**
   * Get a single feedback record by ID.
   */
  getById(feedbackId: string): DataProcessResult<FeedbackRecord> {
    const record = this.records.find((r) => r.id === feedbackId);
    if (!record) {
      return DataProcessResult.failure('FEEDBACK_NOT_FOUND', `Feedback ${feedbackId} not found`);
    }
    return DataProcessResult.success(record);
  }

  /**
   * Total record count.
   */
  get count(): number {
    return this.records.length;
  }

  /**
   * Clear all records (for testing).
   */
  clear(): void {
    this.records.length = 0;
  }

  /** Export full store state for snapshot persistence. */
  exportState(): FeedbackRecord[] {
    return [...this.records];
  }

  /** Import store state from a snapshot. Clears existing data first. */
  importState(records: FeedbackRecord[]): void {
    this.records.length = 0;
    this.records.push(...records);
  }
}
