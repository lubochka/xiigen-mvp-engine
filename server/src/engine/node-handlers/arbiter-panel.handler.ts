import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import {
  IAiProvider,
  AiModelRole,
  AI_SCOPE_ARBITER,
} from '../../fabrics/interfaces/ai-provider.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import {
  buildBusinessLogicContext,
  buildSecurityContext,
  buildSkillsContext,
  buildPromptsContext,
  buildKeyPrinciplesContext,
  buildScopeIsolationContext,
  ArbiterContext,
} from './arbiter-context-builders';
import type { GenerationCandidate } from './parallel-generation.service';

export type ArbiterVerdict = 'ADVISORY' | 'BLOCK';

export interface ArbiterVerdictRecord {
  arbiterId: string;
  candidateLabel: string;
  verdict: ArbiterVerdict;
  reason: string;
  evaluatedAt: string;
  tenantId: string;
}

export interface ArbiterPanelResult {
  chosen: GenerationCandidate | null;
  escalatedToHuman: boolean;
  cyclesUsed: number;
  verdicts: ArbiterVerdictRecord[];
  allBlocked: boolean;
}

export interface ArbiterConfig {
  evaluatorArbiters: Record<
    string,
    {
      modelToken: string;
      expertise: string;
      blind: boolean;
      isolated: boolean;
    }
  >;
  blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS';
  undecidedIndex?: string;
}

