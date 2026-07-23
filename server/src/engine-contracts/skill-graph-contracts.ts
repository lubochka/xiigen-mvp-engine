import { MODEL_HINT_FROM_FREEDOM } from '../freedom/config-schema';
/**
 * FLOW-0A Engine Contracts — T577, T578, T579.
 *
 * The three task types that FLOW-0A generates (RAG Benchmark Self-Implementation).
 * All three feed the arbitration loop: generate → judge → improve → repeat.
 *
 * T577: PatternExtractorService   — extracts XIIGen patterns from source code
 * T578: BenchmarkRunnerService    — runs RAG benchmark suite against pattern corpus
 * T579: PatternIndexerService     — indexes extracted patterns into RAG store
 *
 * Family-205: FLOW-0A self-implementation family.
 * Factories: F1502–F1507 (6 dependencies across 3 contracts).
 *
 * DNA-1: toDict() via EngineContract.toDict() — Record<string,unknown>.
 * DNA-3: validate() returns DataProcessResult.
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

const FLOW0_QUALITY_GATES_CORE = [
  {
    gateId: 'QG-01',
    description: 'All services extend MicroserviceBase (DNA-4)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-02',
    description: 'No direct SDK imports — only fabric interfaces (DNA fabric rule)',
    severity: 'error' as const,
    checkType: 'fabric_usage',
  },
  {
    gateId: 'QG-03',
    description: 'All methods return DataProcessResult (DNA-3)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-04',
    description: 'Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
];

const FLOW0_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
];

/**
 * T577 — PatternExtractorService.
 *
 * ARCHETYPE: DATA_PIPELINE
 * PURPOSE: Reads XIIGen source files, extracts DNA patterns, fabric interfaces,
 *          and factory signatures. Output fed to T579 (PatternIndexer).
 *
 * F1502: IPatternExtractorService → DATABASE FABRIC (Elasticsearch read)
 * F1503: IPatternStoreService    → DATABASE FABRIC (Elasticsearch write)
 */
export function createT577Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T577',
    name: 'PatternExtractorService',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'Triggered by FLOW-0A Phase A bootstrap with source file paths',
    purpose:
      'Extracts XIIGen architectural patterns (DNA, fabric interfaces, factory signatures) from source files for RAG seeding',
    distinctFrom: 'T579 (indexes extracted patterns — T577 extracts, T579 indexes)',
    familyId: 'Family-205',

    factoryDependencies: [
      {
        factoryId: 'F1502',
        interfaceName: 'IPatternExtractorService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Source pattern reader — searches existing pattern index for deduplication',
      },
      {
        factoryId: 'F1503',
        interfaceName: 'IPatternStoreService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Extracted pattern writer — stores raw pattern documents for T579 to index',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow0', taskType: 'T577', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['dna_compliance', 'fabric_usage', 'pattern_extraction'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'data_pipeline', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'tenant', 'xiigen'] },
      },
    ],

    qualityGates: [
      ...FLOW0_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Extracted patterns include source file reference and pattern type',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],

    bfaRegistration: {
      entities: ['xiigen_pattern', 'pattern_source'],
      events: ['pattern.extracted', 'pattern.duplicate_skipped'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW0_IRON_RULES_CORE,
      'EVERY extracted pattern MUST include: patternType, sourceFile, code snippet',
      'Duplicate patterns MUST be skipped (check by patternType + sourceFile hash)',
    ],

    machineComponents: [
      'Pattern deduplication by hash',
      'Scope isolation enforcement',
      'DataProcessResult wrapping',
    ],

    freedomComponents: [
      'Pattern types to extract (configurable list)',
      'Max patterns per file',
      'Source file glob filter',
    ],
  });
}

/**
 * T578 — BenchmarkRunnerService.
 *
 * ARCHETYPE: ORCHESTRATION
 * PURPOSE: Runs RAG retrieval benchmarks against the indexed pattern corpus.
 *          Produces quality metrics consumed by the arbitration loop judge.
 *
 * F1504: IBenchmarkRunnerService → AI_ENGINE FABRIC (LLM evaluation)
 * F1505: IBenchmarkStoreService  → DATABASE FABRIC (Elasticsearch — stores run results)
 */
