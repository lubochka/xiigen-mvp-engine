/**
 * HybridGenesisPromptBuilder (T591) — FLOW-37 Phase C
 *
 * Assembles a HybridGenesisPrompt with exactly 4 mandatory sections from T590 coupling audit.
 *
 * D-STACK-2: exactly 4 mandatory sections:
 *   1. NEUTRAL_IRON_RULES — constraints that apply to all stacks
 *   2. CONCEPT_DESCRIPTION — what the feature does (stack-neutral)
 *   3. EVENT_CONTRACTS — CloudEvents schema
 *   4. STACK_IMPLEMENTATIONS — per-stack implementation guidance (IMPL_VARIES + STACK_COUPLED)
 * Section 5 CLIENT_FRAMEWORK_NOTES is optional.
 *
 * Iron rules:
 *   CF-800: T590 coupling audit output is REQUIRED input — T591 must not run without it.
 *   D-STACK-1: IMPL_VARIES elements get stack-specific substitution in Section 4.
 *   D-STACK-2: assembled prompt must have exactly 4 mandatory sections.
 *   DNA-8: storeDocument(HybridGenesisPrompt) BEFORE enqueue(HybridPromptReady).
 *   DNA-3: returns DataProcessResult<T>, never throws.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import type { CouplingClassification } from './stack-coupling-auditor.service';

const PROMPTS_INDEX = 'xiigen-hybrid-genesis-prompts';

/** D-STACK-2: mandatory section names. */
export const MANDATORY_SECTIONS_4 = [
  'NEUTRAL_IRON_RULES',
  'CONCEPT_DESCRIPTION',
  'EVENT_CONTRACTS',
  'STACK_IMPLEMENTATIONS',
] as const;

export type PromptSection = (typeof MANDATORY_SECTIONS_4)[number] | 'CLIENT_FRAMEWORK_NOTES';

export interface BuildPromptOptions {
  taskTypeId: string;
  couplingAuditId: string;
  couplingClassifications: CouplingClassification[];
}

export interface HybridGenesisPrompt {
  sections: Partial<Record<PromptSection, Record<string, unknown>>>;
  sectionsProduced: 4;
}

export interface BuildPromptResult {
  taskTypeId: string;
  hybridGenesisPrompt: HybridGenesisPrompt;
  sectionsProduced: 4;
  stacksAddressed: number;
  incompatibleStacksExcluded: number;
  promptId: string;
}

@Injectable()
export class HybridGenesisPromptBuilder {
  private readonly logger = new Logger(HybridGenesisPromptBuilder.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  async build(options: BuildPromptOptions): Promise<DataProcessResult<BuildPromptResult>> {
    try {
      const { taskTypeId, couplingAuditId, couplingClassifications } = options;

      if (!taskTypeId) {
        return DataProcessResult.failure('MISSING_TASK_TYPE_ID', 'taskTypeId is required');
      }

      // CF-800: coupling audit output REQUIRED — T591 must not run without it
      if (!couplingAuditId || !couplingClassifications || couplingClassifications.length === 0) {
        return DataProcessResult.failure(
          'MISSING_COUPLING_AUDIT',
          `CF-800 violation: couplingAuditId and couplingClassifications are required inputs (T590 must run before T591). taskTypeId=${taskTypeId}`,
        );
      }

      // Separate compatible and incompatible stacks
      const compatibleStacks = couplingClassifications.filter((c) => c.category !== 'INCOMPATIBLE');
      const incompatibleStacks = couplingClassifications.filter(
        (c) => c.category === 'INCOMPATIBLE',
      );

      // D-STACK-2: assemble exactly 4 mandatory sections
      const sections: Partial<Record<PromptSection, Record<string, unknown>>> = {
        NEUTRAL_IRON_RULES: {
          description: 'Constraints that apply to all stacks',
          rules: [
            'DNA-8: storeDocument() before enqueue()',
            'DNA-3: returns DataProcessResult<T>, never throws',
            'DNA-5: tenant scope from AsyncLocalStorage — no tenantId parameter',
          ],
        },
        CONCEPT_DESCRIPTION: {
          description: 'What this feature does, independent of stack',
          taskTypeId,
          conceptNeutralElements: compatibleStacks
            .filter((s) => s.category === 'CONCEPT_NEUTRAL')
            .map((s) => s.stackId),
        },
        EVENT_CONTRACTS: {
          description: 'CloudEvents schema for this task type',
          events: [
            { type: `com.xiigen.${taskTypeId}.started`, schema: 'generic' },
            { type: `com.xiigen.${taskTypeId}.completed`, schema: 'generic' },
          ],
        },
        STACK_IMPLEMENTATIONS: {
          description: 'Per-stack implementation guidance',
          stacks: compatibleStacks.map((s) => ({
            stackId: s.stackId,
            category: s.category,
            // D-STACK-1: IMPL_VARIES and STACK_COUPLED get stack-specific substitution
            guidance:
              s.category === 'IMPL_VARIES' || s.category === 'STACK_COUPLED'
                ? `Stack-specific implementation for ${s.stackId} (${s.category})`
                : `Standard implementation applies to ${s.stackId}`,
          })),
        },
      };

      // Validate D-STACK-2: all 4 mandatory sections present
      const missingSections = MANDATORY_SECTIONS_4.filter((s) => !sections[s]);
      if (missingSections.length > 0) {
        return DataProcessResult.failure(
          'PROMPT_MISSING_SECTION',
          `D-STACK-2 violation: missing mandatory sections: ${missingSections.join(', ')}`,
        );
      }

      const promptId = `PROMPT-${taskTypeId}-${couplingAuditId}`;
      const hybridGenesisPrompt: HybridGenesisPrompt = {
        sections,
        sectionsProduced: 4,
      };

      const promptRecord: Record<string, unknown> = {
        promptId,
        taskTypeId,
        couplingAuditId,
        hybridGenesisPrompt,
        sectionsProduced: 4,
        stacksAddressed: compatibleStacks.length,
        incompatibleStacksExcluded: incompatibleStacks.length,
        createdAt: new Date().toISOString(),
      };

      // DNA-8: storeDocument BEFORE enqueue
      const storeResult = await this.db.storeDocument(PROMPTS_INDEX, promptRecord, promptId);
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'PROMPT_STORE_FAILED',
          `Failed to store hybrid genesis prompt for ${taskTypeId}: ${storeResult.errorMessage ?? 'unknown'}`,
        );
      }

      await this.queue.enqueue('HybridPromptReady', {
        promptId,
        taskTypeId,
        sectionsProduced: 4,
        stacksAddressed: compatibleStacks.length,
        incompatibleStacksExcluded: incompatibleStacks.length,
      });

      this.logger.log(
        `HybridGenesisPromptBuilder: taskType=${taskTypeId} sections=4 stacks=${compatibleStacks.length} excluded=${incompatibleStacks.length}`,
      );
      return DataProcessResult.success({
        taskTypeId,
        hybridGenesisPrompt,
        sectionsProduced: 4,
        stacksAddressed: compatibleStacks.length,
        incompatibleStacksExcluded: incompatibleStacks.length,
        promptId,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'PROMPT_BUILDER_ERROR',
        `HybridGenesisPromptBuilder threw: ${String(err)}`,
      );
    }
  }
}
