// T570 PortingDecisionGate [GOVERNANCE]
//
// Evaluates a porting request and produces one of four outcomes:
//   PROHIBITED — portingCandidate=false (synchronous, pre-arbiter, no AI call)
//   BLOCKED    — targetPlatform in platformIncompatibilities (permanent, no retry)
//   DEFER      — porting score below threshold
//   APPROVE    — porting score >= threshold AND cost within limit
//
// Iron rules (CF-808, CF-809, CF-813):
//   - PROHIBITED guard MUST be FIRST — before any AI call or cost estimate (CF-808)
//   - PortingCostEstimator MUST NOT be called when portingCandidate=false (CF-809)
//   - portingCandidate is MACHINE — never read from tenant config (CF-813)
//   - storeDocument BEFORE enqueue on every outcome (DNA-8)
//   - DataProcessResult<T> — never throw (DNA-3)
//   - Thresholds from FREEDOM config — never hardcoded
//
// Factories:
//   F1492: IFeatureRegistryService (DATABASE FABRIC) — FT CRUD
//   F1495: IPortingDecisionService (RAG FABRIC) — cost estimation delegation
//   F1494: ISignalIngestionService (QUEUE FABRIC) — outcome event emit

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface IFeatureRegistryDb {
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: unknown }>;
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id: string,
  ): Promise<{ isSuccess: boolean; errorCode?: string; errorMessage?: string }>;
}

interface ICostEstimatorService {
  estimate(
    ftId: string,
    tenantId: string,
    targetPlatform: string,
    maxCostUsd?: number,
  ): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

// ── Domain types ─────────────────────────────────────────────────────────────

export type PortingDecision = 'APPROVE' | 'DEFER' | 'BLOCK' | 'PROHIBITED';

export interface PortingDecisionResult {
  ftId: string;
  tenantId: string;
  targetPlatform: string;
  decision: PortingDecision;
  reason: string;
  portingScore?: number;
  costEstimateUsd?: number;
  estimatedReadyDate?: string;
  correlationId: string;
}

export interface PortingDecisionConfig {
  portingThreshold: number;
  maxPortingCostUsd: number;
}

const DEFAULT_CONFIG: PortingDecisionConfig = {
  portingThreshold: 60,
  maxPortingCostUsd: 5000,
};

// ── PortingDecisionGateService ────────────────────────────────────────────────

export class PortingDecisionGateService {
  constructor(
    /** F1492: IFeatureRegistryService — DATABASE FABRIC */
    private readonly featureRegistry: IFeatureRegistryDb,
    /** F1495: IPortingDecisionService — RAG FABRIC (cost estimator) */
    private readonly costEstimator: ICostEstimatorService,
    /** F1494: ISignalIngestionService — QUEUE FABRIC */
    private readonly queue: IQueueService,
  ) {}

