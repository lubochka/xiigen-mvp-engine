/**
 * GovernanceModule — Phase 5 graph mutation governance layer.
 *
 * Provides 4 governance services:
 *   - TopManagerGapDetectorService: detects knowledge gaps, creates proposals
 *   - MutationScreenerService: 3-check pre-simulation screener
 *   - CrossModelSimulatorService: V9-002 cross-model simulation gate
 *   - RejectionReasonService: rejection tracking + mutation application + rollback
 *
 * EdgeVersioningService lives in the learning/ folder and is registered separately
 * in GraphModule (it needs DATABASE_SERVICE and GRAPH_RAG_SERVICE from fabric layer).
 *
 * All governance services use DATABASE_SERVICE + GRAPH_RAG_SERVICE from
 * FabricsModule (@Global) — no additional imports needed.
 */

import { Module } from '@nestjs/common';
import { TopManagerGapDetectorService } from './top-manager-gap-detector.service';
import { MutationScreenerService } from './mutation-screener.service';
import { CrossModelSimulatorService } from './cross-model-simulator.service';
import { RejectionReasonService } from './rejection-reason.service';

@Module({
  providers: [
    TopManagerGapDetectorService,
    MutationScreenerService,
    CrossModelSimulatorService,
    RejectionReasonService,
  ],
  exports: [
    TopManagerGapDetectorService,
    MutationScreenerService,
    CrossModelSimulatorService,
    RejectionReasonService,
  ],
})
export class GovernanceModule {}
