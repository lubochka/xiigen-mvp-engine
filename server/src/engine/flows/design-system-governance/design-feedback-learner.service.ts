/**
 * DesignFeedbackLearner — T510 [LEARNING].
 *
 * SCORE-0 ASYNC-ONLY: NEVER run on live request path.
 * Learns from design deployment feedback: updates pattern confidence scores.
 * Stores with scoreFlag: 'SCORE-0'.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface DesignFeedbackLearnResult {
  signalId: string;
  specId: string;
  learnedAt: string;
}

export class DesignFeedbackLearner {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async learn(
    tenantId: string,
    specId: string,
    feedback: {
      deploymentOutcome: 'success' | 'failure';
      patternSignals: Array<{ patternName: string; confidence: number }>;
    },
  ): Promise<DataProcessResult<DesignFeedbackLearnResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    const signalId = randomUUID();
    const learnedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      signalId,
      tenantId,
      specId,
      scoreFlag: 'SCORE-0',
      ...feedback,
      learnedAt,
    };

    const stored = await this.db.storeDocument('flow31-design-learning-signals', doc, signalId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.feedback.learned', { signalId, tenantId, specId, learnedAt });

    return DataProcessResult.success({ signalId, specId, learnedAt });
  }
}
