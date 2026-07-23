/**
 * ContextQueryHandler — AI-mediated retrieval loop for context gap enrichment.
 *
 * When an arbiter fails because it lacked information, this handler:
 *   1. Uses AI to build an ES query from the gap description (AI_ENGINE, temp 0.1)
 *   2. Executes that query against xiigen-flow-pool
 *   3. Uses AI to synthesize results into a structured ContextBlock (AI_JUDGE, temp 0.1)
 *
 * Stored to xiigen-context-blocks (DNA-8) before returning.
 *
 * Budget gate: checks budgetCallsUsed + 2 <= budget before running.
 * Two AI calls per invocation — formulate + synthesize.
 *
 * INodeHandler.handle() exists for registry compatibility; returns NOT_SUPPORTED.
 * T583 calls executeQuery() directly from ArbitrationLoopController.
 *
 * DNA-3: all methods return DataProcessResult, never throw.
 * DNA-5: tenantId scope on all pool queries.
 * DNA-8: storeDocument on xiigen-context-blocks before returning ENRICHED.
 *
 * SESSION-T582: Context Query Handler.
 */

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import {
  IAiProvider,
  AI_PROVIDER,
  AI_JUDGE_PROVIDER,
} from '../../fabrics/interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  INodeHandler,
  type NodeHandlerContext,
  type NodeHandlerResult,
} from './node-handler.types';
import { FlowPoolWriterService } from '../flow-pool/flow-pool-writer.service';
import { ContextBlock } from '../flow-pool/flow-pool-entry.types';
import { XIIGEN_FREEDOM_KEYS, XIIGEN_FREEDOM_DEFAULTS } from '../../freedom/config-schema';

export const CONTEXT_BLOCKS_INDEX = 'xiigen-context-blocks';

/** Disposition of a context query attempt. */
export type ContextQueryDisposition =
  | 'ENRICHED'
  | 'ZERO_RESULTS'
  | 'BUDGET_EXHAUSTED'
  | 'AI_FAILED';

/** Output from executeQuery(). */
export interface ContextQueryOutput {
  /** The stored context block (present when disposition is ENRICHED). */
  block?: ContextBlock;
  /** Text ready to prepend to an arbiter prompt. */
  injectionBlock: string;
  /** Updated budget count after this call. */
  budgetCallsUsed: number;
  /** How this attempt resolved. */
  disposition: ContextQueryDisposition;
}

/** Input for a context query request. */
export interface ContextQueryInput {
  /** The arbiter that failed and needs enrichment. */
  arbiterId: string;
  /** The gap description extracted from the arbiter's notes. */
  gapDescription: string;
  /** Current budget usage (2 calls will be consumed). */
  budgetCallsUsed: number;
  /** Maximum AI calls allowed for this run (from FREEDOM config). */
  budgetMax: number;
  /** Iteration number for this arbiter (1-based). */
  iterationNumber: number;
  /** Arbiter verdict before enrichment. */
  verdictBefore: string;
  /** Run identifier for scoped pool queries. */
  runId: string;
  /** Tenant identifier (DNA-5). */
  tenantId: string;
}

@Injectable()
export class ContextQueryHandler implements INodeHandler {
  readonly nodeType = 'context-query';
  private readonly logger = new Logger(ContextQueryHandler.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(AI_PROVIDER) private readonly aiEngine: IAiProvider,
    @Optional() @Inject(AI_JUDGE_PROVIDER) private readonly aiJudge: IAiProvider | null,
    private readonly poolWriter: FlowPoolWriterService,
  ) {}

  /**
   * Registry compatibility — ContextQueryHandler is never invoked via topology contracts.
   * Called directly from ArbitrationLoopController.
   */
  async handle(_ctx: NodeHandlerContext): Promise<DataProcessResult<NodeHandlerResult>> {
    return DataProcessResult.failure(
      'NOT_SUPPORTED',
      'ContextQueryHandler is invoked directly, not via topology node.',
    );
  }

