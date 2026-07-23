import 'reflect-metadata';
import { RunAnalysisFormatter, RunAnalysisMeta } from './run-analysis-formatter.service';
import { CycleChainOutput } from './cycle-chain.service';

// ── Mock CycleChainOutput ─────────────────────────────────────────────────────

const mockOutput: CycleChainOutput = {
  runId: 'test-run-123',
  flowId: 'FLOW-01',
  grade: 0.91,
  totalCostUsd: 0.14,
  planSteps: [{ index: 1, text: 'Verify email uniqueness', intClause: 'verify email' }],
  leafNodes: [{}],
  topology: [{ stepText: 'Verify email uniqueness', verdict: 'LEAF', depth: 1, children: [] }],
  cycles: {
    cycle1: {
      grade: 0.91,
      accepted: true,
      plannerModel: 'gemini-2.5-flash-lite',
      reviewerModel: 'gemini-2.5-flash-lite',
      tokensUsed: { input: 420, output: 890 },
      costUsd: 0.002,
      promptSent: {
        system: 'You are an expert abstract flow planner for the XIIGen engine.',
        user: 'USER INTENT: When a user registers, verify their email.',
      },
      planSteps: [{ index: 1, text: 'Verify email uniqueness', intClause: 'verify email' }],
      reviewerGaps: [],
    },
    cycle2: [
      {
        stepText: 'Verify email uniqueness',
        depth: 0,
        nodeIntent: 'Verify email uniqueness',
        grade: 0.87,
        accepted: true,
        roundsCompleted: 3,
        stagnationFired: true,
        cycle4Id: 'mock-cycle4-uuid',
        winnerModel: 'mock-gemini',
        winnerSelfScore: 8.7,
        arbiters: [{ name: 'IronRules', verdict: 'PASS', detail: 'All constraints met' }],
        promptSent: {
          nodePrompt: 'Build a user registration node that verifies email uniqueness.',
          judgeSystemPrompt: 'Evaluate this NODE specification you just produced.',
        },
        rounds: [
          {
            round: 1,
            chosen: { model: 'mock-gemini', score: 7.1, text: '{"structure":{}}' },
            rejected: { model: 'mock-openai', score: 6.8, text: '{}' },
            discarded: { model: 'mock-claude', score: 6.2, text: '{}' },
          },
          {
            round: 2,
            chosen: { model: 'mock-gemini', score: 8.1, text: '{"structure":{}}' },
            rejected: { model: 'mock-openai', score: 7.5, text: '{}' },
            discarded: null,
          },
          {
            round: 3,
            chosen: { model: 'mock-gemini', score: 8.7, text: '{"structure":{}}' },
            rejected: { model: 'mock-openai', score: 8.6, text: '{}' },
            discarded: null,
          },
        ],
      },
    ],
    cycle3: [
      {
        stepText: 'Verify email uniqueness',
        depth: 0,
        verdict: 'LEAF',
        signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
        signalsTriggered: [],
        terminationBoundApplied: false,
        promptSent: 'depth decision prompt text',
      },
    ],
  },
  pendingImplementations: [
    {
      cycle4Id: 'mock-cycle4-uuid',
      stepText: 'Verify email uniqueness',
      depth: 0,
      nodeIntent: 'Verify email uniqueness',
      nodeSpec: {
        structure: { inputShape: ['email'], outputShape: ['uniquenessStatus'] },
        intent: { purpose: 'Verify email uniqueness' },
        constraints: ['No typed models'],
        quality: { acceptanceThreshold: 0.85 },
      },
      targetGrade: 0.95,
      status: 'PENDING_IMPLEMENTATION',
    },
  ],
  cycleTraces: [],
};

