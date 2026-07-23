/**
 * score.handler — Node handler for quality scoring.
 *
 * Evaluates generated code against quality gates defined in the engine contract.
 * Triggers checkpoint_report via xiigen-checkpoint-reports when max retries reached.
 *
 * CONTRACT-AWARE evaluators:
 *   - machine_constant: INVERSE of config rule (values must be hardcoded)
 *   - fail_open_behavior: only fires when contract declares failureBehavior: FAIL_OPEN
 *
 * DPO-FIX: iron_rules evaluator upgraded to use AI_JUDGE_PROVIDER (Opus).
 *   Each iron rule + generated code is passed to the judge to determine
 *   whether the rule is implemented. Falls back to heuristic when judge unavailable.
 *
 * DNA-3: returns DataProcessResult, never throws
 */
import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { IAiProvider, AI_JUDGE_PROVIDER } from '../../fabrics/interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { INodeHandler, NodeHandlerContext, NodeHandlerResult } from './node-handler.types';
import { randomUUID } from 'crypto';
import { ES_INDEX } from '../../kernel/es-index-constants';

/** A single quality gate evaluator. */
export type EvaluatorFn = (
  code: string,
  contract: Record<string, unknown>,
  taskTypeId: string,
) => number; // returns 0.0-1.0 score contribution

