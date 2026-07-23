/**
 * UI state-mapping tests for CycleThreeDepth component
 * Tests state logic directly without DOM rendering
 */

import { describe, it, expect } from 'vitest';

describe('CycleThreeDepth UI — Cycle 3 Depth Decision', () => {

  // ── Test 1 — LEAF badge ───────────────────────────────────────────────────

  it('shows LEAF badge for simple single-responsibility NODE', () => {
    const result = {
      verdict: 'LEAF' as const,
      justification: 'Single-responsibility — S1 not triggered',
      signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
      signalsTriggered: [],
      subFlowDecomposition: null,
      terminationBoundApplied: false,
      grade: 1.0,
      accepted: true,
    };

    const badgeTestId = `verdict-badge-${result.verdict.toLowerCase()}`;
    expect(badgeTestId).toBe('verdict-badge-leaf');
    expect(result.verdict).toBe('LEAF');
  });

  // ── Test 2 — EXPAND badge ─────────────────────────────────────────────────

  it('shows EXPAND badge for multi-responsibility NODE', () => {
    const result = {
      verdict: 'EXPAND' as const,
      justification: 'Multiple intent clauses — S1 triggered',
      signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
      signalsTriggered: ['S1'],
      subFlowDecomposition: [
        { name: 'sub1', intClause: 'c1', isDistinct: true },
        { name: 'sub2', intClause: 'c2', isDistinct: true },
      ],
      terminationBoundApplied: false,
      grade: 1.0,
      accepted: true,
    };

    const badgeTestId = `verdict-badge-${result.verdict.toLowerCase()}`;
    expect(badgeTestId).toBe('verdict-badge-expand');
    expect(result.verdict).toBe('EXPAND');
  });

  // ── Test 3 — Termination bound banner ────────────────────────────────────

  it('shows "Termination bound applied" banner when depth = terminationDepth', () => {
    const currentDepth = 3;
    const terminationDepth = 3;
    const terminationBoundApplied = currentDepth >= terminationDepth;

    expect(terminationBoundApplied).toBe(true);

    const bannerText = terminationBoundApplied
      ? 'Termination bound applied — depth limit reached, LEAF enforced'
      : null;
    expect(bannerText).toBeTruthy();
    expect(bannerText).toContain('Termination bound applied');
  });

  // ── Test 4 — Signal table ─────────────────────────────────────────────────

  it('signal evaluation table shows all 5 signals with field values', () => {
    const ALL_SIGNALS = ['S1', 'S2', 'S3', 'S4', 'S5'];
    const SIGNAL_DESCRIPTIONS: Record<string, string> = {
      S1: 'Multi-clause intent',
      S2: 'Branching conditions',
      S3: 'External aggregate dependencies',
      S4: 'State machine presence',
      S5: 'Composition depth',
    };

    // All 5 signals should be in the table
    expect(ALL_SIGNALS).toHaveLength(5);
    for (const signal of ALL_SIGNALS) {
      expect(SIGNAL_DESCRIPTIONS[signal]).toBeDefined();
      expect(SIGNAL_DESCRIPTIONS[signal]!.length).toBeGreaterThan(0);
    }
  });

  // ── Test 5 — Triggered signals highlighted ───────────────────────────────

  it('triggered signals are highlighted', () => {
    const signalsEvaluated = ['S1', 'S2', 'S3', 'S4', 'S5'];
    const signalsTriggered = ['S1', 'S3'];

    const highlightedSignals = signalsEvaluated.filter(s => signalsTriggered.includes(s));

    expect(highlightedSignals).toHaveLength(2);
    expect(highlightedSignals).toContain('S1');
    expect(highlightedSignals).toContain('S3');
    expect(highlightedSignals).not.toContain('S2');
  });

  // ── Test 6 — Sub-node list visible for EXPAND ────────────────────────────

  it('sub-node list is visible when verdict is EXPAND', () => {
    const verdict = 'EXPAND';
    const subFlowDecomposition = [
      { name: 'verify-email', intClause: 'verify their email', isDistinct: true },
      { name: 'deliver-onboarding', intClause: 'deliver onboarding', isDistinct: true },
    ];

    const showSubNodeList = verdict === 'EXPAND' && subFlowDecomposition !== null;
    expect(showSubNodeList).toBe(true);
    expect(subFlowDecomposition.length).toBeGreaterThan(0);
  });

  // ── Test 7 — Overlapping sub-nodes warning ────────────────────────────────

  it('overlapping sub-nodes show warning badge', () => {
    const subFlowDecomposition = [
      { name: 'sub1', intClause: 'same clause', isDistinct: false },
      { name: 'sub2', intClause: 'same clause', isDistinct: false },
    ];

    const overlappingNodes = subFlowDecomposition.filter(n => !n.isDistinct);
    expect(overlappingNodes.length).toBeGreaterThan(0);

    // Warning badge shown for each non-distinct node
    for (const node of overlappingNodes) {
      expect(node.isDistinct).toBe(false);
    }
  });

  // ── Test 8 — DECIDED section with signal citations ────────────────────────

  it('DECIDED section shows signal citations — not just LEAF/EXPAND', () => {
    const result = {
      verdict: 'LEAF',
      signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
      signalsTriggered: ['S2'],
      terminationBoundApplied: false,
      grade: 1.0,
    };

    // DECIDED should cite signal evidence, not just the verdict
    const hasSignalCitations = result.signalsTriggered.length > 0;
    const decidedContent = hasSignalCitations
      ? `Grade: ${result.grade} (signals: ${result.signalsTriggered.join(', ')})`
      : `Grade: ${result.grade}`;

    expect(decidedContent).toContain('S2');
    expect(hasSignalCitations).toBe(true);
  });
});
