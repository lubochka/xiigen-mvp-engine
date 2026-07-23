/**
 * depth-decision.handler — Cycle 3: Depth Decision (LEAF vs EXPAND)
 *
 * MACHINE CONSTRAINT GATE runs FIRST before any AI call.
 * If currentDepth >= terminationDepth, returns LEAF immediately — no AI.
 * Otherwise, calls AI with 5 complexity signals (S1-S5) and QUESTION YOURSELF.
 *
 * Grade formula:
 *   justificationPresent = (signalsEvaluated.length > 0 || terminationBoundApplied) ? 1 : 0
 *   nonOverlap = LEAF ? 1 : (all subFlowDecomposition[].isDistinct ? 1 : 0)
 *   grade = justificationPresent * nonOverlap
 *
 * DNA-1: Record<string, unknown> for all fabric calls
 * DNA-3: never throw, always return DataProcessResult
 * DNA-5: tenantId from ctx, never passed to fabric
 * DNA-8: storeDocument BEFORE returning result
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IAiProvider,
  AI_PROVIDER,
  AiModelRole,
} from '../../fabrics/interfaces/ai-provider.interface';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { INodeHandler, NodeHandlerContext, NodeHandlerResult } from './node-handler.types';
import { randomUUID } from 'crypto';

interface SubFlowNode {
  name: string;
  intClause: string;
  isDistinct: boolean;
}

interface DepthDeciderOutput {
  verdict: 'LEAF' | 'EXPAND';
  justification: string;
  signalsEvaluated: string[];
  signalsTriggered: string[];
  subFlowDecomposition: SubFlowNode[] | null;
}

@Injectable()
export class DepthDecisionHandler implements INodeHandler {
  readonly nodeType = 'depth-decision';
  private readonly logger = new Logger(DepthDecisionHandler.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly ai: IAiProvider,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {}

  async handle(ctx: NodeHandlerContext): Promise<DataProcessResult<NodeHandlerResult>> {
    const { inputs, flowId, tenantId, runId } = ctx;

    const verifiedNode = (inputs['verifiedNode'] as Record<string, unknown> | undefined) ?? null;
    const currentDepth = typeof inputs['currentDepth'] === 'number' ? inputs['currentDepth'] : 1;
    const terminationDepth =
      typeof inputs['terminationDepth'] === 'number' ? inputs['terminationDepth'] : 3;
    const depthHistoryQuery = String(inputs['depthHistoryQuery'] ?? 'NO_PRIOR_DECISIONS');
    const flowDomain = inputs['flowDomain'] ? String(inputs['flowDomain']) : undefined;
    const gradeThreshold =
      typeof inputs['gradeThreshold'] === 'number' ? inputs['gradeThreshold'] : 0.85;

    if (!verifiedNode) {
      return DataProcessResult.failure('DEPTH_MISSING_NODE', 'verifiedNode is required');
    }

    const visibilityId = randomUUID();

    // ── MACHINE CONSTRAINT GATE ──────────────────────────────────────────────
    // If at termination depth, return LEAF immediately — AI is NOT called
    if (currentDepth >= terminationDepth) {
      const terminationOutput: DepthDeciderOutput = {
        verdict: 'LEAF',
        justification: `depth = ${currentDepth} = terminationDepth — bound enforced`,
        signalsEvaluated: [],
        signalsTriggered: [],
        subFlowDecomposition: null,
      };

      const justificationPresent = 1; // terminationBoundApplied counts
      const nonOverlap = 1; // LEAF
      const grade = justificationPresent * nonOverlap; // = 1.0

      // DNA-8: storeDocument BEFORE returning
      await this.db.storeDocument(
        'xiigen-cycle-visibility',
        {
          id: visibilityId,
          cycleType: 'CYCLE_3_DEPTH_DECISION',
          flowId,
          tenantId,
          runId,
          sent: {
            verifiedNode,
            currentDepth,
            terminationDepth,
            depthHistoryQuery,
            flowDomain: flowDomain ?? null,
          },
          received: {
            verdict: terminationOutput.verdict,
            justification: terminationOutput.justification,
            signalsEvaluated: terminationOutput.signalsEvaluated,
            signalsTriggered: terminationOutput.signalsTriggered,
            subFlowDecomposition: null,
          },
          decided: {
            grade,
            accepted: grade >= gradeThreshold,
            terminationBoundApplied: true,
            signalEvidence: 'TERMINATION_BOUND_ENFORCED', // GAP-C3: Q3 verification field
          },
          changed: 'NODE forwarded to Cycle 4 executor generation',
        } as Record<string, unknown>,
        visibilityId,
      );

      return DataProcessResult.success({
        data: {
          verdict: 'LEAF',
          justification: `depth = ${currentDepth} = terminationDepth — bound enforced`,
          signalsEvaluated: [],
          signalsTriggered: [],
          subFlowDecomposition: null,
          terminationBoundApplied: true,
          grade,
          accepted: true,
          visibilityId,
          promptSent: '',
        } as Record<string, unknown>,
      });
    }

    // ── AI CALL ──────────────────────────────────────────────────────────────
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      verifiedNode,
      currentDepth,
      terminationDepth,
      depthHistoryQuery,
      flowDomain,
    );

    const aiResult = await this.ai.generate(userPrompt, { systemPrompt, role: AiModelRole.FAST });
    if (!aiResult.isSuccess) {
      return DataProcessResult.failure(
        'DEPTH_AI_FAILED',
        aiResult.errorMessage ?? 'Depth decider AI call failed',
      );
    }

    const rawText = String(aiResult.data?.['text'] ?? '');
    let output: DepthDeciderOutput;
    try {
      output = this.parseOutput(rawText);
    } catch {
      return DataProcessResult.failure(
        'DEPTH_PARSE_FAILED',
        'Failed to parse depth decider AI output as JSON',
      );
    }

    // Grade formula
    const justificationPresent = output.signalsEvaluated.length > 0 ? 1 : 0;
    const nonOverlap =
      output.verdict === 'LEAF'
        ? 1
        : output.subFlowDecomposition?.every((n) => n.isDistinct)
          ? 1
          : 0;
    const grade = justificationPresent * nonOverlap;
    const accepted = grade >= gradeThreshold;

    const changed =
      output.verdict === 'EXPAND'
        ? 'sub-flow decomposition created for next Cycle 1'
        : 'NODE forwarded to Cycle 4 executor generation';

    // DNA-8: storeDocument BEFORE returning
    await this.db.storeDocument(
      'xiigen-cycle-visibility',
      {
        id: visibilityId,
        cycleType: 'CYCLE_3_DEPTH_DECISION',
        flowId,
        tenantId,
        runId,
        sent: {
          verifiedNode,
          currentDepth,
          terminationDepth,
          depthHistoryQuery,
          flowDomain: flowDomain ?? null,
        },
        received: {
          verdict: output.verdict,
          justification: output.justification,
          signalsEvaluated: output.signalsEvaluated,
          signalsTriggered: output.signalsTriggered,
          subFlowDecomposition: output.subFlowDecomposition,
        },
        decided: {
          grade,
          accepted,
          terminationBoundApplied: false,
          signalEvidence: output.signalsTriggered.join(', ') || 'NO_SIGNALS', // GAP-C3: Q3 verification field
        },
        changed,
      } as Record<string, unknown>,
      visibilityId,
    );

    return DataProcessResult.success({
      data: {
        verdict: output.verdict,
        justification: output.justification,
        signalsEvaluated: output.signalsEvaluated,
        signalsTriggered: output.signalsTriggered,
        subFlowDecomposition: output.subFlowDecomposition,
        terminationBoundApplied: false,
        grade,
        accepted,
        visibilityId,
        promptSent: userPrompt,
      } as Record<string, unknown>,
    });
  }

  private buildSystemPrompt(): string {
    return `You are the Depth Decider for the XIIGen engine.
Evaluate a verified NODE and decide whether it is a LEAF (single-responsibility, ready for executor generation) or EXPAND (needs sub-flow decomposition).

5 Complexity Signals (S1-S5):
S1: Multi-clause intent — does the NODE's purpose contain multiple independent clauses?
S2: Branching conditions — does the NODE require conditional logic across more than 2 paths?
S3: External aggregate dependencies — does the NODE depend on 3+ upstream outputs?
S4: State machine presence — does the NODE manage a lifecycle with 3+ transitions?
S5: Composition depth — is the NODE itself a composition of other NODEs?

QUESTION YOURSELF before finalising:
1. Does the NODE serve a single responsibility? (single responsibility check)
2. Are all 5 signals evaluated? (signal completeness)
3. Is the justification grounded in signal evidence? (evidence-based reasoning)
4. If EXPAND, are sub-nodes truly distinct and non-overlapping? (overlap check)

Respond ONLY with valid JSON. No markdown fences.
Format:
{
  "verdict": "LEAF|EXPAND",
  "justification": "...",
  "signalsEvaluated": ["S1", "S2", ...],
  "signalsTriggered": ["S1", ...],
  "subFlowDecomposition": null | [{"name": "...", "intClause": "...", "isDistinct": true}]
}`;
  }

  private buildUserPrompt(
    verifiedNode: Record<string, unknown>,
    currentDepth: number,
    terminationDepth: number,
    depthHistoryQuery: string,
    flowDomain?: string,
  ): string {
    const lines = [
      `VERIFIED NODE:\n${JSON.stringify(verifiedNode, null, 2)}`,
      `CURRENT DEPTH: ${currentDepth}`,
      `TERMINATION DEPTH: ${terminationDepth}`,
    ];
    if (depthHistoryQuery && depthHistoryQuery !== 'NO_PRIOR_DECISIONS') {
      lines.push(`PRIOR DEPTH DECISIONS: ${depthHistoryQuery}`);
    }
    if (flowDomain) lines.push(`FLOW DOMAIN: ${flowDomain}`);
    lines.push('\nEvaluate the 5 complexity signals and return your verdict as JSON.');
    return lines.join('\n');
  }

  private parseOutput(raw: string): DepthDeciderOutput {
    let text = raw.trim();
    if (text.startsWith('```')) {
      text = text
        .split('\n')
        .slice(1)
        .join('\n')
        .replace(/```\s*$/, '')
        .trim();
    }
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      verdict: (parsed['verdict'] as 'LEAF' | 'EXPAND') ?? 'LEAF',
      justification: String(parsed['justification'] ?? ''),
      signalsEvaluated: (parsed['signalsEvaluated'] as string[]) ?? [],
      signalsTriggered: (parsed['signalsTriggered'] as string[]) ?? [],
      subFlowDecomposition: (parsed['subFlowDecomposition'] as SubFlowNode[] | null) ?? null,
    };
  }
}
