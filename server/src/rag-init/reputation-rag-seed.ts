/**
 * ReputationRagSeed — RAG patterns for FLOW-10 reputation score aggregation domain.
 * Extends FlowRagSeedBase; provides patterns, BFA rules, and design records.
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class ReputationRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-10-reputation-aggregation';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F10-PAT-005',
        namespace: 'reputation-aggregation',
        pattern: 'aggregate_retraction',
        description:
          'When a review is retracted, the reputation aggregate must be recalculated by re-summing ' +
          'all non-retracted reviews. Do NOT subtract the retracted review score from the running total ' +
          '— floating point drift accumulates over time. Always recompute from source.',
        codeExample:
          '// On ReviewRetracted event:\n' +
          "const activeReviews = await this.db.searchDocuments('reviews', {\n" +
          '  subjectId: event.subjectId,\n' +
          "  status: 'ACTIVE', // excludes retracted\n" +
          '});\n' +
          'const newAggregate = computeAggregate(activeReviews.data);\n' +
          "await this.db.storeDocument('reputation-scores', { subjectId: event.subjectId, ...newAggregate });",
        tags: ['reputation', 'aggregation', 'retraction', 'recompute'],
        flowId: 'FLOW-10',
        taskTypePlaceholder: '__T_PLUS_2_CONFIRMED__',
      },
      {
        patternId: 'F10-PAT-006',
        namespace: 'reputation-aggregation',
        pattern: 'score_range_0_5_not_normalized',
        description:
          'FLOW-10 reputation scores use a 0–5 range (not normalized 0–1). ' +
          'Do not apply 0–1 normalization used in FLOW-06 T74. ' +
          'Store raw aggregated score on 0–5 scale.',
        codeExample:
          '// CORRECT for FLOW-10:\n' +
          'const aggregateScore = totalScore / reviewCount; // range 0.0–5.0\n\n' +
          '// WRONG — do not normalize to 0-1 (that is FLOW-06 T74 pattern):\n' +
          '// const normalizedScore = aggregateScore / 5;',
        tags: ['reputation', 'score_range', 'anti_pattern', 'FLOW-06'],
        flowId: 'FLOW-10',
        taskTypePlaceholder: '__T_PLUS_2_CONFIRMED__',
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
        patternId: 'F10-BFA-003',
        ruleId: 'CF-782',
        rule: 'CF-782: Reputation score aggregation MUST recompute from all active reviews on retraction, not subtract',
        severity: 'ERROR',
        flowId: 'FLOW-10',
        taskType: '__T_PLUS_2_CONFIRMED__',
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
        patternId: 'F10-DR-003',
        title:
          'ADR-F10-003: Full recompute on retraction prevents floating-point drift in reputation scores',
        status: 'ACCEPTED',
        flowId: 'FLOW-10',
        rationale: 'Subtracting from running total causes drift; recompute is deterministic',
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
