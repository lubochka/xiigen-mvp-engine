/**
 * SelfExtensionLearner — T408 [LEARNING].
 *
 * SCORE-0 async-only: MUST NOT run on the live request path.
 * Learns from flow extension outcomes to improve future code generation.
 * Stores learning signal and emits event for async processing.
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

export interface LearningSignalResult {
  signalId: string;
  flowId: string;
  queued: boolean;
  queuedAt: string;
}

export class SelfExtensionLearner {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  /**
   * SCORE-0: async-only — call from queue consumer, never from live request path.
   */
  async learn(
    tenantId: string,
    flowId: string,
    outcome: Record<string, unknown>,
  ): Promise<DataProcessResult<LearningSignalResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    const signalId = randomUUID();
    const queuedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      signalId,
      tenantId,
      flowId,
      outcome,
      scoreFlag: 'SCORE-0',
      queuedAt,
    };

    const stored = await this.db.storeDocument('flow26-learning-signals', doc, signalId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.extension.learned', { signalId, tenantId, flowId, queuedAt });

    return DataProcessResult.success({ signalId, flowId, queued: true, queuedAt });
  }
}