@Injectable()
export class ArbiterPanelHandler {
  readonly handlerType = 'arbiter-panel';
  private readonly logger = new Logger(ArbiterPanelHandler.name);
  private readonly MAX_CYCLES = 3;

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls?: ClsService,
    // AI_SCOPE_ARBITER: dedicated economy-tier provider for scope_isolation (FC-32/SK-526).
    // Registered as useExisting: AI_JUDGE_PROVIDER until a dedicated model is configured.
    @Optional() @Inject(AI_SCOPE_ARBITER) private readonly scopeAiProvider?: IAiProvider,
  ) {}

  /**
   * Evaluate candidates through the arbiter panel.
   * ANY_BLOCK_CLASS_REJECTS: any BLOCK verdict eliminates the candidate.
   * key_principles arbiter runs SEQUENTIALLY after all others (S2-04 adds this).
   * Never throws.
   */
  async evaluate(params: {
    candidates: GenerationCandidate[];
    arbiterConfig: ArbiterConfig;
    contractContext: {
      ironRules?: string[];
      domainEvents?: string[];
      bfaRules?: string[];
      ragPatterns?: string[];
      genesisPrompt?: string;
      failureModes?: string[];
    };
    aiProvider: { generate: (prompt: string) => Promise<{ text: string }> };
  }): Promise<ArbiterPanelResult> {
    // Resolve tenant once for the entire panel run — all verdicts stored under same tenant
    const tenantId = (() => {
      try {
        return this.cls?.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? 'unknown';
      } catch {
        return 'unknown';
      }
    })();

    const allVerdicts: ArbiterVerdictRecord[] = [];
    let cyclesUsed = 0;
    let remaining = [...params.candidates];

    for (let cycle = 0; cycle < this.MAX_CYCLES && remaining.length > 0; cycle++) {
      cyclesUsed++;
      const survivingThisCycle: GenerationCandidate[] = [];

      for (const candidate of remaining) {
        // Build contexts for the 5 parallel arbiters (FC-32: scope_isolation mandatory)
        const contexts: ArbiterContext[] = [
          buildBusinessLogicContext({
            code: candidate.code,
            ironRules: params.contractContext.ironRules,
            domainEvents: params.contractContext.domainEvents,
            bfaRules: params.contractContext.bfaRules,
          }),
          buildSecurityContext({
            code: candidate.code,
            failureModes: params.contractContext.failureModes,
          }),
          buildSkillsContext({
            code: candidate.code,
            ragPatterns: params.contractContext.ragPatterns,
          }),
          buildPromptsContext({
            code: candidate.code,
            genesisPrompt: params.contractContext.genesisPrompt,
          }),
          buildScopeIsolationContext({ code: candidate.code }), // FC-32: always present
        ];

        // Run 5 arbiters in parallel (scope_isolation added for FC-32; key_principles added in S2-04)
        // scope_isolation uses AI_SCOPE_ARBITER (dedicated token, SK-526); others use params.aiProvider
        const verdictResults = await Promise.allSettled(
          contexts.map((ctx) =>
            this.callArbiter(
              ctx,
              ctx.role === 'scope_isolation' && this.scopeAiProvider
                ? this.adaptScopeProvider(this.scopeAiProvider)
                : params.aiProvider,
            ),
          ),
        );

        const candidateVerdicts: ArbiterVerdictRecord[] = verdictResults.map((r, i) => ({
          arbiterId: contexts[i]!.role,
          candidateLabel: candidate.label,
          verdict: r.status === 'fulfilled' ? r.value.verdict : 'ADVISORY',
          reason:
            r.status === 'fulfilled' ? r.value.reason : 'arbiter error — defaulting to ADVISORY',
          evaluatedAt: new Date().toISOString(),
          tenantId,
        }));

        allVerdicts.push(...candidateVerdicts);

        // ANY_BLOCK_CLASS_REJECTS
        const hasBlock = candidateVerdicts.some((v) => v.verdict === 'BLOCK');
        if (!hasBlock) {
          survivingThisCycle.push(candidate);
        }

        // If candidate survived parallel arbiters AND key_principles is configured → run sequentially
        if (
          !hasBlock &&
          params.arbiterConfig.evaluatorArbiters?.['key_principles']?.isolated === true
        ) {
          try {
            const kpCtx = buildKeyPrinciplesContext({ code: candidate.code });
            const kpResult = await this.callArbiter(kpCtx, params.aiProvider);
            const kpVerdictRecord: ArbiterVerdictRecord = {
              arbiterId: 'key_principles',
              candidateLabel: candidate.label,
              verdict: kpResult.verdict,
              reason: kpResult.reason,
              evaluatedAt: new Date().toISOString(),
              tenantId,
            };
            allVerdicts.push(kpVerdictRecord);
            // key_principles BLOCK overrides the parallel result
            if (kpResult.verdict === 'BLOCK') {
              survivingThisCycle.splice(survivingThisCycle.indexOf(candidate), 1);
            }
          } catch {
            // key_principles failure → ADVISORY by default, candidate survives
          }
        }
      }

      // If any candidate survived → choose first survivor
      if (survivingThisCycle.length > 0) {
        await this.storeArbiterVerdicts(allVerdicts).catch(() => {
          /* non-blocking */
        });
        return {
          chosen: survivingThisCycle[0]!,
          escalatedToHuman: false,
          cyclesUsed,
          verdicts: allVerdicts,
          allBlocked: false,
        };
      }

      // All blocked — next cycle with all candidates (give them another chance)
      remaining = [...params.candidates];
    }

    // All cycles exhausted — escalate to human, default to first candidate
    await this.storeArbiterVerdicts(allVerdicts).catch(() => {
      /* non-blocking */
    });
    return {
      chosen: params.candidates[0] ?? null,
      escalatedToHuman: true,
      cyclesUsed,
      verdicts: allVerdicts,
      allBlocked: true,
    };
  }

  /**
   * D-3 Fix: evaluateConsensus for FLOW-12 arbiter panel with explicit required count.
   *
   * Key changes:
   *   1. blockSemantics check runs FIRST — an absolute veto before any consensus check.
   *      A blockOnFail arbiter failure prevents ACCEPTED regardless of majority.
   *   2. config.required (not Math.ceil) is the primary threshold.
   *      Math.ceil(total/2) is only a fallback when config.required is absent.
   *
   * @param results  Arbiter verdict records with 'verdict' field ('PASS' | 'FAIL')
   * @param config   Panel config with optional required count and blockOnFail list
   */
  evaluateConsensus(
    results: Record<string, unknown>[],
    config: Record<string, unknown>,
  ): { passed: boolean; reason: string } {
    const total = results.length;
    const passed = results.filter((r) => r['verdict'] === 'PASS').length;

    // blockSemantics FIRST — absolute veto before any consensus early-return
    // A blocked arbiter failure must prevent ACCEPTED regardless of majority
    const blockingArbiters = (config['blockOnFail'] as string[]) ?? [];
    const blockFailed = results.some(
      (r) => blockingArbiters.includes(r['arbiterId'] as string) && r['verdict'] === 'FAIL',
    );
    if (blockFailed) {
      const failedBlockers = results
        .filter(
          (r) => blockingArbiters.includes(r['arbiterId'] as string) && r['verdict'] === 'FAIL',
        )
        .map((r) => r['arbiterId'] as string)
        .join(', ');
      return {
        passed: false,
        reason: `Blocking arbiter(s) failed (blockSemantics): ${failedBlockers}`,
      };
    }

    // Read required count from config — Rule 14: threshold is a business parameter
    const required =
      typeof config['required'] === 'number' ? config['required'] : Math.ceil(total / 2); // fallback only if config omits required

    if (passed >= required) {
      return { passed: true, reason: `${passed}/${total} arbiters passed (required: ${required})` };
    }

    return {
      passed: false,
      reason: `Only ${passed}/${total} arbiters passed (required: ${required})`,
    };
  }

  /**
   * Adapts IAiProvider (DataProcessResult return) to the callArbiter expected shape.
   * Extracts the 'text' field from the DataProcessResult data payload.
   */
  private adaptScopeProvider(provider: IAiProvider): {
    generate: (prompt: string) => Promise<{ text: string }>;
  } {
    return {
      generate: async (prompt: string) => {
        const result = await provider.generate(prompt, { role: AiModelRole.FAST });
        if (!result.isSuccess) return { text: '' };
        return { text: String(result.data?.['text'] ?? '') };
      },
    };
  }

  private async callArbiter(
    ctx: ArbiterContext,
    aiProvider: { generate: (prompt: string) => Promise<{ text: string }> },
  ): Promise<{ verdict: ArbiterVerdict; reason: string }> {
    try {
      const prompt = `You are the ${ctx.role} arbiter. Evaluate the following generated code.

CONTEXT:
${ctx.context}

GENERATED CODE:
${ctx.code}

Respond with a JSON object: { "verdict": "ADVISORY" | "BLOCK", "reason": "<one sentence>" }
BLOCK only if there is a clear, specific violation. Default to ADVISORY when uncertain.`;

      const result = await aiProvider.generate(prompt);
      const json = JSON.parse(result.text.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as Record<
        string,
        unknown
      >;
      const verdict = json['verdict'] === 'BLOCK' ? 'BLOCK' : 'ADVISORY';
      return { verdict, reason: (json['reason'] as string) ?? 'no reason provided' };
    } catch {
      // Default to ADVISORY on any failure — never throws
      return { verdict: 'ADVISORY', reason: 'arbiter error — defaulting to ADVISORY' };
    }
  }

  private async storeArbiterVerdicts(verdicts: ArbiterVerdictRecord[]): Promise<void> {
    // Non-blocking write to xiigen-arbiter-verdicts index
    for (const v of verdicts) {
      try {
        await this.db.storeDocument('xiigen-arbiter-verdicts', {
          ...v,
          _id: `${v.arbiterId}::${v.candidateLabel}::${v.evaluatedAt}`,
        });
      } catch {
        // Non-blocking — do not propagate
      }
    }
  }
}