export function createT578Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T578',
    name: 'BenchmarkRunnerService',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered by FLOW-0A arbitration loop after T579 index is populated',
    purpose:
      'Runs RAG retrieval benchmarks (precision@k, recall@k, MRR) against pattern corpus and stores results for arbiter scoring',
    distinctFrom: 'T577 (extraction — T578 evaluates retrieval quality), T579 (indexing)',
    familyId: 'Family-205',

    factoryDependencies: [
      {
        factoryId: 'F1504',
        interfaceName: 'IBenchmarkRunnerService',
        fabricType: FabricType.AI_ENGINE,
        providerHint: 'anthropic',
        description: 'LLM-based benchmark evaluator — uses AI to judge retrieval relevance',
      },
      {
        factoryId: 'F1505',
        interfaceName: 'IBenchmarkStoreService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Benchmark results store — persists precision/recall/MRR scores per run',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow0', taskType: 'T578', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['ai_orchestration', 'benchmarking', 'quality_scoring'],
        },
      },
      {
        stationId: 'AF-5',
        role: 'multi_model',
        config: { models: [MODEL_HINT_FROM_FREEDOM], aggregation: 'best_score', keepAll: true },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'orchestration', max_tokens: 8000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'tenant', 'xiigen'] },
      },
    ],

    qualityGates: [
      ...FLOW0_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Benchmark results include precision@k, recall@k, and MRR fields',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'Each run stores connection_type=TENANT_EXPORTABLE for training traces',
        severity: 'warning' as const,
        checkType: 'code_structure',
      },
    ],

    bfaRegistration: {
      entities: ['benchmark_run', 'benchmark_result'],
      events: ['benchmark.completed', 'benchmark.failed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW0_IRON_RULES_CORE,
      'NEVER call AI provider SDK directly — use IAiProvider via AI_ENGINE FABRIC',
      'Benchmark results MUST include runId, taskType, precision, recall, mrr fields',
      'EVERY benchmark run MUST be stored before results are returned',
    ],

    machineComponents: [
      'Metric computation (precision@k, recall@k, MRR)',
      'Run ID generation',
      'Scope isolation enforcement',
      'DataProcessResult wrapping',
    ],

    freedomComponents: [
      'k value for precision/recall (default: 5)',
      'Minimum acceptable MRR threshold',
      'Models to use for evaluation (list)',
    ],
  });
}

/**
 * T579 — PatternIndexerService.
 *
 * ARCHETYPE: DATA_PIPELINE
 * PURPOSE: Takes raw patterns from T577 and indexes them into the RAG store
 *          so T578 (benchmark) can retrieve them via vector similarity.
 *
 * F1506: IPatternIndexerService  → RAG FABRIC (vector index write)
 * F1507: IIndexAuditService      → DATABASE FABRIC (Elasticsearch — index audit trail)
 */
export function createT579Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T579',
    name: 'PatternIndexerService',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'Triggered by FLOW-0A after T577 extraction produces raw pattern documents',
    purpose:
      'Embeds and indexes XIIGen architectural patterns into the RAG vector store for retrieval by benchmarks and future code generation',
    distinctFrom: 'T577 (extraction — T579 indexes), T578 (benchmark — T579 populates)',
    familyId: 'Family-205',

    factoryDependencies: [
      {
        factoryId: 'F1506',
        interfaceName: 'IPatternIndexerService',
        fabricType: FabricType.RAG,
        providerHint: 'elasticsearch',
        description: 'RAG vector index — embeds and stores pattern chunks for similarity search',
      },
      {
        factoryId: 'F1507',
        interfaceName: 'IIndexAuditService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Index audit trail — tracks which patterns were indexed, when, and by which run',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow0', taskType: 'T579', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['rag_indexing', 'vector_store', 'fabric_usage'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'data_pipeline', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'tenant', 'xiigen'] },
      },
    ],

    qualityGates: [
      ...FLOW0_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Each indexed chunk includes patternType, sourceFile, embedding metadata',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'Indexing uses RAG FABRIC — no direct vector DB client imports',
        severity: 'error' as const,
        checkType: 'fabric_usage',
      },
    ],

    bfaRegistration: {
      entities: ['pattern_chunk', 'index_run'],
      events: ['pattern.indexed', 'index_run.completed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW0_IRON_RULES_CORE,
      'NEVER import vector DB client directly — use IRagService via RAG FABRIC',
      'EVERY index operation MUST write audit record BEFORE returning success (DNA-8)',
      'Chunk IDs MUST be deterministic (hash of patternType + sourceFile + chunkIndex)',
    ],

    machineComponents: [
      'Chunk ID generation (deterministic hash)',
      'Audit-before-return ordering (DNA-8)',
      'Scope isolation enforcement',
      'DataProcessResult wrapping',
    ],

    freedomComponents: [
      'Chunk size (tokens per chunk)',
      'Overlap between chunks',
      'RAG namespace for pattern index',
    ],
  });
}

/** All three FLOW-0A contracts as an array. */
export const FLOW0_CONTRACTS = [
  createT577Contract(),
  createT578Contract(),
  createT579Contract(),
] as const;
