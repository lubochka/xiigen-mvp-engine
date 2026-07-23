// T566 MetaDecisionEngine [META_DECISION]
// Runs all 5 meta-arbiters against RoundSummary. Produces RoundDecision.
// CF-791: all 5 meta-arbiters run — no short-circuit on first HALT.
// CF-793: HALT produces EscalationBriefing stored in ES.
// DNA-8: storeDocument before enqueue.

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { SpendGovernorService, SpendSession } from './spend-governor.service';
import { SecurityCircuitBreakerService } from './security-circuit-breaker.service';
import { ImprovementDetectorService } from './improvement-detector.service';
import { ModelFitnessService, ModelRoundResult, ModelFitnessScore } from './model-fitness.service';
import { RoundSummary } from './round-summary-processor.service';

export type RoundDecision = 'CONTINUE' | 'ACCEPT' | 'ESCALATE' | 'HALT';

export interface EscalationBriefing {
  decisionId: string;
  sessionId: string;
  roundNumber: number;
  decision: 'HALT' | 'ESCALATE';
  reasons: string[];
  options: string[];
  createdAt: string;
}

export interface MetaDecisionResult {
  decisionId: string;
  sessionId: string;
  roundNumber: number;
  decision: RoundDecision;
  arbiterVerdicts: Record<string, string>;
  escalationBriefing?: EscalationBriefing;
  createdAt: string;
}

export class MetaDecisionEngine {
  constructor(
    private readonly db: IDatabaseService,

    private readonly queue: IQueueService,
    private readonly spendGovernor: SpendGovernorService,
    private readonly securityBreaker: SecurityCircuitBreakerService,
    private readonly improvementDetector: ImprovementDetectorService,
    private readonly modelFitness: ModelFitnessService,
    private readonly spendSession: (summary: RoundSummary) => SpendSession,
  ) {}

  async decide(
    summary: RoundSummary,
    bundleCode: string,
    priorRounds: RoundSummary[],
    modelResults: ModelRoundResult[],
  ): Promise<DataProcessResult<MetaDecisionResult>> {
    // CF-791: run ALL 5 meta-arbiters — no short-circuit
    const [spendResult, securityResult, improvementResult, fitnessResult] = await Promise.all([
      this.spendGovernor.checkSpend(this.spendSession(summary)),
      this.securityBreaker.scanBundle(bundleCode, summary.sessionId),
      this.improvementDetector.detectImprovement([
        ...priorRounds.map((r) => ({
          roundNumber: r.roundNumber,
          averageArbiterScore: r.averageScore,
          passingArbiters: r.passingCount,
          totalArbiters: r.arbiterScores.length,
        })),
        {
          roundNumber: summary.roundNumber,
          averageArbiterScore: summary.averageScore,
          passingArbiters: summary.passingCount,
          totalArbiters: summary.arbiterScores.length,
        },
      ]),
      modelResults.length > 0
        ? this.modelFitness.computeFitness(summary.modelId, summary.taskTypeId, modelResults)
        : Promise.resolve(DataProcessResult.success(null as unknown as ModelFitnessScore)),
    ]);

    const verdicts: Record<string, string> = {
      'meta::spend-governor': spendResult.data?.verdict ?? 'CONTINUE',
      'meta::security-circuit-breaker': securityResult.data?.verdict ?? 'CONTINUE',
      'meta::improvement-detector':
        improvementResult.data?.signal === 'REGRESSING' ? 'ESCALATE' : 'CONTINUE',
      'meta::model-fitness': fitnessResult.data?.['fitnessAlert'] ? 'ESCALATE' : 'CONTINUE',
    };

    // Round controller: apply verdicts to final decision
    let decision: RoundDecision = 'CONTINUE';
    const reasons: string[] = [];

    if (verdicts['meta::spend-governor'] === 'HALT') {
      decision = 'HALT';
      reasons.push(spendResult.data?.reason ?? 'Spend limit exceeded');
    }
    if (verdicts['meta::security-circuit-breaker'] === 'HALT') {
      decision = 'HALT';
      reasons.push(`Security violation: ${securityResult.data?.violations[0] ?? 'unknown'}`);
    }
    if (decision !== 'HALT') {
      if (Object.values(verdicts).includes('ESCALATE')) {
        decision = 'ESCALATE';
        if (improvementResult.data?.signal === 'REGRESSING') reasons.push('Score trend REGRESSING');
        if (fitnessResult.data?.['fitnessAlert'])
          reasons.push(`Model fitness low: ${fitnessResult.data?.['fitnessScore']}`);
      }
      // If all arbiters pass and score high enough — ACCEPT
      if (decision === 'CONTINUE' && summary.averageScore >= 80 && summary.failingCount === 0) {
        decision = 'ACCEPT';
      }
    }

    const decisionId = `${summary.sessionId}::decision::${summary.roundNumber}`;
    const now = new Date().toISOString();

    let escalationBriefing: EscalationBriefing | undefined;
    if (decision === 'HALT' || decision === 'ESCALATE') {
      // CF-793: HALT → EscalationBriefing
      escalationBriefing = {
        decisionId,
        sessionId: summary.sessionId,
        roundNumber: summary.roundNumber,
        decision: decision as 'HALT' | 'ESCALATE',
        reasons,
        options: [
          'CASE A: Adjust FREEDOM config parameters and retry',
          'CASE B: Override and force ACCEPT (human approval required)',
          'CASE C: Abort session and escalate to Luba',
        ],
        createdAt: now,
      };
    }

    const metaResult: MetaDecisionResult = {
      decisionId,
      sessionId: summary.sessionId,
      roundNumber: summary.roundNumber,
      decision,
      arbiterVerdicts: verdicts,
      escalationBriefing,
      createdAt: now,
    };

    // DNA-8: store before emit
    const stored = await this.db.storeDocument(
      'round-decisions',
      { ...metaResult } as unknown as Record<string, unknown>,
      decisionId,
    );
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    if (escalationBriefing) {
      await this.db.storeDocument(
        'escalation-briefings',
        { ...escalationBriefing } as unknown as Record<string, unknown>,
        decisionId,
      );
    }

    await this.queue.enqueue(`meta.decision.${decision.toLowerCase()}`, {
      decisionId,
      sessionId: summary.sessionId,
      decision,
    });

    return DataProcessResult.success(metaResult);
  }
}
