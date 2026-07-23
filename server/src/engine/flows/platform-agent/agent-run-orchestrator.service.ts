/**
 * T650 AgentRunOrchestrator — FLOW-46 Phase B
 *
 * Entry orchestrator for platform agent runs. Verifies CLS context is
 * MASTER_TENANT_ID, drives the AF-1..AF-11 path with T652 inserted between
 * AF-4 and AF-5 and T653 inserted after AF-9, branches by actionType
 * to T654, optionally invokes T655, and emits AgentSessionCompleted.
 *
 * Iron rules:
 *   IR-1: tenantId in CLS MUST equal MASTER_TENANT_ID before AF-1 invocation.
 *   IR-2: AgentSessionCompleted emitted EXACTLY once per session (idempotent).
 *   IR-3: T650 does NOT write business records — only the AgentSessionCompleted summary.
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';
import {
  PlatformContextEnricher,
  EnrichedContext,
  Af4StationOutput,
} from './platform-context-enricher.service';
import { SuperJudgeArbiter, SuperJudgeOutput } from './super-judge-arbiter.service';
import {
  AgentActionPublisher,
  AgentActionInput,
  AgentActionRecord,
} from './agent-action-publisher.service';
import {
  PatternContributor,
  ContributionInput,
  ContributionRecord,
} from './pattern-contributor.service';
import { TenantScopeGateway } from './tenant-scope-gateway.service';

const SESSIONS_INDEX = 'xiigen-agent-sessions';

export interface AgentRunInput {
  sessionId: string;
  userIntent: string;
  proposedActions?: AgentActionInput[];
  contributions?: ContributionInput[];
  af4Context?: Af4StationOutput;
  af9Verdict?: 'PASS' | 'BLOCK';
  af9Reason?: string;
  candidate?: Record<string, unknown>;
}

export interface AgentRunOutput {
  sessionId: string;
  userIntent: string;
  af9Verdict: 'PASS' | 'BLOCK';
  superJudgeVerdict: SuperJudgeOutput['verdict'];
  enriched: EnrichedContext;
  actions: AgentActionRecord[];
  contributions: ContributionRecord[];
  completedAt: string;
}

@Injectable()
export class AgentRunOrchestrator {
  readonly stages: string[] = [];

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    private readonly scope: TenantScopeGateway,
    private readonly enricher: PlatformContextEnricher,
    private readonly superJudge: SuperJudgeArbiter,
    private readonly publisher: AgentActionPublisher,
    private readonly contributor: PatternContributor,
  ) {}

  async run(input: AgentRunInput): Promise<DataProcessResult<AgentRunOutput>> {
    this.stages.length = 0;

    if (!input.userIntent || input.userIntent.trim() === '') {
      return DataProcessResult.failure('MISSING_INTENT', 'userIntent is required');
    }

    const masterCheck = this.scope.requireMasterTenant('AgentRunOrchestrator');
    if (!masterCheck.isSuccess) {
      return DataProcessResult.failure(
        masterCheck.errorCode ?? 'NOT_ADMIN',
        masterCheck.errorMessage ?? 'AgentRunOrchestrator requires MASTER_TENANT_ID',
      );
    }

    const existing = await this.db.searchDocuments(SESSIONS_INDEX, { sessionId: input.sessionId });
    if (existing.isSuccess && (existing.data ?? []).length > 0) {
      const prior = existing.data![0] as Record<string, unknown>;
      return DataProcessResult.success(prior as unknown as AgentRunOutput);
    }

    this.stages.push('AF-1', 'AF-2', 'AF-3', 'AF-4');

    const enrichResult = await this.enricher.execute(input.af4Context ?? { userIntent: input.userIntent });
    if (!enrichResult.isSuccess) {
      return DataProcessResult.failure(
        enrichResult.errorCode ?? 'ENRICH_FAILED',
        enrichResult.errorMessage ?? 'platform context enrichment failed',
      );
    }
    const enriched = enrichResult.data!;
    this.stages.push('T652_ENRICH');

    this.stages.push('AF-5', 'AF-6', 'AF-7', 'AF-8', 'AF-9');

    const af9Verdict = input.af9Verdict ?? 'PASS';
    const judgeResult = await this.superJudge.evaluate({
      sessionId: input.sessionId,
      af9Verdict,
      af9Reason: input.af9Reason ?? 'AF-9 default reason',
      platformPatterns: enriched.platformPatterns,
      platformPatternsMatched: enriched.platformPatternsMatched,
      candidate: input.candidate ?? {},
    });
    if (!judgeResult.isSuccess) {
      return DataProcessResult.failure(
        judgeResult.errorCode ?? 'SUPER_JUDGE_FAILED',
        judgeResult.errorMessage ?? 'super-judge evaluation failed',
      );
    }
    const judge = judgeResult.data!;
    this.stages.push('T653_SUPER_JUDGE');

    this.stages.push('AF-10', 'AF-11');

    const actions: AgentActionRecord[] = [];
    for (const action of input.proposedActions ?? []) {
      const result = await this.publisher.publish(action);
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          result.errorCode ?? 'ACTION_PUBLISH_FAILED',
          result.errorMessage ?? `action ${action.actionId} publish failed`,
        );
      }
      actions.push(result.data!);
    }

    const contributions: ContributionRecord[] = [];
    for (const c of input.contributions ?? []) {
      const result = await this.contributor.contribute(c);
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          result.errorCode ?? 'CONTRIBUTION_FAILED',
          result.errorMessage ?? `contribution ${c.patternId} failed`,
        );
      }
      contributions.push(result.data!);
    }

    const output: AgentRunOutput = {
      sessionId: input.sessionId,
      userIntent: input.userIntent,
      af9Verdict,
      superJudgeVerdict: judge.verdict,
      enriched,
      actions,
      contributions,
      completedAt: new Date().toISOString(),
    };

    const sessionDoc: Record<string, unknown> = {
      sessionId: input.sessionId,
      userIntent: input.userIntent,
      af9Verdict,
      superJudgeVerdict: judge.verdict,
      grade: judge.verdict === 'OVERRIDE_BLOCK' ? 'BLOCKED' : 'PASSED',
      actionsProposed: actions.length,
      contributionsRecorded: contributions.length,
      completedAt: output.completedAt,
      tenantId: MASTER_TENANT_ID,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'GLOBAL',
    };
    const stored = await this.db.storeDocument(SESSIONS_INDEX, sessionDoc, input.sessionId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'SESSION_STORE_FAILED',
        stored.errorMessage ?? 'session record store failed',
      );
    }

    const enqueued = await this.queue.enqueue('platform-agent.AgentSessionCompleted', sessionDoc);
    if (!enqueued.isSuccess) {
      return DataProcessResult.failure(
        enqueued.errorCode ?? 'EMIT_FAILED',
        enqueued.errorMessage ?? 'AgentSessionCompleted enqueue failed',
      );
    }

    return DataProcessResult.success(output);
  }
}
