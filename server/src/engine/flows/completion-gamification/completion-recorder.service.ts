/**
 * CompletionRecorder (T83) — FLOW-05 Phase 1A
 * Single responsibility: idempotent questionnaire completion recording + fan-out.
 *
 * Iron rules:
 *   IR-83-1: SETNX on (questionnaireId, userId) — return existing record on duplicate.
 *            Concurrent or retried submissions must not create multiple completion records.
 *   IR-83-2: DNA-8 — storeDocument(completion) BEFORE QuestionnaireAnswered emitted.
 *            If process crashes after emit but before store, downstream gamification
 *            services receive an event for a completion that does not exist in DB.
 *   IR-83-3: Completion records are PRIVATE scope (knowledge_scope: 'PRIVATE').
 *            Completions belong to the individual learner — not tenant-wide.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 *   DNA-5:   tenantId comes from input (caller is responsible for CLS scope).
 *            No direct CLS read here — this service is called from a queue consumer
 *            that has already extracted tenantId from the CloudEvent envelope.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const COMPLETIONS_INDEX = 'xiigen-questionnaire-completions';

export interface CompletionInput {
  questionnaireId: string;
  userId: string;
  tenantId: string;
  /** ISO-8601 timestamp when the submission was received. Caller-supplied for testability. */
  submittedAt?: string;
}

export interface CompletionResult {
  completionId: string;
  /** true when an existing record was returned (SETNX idempotency, IR-83-1) */
  idempotent: boolean;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className CompletionRecorder
 */
@Injectable()
export class CompletionRecorder extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T83',
        serviceName: 'CompletionRecorder',
        flowId: 'FLOW-05',
      }),
    });
  }

  async record(input: CompletionInput): Promise<DataProcessResult<CompletionResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.questionnaireId || !input.userId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'CompletionRecorder: questionnaireId, userId, and tenantId are required',
        );
      }

      // ── IR-83-1: SETNX — return existing if (questionnaireId, userId) found ──
      const existing = await this.dbFabric.searchDocuments(COMPLETIONS_INDEX, {
        questionnaire_id: input.questionnaireId,
        user_id: input.userId,
      });
      if (existing.isSuccess && (existing.data ?? []).length > 0) {
        const rec = existing.data![0] as Record<string, unknown>;
        return DataProcessResult.success({
          completionId: rec['completion_id'] as string,
          idempotent: true,
        });
      }

      // ── Build completion record ───────────────────────────────────────────
      const now = input.submittedAt ?? new Date().toISOString();
      const completionId = `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const doc: Record<string, unknown> = {
        completion_id: completionId,
        questionnaire_id: input.questionnaireId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        submitted_at: now,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE', // IR-83-3: learner-private record
        created_at: now,
      };

      // DNA-8: storeDocument BEFORE QuestionnaireAnswered emit ──────────────
      const stored = await this.dbFabric.storeDocument(COMPLETIONS_INDEX, doc, completionId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      // ── Fan-out: emit QuestionnaireAnswered → Branch A + B + C ─────────────
      await this.queueFabric.enqueue('questionnaire.answered', {
        completionId,
        questionnaireId: input.questionnaireId,
        userId: input.userId,
        tenantId: input.tenantId,
        submittedAt: now,
      });

      return DataProcessResult.success({ completionId, idempotent: false });
    } catch (err) {
      return DataProcessResult.failure(
        'COMPLETION_RECORDER_ERROR',
        `CompletionRecorder threw: ${String(err)}`,
      );
    }
  }
}