const mockMeta: RunAnalysisMeta = {
  flowId: 'FLOW-01',
  flowTitle: 'User Registration Flow',
  userIntent: 'When a user registers, verify their email and grant access.',
  runDate: '2026-04-06T13:00:00Z',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RunAnalysisFormatter', () => {
  let formatter: RunAnalysisFormatter;

  beforeEach(() => {
    formatter = new RunAnalysisFormatter();
  });

  it('produces a document with all 9 phase sections', () => {
    const doc = formatter.format(mockOutput, mockMeta);
    expect(doc).toContain('## PHASE A');
    expect(doc).toContain('## PHASE B');
    expect(doc).toContain('## PHASE C');
    expect(doc).toContain('## PHASE D');
    expect(doc).toContain('## PHASE E');
    expect(doc).toContain('## PHASE F');
    expect(doc).toContain('## PHASE G');
    expect(doc).toContain('## PHASE H');
    expect(doc).toContain('## OPEN ISSUES');
  });

  it('includes full prompts — not truncated', () => {
    const longPrompt = 'A'.repeat(2000);
    const out: CycleChainOutput = {
      ...mockOutput,
      cycles: {
        ...mockOutput.cycles,
        cycle1: {
          ...mockOutput.cycles.cycle1,
          promptSent: { system: longPrompt, user: longPrompt },
        },
      },
    };
    const doc = formatter.format(out, mockMeta);
    // Both system and user prompts appear in full (each 2000 chars)
    expect(doc.split(longPrompt).length - 1).toBe(2);
  });

  it('round table has one row per round', () => {
    const doc = formatter.format(mockOutput, mockMeta);
    const rounds = mockOutput.cycles.cycle2[0]!.rounds.length; // 3
    // Count data rows in round table — each starts with `| {number} |`
    const matches = doc.match(/\|\s+\d+\s+\|/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(rounds);
  });

  it('PASS verdict when grade >= 0.85 and nodes accepted', () => {
    const doc = formatter.format({ ...mockOutput, grade: 0.91 }, mockMeta);
    expect(doc).toContain('Status: PASS ✅');
  });

  it('FAIL verdict and open issue when grade < 0.85', () => {
    const lowGradeOutput: CycleChainOutput = {
      ...mockOutput,
      grade: 0.72,
      cycles: {
        ...mockOutput.cycles,
        cycle1: { ...mockOutput.cycles.cycle1, grade: 0.72, accepted: false },
      },
    };
    const doc = formatter.format(lowGradeOutput, mockMeta);
    expect(doc).toContain('Status: FAIL 🔴');
    expect(doc).toContain('## OPEN ISSUES');
    // Phase B grade below 0.85 → auto-flagged in Open Issues
    expect(doc).toContain('Plan grade');
  });

  it('includes CYCLE-4 ID and Claude Code instruction in Phase G', () => {
    const doc = formatter.format(mockOutput, mockMeta);
    expect(doc).toContain(mockOutput.pendingImplementations[0]!.cycle4Id);
    expect(doc).toContain('PATCH /api/cycle-4/');
    expect(doc).toContain('Claude Code instruction');
  });

  it('round table has Discarded column header', () => {
    const doc = formatter.format(mockOutput, mockMeta);
    expect(doc).toContain('| Discarded | Score |');
  });

  it('round table shows discarded model when present and — when null', () => {
    const doc = formatter.format(mockOutput, mockMeta);
    // Round 1 has discarded=mock-claude
    expect(doc).toContain('`mock-claude`');
    // Rounds 2 and 3 have discarded=null → rendered as —
    expect(doc).toContain('| — | — |');
  });

  it('best NODE code block appears in Phase C after arbiter verdicts', () => {
    const doc = formatter.format(mockOutput, mockMeta);
    expect(doc).toContain('#### Best NODE output');
    expect(doc).toContain('```typescript');
    // best round is round 3 (score 8.7) — its text is '{"structure":{}}'
    expect(doc).toContain('{"structure":{}}');
  });

  it('score analysis includes per-provider attribution', () => {
    const doc = formatter.format(mockOutput, mockMeta);
    // mock-gemini wins all 3 rounds
    expect(doc).toContain('`mock-gemini` 3W');
    // mock-openai has 0 wins
    expect(doc).toContain('`mock-openai` 0W');
    // Provider attribution line present
    expect(doc).toContain('Provider attribution:');
  });

  it('Phase A shows provider pool table with all three providers', () => {
    const doc = formatter.format(mockOutput, mockMeta);
    expect(doc).toContain('## PHASE A');
    expect(doc).toContain('| Provider |');
    // All three providers appear in Phase A
    expect(doc).toContain('`mock-gemini`');
    expect(doc).toContain('`mock-openai`');
    expect(doc).toContain('`mock-claude`');
  });

  it('Phase H shows OSS curriculum query links for the flowId', () => {
    const doc = formatter.format(mockOutput, mockMeta);
    expect(doc).toContain('## PHASE H');
    expect(doc).toContain('xiigen-oss-curriculum-runs');
    expect(doc).toContain(mockOutput.flowId);
  });
});
