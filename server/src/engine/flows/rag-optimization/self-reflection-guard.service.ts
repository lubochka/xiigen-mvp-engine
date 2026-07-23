/**
 * SelfReflectionGuard — T459 GUARD service for FLOW-29.
 *
 * Decides whether retrieval is needed at all.
 * SELF_REFLECT is a valid non-error outcome — skips retrieval path.
 *
 * Iron rules:
 *   CF-476:    tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:     All methods return DataProcessResult<T> — never throw
 *   DNA-8:     storeDocument() BEFORE enqueue()
 *   THRESHOLD: confidence threshold from FREEDOM config — never hardcoded
 *   AI:        evaluation via IAiProvider — never import model SDK
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { IAiProvider } from '../../../fabrics/interfaces/ai-provider.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export type ReflectionDecision = 'SELF_REFLECT' | 'PROCEED_RETRIEVAL';

export interface ReflectionResult {
  readonly decisionId: string;
  readonly decision: ReflectionDecision;
  readonly confidence: number;
  readonly reason: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DECISION_INDEX = 'flow29-reflection-decisions';
const DECISION_EVENT = 'reflection.decided';
const DEFAULT_THRESHOLD = 0.8;

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class SelfReflectionGuard {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
    private readonly ai: IAiProvider,
  ) {}

  /**
   * Decide whether to retrieve or use existing context.
   *
   * DNA-8: storeDocument() BEFORE enqueue().
   * SELF_REFLECT is a valid non-error outcome.
   */
  async reflect(
    sessionId: string,
    tenantId: string,
    queryText: string,
    currentContext: Record<string, unknown> = {},
  ): Promise<DataProcessResult<ReflectionResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!sessionId || sessionId.trim() === '') {
      return DataProcessResult.failure('MISSING_SESSION_ID', 'sessionId is required');
    }
    if (!queryText || queryText.trim() === '') {
      return DataProcessResult.failure('MISSING_QUERY_TEXT', 'queryText is required');
    }

    // Read confidence threshold from FREEDOM config
    const configResult = await this.db.searchDocuments('flow29-reflection-config', {
      tenant_id: tenantId,
      active: true,
    });
    const config =
      configResult.isSuccess && (configResult.data ?? []).length > 0 ? configResult.data![0] : null;
    const threshold =
      (config?.['self_reflect_threshold'] as number | undefined) ?? DEFAULT_THRESHOLD;

    // AI evaluation: can query be answered from current context?
    const contextSummary = JSON.stringify(currentContext).slice(0, 500);
    const prompt = `Can this query be answered from the existing context without retrieval?\nQuery: ${queryText}\nContext: ${contextSummary}\nReturn JSON: {"can_answer": true/false, "confidence": 0.0-1.0, "reason": "..."}`;
    const aiResult = await this.ai.generate(prompt, {
      systemPrompt: 'You are a self-reflection judge. Return only valid JSON.',
    });

    let confidence = 0.0;
    let canAnswer = false;
    let reason = 'AI evaluation failed — defaulting to retrieval';

    if (aiResult.isSuccess && aiResult.data) {
      confidence = Number(aiResult.data['confidence'] ?? 0);
      canAnswer = Boolean(aiResult.data['can_answer'] ?? false);
      reason = String(aiResult.data['reason'] ?? 'AI evaluation');
    }

    const decision: ReflectionDecision =
      canAnswer && confidence >= threshold ? 'SELF_REFLECT' : 'PROCEED_RETRIEVAL';

    const decisionId = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const decidedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      decision_id: decisionId,
      session_id: sessionId,
      tenant_id: tenantId,
      decision,
      confidence,
      reason,
      decided_at: decidedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(DECISION_INDEX, doc, decisionId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store reflection decision',
      );
    }

    await this.queue.enqueue(DECISION_EVENT, {
      decision_id: decisionId,
      session_id: sessionId,
      tenant_id: tenantId,
      decision,
      decided_at: decidedAt,
    });

    return DataProcessResult.success({ decisionId, decision, confidence, reason });
  }
}
