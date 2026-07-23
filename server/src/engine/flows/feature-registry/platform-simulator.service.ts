// T572 PlatformSimulator [SIMULATION]
//
// Loads a generated adapter and executes it against a mock platform runtime.
// Supported platforms in Phase E: Figma, Canva.
// On FAIL: retries via PromptPatch cycle (max 3 rounds, tracked in FREEDOM config).
//
// Iron rules:
//   - Local-only execution — zero cloud credentials required (P7)
//   - Max retry count from FREEDOM config — never hardcoded
//   - storeDocument BEFORE enqueue on simulation result (DNA-8)
//   - DataProcessResult<T> — never throw (DNA-3)
//   - Tenant isolation: simulation results indexed by tenantId
//
// Factories:
//   F1492: IFeatureRegistryService (DATABASE FABRIC) — simulation result + FT status update
//   F1496: IAdapterGeneratorService (AI_ENGINE FABRIC) — PromptPatch re-generation on fail
//   F1494: ISignalIngestionService (QUEUE FABRIC) — SimulationPassed/Failed events

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

interface IAdapterGeneratorService {
  generate(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
  simulate(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
  applyPromptPatch(params: Record<string, unknown>): Promise<void>;
}

export type SimulationStatus = 'PASS' | 'FAIL' | 'RETRY_EXHAUSTED';

export type SupportedPlatform = 'figma' | 'canva';

export interface SimulationResult {
  ftId: string;
  tenantId: string;
  targetPlatform: SupportedPlatform;
  status: SimulationStatus;
  roundsAttempted: number;
  errorLog?: string;
  simulatedAt: string;
}

const SUPPORTED_PLATFORMS: SupportedPlatform[] = ['figma', 'canva'];

export class PlatformSimulatorService {
  constructor(
    /** F1492: IFeatureRegistryService — DATABASE FABRIC */
    private readonly featureRegistry: IFeatureRegistryDb,
    /** F1496: IAdapterGeneratorService — AI_ENGINE FABRIC (PromptPatch re-gen) */
    private readonly adapterGenerator: IAdapterGeneratorService,
    /** F1494: ISignalIngestionService — QUEUE FABRIC */
    private readonly queue: IQueueService,
  ) {}

  /**
   * Run the generated adapter through the platform simulator.
   * If it fails, attempt PromptPatch re-generation (up to maxRetries from FREEDOM config).
   */
  async simulate(
    ftId: string,
    tenantId: string,
    targetPlatform: string,
    adapterPath: string,
    maxRetries: number = 3,
  ): Promise<DataProcessResult<SimulationResult>> {
    if (!ftId) return DataProcessResult.failure('MISSING_FT_ID', 'ftId is required');
    if (!tenantId) return DataProcessResult.failure('MISSING_TENANT', 'tenantId is required');
    if (!targetPlatform)
      return DataProcessResult.failure('MISSING_TARGET_PLATFORM', 'targetPlatform is required');

    if (!SUPPORTED_PLATFORMS.includes(targetPlatform as SupportedPlatform)) {
      return DataProcessResult.failure(
        'UNSUPPORTED_PLATFORM',
        `Platform ${targetPlatform} not supported in simulator. Supported: ${SUPPORTED_PLATFORMS.join(', ')}`,
      );
    }

    let roundsAttempted = 0;
    let lastError: string | undefined;
    let simStatus: SimulationStatus = 'FAIL';

    // Retry loop (max from FREEDOM config — never hardcoded)
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      roundsAttempted = attempt;

      const simResult = await this.adapterGenerator.simulate({
        ftId,
        tenantId,
        targetPlatform,
        adapterPath,
        round: attempt,
      });

      if (simResult.isSuccess && simResult.data?.['passed'] === true) {
        simStatus = 'PASS';
        break;
      }

      lastError =
        (simResult.data?.['error'] as string | undefined) ??
        simResult.errorMessage ??
        'Simulation failed';

      // Apply PromptPatch on failure (except last attempt)
      if (attempt < maxRetries) {
        await this.adapterGenerator.applyPromptPatch({
          ftId,
          tenantId,
          targetPlatform,
          errorLog: lastError,
          round: attempt,
        });
      }
    }

    if (simStatus === 'FAIL') {
      simStatus = 'RETRY_EXHAUSTED';
    }

    const result: SimulationResult = {
      ftId,
      tenantId,
      targetPlatform: targetPlatform as SupportedPlatform,
      status: simStatus,
      roundsAttempted,
      errorLog: lastError,
      simulatedAt: new Date().toISOString(),
    };

    // DNA-8: storeDocument simulation result BEFORE emitting event
    const stored = await this.featureRegistry.storeDocument(
      `platform-simulations-${tenantId}`,
      {
        ...result,
        adapterPath,
      } as unknown as Record<string, unknown>,
      `${ftId}::${targetPlatform}::${Date.now()}`,
    );

    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORE_FAILED',
        `Failed to store simulation result: ${stored.errorMessage}`,
      );
    }

    if (simStatus === 'PASS') {
      // Update FT record: platforms[].status = 'implemented' (DNA-8 — storeDocument before enqueue)
      const fetchResult = await this.featureRegistry.searchDocuments(
        `feature-registry-${tenantId}`,
        { ftId, tenantId },
      );

      if (fetchResult.isSuccess && (fetchResult.data as unknown[]).length > 0) {
        const ftRecord = (fetchResult.data as Record<string, unknown>[])[0];
        const platforms = ((ftRecord.platforms as Record<string, unknown>[]) ?? []).map((p) =>
          p.platformId === targetPlatform ? { ...p, status: 'implemented' } : p,
        );

        await this.featureRegistry.storeDocument(
          `feature-registry-${tenantId}`,
          { ...ftRecord, platforms, tenantId } as unknown as Record<string, unknown>,
          ftId,
        );
      }

      await this.queue.enqueue('feature-registry.simulation-passed', {
        ftId,
        tenantId,
        targetPlatform,
        adapterPath,
        correlationId: `sim::${ftId}::${targetPlatform}`,
      });
    } else {
      await this.queue.enqueue('feature-registry.simulation-failed', {
        ftId,
        tenantId,
        targetPlatform,
        roundsAttempted,
        errorLog: lastError,
        correlationId: `sim::${ftId}::${targetPlatform}`,
      });
    }

    return DataProcessResult.success(result);
  }
}
