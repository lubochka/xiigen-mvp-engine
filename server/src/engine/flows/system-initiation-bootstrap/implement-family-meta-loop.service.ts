/**
 * ImplementFamilyMetaLoop — T539 [AI_GENERATION_LOOP].
 *
 * Bounded retry loop driving per-family code generation.
 * Max retries from FREEDOM config "flow33_max_family_retries" — NEVER hardcoded.
 *
 * CF-750: Evolved prompt MUST NOT be applied to in-flight session.
 *
 * DNA-3: All methods return DataProcessResult — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';
import type {
  Flow33Ai,
  Flow33ConsensusResult,
  Flow33ContextPack,
  Flow33FreedomConfig,
} from './flow33-shared-interfaces';

export interface FamilyImplementationResult {
  runId: string;
  familyId: string;
  verdict: 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED' | 'MAX_RETRIES_EXCEEDED';
  attempts: number;
  generatedBundleId?: string;
}

export type ContextPack = Flow33ContextPack;

export type ConsensusResult = Flow33ConsensusResult;

interface IContextPackAssembler {
  assemble(
    tenantId: string,
    familyId: string,
    query: string,
  ): Promise<DataProcessResult<ContextPack>>;
}

interface IConsensusGate {
  runConsensus(bundle: Record<string, unknown>): Promise<DataProcessResult<ConsensusResult>>;
}

interface IStatusRegistry {
  transition(
    tenantId: string,
    flowId: string,
    familyId: string,
    runId: string,
    status: string,
    reason?: string,
  ): Promise<DataProcessResult<unknown>>;
}

const DEFAULT_MAX_RETRIES = 3;

export class ImplementFamilyMetaLoop {
  constructor(
    private readonly ai: Flow33Ai,
    private readonly freedom: Flow33FreedomConfig,
    private readonly contextPackAssembler: IContextPackAssembler,
    private readonly consensusGate: IConsensusGate,
    private readonly statusRegistry: IStatusRegistry,
  ) {}

  /**
   * Read max retries from FREEDOM config — never hardcode (score-0 if hardcoded).
   */
  private async readMaxRetries(): Promise<number> {
    const result = await this.freedom.get('flow33_max_family_retries');
    if (!result.isSuccess || result.data == null) return DEFAULT_MAX_RETRIES;
    const val = Number(result.data);
    return isNaN(val) || val <= 0 ? DEFAULT_MAX_RETRIES : val;
  }

  /**
   * Build generation prompt for a family, injecting context pack and arbiter feedback.
   * CF-750: evolved prompt only applied to new sessions — caller must ensure no in-flight conflict.
   */
  private buildPrompt(familyId: string, contextPack: ContextPack, feedback?: string): string {
    const contextSummary = contextPack.vectorResults
      .slice(0, 5)
      .map((r) => JSON.stringify(r))
      .join('\n');
    const feedbackSection = feedback
      ? `\n\nPrevious attempt feedback (inject into this prompt, not in-flight):\n${feedback}`
      : '';
    return `Generate NestJS service code for family ${familyId}.\n\nContext from GraphRAG:\n${contextSummary}${feedbackSection}\n\nReturn JSON: { code: string, description: string }`;
  }

  /**
   * Extract arbiter feedback from consensus result for next iteration injection.
   */
  private extractFeedback(consensus: ConsensusResult): string {
    return consensus.verdicts
      .filter((v) => !v.passed)
      .map((v) => `[${v.arbiterId}]: ${v.notes}`)
      .join('\n');
  }

  /**
   * Run the bounded retry meta-loop for a family.
   * Retries from FREEDOM config. Arbiter feedback injected between rounds.
   * CF-750: prompt evolution only for new sessions.
   */
  async run(
    tenantId: string,
    flowId: string,
    familyId: string,
    runId: string,
  ): Promise<DataProcessResult<FamilyImplementationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!familyId) return DataProcessResult.failure('MISSING_FAMILY_ID', 'familyId is required');

    const maxRetries = await this.readMaxRetries();
    let attempts = 0;
    let feedback: string | undefined;
    let lastVerdict: ConsensusResult['verdict'] = 'REJECTED';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      attempts = attempt;

      // Assemble fresh ContextPack per attempt (CF-747: no stale reuse)
      const packResult = await this.contextPackAssembler.assemble(
        tenantId,
        familyId,
        `implement family ${familyId}`,
      );
      if (!packResult.isSuccess) {
        return DataProcessResult.failure(packResult.errorCode!, packResult.errorMessage!);
      }

      // Build generation prompt — inject feedback from previous round (CF-750: new session only)
      const prompt = this.buildPrompt(familyId, packResult.data!, feedback);

      // Generate code via AI FABRIC
      const generated = await this.ai.generate(prompt);
      if (!generated.isSuccess || !generated.data) {
        continue; // AI call failed — retry
      }

      let bundle: Record<string, unknown> = {};
      try {
        bundle = JSON.parse(generated.data);
      } catch {
        bundle = { code: generated.data, familyId, runId };
      }
      bundle['bundleId'] = bundle['bundleId'] ?? randomUUID();

      // Run 5-arbiter consensus gate
      const consensusResult = await this.consensusGate.runConsensus(bundle);
      if (!consensusResult.isSuccess) {
        continue;
      }

      const consensus = consensusResult.data!;
      lastVerdict = consensus.verdict;

      if (consensus.verdict === 'APPROVED') {
        // Transition to COMPLETED via status registry
        await this.statusRegistry.transition(
          tenantId,
          flowId,
          familyId,
          runId,
          'COMPLETED',
          'Approved by 5-arbiter consensus',
        );
        return DataProcessResult.success({
          runId,
          familyId,
          verdict: 'APPROVED',
          attempts,
          generatedBundleId: bundle['bundleId'] as string,
        });
      }

      // Inject feedback for next iteration (CF-750: only into new sessions — this is a new prompt per loop)
      feedback = this.extractFeedback(consensus);
    }

    // Max retries exceeded → NEEDS_REVIEW
    await this.statusRegistry.transition(
      tenantId,
      flowId,
      familyId,
      runId,
      'NEEDS_REVIEW',
      `Max retries (${maxRetries}) exceeded. Last verdict: ${lastVerdict}`,
    );

    return DataProcessResult.failure(
      'MAX_RETRIES_EXCEEDED_HUMAN_REVIEW',
      `Family ${familyId} exceeded max ${maxRetries} retries. Transitioned to NEEDS_REVIEW.`,
    );
  }
}