/** Built-in evaluators. */
export const EVALUATORS: Record<string, EvaluatorFn> = {
  dna_compliance: (code) => {
    let score = 1.0;
    // DNA-4: must extend MicroserviceBase
    if (!/extends\s+MicroserviceBase/.test(code)) score -= 0.3;
    // DNA-1: no typed models
    if (/class\s+\w+\s*\{[\s\S]*?(name|id)\s*:\s*string/.test(code)) score -= 0.1;
    // DNA-3: no throw for business logic (crude check)
    if (/throw\s+new\s+(Not|Bad|Conflict)/.test(code)) score -= 0.2;
    return Math.max(0, score);
  },

  testability: (code) => {
    // Code should be injectable and testable
    let score = 1.0;
    if (!/@Injectable/.test(code)) score -= 0.2;
    if (!/constructor/.test(code)) score -= 0.1;
    return Math.max(0, score);
  },

  machine_constant: (code, contract) => {
    // CONTRACT-AWARE INVERSE: machine constants MUST be hardcoded, NOT from config
    const machineConstants = (contract['machineConstants'] as Record<string, unknown>[]) ?? [];
    if (machineConstants.length === 0) return 1.0;
    // Check each machine constant is NOT retrieved via config.get
    let score = 1.0;
    for (const mc of machineConstants) {
      const key = String(mc['key'] ?? '');
      if (key && /config\.get/.test(code) && new RegExp(key).test(code)) {
        score -= 0.25; // Using config.get for machine constant = violation
      }
    }
    return Math.max(0, score);
  },

  fail_open_behavior: (code, contract) => {
    // CONTRACT-AWARE: only fires when contract declares failureBehavior: FAIL_OPEN
    if (contract['failureBehavior'] !== 'FAIL_OPEN') return 1.0;
    // Code must have a catch block that returns success (not re-throw)
    if (/catch[\s\S]*?DataProcessResult\.success/.test(code)) return 1.0;
    return 0.3; // Missing fail-open implementation
  },
};

@Injectable()
export class ScoreHandler implements INodeHandler {
  readonly nodeType = 'score';
  private readonly logger = new Logger(ScoreHandler.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Optional()
    @Inject(AI_JUDGE_PROVIDER)
    private readonly judgeProvider: IAiProvider | null = null,
  ) {}

  async handle(ctx: NodeHandlerContext): Promise<DataProcessResult<NodeHandlerResult>> {
    const { contract, taskTypeId, runId, flowId, tenantId, priorOutputs, nodeConfig } = ctx;

    const generateOutput = priorOutputs.find((o) => o.nodeType === 'ai-generate');
    const validateOutput = priorOutputs.find((o) => o.nodeType === 'validate');
    const generatedCode = String(generateOutput?.data?.['generatedCode'] ?? '');
    const validatePassed = Boolean(validateOutput?.data?.['passed'] ?? true);

    if (!generatedCode) {
      return DataProcessResult.failure('SCORE_NO_CODE', 'No generated code to score');
    }

    const contractDoc = contract as unknown as Record<string, unknown>;

    // Run sync evaluators
    const scores: Record<string, number> = {};
    for (const [name, fn] of Object.entries(EVALUATORS)) {
      scores[name] = fn(generatedCode, contractDoc, taskTypeId);
    }

    // Run async iron_rules evaluator (AI judge when available, heuristic fallback)
    scores['iron_rules'] = await this.evaluateIronRules(generatedCode, contractDoc, taskTypeId);

    // Validation penalty
    if (!validatePassed) {
      scores['validation'] = 0.0;
    }

    const weights: Record<string, number> = {
      dna_compliance: 0.35,
      iron_rules: 0.25,
      testability: 0.15,
      machine_constant: 0.15,
      fail_open_behavior: 0.1,
      validation: 0.0, // penalty only, no positive weight
    };

    let totalScore = 0;
    let totalWeight = 0;
    for (const [name, s] of Object.entries(scores)) {
      const w = weights[name] ?? 0;
      totalScore += s * w;
      totalWeight += w;
    }
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // After computing scores, flag for arbiter panel if multi-candidate scenario
    const multiGenerateOutput = priorOutputs.find((o) => o.nodeType === 'multi-generate');
    const candidates = (multiGenerateOutput?.data?.['candidates'] as unknown[]) ?? [];
    if (candidates.length >= 2 && contract?.arbiterConfig) {
      (ctx as unknown as Record<string, unknown>)['arbiterPanelRequired'] = true;
    }

    // Check if max retries reached
    const maxRetries = Number(nodeConfig?.['maxRetries'] ?? 3);
    const retryCount = Number(ctx.inputs?.['retryCount'] ?? 0);
    const maxRetriesReached = retryCount >= maxRetries;
    // S2-1_F14: Read threshold from contract first (Rule 14 — Config Over Code).
    // contract.threshold (e.g., T190=0.85, T191=0.90) takes precedence over nodeConfig.
    // Fallback chain: nodeConfig.scoreThreshold → contract.threshold → 0.70 default.
    const threshold = Number(nodeConfig?.['scoreThreshold'] ?? contractDoc['threshold'] ?? 0.7);

    // S2-1: Read scoreRange from topology node config — defaults to [0, 1] for backward compatibility
    const scoreRange: [number, number] = (nodeConfig?.['scoreRange'] as [number, number]) ?? [0, 1];
    const [rangeMin, rangeMax] = scoreRange;

    // Clamp raw score to declared range before storing
    const clampedScore = Math.min(rangeMax, Math.max(rangeMin, finalScore));

    // Normalize clamped score to [0, 1] for threshold comparison
    // Avoids division-by-zero if range is degenerate
    const normalizedScore =
      rangeMax === rangeMin ? 0 : (clampedScore - rangeMin) / (rangeMax - rangeMin);

    this.logger.debug(
      `Score ${taskTypeId}: rawScore=${finalScore.toFixed(3)} clamped=${clampedScore.toFixed(3)} normalized=${normalizedScore.toFixed(3)} threshold=${threshold} range=[${rangeMin},${rangeMax}] retries=${retryCount}/${maxRetries}`,
    );

    // Write checkpoint report if max retries reached
    if (maxRetriesReached) {
      await this.writeCheckpointReport({
        runId,
        flowId,
        taskTypeId,
        tenantId,
        score: clampedScore,
        maxRetriesReached: true,
        violations: Object.entries(scores)
          .filter(([, s]) => s < 0.8)
          .map(([name]) => name),
      });
    }

    // B-1: Dispatch via arbiterConfig panel when present on the contract.
    // score.handler receives the TypeScript EngineContract object — camelCase fields.
    // contractDoc is used for heuristic evaluators (they read snake_case dict from ES).
    // For arbiterConfig: read from the TypeScript object, not contractDoc.
    // contract-schema.ts toDict() serializes arbiterConfig → arbiter_config for ES only.
    const typedContract =
      contract as import('../../engine-contracts/contract-schema').EngineContract;
    const arbiterConfig = typedContract.arbiterConfig
      ? (typedContract.arbiterConfig as unknown as Record<string, unknown>)
      : undefined;

    if (arbiterConfig) {
      const panelResult = await this.scoreWithArbiterPanel(
        generatedCode,
        contractDoc,
        arbiterConfig,
        taskTypeId,
      );
      if (panelResult.blocked) {
        this.logger.warn(`BLOCK verdict for ${taskTypeId}: ${panelResult.blockReason}`);
        return DataProcessResult.success({
          data: {
            score: 0.0,
            passed: false,
            maxRetriesReached,
            threshold,
            blockReason: panelResult.blockReason,
            panelScores: panelResult.scores,
          },
        });
      }
      // Blend panel scores into the scores map
      for (const [role, s] of Object.entries(panelResult.scores)) {
        scores[role] = s;
      }
    }

    return DataProcessResult.success({
      data: {
        score: clampedScore,
        rawScore: finalScore,
        normalizedScore,
        scores,
        passed: normalizedScore >= threshold && validatePassed,
        maxRetriesReached,
        threshold,
        scoreRange,
      },
    });
  }

  /**
   * Evaluate iron rules via AI judge (claude-opus) or heuristic fallback.
   *
   * When AI_JUDGE_PROVIDER is available: each rule is sent to the judge with the
   * generated code. The judge returns YES/NO per rule. Final score = pass_count / total.
   * When unavailable: falls back to heuristic (1.0 if rules exist, 0.7 if none).
   */
  private async evaluateIronRules(
    code: string,
    contract: Record<string, unknown>,
    taskTypeId: string,
  ): Promise<number> {
    const rules = (contract['ironRules'] as string[]) ?? [];
    if (rules.length === 0) return 0.7;

    // Heuristic fallback when no judge available
    if (!this.judgeProvider) {
      this.logger.debug(
        `iron_rules ${taskTypeId}: no judge provider — heuristic fallback (neutral score)`,
      );
      return 0.7; // neutral: unknown, not verified — never artificially clean (A-1 fix)
    }

    try {
      const ruleChecks = await Promise.all(
        rules.map(async (rule) => {
          const prompt = [
            `You are a strict code reviewer evaluating whether an iron rule is implemented.`,
            ``,
            `Iron Rule: ${rule}`,
            ``,
            `Generated Code:`,
            '```typescript',
            code,
            '```',
            ``,
            `Does the generated code implement this iron rule? Reply with exactly YES or NO, then one sentence explanation.`,
          ].join('\n');

          const result = await this.judgeProvider!.generate(prompt, {
            maxTokens: 100,
            temperature: 0,
          });

          if (!result.isSuccess) {
            this.logger.warn(
              `iron_rules judge failed for rule "${rule.slice(0, 60)}": ${result.errorMessage}`,
            );
            return true; // benefit of the doubt on judge failure
          }

          const text = String(result.data?.['text'] ?? '')
            .trim()
            .toUpperCase();
          return text.startsWith('YES');
        }),
      );

      const passCount = ruleChecks.filter(Boolean).length;
      const score = passCount / rules.length;
      this.logger.debug(
        `iron_rules ${taskTypeId}: ${passCount}/${rules.length} rules pass (score=${score.toFixed(3)})`,
      );
      return score;
    } catch (err) {
      this.logger.warn(
        `iron_rules judge threw: ${(err as Error).message} — heuristic fallback (neutral score)`,
      );
      return 0.7; // neutral fallback on unexpected error — never artificially clean (A-1 fix)
    }
  }

  private async writeCheckpointReport(params: {
    runId: string;
    flowId: string;
    taskTypeId: string;
    tenantId: string;
    score: number;
    maxRetriesReached: boolean;
    violations: string[];
  }): Promise<void> {
    const report = {
      reportId: randomUUID(),
      ...params,
      status: 'HELD',
      createdAt: new Date().toISOString(),
    };
    await this.db.storeDocument(ES_INDEX.CHECKPOINT_REPORTS, report, report.reportId);
    this.logger.warn(
      `Checkpoint report written for ${params.taskTypeId} run=${params.runId} score=${params.score.toFixed(3)}`,
    );
  }

  /**
   * CN-14: Verify pattern freshness — check patternVersion against contract version.
   * Version mismatch triggers forced refresh and re-retrieval.
   */
  async verifyPatternFreshness(
    retrievedPatterns: Array<Record<string, unknown>>,
    contractVersion: string,
  ): Promise<{ stale: boolean; stalePatterns: string[] }> {
    const stalePatterns: string[] = [];
    for (const pattern of retrievedPatterns) {
      if (pattern['patternVersion'] && pattern['patternVersion'] !== contractVersion) {
        stalePatterns.push(pattern['patternId'] as string);
      }
    }
    return { stale: stalePatterns.length > 0, stalePatterns };
  }

  /**
   * B-1: Score via ArbiterPanelConfig when the contract declares one.
   * Each arbiter receives an isolated context package (per P20).
   * BLOCK-class arbiters produce a verdict that cannot be diluted by other scores.
   *
   * Context isolation per role:
   *   business_logic: ironRules + emitted events only
   *   security:       DNA-3/5/8 patterns + failureModes only
   *   key_principles: M1-M5 + P1-P22 + DNA-1..9 full text only (isolated: true)
   *   iron_rules:     contract.ironRules[] + generated code only
   *   completeness:   contract node.structure fields only
   */
  private async scoreWithArbiterPanel(
    generatedCode: string,
    contractDoc: Record<string, unknown>,
    arbiterConfig: Record<string, unknown>,
    _taskTypeId: string,
  ): Promise<{ scores: Record<string, number>; blocked: boolean; blockReason?: string }> {
    const panel = (arbiterConfig['minPanel'] as Record<string, unknown>) ?? {};
    const required: string[] = (panel['required'] as string[]) ?? [];
    const blockOnFail: string[] =
      ((arbiterConfig['blockSemantics'] as Record<string, unknown>)?.['blockOnFail'] as string[]) ??
      [];

    // BLOCK threshold: uses escalationGate.minAggregateScore ?? 0.70
    // ArbiterMinPanel has no per-arbiter minPassScore field (confirmed).
    // When ArbiterMinPanel gains minPassScore, replace 0.70 with arbiter.minPassScore.
    const blockThreshold =
      (arbiterConfig['escalationGate'] as { minAggregateScore?: number } | undefined)
        ?.minAggregateScore ?? 0.7;

    const verdicts: Record<string, number> = {};

    for (const role of required) {
      if (!this.judgeProvider) {
        // No AI judge available — use heuristic fallback per role (A-1 neutral score)
        verdicts[role] = role === 'iron_rules' ? 0.7 : 1.0;
        continue;
      }

      const contextPackage = this.buildArbiterContext(role, generatedCode, contractDoc);
      const prompt = `You are a ${role} arbiter. Score this code 0-100 on your domain only.\n${contextPackage}\nRespond ONLY in JSON: {"score": <0-100>, "passed": <true|false>, "notes": []}`;

      try {
        const result = await this.judgeProvider.generate(prompt, {
          maxTokens: 256,
          temperature: 0.1,
        });
        if (result.isSuccess && result.data?.['text']) {
          const match = (result.data['text'] as string).match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]) as { score?: number };
            verdicts[role] = Math.min(100, Math.max(0, Number(parsed.score ?? 70))) / 100;
          } else {
            verdicts[role] = 0.7;
          }
        } else {
          verdicts[role] = 0.7; // neutral fallback
        }
      } catch {
        verdicts[role] = 0.7;
      }
    }

    // Check BLOCK semantics
    const blocked = blockOnFail.some((role) => (verdicts[role] ?? 1.0) < blockThreshold);
    const blockReason = blocked
      ? `BLOCK: ${blockOnFail.filter((r) => (verdicts[r] ?? 1.0) < blockThreshold).join(', ')} below threshold (${blockThreshold})`
      : undefined;

    return { scores: verdicts, blocked, blockReason };
  }

  /**
   * B-1: Build isolated context package per arbiter role (P20 isolation).
   */
  private buildArbiterContext(
    role: string,
    code: string,
    contract: Record<string, unknown>,
  ): string {
    switch (role) {
      case 'key_principles':
        // ISOLATED: only principles + code — no iron rules, no events, no RAG (P20)
        return `PRINCIPLES (M1-M5 + P1-P22 + DNA-1..9):\n${JSON.stringify({
          m1: 'Every run produces teaching data',
          m2: 'Specialized arbiters per domain',
          p17: 'No single judge',
          p18: 'DPO requires cross-model + curriculumTier',
          p19: 'Zero known defects',
          dna: '9 DNA patterns enforced',
        })}\n\nCODE:\n${code}`;
      case 'security':
        return `SECURITY PATTERNS (DNA-3/5/8 + failureModes):\n${JSON.stringify({
          dna3: 'return DataProcessResult, never throw',
          dna5: 'tenantId on every DB operation',
          dna8: 'storeDocument before enqueue',
          failureModes: contract['failureModes'] ?? [],
        })}\n\nCODE:\n${code}`;
      case 'business_logic':
        return `IRON RULES:\n${JSON.stringify(contract['ironRules'] ?? [])}\n\nEVENTS:\n${JSON.stringify(
          contract['emits'] ?? [],
        )}\n\nCODE:\n${code}`;
      case 'iron_rules':
        return `IRON RULES:\n${JSON.stringify(contract['ironRules'] ?? [])}\n\nCODE:\n${code}`;
      default:
        return `CODE:\n${code}`;
    }
  }
}

