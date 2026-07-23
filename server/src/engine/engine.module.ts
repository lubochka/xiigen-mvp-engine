/**
 * EngineModule — registers the GenericNodeExecutor pipeline and all its
 * dependencies: 7 node handlers, NodeRegistry, TopologyStore,
 * PromptLibraryStation, FlowStateSnapshotService, DpoTrainingDataService,
 * GenericNodeExecutor, FlowRegistryService, SkillIngestService.
 *
 * S19: Full engine module wiring.
 * BLOCKING-1 fix: all 7 handlers including RouteHandler registered explicitly.
 * Readiness gate: registry.getRegisteredTypes().length === 7 and includes 'route'.
 */

import { Module } from '@nestjs/common';
import { FabricsModule } from '../fabrics/fabrics.module';
import { GuardrailsModule } from '../guardrails/guardrails.module';
import { FreedomModule } from '../freedom/freedom.module';
import { FactoriesModule } from '../factories/factories.module';
import { EngineContractsModule } from '../engine-contracts/engine-contracts.module';

// Node handlers (all 10)
import { RagRetrieveHandler } from './node-handlers/rag-retrieve.handler';
import { DecomposeHandler } from './node-handlers/decompose.handler';
import { AiGenerateHandler } from './node-handlers/ai-generate.handler';
import { ValidateHandler } from './node-handlers/validate.handler';
import { ScoreHandler } from './node-handlers/score.handler';
import { FeedbackHandler } from './node-handlers/feedback.handler';
import { RouteHandler } from './node-handlers/route.handler';
import { PlannerHandler } from './node-handlers/planner.handler';
import { ConvergenceHandler } from './node-handlers/convergence.handler';
import { DepthDecisionHandler } from './node-handlers/depth-decision.handler';
import { NodeRegistry } from './node-handlers/node-registry';

// Engine infrastructure
import { TopologyStore } from './topology-store';
// Track 0 Turn 2: per-tenant topology persistence (new indices: xiigen-flow-templates + xiigen-tenant-topologies)
import { TenantTopologyStore } from './tenant-topology-store';
// Track 0 Turn 3: TopologyPublisher — persists CycleChainOutput → TenantTopologyStore
import { TopologyPublisher } from './topology-publisher';
// Turn 6 (MVP Plan v3): tenant module registry for Linked-mode installs (DD-324)
import { TenantModuleRegistry } from './tenant-module-registry.service';
// FLOW-47 Turn 2 (T658): marketplace package service (publish/browse/install logic
// extracted from MarketplacePackageController so EngineBootstrapper can auto-publish
// at boot time without depending on the HTTP controller).
import { MarketplacePackageService } from './marketplace-package.service';
import { PromptLibraryStation } from './prompt-library.station';
import { FlowStateSnapshotService } from './flow-state-snapshot.service';
import { DpoTrainingDataService } from './dpo-training-data.service';
import { GenericNodeExecutor } from './generic-node-executor';

// Stage 2 services
import { FlowRegistryService } from './flow-registry.service';
import { SkillIngestService } from './skill-ingest.service';
// GAP-4/GAP-1: Cycle chain orchestration (recursive EXPAND + external entry point)
import { CycleChainService } from './cycle-chain.service';
// NODE-RESOLUTION-GAPS: CycleHistoryService — per-run cycle history accumulator
import { CycleHistoryService } from './cycle-history.service';
// NODE-RESOLUTION-GAPS: RagEvaluateHandler — G3 post-retrieval applicability filter
import { RagEvaluateHandler } from './node-handlers/rag-evaluate.handler';
// NODE-RESOLUTION-GAPS: RagQueryHandler — G6 pre-retrieval query reformulation
import { RagQueryHandler } from './node-handlers/rag-query.handler';
// NODE-RESOLUTION-GAPS: GraphRagSyncService + HttpGraphRagService — G5 DPO triple write-back
import { GraphRagSyncService } from './graph-rag-sync.service';
import { GRAPH_RAG_SERVICE, HttpGraphRagService } from '../fabrics/interfaces/graph-rag.interface';
// Run analysis formatter — converts CycleChainOutput to structured Markdown
import { RunAnalysisFormatter } from './run-analysis-formatter.service';
// Self-judge N-round teaching loop (Cycle 2 provider topology)
import { TeachingRoundService } from './teaching-round.service';

