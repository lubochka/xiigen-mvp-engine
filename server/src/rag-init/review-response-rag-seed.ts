/**
 * ReviewResponseRagSeed — RAG patterns for FLOW-10 review response orchestration domain.
 * Extends FlowRagSeedBase; provides patterns, BFA rules, and design records.
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class ReviewResponseRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-10-review-response';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F10-PAT-007',
        namespace: 'review-response',
        pattern: 'ownership_before_action',
        description:
          'Verify business ownership of the reviewed entity BEFORE allowing a response to be posted. ' +
          'Only the entity owner (or authorized delegate) may respond to a review. ' +
          'Ownership check must happen FIRST — before any content processing or storage.',
        codeExample:
          'const ownershipCheck = await this.ownershipSvc.verify({\n' +
          '  tenantId: context.tenantId,\n' +
          '  entityId: input.entityId,\n' +
          '  actorId: input.actorId,\n' +
          '});\n' +
          'if (!ownershipCheck.isSuccess || !ownershipCheck.data.isOwner) {\n' +
          "  return DataProcessResult.failure('OWNERSHIP_DENIED', 'Actor does not own this entity');\n" +
          '}\n' +
          '// Only after ownership confirmed:\n' +
          "await this.db.storeDocument('review-responses', responseRecord);",
        tags: ['ownership', 'authorization', 'review_response', 'IR-7'],
        flowId: 'FLOW-10',
        taskTypePlaceholder: '__T_PLUS_3_CONFIRMED__',
      },
      {
        patternId: 'F10-PAT-008',
        namespace: 'review-response',
        pattern: 'setnx_idempotency_one_response_per_review',
        description:
          'A business may only post ONE response per review. Enforce with SETNX idempotency key. ' +
          'Key format: hash(tenantId + reviewId + "response"). ' +
          'If key already exists, return DUPLICATE_RESPONSE failure without processing.',
        codeExample:
          'const setnxKey = hash(`${tenantId}:${reviewId}:response`);\n' +
          "const acquired = await this.redisClient.set(setnxKey, '1', 'NX');\n" +
          'if (!acquired) {\n' +
          "  return DataProcessResult.failure('DUPLICATE_RESPONSE', 'A response already exists for this review');\n" +
          '}\n' +
          '// Proceed with response processing',
        tags: ['idempotency', 'SETNX', 'DNA-7', 'one_response'],
        flowId: 'FLOW-10',
        taskTypePlaceholder: '__T_PLUS_3_CONFIRMED__',
      },
    ];

    let count = 0;
    for (const pattern of patterns) {
      const result = await this.upsertPattern(pattern);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    const rules = [
      {
        patternId: 'F10-BFA-004',
        ruleId: 'CF-783',
        rule: 'CF-783: Review response MUST verify entity ownership before storing any response record',
        severity: 'ERROR',
        flowId: 'FLOW-10',
        taskType: '__T_PLUS_3_CONFIRMED__',
      },
    ];

    let count = 0;
    for (const rule of rules) {
      const result = await this.upsertPattern(rule);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    const records = [
      {
        patternId: 'F10-DR-004',
        title:
          'ADR-F10-004: Ownership gate enforces one-response-per-review with SETNX idempotency',
        status: 'ACCEPTED',
        flowId: 'FLOW-10',
        rationale:
          'Prevents duplicate responses and unauthorized responses in multi-tenant context',
      },
    ];

    let count = 0;
    for (const record of records) {
      const result = await this.upsertPattern(record);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }
}
