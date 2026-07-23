/**
 * ReviewsRagSeed — RAG patterns for FLOW-10 review submission domain.
 * Extends FlowRagSeedBase; provides patterns, BFA rules, and design records.
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class ReviewsRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-10-reviews';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F10-PAT-001',
        namespace: 'reviews',
        pattern: 'eligibility_before_audit',
        description:
          'Check cross-flow eligibility FIRST; only write audit AFTER eligibility confirmed. ' +
          'Never write an audit record for an ineligible submission — doing so creates a phantom audit trail.',
        codeExample:
          'const eligible = await eligibilitySvc.check(input);\n' +
          "if (!eligible.isSuccess) return emitRejected('not_eligible'); // NO audit for ineligible\n" +
          'await auditSvc.write(auditRecord); // AFTER eligibility confirmed',
        tags: ['eligibility', 'cross_flow', 'audit', 'IR-1'],
        flowId: 'FLOW-10',
        taskTypePlaceholder: '__T_PLUS_0_CONFIRMED__',
      },
      {
        patternId: 'F10-PAT-002',
        namespace: 'reviews',
        pattern: 'outbox_before_queue',
        description:
          'storeDocument() MUST be called before enqueue(). The review submission record must exist ' +
          'in the database before any downstream queue event is fired (DNA-8).',
        codeExample:
          "await this.db.storeDocument('reviews', reviewRecord);   // outbox FIRST\n" +
          "await this.queue.enqueue('review.submitted', event);     // queue AFTER",
        tags: ['outbox', 'DNA-8', 'queue', 'reviews'],
        flowId: 'FLOW-10',
        taskTypePlaceholder: '__T_PLUS_0_CONFIRMED__',
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
        patternId: 'F10-BFA-001',
        ruleId: 'CF-780',
        rule: 'CF-780: Review submission MUST check cross-flow eligibility before writing any database record',
        severity: 'ERROR',
        flowId: 'FLOW-10',
        taskType: '__T_PLUS_0_CONFIRMED__',
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
        patternId: 'F10-DR-001',
        title: 'ADR-F10-001: Eligibility gate before audit trail for review submissions',
        status: 'ACCEPTED',
        flowId: 'FLOW-10',
        rationale: 'Prevent phantom audit records for ineligible review submissions',
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
