/**
 * DistilledRuleExtractor (T596) — FLOW-38 Phase C
 *
 * Extracts 1-3 distilled rules from the winning NODE of a SUCCESS_WITHIN_BUDGET cycle
 * and seeds them to xiigen-distilled-rules for future convergence context.
 *
 * EXTRACTOR-ORDERING iron rule: this service MUST NOT be invoked for WASTED_CYCLE outcomes.
 * The invocation guard lives upstream (queue consumer filter). This service assumes
 * outcome=SUCCESS_WITHIN_BUDGET and will return failure if called otherwise.
 *
 * Iron rules:
 *   CF-807: extraction only when outcome=SUCCESS_WITHIN_BUDGET.
 *   CF-802: each extracted rule carries source cycleId for traceability.
 *   DNA-8: storeDocument(rule records) BEFORE enqueue(DistilledRuleSeeded).
 *   DNA-3: returns DataProcessResult<T>, never throws.
 *   DNA-5: tenantId from context — not passed to fabric methods.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';

const DISTILLED_RULES_INDEX = 'xiigen-distilled-rules';

/** MACHINE: extraction count bounds per cycle. */
const MIN_RULES_PER_CYCLE = 1;
const MAX_RULES_PER_CYCLE = 3;

export interface ExtractOptions {
  cycleId: string;
  flowId: string;
  outcome: 'SUCCESS_WITHIN_BUDGET';
  winningNodeRef: Record<string, unknown>;
}

export interface ExtractResult {
  cycleId: string;
  extractedRules: Record<string, unknown>[];
  ruleCount: number;
}

@Injectable()
export class DistilledRuleExtractor {
  private readonly logger = new Logger(DistilledRuleExtractor.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  async extract(options: ExtractOptions): Promise<DataProcessResult<ExtractResult>> {
    try {
      const { cycleId, flowId, outcome, winningNodeRef } = options;

      if (!cycleId) {
        return DataProcessResult.failure('MISSING_CYCLE_ID', 'cycleId is required');
      }

      // CF-807: extraction guard — this service assumes SUCCESS_WITHIN_BUDGET
      if (outcome !== 'SUCCESS_WITHIN_BUDGET') {
        return DataProcessResult.failure(
          'WASTED_CYCLE_EXTRACTION_PREVENTED',
          `DistilledRuleExtractor must not run for outcome=${outcome} — CF-807 violation prevented`,
        );
      }

      if (!winningNodeRef || !winningNodeRef['nodeId']) {
        return DataProcessResult.failure(
          'NO_WINNING_NODE',
          `No winning node reference for cycle ${cycleId}`,
        );
      }

      // Extract rules from the winning node's constraints and quality criteria
      const constraints = Array.isArray(winningNodeRef['constraints'])
        ? (winningNodeRef['constraints'] as string[])
        : [];
      const qualityCriteria = Array.isArray(winningNodeRef['qualityCriteria'])
        ? (winningNodeRef['qualityCriteria'] as string[])
        : [];
      const intent = String(winningNodeRef['intent'] ?? '');

      // Synthesize distilled rules from node content (1-3 rules)
      const rawRules: string[] = [
        ...constraints.filter((c) => c.length > 20),
        ...qualityCriteria.filter((q) => q.length > 20),
      ].slice(0, MAX_RULES_PER_CYCLE);

      if (rawRules.length < MIN_RULES_PER_CYCLE && intent) {
        rawRules.push(intent);
      }

      const candidateRules = rawRules.slice(0, MAX_RULES_PER_CYCLE);
      if (candidateRules.length === 0) {
        return DataProcessResult.failure(
          'LOW_CONFIDENCE_RULE_SKIPPED',
          `No extractable rules found in winning node for cycle ${cycleId}`,
        );
      }

      const extractedRules: Record<string, unknown>[] = [];

      for (const ruleText of candidateRules) {
        const ruleId = `DR-${cycleId}-${extractedRules.length + 1}`;
        const rule: Record<string, unknown> = {
          ruleId,
          cycleId, // CF-802: traceability — source cycleId on every rule
          flowId,
          ruleText,
          sourceNodeId: winningNodeRef['nodeId'],
          extractedAt: new Date().toISOString(),
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'GLOBAL',
        };

        // DNA-8: storeDocument BEFORE enqueue
        const storeResult = await this.db.storeDocument(DISTILLED_RULES_INDEX, rule, ruleId);
        if (storeResult.isSuccess) {
          extractedRules.push(rule);
        } else {
          this.logger.warn(
            `DistilledRuleExtractor: failed to store rule ${ruleId}: ${storeResult.errorMessage ?? 'unknown'}`,
          );
        }
      }

      if (extractedRules.length === 0) {
        return DataProcessResult.failure(
          'ALL_RULES_STORE_FAILED',
          `All rule store operations failed for cycle ${cycleId}`,
        );
      }

      // Emit after all storeDocument calls
      await this.queue.enqueue('DistilledRuleSeeded', {
        cycleId,
        flowId,
        ruleCount: extractedRules.length,
        ruleIds: extractedRules.map((r) => r['ruleId']),
      });

      this.logger.log(
        `DistilledRuleExtractor: cycle=${cycleId} extracted=${extractedRules.length} rules`,
      );
      return DataProcessResult.success({
        cycleId,
        extractedRules,
        ruleCount: extractedRules.length,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'EXTRACTOR_ERROR',
        `DistilledRuleExtractor threw: ${String(err)}`,
      );
    }
  }
}
