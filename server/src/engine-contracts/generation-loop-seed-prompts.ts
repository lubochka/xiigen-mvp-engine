/**
 * FLOW-33 Genesis Seed Prompts — System Initiation: Self-Building Bootstrap.
 * T536–T542 — 7 prompts, all FLOW_SCOPED.
 *
 * All prompts encode the critical FLOW-33 iron rules:
 *   - CF-739: sentinel-not-read-first
 *   - CF-740: phase-skipped
 *   - CF-741: schemas-after-events
 *   - CF-742: partial-import-committed
 *   - CF-743: GraphRAG Layer 2 before Layer 1 complete
 *   - CF-746: regression-check-skipped
 *   - CF-747: stale-ContextPack-reused
 *   - CF-750: evolved-prompt-applied-to-inflight
 *   - IR-DRY-1: DRY_RUN triggers AI call or state mutation
 */

export interface Flow33GenesisPrompt {
  taskType: string;
  promptText: string;
  connection_type: 'FLOW_SCOPED';
  flow_id: 'FLOW-33';
  version: string;
}

const BASE = {
  connection_type: 'FLOW_SCOPED' as const,
  flow_id: 'FLOW-33' as const,
  version: '1.0.0',
};

export const META_ARBITRATION_SEED_PROMPTS: Flow33GenesisPrompt[] = [
  {
    ...BASE,
    taskType: 'T536',
    promptText:
      'Generate a NestJS BootstrapOrchestrator service (T536) that implements a 7-phase sentinel state machine for self-building bootstrap orchestration. CRITICAL: Read sentinel state from IDatabaseService BEFORE executing any phase (CF-739 sentinel-not-read-first). Phases MUST execute in order — no skipping (CF-740 phase-skipped). Schemas MUST be registered before events emitted (CF-741 schemas-after-events). Plan bundle import is all-or-nothing — partial import MUST trigger rollback and DataProcessResult.failure("PARTIAL_IMPORT_ROLLED_BACK") (CF-742 partial-import-committed). Support DRY_RUN mode: return DryRunValidationReport without triggering any AI calls or state mutations (IR-DRY-1). Use IBootstrapService (F1339) via DATABASE FABRIC for sentinel state. Use IPlanBundleImportService (F1346) via DATABASE FABRIC for atomic import. All transitions: storeDocument() BEFORE enqueue() (DNA-8). Extend MicroserviceBase. Return DataProcessResult<BootstrapPhaseResult>.',
  },
  {
    ...BASE,
    taskType: 'T537',
    promptText:
      'Generate a NestJS GraphRAGTwoLayerSeeder service (T537) that constructs the self-knowledge GraphRAG in two strict layers. Layer 1: index all existing engine contracts, task types (T375+), factory interfaces (F1028+), and CF rules into the RAG index via IRagService (F1348) via RAG FABRIC. Layer 2: build cross-flow dependency graph edges. CRITICAL: Layer 2 MUST NOT start before Layer 1 is 100% complete — verify Layer 1 status via IGraphRAGSeedingService (F1340) via DATABASE FABRIC (CF-743 GraphRAG-Layer2-before-Layer1). Each seeding batch is idempotent by nodeId (content-addressed). storeDocument() BEFORE enqueue() on each batch (DNA-8). Extend MicroserviceBase. Return DataProcessResult<GraphRAGSeedingResult> with layer1NodeCount and layer2EdgeCount fields.',
  },
  {
    ...BASE,
    taskType: 'T538',
    promptText:
      'Generate a NestJS ImplementationStatusRegistry service (T538) that tracks per-family implementation status as a state machine. Composite idempotency key: (tenantId, flowId, familyId, runId) — IScopedMemoryService.setIfAbsent() prevents duplicate runs (atomic, no separate check + write). States: PENDING → IN_PROGRESS → COMPLETED | FAILED | NEEDS_REVIEW. Read sentinel state via IImplementationRegistryService (F1341) via DATABASE FABRIC before every state transition (CF-739). All transitions: storeDocument() BEFORE enqueue() (DNA-8). On duplicate runId (setIfAbsent returns false): return DataProcessResult.failure("DUPLICATE_RUN_BLOCKED"). Extend MicroserviceBase. Return DataProcessResult<ImplementationStatusResult> with currentState and transitionHistory fields.',
  },
  {
    ...BASE,
    taskType: 'T539',
    promptText:
      'Generate a NestJS ImplementFamilyMetaLoop service (T539) that drives per-family code generation in a bounded retry loop. Read max retry count from FREEDOM config key "flow33_max_family_retries" via IDatabaseService — NEVER hardcode the retry limit (score-0 violation if hardcoded). For each attempt: (1) fetch fresh ContextPack from T542, (2) generate code via IFamilyImplementationService (F1343) via AI FABRIC, (3) submit to T540 consensus gate, (4) if REJECTED inject arbiter feedback into next iteration prompt. CRITICAL: Evolved prompts MUST only apply to new sessions — NEVER to in-flight generation (CF-750 evolved-prompt-applied-to-inflight). On max retries exceeded: transition T538 status to NEEDS_REVIEW and return DataProcessResult.failure("MAX_RETRIES_EXCEEDED_HUMAN_REVIEW"). Extend MicroserviceBase. Return DataProcessResult<FamilyImplementationResult>.',
  },
  {
    ...BASE,
    taskType: 'T540',
    promptText:
      'Generate a NestJS FiveArbiterConsensusGate service (T540) that runs 5 specialized arbiters in PARALLEL. CRITICAL: Use Promise.allSettled([arch, sec, dna, biz, integ]) — sequential execution is a score-0 violation. Arbiters: architecture (checks structural soundness), security (checks no SDK imports, tenant isolation), dna (checks all 9 DNA patterns), business (checks domain correctness), integration (checks fabric interface usage). Arbiter prompts are stored in this service as a map — NOT in ArbiterRegistry. Use IFiveArbiterConsensusService (F1344) via AI FABRIC for generation. Quorum: ≥4/5 passed = DataProcessResult.success({verdict:"APPROVED"}), exactly 3/5 = DataProcessResult.success({verdict:"NEEDS_REVISION"}), <3/5 = DataProcessResult.success({verdict:"REJECTED"}). Threshold MUST be ≥4 — value of 3 or lower = score-0. Extend MicroserviceBase.',
  },
  {
    ...BASE,
    taskType: 'T541',
    promptText:
      "Generate a NestJS RegressionImpactAnalyzer service (T541) that performs graph traversal blast radius analysis before any promotion decision. CRITICAL: This check MUST run before every promotion — skipping is a score-0 violation (CF-746 regression-check-skipped). Use IRegressionImpactService (F1345) via DATABASE FABRIC for graph traversal. After CASE A or CASE C promotion: scan all active bundle manifests that include requiredFlows[] from DATABASE FABRIC; check each bundle's minFlowVersions[flowId]; if promoted flow version < minimum required version, set bundle status to DEGRADED and store update via IDatabaseService before emitting bundle.degraded event (DNA-8). Implement replayArbiterOnBundle(bundleId) method for re-validation. Extend MicroserviceBase. Return DataProcessResult<RegressionImpactReport> with blastRadius, affectedBundles, degradedBundles fields.",
  },
  {
    ...BASE,
    taskType: 'T542',
    promptText:
      'Generate a NestJS ContextPackAssembler service (T542) that assembles TTL-managed hybrid RAG context packs for family code generation. Read TTL from FREEDOM config key "flow33_context_pack_ttl_minutes" via IDatabaseService — NEVER hardcode TTL. Before each assembly: check existing pack TTL via IContextPackService (F1342) via DATABASE FABRIC. CRITICAL: Stale pack (TTL expired) MUST be refreshed — reusing stale pack across retry rounds is a score-0 violation (CF-747 stale-ContextPack-reused). Fetch RAG context via IRagService (F1348) via RAG FABRIC (hybrid vector + graph query). Combine RAG results with database metadata into structured ContextPack. storeDocument() BEFORE enqueue() (DNA-8). Extend MicroserviceBase. Return DataProcessResult<ContextPack> with sources, vectorResults, graphEdges, ttlExpiresAt fields.',
  },
];
