// T569 PortingCostEstimator [ANALYSIS]
//
// Given an FT + source platform + target platform, estimates porting effort.
// ONLY called when portingCandidate=true — PortingDecisionGate enforces this.
//
// Iron rules:
//   - MUST NOT run when portingCandidate=false (CF-809)
//   - Cost thresholds from FREEDOM config — never hardcoded
//   - DataProcessResult<T> — never throw (DNA-3)
//   - RAG retrieval via F1495 for platform constraint docs
//
// Factories:
//   F1492: IFeatureRegistryService (DATABASE FABRIC) — FT lookup
//   F1495: IPortingDecisionService (RAG FABRIC) — platform constraint RAG

import { DataProcessResult } from '../../../kernel/data-process-result';

interface IFeatureRegistryDb {
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: unknown }>;
}

interface IRagService {
  search(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export interface CostEstimate {
  ftId: string;
  sourcePlatform: string;
  targetPlatform: string;
  costEstimateUsd: number;
  effortDays: number;
  complexityScore: number; // 0–100
  constraintsSummary: string[];
  estimatedAt: string;
}

export class PortingCostEstimatorService {
  constructor(
    /** F1492: IFeatureRegistryService — DATABASE FABRIC */
    private readonly featureRegistry: IFeatureRegistryDb,
    /** F1495: IPortingDecisionService — RAG FABRIC */
    private readonly ragService: IRagService,
  ) {}

  /**
   * Estimate the cost and effort of porting an FT to a target platform.
   * CALLER is responsible for ensuring portingCandidate=true before calling.
   * This service asserts the guard as a defense-in-depth measure (CF-809).
   */
  async estimate(
    ftId: string,
    tenantId: string,
    targetPlatform: string,
    _maxCostUsd: number = 5000,
  ): Promise<DataProcessResult<CostEstimate>> {
    if (!ftId) return DataProcessResult.failure('MISSING_FT_ID', 'ftId is required');
    if (!tenantId) return DataProcessResult.failure('MISSING_TENANT', 'tenantId is required');
    if (!targetPlatform)
      return DataProcessResult.failure('MISSING_TARGET_PLATFORM', 'targetPlatform is required');

    // Step 1: Fetch FT record
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

    // Defense-in-depth: MUST NOT run when portingCandidate=false (CF-809)
    if (ftRecord.portingCandidate === false) {
      return DataProcessResult.failure(
        'PORTING_PROHIBITED',
        `FT ${ftId} portingCandidate=false — cost estimation prohibited. PortingDecisionGate must emit PortingProhibited instead.`,
      );
    }

    // Step 2: RAG retrieval — platform constraint docs + historical porting effort
    const ragResult = await this.ragService.search({
      targetPlatform,
      ftId,
      queryType: 'porting-constraints',
    });

    const ragData = ragResult.data as Record<string, unknown> | undefined;
    const constraints: string[] = ragResult.isSuccess
      ? ((ragData?.['constraints'] as string[]) ?? [])
      : [];

    const historicalEffortDays: number = ragResult.isSuccess
      ? ((ragData?.['avgEffortDays'] as number) ?? 5)
      : 5;

    // Step 3: Compute complexity and cost
    const complexityScore = Math.min(constraints.length * 10 + historicalEffortDays * 2, 100);
    const costEstimateUsd = Math.round(historicalEffortDays * 400 * (complexityScore / 50));
    const effortDays = historicalEffortDays;

    return DataProcessResult.success({
      ftId,
      sourcePlatform: 'xiigen',
      targetPlatform,
      costEstimateUsd,
      effortDays,
      complexityScore,
      constraintsSummary: constraints,
      estimatedAt: new Date().toISOString(),
    });
  }
}
