/**
 * CycleChainController — External entry point for the Cycle 1-3 planning chain.
 *
 * Closes GAP-1: wires a user-facing POST endpoint to CycleChainService.handle().
 * A user sentence enters here and the engine autonomously discovers topology,
 * produces NODEs, and returns leaf nodes ready for Cycle 4 executor generation.
 *
 * POST /api/cycle-chain/run
 *   Body: { userIntent, domain?, constraints?, priorArtQuery?, terminationDepth? }
 *   Response: { planSteps, leafNodes, topology, grade } | { error, code }
 */

import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Optional,
  Logger,
} from '@nestjs/common';
import { CycleChainService, CycleChainInput } from '../engine/cycle-chain.service';
import { RunAnalysisFormatter } from '../engine/run-analysis-formatter.service';
// Track 0 Turn 3 (v22 Finding BB): @Optional() injection so existing 2-arg
// test constructions `new CycleChainController(chain, formatter)` still compile.
import { TopologyPublisher } from '../engine/topology-publisher';
import { randomUUID } from 'crypto';

interface CycleChainRunBody {
  userIntent: string;
  domain?: string;
  constraints?: string[];
  priorArtQuery?: string;
  flowId?: string;
  terminationDepth?: number;
  tenantId?: string;
}

interface ResumeBody {
  suspensionId: string;
  answers: string[];
}

@Controller('api/cycle-chain')
export class CycleChainController {
  private readonly logger = new Logger(CycleChainController.name);

  constructor(
    private readonly chain: CycleChainService,
    private readonly formatter: RunAnalysisFormatter,
    // Track 0 Turn 3 (v22 Finding BB + v17 Finding S + v19 Finding Y):
    // @Optional() so existing 2-arg test constructions still compile.
    // Guarded below; publish is fire-and-forget (.then/.catch) so HTTP response
    // is never delayed by the background write to TenantTopologyStore.
    @Optional() private readonly publisher?: TopologyPublisher,
  ) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(@Body() body: CycleChainRunBody) {
    if (!body.userIntent || typeof body.userIntent !== 'string' || !body.userIntent.trim()) {
      return { error: 'userIntent is required', code: 'MISSING_INTENT' };
    }

    const input: CycleChainInput = {
      userIntent: body.userIntent.trim(),
      domain: body.domain,
      constraints:
        Array.isArray(body.constraints) && body.constraints.length > 0
          ? body.constraints
          : [
              'No typed models — all business data uses Record<string, unknown>',
              'No throw for business logic — return DataProcessResult',
              'Tenant context via AsyncLocalStorage — never pass tenantId as parameter',
            ],
      priorArtQuery: body.priorArtQuery,
      flowId: body.flowId ?? `FLOW-CHAIN-${randomUUID().slice(0, 8).toUpperCase()}`,
      runId: randomUUID(),
      tenantId: body.tenantId ?? 'default',
      terminationDepth: typeof body.terminationDepth === 'number' ? body.terminationDepth : 3,
    };

    const result = await this.chain.run(input);

    if (!result.isSuccess) {
      return { error: result.errorMessage, code: result.errorCode };
    }

    const output = result.data!;
    const analysis = this.formatter.format(output, {
      flowId: input.flowId,
      flowTitle: input.flowId,
      userIntent: input.userIntent,
      runDate: new Date().toISOString(),
    });

    // Track 0 Turn 3 (v15 Finding S + v19 Finding Y + v22 Finding BB):
    //   Fire-and-forget publish of the topology to TenantTopologyStore so
    //   FlowLibraryPage + TopologyViewer can render it. Pass `output` (unwrapped
    //   CycleChainOutput, NOT the `result` wrapper) and `input.userIntent` as
    //   displayName for human-readable flow library entries.
    //   .then/.catch so publish failure does NOT fail the HTTP response.
    //
    // Turn 2 (MVP Plan v3, Goals 1b + 1c): in addition to the DESIGN_SIM record
    //   above, also materialise TEACH_RUN (always) and QA_RUN (when grade < 0.85)
    //   so every run surfaces three distinct flows in the tenant's library —
    //   per plan B1 resolution, no Cycle 5 / Meta-Arbiter wiring is involved.
    //   Each call is independent and fire-and-forget.
    if (this.publisher) {
      void this.publisher
        .publish(output, input.userIntent)
        .then((r) => {
          if (!r.isSuccess) {
            this.logger.warn(`DESIGN_SIM publish skipped: ${r.errorCode} ${r.errorMessage ?? ''}`);
          }
        })
        .catch((err) => this.logger.error('DESIGN_SIM publish threw', err));

      void this.publisher
        .publishTeachRun(output, input.userIntent)
        .then((r) => {
          if (!r.isSuccess) {
            this.logger.warn(`TEACH_RUN publish skipped: ${r.errorCode} ${r.errorMessage ?? ''}`);
          }
        })
        .catch((err) => this.logger.error('TEACH_RUN publish threw', err));

      void this.publisher
        .publishQaRun(output, input.userIntent)
        .then((r) => {
          if (!r.isSuccess && r.errorCode !== 'QA_NOT_TRIGGERED') {
            this.logger.warn(`QA_RUN publish skipped: ${r.errorCode} ${r.errorMessage ?? ''}`);
          }
        })
        .catch((err) => this.logger.error('QA_RUN publish threw', err));
    }

    return { ...output, analysis };
  }

  /**
   * PATCH /api/cycle-chain/:runId/resume
   *
   * Resumes a CONTEXT_INSUFFICIENT suspended step.
   * Delegates to CycleChainService.resumeSuspendedStep() which re-runs only the
   * single suspended step with enriched constraints built from the caller's answers.
   *
   * Body: { suspensionId: string; answers: string[] }
   *   suspensionId — the RunSuspension document ID (from SuspensionCard)
   *   answers      — one answer per gapRequest question
   */
  @Patch(':runId/resume')
  @HttpCode(HttpStatus.OK)
  async resume(@Param('runId') runId: string, @Body() body: ResumeBody) {
    if (!runId || typeof runId !== 'string') {
      return { error: 'runId is required', code: 'MISSING_RUN_ID' };
    }
    if (!body.suspensionId || !Array.isArray(body.answers)) {
      return {
        error: 'suspensionId (string) and answers (string[]) are required',
        code: 'INVALID_RESUME_BODY',
      };
    }

    const result = await this.chain.resumeSuspendedStep(runId, body.suspensionId, body.answers);
    if (!result.isSuccess) {
      return { error: result.errorMessage, code: result.errorCode };
    }

    return result.data as Record<string, unknown>;
  }
}
