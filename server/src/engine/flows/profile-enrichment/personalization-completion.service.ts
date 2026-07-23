/**
 * PersonalizationCompletionService (T52 Node D) — FLOW-02 Phase D
 *
 * MACHINE event name: 'PersonalizationCompleted' (FLOW-02-DR-02-C)
 * NOT 'OnboardingCompleted' — that is FLOW-01's event. Two flows emitting
 * the same event name = cross-flow collision (duplicate feeds, no local error).
 * DNA-8: storeDocument BEFORE PersonalizationCompleted emit.
 * DNA-7: SETNX idempotency: hash(tenantId + userId + 'personalization-complete')
 * DNA-3: returns DataProcessResult — never throws
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { createCloudEvent } from '../../../kernel/cloud-events';

const PERSONALIZATION_COMPLETIONS_INDEX = 'xiigen-personalization-completions';

// MACHINE event name — FLOW-02-DR-02-C: cross-flow contract, exact string literal
// NEVER 'OnboardingCompleted' — that belongs to FLOW-01
const PERSONALIZATION_COMPLETED_EVENT = 'PersonalizationCompleted' as const;

export interface CompletionInput {
  userId: string;
  tenantId: string;
  feedId: string;
  profileId: string;
}

export interface CompletionResult {
  completionId: string;
  completed: boolean;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-02
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped
 */
@Injectable()
export class PersonalizationCompletionService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({ descriptor: new ServiceDescriptor({ serviceId: 'T52', serviceName: 'PersonalizationCompletionService', flowId: 'FLOW-02' }) });
  }

  async complete(input: CompletionInput): Promise<DataProcessResult<CompletionResult>> {
    try {
      if (!input.userId || !input.tenantId || !input.feedId || !input.profileId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'Personalization completion input validation failed',
        );
      }

      // DNA-7: idempotency check
      const idemKey = createHash('sha256')
        .update(`${input.tenantId}:${input.userId}:personalization-complete`)
        .digest('hex')
        .slice(0, 12);
      const existing = await this.dbFabric.searchDocuments(PERSONALIZATION_COMPLETIONS_INDEX, {
        user_id: input.userId,
        idempotency_key: idemKey,
      });
      if (existing.isSuccess && (existing.data ?? []).length > 0) {
        const rec = existing.data![0] as Record<string, unknown>;
        return DataProcessResult.success({
          completionId: rec['completion_id'] as string,
          completed: true,
        });
      }

      const completionId = `pc-${Date.now()}-${createHash('sha256').update(`${input.tenantId}:${input.userId}`).digest('hex').slice(0, 6)}`;
      const completedAt = new Date().toISOString();

      const doc: Record<string, unknown> = {
        completion_id: completionId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        feed_id: input.feedId,
        profile_id: input.profileId,
        idempotency_key: idemKey,
        completed_at: completedAt,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
      };

      // DNA-8: storeDocument BEFORE PersonalizationCompleted emit
      const stored = await this.dbFabric.storeDocument(
        PERSONALIZATION_COMPLETIONS_INDEX,
        doc,
        completionId,
      );
      if (!stored.isSuccess) {
        return DataProcessResult.failure('COMPLETION_STORE_FAILED', stored.errorMessage!);
      }

      // MACHINE event: 'PersonalizationCompleted' — NOT 'OnboardingCompleted' (FLOW-02-DR-02-C)
      // Payload contains NO PII — no questionnaire data
      const cloudEvent = createCloudEvent({
        eventType: PERSONALIZATION_COMPLETED_EVENT,
        source: 'personalization-completion-service',
        tenantId: input.tenantId,
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          feedId: input.feedId,
          profileId: input.profileId,
          personalizationCompletedAt: completedAt,
        },
      });

      await this.queueFabric.enqueue(PERSONALIZATION_COMPLETED_EVENT, cloudEvent);

      return DataProcessResult.success({ completionId, completed: true });
    } catch (err) {
      return DataProcessResult.failure(
        'COMPLETION_STORE_FAILED',
        `PersonalizationCompletionService threw: ${String(err)}`,
      );
    }
  }
}
