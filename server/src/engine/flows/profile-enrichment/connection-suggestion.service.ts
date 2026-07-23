/**
 * ConnectionSuggestionService (T51 Node B2) — FLOW-02 Phase B
 *
 * Reads from xiigen-matching-profiles (GLOBAL) only — NEVER from xiigen-business-profiles.
 * Handles partialResults from B1 by forwarding partialResults flag.
 * (FLOW-02-RAG-partial-input-partial-output)
 * DNA-3: returns DataProcessResult — never throws
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const MATCHING_PROFILES_INDEX = 'xiigen-matching-profiles';
const CONNECTION_SUGGESTIONS_INDEX = 'xiigen-connection-suggestions';

export interface SuggestionInput {
  userId: string;
  tenantId: string;
  matchedBusinessIds: string[];
  partialResults: boolean;
}

export interface SuggestionResult {
  suggestionId: string;
  suggestions: string[]; // businessIds
  partialResults: boolean; // forwarded from B1
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-02
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped
 */
@Injectable()
export class ConnectionSuggestionService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({ descriptor: new ServiceDescriptor({ serviceId: 'T51', serviceName: 'ConnectionSuggestionService', flowId: 'FLOW-02' }) });
  }

  async buildSuggestions(input: SuggestionInput): Promise<DataProcessResult<SuggestionResult>> {
    try {
      if (!input.userId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'Connection suggestion input validation failed',
        );
      }

      // Build suggestions by verifying matchedBusinessIds exist in xiigen-matching-profiles (GLOBAL only)
      const suggestions: string[] = [];
      for (const businessId of input.matchedBusinessIds ?? []) {
        const profileResult = await this.dbFabric.searchDocuments(MATCHING_PROFILES_INDEX, {
          knowledge_scope: 'GLOBAL',
          matching_profile_id: businessId,
        });
        if (profileResult.isSuccess && (profileResult.data ?? []).length > 0) {
          suggestions.push(businessId);
        }
      }

      const suggestionId = `sug-${Date.now()}-${createHash('sha256').update(`${input.tenantId}:${input.userId}`).digest('hex').slice(0, 6)}`;

      const doc: Record<string, unknown> = {
        suggestion_id: suggestionId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        suggestions,
        partial_results: input.partialResults, // FLOW-02-RAG-partial-input-partial-output
        created_at: new Date().toISOString(),
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
      };

      // DNA-8: storeDocument BEFORE enqueue
      const stored = await this.dbFabric.storeDocument(CONNECTION_SUGGESTIONS_INDEX, doc, suggestionId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure('SUGGESTION_STORE_FAILED', stored.errorMessage!);
      }

      await this.queueFabric.enqueue('ConnectionSuggestionsReady', {
        suggestionId,
        suggestions,
        partialResults: input.partialResults,
        userId: input.userId,
        tenantId: input.tenantId,
      });

      return DataProcessResult.success({
        suggestionId,
        suggestions,
        partialResults: input.partialResults,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'SUGGESTION_STORE_FAILED',
        `ConnectionSuggestionService threw: ${String(err)}`,
      );
    }
  }
}