// ── FLOW-34 exported adapter scoring utilities ───────────────────────────────

/**
 * N1 (FLOW-34): Evaluates thin adapter compliance for T-[+1] generated code.
 *
 * INVERTED SIGNAL: Score starts at 1.0 (perfect). Deductions applied for
 * prohibited patterns. Simpler adapter = higher score.
 *
 * Diagnostic threshold: If score < 0.35 across 3+ consecutive sessions,
 * log THIN_ADAPTER_SIGNAL_DEGRADED and apply PromptPatch via SK-422.
 *
 * @param generatedCode - The TypeScript source code of the generated adapter
 * @returns Score between 0.0 and 1.0, where 1.0 = perfectly thin
 */
export function evaluateThinAdapterCompliance(generatedCode: string): number {
  let score = 1.0;

  // Category 1: DB query patterns (-0.3 per unique pattern found)
  const dbPatterns = [
    /\bdb\.query\s*\(/g,
    /\brepository\.find\b/g,
    /\bentityManager\b/g,
    /\bDataSource\b/g,
    /\bQueryBuilder\b/g,
    /\bthis\.db\./g,
    /\bthis\.repository\./g,
  ];
  for (const pattern of dbPatterns) {
    const matches = generatedCode.match(pattern);
    if (matches && matches.length > 0) score -= 0.3;
  }

  // Category 2: Business rule evaluation patterns (-0.2 per unique pattern found)
  const businessRulePatterns = [
    /\bbusinessRule\b/g,
    /\bvalidate\s*\(/g,
    /\bvalidator\./g,
    /\bif\s*\(.*&&.*&&.*&&/g,
    /\bswitch\s*\(.*\)\s*\{[\s\S]{200,}/g,
  ];
  for (const pattern of businessRulePatterns) {
    const matches = generatedCode.match(pattern);
    if (matches && matches.length > 0) score -= 0.2;
  }

  // Category 3: Direct HTTP to Mode A backend (-0.4 per unique pattern found)
  const modeAPatterns = [
    /localhost:[0-9]+\/api\//gi,
    /xiigen[.-].*\.com\/api\//gi,
    /\baxios\.(get|post|put|delete)\s*\(/g,
    /\bHttpService\b/g,
    /\bHttpClient\b/g,
  ];
  for (const pattern of modeAPatterns) {
    const matches = generatedCode.match(pattern);
    if (matches && matches.length > 0) score -= 0.4;
  }

  // Category 4: Complex data transformation beyond format mapping (-0.2 per pattern)
  const complexTransformPatterns = [
    /\btransform\.(complex|deep|nested)\b/g,
    /JSON\.stringify[\s\S]{0,50}JSON\.parse/g,
    /\bObject\.keys\([\s\S]*\)\.reduce\(/g,
    /\b\.map\([\s\S]*\.map\(/g,
  ];
  for (const pattern of complexTransformPatterns) {
    const matches = generatedCode.match(pattern);
    if (matches && matches.length > 0) score -= 0.2;
  }

  return Math.max(score, 0.0);
}
