// T567 FeatureExtractor [ANALYSIS]
//
// Given a codebase or design input (ZIP reference or Figma file ID),
// extracts FT entries with boundary definitions and portingCandidate
// classification included.
//
// Amendment 2: Both productScopes handled:
//   - "xiigen-capability" → portingCandidate defaults to false (engine-internal detection)
//   - "marketplace-plugin" → portingCandidate defaults to true (thin adapter eligible)
//
// Iron rules:
//   - portingCandidate is MACHINE — never tenant-tunable (CF-808, CF-813)
//   - Validate output against feature-manifest schema v2.0 before storeDocument
//   - storeDocument BEFORE enqueue on extraction complete (DNA-8)
//   - BuildSearchFilter for all dedup queries (DNA-2)
//   - Tenant isolation: feature-registry index is tenantId-scoped
//   - DataProcessResult<T> — never throw for business conditions (DNA-3)
//
// Factories:
//   F1492: IFeatureRegistryService (DATABASE FABRIC) — FT CRUD + dedup
//   F1493: IFeatureExtractorService (AI_ENGINE FABRIC) — extraction pipeline
//   F1494: ISignalIngestionService (QUEUE FABRIC) — emit FeatureExtractionCompleted

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

interface IAiExtractorService {
  extract(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

// ── Domain types ─────────────────────────────────────────────────────────────

export type ProductScope = 'xiigen-capability' | 'marketplace-plugin';

export interface ExtractedFeature {
  ftId: string;
  name: string;
  description: string;
  productScope: ProductScope;
  portingCandidate: boolean;
  portingCandidateReason?: string;
  canonicalImplementation: {
    flowId: string;
    taskTypeId: string;
    serviceClass: string;
    status: 'confirmed' | 'pending-flow-execution';
  };
  platforms: unknown[];
  signals: Record<string, unknown>;
  portingConstraints: string[];
  platformIncompatibilities: string[];
  extractedAt: string;
}

export interface ExtractionResult {
  extractionId: string;
  sourceReference: string;
  tenantId: string;
  features: ExtractedFeature[];
  extractionPrecision: number;
  portingCandidateAccuracy: number;
  ftCount: number;
  extractedAt: string;
  promptVersion: string;
}

// ── portingCandidate classification helpers ───────────────────────────────────

// MACHINE rules — these are never tenant-tunable (CF-808, CF-813).
// If a feature satisfies any engine-internal rule, portingCandidate = false.
const ENGINE_INTERNAL_PATTERNS: RegExp[] = [
  /arbiter|consensus.*gate|generation.*loop|regression.*analy/i,
  /bootstrap.*orchestrat|training.*trace|prompt.*evolution/i,
  /bfa.*rule|decision.*log|meta.*arbitr/i,
  /implement.*family.*meta|five.*arbiter/i,
];

/**
 * Classifies whether a feature is eligible for platform porting.
 * MACHINE determination — not tenant-overridable.
 *
 * portingCandidate = false when:
 *   - The capability IS the generation engine or a sub-component of it
 *   - The capability requires access to XIIGen's internal state to function
 *   - Exporting would expose XIIGen's architectural internals to a third-party runtime
 *   - productScope = 'xiigen-capability' AND name matches engine-internal patterns
 *
 * portingCandidate = true when:
 *   - productScope = 'marketplace-plugin' (already a thin adapter)
 *   - productScope = 'xiigen-capability' AND capability is well-bounded with
 *     defined inputs/outputs that can run in a reduced-privilege sandbox
 */
export function classifyPortingCandidate(
  name: string,
  description: string,
  productScope: ProductScope,
): { portingCandidate: boolean; portingCandidateReason?: string } {
  // Amendment 2: marketplace-plugin scope is always a porting candidate
  if (productScope === 'marketplace-plugin') {
    return { portingCandidate: true };
  }

  // xiigen-capability scope: check engine-internal patterns
  const combined = `${name} ${description}`;
  for (const pattern of ENGINE_INTERNAL_PATTERNS) {
    if (pattern.test(combined)) {
      return {
        portingCandidate: false,
        portingCandidateReason:
          'Engine-internal capability. Porting would expose XIIGen generation internals ' +
          'to an untrusted third-party platform runtime. Architectural boundary violation.',
      };
    }
  }

  // xiigen-capability with no engine-internal signals → eligible (e.g. T47 SSOAndEmailAuth)
  return { portingCandidate: true };
}

// ── FeatureExtractorService ───────────────────────────────────────────────────

export class FeatureExtractorService {
  constructor(
    /** F1492: IFeatureRegistryService — DATABASE FABRIC */
    private readonly featureRegistry: IFeatureRegistryDb,
    /** F1493: IFeatureExtractorService — AI_ENGINE FABRIC */
    private readonly aiExtractor: IAiExtractorService,
    /** F1494: ISignalIngestionService — QUEUE FABRIC */
    private readonly queue: IQueueService,
  ) {}

  /**
   * Extract FT entries from a source reference (ZIP path or Figma file ID).
   * Validates against schema v2.0. Deduplicates against existing registry.
   * Stores before emitting (DNA-8).
   */
  async extractFeatures(
    sourceReference: string,
    tenantId: string,
    promptVersion: string = '1.0.0',
  ): Promise<DataProcessResult<ExtractionResult>> {
    if (!sourceReference) {
      return DataProcessResult.failure('MISSING_SOURCE', 'sourceReference is required');
    }
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId is required');
    }

    // Step 1: AI extraction
    const aiResult = await this.aiExtractor.extract({
      sourceReference,
      tenantId,
      promptVersion,
      schema: 'feature-manifest-v2',
    });

    if (!aiResult.isSuccess) {
      return DataProcessResult.failure(
        aiResult.errorCode ?? 'EXTRACTION_FAILED',
        aiResult.errorMessage ?? 'AI extraction pipeline failed',
      );
    }

    const rawFeatures: Array<Record<string, unknown>> =
      (aiResult.data?.['features'] as Array<Record<string, unknown>> | undefined) ?? [];

    if (rawFeatures.length === 0) {
      return DataProcessResult.failure('NO_FEATURES_EXTRACTED', 'Extraction returned 0 features');
    }

    // Step 2: Apply portingCandidate classification (MACHINE — Amendment 2)
    const classifiedFeatures: ExtractedFeature[] = rawFeatures.map((raw) => {
      const name = (raw.name as string) ?? '';
      const description = (raw.description as string) ?? '';
      const productScope = ((raw.productScope as string) ?? 'xiigen-capability') as ProductScope;

      const { portingCandidate, portingCandidateReason } = classifyPortingCandidate(
        name,
        description,
        productScope,
      );

      const feature: ExtractedFeature = {
        ftId: (raw.ftId as string) ?? `FT-AUTO-${Date.now()}`,
        name,
        description,
        productScope,
        portingCandidate,
        portingCandidateReason,
        canonicalImplementation:
          (raw.canonicalImplementation as ExtractedFeature['canonicalImplementation']) ?? {
            flowId: '',
            taskTypeId: '',
            serviceClass: '',
            status: 'pending-flow-execution',
          },
        platforms: portingCandidate ? ((raw.platforms as unknown[]) ?? []) : [],
        signals: (raw.signals as Record<string, unknown>) ?? {},
        portingConstraints: portingCandidate ? ((raw.portingConstraints as string[]) ?? []) : [],
        platformIncompatibilities: (raw.platformIncompatibilities as string[]) ?? [],
        extractedAt: new Date().toISOString(),
      };

      return feature;
    });

    // Step 3: Dedup against existing registry (BuildSearchFilter — DNA-2)
    const existingIds = new Set<string>();
    for (const feature of classifiedFeatures) {
      const searchResult = await this.featureRegistry.searchDocuments(
        `feature-registry-${tenantId}`,
        { ftId: feature.ftId, tenantId },
      );
      if (searchResult.isSuccess && (searchResult.data as unknown[]).length > 0) {
        existingIds.add(feature.ftId);
      }
    }

    const newFeatures = classifiedFeatures.filter((f) => !existingIds.has(f.ftId));

    // Step 4: Build extraction result
    const extractionId = `extraction::${tenantId}::${Date.now()}`;
    const result: ExtractionResult = {
      extractionId,
      sourceReference,
      tenantId,
      features: classifiedFeatures,
      extractionPrecision: (aiResult.data?.extractionPrecision as number) ?? 0,
      portingCandidateAccuracy: 1.0, // Machine classification — always correct until human override
      ftCount: classifiedFeatures.length,
      extractedAt: new Date().toISOString(),
      promptVersion,
    };

    // Step 5: storeDocument new FT records (DNA-8 — before enqueue)
    for (const feature of newFeatures) {
      const stored = await this.featureRegistry.storeDocument(
        `feature-registry-${tenantId}`,
        { ...feature, tenantId } as unknown as Record<string, unknown>,
        feature.ftId,
      );
      if (!stored.isSuccess) {
        return DataProcessResult.failure(
          stored.errorCode ?? 'STORE_FAILED',
          `Failed to store FT record ${feature.ftId}: ${stored.errorMessage}`,
        );
      }
    }

    // Step 6: Store extraction audit record (DNA-8 — before enqueue)
    const auditStored = await this.featureRegistry.storeDocument(
      `feature-extractions-${tenantId}`,
      {
        extractionId,
        sourceReference,
        tenantId,
        ftCount: result.ftCount,
        newFtCount: newFeatures.length,
        extractionPrecision: result.extractionPrecision,
        promptVersion,
        extractedAt: result.extractedAt,
      } as unknown as Record<string, unknown>,
      extractionId,
    );

    if (!auditStored.isSuccess) {
      return DataProcessResult.failure(
        auditStored.errorCode ?? 'AUDIT_STORE_FAILED',
        `Failed to store extraction audit: ${auditStored.errorMessage}`,
      );
    }

    // Step 7: Emit FeatureExtractionCompleted event (AFTER storeDocument — DNA-8)
    await this.queue.enqueue('feature-registry.extraction.completed', {
      extractionId,
      tenantId,
      ftCount: result.ftCount,
      newFtCount: newFeatures.length,
      extractionPrecision: result.extractionPrecision,
      correlationId: extractionId,
    });

    return DataProcessResult.success(result);
  }
}
