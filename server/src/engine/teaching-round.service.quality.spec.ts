/**
 * TeachingRoundService — DPO quality integration tests.
 *
 * These tests exercise TeachingRoundService with SkillFaithfulMockProvider instances
 * wired as AI providers. They verify session-level and round-level quality detection
 * that cannot be tested on the mock provider itself (which only returns individual
 * generate() responses; the assembly and quality detection live in the service).
 *
 * Test cases:
 *   1. Normal 3-provider run → sessionQualityFlag = 'OK'
 *   2. SINGLE_WINNER: all 3 providers same model + same score → sessionQualityFlag = 'SINGLE_WINNER'
 *   3. VARIABLE mode: gemini scores rise then plateau → stagnation round gets qualityFlag = 'NOISE_SIGNAL'
 *   4. Score spread ≥ 1.0 on all triples (SK-452): verified via stored triples
 */

import { SkillFaithfulMockProvider } from '../fabrics/ai-engine/providers/skill-faithful-mock.provider';
import { TeachingRoundService } from './teaching-round.service';
import { IDatabaseService } from '../fabrics/interfaces/database.interface';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockDb(): IDatabaseService & { stored: Array<Record<string, unknown>> } {
  const stored: Array<Record<string, unknown>> = [];
  return {
    stored,
    storeDocument: jest.fn(async (_idx, doc) => {
      stored.push(doc);
      return { id: 'mock-id' };
    }),
    searchDocuments: jest.fn(async () => ({ items: [], total: 0 })),
    getDocument: jest.fn(async () => null),
    deleteDocument: jest.fn(async () => {}),
    updateDocument: jest.fn(async () => {}),
    createIndex: jest.fn(async () => {}),
    deleteIndex: jest.fn(async () => {}),
    indexExists: jest.fn(async () => false),
    bulkStore: jest.fn(async () => []),
    count: jest.fn(async () => 0),
  } as unknown as IDatabaseService & { stored: Array<Record<string, unknown>> };
}

