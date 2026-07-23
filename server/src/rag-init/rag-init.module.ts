/**
 * RagInitModule — NestJS module for RAG pattern ingestion.
 *
 * Provides: CodePatternExtractor, SkillIndexer, TestPatternIndexer, RagIndexerService.
 * Exports: RagIndexerService (the orchestrator).
 *
 * Phase 11.5: Module wiring.
 */

import { Module } from '@nestjs/common';
import { CodePatternExtractor } from './code-pattern-extractor';
import { SkillIndexer } from './skill-indexer';
import { TestPatternIndexer } from './test-pattern-indexer';
import { RagIndexerService } from './rag-indexer.service';
import { ReviewsRagSeed } from './reviews-rag-seed';
import { ModerationRagSeed } from './moderation-rag-seed';
import { ReputationRagSeed } from './reputation-rag-seed';
import { ReviewResponseRagSeed } from './review-response-rag-seed';
// FLOW-13 RAG seeds
import { WarehouseIngestionRagSeed } from './warehouse-ingestion-rag-seed';
import { QueryExecutionRagSeed } from './query-execution-rag-seed';
import { DataRetentionRagSeed } from './data-retention-rag-seed';
import { SchemaRegistryRagSeed } from './schema-registry-rag-seed';
import { AnalyticsRagSeed } from './analytics-rag-seed';
// FLOW-14 RAG seeds
import { Flow14EtlRagSeed } from './etl-data-integration.rag-seed';
// FLOW-15 RAG seeds (R11)
import { Flow15MvpBuilderRagSeed } from './saas-multi-tenancy-mvp-builder.rag-seed';
import { Flow15BillingLifecycleRagSeed } from './saas-multi-tenancy-billing-lifecycle.rag-seed';
import { Flow15PublishingInfraRagSeed } from './saas-multi-tenancy-publishing-infra.rag-seed';
import { Flow15EnterprisePlatformRagSeed } from './saas-multi-tenancy-enterprise-platform.rag-seed';
import { Flow15AiAddonsRagSeed } from './saas-multi-tenancy-ai-addons.rag-seed';
// FLOW-17 RAG seeds (GAP-17-03/06/07)
import { Flow17IpManagementRagSeed } from './freelancer-marketplace-ip-management.rag-seed';
// FLOW-03 RAG seeds
import { Flow03EventManagementRagSeed } from './event-management.rag-seed';
// FLOW-04 RAG seeds
import { Flow04EventAttendanceRagSeed } from './event-attendance.rag-seed';

@Module({
  providers: [
    CodePatternExtractor,
    SkillIndexer,
    TestPatternIndexer,
    {
      provide: RagIndexerService,
      useFactory: (
        extractor: CodePatternExtractor,
        skillIndexer: SkillIndexer,
        testIndexer: TestPatternIndexer,
      ) => new RagIndexerService(extractor, skillIndexer, testIndexer),
      inject: [CodePatternExtractor, SkillIndexer, TestPatternIndexer],
    },
    // FLOW-10 RAG seeds (R1-1_F10)
    ReviewsRagSeed,
    ModerationRagSeed,
    ReputationRagSeed,
    ReviewResponseRagSeed,
    // FLOW-13 RAG seeds
    WarehouseIngestionRagSeed,
    QueryExecutionRagSeed,
    DataRetentionRagSeed,
    SchemaRegistryRagSeed,
    AnalyticsRagSeed,
    // FLOW-14 RAG seeds
    Flow14EtlRagSeed,
    // FLOW-15 RAG seeds (R11)
    Flow15MvpBuilderRagSeed,
    Flow15BillingLifecycleRagSeed,
    Flow15PublishingInfraRagSeed,
    Flow15EnterprisePlatformRagSeed,
    Flow15AiAddonsRagSeed,
    // FLOW-17 RAG seeds (GAP-17-03/06/07)
    Flow17IpManagementRagSeed,
    // FLOW-03 RAG seeds
    Flow03EventManagementRagSeed,
    // FLOW-04 RAG seeds
    Flow04EventAttendanceRagSeed,
  ],
  exports: [
    RagIndexerService,
    CodePatternExtractor,
    ReviewsRagSeed,
    ModerationRagSeed,
    ReputationRagSeed,
    ReviewResponseRagSeed,
    WarehouseIngestionRagSeed,
    QueryExecutionRagSeed,
    DataRetentionRagSeed,
    SchemaRegistryRagSeed,
    AnalyticsRagSeed,
    Flow14EtlRagSeed,
    // FLOW-15 RAG seeds (R11)
    Flow15MvpBuilderRagSeed,
    Flow15BillingLifecycleRagSeed,
    Flow15PublishingInfraRagSeed,
    Flow15EnterprisePlatformRagSeed,
    Flow15AiAddonsRagSeed,
    // FLOW-17 RAG seeds (GAP-17-03/06/07)
    Flow17IpManagementRagSeed,
    // FLOW-03 RAG seeds
    Flow03EventManagementRagSeed,
    // FLOW-04 RAG seeds
    Flow04EventAttendanceRagSeed,
  ],
})
export class RagInitModule {}
