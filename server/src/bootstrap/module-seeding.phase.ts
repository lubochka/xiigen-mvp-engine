/**
 * ModuleSeedingPhase — Bootstrap Phase 8 MODULE_SEEDING.
 * P21 + P22: Seeds RAG patterns and prompts for all registered modules.
 *
 * Execution order (per module):
 *   1. seed.seedAll()    — RAG patterns + BFA rules + design records (P21)
 *   2. seed.seedPrompts() — Prompt library entries (P22)
 *
 * DNA-3: Never throws — individual seed failures are logged and skipped.
 *        Failed domains contribute -1 to their result entry.
 * Uses @Optional() so the engine starts cleanly even with no seeds registered.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { IFlowRagSeed } from '../rag-init/flow-rag-seed.interface';
import { IFlowPromptSeed } from '../rag-init/flow-prompt-seed.interface';

@Injectable()
export class ModuleSeedingPhase {
  constructor(
    @Optional() private readonly ragSeeds: IFlowRagSeed[] = [],
    @Optional() private readonly promptSeeds: IFlowPromptSeed[] = [],
  ) {}

  /**
   * Execute all registered seed operations.
   * DNA-3: Never throws — failures are captured in result records as -1.
   * Returns DataProcessResult.success with ragResults and promptResults maps.
   */
  async execute(): Promise<DataProcessResult<Record<string, unknown>>> {
    const ragResults: Record<string, number> = {};
    const promptResults: Record<string, number> = {};

    // Phase 8a: RAG seeding (P21)
    for (const seed of this.ragSeeds ?? []) {
      try {
        const result = await seed.seedAll();
        if (result.isSuccess) {
          ragResults[seed.domainId] = result.data ?? 0;
        } else {
          // DNA-3: log and continue — never throw
          ragResults[seed.domainId] = -1;
        }
      } catch {
        // Defensive catch — DNA-3: never propagate exceptions from seeds
        ragResults[seed.domainId] = -1;
      }
    }

    // Phase 8b: Prompt seeding (P22)
    for (const seed of this.promptSeeds ?? []) {
      try {
        const result = await seed.seedPrompts();
        if (result.isSuccess) {
          promptResults[seed.domainId] = result.data ?? 0;
        } else {
          // DNA-3: log and continue — never throw
          promptResults[seed.domainId] = -1;
        }
      } catch {
        // Defensive catch — DNA-3: never propagate exceptions from seeds
        promptResults[seed.domainId] = -1;
      }
    }

    return DataProcessResult.success({ ragResults, promptResults });
  }
}