  /**
   * Evaluate a porting request.
   *
   * Decision pipeline (CF-808 mandates this exact order):
   *   STEP 0: portingCandidate guard — PROHIBITED if false (synchronous, no AI)
   *   STEP 1: incompatibility check — BLOCKED if targetPlatform in platformIncompatibilities
   *   STEP 2: cost estimation (PortingCostEstimator)
   *   STEP 3: signal threshold evaluation
   *   STEP 4: APPROVE / DEFER / BLOCK decision
   */
  async evaluate(
    ftId: string,
    tenantId: string,
    targetPlatform: string,
    portingScore: number,
    correlationId: string,
    config: PortingDecisionConfig = DEFAULT_CONFIG,
  ): Promise<DataProcessResult<PortingDecisionResult>> {
    if (!ftId) return DataProcessResult.failure('MISSING_FT_ID', 'ftId is required');
    if (!tenantId) return DataProcessResult.failure('MISSING_TENANT', 'tenantId is required');
    if (!targetPlatform)
      return DataProcessResult.failure('MISSING_TARGET_PLATFORM', 'targetPlatform is required');

    // Fetch FT record
    const fetchResult = await this.featureRegistry.searchDocuments(`feature-registry-${tenantId}`, {
      ftId,
      tenantId,
    });

    if (!fetchResult.isSuccess || (fetchResult.data as unknown[]).length === 0) {
      return DataProcessResult.failure(
        'FT_NOT_FOUND',
        `FT ${ftId} not found for tenant ${tenantId}`,
      );
    }

    const ftRecord = (fetchResult.data as Record<string, unknown>[])[0];

    // ── STEP 0: PROHIBITED guard (CF-808) ──────────────────────────────────
    // MUST be FIRST — synchronous, no AI call, no cost estimation
    if (ftRecord.portingCandidate === false) {
      const outcome: PortingDecisionResult = {
        ftId,
        tenantId,
        targetPlatform,
        decision: 'PROHIBITED',
        reason:
          (ftRecord.portingCandidateReason as string) ??
          'Engine-internal feature — porting is architecturally prohibited.',
        correlationId,
      };

      // DNA-8: storeDocument BEFORE enqueue
      const stored = await this.featureRegistry.storeDocument(
        `porting-decisions-${tenantId}`,
        { ...outcome, decidedAt: new Date().toISOString() } as unknown as Record<string, unknown>,
        `${ftId}::${targetPlatform}::${correlationId}`,
      );
      if (!stored.isSuccess) {
        return DataProcessResult.failure(
          stored.errorCode ?? 'STORE_FAILED',
          stored.errorMessage ?? 'Failed to store PROHIBITED decision',
        );
      }

      await this.queue.enqueue('feature-registry.porting-prohibited', {
        ftId,
        tenantId,
        targetPlatform,
        reason: outcome.reason,
        correlationId,
      });

      return DataProcessResult.success(outcome);
    }

    // ── STEP 1: Incompatibility check ─────────────────────────────────────
    const incompatibilities = (ftRecord.platformIncompatibilities as string[]) ?? [];
    if (incompatibilities.includes(targetPlatform)) {
      const outcome: PortingDecisionResult = {
        ftId,
        tenantId,
        targetPlatform,
        decision: 'BLOCK',
        reason: `Platform ${targetPlatform} is listed as incompatible for FT ${ftId}.`,
        correlationId,
      };

      const stored = await this.featureRegistry.storeDocument(
        `porting-decisions-${tenantId}`,
        { ...outcome, decidedAt: new Date().toISOString() } as unknown as Record<string, unknown>,
        `${ftId}::${targetPlatform}::${correlationId}`,
      );
      if (!stored.isSuccess) {
        return DataProcessResult.failure(
          stored.errorCode ?? 'STORE_FAILED',
          stored.errorMessage ?? 'Failed to store BLOCK decision',
        );
      }

      await this.queue.enqueue('feature-registry.porting-blocked', {
        ftId,
        tenantId,
        targetPlatform,
        reason: outcome.reason,
        correlationId,
      });

      return DataProcessResult.success(outcome);
    }

    // ── STEP 2: Cost estimation (only for portingCandidate=true) ───────────
    const costResult = await this.costEstimator.estimate(
      ftId,
      tenantId,
      targetPlatform,
      config.maxPortingCostUsd,
    );

    if (!costResult.isSuccess) {
      return DataProcessResult.failure(
        costResult.errorCode ?? 'COST_ESTIMATION_FAILED',
        costResult.errorMessage ?? 'PortingCostEstimator failed',
      );
    }

    const costEstimateUsd: number =
      (costResult.data?.['costEstimateUsd'] as number | undefined) ?? 0;

    // ── STEP 3+4: Signal threshold + final decision ────────────────────────
    let decision: PortingDecision;
    let reason: string;
    let estimatedReadyDate: string | undefined;

    if (portingScore < config.portingThreshold) {
      decision = 'DEFER';
      reason = `Porting score ${portingScore} below threshold ${config.portingThreshold}.`;
      // Estimated ready date: 30 days from now as a placeholder
      const readyDate = new Date();
      readyDate.setDate(readyDate.getDate() + 30);
      estimatedReadyDate = readyDate.toISOString();
    } else if (costEstimateUsd > config.maxPortingCostUsd) {
      decision = 'BLOCK';
      reason = `Cost estimate $${costEstimateUsd} exceeds max porting cost $${config.maxPortingCostUsd}.`;
    } else {
      decision = 'APPROVE';
      reason = `Porting score ${portingScore} >= threshold ${config.portingThreshold} and cost $${costEstimateUsd} within limit.`;
    }

    const outcome: PortingDecisionResult = {
      ftId,
      tenantId,
      targetPlatform,
      decision,
      reason,
      portingScore,
      costEstimateUsd,
      estimatedReadyDate,
      correlationId,
    };

    // DNA-8: storeDocument BEFORE enqueue
    const stored = await this.featureRegistry.storeDocument(
      `porting-decisions-${tenantId}`,
      { ...outcome, decidedAt: new Date().toISOString() } as unknown as Record<string, unknown>,
      `${ftId}::${targetPlatform}::${correlationId}`,
    );
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORE_FAILED',
        stored.errorMessage ?? 'Failed to store porting decision',
      );
    }

    // Emit appropriate event
    const eventName =
      decision === 'APPROVE'
        ? 'feature-registry.porting-approved'
        : decision === 'DEFER'
          ? 'feature-registry.porting-deferred'
          : 'feature-registry.porting-blocked';

    await this.queue.enqueue(eventName, {
      ftId,
      tenantId,
      targetPlatform,
      decision,
      reason,
      portingScore,
      costEstimateUsd,
      estimatedReadyDate,
      correlationId,
    });

    return DataProcessResult.success(outcome);
  }
}
