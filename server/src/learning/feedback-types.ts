/**
 * Learning — Feedback Types.
 *
 * Core types for the persistent feedback system:
 * - FeedbackRecord: full generation feedback entry
 * - QualityScore / QualityDimension: multi-dimensional scoring
 * - HumanFeedback: optional human rating
 * - FeedbackQuery: search/filter criteria
 * - FeedbackStats: aggregated statistics
 *
 * DNA-1: toDict() produces Record<string, unknown> with snake_case keys.
 *
 * Phase 12.1: Foundation types.
 */

import { randomUUID } from 'crypto';

// ── QualityDimension ────────────────────────────────

/** A single dimension of code quality scoring. */
export interface QualityDimension {
  /** Dimension name (e.g., 'dna_compliance', 'fabric_usage'). */
  readonly name: string;
  /** Score 0.0–1.0. */
  readonly score: number;
  /** Weight for this dimension (sums to ~1.0 across all dimensions). */
  readonly weight: number;
  /** Optional human-readable detail about the score. */
  readonly details?: string;
}

// ── QualityScore ────────────────────────────────────

/** Multi-dimensional quality score for generated code. */
export interface QualityScore {
  /** Weighted total score 0.0–1.0. */
  readonly total: number;
  /** Individual dimension scores. */
  readonly dimensions: readonly QualityDimension[];
}

/** Create a QualityScore from dimensions. Total = Σ(score × weight). */
export function createQualityScore(dimensions: QualityDimension[]): QualityScore {
  const total = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  return {
    total: Math.round(total * 10000) / 10000,
    dimensions: [...dimensions],
  };
}

/** Serialize QualityScore to dict (DNA-1). */
export function qualityScoreToDict(score: QualityScore): Record<string, unknown> {
  return {
    total: score.total,
    dimensions: score.dimensions.map((d) => ({
      name: d.name,
      score: d.score,
      weight: d.weight,
      details: d.details ?? null,
    })),
  };
}

// ── HumanFeedback ───────────────────────────────────

/** Optional human rating on a generation. */
export interface HumanFeedback {
  readonly rating: 'good' | 'neutral' | 'bad';
  readonly comment?: string;
}

// ── FeedbackRecord ──────────────────────────────────

/** Full feedback record for a single generation. */
export interface FeedbackRecord {
  /** Unique feedback ID: fb-<uuid>. */
  readonly id: string;
  /** Tenant scope (DNA-5). */
  readonly tenantId: string;
  /** Task type that was generated. */
  readonly taskType: string;
  /** AI model used for generation. */
  readonly modelId: string;
  /** Prompt version used. */
  readonly promptVersion: string;
  /** Multi-dimensional quality score. */
  readonly qualityScore: QualityScore;
  /** Optional human rating. */
  humanFeedback?: HumanFeedback;
  /** RAG pattern IDs used by AF-4. */
  readonly ragPatternsUsed: readonly string[];
  /** Did the generation pass all quality gates? */
  readonly passed: boolean;
  /** Size of generated code in characters. */
  readonly generatedCodeLength: number;
  /** ISO timestamp when feedback was recorded. */
  readonly createdAt: string;
  /** Extensible metadata. */
  readonly metadata: Record<string, unknown>;
}

/** Create a FeedbackRecord with auto-generated ID and timestamp. */
export function createFeedbackRecord(params: {
  tenantId: string;
  taskType: string;
  modelId: string;
  promptVersion?: string;
  qualityScore: QualityScore;
  humanFeedback?: HumanFeedback;
  ragPatternsUsed?: string[];
  passed: boolean;
  generatedCodeLength?: number;
  metadata?: Record<string, unknown>;
}): FeedbackRecord {
  return {
    id: `fb-${randomUUID().substring(0, 8)}`,
    tenantId: params.tenantId,
    taskType: params.taskType,
    modelId: params.modelId,
    promptVersion: params.promptVersion ?? 'default',
    qualityScore: params.qualityScore,
    humanFeedback: params.humanFeedback,
    ragPatternsUsed: Object.freeze(params.ragPatternsUsed ?? []),
    passed: params.passed,
    generatedCodeLength: params.generatedCodeLength ?? 0,
    createdAt: new Date().toISOString(),
    metadata: params.metadata ?? {},
  };
}

/** Serialize FeedbackRecord to dict (DNA-1 snake_case). */
export function feedbackRecordToDict(record: FeedbackRecord): Record<string, unknown> {
  return {
    id: record.id,
    tenant_id: record.tenantId,
    task_type: record.taskType,
    model_id: record.modelId,
    prompt_version: record.promptVersion,
    quality_score: qualityScoreToDict(record.qualityScore),
    human_feedback: record.humanFeedback
      ? { rating: record.humanFeedback.rating, comment: record.humanFeedback.comment ?? null }
      : null,
    rag_patterns_used: [...record.ragPatternsUsed],
    passed: record.passed,
    generated_code_length: record.generatedCodeLength,
    created_at: record.createdAt,
    metadata: { ...record.metadata },
  };
}

// ── FeedbackQuery ───────────────────────────────────

/** Filters for querying feedback records. */
export interface FeedbackQuery {
  /** Required: tenant scope (DNA-5). */
  readonly tenantId: string;
  /** Optional: filter by task type. */
  readonly taskType?: string;
  /** Optional: filter by model. */
  readonly modelId?: string;
  /** Optional: filter from date (ISO string). */
  readonly fromDate?: string;
  /** Optional: filter to date (ISO string). */
  readonly toDate?: string;
  /** Optional: minimum quality score. */
  readonly minScore?: number;
  /** Optional: only passed/failed. */
  readonly passed?: boolean;
  /** Optional: max results (default 100). */
  readonly maxResults?: number;
}

// ── FeedbackStats ───────────────────────────────────

/** Aggregated feedback statistics. */
export interface FeedbackStats {
  readonly tenantId: string;
  readonly taskType: string | null;
  readonly totalRecords: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly passRate: number;
  readonly avgScore: number;
  readonly modelBreakdown: Record<string, { count: number; avgScore: number }>;
}
