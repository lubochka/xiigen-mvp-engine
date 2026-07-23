import { MODEL_HINT_FROM_FREEDOM } from '../freedom/config-schema';
/**
 * FLOW-29 Engine Contracts — Adaptive RAG Deep Research Engine.
 * T441–T467 — 27 task types across 9 archetypes.
 *
 * T441: AdaptiveRagRouter         [ORCHESTRATION]   — route query to retrieval mode(s) via bandit policy
 * T442: VectorRetrievalStep       [RETRIEVAL]       — tenant-scoped vector similarity search
 * T443: GraphRAGCommunityQuery    [RETRIEVAL]       — community-level graph RAG query
 * T444: HybridRetrievalFusion     [RETRIEVAL]       — fuse vector + graph results (CF-606)
 * T445: BanditModelSelector       [ROUTING]         — multi-armed bandit model/strategy selection
 * T446: BudgetEnforcementGate     [GUARD]           — hard-stop on token/cost budget exceeded
 * T447: RoutingPolicyUpdater      [LEARNING]        — async bandit policy update from feedback
 * T448: TraceSpanCapture          [OBSERVABILITY]   — emit trace spans via QUEUE FABRIC only
 * T449: UserFeedbackIngest        [LEARNING]        — ingest feedback linked to 6-tuple run context
 * T450: PromptVersionPromoter     [GOVERNANCE]      — immutable prompt version promotion ladder
 * T451: DomainProfileCompiler     [BUILD]           — async compile domain knowledge profile
 * T452: KnowledgeGraphEditGate    [GOVERNANCE]      — FLOW-25 BFA gate before structural graph edit
 * T453: RAGAssetVersionCompare    [EVALUATION]      — compare RAG asset versions on eval dataset
 * T454: EvalQualityGate           [GUARD]           — hard-stop on hallucination/coverage below threshold
 * T455: PromotionPipelineGate     [GOVERNANCE]      — FLOW-25 BFA gate before promotion to ACTIVE
 * T456: ABTestAllocator           [EXPERIMENTATION] — deterministic hash-based A/B variant allocation
 * T457: ContextEfficiencyCheck    [GUARD]           — hard-stop on context token over-allocation
 * T458: RerankerStep              [RETRIEVAL]       — rerank retrieval results by relevance score
 * T459: SelfReflectionGuard       [GUARD]           — decide whether retrieval is needed at all
 * T460: FeedbackAggregationWindow [LEARNING]        — time-window aggregate + trigger policy update
 * T461: ImprovementSuggestionEngine [ANALYSIS]      — AI suggestions queue-only, never auto-applied
 * T462: ControlPlaneGraphEdit     [GOVERNANCE]      — versioned graph edit with BFA approval
 * T463: MultiHopGraphTraversal    [RETRIEVAL]       — multi-hop graph traversal with visited-set guard
 * T464: CommunitySummaryGenerator [BUILD]           — async community summary generation
 * T465: DomainGraphIndexRebuild   [BUILD]           — async index rebuild, live queries use prev index
 * T466: RAGStrategyRollback       [GOVERNANCE]      — pointer-swap rollback, no deletion
 * T467: ControlPlaneNodeRenderer  [UI]              — fabric-first node rendering, zero hardcoded values
 *
 * Families: 175 (ORCHESTRATION/ROUTING), 176 (RETRIEVAL), 177 (GUARD),
 *           178 (LEARNING), 179 (OBSERVABILITY), 180 (BUILD),
 *           181 (EVALUATION/EXPERIMENTATION), 182 (ANALYSIS), 183 (GOVERNANCE), 184 (UI)
 * Factories: F1176–F1247
 * CF rules:  CF-600–CF-650
 *
 * Score-0 rules:
 *   observability::no-sdk-import — zero direct OTEL/Jaeger/Zipkin imports (T448)
 *   learning::async-only — policy updates never on live request path (T447)
 *   analysis::human-gated-apply — suggestions never auto-applied (T461)
 *   retrieval::query-integrity — CF-476 tenantId on every index query
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Shared stack coupling (FLOW-00.2) ─────────────────────────────────────

const RAG_OPTIMIZATION_STACK_COUPLING: TaskTypeStackCoupling = {
  entries: {
    'node-nestjs:server': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'web-framework',
      dimensions: [],
      neutralConcepts: [
        'NEVER import external SDK directly — use fabric interfaces',
        'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
        'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
        'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
        'DNA-8: storeDocument() BEFORE enqueue() — outbox pattern',
      ],
      implementationNotes:
        'Generate NestJS @Injectable() service extending MicroserviceBase. Inject fabric interfaces via constructor. Return DataProcessResult<T>.',
    },
  },
  supportedServerStacks: ['nestjs'],
};

// ── Shared quality gates ───────────────────────────────────────────────────

const RAG_OPTIMIZATION_QUALITY_GATES_CORE = [
  {
    gateId: 'QG-01',
    description: 'All services extend MicroserviceBase (DNA-4)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-02',
    description: 'No direct SDK imports — only fabric interfaces (Rule 1)',
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

const RAG_OPTIMIZATION_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5, CF-476)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
];

// ── ORCHESTRATION — Family-175 ─────────────────────────────────────────────

/**
 * T441 — AdaptiveRagRouter [ORCHESTRATION].
 *
 * PURPOSE: Entry point for FLOW-29. Routes a research query to one or more retrieval
 *          modes (vector, graph, hybrid) based on current bandit policy from T445.
 *          Emits routed-query event after storing routing decision.
 *
 * F1176: IRoutingPolicyReader → DATABASE FABRIC  (reads current bandit policy)
 * F1177: IRoutingDecisionStore → DATABASE FABRIC (stores routing decision before emit)
 * F1178: IRoutingEventEmitter → QUEUE FABRIC     (emits routed-query CloudEvent)
 *
 * IR-441-1: retrieve_token_estimate MUST be computed before routing (budget pre-check)
 * IR-441-2: storeDocument() BEFORE enqueue() (DNA-8)
 * IR-441-3: routing mode must be one of VECTOR | GRAPH | HYBRID | SELF_REFLECT
 */