// Arbitration loop (heyrovsky merge)
import { ArbiterRegistry, ArbiterService } from './arbitration';
import { ArbitrationLoopController } from './arbitration/arbitration-loop.controller';
import { UnanimousVerdictAggregator } from './arbitration/unanimous-aggregator';
import { FeedbackSynthesizer } from './arbitration/feedback-synthesizer';
import { TrainingTraceWriter } from './arbitration/training-trace-writer';
// Flow watcher (flow-0a-runner removed — FLOW-0A was retired)
import { FlowWatcherService } from './flows/flow-watcher.service';
// T581: Flow pool writer
import { FlowPoolWriterService } from './flow-pool/flow-pool-writer.service';
// T582: Context query handler
import { ContextQueryHandler } from './node-handlers/context-query.handler';
// A-2: Curriculum tier resolver
import { CurriculumTierResolver } from './curriculum-tier-resolver.service';
// B-2: Engine progress aggregator
import { EngineProgressService } from './engine-progress.service';
// A-4: Parallel generation (multi-generate handler)
import { ParallelGenerationService } from './node-handlers/parallel-generation.service';
import { MultiGenerateHandler } from './node-handlers/multi-generate.handler';
// B-3: Graduation resolver (per-tier FREEDOM config + regression reversion)
import { GraduationResolverService } from './graduation-resolver.service';
// S2-02: Arbiter panel handler
import { ArbiterPanelHandler } from './node-handlers/arbiter-panel.handler';
// SS-02: RequiredProviderValidator — guards DPO triples against missing fabric providers
import { RequiredProviderValidator } from './validators/required-provider-validator';
// SS-03: ManifestUpdaterService — auto-updates capability manifest at Phase F completion
import { ManifestUpdaterService } from './manifest-updater.service';
// SS-04: SpecAuditService — pre-generation spec audit (SPEC-001/002/003)
import { SpecAuditService } from './spec-audit/spec-audit.service';
// SS-09: PrerequisiteCompletionGateService — tracks gap resolution, emits spec.prerequisites.met
import { PrerequisiteCompletionGateService } from './prerequisite-completion-gate.service';
// SS-09: CapabilityGapFlowProposerService — proposes new flows for unresolvable gaps
import { CapabilityGapFlowProposerService } from './capability-gap-flow-proposer.service';
// B-6: FLOW-12 OUTCOME_PENDING timeout handler (auto-validates stale triples after 48h)
import { OutcomeTimeoutScheduler } from './outcome-timeout.scheduler';
import { OutcomeTimeoutConsumer } from './outcome-timeout.consumer';
// GAP-NEW-24 FLOW-19: NamedCheckRegistry + 9 FLOW-19 named check evaluators
import { NamedCheckRegistry } from './node-handlers/named-check.registry';
import { Flow19NamedChecksService } from './named-checks/durable-sagas-compliance/durable-sagas-compliance.module';
// S-4: CalibrationRunner + OssCurriculumRunner (universal improvement loop)
import { CalibrationModule } from './calibration/calibration.module';
// S-4 Scope + Portability layer (prerequisite for Phase 1)
import { ScopePortabilityModule } from './scope/scope-portability.module';
// Phase 1: Expand queue consumer — handles 'cycle.chain.expand' events
import { ExpandConsumerHandler } from './expand-consumer.handler';
// FLOW-36 Phase A: Feature Registry Scanner
import { FeatureRegistryPhaseAModule } from './flows/feature-registry/feature-registry-phase-a.module';
// FLOW-37 Phase A: Engine Self-Awareness bootstrap
import { EngineSelfAwarenessPhaseAModule } from './flows/engine-self-awareness/engine-self-awareness-phase-a.module';
// FLOW-38 Phase A: RAG Quality Feedback bootstrap
import { RagQualityFeedbackPhaseAModule } from './flows/rag-quality-feedback/rag-quality-feedback-phase-a.module';
// FLOW-46 Phase B: Platform Agent (T650-T655 server services)
import { AgentRunOrchestrator } from './flows/platform-agent/agent-run-orchestrator.service';
import { TenantScopeGateway } from './flows/platform-agent/tenant-scope-gateway.service';
import { PlatformContextEnricher } from './flows/platform-agent/platform-context-enricher.service';
import { SuperJudgeArbiter } from './flows/platform-agent/super-judge-arbiter.service';
import { AgentActionPublisher } from './flows/platform-agent/agent-action-publisher.service';
import { PatternContributor } from './flows/platform-agent/pattern-contributor.service';
// FLOW-48 i18n-translation: 5 services + F1523 provider
import { TranslationRequestRegistrarService } from './flows/i18n-translation/translation-request-registrar.service';
import { TranslationPolicyGateService } from './flows/i18n-translation/translation-policy-gate.service';
import { UserPreferencesManagerService } from './flows/i18n-translation/user-preferences-manager.service';
import { TenantTranslationWriterService } from './flows/i18n-translation/tenant-translation-writer.service';
import { TranslationResolverService } from './flows/i18n-translation/translation-resolver.service';
import { MarketplaceTranslationCacheJobService } from './flows/i18n-translation/marketplace-translation-cache-job.service';
import { TranslationLookupProvider } from '../fabrics/providers/translation-lookup.provider';
import { TRANSLATION_LOOKUP_SERVICE } from '../fabrics/interfaces/translation-lookup.interface';

