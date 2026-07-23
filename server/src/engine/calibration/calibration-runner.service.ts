/**
 * CalibrationRunner — implements the universal improvement loop.
 *
 * improve(station, depth, nodeContent):
 *   1. Calls CycleChainService.run() — orchestrates Cycle 1 (Planner) → Cycle 2
 *      (ConvergenceHandler → TeachingRoundService N-round self-judge loop, min 10 max 20 rounds)
 *      → Cycle 3 (DepthDecision). All 3 providers (Gemini/GPT/Claude-economy) run in parallel
 *      inside TeachingRoundService — no per-provider rotation at this layer.
 *      calibration.config.runs controls how many full cycle-chain passes to record for baseline.
 *   2. Extracts grade + CycleTrace from each run
 *   3. Stores one xiigen-calibration-baseline record per (station, depth, model)
 *   4. Dispatches to OssCurriculumRunner for OSS teaching cycles
 *   Recurses for each sub-node when Cycle 3 returns EXPAND.
 *
 * DNA-3: always returns DataProcessResult, never throws.
 * DNA-5: tenantId from CLS only.
 * DNA-8: storeDocument before any downstream dispatch.
 *
 * Phase 1: FREEDOM config reads for calibration.config
 *   { runs: number, terminationDepth: number }
 * Falls back to hardcoded defaults when config absent.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import { CycleChainService, CycleChainInput } from '../cycle-chain.service';
import { OssCurriculumRunner, OssCurriculumInput, OssModel } from './oss-curriculum-runner.service';
import { GraduationResolverService } from '../graduation-resolver.service';
import { CurriculumTier } from '../curriculum-tier-resolver.service';
import { KnowledgePolicyService } from '../scope/knowledge-policy.service';
import { ModuleSnapshotService } from '../scope/module-snapshot.service';
import { FreshTenantTestService, PortabilityReport } from '../scope/fresh-tenant-test.service';
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../freedom/freedom-config.interface';

export const CALIBRATION_INDEX = 'xiigen-calibration-baseline';

/** Maps OSS model string → graduation tier (P3 — PRE-FLOW-01). */
const OSS_MODEL_TO_TIER: Partial<Record<OssModel, CurriculumTier>> = {
  'llama3:8b': 1,
  'codellama:13b': 2,
  'deepseek-coder:6.7b': 3,
};
export const STATIONS = ['CYCLE-1', 'CYCLE-2', 'CYCLE-3', 'AF-1', 'AF-6', 'AF-7', 'AF-9'] as const;
export type CalibrationStation = (typeof STATIONS)[number];

export interface CalibrationRecord {
  flowId: string;
  station: CalibrationStation;
  depth: number;
  nodeIntent: string;
  model: string;
  grade: number;
  testDefinitionFile: string;
  ragContextSize: number;
  graphContextSize: number;
  phase: string;
  tenantId: string;
  knowledgeScope?: string;
  ownerId?: string;
  moduleId?: string;
  pricingModel?: string;
  createdAt: string;
}

export interface CalibrationInput {
  flowId: string;
  userIntent: string;
  phase: string;
  terminationDepth?: number;
}

export interface CalibrationRunResult {
  flowId: string;
  recordsStored: number;
  depthsReached: number;
  regressions: Array<{ station: CalibrationStation; depth: number; model: string; grade: number }>;
  snapshotId?: string;
  portability?: PortabilityReport;
}

