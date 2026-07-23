/**
 * ImprovementSuggestionEngine — T461 ANALYSIS service for FLOW-29.
 *
 * AI-driven improvement suggestions emitted via QUEUE — NEVER auto-applied.
 * SCORE-0: suggestions without evidence[] are filtered before emit.
 * Payload MUST include: suggestion_text, affected_component, confidence, evidence[].
 *
 * Iron rules:
 *   HUMAN_GATED:  suggestions NEVER auto-applied — SCORE-0 violation
 *   EVIDENCE:     suggestions without evidence[] filtered at source before emit
 *   QUEUE_ONLY:   suggestions emitted via QUEUE only — never applied inline
 *   CF-476:       tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:        All methods return DataProcessResult<T> — never throw
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { IAiProvider } from '../../../fabrics/interfaces/ai-provider.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface SuggestionPayload {
  readonly suggestion_text: string;
  readonly affected_component: string;
  readonly confidence: number;
  readonly evidence: string[];
}

export interface SuggestionResult {
  readonly analysisId: string;
  readonly tenantId: string;
  readonly suggestionsQueued: number;
  readonly suggestionsFiltered: number;
  readonly queuedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SUGGESTIONS_EVENT = 'rag.suggestion.queued';
const ANALYSES_INDEX = 'flow29-suggestion-analyses';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ImprovementSuggestionEngine {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
    private readonly ai: IAiProvider,
  ) {}

  /**
   * Analyze metrics and emit improvement suggestions for human review.
   *
   * Filters out any suggestions without evidence[] before emitting.
   * NEVER applies suggestions inline — queue only.
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async analyze(
    tenantId: string,
    metricsContext: Record<string, unknown>,
  ): Promise<DataProcessResult<SuggestionResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }

    // AI generates suggestions
    const prompt = `Analyze the following metrics and suggest improvements as JSON array:
${JSON.stringify(metricsContext)}

Each suggestion MUST have: suggestion_text (string), affected_component (string), confidence (0-1), evidence (string[]).
Return ONLY a JSON array: [{"suggestion_text": "...", "affected_component": "...", "confidence": 0.8, "evidence": ["reason1"]}]`;

    const aiResult = await this.ai.generate(prompt, {
      systemPrompt: 'You are a RAG system improvement analyst. Return only valid JSON arrays.',
    });

    let rawSuggestions: SuggestionPayload[] = [];
    if (aiResult.isSuccess && aiResult.data) {
      try {
        const raw = String(aiResult.data);
        const arrayMatch = raw.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          const parsed = JSON.parse(arrayMatch[0]);
          if (Array.isArray(parsed)) rawSuggestions = parsed;
        }
      } catch {
        // AI parse failure → no suggestions
      }
    }

    // ✅ SCORE-0: Filter suggestions without evidence[] before emit
    const validSuggestions = rawSuggestions.filter(
      (s) =>
        s.suggestion_text &&
        s.affected_component &&
        Array.isArray(s.evidence) &&
        s.evidence.length > 0,
    );
    const suggestionsFiltered = rawSuggestions.length - validSuggestions.length;

    const analysisId = `ise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const queuedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      analysis_id: analysisId,
      tenant_id: tenantId,
      suggestions_queued: validSuggestions.length,
      suggestions_filtered: suggestionsFiltered,
      queued_at: queuedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(ANALYSES_INDEX, doc, analysisId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store analysis',
      );
    }

    // Emit each valid suggestion to queue — NEVER apply inline
    for (const suggestion of validSuggestions) {
      await this.queue.enqueue(SUGGESTIONS_EVENT, {
        analysis_id: analysisId,
        tenant_id: tenantId,
        suggestion_text: suggestion.suggestion_text,
        affected_component: suggestion.affected_component,
        confidence: suggestion.confidence,
        evidence: suggestion.evidence,
        queued_at: queuedAt,
      });
    }

    return DataProcessResult.success({
      analysisId,
      tenantId,
      suggestionsQueued: validSuggestions.length,
      suggestionsFiltered,
      queuedAt,
    });
  }
}
