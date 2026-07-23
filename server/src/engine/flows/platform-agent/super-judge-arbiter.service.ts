/**
 * T653 SuperJudgeArbiter — FLOW-46 Phase B
 *
 * Post-AF-9 platform-quality gate. Three verdicts:
 *   - DEFER_TO_AF9     (CF-840 zero-cost when platformPatternsMatched === 0,
 *                       OR when LLM agrees with AF-9 verdict)
 *   - OVERRIDE_PASS    (LLM upgrades AF-9 BLOCK -> PASS)
 *   - OVERRIDE_BLOCK   (LLM downgrades AF-9 PASS -> BLOCK)
 *
 * Iron rules:
 *   IR-1: CF-840 zero-LLM path on platformPatternsMatched === 0.
 *   IR-2: superJudge.model from FREEDOM config; no hardcoded literal.
 *   IR-3: DPO triple discriminating_constraint is NON-EMPTY on every OVERRIDE.
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from '../../../fabrics/interfaces/database.interface';
import { IAiProvider, AI_PROVIDER } from '../../../fabrics/interfaces/ai-provider.interface';
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../../freedom/freedom-config.interface';

const TRAINING_DATA_INDEX = 'xiigen-training-data';
const SUPER_JUDGE_CONFIG_KEY = 'superJudge.model';

export type SuperJudgeVerdict = 'OVERRIDE_PASS' | 'OVERRIDE_BLOCK' | 'DEFER_TO_AF9';

export interface SuperJudgeInput {
  sessionId: string;
  af9Verdict: 'PASS' | 'BLOCK';
  af9Reason: string;
  platformPatterns: Array<Record<string, unknown>>;
  platformPatternsMatched: number;
  candidate: Record<string, unknown>;
}

export interface SuperJudgeOutput {
  verdict: SuperJudgeVerdict;
  reason: string;
  cost: number;
  llmCalls: number;
  modelUsed?: string;
  dpoTripleId?: string;
}

@Injectable()
export class SuperJudgeArbiter {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(AI_PROVIDER) private readonly ai: IAiProvider,
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedom: IFreedomConfigService,
  ) {}

  async evaluate(input: SuperJudgeInput): Promise<DataProcessResult<SuperJudgeOutput>> {
    if (input.platformPatternsMatched === 0) {
      return DataProcessResult.success({
        verdict: 'DEFER_TO_AF9',
        reason: 'CF-840: zero platform patterns matched; no super-judge value',
        cost: 0,
        llmCalls: 0,
      });
    }

    const modelConfig = await this.freedom.get(SUPER_JUDGE_CONFIG_KEY);
    const modelId = modelConfig?.['modelId'] as string | undefined;
    if (!modelId) {
      return DataProcessResult.failure(
        'FREEDOM_CONFIG_MISSING',
        `FREEDOM key ${SUPER_JUDGE_CONFIG_KEY}.modelId is required`,
      );
    }

    const prompt = this.buildPrompt(input);
    let aiResponse;
    try {
      aiResponse = await this.ai.generate(prompt, { model: modelId, maxTokens: 512 });
    } catch (err) {
      return DataProcessResult.failure(
        'LLM_ERROR',
        `Super-judge LLM call failed: ${String(err)}`,
      );
    }

    if (!aiResponse?.isSuccess) {
      return DataProcessResult.failure(
        aiResponse?.errorCode ?? 'LLM_FAILURE',
        aiResponse?.errorMessage ?? 'super-judge LLM returned failure',
      );
    }

    const parsed = this.parseVerdict(aiResponse.data ?? {});
    if (!parsed) {
      return DataProcessResult.failure(
        'MALFORMED_LLM_RESPONSE',
        'super-judge LLM produced unparseable verdict payload',
      );
    }

    const output: SuperJudgeOutput = {
      verdict: parsed.verdict,
      reason: parsed.reason,
      cost: 1,
      llmCalls: 1,
      modelUsed: modelId,
    };

    if (parsed.verdict === 'DEFER_TO_AF9') {
      return DataProcessResult.success(output);
    }

    if (!parsed.discriminatingConstraint || parsed.discriminatingConstraint.trim() === '') {
      return DataProcessResult.failure(
        'EMPTY_DISCRIMINATING_CONSTRAINT',
        'OVERRIDE verdict requires non-empty discriminating_constraint (IR-3)',
      );
    }

    const dpoTripleId = `dpo-${input.sessionId}-${Date.now()}`;
    const dpoDoc: Record<string, unknown> = {
      tripleId: dpoTripleId,
      sessionId: input.sessionId,
      source: 'T653_SUPER_JUDGE',
      af9Verdict: input.af9Verdict,
      superJudgeVerdict: parsed.verdict,
      teaching_point: parsed.reason,
      discriminating_constraint: parsed.discriminatingConstraint,
      modelUsed: modelId,
      timestamp: new Date().toISOString(),
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'GLOBAL',
    };

    const stored = await this.db.storeDocument(TRAINING_DATA_INDEX, dpoDoc, dpoTripleId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'DPO_WRITE_FAILED',
        stored.errorMessage ?? 'Failed to write DPO triple',
      );
    }

    output.dpoTripleId = dpoTripleId;
    return DataProcessResult.success(output);
  }

  private buildPrompt(input: SuperJudgeInput): string {
    return [
      `AF-9 verdict: ${input.af9Verdict}.`,
      `Reason: ${input.af9Reason}.`,
      `Platform patterns matched: ${input.platformPatternsMatched}.`,
      `Candidate: ${JSON.stringify(input.candidate)}.`,
      `Respond JSON: { "verdict": "OVERRIDE_PASS"|"OVERRIDE_BLOCK"|"DEFER_TO_AF9", "reason": "...", "discriminating_constraint": "..." }`,
    ].join('\n');
  }

  private parseVerdict(
    data: Record<string, unknown>,
  ): { verdict: SuperJudgeVerdict; reason: string; discriminatingConstraint?: string } | null {
    const raw = (data['text'] ?? data['content'] ?? data['response'] ?? data) as unknown;
    let payload: Record<string, unknown> | null = null;
    if (typeof raw === 'string') {
      try {
        payload = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return null;
      }
    } else if (raw && typeof raw === 'object') {
      payload = raw as Record<string, unknown>;
    }
    if (!payload) return null;
    const verdict = payload['verdict'] as SuperJudgeVerdict | undefined;
    if (!verdict || !['OVERRIDE_PASS', 'OVERRIDE_BLOCK', 'DEFER_TO_AF9'].includes(verdict)) {
      return null;
    }
    return {
      verdict,
      reason: (payload['reason'] as string) ?? '',
      discriminatingConstraint: payload['discriminating_constraint'] as string | undefined,
    };
  }
}
