/**
 * ai-generate.handler — Node handler for AI-based code generation.
 *
 * Assembles context from priorOutputs (RAG patterns + plan steps + iron rules),
 * then runs blind parallel generation across all available AI providers
 * (AI_ENGINE/Sonnet, AI_OPENAI_PROVIDER/GPT, AI_GEMINI_PROVIDER/Gemini).
 *
 * Blind judging protocol:
 *   1. Run all providers in parallel via Promise.allSettled().
 *   2. Collect successful outputs only.
 *   3. If only one succeeded — use it directly, no judging.
 *   4. If two or more succeeded — shuffle labels (Fisher-Yates), send to
 *      AI_JUDGE_PROVIDER as Output A/B/C. Score-driven chosen/rejected selection.
 *   5. Three-way tie routes triple to xiigen-training-data-review.
 *   6. Fallback: if judge unavailable, use AI_ENGINE output, log warning.
 *
 * DNA-1: structured output as Record<string, unknown>
 * DNA-3: returns DataProcessResult, never throws
 */
import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  IAiProvider,
  AI_PROVIDER,
  AI_JUDGE_PROVIDER,
  AI_OPENAI_PROVIDER,
  AI_GEMINI_PROVIDER,
} from '../../fabrics/interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  INodeHandler,
  NodeHandlerContext,
  NodeHandlerResult,
  ModelComparisonResult,
} from './node-handler.types';
import { FreedomConfigManager } from '../../freedom/config-manager';
import { XIIGEN_FREEDOM_KEYS } from '../../freedom/config-schema';
import type { HybridGenesisPrompt } from '../../engine-contracts/hybrid-genesis-prompt';
import type { EngineContract } from '../../engine-contracts/contract-schema';

interface ProviderOutput {
  modelKey: string;
  text: string;
  model: string;
  tokensUsed: unknown;
}

@Injectable()
export class AiGenerateHandler implements INodeHandler {
  readonly nodeType = 'ai-generate';
  private readonly logger = new Logger(AiGenerateHandler.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly ai: IAiProvider,
    @Optional() @Inject(AI_JUDGE_PROVIDER) private readonly judgeAi: IAiProvider | null = null,
    @Optional() @Inject(AI_OPENAI_PROVIDER) private readonly openaiAi: IAiProvider | null = null,
    @Optional() @Inject(AI_GEMINI_PROVIDER) private readonly geminiAi: IAiProvider | null = null,
    // B-4: optional — FREEDOM config for JUDGE_MODEL runtime override
    @Optional() private readonly freedom?: FreedomConfigManager,
  ) {}