  /**
   * Execute a context query for a failing arbiter.
   * Two AI calls: (1) formulate ES query, (2) synthesize context block.
   * DNA-8: storeDocument before returning ENRICHED.
   */
  async executeQuery(input: ContextQueryInput): Promise<DataProcessResult<ContextQueryOutput>> {
    // Budget gate: need 2 calls
    if (input.budgetCallsUsed + 2 > input.budgetMax) {
      return DataProcessResult.success({
        injectionBlock: '',
        budgetCallsUsed: input.budgetCallsUsed,
        disposition: 'BUDGET_EXHAUSTED',
      });
    }

    let budgetUsed = input.budgetCallsUsed;

    // ── Call 1: Formulate ES query from gap description ───────────────────────
    const queryFormulationPrompt = `You are a search query builder for a code generation engine execution pool.
Given a gap description from an arbiter that lacked context, build a precise search query to retrieve
relevant execution history from the flow pool.

Gap description: "${input.gapDescription}"
Arbiter ID: "${input.arbiterId}"

Return ONLY a JSON object (no markdown, no explanation) with these keys:
{
  "terms": ["search term 1", "search term 2"],
  "nodeTypes": ["ai-generate", "score"],
  "successOnly": false
}

Focus on terms that would surface prior executions relevant to this specific gap.
nodeTypes: include node types whose outputs would help resolve the gap.
successOnly: true if you need confirmed working patterns; false if failures are also informative.`;

    let queryJson: { terms?: string[]; nodeTypes?: string[]; successOnly?: boolean } = {};
    try {
      const formulationResult = await this.aiEngine.generate(queryFormulationPrompt, {
        temperature: 0.1,
        maxTokens: 500,
        systemPrompt: 'You are a precise JSON generator. Return only valid JSON.',
      });
      budgetUsed++;

      if (formulationResult.isSuccess && formulationResult.data) {
        const raw =
          ((formulationResult.data as Record<string, unknown>)['content'] as string) ?? '';
        try {
          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            queryJson = JSON.parse(jsonMatch[0]) as typeof queryJson;
          }
        } catch {
          this.logger.warn(`ContextQueryHandler: failed to parse query JSON, using defaults`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`ContextQueryHandler: query formulation AI call failed: ${msg}`);
      return DataProcessResult.success({
        injectionBlock: '',
        budgetCallsUsed: budgetUsed,
        disposition: 'AI_FAILED',
      });
    }

    // ── Execute pool query ────────────────────────────────────────────────────
    const poolQueryOpts: { nodeType?: string; successOnly?: boolean } = {};
    if (queryJson.nodeTypes?.length === 1) {
      poolQueryOpts.nodeType = queryJson.nodeTypes[0];
    }
    if (queryJson.successOnly === true) {
      poolQueryOpts.successOnly = true;
    }

    const poolResult = await this.poolWriter.queryEntries(
      input.runId,
      input.tenantId,
      poolQueryOpts,
    );

    const poolEntries = poolResult.isSuccess ? (poolResult.data ?? []) : [];

    if (poolEntries.length === 0) {
      return DataProcessResult.success({
        injectionBlock: '',
        budgetCallsUsed: budgetUsed,
        disposition: 'ZERO_RESULTS',
      });
    }

    // ── Call 2: Synthesize context block from pool entries ─────────────────
    const judge =
      this.aiJudge ??
      (() => {
        this.logger.warn(
          'ContextQueryHandler: AI_JUDGE_PROVIDER absent — using AI_ENGINE for synthesis',
        );
        return this.aiEngine;
      })();

    const poolSummary = poolEntries
      .slice(0, 10)
      .map(
        (e, i) =>
          `Entry ${i + 1}: nodeType=${e.nodeType} success=${e.success} phase=${e.executionPhase}\n` +
          `  outputs=${JSON.stringify(e.outputs).substring(0, 200)}` +
          (e.arbiterDecisions?.length ? `\n  arbiters=${JSON.stringify(e.arbiterDecisions)}` : ''),
      )
      .join('\n\n');

    const synthesisPrompt = `You are a context synthesizer for an AI code generation engine.
Given raw execution history from the flow pool, synthesize the most relevant context
that would help an arbiter evaluate code quality.

Arbiter that needs context: "${input.arbiterId}"
Gap description: "${input.gapDescription}"

Execution history (most recent ${poolEntries.length} entries):
${poolSummary}

Focus on:
- Patterns across similar runs relevant to this arbiter's domain
- Common failure modes that apply to this gap
- Architectural constraints demonstrated in practice
- Evidence that either supports or contradicts what the code should do

Return a concise synthesis (max 300 words) suitable for prepending to an arbiter prompt.
Start directly with the context — no preamble, no "Here is the context:".`;

    let synthesizedContext = '';
    try {
      const synthesisResult = await judge.generate(synthesisPrompt, {
        temperature: 0.1,
        maxTokens: 600,
        systemPrompt: 'You are a precise context synthesizer. Be concise and evidence-based.',
      });
      budgetUsed++;

      if (synthesisResult.isSuccess && synthesisResult.data) {
        synthesizedContext =
          ((synthesisResult.data as Record<string, unknown>)['content'] as string) ?? '';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`ContextQueryHandler: synthesis AI call failed: ${msg}`);
      return DataProcessResult.success({
        injectionBlock: '',
        budgetCallsUsed: budgetUsed,
        disposition: 'AI_FAILED',
      });
    }

    if (!synthesizedContext.trim()) {
      return DataProcessResult.success({
        injectionBlock: '',
        budgetCallsUsed: budgetUsed,
        disposition: 'ZERO_RESULTS',
      });
    }

    // ── Build context block and injection text ─────────────────────────────
    const injectionBlock = this.buildInjectionBlock(
      input.arbiterId,
      input.gapDescription,
      synthesizedContext,
    );

    const block: ContextBlock = {
      blockId: randomUUID(),
      runId: input.runId,
      tenantId: input.tenantId,
      targetArbiterId: input.arbiterId,
      iterationNumber: input.iterationNumber,
      gapDescription: input.gapDescription,
      queryFormulated: JSON.stringify(queryJson),
      sourceEntryIds: poolEntries.map((e) => e.entryId),
      synthesizedContext,
      injectedBefore: injectionBlock,
      confidence: Math.min(0.9, 0.5 + poolEntries.length * 0.05),
      verdictBefore: input.verdictBefore,
      budgetCallsAtWrite: budgetUsed,
      createdAt: new Date().toISOString(),
    };

    // DNA-8: store before returning
    try {
      await this.db.storeDocument(
        CONTEXT_BLOCKS_INDEX,
        block as unknown as Record<string, unknown>,
        block.blockId,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`ContextQueryHandler: failed to store context block: ${msg}`);
      // Don't fail the enrichment — the block is still usable in memory
    }

    return DataProcessResult.success({
      block,
      injectionBlock,
      budgetCallsUsed: budgetUsed,
      disposition: 'ENRICHED',
    });
  }

  /**
   * Build the text to prepend to an arbiter prompt.
   * T583 calls this with the synthesized context to inject before re-running the arbiter.
   */
  buildInjectionBlock(
    arbiterId: string,
    gapDescription: string,
    synthesizedContext: string,
  ): string {
    return [
      `=== CONTEXT ENRICHMENT FOR ${arbiterId.toUpperCase()} ARBITER ===`,
      `Gap identified: ${gapDescription}`,
      ``,
      `Relevant execution history:`,
      synthesizedContext.trim(),
      `=== END CONTEXT ENRICHMENT ===`,
      ``,
    ].join('\n');
  }

  /**
   * Read the budget limit from FREEDOM config defaults.
   * T583 calls this once per run to establish budgetMax.
   */
  getDefaultBudget(): number {
    return (
      (XIIGEN_FREEDOM_DEFAULTS[XIIGEN_FREEDOM_KEYS.CONTEXT_ARBITER_BUDGET_PER_RUN] as number) ?? 20
    );
  }

  /**
   * Read the max iterations per arbiter from FREEDOM config defaults.
   */
  getDefaultMaxIter(): number {
    return (
      (XIIGEN_FREEDOM_DEFAULTS[
        XIIGEN_FREEDOM_KEYS.CONTEXT_ARBITER_MAX_ITER_PER_ARBITER
      ] as number) ?? 5
    );
  }
}
