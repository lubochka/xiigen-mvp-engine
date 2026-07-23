/**
 * GraphModule — self-contained graph + embedding + planning fabric.
 *
 * Phase 1: ElasticsearchGraphRagProvider + MockEmbeddingProvider.
 *          GRAPH_RAG_SERVICE + EMBEDDING_SERVICE tokens registered here.
 * Phase 2: ElasticsearchGraphLearningProvider + 12 bootstrap planning classes.
 *          All 13 planning tokens + GRAPH_LEARNING_SERVICE registered.
 *          AI_DECISION_PIPELINE stub (throws in bootstrap mode).
 * Phase 3: AIDrivenXxx implementations; mode switch on ENGINE_DECISION_MODE env var.
 *          CrossLayerCurriculumRouter active (replaces bootstrap no-op).
 *          AiDecisionPipelineService wired as AI_DECISION_PIPELINE.
 *
 * Imported by FabricsModule (@Global) — all exports available project-wide.
 *
 * NOTE: GRAPH_RAG_SERVICE and EMBEDDING_SERVICE factories live HERE (not in FabricsModule)
 * so that planning providers can inject GRAPH_RAG_SERVICE within the same module context.
 * FabricsModule re-exports these tokens from its exports[] array.
 *
 * Mode switch: ENGINE_DECISION_MODE=ai-driven activates 5 AI-driven planning tokens.
 *   Default: bootstrap (safe, no AI required).
 * ⚠️ Do NOT use a makeModeSwitched helper — constructor signatures differ per class.
 *    Use explicit factory registrations (shown below).
 */

import { Module } from '@nestjs/common';

// Interfaces / tokens
import { GRAPH_RAG_SERVICE, IGraphRagService } from './interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from './interfaces/i-graph-learning.service';
import { EMBEDDING_SERVICE, IEmbeddingService } from './interfaces/i-embedding.service';
import * as tokens from './interfaces/planning-tokens';
import { GRAPH_CONFIG_READER } from './planning/planning-abstracts';

// Core providers
import { ElasticsearchGraphRagProvider } from './providers/elasticsearch-graph-rag.provider';
import { MockEmbeddingProvider } from './providers/mock-embedding.provider';
import { ElasticsearchGraphLearningProvider } from './learning/elasticsearch-graph-learning.provider';

// Stub providers (Phase 1 stubs — throw 'not implemented in Phase 1')
import {
  LightRagGraphProvider,
  PineconeGraphProvider,
  AzureAISearchGraphProvider,
  Neo4jGraphProvider,
  OpenAIEmbeddingProvider,
  SentenceTransformerProvider,
  AzureEmbeddingProvider,
} from './providers/stub-graph-rag.providers';

// Bootstrap planning implementations
import { BootstrapArbiterPanelHandler } from './planning/bootstrap-arbiter-panel.handler';
import { BootstrapEscalationHandler } from './planning/bootstrap-escalation.handler';
import { BootstrapCycleRouter } from './planning/bootstrap-cycle-router';
import { BootstrapSignalRouter } from './planning/bootstrap-signal-router';
import { BootstrapDifficultyPredictor } from './planning/bootstrap-difficulty-predictor';
import { BootstrapNodeCompletenessValidator } from './planning/bootstrap-node-completeness-validator';
import { BootstrapScopeClassifier } from './planning/bootstrap-scope-classifier';
import { BootstrapSchemaChainValidator } from './planning/bootstrap-schema-chain-validator';
import { BootstrapAssumptionRegistryLinter } from './planning/bootstrap-assumption-registry-linter';
import { BootstrapBlastRadiusCalculator } from './planning/bootstrap-blast-radius-calculator';
import { BootstrapRetrospectiveService } from './planning/bootstrap-retrospective.service';

// Phase 3: AI-driven planning implementations
import { AiDecisionPipelineService } from './planning/ai-decision-pipeline.service';
import { AIDrivenCycleRouter } from './planning/ai-driven-cycle-router';
import { AIDrivenArbiterPanelHandler } from './planning/ai-driven-arbiter-panel.handler';
import { AIDrivenEscalationHandler } from './planning/ai-driven-escalation.handler';
import { AIDrivenSignalRouter } from './planning/ai-driven-signal-router';
import { AIDrivenDifficultyPredictor } from './planning/ai-driven-difficulty-predictor';
import { CrossLayerCurriculumRouter } from './planning/cross-layer-curriculum-router';