  async handle(ctx: NodeHandlerContext): Promise<DataProcessResult<NodeHandlerResult>> {
    const { contract, taskTypeId, tenantId, priorOutputs, stackTarget, nodeConfig } = ctx;

    // Gather context from prior nodes
    const ragOutput = priorOutputs.find((o) => o.nodeType === 'rag-retrieve');
    const decomposeOutput = priorOutputs.find((o) => o.nodeType === 'decompose');

    const ragPatterns = (ragOutput?.data?.['ragPatterns'] as Record<string, unknown>[]) ?? [];
    const planSteps = (decomposeOutput?.data?.['planSteps'] as Record<string, unknown>[]) ?? [];
    const ironRules: string[] = contract.ironRules ? [...contract.ironRules] : [];

    // GAP-ENG-03: inject BFA boundary rules into generator constraints so generators
    // cannot violate archetype-specific boundaries (e.g. CF-797 adapter-only translation).
    const contractAny = contract as unknown as Record<string, unknown>;
    const bfaConstraints: string[] = Array.isArray(contractAny['bfaConstraints'])
      ? (contractAny['bfaConstraints'] as string[])
      : [];
    const allConstraints = [...ironRules, ...bfaConstraints];

    // D-0c: Resolve effective stack target — ctx wins over nodeConfig, defaults to NestJS
    const effectiveStackTarget =
      stackTarget ?? (nodeConfig?.['stackTarget'] as string | undefined) ?? 'node-nestjs:server';

    // Build generation prompt — stack-aware when hybridPrompt is present
    const prompt = this.buildPrompt(
      taskTypeId,
      contract.archetype ?? 'SERVICE',
      planSteps,
      ragPatterns,
      allConstraints,
      effectiveStackTarget,
      undefined, // hybridPrompt — resolved via priorOutputs if needed
      contract,
    );
    const systemPrompt = this.buildSystemPrompt(allConstraints);

    // Guard: NULL_SYSTEM_PROMPT
    // Prevents calling AI provider with null/empty system prompt.
    // Rule 4 (DataProcessResult): return failure, never throw.
    if (!systemPrompt || systemPrompt.trim() === '') {
      return DataProcessResult.failure(
        'NULL_SYSTEM_PROMPT',
        'System prompt is null or empty. Cannot call AI provider without a valid system prompt.',
      );
    }

    const generateOptions = { systemPrompt, maxTokens: 4096 };

    this.logger.debug(
      `AI generate: taskTypeId=${taskTypeId} ragPatterns=${ragPatterns.length} steps=${planSteps.length}`,
    );

    // ── Parallel generation across all available providers ──────────────────
    type ProviderEntry = { key: string; provider: IAiProvider };
    const providers: ProviderEntry[] = [{ key: 'anthropic', provider: this.ai }];
    if (this.openaiAi) providers.push({ key: 'openai', provider: this.openaiAi });
    if (this.geminiAi) providers.push({ key: 'gemini', provider: this.geminiAi });

    const settled = await Promise.allSettled(
      providers.map(({ key, provider }) =>
        provider.generate(prompt, generateOptions).then((result) => ({ key, result })),
      ),
    );

    // Collect successful outputs only
    const successfulOutputs: ProviderOutput[] = [];
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        const { key, result } = outcome.value;
        if (result.isSuccess && result.data) {
          successfulOutputs.push({
            modelKey: key,
            text: String(result.data['text'] ?? ''),
            model: String(result.data['model'] ?? key),
            tokensUsed: result.data['tokens_used'],
          });
        } else {
          this.logger.debug(`Provider ${key} returned failure: ${result.errorMessage}`);
        }
      } else {
        this.logger.debug(`Provider settled rejected: ${String(outcome.reason)}`);
      }
    }

    // If no provider succeeded — fail
    if (successfulOutputs.length === 0) {
      return DataProcessResult.failure(
        'AI_GENERATE_FAILED',
        'All AI providers failed to generate output',
      );
    }

    // ── Single provider: no judging needed ─────────────────────────────────
    if (successfulOutputs.length === 1) {
      const only = successfulOutputs[0]!;
      this.logger.debug(`AI generate (single provider): produced ${only.text.length} chars`);
      return DataProcessResult.success({
        data: {
          generatedCode: only.text,
          model: only.model,
          tokensUsed: only.tokensUsed,
          taskTypeId,
          modelComparison: null,
          tripleStatus: 'ACCEPTED',
        },
      });
    }

    // ── Multi-provider: blind judging ───────────────────────────────────────
    const { generatedCode, model, tokensUsed, modelComparison, tripleStatus } =
      await this.runBlindJudging(successfulOutputs, ironRules, tenantId);

    this.logger.debug(
      `AI generate (multi-provider, judge): ${generatedCode.length} chars, chosen=${modelComparison?.chosen.model ?? 'fallback'}`,
    );

    return DataProcessResult.success({
      data: {
        generatedCode,
        model,
        tokensUsed,
        taskTypeId,
        modelComparison,
        tripleStatus,
      },
    });
  }

  /**
   * Run blind judging across 2-3 provider outputs.
   * Shuffle labels so the judge cannot identify providers by position.
   * Returns chosen output and modelComparison record.
   */
  private async runBlindJudging(
    outputs: ProviderOutput[],
    ironRules: string[],
    tenantId?: string,
  ): Promise<{
    generatedCode: string;
    model: string;
    tokensUsed: unknown;
    modelComparison: ModelComparisonResult | null;
    tripleStatus: 'ACCEPTED' | 'UNDECIDED';
  }> {
    // Fallback: judge unavailable — use primary (anthropic) output
    if (!this.judgeAi) {
      this.logger.warn(
        'AI_JUDGE_PROVIDER not injectable — falling back to primary AI_PROVIDER output. Multi-model comparison disabled.',
      );
      const primary = outputs.find((o) => o.modelKey === 'anthropic') ?? outputs[0]!;
      return {
        generatedCode: primary.text,
        model: primary.model,
        tokensUsed: primary.tokensUsed,
        modelComparison: null,
        tripleStatus: 'ACCEPTED',
      };
    }

    // Fisher-Yates shuffle to assign labels A/B/C
    const shuffled = [...outputs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }

    const labels = ['A', 'B', 'C'];
    const labelMap: Record<string, ProviderOutput> = {};
    for (let i = 0; i < shuffled.length; i++) {
      labelMap[labels[i]!] = shuffled[i]!;
    }

    // Build judge prompt
    let judgePrompt = `You are evaluating generated TypeScript code against these iron rules:\n${ironRules.join('\n')}\n\n`;
    for (let i = 0; i < shuffled.length; i++) {
      judgePrompt += `--- Output ${labels[i]} ---\n${shuffled[i]!.text}\n\n`;
    }
    const usedLabels = labels.slice(0, shuffled.length);
    judgePrompt += `Rank these outputs. Reply with JSON only:\n{"ranking": ${JSON.stringify(usedLabels)}, "scores": {${usedLabels.map((l) => `"${l}": 0.0`).join(', ')}}, "violations": {${usedLabels.map((l) => `"${l}": []`).join(', ')}}}`;

    // B-4: Read judge model from FREEDOM config at call time (never hardcoded)
    const judgeModel =
      this.freedom && tenantId
        ? ((await this.freedom.getConfig(tenantId, XIIGEN_FREEDOM_KEYS.JUDGE_MODEL)).data?.[
            'value'
          ] as string | undefined)
        : undefined;
    const judgeResult = await this.judgeAi.generate(judgePrompt, {
      maxTokens: 512,
      temperature: 0,
      ...(judgeModel ? { model: judgeModel } : {}),
    });

    // Fallback: judge returned failure
    if (!judgeResult.isSuccess) {
      this.logger.warn(
        `AI_JUDGE_PROVIDER returned failure: ${judgeResult.errorMessage} — falling back to primary output`,
      );
      const primary = outputs.find((o) => o.modelKey === 'anthropic') ?? outputs[0]!;
      return {
        generatedCode: primary.text,
        model: primary.model,
        tokensUsed: primary.tokensUsed,
        modelComparison: null,
        tripleStatus: 'ACCEPTED',
      };
    }

    // Parse judge JSON
    let scores: Record<string, number> = {};
    for (const l of usedLabels) scores[l] = 0;

    try {
      let raw = String(judgeResult.data?.['text'] ?? '').trim();
      if (raw.startsWith('```')) {
        raw = raw
          .split('\n')
          .slice(1)
          .join('\n')
          .replace(/```\s*$/, '')
          .trim();
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed['scores'] && typeof parsed['scores'] === 'object') {
        scores = parsed['scores'] as Record<string, number>;
      }
    } catch (err) {
      this.logger.warn(`Judge response parse failed: ${String(err)} — using fallback ordering`);
    }

    const judgeModelName = String(judgeResult.data?.['model'] ?? 'judge');

    // ── Determine chosen / rejected from scores ─────────────────────────────
    // Sort labels by score descending; tie-break: alphabetical label order.
    // Tie-break: alphabetical label order. Labels were randomly assigned — no systematic model bias.
    const sortedByScore = [...usedLabels].sort((a, b) => {
      const diff = (scores[b] ?? 0) - (scores[a] ?? 0);
      if (diff !== 0) return diff;
      return a < b ? -1 : 1; // alphabetical tie-break
    });

    // Check for three-way tie
    const allScoresEqual =
      usedLabels.length === 3 &&
      (scores[usedLabels[0]!] ?? 0) === (scores[usedLabels[1]!] ?? 0) &&
      (scores[usedLabels[0]!] ?? 0) === (scores[usedLabels[2]!] ?? 0);

    const chosenLabel = sortedByScore[0]!;
    const rejectedLabel = sortedByScore[sortedByScore.length - 1]!;
    const discardedLabel = sortedByScore.length === 3 ? sortedByScore[1]! : null;

    const chosenOutput = labelMap[chosenLabel]!;
    const rejectedOutput = chosenLabel !== rejectedLabel ? labelMap[rejectedLabel]! : null;
    const discardedOutput = discardedLabel ? labelMap[discardedLabel]! : null;

    const modelComparison: ModelComparisonResult = {
      chosen: { model: chosenOutput.modelKey, score: scores[chosenLabel] ?? 0 },
      rejected: rejectedOutput
        ? { model: rejectedOutput.modelKey, score: scores[rejectedLabel] ?? 0 }
        : null,
      discarded: discardedOutput
        ? { model: discardedOutput.modelKey, score: scores[discardedLabel!] ?? 0 }
        : null,
      judgeModel: judgeModelName,
      shuffleWasApplied: true,
    };

    return {
      generatedCode: chosenOutput.text,
      model: chosenOutput.model,
      tokensUsed: chosenOutput.tokensUsed,
      modelComparison,
      tripleStatus: allScoresEqual ? 'UNDECIDED' : 'ACCEPTED',
    };
  }

  private buildSystemPrompt(ironRules: string[]): string {
    const rulesSection =
      ironRules.length > 0
        ? `\n\nIRON RULES (violations = build failure):\n${ironRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
        : '';
    return `You are an expert NestJS TypeScript code generator for the XIIGen engine.
Generate production-ready services that:
- Extend MicroserviceBase (DNA-4)
- Use IDatabaseService via @Inject (DNA-1, Rule 1)
- Return DataProcessResult<T> (DNA-3)
- Use Record<string, unknown> for all data (DNA-1)
- Never throw for business logic
- Follow DNA-7: idempotency keys on queue consumers
- Follow DNA-8: storeDocument BEFORE enqueue

CANONICAL IMPORTS (copy these exactly — do not guess paths):
import { Injectable, Inject } from '@nestjs/common';
import { MicroserviceBase } from '../../../kernel/microservice-base';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

DataProcessResult USAGE (required pattern — never return plain objects):
  return DataProcessResult.success({ key: value });        // on success
  return DataProcessResult.failure('CODE', 'message');     // on business error (never throw)${rulesSection}`;
  }

  private buildPrompt(
    taskTypeId: string,
    archetype: string,
    planSteps: Record<string, unknown>[],
    ragPatterns: Record<string, unknown>[],
    ironRules: string[],
    stackTarget = 'node-nestjs:server',
    hybridPrompt?: HybridGenesisPrompt,
    contract?: EngineContract,
  ): string {
    // D-0c: Stack-aware routing — use HybridGenesisPrompt when available
    if (hybridPrompt) {
      const frame =
        hybridPrompt.stackImplementations?.[
          stackTarget as keyof typeof hybridPrompt.stackImplementations
        ];
      if (frame && !frame.incompatible) {
        const neutralRules =
          hybridPrompt.neutralIronRules.length > 0
            ? `Neutral business rules:\n${hybridPrompt.neutralIronRules.join('\n')}`
            : '';
        const events = `Events:\n${JSON.stringify(hybridPrompt.eventContracts, null, 2)}`;
        const stackSpecific = `Stack-specific (${stackTarget}):\n${frame.generationFrame}`;
        return [neutralRules, events, stackSpecific].filter(Boolean).join('\n\n---\n\n');
      }
    }

    // Fallback: flat prompt path — BUG-01-006 fix: include name, purpose, factoryDependencies
    const nameSection = contract?.name ? ` (${contract.name})` : '';
    const purposeSection = contract?.purpose ? `\n\nPURPOSE: ${contract.purpose}` : '';
    const depsSection = contract?.factoryDependencies?.length
      ? `\n\nINJECT THESE DEPENDENCIES (via @Inject — do not instantiate directly):\n${contract.factoryDependencies
          .map(
            (d) =>
              `- @Inject(${d.interfaceName
                .replace(/^I/, '')
                .toUpperCase()
                .replace(/([A-Z])/g, '_$1')
                .slice(1)}_SERVICE) private readonly ${
                d.interfaceName.charAt(1).toLowerCase() + d.interfaceName.slice(2)
              }: ${d.interfaceName}  // ${d.description}`,
          )
          .join('\n')}`
      : '';

    const stepsSection =
      planSteps.length > 0
        ? `\n\nIMPLEMENTATION STEPS:\n${planSteps.map((s, i) => `${i + 1}. ${s['name']}`).join('\n')}`
        : '';

    const patternsSection =
      ragPatterns.length > 0
        ? `\n\nRELEVANT PATTERNS:\n${ragPatterns
            .slice(0, 5)
            .map(
              (p) =>
                `- ${p['title'] ?? p['name'] ?? 'Pattern'}: ${p['summary'] ?? p['description'] ?? ''}`,
            )
            .join('\n')}`
        : '';

    return `Generate a NestJS TypeScript service for task type ${taskTypeId}${nameSection} (archetype: ${archetype}).${purposeSection}${depsSection}${stepsSection}${patternsSection}

Produce only the TypeScript class implementation. No explanations.`;
  }
}
