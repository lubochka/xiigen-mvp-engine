/**
 * TeachingRoundService — runs the N-round self-judge teaching loop for a single NODE.
 *
 * Each round: 3 providers run in parallel (Gemini/Node1, OpenAI/Node2, Claude/Node3).
 * Each provider self-generates a NODE proposal, then self-judges its own output.
 * Results ranked by self-score → DPO triple stored per round (DNA-8).
 * Best NODE = output with highest chosen.score across all rounds.
 *
 * Architecture decision: provider selection is the topology plan.
 *   Node 1 = AI_GEMINI_PROVIDER, Node 2 = AI_OPENAI_PROVIDER, Node 3 = AI_JUDGE_PROVIDER.
 * No env var controls provider routing. Missing key → distinct mock (V9-002 safe).
 *
 * DNA-3: never throws — try/catch wraps run(), returns DataProcessResult.failure.
 * DNA-8: storeDocument per round before continuing loop.
 */

import { Injectable, Optional, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  IAiProvider,
  AI_GEMINI_PROVIDER,
  AI_OPENAI_PROVIDER,
  AI_JUDGE_PROVIDER,
} from '../fabrics/interfaces/ai-provider.interface';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';

export type DpoRoundRecord = {
  round: number;
  chosen: { text: string; model: string; score: number };
  rejected: { text: string; model: string; score: number };
  discarded: { text: string; model: string; score: number } | null;
  totalCost: number;
  /**
   * Round-level quality flag:
   *   'OK'           — normal round, scores contributed new information
   *   'NOISE_SIGNAL' — stagnation detected at this round (drift < threshold);
   *                    round triggered the early-stop break
   */
  qualityFlag?: 'OK' | 'NOISE_SIGNAL';
};

export type TeachingRoundResult = {
  bestOutput: string;
  bestModel: string;
  bestScore: number;
  triples: DpoRoundRecord[];
  /**
   * Session-level quality flag:
   *   'OK'            — multiple models won across rounds (healthy diversity)
   *   'SINGLE_WINNER' — one model won every round; DPO triples lack model diversity (V9-002 risk)
   */
  sessionQualityFlag: 'OK' | 'SINGLE_WINNER';
};

export type TeachingRoundOptions = {
  nodePrompt: string;
  judgeSystemPrompt: string;
  stepText: string;
  constraints: string[];
  minRounds: number;
  maxRounds: number;
  stagnationDrift: number;
  flowId: string;
  runId: string;
  tenantId: string;
  /** Topology depth of this NODE (0 = top level, 1 = first EXPAND, etc.).
   *  Required for FLOW-39 curriculum routing — depth-1 triples train a harder tier. */
  depth?: number;
  /** Human-readable intent of this NODE (= stepText from ConvergenceHandler context).
   *  Stored in the DPO triple so OSS curriculum can query triples by topic. */
  nodeIntent?: string;
  /**
   * G1: Differentiated prompt for slot index 1 (Model B / OpenAI slot).
   * When present, slot 1 receives this enriched prompt (e.g., with prev cycle summaries).
   * Slots 0 and 2 always receive nodePrompt.
   */
  nodePromptB?: string;
};

@Injectable()
export class TeachingRoundService {
  private readonly logger = new Logger(TeachingRoundService.name);

