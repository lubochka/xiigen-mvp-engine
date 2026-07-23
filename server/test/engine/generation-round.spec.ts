import { buildRound } from '../../src/engine/arbitration/generation-round';
import { UnanimousVerdictAggregator } from '../../src/engine/arbitration/unanimous-aggregator';

const mockCandidate = (model: string) => ({
  model,
  code: `class ${model}Service {}`,
  taskType: 'T569',
  generatedAt: new Date().toISOString(),
});

const mockVerdict = (arbiterId: string, score: number) => ({
  arbiterId,
  candidateModel: 'mock',
  score,
  passed: score >= 70,
  notes: score < 70 ? [`${arbiterId} failed`] : [],
  suggestions: [],
});

describe('GenerationRound + UnanimousVerdictAggregator', () => {
  const aggregator = new UnanimousVerdictAggregator();

  it('detects unanimous winner when all arbiters pass for one candidate', () => {
    const round = buildRound(1, 'T569', 't1', [
      {
        candidate: mockCandidate('claude'),
        verdicts: [mockVerdict('dna', 88), mockVerdict('fabric', 82)],
      },
      {
        candidate: mockCandidate('gpt4o'),
        verdicts: [mockVerdict('dna', 65), mockVerdict('fabric', 70)],
      },
    ]);

    const result = aggregator.aggregate(round);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.hasWinner).toBe(true);
    expect(result.data!.winner!.candidate.model).toBe('claude');
  });

  it('returns no winner when no candidate passes all arbiters', () => {
    const round = buildRound(1, 'T569', 't1', [
      {
        candidate: mockCandidate('claude'),
        verdicts: [mockVerdict('dna', 88), mockVerdict('fabric', 60)],
      },
      {
        candidate: mockCandidate('gpt4o'),
        verdicts: [mockVerdict('dna', 65), mockVerdict('fabric', 70)],
      },
    ]);

    const result = aggregator.aggregate(round);
    expect(result.data!.hasWinner).toBe(false);
    expect(result.data!.nextRoundNotes.length).toBeGreaterThan(0);
  });

  it('nextRoundNotes contains fabric failure message', () => {
    const round = buildRound(1, 'T569', 't1', [
      {
        candidate: mockCandidate('claude'),
        verdicts: [mockVerdict('dna', 80), mockVerdict('fabric', 55)],
      },
    ]);
    const result = aggregator.aggregate(round);
    expect(result.data!.nextRoundNotes.some((n) => n.includes('fabric'))).toBe(true);
  });

  it('winner is null when candidates array is empty', () => {
    const round = buildRound(1, 'T569', 't1', []);
    expect(round.winner).toBeNull();
  });

  it('bestCandidate has the highest avgScore', () => {
    const round = buildRound(1, 'T569', 't1', [
      { candidate: mockCandidate('model-a'), verdicts: [mockVerdict('dna', 50)] },
      { candidate: mockCandidate('model-b'), verdicts: [mockVerdict('dna', 90)] },
    ]);
    expect(round.bestCandidate.candidate.model).toBe('model-b');
  });

  it('failedArbiters lists only arbiters below threshold', () => {
    const round = buildRound(1, 'T569', 't1', [
      {
        candidate: mockCandidate('c'),
        verdicts: [mockVerdict('dna', 80), mockVerdict('fabric', 40)],
      },
    ]);
    expect(round.candidates[0].failedArbiters).toEqual(['fabric']);
    expect(round.candidates[0].allPassed).toBe(false);
  });
});
