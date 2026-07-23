/**
 * SeedPromptRegistrar — T406 [BUILD].
 *
 * Registers generated seed prompts into the prompt registry.
 * Validates FLOW_SCOPED connection_type and non-empty promptText.
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

export interface SeedPromptRegistrationResult {
  registrationId: string;
  promptCount: number;
  flowId: string;
  registeredAt: string;
}

export class SeedPromptRegistrar {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async register(
    tenantId: string,
    flowId: string,
    prompts: Array<{
      taskType: string;
      promptText: string;
      connection_type: string;
      flow_id: string;
    }>,
  ): Promise<DataProcessResult<SeedPromptRegistrationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    if (!prompts.length)
      return DataProcessResult.failure('MISSING_PROMPTS', 'prompts are required');

    // Validate prompt shape
    for (const p of prompts) {
      if (p.connection_type !== 'FLOW_SCOPED') {
        return DataProcessResult.failure(
          'INVALID_CONNECTION_TYPE',
          `Prompt for ${p.taskType} must have connection_type FLOW_SCOPED`,
        );
      }
      if (!p.promptText || p.promptText.trim().length < 10) {
        return DataProcessResult.failure(
          'INVALID_PROMPT_TEXT',
          `Prompt for ${p.taskType} must have non-empty promptText`,
        );
      }
    }

    const registrationId = randomUUID();
    const promptCount = prompts.length;
    const registeredAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      registrationId,
      tenantId,
      flowId,
      prompts,
      promptCount,
      registeredAt,
    };

    const stored = await this.db.storeDocument('flow26-seed-prompts', doc, registrationId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.prompts.registered', {
      registrationId,
      tenantId,
      flowId,
      promptCount,
      registeredAt,
    });

    return DataProcessResult.success({ registrationId, promptCount, flowId, registeredAt });
  }
}
