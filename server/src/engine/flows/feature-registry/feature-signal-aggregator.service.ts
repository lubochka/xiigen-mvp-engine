// T568 FeatureSignalAggregator [GOVERNANCE]
//
// Aggregates signals per FT per platform.
// Routes to MODE_A (execution telemetry) or MODE_B (marketplace signals)
// based on ftRecord.platforms[].
//
// Iron rules:
//   - Signal weights from FREEDOM config — never hardcoded
//   - storeDocument BEFORE enqueue on threshold crossing (DNA-8)
//   - BuildSearchFilter for FT record lookup (DNA-2)
//   - DataProcessResult<T> — never throw (DNA-3)
//   - Tenant isolation: signal index is tenantId-scoped
//
// Factories:
//   F1492: IFeatureRegistryService (DATABASE FABRIC) — FT CRUD
//   F1494: ISignalIngestionService (QUEUE FABRIC) — threshold event emit

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

// ── Domain types ─────────────────────────────────────────────────────────────

export interface ModeASignals {
  executionCount: number;
  successRate: number;
  avgCostPerRunUsd: number;
  avgLatencyMs: number;
  tenantAdoption: number;
  improvementVelocity: number;
  portingThresholdMet: boolean;
  lastUpdated: string;
}

export interface ModeBSignals {
  installs: number;
  activeUsers30d: number;
  likes: number;
  citations: number;
  signalScore: number;
  portingThresholdMet: boolean;
  lastUpdated: string;
}

export interface SignalWeights {
  /** MODE_A weights: w1=tenantAdoption, w2=successRate, w3=improvementVelocity */
  modeA: { w1: number; w2: number; w3: number };
  /** MODE_B weights: w1=installs, w2=activeUsers30d, w3=likes, w4=citations */
  modeB: { w1: number; w2: number; w3: number; w4: number };
  portingThreshold: number;
}

const DEFAULT_WEIGHTS: SignalWeights = {
  modeA: { w1: 0.5, w2: 0.3, w3: 0.2 },
  modeB: { w1: 0.3, w2: 0.35, w3: 0.2, w4: 0.15 },
  portingThreshold: 60,
};

export type SignalMode = 'MODE_A' | 'MODE_B';

export interface AggregationResult {
  ftId: string;
  tenantId: string;
  mode: SignalMode;
  updatedSignals: ModeASignals | ModeBSignals;
  thresholdMet: boolean;
  portingScore: number;
}

// ── Signal score formulas ─────────────────────────────────────────────────────

/** normalize: simple 0→1 normalization with a max reference value */
function normalize(value: number, referenceMax: number = 1000): number {
  if (referenceMax <= 0) return 0;
  return Math.min(value / referenceMax, 1);
}

/**
 * MODE_A porting score formula (FREEDOM-configured weights).
 * mode_a_porting_score = (w1 * normalize(tenantAdoption) + w2 * successRate + w3 * improvementVelocity) * 100
 */
export function computeModeAScore(
  signals: Omit<ModeASignals, 'portingThresholdMet' | 'lastUpdated'>,
  weights: SignalWeights['modeA'],
): number {
  const score =
    weights.w1 * normalize(signals.tenantAdoption) +
    weights.w2 * signals.successRate +
    weights.w3 * normalize(signals.improvementVelocity, 10);
  return Math.round(score * 100 * 100) / 100; // round to 2 decimal places
}

/**
 * MODE_B signal score formula (FREEDOM-configured weights).
 * signal_score = (w1 * normalize(installs) + w2 * normalize(activeUsers30d) + w3 * normalize(likes) + w4 * normalize(citations)) * 100
 */
export function computeModeBScore(
  signals: Omit<ModeBSignals, 'signalScore' | 'portingThresholdMet' | 'lastUpdated'>,
  weights: SignalWeights['modeB'],
): number {
  const score =
    weights.w1 * normalize(signals.installs) +
    weights.w2 * normalize(signals.activeUsers30d) +
    weights.w3 * normalize(signals.likes) +
    weights.w4 * normalize(signals.citations);
  return Math.round(score * 100 * 100) / 100;
}

// ── FeatureSignalAggregatorService ────────────────────────────────────────────

export class FeatureSignalAggregatorService {
  constructor(
    /** F1492: IFeatureRegistryService — DATABASE FABRIC */
    private readonly featureRegistry: IFeatureRegistryDb,
    /** F1494: ISignalIngestionService — QUEUE FABRIC */
    private readonly queue: IQueueService,
  ) {}