// Phase 4: AI-driven planning implementations (remaining 6 tokens)
import { AIDrivenNodeCompletenessValidator } from './planning/ai-driven-node-completeness-validator';
import { AIDrivenScopeClassifier } from './planning/ai-driven-scope-classifier';
import { AIDrivenSchemaChainValidator } from './planning/ai-driven-schema-chain-validator';
import { AIDrivenAssumptionRegistryLinter } from './planning/ai-driven-assumption-registry-linter';
import { AIDrivenBlastRadiusCalculator } from './planning/ai-driven-blast-radius-calculator';
import { AIDrivenRetrospectiveService } from './planning/ai-driven-retrospective.service';
import { DATABASE_SERVICE } from '../interfaces';

// Phase 5: Governance layer + EdgeVersioningService
import { EdgeVersioningService } from './learning/edge-versioning.service';
import { EDGE_VERSIONING_SERVICE } from './governance/mutation-proposal.types';

// FreedomConfigManager for GRAPH_CONFIG_READER adapter
import { FreedomConfigManager } from '../../freedom/config-manager';

@Module({
  providers: [
    // ── Fabric 12: Embedding ──────────────────────────────────────────────
    // Default: MockEmbeddingProvider. Swap via EMBEDDING_PROVIDER env var.
    {
      provide: EMBEDDING_SERVICE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: async (): Promise<IEmbeddingService> => {
        const provider = process.env['EMBEDDING_PROVIDER'] || 'mock';
        switch (provider) {
          case 'openai':
            return new OpenAIEmbeddingProvider() as unknown as IEmbeddingService;
          case 'sentence-transformers':
            return new SentenceTransformerProvider() as unknown as IEmbeddingService;
          case 'azure':
            return new AzureEmbeddingProvider() as unknown as IEmbeddingService;
          default:
            return new MockEmbeddingProvider();
        }
      },
      inject: [],
    },

    // ── Fabric 13: Graph RAG ──────────────────────────────────────────────
    // Default: ElasticsearchGraphRagProvider. Swap via GRAPH_RAG_PROVIDER env var.
    {
      provide: GRAPH_RAG_SERVICE,
      useFactory: async (
        embedding: IEmbeddingService,
        config?: FreedomConfigManager,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ): Promise<IGraphRagService> => {
        const provider = process.env['GRAPH_RAG_PROVIDER'] || 'elasticsearch';
        switch (provider) {
          case 'lightrag':
            return new LightRagGraphProvider() as unknown as IGraphRagService;
          case 'pinecone+es':
            return new PineconeGraphProvider() as unknown as IGraphRagService;
          case 'azure-ai-search':
            return new AzureAISearchGraphProvider() as unknown as IGraphRagService;
          case 'neo4j':
            return new Neo4jGraphProvider() as unknown as IGraphRagService;
          default: // elasticsearch
            return new ElasticsearchGraphRagProvider(embedding, config);
        }
      },
      inject: [EMBEDDING_SERVICE, { token: FreedomConfigManager, optional: true }],
    },

    // ── GRAPH_CONFIG_READER — adapter over FreedomConfigManager ───────────
    // Provides a simple get(key, fallback): Promise<number> interface.
    {
      provide: GRAPH_CONFIG_READER,
      useFactory: (configManager?: FreedomConfigManager) => ({
        get: async (key: string, fallback: number): Promise<number> => {
          if (!configManager) return fallback;
          const result = await configManager.getConfigAsync('system', key);
          if (result.isSuccess && typeof result.data?.['value'] === 'number') {
            return result.data['value'] as number;
          }
          return fallback;
        },
      }),
      inject: [{ token: FreedomConfigManager, optional: true }],
    },

    // ── EDGE_VERSIONING_SERVICE (Phase 5) ─────────────────────────────────
    { provide: EdgeVersioningService, useClass: EdgeVersioningService },
    { provide: EDGE_VERSIONING_SERVICE, useExisting: EdgeVersioningService },

    // ── GRAPH_LEARNING_SERVICE ────────────────────────────────────────────
    {
      provide: GRAPH_LEARNING_SERVICE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (g: any, c: any) => new ElasticsearchGraphLearningProvider(g, c),
      inject: [GRAPH_RAG_SERVICE, { token: GRAPH_CONFIG_READER, optional: true }],
    },

    // ── AI_DECISION_PIPELINE (Phase 3) ────────────────────────────────────
    // AiDecisionPipelineService — 4-role AI protocol, DPO triple storage.
    // Injects AI_PROVIDER + GRAPH_CONFIG_READER + DATABASE_SERVICE (all global).
    { provide: AiDecisionPipelineService, useClass: AiDecisionPipelineService },
    { provide: tokens.AI_DECISION_PIPELINE, useExisting: AiDecisionPipelineService },

    // ── Planning components ────────────────────────────────────────────────
    // Phase 3: mode switch on ENGINE_DECISION_MODE=ai-driven env var.
    // ⚠️ Explicit factories — no generic helper (constructor signatures differ per class).

    // CYCLE_ROUTER — mode switched
    {
      provide: tokens.CYCLE_ROUTER,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (graphRag: any, config: any, learning: any, pipeline: any) => {
        const mode = process.env['ENGINE_DECISION_MODE'] ?? 'bootstrap';
        return mode === 'ai-driven'
          ? new AIDrivenCycleRouter(graphRag, learning, pipeline, config)
          : new BootstrapCycleRouter(graphRag, config);
      },
      inject: [
        GRAPH_RAG_SERVICE,
        { token: GRAPH_CONFIG_READER, optional: true },
        GRAPH_LEARNING_SERVICE,
        tokens.AI_DECISION_PIPELINE,
      ],
    },

    // ARBITER_PANEL_HANDLER — mode switched
    {
      provide: tokens.ARBITER_PANEL_HANDLER,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (graphRag: any, config: any, learning: any, pipeline: any) => {
        const mode = process.env['ENGINE_DECISION_MODE'] ?? 'bootstrap';
        return mode === 'ai-driven'
          ? new AIDrivenArbiterPanelHandler(graphRag, learning, pipeline, config)
          : new BootstrapArbiterPanelHandler(graphRag, config);
      },
      inject: [
        GRAPH_RAG_SERVICE,
        { token: GRAPH_CONFIG_READER, optional: true },
        GRAPH_LEARNING_SERVICE,
        tokens.AI_DECISION_PIPELINE,
      ],
    },

    // ESCALATION_HANDLER — mode switched
    {
      provide: tokens.ESCALATION_HANDLER,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (graphRag: any, config: any, learning: any, pipeline: any) => {
        const mode = process.env['ENGINE_DECISION_MODE'] ?? 'bootstrap';
        return mode === 'ai-driven'
          ? new AIDrivenEscalationHandler(graphRag, learning, pipeline, config)
          : new BootstrapEscalationHandler(graphRag, config);
      },
      inject: [
        GRAPH_RAG_SERVICE,
        { token: GRAPH_CONFIG_READER, optional: true },
        GRAPH_LEARNING_SERVICE,
        tokens.AI_DECISION_PIPELINE,
      ],
    },

    // SIGNAL_ROUTER — mode switched
    {
      provide: tokens.SIGNAL_ROUTER,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (graphRag: any, config: any, learning: any, pipeline: any) => {
        const mode = process.env['ENGINE_DECISION_MODE'] ?? 'bootstrap';
        return mode === 'ai-driven'
          ? new AIDrivenSignalRouter(graphRag, learning, pipeline, config)
          : new BootstrapSignalRouter(graphRag);
      },
      inject: [
        GRAPH_RAG_SERVICE,
        { token: GRAPH_CONFIG_READER, optional: true },
        GRAPH_LEARNING_SERVICE,
        tokens.AI_DECISION_PIPELINE,
      ],
    },

    // DIFFICULTY_PREDICTOR — mode switched
    {
      provide: tokens.DIFFICULTY_PREDICTOR,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (graphRag: any, rag: any, config: any, learning: any, pipeline: any) => {
        const mode = process.env['ENGINE_DECISION_MODE'] ?? 'bootstrap';
        return mode === 'ai-driven'
          ? new AIDrivenDifficultyPredictor(graphRag, rag, learning, pipeline, config)
          : new BootstrapDifficultyPredictor(graphRag, rag);
      },
      inject: [
        GRAPH_RAG_SERVICE,
        { token: 'RAG_SERVICE', optional: true },
        { token: GRAPH_CONFIG_READER, optional: true },
        GRAPH_LEARNING_SERVICE,
        tokens.AI_DECISION_PIPELINE,
      ],
    },

    // NODE_COMPLETENESS_VALIDATOR — mode switched (Phase 4)
    {
      provide: tokens.NODE_COMPLETENESS_VALIDATOR,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (graphRag: any, config: any, learning: any, pipeline: any) => {
        const mode = process.env['ENGINE_DECISION_MODE'] ?? 'bootstrap';
        return mode === 'ai-driven'
          ? new AIDrivenNodeCompletenessValidator(graphRag, learning, pipeline, config)
          : new BootstrapNodeCompletenessValidator(config);
      },
      inject: [
        GRAPH_RAG_SERVICE,
        { token: GRAPH_CONFIG_READER, optional: true },
        GRAPH_LEARNING_SERVICE,
        tokens.AI_DECISION_PIPELINE,
      ],
    },

    // SCOPE_CLASSIFIER — mode switched (Phase 4)
    {
      provide: tokens.SCOPE_CLASSIFIER,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (graphRag: any, config: any, learning: any, pipeline: any) => {
        const mode = process.env['ENGINE_DECISION_MODE'] ?? 'bootstrap';
        return mode === 'ai-driven'
          ? new AIDrivenScopeClassifier(graphRag, learning, pipeline, config)
          : new BootstrapScopeClassifier(graphRag, config);
      },
      inject: [
        GRAPH_RAG_SERVICE,
        { token: GRAPH_CONFIG_READER, optional: true },
        GRAPH_LEARNING_SERVICE,
        tokens.AI_DECISION_PIPELINE,
      ],
    },

    // SCHEMA_CHAIN_VALIDATOR — mode switched (Phase 4)
    {
      provide: tokens.SCHEMA_CHAIN_VALIDATOR,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (graphRag: any, config: any, learning: any, pipeline: any) => {
        const mode = process.env['ENGINE_DECISION_MODE'] ?? 'bootstrap';
        return mode === 'ai-driven'
          ? new AIDrivenSchemaChainValidator(graphRag, learning, pipeline, config)
          : new BootstrapSchemaChainValidator(graphRag, config);
      },
      inject: [
        GRAPH_RAG_SERVICE,
        { token: GRAPH_CONFIG_READER, optional: true },
        GRAPH_LEARNING_SERVICE,
        tokens.AI_DECISION_PIPELINE,
      ],
    },

    // ASSUMPTION_REGISTRY_LINTER — mode switched (Phase 4)
    {
      provide: tokens.ASSUMPTION_REGISTRY_LINTER,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (graphRag: any, config: any, learning: any, pipeline: any) => {
        const mode = process.env['ENGINE_DECISION_MODE'] ?? 'bootstrap';
        return mode === 'ai-driven'
          ? new AIDrivenAssumptionRegistryLinter(graphRag, learning, pipeline, config)
          : new BootstrapAssumptionRegistryLinter();
      },
      inject: [
        GRAPH_RAG_SERVICE,
        { token: GRAPH_CONFIG_READER, optional: true },
        GRAPH_LEARNING_SERVICE,
        tokens.AI_DECISION_PIPELINE,
      ],
    },

    // BLAST_RADIUS_CALCULATOR — mode switched (Phase 4)
    {
      provide: tokens.BLAST_RADIUS_CALCULATOR,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (graphRag: any, config: any, learning: any, pipeline: any) => {
        const mode = process.env['ENGINE_DECISION_MODE'] ?? 'bootstrap';
        return mode === 'ai-driven'
          ? new AIDrivenBlastRadiusCalculator(graphRag, learning, pipeline, config)
          : new BootstrapBlastRadiusCalculator(graphRag, config);
      },
      inject: [
        GRAPH_RAG_SERVICE,
        { token: GRAPH_CONFIG_READER, optional: true },
        GRAPH_LEARNING_SERVICE,
        tokens.AI_DECISION_PIPELINE,
      ],
    },

    // RETROSPECTIVE_SERVICE — mode switched (Phase 4)
    {
      provide: tokens.RETROSPECTIVE_SERVICE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (graphRag: any, config: any, learning: any, db: any) => {
        const mode = process.env['ENGINE_DECISION_MODE'] ?? 'bootstrap';
        return mode === 'ai-driven'
          ? new AIDrivenRetrospectiveService(graphRag, learning, db, config)
          : new BootstrapRetrospectiveService(graphRag, config, learning);
      },
      inject: [
        GRAPH_RAG_SERVICE,
        { token: GRAPH_CONFIG_READER, optional: true },
        GRAPH_LEARNING_SERVICE,
        DATABASE_SERVICE,
      ],
    },

    // CROSS_LAYER_CURRICULUM_ROUTER — active Phase 3 implementation (replaces bootstrap no-op)
    { provide: CrossLayerCurriculumRouter, useClass: CrossLayerCurriculumRouter },
    { provide: tokens.CROSS_LAYER_CURRICULUM_ROUTER, useExisting: CrossLayerCurriculumRouter },
  ],

  exports: [
    EMBEDDING_SERVICE,
    GRAPH_RAG_SERVICE,
    GRAPH_LEARNING_SERVICE,
    GRAPH_CONFIG_READER,
    tokens.ARBITER_PANEL_HANDLER,
    tokens.ESCALATION_HANDLER,
    tokens.CYCLE_ROUTER,
    tokens.SIGNAL_ROUTER,
    tokens.DIFFICULTY_PREDICTOR,
    tokens.NODE_COMPLETENESS_VALIDATOR,
    tokens.CROSS_LAYER_CURRICULUM_ROUTER,
    tokens.SCOPE_CLASSIFIER,
    tokens.SCHEMA_CHAIN_VALIDATOR,
    tokens.ASSUMPTION_REGISTRY_LINTER,
    tokens.BLAST_RADIUS_CALCULATOR,
    tokens.RETROSPECTIVE_SERVICE,
    tokens.AI_DECISION_PIPELINE,
    EDGE_VERSIONING_SERVICE,
  ],
})
export class GraphModule {}