const BASE_OPTIONS = {
  nodePrompt: 'Generate a NODE specification for credential capture',
  judgeSystemPrompt: 'You are evaluating a NODE specification you just produced.\nScore 0–10.',
  stepText: 'Capture the identity credential',
  constraints: ['Must not call external services directly', 'Must emit a typed result'],
  minRounds: 3,
  maxRounds: 10,
  stagnationDrift: 0.1,
  flowId: 'FLOW-01',
  runId: 'run-test-001',
  tenantId: 'master',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TeachingRoundService — DPO quality integration', () => {
  // ── 1: Normal 3-provider run → OK ────────────────────────────────────────

  it('normal run with model diversity: sessionQualityFlag = OK (multiple models win)', async () => {
    // Round 1: gemini=7.4 > claude=6.2 > openai=6.0 → gemini wins
    // Round 2: openai=7.8 > gemini=7.4 > claude=6.2 → openai wins
    // Round 3: gemini=7.4 > claude=6.2 > openai=6.0 → gemini wins
    // uniqueWinners = {mock-gemini, mock-openai} → size=2 → 'OK'
    const gemini = new SkillFaithfulMockProvider('mock-gemini'); // constant 7.4
    const openai = new SkillFaithfulMockProvider('mock-openai', {
      variableScores: [6.0, 7.8, 6.0],
    });
    const claude = new SkillFaithfulMockProvider('mock-claude'); // constant 6.2
    const db = makeMockDb();

    const svc = new TeachingRoundService(gemini, openai, claude, db);
    const result = await svc.run({ ...BASE_OPTIONS, minRounds: 3, maxRounds: 3 });

    expect(result.isSuccess).toBe(true);
    const triples = result.data!.triples;
    const uniqueWinners = new Set(triples.map((t) => t.chosen.model));
    expect(uniqueWinners.size).toBeGreaterThan(1); // at least 2 different models won
    expect(result.data!.sessionQualityFlag).toBe('OK');
  });

  // ── 2: SINGLE_WINNER: all 3 providers return same model + score ───────────

  it('SINGLE_WINNER: all 3 providers return mock-gemini model → sessionQualityFlag = SINGLE_WINNER', async () => {
    // All 3 providers use modelId='mock-gemini' so getModelInfo().model_id = 'mock-gemini'
    // and all generate() judge calls return score 7.4 → same model wins every round
    const p1 = new SkillFaithfulMockProvider('mock-gemini');
    const p2 = new SkillFaithfulMockProvider('mock-gemini');
    const p3 = new SkillFaithfulMockProvider('mock-gemini');
    const db = makeMockDb();

    const svc = new TeachingRoundService(p1, p2, p3, db);
    const result = await svc.run({ ...BASE_OPTIONS, minRounds: 2, maxRounds: 3 });

    expect(result.isSuccess).toBe(true);
    // All triples: chosen.model = 'mock-gemini' (same for all 3 providers)
    const triples = result.data!.triples;
    expect(triples.length).toBeGreaterThanOrEqual(1);
    const uniqueWinners = new Set(triples.map((t) => t.chosen.model));
    expect(uniqueWinners.size).toBe(1);
    expect(result.data!.sessionQualityFlag).toBe('SINGLE_WINNER');
  });

  // ── 3: VARIABLE mode — stagnation round gets NOISE_SIGNAL ────────────────

  it('VARIABLE mode: stagnation round tagged NOISE_SIGNAL, earlier rounds are clean', async () => {
    // gemini scores rise then plateau: rounds 1-4 rising, rounds 5+ stable → stagnation at round 5+
    // With minRounds=3 and stagnationDrift=0.1, stagnation fires when last 3 scores drift < 0.1
    const variableScores = [6.5, 7.0, 7.5, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0];
    //  rounds 3,4,5 chosen scores: 7.5, 8.0, 8.0 → drift = 0.5 → no stagnation
    //  rounds 4,5,6 chosen scores: 8.0, 8.0, 8.0 → drift = 0.0 → STAGNATION at round 6
    const gemini = new SkillFaithfulMockProvider('mock-gemini', { variableScores });
    const openai = new SkillFaithfulMockProvider('mock-openai'); // constant 6.0
    const claude = new SkillFaithfulMockProvider('mock-claude'); // constant 6.2
    const db = makeMockDb();

    const svc = new TeachingRoundService(gemini, openai, claude, db);
    const result = await svc.run({
      ...BASE_OPTIONS,
      minRounds: 3,
      maxRounds: 10,
      stagnationDrift: 0.1,
    });

    expect(result.isSuccess).toBe(true);
    const triples = result.data!.triples;

    // Loop stops before maxRounds (stagnation fired early)
    expect(triples.length).toBeLessThan(10);

    // Last round (stagnation trigger) gets NOISE_SIGNAL
    const lastTriple = triples[triples.length - 1]!;
    expect(lastTriple.qualityFlag).toBe('NOISE_SIGNAL');

    // All earlier rounds should not be NOISE_SIGNAL
    const earlyTriples = triples.slice(0, -1);
    for (const t of earlyTriples) {
      expect(t.qualityFlag).not.toBe('NOISE_SIGNAL');
    }
  });

  // ── 4: Score spread ≥ 1.0 on stored triples (SK-452) ────────────────────

  it('SK-452: score spread ≥ 1.0 on all stored DPO triples (gemini=7.4, openai=6.0)', async () => {
    const gemini = new SkillFaithfulMockProvider('mock-gemini'); // 7.4
    const openai = new SkillFaithfulMockProvider('mock-openai'); // 6.0
    const claude = new SkillFaithfulMockProvider('mock-claude'); // 6.2
    const db = makeMockDb();

    const svc = new TeachingRoundService(gemini, openai, claude, db);
    const result = await svc.run({ ...BASE_OPTIONS, minRounds: 2, maxRounds: 3 });

    expect(result.isSuccess).toBe(true);
    const triples = result.data!.triples;
    expect(triples.length).toBeGreaterThanOrEqual(1);

    for (const triple of triples) {
      const spread = triple.chosen.score - triple.rejected.score;
      expect(spread).toBeGreaterThanOrEqual(1.0);
    }
  });
});
