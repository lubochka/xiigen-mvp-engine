/**
 * Learning — Prompt Types.
 *
 * Types for prompt versioning and A/B testing:
 * - PromptVersion: a versioned prompt with champion/candidate/retired status
 * - PromptTestResult: a single test result for a prompt version
 * - PromptStats: aggregated statistics per prompt version
 * - PromotionConfig: thresholds for auto-promotion
 *
 * DNA-1: toDict() produces Record<string, unknown> with snake_case keys.
 *
 * Phase 12.3.
 */

import { randomUUID } from 'crypto';

// ── PromptVersion ───────────────────────────────────

export type PromptStatus = 'champion' | 'candidate' | 'retired';

export interface PromptVersion {
  /** Unique version ID: pv-<uuid>. */
  readonly id: string;
  /** Task type this prompt targets. */
  readonly taskType: string;
  /** Prompt role: 'system', 'generation', etc. */
  readonly role: string;
  /** The prompt content. */
  readonly content: string;
  /** Human-readable version label (e.g., 'v1.0', 'v1.1-evolved'). */
  readonly version: string;
  /** Current status. Mutable for promotion/retirement. */
  status: PromptStatus;
  /** ISO timestamp. */
  readonly createdAt: string;
  /** Extensible metadata. */
  readonly metadata: Record<string, unknown>;
}

/** Create a PromptVersion with auto-generated ID and timestamp. */
export function createPromptVersion(params: {
  taskType: string;
  role: string;
  content: string;
  version: string;
  status?: PromptStatus;
  metadata?: Record<string, unknown>;
}): PromptVersion {
  return {
    id: `pv-${randomUUID().substring(0, 8)}`,
    taskType: params.taskType,
    role: params.role,
    content: params.content,
    version: params.version,
    status: params.status ?? 'candidate',
    createdAt: new Date().toISOString(),
    metadata: params.metadata ?? {},
  };
}

/** Serialize PromptVersion to dict (DNA-1 snake_case). */
export function promptVersionToDict(v: PromptVersion): Record<string, unknown> {
  return {
    id: v.id,
    task_type: v.taskType,
    role: v.role,
    content: v.content,
    version: v.version,
    status: v.status,
    created_at: v.createdAt,
    metadata: { ...v.metadata },
  };
}

// ── PromptTestResult ────────────────────────────────

/** A single test result for a prompt version. */
export interface PromptTestResult {
  readonly promptVersionId: string;
  readonly tenantId: string;
  readonly score: number;
  readonly passed: boolean;
  readonly taskType: string;
  readonly timestamp: string;
}

// ── PromptStats ─────────────────────────────────────

/** Aggregated statistics per prompt version. */
export interface PromptStats {
  readonly versionId: string;
  readonly avgScore: number;
  readonly sampleCount: number;
  readonly passRate: number;
  /** Confidence: 'low' (<5 samples), 'medium' (5–20), 'high' (>20). */
  readonly confidenceLevel: 'low' | 'medium' | 'high';
}

// ── PromotionConfig ─────────────────────────────────

/** Configuration for auto-promotion of prompt candidates. */
export interface PromotionConfig {
  /** Minimum samples before promotion is considered. Default 10. */
  readonly minSamples: number;
  /** Candidate avgScore must exceed champion avgScore by this amount. Default 0.05. */
  readonly scoreThreshold: number;
  /** Whether to auto-promote. Default true. */
  readonly autoPromote: boolean;
}

export const DEFAULT_PROMOTION_CONFIG: PromotionConfig = {
  minSamples: 10,
  scoreThreshold: 0.05,
  autoPromote: true,
};
