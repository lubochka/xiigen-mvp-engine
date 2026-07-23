// T571 PlatformAdapterGenerator [SYNTHESIS]
//
// Given an approved FT record + target platform API spec, generates a thin
// adapter that wraps the Mode A canonical implementation via QUEUE FABRIC.
//
// ONLY runs after PortingDecisionGate APPROVE (BFA-enforced).
// Adapter contains: UI components, API calls, auth flow for target platform.
// Business logic: ZERO — all business logic stays in Mode A canonical service.
//
// Iron rules:
//   - portingCandidate=false FT → failure (belt-and-suspenders CF-808)
//   - storeDocument BEFORE enqueue on adapter ready (DNA-8)
//   - DataProcessResult<T> — never throw (DNA-3)
//   - Adapter code written to adapters/{platformId}/FT-{id}/ path
//   - Tenant isolation: adapter index is tenantId-scoped
//
// Factories:
//   F1492: IFeatureRegistryService (DATABASE FABRIC) — FT CRUD + adapter path update
//   F1496: IAdapterGeneratorService (AI_ENGINE FABRIC) — code generation
//   F1494: ISignalIngestionService (QUEUE FABRIC) — AdapterGenerated event

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
}

export interface AdapterGenerationResult {
  ftId: string;
  tenantId: string;
  targetPlatform: string;
  adapterPath: string;
  adapterFiles: string[];
  generatedAt: string;
  promptVersion: string;
}

export class PlatformAdapterGeneratorService {
  constructor(
    /** F1492: IFeatureRegistryService — DATABASE FABRIC */
    private readonly featureRegistry: IFeatureRegistryDb,
    /** F1496: IAdapterGeneratorService — AI_ENGINE FABRIC */
    private readonly adapterGenerator: IAdapterGeneratorService,
    /** F1494: ISignalIngestionService — QUEUE FABRIC */
    private readonly queue: IQueueService,
  ) {}

  /**
   * Generate a platform adapter for an approved FT.
   * Belt-and-suspenders: checks portingCandidate even though caller should have verified.
   */
  async generate(
    ftId: string,
    tenantId: string,
    targetPlatform: string,
    promptVersion: string = '1.0.0',
  ): Promise<DataProcessResult<AdapterGenerationResult>> {
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
      return DataProcessResult.failure('FT_NOT_FOUND', `FT ${ftId} not found`);
    }

    const ftRecord = (fetchResult.data as Record<string, unknown>[])[0];

    // Belt-and-suspenders: MUST NOT generate for engine-internal features (CF-808)
    if (ftRecord.portingCandidate === false) {
      return DataProcessResult.failure(
        'PORTING_PROHIBITED',
        `FT ${ftId} portingCandidate=false — adapter generation prohibited.`,
      );
    }

    // Step 2: AI adapter generation
    const genResult = await this.adapterGenerator.generate({
      ftId,
      tenantId,
      targetPlatform,
      canonicalImplementation: ftRecord.canonicalImplementation,
      promptVersion,
    });

    if (!genResult.isSuccess) {
      return DataProcessResult.failure(
        genResult.errorCode ?? 'GENERATION_FAILED',
        genResult.errorMessage ?? 'Adapter generation pipeline failed',
      );
    }

    const adapterPath = `adapters/${targetPlatform}/FT-${ftId}/`;
    const adapterFiles: string[] = (genResult.data?.['files'] as string[] | undefined) ?? [];

    const adapterResult: AdapterGenerationResult = {
      ftId,
      tenantId,
      targetPlatform,
      adapterPath,
      adapterFiles,
      generatedAt: new Date().toISOString(),
      promptVersion,
    };

    // Step 3: Update FT record with adapter path (DNA-8 — storeDocument before enqueue)
    const updatedPlatforms = [
      ...((ftRecord.platforms as unknown[]) ?? []),
      {
        platformId: targetPlatform,
        status: 'porting-in-progress',
        adapterPath,
        adapterMode: 'MODE_B',
      },
    ];

    const stored = await this.featureRegistry.storeDocument(
      `feature-registry-${tenantId}`,
      {
        ...ftRecord,
        platforms: updatedPlatforms,
        tenantId,
      } as unknown as Record<string, unknown>,
      ftId,
    );

    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORE_FAILED',
        `Failed to update FT record with adapter path: ${stored.errorMessage}`,
      );
    }

    // Step 4: Emit AdapterGenerated event (AFTER storeDocument — DNA-8)
    await this.queue.enqueue('feature-registry.adapter-generated', {
      ftId,
      tenantId,
      targetPlatform,
      adapterPath,
      correlationId: `adapter::${ftId}::${targetPlatform}`,
    });

    return DataProcessResult.success(adapterResult);
  }
}
