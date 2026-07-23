/**
 * RagIndexerService — the main orchestrator for RAG ingestion.
 *
 * Coordinates: CodePatternExtractor + SkillIndexer + TestPatternIndexer
 * Then ingests all patterns into IRagService.
 *
 * DNA-3: all methods return DataProcessResult.
 * DNA-5: tenantId required for ingest.
 *
 * Phase 11.2.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { CodePatternExtractor } from './code-pattern-extractor';
import { SkillIndexer } from './skill-indexer';
import { TestPatternIndexer } from './test-pattern-indexer';
import {
  type CodePattern,
  type ExtractionResult,
  createExtractionResult,
  toRagDocument,
} from './pattern-types';

/** Minimal IRagService shape for ingestion (avoids circular import). */
interface RagIngestTarget {
  ingest(
    documents: Array<Record<string, unknown>>,
    namespace?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

@Injectable()
export class RagIndexerService {
  constructor(
    private readonly codeExtractor: CodePatternExtractor,
    private readonly skillIndexer: SkillIndexer,
    private readonly testIndexer: TestPatternIndexer,
  ) {}

  /**
   * Index engine source patterns via CodePatternExtractor.
   */
  indexEnginePatterns(sources: Map<string, string>): DataProcessResult<ExtractionResult> {
    return this.codeExtractor.extractFromSources(sources);
  }

  /**
   * Index skill patterns from AF-4 core patterns + engine contracts.
   */
  indexSkillPatterns(
    ragContextPatterns: Array<Record<string, unknown>>,
    contractDicts: Array<Record<string, unknown>>,
  ): DataProcessResult<CodePattern[]> {
    const skillResult = this.skillIndexer.indexSkills(ragContextPatterns);
    const contractResult = this.skillIndexer.indexContracts(contractDicts);

    if (!skillResult.isSuccess) return skillResult;
    if (!contractResult.isSuccess) return contractResult;

    const merged = [...(skillResult.data ?? []), ...(contractResult.data ?? [])];
    return DataProcessResult.success(merged);
  }

  /**
   * Index test patterns from test source files.
   */
  indexTestPatterns(testSources: Map<string, string>): DataProcessResult<CodePattern[]> {
    return this.testIndexer.extractFromTestSources(testSources);
  }

  /**
   * Run all three indexers and merge/deduplicate results.
   */
  indexAll(
    sources: Map<string, string>,
    testSources: Map<string, string>,
    ragContextPatterns: Array<Record<string, unknown>>,
    contractDicts: Array<Record<string, unknown>>,
  ): DataProcessResult<ExtractionResult> {
    const allPatterns: CodePattern[] = [];
    const errors: string[] = [];
    let filesScanned = 0;

    // 1. Engine source patterns
    const engineResult = this.indexEnginePatterns(sources);
    if (engineResult.isSuccess && engineResult.data) {
      allPatterns.push(...engineResult.data.patterns);
      filesScanned += engineResult.data.filesScanned;
      errors.push(...engineResult.data.errors);
    }

    // 2. Skill + contract patterns
    const skillResult = this.indexSkillPatterns(ragContextPatterns, contractDicts);
    if (skillResult.isSuccess && skillResult.data) {
      allPatterns.push(...skillResult.data);
    }

    // 3. Test patterns
    const testResult = this.indexTestPatterns(testSources);
    if (testResult.isSuccess && testResult.data) {
      allPatterns.push(...testResult.data);
      filesScanned += testSources.size;
    }

    // 4. Deduplicate by name (keep first occurrence)
    const deduplicated = this.deduplicatePatterns(allPatterns);

    return DataProcessResult.success(createExtractionResult(deduplicated, filesScanned, errors));
  }

  /**
   * Ingest patterns into the RAG store.
   * DNA-5: tenantId required.
   */
  async ingestIntoRag(
    ragService: RagIngestTarget,
    patterns: CodePattern[],
    tenantId: string,
    namespace = 'engine_patterns',
  ): Promise<DataProcessResult<{ ingested: number }>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    if (patterns.length === 0) {
      return DataProcessResult.success({ ingested: 0 });
    }

    const documents = patterns.map(toRagDocument);

    // Batch ingest in chunks of 50
    const batchSize = 50;
    let ingested = 0;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const result = await ragService.ingest(batch, namespace);
      if (result.isSuccess) {
        ingested += batch.length;
      } else {
        return DataProcessResult.failure(
          'INGEST_FAILED',
          `Batch ${Math.floor(i / batchSize)} failed: ${result.errorMessage}`,
          { ingested_so_far: ingested },
        );
      }
    }

    return DataProcessResult.success({ ingested });
  }

  // ── Helpers ───────────────────────────────────────

  /** Deduplicate patterns by name — keep first occurrence. */
  private deduplicatePatterns(patterns: CodePattern[]): CodePattern[] {
    const seen = new Set<string>();
    const result: CodePattern[] = [];

    for (const p of patterns) {
      const key = `${p.name}::${p.source}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(p);
      }
    }

    return result;
  }
}
