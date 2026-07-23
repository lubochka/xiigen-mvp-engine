import { FlowWatcherService } from '../../src/engine/flows/flow-watcher.service';
import { buildRound } from '../../src/engine/arbitration/generation-round';

function mockRound(roundNum: number, hasWinner: boolean) {
  return buildRound(roundNum, 'T569', 't1', [
    {
      candidate: {
        model: 'claude',
        code: 'class X {}',
        taskType: 'T569',
        generatedAt: new Date().toISOString(),
      },
      verdicts: [
        {
          arbiterId: 'dna',
          candidateModel: 'claude',
          score: hasWinner ? 85 : 55,
          passed: hasWinner,
          notes: hasWinner ? [] : ['failed'],
          suggestions: [],
        },
      ],
    },
  ]);
}

describe('FlowWatcherService', () => {
  let watcher: FlowWatcherService;

  beforeEach(() => {
    watcher = new FlowWatcherService();
  });

  it('onRoundComplete returns success (no tracker injected)', async () => {
    const result = await watcher.onRoundComplete('DEV-12', mockRound(1, false));
    expect(result.isSuccess).toBe(true);
  });

  it('onSolutionAccepted returns commit_and_close instructions with jiraCardId', async () => {
    const result = await watcher.onSolutionAccepted(
      'DEV-12',
      { model: 'claude', code: 'class X {}', taskType: 'T569' },
      'snap-abc123',
    );
    expect(result.isSuccess).toBe(true);
    expect(result.data!['action']).toBe('commit_and_close');
    expect(result.data!['commitMessage']).toContain('DEV-12');
    expect(result.data!['filename']).toContain('t569');
  });

  it('onLoopStalled returns manual_review_required with failureNotes array', async () => {
    const result = await watcher.onLoopStalled('DEV-12', mockRound(5, false));
    expect(result.isSuccess).toBe(true);
    expect(result.data!['action']).toBe('manual_review_required');
    expect(Array.isArray(result.data!['failureNotes'])).toBe(true);
    expect(result.data!['roundsCompleted']).toBe(5);
  });
});

// FLOW_0A_DEFINITION tests removed — flow-0a was removed from the engine.
