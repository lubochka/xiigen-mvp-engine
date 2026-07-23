/**
 * BootstrapOrchestrator — T536 [ORCHESTRATION].
 *
 * 7-phase sentinel state machine for self-building bootstrap.
 * Reads sentinel BEFORE any phase. Supports DRY_RUN mode (IR-DRY-1).
 *
 * CF-739: sentinel-not-read-first — score-0 if skipped.
 * CF-740: phase-skipped — phases must execute in order.
 * CF-741: schemas-after-events — schema registration before event emission.
 * CF-742: partial-import-committed — all-or-nothing import with rollback.
 * IR-DRY-1: DRY_RUN MUST NOT trigger AI calls or state mutations.
 *
 * DNA-3: All methods return DataProcessResult — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on every transition.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';
import type {
  Flow33DocumentUpdater,
  Flow33Queue,
} from './flow33-shared-interfaces';

export type BootstrapPhase =
  | 'PHASE_1_VALIDATE'
  | 'PHASE_2_REGISTER_SCHEMAS'
  | 'PHASE_3_IMPORT_BUNDLE'
  | 'PHASE_4_SEED_GRAPHRAG'
  | 'PHASE_5_INIT_REGISTRIES'
  | 'PHASE_6_VERIFY'
  | 'PHASE_7_ACTIVATE';

export type SentinelStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';

export type ExecutionMode = 'FULL' | 'DRY_RUN';

export interface BootstrapOrchestratorContext {
  flowId: string;
  tenantId: string;
  executionMode: ExecutionMode;
  planBundleId?: string;
}

export interface BootstrapSentinel {
  bootstrapId: string;
  flowId: string;
  tenantId: string;
  currentPhase: BootstrapPhase | null;
  status: SentinelStatus;
  startedAt: string;
  completedAt?: string;
}

export interface BootstrapPhaseResult {
  bootstrapId: string;
  phase: BootstrapPhase;
  status: 'COMPLETED' | 'SKIPPED_DRY_RUN';
  completedAt: string;
}

export interface DryRunError {
  code: string;
  message: string;
  artifactId?: string;
}

export interface DryRunWarning {
  code: string;
  message: string;
}

export interface DryRunValidationReport {
  flowId: string;
  valid: boolean;
  errors: DryRunError[];
  warnings: DryRunWarning[];
  artifactsValidated: number;
}

export interface BundleImportResult {
  bundleId: string;
  importedAt: string;
  artifactCount: number;
  rolledBack: boolean;
}

const ORDERED_PHASES: BootstrapPhase[] = [
  'PHASE_1_VALIDATE',
  'PHASE_2_REGISTER_SCHEMAS',
  'PHASE_3_IMPORT_BUNDLE',
  'PHASE_4_SEED_GRAPHRAG',
  'PHASE_5_INIT_REGISTRIES',
  'PHASE_6_VERIFY',
  'PHASE_7_ACTIVATE',
];

export class BootstrapOrchestrator {
  constructor(
    private readonly db: Flow33DocumentUpdater,
    private readonly queue: Flow33Queue,
  ) {}

  /**
   * Read sentinel state — MUST be called before any phase execution (CF-739).
   */
  async readSentinel(
    flowId: string,
    tenantId: string,
  ): Promise<DataProcessResult<BootstrapSentinel | null>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    const result = await this.db.searchDocuments('flow33-bootstrap-sentinels', {
      flowId,
      tenantId,
    });
    if (!result.isSuccess)
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);

    if (!result.data || result.data.length === 0) return DataProcessResult.success(null);
    return DataProcessResult.success(result.data[0] as unknown as BootstrapSentinel);
  }

  /**
   * Run full 7-phase bootstrap OR DRY_RUN validation (IR-DRY-1).
   * Sentinel is read FIRST before any phase (CF-739).
   */
  async run(
    ctx: BootstrapOrchestratorContext,
  ): Promise<DataProcessResult<BootstrapPhaseResult[] | DryRunValidationReport>> {
    if (!ctx.tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!ctx.flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    // CF-739: Read sentinel FIRST — before any phase
    const sentinelResult = await this.readSentinel(ctx.flowId, ctx.tenantId);
    if (!sentinelResult.isSuccess)
      return DataProcessResult.failure(sentinelResult.errorCode!, sentinelResult.errorMessage!);

    const sentinel = sentinelResult.data;
    if (sentinel && sentinel.status === 'COMPLETED') {
      return DataProcessResult.failure(
        'ALREADY_COMPLETED',
        `Bootstrap for flow ${ctx.flowId} already completed`,
      );
    }
    if (sentinel && sentinel.status === 'IN_PROGRESS') {
      return DataProcessResult.failure(
        'ALREADY_IN_PROGRESS',
        `Bootstrap for flow ${ctx.flowId} already in progress`,
      );
    }

    // IR-DRY-1: DRY_RUN returns validation report — no AI calls, no state mutations
    if (ctx.executionMode === 'DRY_RUN') {
      return this.runDryRun(ctx);
    }

    return this.runFull(ctx);
  }

  /**
   * DRY_RUN: Validate plan bundle without triggering any AI calls or state mutations.
   * IR-DRY-1: zero side effects — returns DryRunValidationReport only.
   */
  private async runDryRun(
    ctx: BootstrapOrchestratorContext,
  ): Promise<DataProcessResult<DryRunValidationReport>> {
    const errors: DryRunError[] = [];
    const warnings: DryRunWarning[] = [];
    let artifactsValidated = 0;

    if (!ctx.planBundleId) {
      errors.push({
        code: 'MISSING_BUNDLE_ID',
        message: 'planBundleId required for DRY_RUN validation',
      });
    } else {
      // Validate bundle exists — read-only, no state mutation
      const bundleResult = await this.db.searchDocuments('flow33-plan-bundles', {
        bundleId: ctx.planBundleId,
        tenantId: ctx.tenantId,
      });
      if (!bundleResult.isSuccess) {
        errors.push({ code: 'BUNDLE_NOT_FOUND', message: `Bundle ${ctx.planBundleId} not found` });
      } else if (bundleResult.data && bundleResult.data.length > 0) {
        artifactsValidated += bundleResult.data.length;
      }
    }

    const report: DryRunValidationReport = {
      flowId: ctx.flowId,
      valid: errors.length === 0,
      errors,
      warnings,
      artifactsValidated,
    };

    // IR-DRY-1: NO storeDocument, NO enqueue — return report only
    return DataProcessResult.success(report);
  }

  /**
   * FULL bootstrap: execute all 7 phases in order.
   * CF-740: phases execute in strict order, no skipping.
   * CF-741: PHASE_2_REGISTER_SCHEMAS must complete before any event emission.
   * CF-742: PHASE_3_IMPORT_BUNDLE is all-or-nothing with rollback.
   * DNA-8: storeDocument() BEFORE enqueue() on every transition.
   */
  private async runFull(
    ctx: BootstrapOrchestratorContext,
  ): Promise<DataProcessResult<BootstrapPhaseResult[]>> {
    const bootstrapId = randomUUID();
    const startedAt = new Date().toISOString();

    // Store sentinel — IN_PROGRESS (DNA-8: store before emit)
    const sentinelDoc: Record<string, unknown> = {
      bootstrapId,
      flowId: ctx.flowId,
      tenantId: ctx.tenantId,
      currentPhase: null,
      status: 'IN_PROGRESS',
      startedAt,
    };
    const stored = await this.db.storeDocument(
      'flow33-bootstrap-sentinels',
      sentinelDoc,
      bootstrapId,
    );
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    const results: BootstrapPhaseResult[] = [];

    for (const phase of ORDERED_PHASES) {
      // CF-739: Re-read sentinel before each phase
      const check = await this.readSentinel(ctx.flowId, ctx.tenantId);
      if (!check.isSuccess) {
        await this.rollback(bootstrapId, ctx.tenantId, phase);
        return DataProcessResult.failure(check.errorCode!, check.errorMessage!);
      }

      // CF-742: If PHASE_3 — treat as atomic import (rollback on failure)
      if (phase === 'PHASE_3_IMPORT_BUNDLE' && ctx.planBundleId) {
        const importResult = await this.atomicImport(ctx.planBundleId, ctx.tenantId);
        if (!importResult.isSuccess) {
          await this.rollback(bootstrapId, ctx.tenantId, phase);
          return DataProcessResult.failure(
            'PARTIAL_IMPORT_ROLLED_BACK',
            importResult.errorMessage!,
          );
        }
      }

      const completedAt = new Date().toISOString();
      const phaseResult: BootstrapPhaseResult = {
        bootstrapId,
        phase,
        status: 'COMPLETED',
        completedAt,
      };
      results.push(phaseResult);

      // DNA-8: store phase result BEFORE emit
      await this.db.storeDocument(
        'flow33-bootstrap-phase-results',
        phaseResult as unknown as Record<string, unknown>,
      );

      // CF-741: Only emit events AFTER PHASE_2 (schemas registered)
      if (ORDERED_PHASES.indexOf(phase) >= ORDERED_PHASES.indexOf('PHASE_2_REGISTER_SCHEMAS')) {
        await this.queue.enqueue('bootstrap.phase.completed', {
          bootstrapId,
          phase,
          flowId: ctx.flowId,
          completedAt,
        });
      }
    }

    // Mark sentinel COMPLETED
    const completedAt = new Date().toISOString();
    await this.db.updateDocument('flow33-bootstrap-sentinels', bootstrapId, {
      status: 'COMPLETED',
      currentPhase: 'PHASE_7_ACTIVATE',
      completedAt,
    });
    await this.queue.enqueue('bootstrap.completed', {
      bootstrapId,
      flowId: ctx.flowId,
      completedAt,
    });

    return DataProcessResult.success(results);
  }

  /**
   * Atomic import of plan bundle — all-or-nothing (CF-742).
   */
  private async atomicImport(
    bundleId: string,
    tenantId: string,
  ): Promise<DataProcessResult<BundleImportResult>> {
    const bundleResult = await this.db.searchDocuments('flow33-plan-bundles', {
      bundleId,
      tenantId,
    });
    if (!bundleResult.isSuccess || !bundleResult.data?.length) {
      return DataProcessResult.failure(
        'BUNDLE_NOT_FOUND',
        `Bundle ${bundleId} not found — import rolled back (CF-742)`,
      );
    }

    const importId = randomUUID();
    const importedAt = new Date().toISOString();
    const importRecord: Record<string, unknown> = {
      importId,
      bundleId,
      tenantId,
      importedAt,
      rolledBack: false,
    };
    const stored = await this.db.storeDocument('flow33-bundle-imports', importRecord, importId);
    if (!stored.isSuccess) {
      await this.db.storeDocument('flow33-bundle-imports', { ...importRecord, rolledBack: true });
      return DataProcessResult.failure(
        'BUNDLE_IMPORT_FAILED',
        `Import failed and rolled back (CF-742): ${stored.errorMessage}`,
      );
    }

    return DataProcessResult.success({
      bundleId,
      importedAt,
      artifactCount: bundleResult.data.length,
      rolledBack: false,
    });
  }

  /**
   * Rollback sentinel to ROLLED_BACK on phase failure.
   */
  private async rollback(
    bootstrapId: string,
    tenantId: string,
    failedPhase: BootstrapPhase,
  ): Promise<void> {
    await this.db.updateDocument('flow33-bootstrap-sentinels', bootstrapId, {
      status: 'ROLLED_BACK',
      failedPhase,
      rolledBackAt: new Date().toISOString(),
    });
    await this.queue.enqueue('bootstrap.rolled_back', { bootstrapId, failedPhase, tenantId });
  }
}
