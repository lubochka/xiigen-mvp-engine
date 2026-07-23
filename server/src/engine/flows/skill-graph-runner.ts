/**
 * Flow0ARunner — wires ArbitrationLoopController + FlowWatcherService for FLOW-0A.
 *
 * Claude Code's role: WATCHER ONLY.
 * - Does NOT write generation code.
 * - Does NOT write arbitration logic.
 * - Runs the loop, observes each round, and commits or escalates based on result.
 *
 * Integration:
 *   1. Accepts candidates[] factory (injected by the engine — Claude Code does not write this)
 *   2. Calls ArbitrationLoopController.run() with onRoundEnd → FlowWatcherService.onRoundComplete
 *   3. On accepted: calls FlowWatcherService.onSolutionAccepted → returns commit instructions
 *   4. On stalled: calls FlowWatcherService.onLoopStalled → returns manual_review_required
 *
 * DNA-3: DataProcessResult — never throws for business logic.
 * DNA-4: Extends MicroserviceBase.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ArbitrationLoopController, LoopInput } from '../arbitration/arbitration-loop.controller';
import { Candidate } from '../arbitration/generation-round';
import { FlowWatcherService } from './flow-watcher.service';
import {
  IProjectTrackerService,
  PROJECT_TRACKER_SERVICE,
} from '../../fabrics/interfaces/project-tracker.interface';

export interface Flow0ARunInput {
  /** Jira/Linear card ID for this run (e.g. 'DEV-12'). */
  readonly jiraCardId: string;
  /** Task type being generated (T577, T578, or T579). */
  readonly taskType: string;
  /** Tenant ID (used for multi-tenant isolation). */
  readonly tenantId: string;
  /** Genesis prompt for round 1. */
  readonly genesisPrompt: string;
  /** Maximum rounds before stalling. */
  readonly maxRounds: number;
  /** Candidate generator — injected by the engine, NOT written by Claude Code. */
  readonly candidates: () => Promise<Candidate[]>;
}

export interface Flow0ARunResult {
  /** Whether a winning candidate was accepted. */
  readonly accepted: boolean;
  /** Commit/escalation instructions from FlowWatcherService. */
  readonly instructions: Record<string, unknown>;
  /** Total rounds completed. */
  readonly roundsCompleted: number;
  /** Snapshot ID created on acceptance (if accepted). */
  readonly snapshotId: string | null;
}

@Injectable()
export class Flow0ARunner {
  private readonly watcher: FlowWatcherService;

  constructor(
    private readonly loop: ArbitrationLoopController,
    @Optional()
    @Inject(PROJECT_TRACKER_SERVICE)
    tracker?: IProjectTrackerService,
  ) {
    this.watcher = new FlowWatcherService(tracker);
  }

  /**
   * Run FLOW-0A for a single task type.
   * Claude Code calls this — it is a watcher, not a generator.
   */
  async run(input: Flow0ARunInput): Promise<DataProcessResult<Flow0ARunResult>> {
    const loopInput: LoopInput = {
      taskType: input.taskType,
      tenantId: input.tenantId,
      initialPrompt: input.genesisPrompt,
      maxRounds: input.maxRounds,
      candidates: input.candidates,
      onRoundEnd: async (round) => {
        await this.watcher.onRoundComplete(input.jiraCardId, round);
      },
      // T583: unique run ID for context block scoping and pool queries
      runId: randomUUID(),
    };

    const loopResult = await this.loop.run(loopInput);
    if (!loopResult.isSuccess) {
      return DataProcessResult.failure(loopResult.errorCode!, loopResult.errorMessage!);
    }

    const result = loopResult.data!;

    if (result.accepted && result.winner) {
      const snapshotId = `snap-${input.taskType.toLowerCase()}-${Date.now()}`;
      const watcherResult = await this.watcher.onSolutionAccepted(
        input.jiraCardId,
        result.winner,
        snapshotId,
      );
      if (!watcherResult.isSuccess) {
        return DataProcessResult.failure(watcherResult.errorCode!, watcherResult.errorMessage!);
      }
      return DataProcessResult.success({
        accepted: true,
        instructions: watcherResult.data!,
        roundsCompleted: result.roundsCompleted,
        snapshotId,
      });
    }

    // Stalled — escalate to manual review
    const watcherResult = await this.watcher.onLoopStalled(input.jiraCardId, result.finalRound);
    if (!watcherResult.isSuccess) {
      return DataProcessResult.failure(watcherResult.errorCode!, watcherResult.errorMessage!);
    }
    return DataProcessResult.success({
      accepted: false,
      instructions: watcherResult.data!,
      roundsCompleted: result.roundsCompleted,
      snapshotId: null,
    });
  }
}