export function createT441Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T441',
    flowId: 'FLOW-29',
    name: 'AdaptiveRagRouter',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered by research query ingestion event',
    purpose:
      'Route query to retrieval mode(s) based on bandit policy; compute token estimate before routing; store decision then emit routed-query event',
    distinctFrom: 'T445 (selects model/strategy — T441 routes query, T445 selects execution model)',
    familyId: 'Family-175',
    factoryDependencies: [
      {
        factoryId: 'F1176',
        interfaceName: 'IRoutingPolicyReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Reads current bandit routing policy document',
      },
      {
        factoryId: 'F1177',
        interfaceName: 'IRoutingDecisionStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only routing decision store',
      },
      {
        factoryId: 'F1178',
        interfaceName: 'IRoutingEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits routed-query CloudEvent AFTER storeDocument()',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T441', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['orchestration', 'dna_compliance', 'outbox_pattern', 'retrieval'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'orchestration', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'retrieval::query-integrity',
            'guard::threshold-freedom',
          ],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'retrieved_token_estimate computed before routing begins (IR-441-1)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'storeDocument() BEFORE enqueue() (IR-441-2, DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-07',
        description: 'routing mode is one of 4 valid values (IR-441-3)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['routing_decision', 'routing_policy'],
      events: ['rag.query.routed', 'rag.routing.failed'],
      apiRoutes: ['/api/rag/route'],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'retrieved_token_estimate MUST be computed before routing begins — budget pre-check (IR-441-1)',
      'storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern (IR-441-2)',
      'routing mode MUST be one of VECTOR | GRAPH | HYBRID | SELF_REFLECT (IR-441-3)',
    ],
    machineComponents: [
      'routing mode enum enforcement',
      'token estimate computation',
      'outbox ordering',
    ],
    freedomComponents: ['default routing mode', 'token estimate algorithm', 'routing event topic'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

// ── RETRIEVAL — Family-176 ─────────────────────────────────────────────────

/**
 * T442 — VectorRetrievalStep [RETRIEVAL].
 *
 * PURPOSE: Execute tenant-scoped vector similarity search against the RAG index.
 *          Returns Record<string,unknown>[] — no typed chunk models (DNA-1).
 *          Empty result is DataProcessResult.success([]) not failure.
 *
 * F1179: IVectorIndexReader → RAG FABRIC        (vector similarity search)
 * F1180: IRetrievalResultStore → DATABASE FABRIC (store retrieval result before emit)
 */
export function createT442Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T442',
    flowId: 'FLOW-29',
    name: 'VectorRetrievalStep',
    archetype: ContractArchetype.RETRIEVAL,
    entry: 'Triggered by routed-query event from T441 with mode=VECTOR or HYBRID',
    purpose:
      'Execute tenant-scoped vector similarity search; return Record<string,unknown>[]; empty result = success not failure',
    distinctFrom:
      'T443 (graph community query — T442 searches vectors, T443 queries graph communities)',
    familyId: 'Family-176',
    factoryDependencies: [
      {
        factoryId: 'F1179',
        interfaceName: 'IVectorIndexReader',
        fabricType: FabricType.RAG,
        providerHint: 'weaviate',
        description: 'Vector similarity search — all queries tenant-scoped (CF-476)',
      },
      {
        factoryId: 'F1180',
        interfaceName: 'IRetrievalResultStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Stores retrieval result for audit + downstream fusion',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T442', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['retrieval', 'dna_compliance', 'tenant_scope'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'retrieval', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'retrieval::query-integrity',
            'retrieval::result-fidelity',
          ],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'EVERY vector query includes tenantId filter (CF-476)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-06',
        description: 'results are Record<string,unknown>[] — no typed chunk models (DNA-1)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-07',
        description: 'empty result = DataProcessResult.success([]) not failure',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['vector_retrieval_result'],
      events: ['rag.vector.retrieved'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'EVERY vector query MUST include tenantId — no unscoped searches (CF-476)',
      'Results MUST be Record<string,unknown>[] — no typed chunk models (DNA-1)',
      'Empty retrieval result MUST be DataProcessResult.success([]) — NOT failure',
    ],
    machineComponents: [
      'tenant scope enforcement on vector queries',
      'empty-result success handling',
    ],
    freedomComponents: ['top-k limit', 'similarity threshold', 'vector index name'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T443 — GraphRAGCommunityQuery [RETRIEVAL].
 *
 * PURPOSE: Query knowledge graph for community-level summaries relevant to the query.
 *          Uses Neo4j/graph fabric provider. Returns community nodes as Record<string,unknown>[].
 *
 * F1181: IGraphCommunityReader → DATABASE FABRIC (Neo4j community query)
 */
export function createT443Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T443',
    flowId: 'FLOW-29',
    name: 'GraphRAGCommunityQuery',
    archetype: ContractArchetype.RETRIEVAL,
    entry: 'Triggered by routed-query event from T441 with mode=GRAPH or HYBRID',
    purpose:
      'Query graph knowledge base for community summaries relevant to query; tenant-scoped; empty = success',
    distinctFrom: 'T463 (multi-hop traversal — T443 queries communities, T463 traverses hops)',
    familyId: 'Family-176',
    factoryDependencies: [
      {
        factoryId: 'F1181',
        interfaceName: 'IGraphCommunityReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'neo4j',
        description: 'Graph community query — tenant-scoped via label filters',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T443', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['retrieval', 'graph_rag', 'tenant_scope'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'retrieval', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'retrieval::query-integrity',
            'retrieval::result-fidelity',
          ],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Graph queries tenant-scoped via label/property filter (CF-476)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-06',
        description: 'community nodes returned as Record<string,unknown>[] (DNA-1)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['graph_community_result'],
      events: ['rag.graph.queried'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Graph queries MUST be tenant-scoped — never cross-tenant community reads (CF-476)',
      'Results MUST be Record<string,unknown>[] — no typed graph node models',
    ],
    machineComponents: ['tenant label filter on all graph queries'],
    freedomComponents: ['community depth limit', 'max communities returned', 'graph index name'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T444 — HybridRetrievalFusion [RETRIEVAL].
 *
 * PURPOSE: Fuse vector (T442) and graph (T443) results into a single ranked list.
 *          Result shape MUST satisfy CF-606 (compatible with T458 RerankerStep input).
 *
 * F1182: IFusionResultStore → DATABASE FABRIC (stores fused result)
 */
export function createT444Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T444',
    flowId: 'FLOW-29',
    name: 'HybridRetrievalFusion',
    archetype: ContractArchetype.RETRIEVAL,
    entry: 'Triggered when T442 and/or T443 complete retrieval for HYBRID mode query',
    purpose:
      'Fuse vector + graph retrieval results into ranked list satisfying CF-606 shape; store fused result',
    distinctFrom: 'T458 (reranker — T444 fuses sources, T458 reranks fused result)',
    familyId: 'Family-176',
    factoryDependencies: [
      {
        factoryId: 'F1182',
        interfaceName: 'IFusionResultStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Stores fused retrieval result — CF-606 shape enforced',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T444', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['retrieval', 'fusion', 'dna_compliance'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'retrieval', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'retrieval::result-fidelity'] },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'fused result shape satisfies CF-606 (compatible with T458)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'fusion weights are FREEDOM config values — never hardcoded floats',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['fused_retrieval_result'],
      events: ['rag.retrieval.fused'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Fused result shape MUST satisfy CF-606 — compatible with T458 RerankerStep input',
      'Fusion weights MUST come from FREEDOM config — no hardcoded 0.7/0.3 split',
    ],
    machineComponents: ['CF-606 shape enforcement on output'],
    freedomComponents: ['vector_weight', 'graph_weight', 'fusion algorithm (rrf/weighted)'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T458 — RerankerStep [RETRIEVAL].
 *
 * PURPOSE: Rerank fused retrieval results by relevance score using AI provider.
 *          Reranker threshold is FREEDOM config value — never hardcoded float.
 *
 * F1195: IRerankerProvider → AI ENGINE FABRIC (AI reranking model)
 */
export function createT458Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T458',
    flowId: 'FLOW-29',
    name: 'RerankerStep',
    archetype: ContractArchetype.RETRIEVAL,
    entry: 'Triggered after HybridRetrievalFusion (T444) or VectorRetrievalStep (T442) completes',
    purpose:
      'Rerank retrieval results by AI relevance scoring; threshold from FREEDOM config; returns ranked Record<string,unknown>[]',
    distinctFrom: 'T444 (fusion — T444 combines sources, T458 reranks the combined result)',
    familyId: 'Family-176',
    factoryDependencies: [
      {
        factoryId: 'F1195',
        interfaceName: 'IRerankerProvider',
        fabricType: FabricType.AI_ENGINE,
        providerHint: 'cohere_rerank',
        description: 'AI reranking — threshold from FREEDOM config',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T458', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['retrieval', 'reranking', 'dna_compliance'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'retrieval', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'retrieval::result-fidelity', 'guard::threshold-freedom'],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'reranker threshold from FREEDOM config — not hardcoded (guard::threshold-freedom)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'results remain Record<string,unknown>[] after reranking (DNA-1)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['reranked_result'],
      events: ['rag.result.reranked'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Reranker threshold MUST come from FREEDOM config — never hardcoded float',
      'Results MUST remain Record<string,unknown>[] after reranking',
    ],
    machineComponents: ['FREEDOM config threshold read', 'result shape preservation'],
    freedomComponents: ['reranker_threshold', 'reranker_model_key', 'top_n_after_rerank'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T463 — MultiHopGraphTraversal [RETRIEVAL].
 *
 * PURPOSE: Multi-hop graph traversal with visited-set guard (prevents infinite loops).
 *          Tenant-scoped. Returns traversal path as Record<string,unknown>[].
 *
 * F1203: IGraphTraversalReader → DATABASE FABRIC (Neo4j multi-hop traversal)
 */
export function createT463Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T463',
    flowId: 'FLOW-29',
    name: 'MultiHopGraphTraversal',
    archetype: ContractArchetype.RETRIEVAL,
    entry: 'Triggered for queries requiring multi-hop reasoning across knowledge graph',
    purpose:
      'Traverse knowledge graph via multiple hops with visited-set cycle guard; tenant-scoped; returns path nodes',
    distinctFrom:
      'T443 (community query — T443 queries pre-computed communities, T463 traverses hops dynamically)',
    familyId: 'Family-176',
    factoryDependencies: [
      {
        factoryId: 'F1203',
        interfaceName: 'IGraphTraversalReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'neo4j',
        description: 'Multi-hop graph traversal — visited-set prevents cycle, tenant-scoped',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T463', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['retrieval', 'graph_traversal', 'tenant_scope'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'retrieval', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'retrieval::query-integrity',
            'analysis::graph-analytics-safe',
          ],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'visited-set prevents infinite traversal loops (analysis::graph-analytics-safe)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'traversal is tenant-scoped — no cross-tenant node reads (CF-476)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['graph_traversal_path'],
      events: ['rag.graph.traversed'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Traversal MUST use visited-set to prevent infinite loops',
      'Traversal MUST be tenant-scoped — no cross-tenant node reads (CF-476)',
    ],
    machineComponents: [
      'visited-set cycle guard',
      'tenant scope label filter',
      'max-hop depth enforcement',
    ],
    freedomComponents: ['max_hops', 'traversal_direction', 'relationship_types_to_follow'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

// ── ROUTING — Family-175 ───────────────────────────────────────────────────

/**
 * T445 — BanditModelSelector [ROUTING].
 *
 * PURPOSE: Multi-armed bandit model/strategy selection. Reads current bandit policy
 *          written by T447 and selects execution model for retrieval.
 *          Reward signal is numeric (not boolean) for gradient-based updates.
 *
 * F1183: IBanditPolicyReader → DATABASE FABRIC (reads bandit arm weights)
 */
export function createT445Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T445',
    flowId: 'FLOW-29',
    name: 'BanditModelSelector',
    archetype: ContractArchetype.ROUTING,
    entry: 'Triggered by AdaptiveRagRouter (T441) after routing mode determined',
    purpose:
      'Select execution model/strategy via bandit policy; reward signal is numeric for gradient updates',
    distinctFrom: 'T441 (routes query mode — T445 selects execution model within mode)',
    familyId: 'Family-175',
    factoryDependencies: [
      {
        factoryId: 'F1183',
        interfaceName: 'IBanditPolicyReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'redis',
        description: 'Reads current bandit arm weight document — TTL cached',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T445', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['routing', 'bandit', 'learning'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'routing', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'learning::feedback-linkage'] },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'reward signal is numeric 0.0–1.0 not boolean (learning::feedback-linkage)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['bandit_selection'],
      events: ['rag.model.selected'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Reward signal MUST be numeric (not boolean) — enables gradient-based bandit updates',
    ],
    machineComponents: ['bandit arm weight computation', 'numeric reward validation'],
    freedomComponents: [
      'exploration_rate',
      'bandit_algorithm (epsilon-greedy/ucb)',
      'policy_ttl_seconds',
    ],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

// ── GUARD — Family-177 ─────────────────────────────────────────────────────

/**
 * T446 — BudgetEnforcementGate [GUARD].
 *
 * PURPOSE: Hard-stop when token/cost budget for a request is exceeded.
 *          Budget cap from FREEDOM config — never hardcoded.
 *          Returns DataProcessResult.failure — not a soft warn.
 *
 * F1184: IBudgetLedgerReader → DATABASE FABRIC (reads current request budget usage)
 */
export function createT446Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T446',
    flowId: 'FLOW-29',
    name: 'BudgetEnforcementGate',
    archetype: ContractArchetype.GUARD,
    entry: 'Triggered before any AI-consuming retrieval step to pre-check budget',
    purpose:
      'Hard-stop on budget exceeded; budget_cap from FREEDOM config; test: at threshold passes, 1 unit above hard-stops',
    distinctFrom:
      'T457 (context efficiency — T446 guards token budget, T457 guards context allocation efficiency)',
    familyId: 'Family-177',
    factoryDependencies: [
      {
        factoryId: 'F1184',
        interfaceName: 'IBudgetLedgerReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'redis',
        description: 'Reads accumulated token/cost usage for current request',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T446', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['guard', 'budget', 'freedom_config'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'guard', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'guard::hard-stop', 'guard::threshold-freedom'],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'budget_cap from FREEDOM config — no hardcoded limit (guard::threshold-freedom)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'budget exceeded → DataProcessResult.failure not soft warn (guard::hard-stop)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['budget_check_result'],
      events: ['rag.budget.exceeded', 'rag.budget.approved'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'budget_cap MUST come from FREEDOM config — never hardcoded value',
      'Budget exceeded MUST return DataProcessResult.failure — NOT a soft warning',
      'Unit test MUST verify: at threshold = pass, 1 unit above = hard-stop',
    ],
    machineComponents: ['hard-stop failure on exceeded', 'at-threshold pass logic'],
    freedomComponents: ['budget_cap_tokens', 'budget_cap_cost_usd', 'budget_enforcement_mode'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T454 — EvalQualityGate [GUARD].
 *
 * PURPOSE: Hard-stop when hallucination rate or context coverage drops below threshold.
 *          Failure must include specific failing metric + measured value + threshold.
 *
 * F1191: IQualityMetricReader → DATABASE FABRIC (reads computed quality metrics)
 */
export function createT454Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T454',
    flowId: 'FLOW-29',
    name: 'EvalQualityGate',
    archetype: ContractArchetype.GUARD,
    entry: 'Triggered after retrieval to validate quality before generation',
    purpose:
      'Hard-stop on hallucination/coverage below threshold; failure includes specific metric + value + threshold; context_coverage_score is numeric 0.0–1.0',
    distinctFrom:
      'T453 (asset version compare — T454 gates live quality, T453 compares historical versions)',
    familyId: 'Family-177',
    factoryDependencies: [
      {
        factoryId: 'F1191',
        interfaceName: 'IQualityMetricReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Reads computed quality metrics for current retrieval result',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T454', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['guard', 'evaluation', 'quality_gate'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'guard', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'guard::hard-stop',
            'guard::threshold-freedom',
            'evaluation::evidence-required',
          ],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'failure message includes metric name + measured value + threshold (evaluation::evidence-required)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'context_coverage_score is numeric 0.0–1.0 not boolean',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['quality_gate_result'],
      events: ['rag.quality.passed', 'rag.quality.failed'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Quality failure MUST include: specific metric name + measured value + threshold',
      'context_coverage_score MUST be numeric 0.0–1.0 — NOT boolean pass/fail',
      'All thresholds from FREEDOM config — no hardcoded 0.7, 0.8, 80%',
    ],
    machineComponents: ['numeric coverage score computation', 'evidence-required failure message'],
    freedomComponents: [
      'hallucination_threshold',
      'coverage_threshold',
      'quality_eval_dataset_ref',
    ],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T457 — ContextEfficiencyCheck [GUARD].
 *
 * PURPOSE: Hard-stop when context token allocation is over the efficiency threshold.
 *          Prevents wasteful context windows before expensive generation steps.
 *
 * F1194: IContextUsageReader → DATABASE FABRIC (reads context token allocation)
 */
export function createT457Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T457',
    flowId: 'FLOW-29',
    name: 'ContextEfficiencyCheck',
    archetype: ContractArchetype.GUARD,
    entry: 'Triggered before generation step to validate context token allocation',
    purpose:
      'Hard-stop when context token allocation exceeds efficiency threshold; threshold from FREEDOM config',
    distinctFrom:
      'T446 (budget gate — T457 checks context efficiency, T446 checks cost/token budget)',
    familyId: 'Family-177',
    factoryDependencies: [
      {
        factoryId: 'F1194',
        interfaceName: 'IContextUsageReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'redis',
        description: 'Reads current context token allocation for request',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T457', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['guard', 'context_efficiency', 'freedom_config'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'guard', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'guard::hard-stop', 'guard::threshold-freedom'],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'context efficiency threshold from FREEDOM config (guard::threshold-freedom)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['context_efficiency_result'],
      events: ['rag.context.efficient', 'rag.context.overallocated'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Context efficiency threshold MUST come from FREEDOM config — never hardcoded',
      'Overallocation MUST return DataProcessResult.failure — NOT a warning',
    ],
    machineComponents: ['hard-stop on overallocation', 'FREEDOM threshold read'],
    freedomComponents: [
      'max_context_token_ratio',
      'context_efficiency_threshold',
      'enforcement_mode',
    ],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T459 — SelfReflectionGuard [GUARD].
 *
 * PURPOSE: Determines whether retrieval is even needed for the query.
 *          "No retrieval needed" path returns DataProcessResult.success(null) not failure.
 *
 * F1196: ISelfReflectionProvider → AI ENGINE FABRIC (AI self-reflection judgment)
 */
export function createT459Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T459',
    flowId: 'FLOW-29',
    name: 'SelfReflectionGuard',
    archetype: ContractArchetype.GUARD,
    entry: 'Triggered before retrieval to assess whether retrieval is necessary',
    purpose:
      'AI judgment: retrieval needed or can answer from context alone; "no retrieval" = DataProcessResult.success(null) not failure',
    distinctFrom:
      'T446/T457 (enforcement gates — T459 decides IF to retrieve, others gate cost/quality)',
    familyId: 'Family-177',
    factoryDependencies: [
      {
        factoryId: 'F1196',
        interfaceName: 'ISelfReflectionProvider',
        fabricType: FabricType.AI_ENGINE,
        providerHint: 'claude-haiku-4-5',
        description: 'Lightweight AI judge — retrieval needed or not',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T459', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['guard', 'self_reflection', 'dna_compliance'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'guard', max_tokens: 3000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'guard::hard-stop'] },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          '"no retrieval needed" path = DataProcessResult.success(null) not failure (guard::hard-stop)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['self_reflection_result'],
      events: ['rag.retrieval.skipped', 'rag.retrieval.required'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      '"No retrieval needed" path MUST return DataProcessResult.success(null) — NOT a failure',
    ],
    machineComponents: ['success(null) for skip-retrieval path'],
    freedomComponents: ['reflection_model_key', 'reflection_confidence_threshold'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

// ── LEARNING — Family-178 ──────────────────────────────────────────────────

/**
 * T447 — RoutingPolicyUpdater [LEARNING].
 *
 * PURPOSE: Async bandit policy update from aggregated feedback signal.
 *          MUST NEVER update policy synchronously on live request path (score-0 rule).
 *
 * F1185: IBanditPolicyWriter → DATABASE FABRIC (writes updated arm weights)
 */
export function createT447Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T447',
    flowId: 'FLOW-29',
    name: 'RoutingPolicyUpdater',
    archetype: ContractArchetype.LEARNING,
    entry:
      'Triggered by QUEUE event from FeedbackAggregationWindow (T460) — NEVER called synchronously',
    purpose:
      'Update bandit routing policy from aggregated feedback; async-only — never on live request path',
    distinctFrom: 'T445 (reads policy — T447 writes/updates policy, T445 reads it)',
    familyId: 'Family-178',
    factoryDependencies: [
      {
        factoryId: 'F1185',
        interfaceName: 'IBanditPolicyWriter',
        fabricType: FabricType.DATABASE,
        providerHint: 'redis',
        description: 'Writes updated bandit arm weights — tenant-scoped policy document',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T447', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['learning', 'async_policy', 'bandit'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'learning', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'learning::async-only', 'learning::feedback-linkage'],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'policy update NEVER on live request path — queue-triggered only (learning::async-only SCORE-0)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'unit test: feedback submission returns immediately; update via queue',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: { entities: ['bandit_policy'], events: ['rag.policy.updated'], apiRoutes: [] },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Policy updates MUST NEVER happen synchronously on live request path — SCORE-0 violation (learning::async-only)',
      'Policy updates triggered exclusively via QUEUE FABRIC — never direct method calls',
    ],
    machineComponents: ['queue-triggered-only enforcement', 'async update pattern'],
    freedomComponents: ['policy_update_algorithm', 'learning_rate', 'policy_index_name'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T449 — UserFeedbackIngest [LEARNING].
 *
 * PURPOSE: Ingest user feedback linked to exact 6-tuple run context:
 *          (run_id, config, trace_id, model, prompt_version, retrieval_mode).
 *          Feedback without complete linkage is stored but flagged incomplete.
 *
 * F1186: IFeedbackStore → DATABASE FABRIC (insert-only feedback document)
 * F1187: IFeedbackEventEmitter → QUEUE FABRIC (emit feedback.ingested event)
 */
export function createT449Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T449',
    flowId: 'FLOW-29',
    name: 'UserFeedbackIngest',
    archetype: ContractArchetype.LEARNING,
    entry: 'Triggered by user feedback submission event',
    purpose:
      'Ingest feedback linked to 6-tuple run context; incomplete linkage = stored + flagged (not rejected); DNA-8 outbox',
    distinctFrom:
      'T460 (aggregation window — T449 ingests single feedback, T460 aggregates over time window)',
    familyId: 'Family-178',
    factoryDependencies: [
      {
        factoryId: 'F1186',
        interfaceName: 'IFeedbackStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only feedback store — linked to 6-tuple run context',
      },
      {
        factoryId: 'F1187',
        interfaceName: 'IFeedbackEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits feedback.ingested after successful storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T449', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['learning', 'feedback_linkage', 'outbox_pattern'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'learning', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'learning::feedback-linkage', 'learning::async-only'],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'feedback linked to exact 6-tuple (run_id, config, trace_id, model, prompt_version, retrieval_mode) (learning::feedback-linkage)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'incomplete linkage = stored + flagged incomplete, NOT rejected',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-07',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['user_feedback'],
      events: ['rag.feedback.ingested'],
      apiRoutes: ['/api/rag/feedback'],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Feedback MUST be linked to exact 6-tuple: (run_id, config, trace_id, model, prompt_version, retrieval_mode)',
      'Incomplete linkage MUST be stored with incomplete_linkage=true flag — NOT rejected',
      'storeDocument() MUST be called BEFORE enqueue() (DNA-8)',
    ],
    machineComponents: [
      '6-tuple linkage validation',
      'incomplete flag on partial linkage',
      'outbox ordering',
    ],
    freedomComponents: [
      'feedback_index_name',
      'feedback_event_topic',
      'linkage_completeness_fields',
    ],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T460 — FeedbackAggregationWindow [LEARNING].
 *
 * PURPOSE: Time-window aggregation of feedback signals.
 *          Window close triggers QUEUE event to T447 — never direct method call.
 *
 * F1200: IFeedbackWindowReader → DATABASE FABRIC (reads feedback within time window)
 * F1201: IWindowCloseEmitter → QUEUE FABRIC (emit window.closed to trigger T447)
 */
export function createT460Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T460',
    flowId: 'FLOW-29',
    name: 'FeedbackAggregationWindow',
    archetype: ContractArchetype.LEARNING,
    entry: 'Triggered by scheduled timer or explicit window-close event',
    purpose:
      'Aggregate feedback over time window; window close emits QUEUE event to T447 — never direct call',
    distinctFrom:
      'T449 (single ingest — T460 aggregates batches, T449 processes individual events)',
    familyId: 'Family-178',
    factoryDependencies: [
      {
        factoryId: 'F1200',
        interfaceName: 'IFeedbackWindowReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Reads feedback documents within time window — tenant-scoped',
      },
      {
        factoryId: 'F1201',
        interfaceName: 'IWindowCloseEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits window.closed event to trigger T447 policy update async',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T460', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['learning', 'aggregation', 'async_policy'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'learning', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'learning::async-only', 'learning::feedback-linkage'],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'window close triggers QUEUE event to T447 — NOT a direct method call (learning::async-only)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['feedback_window_aggregate'],
      events: ['rag.feedback.window.closed'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Window close MUST emit QUEUE event to T447 — never call T447 directly (learning::async-only)',
    ],
    machineComponents: ['queue event trigger on window close', 'tenant-scoped window query'],
    freedomComponents: ['window_size_seconds', 'min_feedback_count', 'aggregation_strategy'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

// ── OBSERVABILITY — Family-179 ─────────────────────────────────────────────

/**
 * T448 — TraceSpanCapture [OBSERVABILITY].
 *
 * PURPOSE: Emit trace spans for every service in the flow via QUEUE FABRIC ONLY.
 *          SCORE-0 RULE: zero direct imports of opentelemetry, jaeger, zipkin, or any OTEL SDK.
 *          Spans emitted even on DataProcessResult.failure paths.
 *
 * F1188: ISpanEventEmitter → QUEUE FABRIC (emits span via queue — no OTEL SDK)
 */
export function createT448Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T448',
    flowId: 'FLOW-29',
    name: 'TraceSpanCapture',
    archetype: ContractArchetype.OBSERVABILITY,
    entry: 'Cross-cutting — called by all flow services to emit trace spans',
    purpose:
      'Emit trace spans via QUEUE FABRIC only; includes start_ms, end_ms, token counts; emitted on failure paths too',
    distinctFrom:
      'T449 (feedback ingest — T448 emits operational spans, T449 ingests user feedback)',
    familyId: 'Family-179',
    factoryDependencies: [
      {
        factoryId: 'F1188',
        interfaceName: 'ISpanEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits span CloudEvent via QUEUE FABRIC — zero OTEL SDK (SCORE-0)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T448', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['observability', 'no_sdk', 'dna_compliance'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'observability', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          criticalRules: ['observability-no-direct-sdk'],
          arbiters: [
            'dna',
            'fabric',
            'observability::span-completeness',
            'observability::no-sdk-import',
          ],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'ZERO direct OTEL/Jaeger/Zipkin imports — SCORE-0 violation (observability::no-sdk-import)',
        severity: 'error' as const,
        checkType: 'fabric_usage',
      },
      {
        gateId: 'QG-06',
        description:
          'every span includes: trace_id, span_id, parent_span_id, start_ms, end_ms, service_name (observability::span-completeness)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-07',
        description: 'span emitted even on DataProcessResult.failure path',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['trace_span'],
      events: ['rag.trace.span.emitted'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'ZERO direct imports of opentelemetry, jaeger, zipkin — SCORE-0 rule (observability::no-sdk-import)',
      'ALL telemetry via IQueueService → QUEUE FABRIC only',
      'Spans MUST be emitted even on DataProcessResult.failure paths',
      'Every span MUST include: trace_id, span_id, parent_span_id, start_ms, end_ms, service_name',
    ],
    machineComponents: ['span schema enforcement', 'failure-path emission', 'zero-SDK enforcement'],
    freedomComponents: ['trace_topic_name', 'token_count_fields_to_include'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

// ── GOVERNANCE — Family-183 ────────────────────────────────────────────────

/**
 * T450 — PromptVersionPromoter [GOVERNANCE].
 *
 * PURPOSE: Immutable prompt version promotion ladder: DRAFT→CANDIDATE→TESTED→ACTIVE→ARCHIVED.
 *          Promote = create new version, NEVER edit in place.
 *
 * F1189: IPromptVersionStore → DATABASE FABRIC (insert-only version document)
 * F1190: IPromotionEventEmitter → QUEUE FABRIC (emits promotion event)
 */
export function createT450Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T450',
    flowId: 'FLOW-29',
    name: 'PromptVersionPromoter',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered by promotion request (manual or automated quality gate pass)',
    purpose:
      'Promote prompt version through DRAFT→CANDIDATE→TESTED→ACTIVE→ARCHIVED ladder; promote=new version, never edit in place',
    distinctFrom:
      'T455 (promotion pipeline gate — T450 performs promotion, T455 guards with BFA approval)',
    familyId: 'Family-183',
    factoryDependencies: [
      {
        factoryId: 'F1189',
        interfaceName: 'IPromptVersionStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only version store — every promotion creates new document',
      },
      {
        factoryId: 'F1190',
        interfaceName: 'IPromotionEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits promotion event after successful storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T450', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['governance', 'immutable_versioning', 'promotion_ladder'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'evaluation::non-blocking-compare'],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'promote = new version document, never in-place edit',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'promotion ladder enforces DRAFT→CANDIDATE→TESTED→ACTIVE→ARCHIVED order',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['prompt_version'],
      events: ['rag.prompt.promoted', 'rag.prompt.archived'],
      apiRoutes: ['/api/rag/prompt/promote'],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Promotion MUST create a new version document — NEVER edit existing in place',
      'Promotion ladder MUST follow DRAFT→CANDIDATE→TESTED→ACTIVE→ARCHIVED order',
    ],
    machineComponents: ['ladder state validation', 'insert-only write enforcement'],
    freedomComponents: ['auto_archive_after_n_versions', 'promotion_event_topic'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T452 — KnowledgeGraphEditGate [GOVERNANCE].
 *
 * PURPOSE: FLOW-25 BFA gate — validates arbitration approval before any structural
 *          knowledge graph edit. Uses MultiTenantIsolationGate from FLOW-25.
 *
 * F1192: IBFAGateClient → QUEUE FABRIC (calls FLOW-25 BFA gate via queue)
 */
export function createT452Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T452',
    flowId: 'FLOW-29',
    name: 'KnowledgeGraphEditGate',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered before any structural knowledge graph modification',
    purpose:
      'FLOW-25 BFA gate: validate arbitration approval before structural graph edit; reject if tenant unconfigured',
    distinctFrom: 'T455 (promotion gate — T452 gates graph edits, T455 gates RAG asset promotions)',
    familyId: 'Family-183',
    factoryDependencies: [
      {
        factoryId: 'F1192',
        interfaceName: 'IBFAGateClient',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'FLOW-25 BFA gate integration — emits gate check event, waits for approval',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T452', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['governance', 'bfa_gate', 'flow25_integration'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'guard::hard-stop'] },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'FLOW-25 BFA gate called before any structural graph edit',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'unconfigured tenant → TENANT_NOT_CONFIGURED failure',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['graph_edit_gate_result'],
      events: ['rag.graph.edit.approved', 'rag.graph.edit.rejected'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'FLOW-25 BFA gate MUST be called before ANY structural graph modification',
      'Unconfigured tenant MUST return TENANT_NOT_CONFIGURED failure',
    ],
    machineComponents: ['FLOW-25 BFA gate integration', 'tenant config pre-check'],
    freedomComponents: ['bfa_gate_timeout_ms', 'graph_edit_event_topic'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T455 — PromotionPipelineGate [GOVERNANCE].
 *
 * PURPOSE: FLOW-25 BFA gate — validates arbitration approval before promoting
 *          RAG asset to ACTIVE status. Uses MultiTenantIsolationGate from FLOW-25.
 *
 * F1193: IBFAPromotionGateClient → QUEUE FABRIC (FLOW-25 BFA gate for promotion)
 */
export function createT455Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T455',
    flowId: 'FLOW-29',
    name: 'PromotionPipelineGate',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered when a RAG asset is nominated for ACTIVE promotion',
    purpose:
      'FLOW-25 BFA gate: validate arbitration approval before ACTIVE promotion; blocks without approval',
    distinctFrom:
      'T452 (graph edit gate — T455 gates promotion to ACTIVE, T452 gates structural edits)',
    familyId: 'Family-183',
    factoryDependencies: [
      {
        factoryId: 'F1193',
        interfaceName: 'IBFAPromotionGateClient',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'FLOW-25 BFA gate for RAG asset promotion approval',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T455', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['governance', 'bfa_gate', 'promotion_ladder'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'guard::hard-stop'] },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'FLOW-25 BFA gate called before ACTIVE promotion',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['promotion_gate_result'],
      events: ['rag.promotion.approved', 'rag.promotion.rejected'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'FLOW-25 BFA gate MUST be called before any ACTIVE promotion',
    ],
    machineComponents: ['FLOW-25 BFA gate integration'],
    freedomComponents: ['bfa_gate_timeout_ms', 'promotion_gate_event_topic'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T462 — ControlPlaneGraphEdit [GOVERNANCE].
 *
 * PURPOSE: Versioned structural graph edit with BFA approval required.
 *          Every edit creates a new version — never mutates in place.
 *
 * F1208: IGraphEditStore → DATABASE FABRIC (versioned graph edit store)
 * F1209: IGraphEditEventEmitter → QUEUE FABRIC (emits edit event after store)
 */
export function createT462Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T462',
    flowId: 'FLOW-29',
    name: 'ControlPlaneGraphEdit',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered after T452 approves structural graph modification',
    purpose:
      'Execute versioned graph edit; every edit = new version document; requires prior T452 approval',
    distinctFrom: 'T452 (gate — T462 performs approved edit, T452 validates approval)',
    familyId: 'Family-183',
    factoryDependencies: [
      {
        factoryId: 'F1208',
        interfaceName: 'IGraphEditStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'neo4j',
        description: 'Insert-only versioned graph edit store',
      },
      {
        factoryId: 'F1209',
        interfaceName: 'IGraphEditEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits graph.edit.applied event after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T462', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['governance', 'versioned_edit', 'bfa_gate'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'build::idempotent-trigger'] },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'every edit creates new version document — never in-place mutation',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['graph_edit_version'],
      events: ['rag.graph.edit.applied'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Every graph edit MUST create a new version document — never mutate in place',
      'storeDocument() MUST be called BEFORE enqueue() (DNA-8)',
    ],
    machineComponents: ['insert-only version enforcement', 'outbox ordering'],
    freedomComponents: ['graph_edit_index_name', 'graph_edit_event_topic'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T466 — RAGStrategyRollback [GOVERNANCE].
 *
 * PURPOSE: Rollback to a previous RAG strategy version via pointer swap.
 *          NEVER deletes versions — previous version preserved.
 *
 * F1214: IStrategyPointerStore → DATABASE FABRIC (updates active pointer)
 */
export function createT466Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T466',
    flowId: 'FLOW-29',
    name: 'RAGStrategyRollback',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered by rollback request with target version ID',
    purpose:
      'Rollback RAG strategy to previous version via pointer swap; previous version preserved — no deletion',
    distinctFrom: 'T450 (promotion — T466 rolls back, T450 promotes forward)',
    familyId: 'Family-183',
    factoryDependencies: [
      {
        factoryId: 'F1214',
        interfaceName: 'IStrategyPointerStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Updates active_version pointer — previous version preserved',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T466', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['governance', 'rollback', 'immutable_versioning'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric'] },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'rollback = pointer swap — no version deletion',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['strategy_pointer'],
      events: ['rag.strategy.rolled_back'],
      apiRoutes: ['/api/rag/strategy/rollback'],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Rollback MUST be a pointer swap — NEVER delete previous versions',
    ],
    machineComponents: ['pointer swap atomic operation', 'no-deletion enforcement'],
    freedomComponents: ['rollback_confirmation_required', 'rollback_event_topic'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

// ── BUILD — Family-180 ─────────────────────────────────────────────────────

/**
 * T451 — DomainProfileCompiler [BUILD].
 *
 * PURPOSE: Async compile domain knowledge profile from source documents.
 *          Non-blocking — emits to QUEUE, never blocks caller.
 *
 * F1197: IDomainProfileStore → DATABASE FABRIC (stores compiled profile)
 * F1198: IBuildEventEmitter → QUEUE FABRIC (emits build started/completed events)
 */
export function createT451Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T451',
    flowId: 'FLOW-29',
    name: 'DomainProfileCompiler',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered by source document ingestion or manual recompile request',
    purpose:
      'Async compile domain knowledge profile; non-blocking — returns immediately, emits queue event for build progress',
    distinctFrom:
      'T464 (community summary — T451 compiles full domain profile, T464 generates community-level summaries)',
    familyId: 'Family-180',
    factoryDependencies: [
      {
        factoryId: 'F1197',
        interfaceName: 'IDomainProfileStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Stores compiled domain profile — QUEUED→RUNNING→COMPLETE→FAILED status',
      },
      {
        factoryId: 'F1198',
        interfaceName: 'IBuildEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits build lifecycle events — non-blocking',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T451', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['build', 'async_nonblocking', 'idempotent_trigger'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'build::async-non-blocking', 'build::idempotent-trigger'],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'build is non-blocking — caller returns immediately (build::async-non-blocking)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description:
          'duplicate triggers deduplicated via setIfAbsent job_id (build::idempotent-trigger) — IScopedMemoryService.setIfAbsent()',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-07',
        description: 'build status uses QUEUED→RUNNING→COMPLETE→FAILED phases',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['domain_profile', 'build_job'],
      events: ['rag.build.started', 'rag.build.completed', 'rag.build.failed'],
      apiRoutes: ['/api/rag/domain/compile'],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Build operations MUST be non-blocking — emit to QUEUE, return immediately',
      'Duplicate build triggers MUST be deduplicated via atomic set-if-not-exists — return existing job_id (IScopedMemoryService.setIfAbsent() in Node.js; INSERT IGNORE in MySQL)',
      'Build status MUST use QUEUED→RUNNING→COMPLETE→FAILED lifecycle',
    ],
    machineComponents: [
      'async queue trigger',
      'setIfAbsent idempotent trigger (IScopedMemoryService)',
      'status lifecycle enforcement',
    ],
    freedomComponents: ['compile_batch_size', 'build_timeout_seconds', 'build_event_topic'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T464 — CommunitySummaryGenerator [BUILD].
 *
 * PURPOSE: Async generation of community-level summaries for GraphRAG.
 *          Non-blocking. Partial failure (some communities fail) → continues,
 *          marks failed communities, returns partial success.
 *
 * F1210: ICommunitySummaryStore → DATABASE FABRIC (stores community summaries)
 * F1211: IAiSummaryProvider → AI ENGINE FABRIC (generates summaries)
 */
export function createT464Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T464',
    flowId: 'FLOW-29',
    name: 'CommunitySummaryGenerator',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered after graph rebuild or community detection completes',
    purpose:
      'Async generate community summaries; partial failure → continues, marks failed, returns partial success',
    distinctFrom:
      'T451 (domain profile — T464 generates community summaries, T451 compiles full domain profile)',
    familyId: 'Family-180',
    factoryDependencies: [
      {
        factoryId: 'F1210',
        interfaceName: 'ICommunitySummaryStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Stores community summaries — partial success supported',
      },
      {
        factoryId: 'F1211',
        interfaceName: 'IAiSummaryProvider',
        fabricType: FabricType.AI_ENGINE,
        providerHint: MODEL_HINT_FROM_FREEDOM,
        description: 'AI summary generation per community node',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T464', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['build', 'partial_failure', 'graph_rag'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'build::async-non-blocking', 'build::idempotent-trigger'],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'partial failure continues — failed communities marked, partial success returned (build::async-non-blocking)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['community_summary'],
      events: ['rag.community.summarized', 'rag.community.summary_failed'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Partial community failure MUST continue processing — mark failed, return partial success',
      'Build is non-blocking — async queue pattern',
    ],
    machineComponents: ['partial-failure continuation', 'async queue trigger'],
    freedomComponents: [
      'max_concurrent_communities',
      'summary_prompt_template_ref',
      'summary_ttl_days',
    ],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

/**
 * T465 — DomainGraphIndexRebuild [BUILD].
 *
 * PURPOSE: Async full graph index rebuild. Live queries MUST use previous index
 *          until rebuild completes (IR enforced). Idempotent trigger via IScopedMemoryService.setIfAbsent().
 *
 * F1212: IIndexRebuildStore → DATABASE FABRIC (tracks rebuild job status)
 * F1213: IIndexRebuildEmitter → QUEUE FABRIC (triggers async rebuild)
 */
export function createT465Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T465',
    flowId: 'FLOW-29',
    name: 'DomainGraphIndexRebuild',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered by schema change, community recompute, or manual rebuild request',
    purpose:
      'Async graph index rebuild; live queries use previous index during rebuild; setIfAbsent idempotent trigger (IScopedMemoryService.setIfAbsent()); unit test: trigger × 3 → one build',
    distinctFrom:
      'T451 (domain profile — T465 rebuilds graph index, T451 compiles domain profile documents)',
    familyId: 'Family-180',
    factoryDependencies: [
      {
        factoryId: 'F1212',
        interfaceName: 'IIndexRebuildStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Tracks rebuild job — QUEUED→RUNNING→COMPLETE→FAILED status',
      },
      {
        factoryId: 'F1213',
        interfaceName: 'IIndexRebuildEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Triggers async rebuild — setIfAbsent idempotent (IScopedMemoryService)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T465', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['build', 'async_nonblocking', 'idempotent_trigger', 'graph_index'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'build::async-non-blocking', 'build::idempotent-trigger'],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'live queries use previous index during rebuild (build::async-non-blocking)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description:
          'trigger × 3 for same domain → one build, two idempotent responses (build::idempotent-trigger)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['index_rebuild_job'],
      events: ['rag.index.rebuild.started', 'rag.index.rebuild.completed'],
      apiRoutes: ['/api/rag/index/rebuild'],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Live queries MUST use previous index until rebuild completes',
      'Duplicate rebuild triggers MUST return existing job_id — not start a new build. Mechanism: IScopedMemoryService.setIfAbsent() — atomic, no separate check + write',
    ],
    machineComponents: [
      'setIfAbsent idempotent trigger (IScopedMemoryService)',
      'previous-index fallback enforcement',
    ],
    freedomComponents: ['rebuild_index_name', 'rebuild_timeout_seconds', 'rebuild_event_topic'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

// ── EVALUATION — Family-181 ────────────────────────────────────────────────

/**
 * T453 — RAGAssetVersionCompare [EVALUATION].
 *
 * PURPOSE: Compare RAG asset versions on eval dataset — never live traffic.
 *          Returns Record<string,unknown> with winner, scores[], confidence.
 *          Regression detected → DataProcessResult.failure with specific metrics.
 *
 * F1202: IEvalDatasetReader → DATABASE FABRIC (reads eval dataset reference)
 */
export function createT453Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T453',
    flowId: 'FLOW-29',
    name: 'RAGAssetVersionCompare',
    archetype: ContractArchetype.EVALUATION,
    entry: 'Triggered before promotion to ACTIVE to compare candidate vs current version',
    purpose:
      'Compare RAG asset versions on eval dataset; result: {winner, scores[], confidence}; regression = failure with specific metrics',
    distinctFrom:
      'T454 (quality gate — T453 compares historical versions, T454 gates live quality)',
    familyId: 'Family-181',
    factoryDependencies: [
      {
        factoryId: 'F1202',
        interfaceName: 'IEvalDatasetReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Reads eval dataset reference — size/path from FREEDOM config',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T453', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['evaluation', 'version_compare', 'evidence_required'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'evaluation', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'evaluation::non-blocking-compare',
            'evaluation::evidence-required',
          ],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'comparison against eval dataset — never live traffic (evaluation::non-blocking-compare)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description:
          'result includes: winner, scores[], confidence (evaluation::non-blocking-compare)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-07',
        description:
          'eval dataset is FREEDOM config reference — not hardcoded path (guard::threshold-freedom)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['version_comparison_result'],
      events: ['rag.version.comparison.complete', 'rag.version.regression.detected'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Comparison MUST run against eval dataset — NEVER live production traffic',
      'Result MUST include: winner, scores[], confidence',
      'Eval dataset reference MUST come from FREEDOM config — not hardcoded',
    ],
    machineComponents: ['eval-dataset-only enforcement', 'result shape enforcement'],
    freedomComponents: ['eval_dataset_ref', 'eval_dataset_size', 'comparison_metrics'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

// ── EXPERIMENTATION — Family-181 ───────────────────────────────────────────

/**
 * T456 — ABTestAllocator [EXPERIMENTATION].
 *
 * PURPOSE: Deterministic hash-based A/B variant allocation.
 *          Same (tenant_id, user_id, experiment_id) → same variant ALWAYS.
 *          Variant assignment stored in DATABASE FABRIC — not recomputed per request.
 *          Unit test: same tenant+user → same variant across 100 calls.
 *
 * F1205: IExperimentVariantStore → DATABASE FABRIC (stores variant assignment)
 * F1206: IExperimentResultCollector → QUEUE FABRIC (collects result events)
 */
export function createT456Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T456',
    flowId: 'FLOW-29',
    name: 'ABTestAllocator',
    archetype: ContractArchetype.EXPERIMENTATION,
    entry: 'Triggered when a request enters an active A/B experiment',
    purpose:
      'Deterministic hash-based variant allocation; same input = same variant; assignment stored in DB; results via QUEUE',
    distinctFrom:
      'T453 (version compare — T456 runs live A/B experiments, T453 compares on eval dataset)',
    familyId: 'Family-181',
    factoryDependencies: [
      {
        factoryId: 'F1205',
        interfaceName: 'IExperimentVariantStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'redis',
        description: 'Stores variant assignment — keyed by (tenant_id, user_id, experiment_id)',
      },
      {
        factoryId: 'F1206',
        interfaceName: 'IExperimentResultCollector',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Collects A/B result events — tenant-scoped',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T456', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['experimentation', 'deterministic_allocation', 'tenant_scope'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'experimentation', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'experimentation::deterministic-allocation',
            'experimentation::clean-result-collection',
          ],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'allocation deterministic — same (tenant_id, user_id, experiment_id) = same variant (experimentation::deterministic-allocation)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'unit test: same tenant+user → same variant across 100 calls',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-07',
        description:
          'results never mixed across tenants (experimentation::clean-result-collection)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['experiment_variant_assignment', 'experiment_result'],
      events: ['rag.experiment.variant.assigned', 'rag.experiment.result.collected'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Allocation MUST be deterministic — same input ALWAYS produces same variant',
      'Allocation MUST use hash function — NOT random for each request',
      'Variant assignment MUST be stored in DB — NOT recomputed on each request',
      'Experiment results MUST NEVER be mixed across tenants',
    ],
    machineComponents: [
      'deterministic hash function',
      'DB-stored assignment',
      'tenant-scoped result collection',
    ],
    freedomComponents: [
      'hash_function (murmur3/md5)',
      'experiment_config_index',
      'result_collection_topic',
    ],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

// ── ANALYSIS — Family-182 ──────────────────────────────────────────────────

/**
 * T461 — ImprovementSuggestionEngine [ANALYSIS].
 *
 * PURPOSE: AI-driven improvement suggestions emitted via QUEUE — NEVER auto-applied.
 *          SCORE-0 RULE: suggestions without evidence[] are not emitted.
 *          Suggestions include: suggestion_text, affected_component, confidence, evidence[].
 *
 * F1207: ISuggestionEmitter → QUEUE FABRIC (human-gated suggestion events)
 */
export function createT461Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T461',
    flowId: 'FLOW-29',
    name: 'ImprovementSuggestionEngine',
    archetype: ContractArchetype.ANALYSIS,
    entry: 'Triggered by quality metrics, failure clusters, or manual analysis request',
    purpose:
      'AI improvement suggestions queued for human review; never auto-applied; suggestions without evidence filtered at source',
    distinctFrom:
      'T462 (executes approved changes — T461 suggests, T462 applies after human approval)',
    familyId: 'Family-182',
    factoryDependencies: [
      {
        factoryId: 'F1207',
        interfaceName: 'ISuggestionEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits suggestion to human-review queue — never auto-applies',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T461', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['analysis', 'human_gated', 'graph_analytics'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'analysis', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'analysis::human-gated-apply',
            'analysis::graph-analytics-safe',
          ],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'suggestions NEVER auto-applied — emitted to QUEUE for human review (analysis::human-gated-apply SCORE-0)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description:
          'suggestions without evidence[] filtered at source (analysis::human-gated-apply)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-07',
        description:
          'payload includes: suggestion_text, affected_component, confidence, evidence[]',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['improvement_suggestion'],
      events: ['rag.suggestion.queued'],
      apiRoutes: [],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'Suggestions MUST NEVER be auto-applied — SCORE-0 violation (analysis::human-gated-apply)',
      'Suggestions without evidence[] MUST be filtered before emit',
      'Suggestion payload MUST include: suggestion_text, affected_component, confidence, evidence[]',
    ],
    machineComponents: ['evidence filter before emit', 'human-gated queue routing'],
    freedomComponents: [
      'suggestion_queue_topic',
      'min_confidence_threshold',
      'max_suggestions_per_analysis',
    ],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

// ── UI — Family-184 ────────────────────────────────────────────────────────

/**
 * T467 — ControlPlaneNodeRenderer [UI].
 *
 * PURPOSE: Fabric-first UI rendering of control plane nodes.
 *          ZERO hardcoded node types, model names, strategy names, x/y positions, colors.
 *          ALL values from FREEDOM config or DATABASE FABRIC.
 *          React component uses Record<string,unknown> for all data shapes (DNA-1 applies to UI).
 *          Render with empty FREEDOM config → graceful empty state (no crash).
 *
 * F1215: INodeConfigReader → DATABASE FABRIC (reads node layout/config from DB)
 * F1216: IFreedomConfigReader → DATABASE FABRIC (reads FREEDOM config for node types)
 */
export function createT467Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T467',
    flowId: 'FLOW-29',
    name: 'ControlPlaneNodeRenderer',
    archetype: ContractArchetype.UI,
    entry: 'Rendered by control plane UI when graph view is opened',
    purpose:
      'Fabric-first node rendering; zero hardcoded values; all from FREEDOM config or DATABASE; empty config → graceful empty state',
    distinctFrom: 'T462 (graph edit — T467 renders the UI, T462 applies structural changes)',
    familyId: 'Family-184',
    factoryDependencies: [
      {
        factoryId: 'F1215',
        interfaceName: 'INodeConfigReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Reads node position/label/icon config from DB — never hardcoded',
      },
      {
        factoryId: 'F1216',
        interfaceName: 'IFreedomConfigReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Reads FREEDOM config for node type definitions',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow29', taskType: 'T467', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['ui', 'fabric_first', 'freedom_config', 'dna_compliance'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'ui', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'ui::fabric-first-render', 'ui::zero-platform-values'],
        },
      },
    ],
    qualityGates: [
      ...RAG_OPTIMIZATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'zero hardcoded node types, model names, colors, x/y positions (ui::zero-platform-values)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'React component uses Record<string,unknown> for data (DNA-1)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-07',
        description:
          'render with empty FREEDOM config → graceful empty state (ui::zero-platform-values)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['node_render_config'],
      events: [],
      apiRoutes: ['/api/control-plane/nodes'],
    },
    ironRules: [
      ...RAG_OPTIMIZATION_IRON_RULES_CORE,
      'ZERO hardcoded node types, model names, strategy names, colors, x/y coordinates',
      'ALL node config from FREEDOM config or DATABASE FABRIC',
      'React component MUST use Record<string,unknown> for data shapes (DNA-1)',
      'Empty FREEDOM config MUST render graceful empty state — never crash',
    ],
    machineComponents: ['graceful empty state', 'Record<string,unknown> data shapes'],
    freedomComponents: ['node_type_definitions', 'node_color_map', 'default_layout_algorithm'],
    stackCoupling: RAG_OPTIMIZATION_STACK_COUPLING,
  });
}

// ── Registry exports ────────────────────────────────────────────────────────

/** All 27 FLOW-29 contract factory functions. */
export const RAG_OPTIMIZATION_CONTRACT_FACTORIES = [
  createT441Contract,
  createT442Contract,
  createT443Contract,
  createT444Contract,
  createT445Contract,
  createT446Contract,
  createT447Contract,
  createT448Contract,
  createT449Contract,
  createT450Contract,
  createT451Contract,
  createT452Contract,
  createT453Contract,
  createT454Contract,
  createT455Contract,
  createT456Contract,
  createT457Contract,
  createT458Contract,
  createT459Contract,
  createT460Contract,
  createT461Contract,
  createT462Contract,
  createT463Contract,
  createT464Contract,
  createT465Contract,
  createT466Contract,
  createT467Contract,
] as const;
