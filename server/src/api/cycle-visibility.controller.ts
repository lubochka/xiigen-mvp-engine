/**
 * CycleVisibilityController — query per-node visibility records for a run.
 *
 * Every node handler (PlannerHandler, ConvergenceHandler, DepthDecisionHandler)
 * stores a xiigen-cycle-visibility record with four fields:
 *   sent      — full prompt context sent to the AI
 *   received  — model output, score, rounds
 *   decided   — grade, accepted, arbiter verdicts, cycle4Id
 *   changed   — human-readable summary of what changed
 *
 * GET /api/cycle-visibility?runId=X[&cycleType=CYCLE_1_PLANNER|CYCLE-2|CYCLE_3_DEPTH_DECISION]
 *   Returns all visibility records for the given runId, optionally filtered by cycleType.
 *   Stored field name: cycleType (NOT nodeType — the handler class property is different).
 *   Valid cycleType values:
 *     CYCLE_1_PLANNER        — PlannerHandler records
 *     CYCLE-2                — ConvergenceHandler records
 *     CYCLE_3_DEPTH_DECISION — DepthDecisionHandler records
 *
 * DNA-3: never throws — returns { error, code } on failure.
 * DNA-5: tenantId from x-tenant-id header only — never as query param.
 */

import { Controller, Get, Query, Headers, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';

const VISIBILITY_INDEX = 'xiigen-cycle-visibility';

@Controller('api/cycle-visibility')
export class CycleVisibilityController {
  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  /**
   * Returns visibility records for a run.
   * runId (required)    — the runId from POST /api/cycle-chain/run response.
   * cycleType (optional) — filter by stored cycleType field:
   *   CYCLE_1_PLANNER | CYCLE-2 | CYCLE_3_DEPTH_DECISION
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getByRunId(
    @Query('runId') runId: string,
    @Query('cycleType') cycleType?: string,
    @Headers('x-tenant-id') _tenantHeader?: string,
  ) {
    if (!runId || typeof runId !== 'string' || !runId.trim()) {
      return { error: 'runId query parameter is required', code: 'MISSING_RUN_ID' };
    }

    const filter: Record<string, unknown> = { runId: runId.trim() };
    if (cycleType && typeof cycleType === 'string' && cycleType.trim()) {
      filter['cycleType'] = cycleType.trim();
    }

    const result = await this.db.searchDocuments(VISIBILITY_INDEX, filter);
    if (!result.isSuccess) {
      return { error: result.errorMessage, code: result.errorCode ?? 'QUERY_FAILED' };
    }

    const records = result.data as Record<string, unknown>[];
    return {
      runId: runId.trim(),
      count: records.length,
      records,
    };
  }
}
