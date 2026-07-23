/**
 * RagBootstrapPhase — post-boot phase that indexes the engine's own patterns into RAG.
 *
 * After all fabrics are initialized, this phase:
 * 1. Collects engine source patterns (kernel, fabrics, factories, AF stations, etc.)
 * 2. Collects core skill patterns from AF-4 (RagContextStation)
 * 3. Collects engine contract patterns from TaskTypeRegistry
 * 4. Runs RagIndexerService.indexAll() to merge and deduplicate
 * 5. Optionally ingests into IRagService via ingestIntoRag()
 *
 * This phase is NON-BLOCKING: if it fails, the engine still works
 * but AF-4 has fewer patterns (graceful degradation).
 *
 * DNA-3: returns DataProcessResult.
 * DNA-5: tenantId required.
 *
 * Phase 11.5: Bootstrap integration.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { RagIndexerService } from '../rag-init/rag-indexer.service';
import type { ExtractionResult } from '../rag-init/pattern-types';

/** Represents the engine's own source code for indexing. */
export interface EngineSourceMap {
  /** Source files: filePath → source code. */
  readonly sources: Map<string, string>;
  /** Test files: filePath → source code. */
  readonly testSources: Map<string, string>;
  /** AF-4 core patterns (from RagContextStation). */
  readonly ragContextPatterns: Array<Record<string, unknown>>;
  /** Engine contract dicts (from TaskTypeRegistry.listAll()). */
  readonly contractDicts: Array<Record<string, unknown>>;
}

/** Minimal RAG ingest interface. */
interface RagIngestTarget {
  ingest(
    documents: Array<Record<string, unknown>>,
    namespace?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

/** Result of the bootstrap phase. */
export interface RagBootstrapResult {
  readonly patternsExtracted: number;
  readonly patternsIngested: number;
  readonly byCategory: Record<string, number>;
  readonly filesScanned: number;
  readonly errors: string[];
  readonly elapsedMs: number;
}

@Injectable()
export class RagBootstrapPhase {
  constructor(private readonly indexerService: RagIndexerService) {}

  /**
   * Execute the RAG bootstrap phase.
   *
   * @param sourceMap Engine source code and patterns to index.
   * @param tenantId Tenant scope for ingestion (DNA-5).
   * @param ragService Optional RAG service to ingest into. If null, extraction-only.
   */
  async execute(
    sourceMap: EngineSourceMap,
    tenantId: string,
    ragService?: RagIngestTarget,
  ): Promise<DataProcessResult<RagBootstrapResult>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const start = Date.now();

    // 1. Run indexAll to extract + merge + deduplicate
    const extractResult = this.indexerService.indexAll(
      sourceMap.sources,
      sourceMap.testSources,
      sourceMap.ragContextPatterns,
      sourceMap.contractDicts,
    );

    if (!extractResult.isSuccess || !extractResult.data) {
      return DataProcessResult.failure(
        'EXTRACTION_FAILED',
        extractResult.errorMessage ?? 'Pattern extraction failed',
      );
    }

    const extraction: ExtractionResult = extractResult.data;

    // 2. Optionally ingest into RAG store
    let ingested = 0;
    if (ragService && extraction.patterns.length > 0) {
      const ingestResult = await this.indexerService.ingestIntoRag(
        ragService,
        extraction.patterns,
        tenantId,
        'engine_patterns',
      );

      if (ingestResult.isSuccess && ingestResult.data) {
        ingested = ingestResult.data.ingested;
      }
      // Ingest failure is non-blocking — patterns still extracted
    }

    const elapsed = Date.now() - start;

    return DataProcessResult.success({
      patternsExtracted: extraction.totalPatterns,
      patternsIngested: ingested,
      byCategory: extraction.byCategory,
      filesScanned: extraction.filesScanned,
      errors: extraction.errors,
      elapsedMs: elapsed,
    });
  }

  /**
   * Build a minimal EngineSourceMap from hardcoded engine signature strings.
   * Used when actual source files aren't available (e.g., compiled deployment).
   */
  buildMinimalSourceMap(
    ragContextPatterns: Array<Record<string, unknown>>,
    contractDicts: Array<Record<string, unknown>>,
  ): EngineSourceMap {
    // Provide representative source snippets for the engine's core patterns
    const sources = new Map<string, string>();

    sources.set(
      'kernel/data-process-result.ts',
      `
export class DataProcessResult<T> {
  readonly isSuccess: boolean;
  readonly data?: T;
  static success<T>(data: T): DataProcessResult<T> { return new DataProcessResult(true, data); }
  static failure(code: string, message: string): DataProcessResult<never> { return new DataProcessResult(false) as any; }
}`,
    );

    sources.set(
      'kernel/build-search-filter.ts',
      `
export function buildSearchFilter(params: Record<string, unknown>): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      filters[key] = value;
    }
  }
  return filters;
}`,
    );

    sources.set(
      'kernel/microservice-base.ts',
      `
export abstract class MicroserviceBase {
  protected readonly tenantId: string;
  constructor(config: Record<string, unknown>) { this.tenantId = config.tenantId as string; }
}`,
    );

    sources.set(
      'factories/factory-registry.ts',
      `
export class FactoryRegistry {
  register(entry: Record<string, unknown>): DataProcessResult<boolean> { return DataProcessResult.success(true); }
  get(factoryId: string): DataProcessResult<Record<string, unknown>> { return DataProcessResult.success({}); }
  findByFabric(fabricType: string): Array<Record<string, unknown>> { return []; }
}`,
    );

    return {
      sources,
      testSources: new Map(),
      ragContextPatterns,
      contractDicts,
    };
  }
}
