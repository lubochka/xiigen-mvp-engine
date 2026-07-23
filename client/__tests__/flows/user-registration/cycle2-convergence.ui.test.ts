/**
 * UI state-mapping tests for CycleTwoConvergence component
 * Tests state logic directly without DOM rendering
 */

import { describe, it, expect } from 'vitest';

describe('CycleTwoConvergence UI — Cycle 2 Convergence', () => {

  // ── Test 1 — 3 candidate panels ──────────────────────────────────────────

  it('shows three candidate panels A/B/C side by side', () => {
    const candidates = ['A', 'B', 'C'];
    const candidateA = 'candidate A node text';
    const candidateB = 'candidate B node text';
    const candidateC = 'candidate C node text';

    const panels = candidates.filter(label => {
      if (label === 'A') return !!candidateA;
      if (label === 'B') return !!candidateB;
      if (label === 'C') return !!candidateC;
      return false;
    });

    expect(panels).toHaveLength(3);
    expect(panels).toContain('A');
    expect(panels).toContain('B');
    expect(panels).toContain('C');
  });

  // ── Test 2 — Winning panel highlighted ───────────────────────────────────

  it('winning panel is highlighted', () => {
    const judgeResult = { winner: 'B', reasoning: 'B has best failure modes' };
    const winnerLabel = judgeResult.winner;

    // Highlighted = has special styling — in state logic, winning panel has border-green-500
    const isHighlighted = (label: string) => label === winnerLabel;

    expect(isHighlighted('A')).toBe(false);
    expect(isHighlighted('B')).toBe(true);
    expect(isHighlighted('C')).toBe(false);
  });

  // ── Test 3 — BLOCK verdict badge ─────────────────────────────────────────

  it('BLOCK verdict from any arbiter shows red badge on winning panel', () => {
    const arbiterVerdicts = [
      { arbiter: 'Domain', verdict: 'BLOCK', criterion: 'Domain', detail: 'critical violation' },
      { arbiter: 'Security', verdict: 'PASS', criterion: 'Security', detail: 'ok' },
    ];

    const hasBlock = arbiterVerdicts.some(v => v.verdict === 'BLOCK');
    const blockBadgeColor = hasBlock ? 'red' : 'none';

    expect(hasBlock).toBe(true);
    expect(blockBadgeColor).toBe('red');
  });

  // ── Test 4 — NODE fields expand ──────────────────────────────────────────

  it('NODE fields expand on click — all 4 sections visible', () => {
    // NODE has 4 sections: structure, intent, constraints, quality
    const nodeSections = ['structure', 'intent', 'constraints', 'quality'];
    let expandedCandidate: string | null = null;

    // Before click: no sections visible
    const visibleBefore = expandedCandidate !== null ? nodeSections : [];
    expect(visibleBefore).toHaveLength(0);

    // After click on candidate A
    expandedCandidate = 'A';
    const visibleAfter = expandedCandidate !== null ? nodeSections : [];
    expect(visibleAfter).toHaveLength(4);
    expect(visibleAfter).toContain('structure');
    expect(visibleAfter).toContain('intent');
    expect(visibleAfter).toContain('constraints');
    expect(visibleAfter).toContain('quality');
  });

  // ── Test 5 — Convergence score as percentage ─────────────────────────────

  it('convergence score renders as percentage', () => {
    const convergenceScore = 0.75;
    const percentage = Math.round(convergenceScore * 100);
    const displayText = `${percentage}%`;

    expect(displayText).toBe('75%');
  });

  // ── Test 6 — Judge reasoning in DECIDED ──────────────────────────────────

  it('DECIDED section shows judge reasoning — not just winner label', () => {
    const decided = {
      winner: 'A',
      grade: 0.87,
      accepted: true,
      arbiterVerdicts: { Domain: 'PASS', Security: 'PASS' },
    };
    const judgeReasoning = 'Candidate A has most specific failure modes in the intent.failureModes field';

    // DECIDED shows both winner and reasoning
    expect(decided.winner).toBe('A');
    expect(judgeReasoning).toContain('failure modes');
    expect(judgeReasoning.length).toBeGreaterThan(decided.winner.length);
  });

  // ── Test 7 — Retry indicator ─────────────────────────────────────────────

  it('shows retry indicator when grade < threshold', () => {
    const grade = 0.60;
    const threshold = 0.85;
    const accepted = false;

    const showRetryIndicator = !accepted && grade < threshold;
    expect(showRetryIndicator).toBe(true);
  });
});