const NODE_HANDLERS = [
  RagRetrieveHandler,
  DecomposeHandler,
  AiGenerateHandler,
  ValidateHandler,
  ScoreHandler,
  FeedbackHandler,
  RouteHandler, // 7th handler — BLOCKING-1 fix (GAP-NEW-14)
  PlannerHandler, // Cycle 1 — AI Planning
  ConvergenceHandler, // Cycle 2 — Multi-Model NODE Generation
  DepthDecisionHandler, // Cycle 3 — Depth Decision
];

@Module({
  imports: [
    FabricsModule,
    GuardrailsModule,
    FreedomModule,
    FactoriesModule,
    EngineContractsModule,
    CalibrationModule,
    ScopePortabilityModule,
    FeatureRegistryPhaseAModule,
    EngineSelfAwarenessPhaseAModule,
    RagQualityFeedbackPhaseAModule,
  ],
  providers: [
    // All 7 node handlers
    ...NODE_HANDLERS,
    // Registry (depends on all 7 handlers)
    NodeRegistry,
    // Topology + Prompt infrastructure
    TopologyStore,
    // Track 0 Turn 2: per-tenant topology store
    TenantTopologyStore,
    // Track 0 Turn 3: TopologyPublisher (depends on TenantTopologyStore)
    TopologyPublisher,
    // Turn 6 (MVP Plan v3) — Linked-mode install registry.
    TenantModuleRegistry,
    // FLOW-47 Turn 2 — marketplace business logic, used by both
    // MarketplacePackageController (HTTP) and EngineBootstrapper (auto-publish).
    MarketplacePackageService,
    PromptLibraryStation,
    // State + training data
    FlowStateSnapshotService,
    DpoTrainingDataService,
    // Executor (depends on registry + topology + prompt)
    GenericNodeExecutor,
    // Registry + skill services (Stage 2)
    FlowRegistryService,
    SkillIngestService,
    // GAP-4/GAP-1: Cycle chain orchestration
    CycleChainService,
    // NODE-RESOLUTION-GAPS: Cycle history accumulator (G2 prerequisite)
    CycleHistoryService,
    // NODE-RESOLUTION-GAPS: RAG applicability evaluator (G3)
    RagEvaluateHandler,
    // NODE-RESOLUTION-GAPS: RAG query reformulator (G6)
    RagQueryHandler,
    // NODE-RESOLUTION-GAPS: GraphRAG sync service + HTTP provider (G5)
    GraphRagSyncService,
    { provide: GRAPH_RAG_SERVICE, useClass: HttpGraphRagService },
    // Run analysis formatter (no dependencies — pure transformation service)
    RunAnalysisFormatter,
    // Self-judge N-round teaching loop (NOT a node handler — plain service)
    TeachingRoundService,
    // Arbitration loop infrastructure
    ArbiterRegistry,
    ArbiterService,
    ArbitrationLoopController,
    UnanimousVerdictAggregator,
    FeedbackSynthesizer,
    TrainingTraceWriter,
    // Flow watcher
    FlowWatcherService,
    // T581: Flow pool writer
    FlowPoolWriterService,
    // T582: Context query handler
    ContextQueryHandler,
    // A-2: Curriculum tier resolver
    CurriculumTierResolver,
    // B-2: Engine progress aggregator
    EngineProgressService,
    // A-4: Parallel generation (multi-generate handler)
    ParallelGenerationService,
    MultiGenerateHandler,
    // B-3: Graduation resolver
    GraduationResolverService,
    // S2-02: Arbiter panel handler
    ArbiterPanelHandler,
    // SS-02: Provider dependency validator for DPO triples
    RequiredProviderValidator,
    // SS-03: Capability manifest updater (Phase F completion → manifest sync)
    ManifestUpdaterService,
    // SS-04: Spec audit service (pre-generation SPEC-001/002/003 checks)
    SpecAuditService,
    // SS-09: Prerequisite completion gate (tracks gap resolution → spec.prerequisites.met)
    PrerequisiteCompletionGateService,
    // SS-09: Capability gap flow proposer (proposes flows for unresolvable gaps)
    CapabilityGapFlowProposerService,
    // Phase 1: Expand consumer — @EventPattern('cycle.chain.expand') handler
    ExpandConsumerHandler,
    // B-6: FLOW-12 OUTCOME_PENDING timeout scheduler + consumer
    OutcomeTimeoutScheduler,
    OutcomeTimeoutConsumer,
    // GAP-NEW-24 FLOW-19: NamedCheckRegistry (singleton) + flow-19 check registrar
    NamedCheckRegistry,
    Flow19NamedChecksService,
    // FLOW-46 Phase B: Platform Agent services
    TenantScopeGateway,
    PlatformContextEnricher,
    SuperJudgeArbiter,
    PatternContributor,
    AgentActionPublisher,
    AgentRunOrchestrator,
    // FLOW-48 i18n-translation: T665 + T669 + T670 + T668 + T666 + F1523 provider
    TranslationRequestRegistrarService,
    TranslationPolicyGateService,
    UserPreferencesManagerService,
    TenantTranslationWriterService,
    TranslationResolverService,
    MarketplaceTranslationCacheJobService,
    { provide: TRANSLATION_LOOKUP_SERVICE, useClass: TranslationLookupProvider },
  ],
  exports: [
    // FLOW-47 Turn 3+4 — re-export ScopePortabilityModule so its services
    // (DesignTimeSnapshotService, InstallValidationService) reach ApiModule
    // controllers via InfrastructureModule re-export chain.
    ScopePortabilityModule,
    // Exported so ApiModule / InfrastructureModule can inject them
    GenericNodeExecutor,
    PromptLibraryStation,
    FlowStateSnapshotService,
    DpoTrainingDataService,
    NodeRegistry,
    FlowRegistryService,
    SkillIngestService,
    TopologyStore,
    // Track 0 Turn 2: per-tenant topology store (exported for ApiModule via InfrastructureModule)
    TenantTopologyStore,
    // Track 0 Turn 3: TopologyPublisher (exported so CycleChainController can @Optional-inject)
    TopologyPublisher,
    // Turn 6 — exported for ApiModule (MarketplacePackageController) + AfStationsModule (AF-4)
    TenantModuleRegistry,
    // FLOW-47 Turn 2 — exported for ApiModule (controller) + AppModule (EngineBootstrapper)
    MarketplacePackageService,
    ArbitrationLoopController,
    FlowWatcherService,
    ArbiterRegistry,
    ArbiterService,
    FlowPoolWriterService,
    ContextQueryHandler,
    CurriculumTierResolver,
    EngineProgressService,
    ParallelGenerationService,
    MultiGenerateHandler,
    GraduationResolverService,
    ArbiterPanelHandler,
    RequiredProviderValidator,
    ManifestUpdaterService,
    SpecAuditService,
    PrerequisiteCompletionGateService,
    CapabilityGapFlowProposerService,
    // GAP-4/GAP-1: Cycle chain orchestration
    CycleChainService,
    // NODE-RESOLUTION-GAPS: Cycle history accumulator
    CycleHistoryService,
    // NODE-RESOLUTION-GAPS: GraphRAG sync service
    GraphRagSyncService,
    // Run analysis formatter
    RunAnalysisFormatter,
    // Self-judge teaching loop
    TeachingRoundService,
    // FLOW-46 Phase B: exported so ApiModule (AgentController) can inject orchestrator
    AgentRunOrchestrator,
    // FLOW-48 i18n-translation: exported for main.ts route wiring
    TranslationResolverService,
    UserPreferencesManagerService,
    TranslationRequestRegistrarService,
    MarketplaceTranslationCacheJobService,
  ],
})
export class EngineModule {}