  /**
   * Aggregate signals for an FT.
   * MODE_A: triggered by XIIGen execution telemetry events.
   * MODE_B: triggered by platform marketplace webhook ingestion.
   */
  async aggregateSignals(
    ftId: string,
    tenantId: string,
    incomingSignals: Record<string, unknown>,
    weights: SignalWeights = DEFAULT_WEIGHTS,
  ): Promise<DataProcessResult<AggregationResult>> {
    if (!ftId) return DataProcessResult.failure('MISSING_FT_ID', 'ftId is required');
    if (!tenantId) return DataProcessResult.failure('MISSING_TENANT', 'tenantId is required');

    // Step 1: Fetch current FT record (BuildSearchFilter — DNA-2)
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
    const platforms = (ftRecord.platforms as unknown[]) ?? [];

    // Step 2: Determine signal mode
    const mode: SignalMode = platforms.length === 0 ? 'MODE_A' : 'MODE_B';

    // Step 3: Compute updated signals and porting score
    let updatedSignals: ModeASignals | ModeBSignals;
    let portingScore: number;

    if (mode === 'MODE_A') {
      const signals = ftRecord.signals as Record<string, unknown> | undefined;
      const current: Omit<ModeASignals, 'portingThresholdMet' | 'lastUpdated'> = {
        executionCount: (signals?.['executionCount'] as number) ?? 0,
        successRate: (signals?.['successRate'] as number) ?? 0,
        avgCostPerRunUsd: (signals?.['avgCostPerRunUsd'] as number) ?? 0,
        avgLatencyMs: (signals?.['avgLatencyMs'] as number) ?? 0,
        tenantAdoption: (signals?.['tenantAdoption'] as number) ?? 0,
        improvementVelocity: (signals?.['improvementVelocity'] as number) ?? 0,
      };

      // Merge incoming signals
      const merged: Omit<ModeASignals, 'portingThresholdMet' | 'lastUpdated'> = {
        executionCount: (incomingSignals.executionCount as number) ?? current.executionCount,
        successRate: (incomingSignals.successRate as number) ?? current.successRate,
        avgCostPerRunUsd: (incomingSignals.avgCostPerRunUsd as number) ?? current.avgCostPerRunUsd,
        avgLatencyMs: (incomingSignals.avgLatencyMs as number) ?? current.avgLatencyMs,
        tenantAdoption: (incomingSignals.tenantAdoption as number) ?? current.tenantAdoption,
        improvementVelocity:
          (incomingSignals.improvementVelocity as number) ?? current.improvementVelocity,
      };

      portingScore = computeModeAScore(merged, weights.modeA);

      updatedSignals = {
        ...merged,
        portingThresholdMet: portingScore >= weights.portingThreshold,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      // MODE_B
      const signals = ftRecord.signals as Record<string, unknown> | undefined;
      const current: Omit<ModeBSignals, 'signalScore' | 'portingThresholdMet' | 'lastUpdated'> = {
        installs: (signals?.['installs'] as number) ?? 0,
        activeUsers30d: (signals?.['activeUsers30d'] as number) ?? 0,
        likes: (signals?.['likes'] as number) ?? 0,
        citations: (signals?.['citations'] as number) ?? 0,
      };

      const merged: Omit<ModeBSignals, 'signalScore' | 'portingThresholdMet' | 'lastUpdated'> = {
        installs: (incomingSignals.installs as number) ?? current.installs,
        activeUsers30d: (incomingSignals.activeUsers30d as number) ?? current.activeUsers30d,
        likes: (incomingSignals.likes as number) ?? current.likes,
        citations: (incomingSignals.citations as number) ?? current.citations,
      };

      portingScore = computeModeBScore(merged, weights.modeB);

      updatedSignals = {
        ...merged,
        signalScore: portingScore,
        portingThresholdMet: portingScore >= weights.portingThreshold,
        lastUpdated: new Date().toISOString(),
      };
    }

    const thresholdMet = portingScore >= weights.portingThreshold;

    // Step 4: storeDocument updated signals (DNA-8 — before enqueue)
    const stored = await this.featureRegistry.storeDocument(
      `feature-registry-${tenantId}`,
      {
        ...ftRecord,
        signals: updatedSignals,
        tenantId,
      } as unknown as Record<string, unknown>,
      ftId,
    );

    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORE_FAILED',
        `Failed to update signals for FT ${ftId}: ${stored.errorMessage}`,
      );
    }

    // Step 5: Emit threshold event if threshold crossed (AFTER storeDocument — DNA-8)
    if (thresholdMet) {
      await this.queue.enqueue('feature-registry.porting-threshold-met', {
        ftId,
        tenantId,
        mode,
        portingScore,
        correlationId: `signal::${ftId}::${tenantId}`,
      });
    }

    return DataProcessResult.success({
      ftId,
      tenantId,
      mode,
      updatedSignals,
      thresholdMet,
      portingScore,
    });
  }
}