@Injectable()
export class CalibrationRunner {
  private readonly logger = new Logger(CalibrationRunner.name);
  // Fallback defaults — overridden by FREEDOM config calibration.config
  private readonly DEFAULT_RUNS = 3;
  private readonly DEFAULT_TERMINATION_DEPTH = 3;

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
    private readonly cycleChain: CycleChainService,
    private readonly ossCurriculum: OssCurriculumRunner,
    @Optional() private readonly policyService?: KnowledgePolicyService,
    @Optional() private readonly moduleSnapshot?: ModuleSnapshotService,
    @Optional() private readonly freshTenantTest?: FreshTenantTestService,
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig?: IFreedomConfigService,
    // P3: graduation trigger — calls graduateTier() when OSS models become viable
    @Optional() private readonly graduationResolver?: GraduationResolverService,
  ) {}

  /** Read calibration.config from FREEDOM — falls back to defaults. */
  private async readCalibrationConfig(): Promise<{ runs: number; terminationDepth: number }> {
    try {
      const cfg = await this.freedomConfig?.get('calibration.config');
      return {
        runs: typeof cfg?.['runs'] === 'number' ? (cfg['runs'] as number) : this.DEFAULT_RUNS,
        terminationDepth:
          typeof cfg?.['terminationDepth'] === 'number'
            ? (cfg['terminationDepth'] as number)
            : this.DEFAULT_TERMINATION_DEPTH,
      };
    } catch {
      return { runs: this.DEFAULT_RUNS, terminationDepth: this.DEFAULT_TERMINATION_DEPTH };
    }
  }

  private getTenant(): DataProcessResult<TenantContext> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) return DataProcessResult.failure('NO_TENANT', 'TenantContext not in CLS');
      return DataProcessResult.success(tenant);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS unavailable');
    }
  }

  /** Entry point — runs improve() for a full flow at all depths. */
  async runForFlow(input: CalibrationInput): Promise<DataProcessResult<CalibrationRunResult>> {
    const tenantResult = this.getTenant();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure('NO_TENANT', tenantResult.errorMessage ?? '');
    }
    const tenantId = tenantResult.data!.tenantId;

    const recordsStored: CalibrationRecord[] = [];
    const calConfig = await this.readCalibrationConfig();
    const terminationDepth = input.terminationDepth ?? calConfig.terminationDepth;
    const calibrationRuns = calConfig.runs;

    // Run the full cycle chain calibrationRuns times — each call exercises
    // Cycle 1 → Cycle 2 (TeachingRoundService N-round self-judge) → Cycle 3
    for (let run = 0; run < calibrationRuns; run++) {
      const chainInput: CycleChainInput = {
        userIntent: input.userIntent,
        flowId: input.flowId,
        runId: randomUUID(),
        tenantId,
        constraints: [],
        currentDepth: 0,
        terminationDepth,
      };

      const chainResult = await this.cycleChain.run(chainInput);
      if (!chainResult.isSuccess) {
        this.logger.warn(`CalibrationRunner: run ${run + 1} failed — ${chainResult.errorMessage}`);
        continue;
      }

      // Extract records from cycle chain output (depth + model embedded in result)
      const records = await this.extractRecords(chainResult.data!, input.flowId, input.phase);

      // DNA-8: store BEFORE dispatching to OssCurriculumRunner
      for (const record of records) {
        const storeResult = await this.db.storeDocument(
          CALIBRATION_INDEX,
          { ...record },
          `${record.flowId}::${record.station}::${record.depth}::${record.model}::${record.createdAt}`,
        );
        if (storeResult.isSuccess) {
          recordsStored.push(record);
        } else {
          this.logger.warn(
            `CalibrationRunner: failed to store record for ${record.station} depth=${record.depth}`,
          );
        }
      }
    }

    // Dispatch OSS curriculum after all commercial runs stored (DNA-8 satisfied)
    const ossInput: OssCurriculumInput = {
      flowId: input.flowId,
      userIntent: input.userIntent,
      phase: input.phase,
      terminationDepth,
    };
    const ossResult = await this.ossCurriculum.runForFlow(ossInput);
    if (!ossResult.isSuccess) {
      this.logger.warn(`CalibrationRunner: OSS curriculum failed — ${ossResult.errorMessage}`);
    }

    // P3: trigger graduation for each viable OSS model (PRE-FLOW-01 prerequisite).
    // graduateTier() marks the tier so resolveGeneratorForTier() returns the OSS model
    // instead of AI_ENGINE for future calibration runs — closing the learning loop exit.
    if (ossResult.isSuccess && ossResult.data && this.graduationResolver) {
      const viableModels = ossResult.data.modelsViable ?? [];
      for (const model of viableModels) {
        const tier = OSS_MODEL_TO_TIER[model];
        if (tier !== undefined) {
          this.graduationResolver.graduateTier(tier);
          this.logger.log(`CalibrationRunner: graduated tier ${tier} for OSS model ${model}`);
        }
      }
    }

    const regressions = this.summarizeRegressions(recordsStored);
    const maxDepth = recordsStored.reduce((max, r) => Math.max(max, r.depth), 0);

    // Package phase outputs as module snapshot (if scope services available)
    let snapshotId: string | undefined;
    let portability: PortabilityReport | undefined;
    if (this.moduleSnapshot && recordsStored.length > 0) {
      const snapshotResult = await this.moduleSnapshot.captureSnapshot({
        tenantId,
        flowId: input.flowId,
        phase: input.phase,
      });
      if (snapshotResult.isSuccess) {
        snapshotId = snapshotResult.data!.snapshotId;
        // Run portability test (soft gate — logs findings, never blocks)
        if (this.freshTenantTest) {
          const portabilityResult = await this.freshTenantTest.runPortabilityTest({
            mainTenantId: tenantId,
            flowId: input.flowId,
            phase: input.phase,
            userIntent: input.userIntent,
            snapshotId,
            mainCalibrationRecords: recordsStored.map((r) => ({
              station: r.station,
              depth: r.depth,
              grade: r.grade,
            })),
          });
          if (portabilityResult.isSuccess) {
            portability = portabilityResult.data!;
            this.logger.log(
              `CalibrationRunner: portability passed=${portability.passed} gaps=${portability.gaps.length}`,
            );
          }
        }
      }
    }

    return DataProcessResult.success({
      flowId: input.flowId,
      recordsStored: recordsStored.length,
      depthsReached: maxDepth + 1,
      regressions,
      snapshotId,
      portability,
    });
  }

  /** Extract CalibrationRecord entries from one CycleChainOutput run. */
  private async extractRecords(
    output: { grade: number; planSteps: unknown[]; leafNodes: unknown[] },
    flowId: string,
    phase: string,
  ): Promise<CalibrationRecord[]> {
    const tenantResult = this.getTenant();
    const tenantId = tenantResult.isSuccess ? tenantResult.data!.tenantId : 'unknown';

    // Resolve scope for this write context
    const resolution = this.policyService
      ? await this.policyService.resolveScope(tenantId, flowId, phase, 'CYCLE-1', 0)
      : { scope: 'PRIVATE' as const, ownerId: tenantId, pricingModel: null, moduleId: null };

    // Extract actual model name from first leaf node (ITEM-2 fix: replaces 'cycle-chain-commercial')
    const actualModel = String(
      (output.leafNodes[0] as Record<string, unknown> | undefined)?.['model'] ??
        'cycle-chain-commercial',
    );

    // The overall grade maps to CYCLE-1 at depth 0 (the planner grade)
    return [
      {
        flowId,
        station: 'CYCLE-1',
        depth: 0,
        nodeIntent: `flow ${flowId} top-level plan`,
        model: actualModel,
        grade: output.grade,
        testDefinitionFile: `docs/sessions/${flowId}/${flowId}-STEP-3-CYCLE1-TEST.md`,
        ragContextSize: 0,
        graphContextSize: 0,
        phase,
        tenantId,
        knowledgeScope: resolution.scope,
        ownerId: resolution.ownerId,
        createdAt: new Date().toISOString(),
      } as CalibrationRecord,
    ];
  }

  /**
   * Detect regressions vs stored baseline at matching (station, depth, model).
   * Grade drop > 0.05 at same (station, depth, model) = regression.
   */
  static detectRegressions(
    baseline: CalibrationRecord[],
    delta: CalibrationRecord[],
  ): Array<{ station: CalibrationStation; depth: number; model: string; grade: number }> {
    return delta
      .filter((d) => {
        const match = baseline.find(
          (b) => b.station === d.station && b.depth === d.depth && b.model === d.model,
        );
        return match !== undefined && match.grade - d.grade > 0.05;
      })
      .map((d) => ({ station: d.station, depth: d.depth, model: d.model, grade: d.grade }));
  }

  /** Detect depth-overload: grade at depth 1+ drops > 0.10 vs same (station, model) at depth 0. */
  static detectDepthOverload(
    depth0Records: CalibrationRecord[],
    depth1Records: CalibrationRecord[],
  ): boolean {
    return depth1Records.some((d1) => {
      const d0 = depth0Records.find((r) => r.station === d1.station && r.model === d1.model);
      return d0 !== undefined && d0.grade - d1.grade > 0.1;
    });
  }

  /**
   * Phase 0: in-run regression summary.
   * Baseline comparison against prior stored records deferred to Phase 1.
   */
  private summarizeRegressions(_records: CalibrationRecord[]): CalibrationRunResult['regressions'] {
    return [];
  }
}