  constructor(
    @Optional() @Inject(AI_GEMINI_PROVIDER) private readonly geminiAi: IAiProvider | null = null,
    @Optional() @Inject(AI_OPENAI_PROVIDER) private readonly openaiAi: IAiProvider | null = null,
    @Optional() @Inject(AI_JUDGE_PROVIDER) private readonly judgeAi: IAiProvider | null = null,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {}

  async run(options: TeachingRoundOptions): Promise<DataProcessResult<TeachingRoundResult>> {
    try {
      const {
        nodePrompt,
        judgeSystemPrompt,
        stepText,
        constraints,
        minRounds,
        maxRounds,
        stagnationDrift,
        flowId,
        runId,
        tenantId,
        depth,
        nodeIntent,
        nodePromptB,
      } = options;

      // Fixed provider assignment: Node 1=Gemini, Node 2=OpenAI, Node 3=Claude.
      // Provider is topology — not runtime config. Missing key → mock with distinct modelId.
      const roundProviders = [
        { key: 'gemini', provider: this.geminiAi },
        { key: 'openai', provider: this.openaiAi },
        { key: 'judge', provider: this.judgeAi },
      ].filter((p): p is { key: string; provider: IAiProvider } => p.provider !== null);

      if (roundProviders.length < 2) {
        this.logger.warn(
          'TeachingRoundService: fewer than 2 providers available — rounds will produce no DPO triples',
        );
      }

      const triples: DpoRoundRecord[] = [];

      for (let round = 0; round < maxRounds; round++) {
        const settled = await Promise.allSettled(
          roundProviders.map(({ key, provider }, slotIndex) => {
            // G1: slot 1 (Model B / OpenAI slot) receives nodePromptB when present
            const promptForThisSlot = slotIndex === 1 && nodePromptB ? nodePromptB : nodePrompt;
            return this.runSelfJudgedRound(provider, promptForThisSlot, judgeSystemPrompt).then(
              (r) => (r ? { key, ...r } : null),
            );
          }),
        );

        const results = settled
          .filter(
            (
              r,
            ): r is PromiseFulfilledResult<{
              key: string;
              output: string;
              score: number;
              model: string;
              cost: number;
            }> => r.status === 'fulfilled' && r.value !== null,
          )
          .map((r) => r.value)
          .sort((a, b) => b.score - a.score);

        if (results.length < 2) {
          this.logger.debug(
            `TeachingRoundService: round ${round + 1} — fewer than 2 results, skipping`,
          );
          continue;
        }

        const [chosen, rejected, third] = results as [
          (typeof results)[0],
          (typeof results)[0],
          (typeof results)[0] | undefined,
        ];
        const triple: DpoRoundRecord = {
          round: round + 1,
          chosen: { text: chosen.output, model: chosen.model, score: chosen.score },
          rejected: { text: rejected.output, model: rejected.model, score: rejected.score },
          discarded: third ? { text: third.output, model: third.model, score: third.score } : null,
          totalCost: results.reduce((sum, r) => sum + r.cost, 0),
        };
        triples.push(triple);

        // DNA-8: store before further processing
        await this.db.storeDocument(
          'xiigen-training-data',
          {
            station: 'CYCLE-2',
            curriculumTier: 1,
            knowledgeScope: 'PRIVATE',
            round: round + 1,
            depth: depth ?? 0,
            nodeIntent: nodeIntent ?? stepText,
            stepText,
            constraints,
            chosen: triple.chosen,
            rejected: triple.rejected,
            discarded: triple.discarded,
            flowId,
            runId,
            tenantId,
            timestamp: new Date().toISOString(),
          },
          randomUUID(),
        );

        this.logger.debug(
          `TeachingRoundService: round ${round + 1}/${maxRounds} — ` +
            `chosen=${chosen.model}(${chosen.score.toFixed(1)}) rejected=${rejected.model}(${rejected.score.toFixed(1)})`,
        );

        if (round >= minRounds - 1 && this.isStagnating(triples, stagnationDrift)) {
          // Tag the stagnation round before breaking — learning-dynamics signal
          triple.qualityFlag = 'NOISE_SIGNAL';
          this.logger.debug(
            `TeachingRoundService: stagnation after round ${round + 1} — stopping early`,
          );
          break;
        }
      }

      if (triples.length === 0) {
        return DataProcessResult.failure(
          'NO_ROUNDS',
          'TeachingRoundService: no round produced valid results',
        );
      }

      const bestRound = triples.reduce(
        (best, t) => (t.chosen.score > best.chosen.score ? t : best),
        triples[0]!,
      );

      // Session-level quality flag: SINGLE_WINNER if one model won every round
      const uniqueWinners = new Set(triples.map((t) => t.chosen.model));
      const sessionQualityFlag: 'OK' | 'SINGLE_WINNER' =
        uniqueWinners.size === 1 && triples.length >= 2 ? 'SINGLE_WINNER' : 'OK';

      if (sessionQualityFlag === 'SINGLE_WINNER') {
        this.logger.warn(
          `TeachingRoundService: SINGLE_WINNER — all ${triples.length} rounds won by ${[...uniqueWinners][0]}. ` +
            'V9-002 risk: DPO triples lack model diversity.',
        );
      }

      return DataProcessResult.success({
        bestOutput: bestRound.chosen.text,
        bestModel: bestRound.chosen.model,
        bestScore: bestRound.chosen.score,
        triples,
        sessionQualityFlag,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'TEACHING_ROUND_ERROR',
        `TeachingRoundService threw: ${String(err)}`,
      );
    }
  }

  private async runSelfJudgedRound(
    provider: IAiProvider,
    nodePrompt: string,
    judgeSystemPrompt: string,
  ): Promise<{ output: string; score: number; model: string; cost: number } | null> {
    // Step 1: Generate NODE proposal — no role param, provider uses its own defaultModel
    const genResult = await provider.generate(nodePrompt);
    if (!genResult.isSuccess) return null;

    const output = String(genResult.data?.['text'] ?? '');
    const model = String(genResult.data?.['model'] ?? 'unknown');
    const genCost = (genResult.data?.['cost'] as number) ?? 0;
    if (!output) return null;

    // Step 2: Self-judge own output — same provider, same defaultModel
    const judgePrompt =
      `${judgeSystemPrompt}\n\nOUTPUT TO EVALUATE:\n${output}\n\n` +
      'Respond with a single JSON object and nothing else: { "score": <number 0-10>, "reasoning": "<one sentence>" }';
    const judgeResult = await provider.generate(judgePrompt);
    const judgeText = String(judgeResult.data?.['text'] ?? '0');
    const judgeCost = (judgeResult.data?.['cost'] as number) ?? 0;

    let score = 0;
    try {
      const parsed = JSON.parse(judgeText);
      score = typeof parsed['score'] === 'number' ? Math.min(10, Math.max(0, parsed['score'])) : 0;
    } catch {
      score = Math.min(10, Math.max(0, parseFloat(judgeText) || 0));
    }

    return { output, score, model, cost: genCost + judgeCost };
  }

  private isStagnating(triples: DpoRoundRecord[], drift: number): boolean {
    if (triples.length < 3) return false;
    const last3 = triples.slice(-3).map((t) => t.chosen.score);
    return Math.max(...last3) - Math.min(...last3) < drift;
  }
}
