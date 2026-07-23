/**
 * ModerationRagSeed — RAG patterns for FLOW-10 moderation engine domain.
 * Extends FlowRagSeedBase; provides patterns, BFA rules, and design records.
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class ModerationRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-10-moderation';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F10-PAT-003',
        namespace: 'moderation',
        pattern: 'three_path_moderation',
        description:
          'FLOW-10 moderation has THREE outcomes: PASS, REJECT, UNCERTAIN. ' +
          'UNCERTAIN is NOT a rejection — it routes to the human review queue. ' +
          'Use switch-case with all three branches. Never collapse UNCERTAIN into REJECT. ' +
          'This overrides FLOW-08 T79 binary moderation training.',
        codeExample:
          'switch (moderationOutcome) {\n' +
          "  case 'PASS':\n" +
          "    return DataProcessResult.success({ status: 'APPROVED' });\n" +
          "  case 'REJECT':\n" +
          "    return DataProcessResult.success({ status: 'REJECTED', reason: rejectionReason });\n" +
          "  case 'UNCERTAIN':\n" +
          '    // Route to human review queue — NOT a rejection\n' +
          "    await this.queue.enqueue('moderation.human-review-required', { reviewId, reason: 'uncertain' });\n" +
          "    return DataProcessResult.success({ status: 'PENDING_HUMAN_REVIEW' });\n" +
          '}',
        tags: ['moderation', 'three_path', 'UNCERTAIN', 'human_queue', 'IR-2'],
        flowId: 'FLOW-10',
        taskTypePlaceholder: '__T_PLUS_1_CONFIRMED__',
      },
      {
        patternId: 'F10-PAT-004',
        namespace: 'moderation',
        pattern: 'do_not_use_binary_if_else',
        description:
          'ANTI-PATTERN: Do not use binary if/else for moderation. ' +
          'if (outcome === PASS) { ... } else { return failure(); } collapses UNCERTAIN into REJECT ' +
          'which is an IR-2 violation and results in a score-0 DPO triple.',
        codeExample:
          '// WRONG — do not do this:\n' +
          "// if (outcome === 'PASS') { ... } else { return DataProcessResult.failure(...); }\n\n" +
          '// CORRECT — always use switch with all 3 cases:\n' +
          "switch (outcome) { case 'PASS': ...; case 'REJECT': ...; case 'UNCERTAIN': ... }",
        tags: ['moderation', 'anti_pattern', 'binary', 'IR-2'],
        flowId: 'FLOW-10',
        taskTypePlaceholder: '__T_PLUS_1_CONFIRMED__',
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
        patternId: 'F10-BFA-002',
        ruleId: 'CF-781',
        rule: 'CF-781: Moderation MUST handle UNCERTAIN outcome with human-queue routing, never collapse to REJECT',
        severity: 'ERROR',
        flowId: 'FLOW-10',
        taskType: '__T_PLUS_1_CONFIRMED__',
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
        patternId: 'F10-DR-002',
        title: 'ADR-F10-002: Three-path moderation overrides binary FLOW-08 T79 pattern',
        status: 'ACCEPTED',
        flowId: 'FLOW-10',
        rationale:
          'UNCERTAIN reviews require human judgment; auto-rejection causes false negatives',
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
