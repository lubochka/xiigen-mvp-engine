/**
 * FlowWatcherService — Claude Code's programmatic watcher interface for FLOW-0A.
 *
 * Claude Code calls these methods after each loop event.
 * Claude Code role: observe, report, commit, update Jira.
 * Claude Code does NOT write generation or arbitration code.
 *
 * DNA-3: DataProcessResult — never throw for business logic.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  IProjectTrackerService,
  PROJECT_TRACKER_SERVICE,
} from '../../fabrics/interfaces/project-tracker.interface';
import { GenerationRound } from '../arbitration/generation-round';

@Injectable()
export class FlowWatcherService {
  constructor(
    @Optional()
    @Inject(PROJECT_TRACKER_SERVICE)
    private readonly tracker?: IProjectTrackerService,
  ) {}

  /** Called after each round completes. Updates Jira card with round summary. */
  async onRoundComplete(
    jiraCardId: string,
    round: GenerationRound,
  ): Promise<DataProcessResult<void>> {
    const winner = round.winner ? round.winner.candidate.model : 'none';
    const note =
      `Round ${round.roundNumber}: best=${round.bestCandidate.candidate.model} ` +
      `(avg ${round.bestCandidate.avgScore.toFixed(1)}), winner=${winner}`;

    if (this.tracker) {
      await this.tracker.addComment(jiraCardId, note);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[WATCHER] ${note}`);
    }
    return DataProcessResult.success(undefined);
  }

  /** Called when loop produces an accepted solution. Returns commit instructions for Claude Code. */
  async onSolutionAccepted(
    jiraCardId: string,
    winner: { model: string; code: string; taskType: string },
    snapshotId: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const instructions: Record<string, unknown> = {
      action: 'commit_and_close',
      filename: `server/src/generated/${winner.taskType.toLowerCase()}.service.ts`,
      commitMessage: `feat: generated ${winner.taskType} via FLOW-0A [${jiraCardId}]`,
      jiraTransition: 'Done',
      snapshotToCreate: { phase: 'accepted', aiProvider: winner.model },
      code: winner.code,
    };

    if (this.tracker) {
      await this.tracker.updateCard(jiraCardId, {
        status: 'done',
        comment: `Solution accepted (model: ${winner.model}). Snapshot: ${snapshotId}`,
      });
    }

    return DataProcessResult.success(instructions);
  }

  /** Called when loop stalls (maxRounds exceeded). Returns manual review instructions. */
  async onLoopStalled(
    jiraCardId: string,
    lastRound: GenerationRound,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const failureNotes = lastRound.bestCandidate.verdicts
      .filter((v) => !v.passed)
      .map((v) => `${v.arbiterId}: ${v.notes.join(', ')}`);

    const instructions: Record<string, unknown> = {
      action: 'manual_review_required',
      jiraCardId,
      roundsCompleted: lastRound.roundNumber,
      failureNotes,
      suggestion:
        'Review arbiter notes above. Adjust genesis prompts or iron rules. Re-trigger flow.',
    };

    if (this.tracker) {
      await this.tracker.addComment(
        jiraCardId,
        `⚠️ STALLED after ${lastRound.roundNumber} rounds. Manual review required.\n${failureNotes.join('\n')}`,
      );
    }

    return DataProcessResult.success(instructions);
  }
}
