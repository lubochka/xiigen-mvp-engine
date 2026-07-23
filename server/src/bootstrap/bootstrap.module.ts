/**
 * BootstrapModule — NestJS module for startup sequence and health reporting.
 *
 * Provides: BootstrapSequence, HealthReporter.
 * Exports: BootstrapSequence, HealthReporter.
 *
 * Phase 9.4: Bootstrap module wiring.
 * Phase A-0 CF-1: Added BootstrapSeeder + InMemoryIdempotencyStore binding.
 */

import { Module } from '@nestjs/common';
import { HealthReporter } from './health-reporter';
import { BootstrapSequence } from './bootstrap-sequence';
import { BootstrapSeeder } from './bootstrap-seeder.service';
import { InMemoryIdempotencyStore } from '../kernel/multi-tenant/idempotency-store.memory';
import { IDEMPOTENCY_STORE } from '../kernel/multi-tenant/idempotency.types';
import { BootstrapFromDocumentsService } from './bootstrap-from-documents.service';
import { ArchPhilosophyRetriever } from './arch-philosophy-retriever.service';
import { PhilosophyPatternSummarizer } from './philosophy-pattern-summarizer.service';
import { HistoryBootstrapOrchestrator } from './history-bootstrap-orchestrator.service';

@Module({
  providers: [
    HealthReporter,
    {
      provide: BootstrapSequence,
      useFactory: (healthReporter: HealthReporter) => new BootstrapSequence({ healthReporter }),
      inject: [HealthReporter],
    },
    // CF-1: Idempotency store for BootstrapSeeder (in-memory default; swap to Redis in production)
    { provide: InMemoryIdempotencyStore, useClass: InMemoryIdempotencyStore },
    { provide: IDEMPOTENCY_STORE, useExisting: InMemoryIdempotencyStore },
    // CF-1: BootstrapSeeder wired — NestJS injects DATABASE_SERVICE (@Global) + IDEMPOTENCY_STORE
    BootstrapSeeder,
    // FLOW-45: Phase A-D services
    BootstrapFromDocumentsService,
    ArchPhilosophyRetriever,
    PhilosophyPatternSummarizer,
    HistoryBootstrapOrchestrator,
  ],
  exports: [
    BootstrapSequence,
    HealthReporter,
    BootstrapSeeder,
    BootstrapFromDocumentsService,
    ArchPhilosophyRetriever,
    PhilosophyPatternSummarizer,
    HistoryBootstrapOrchestrator,
  ],
})
export class BootstrapModule {}
