/**
 * FLOW-38 Phase B+C — RAG Quality UI Tests.
 *
 * 24 tests in 5 groups:
 *   RQ-1..RQ-6:   RagQualityBadge — score tiers + aria labels
 *   RQ-7..RQ-12:  CycleOutcomeTag — outcome variants + data attributes
 *   RQ-13..RQ-18: DistilledRuleCard — content + traceability fields
 *   RQ-19..RQ-22: RagQualityScreen — patterns list + outcomes list + empty states
 *   RQ-23..RQ-24: RagQualityScreen — mixed data integration
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { RagQualityBadge, getQualityTier } from '../../src/components/rag-quality/RagQualityBadge';
import { CycleOutcomeTag } from '../../src/components/rag-quality/CycleOutcomeTag';
import { DistilledRuleCard, type DistilledRule } from '../../src/components/rag-quality/DistilledRuleCard';
import { RagQualityScreen, type RagPatternRecord, type CycleOutcomeRecord } from '../../src/components/rag-quality/RagQualityScreen';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const highPattern: RagPatternRecord = {
  patternId: 'PAT-HIGH',
  patternType: 'PROMOTED_DPO',
  qualityScore: 0.92,
  flowId: 'FLOW-38',
};

const mediumPattern: RagPatternRecord = {
  patternId: 'PAT-MED',
  patternType: 'NODE_REPRESENTATION',
  qualityScore: 0.65,
  flowId: 'FLOW-01',
};

const lowPattern: RagPatternRecord = {
  patternId: 'PAT-LOW',
  patternType: 'FLOW_DESIGN',
  qualityScore: 0.30,
  flowId: 'FLOW-38',
};

const successOutcome: CycleOutcomeRecord = {
  cycleId: 'CYCLE-001',
  outcome: 'SUCCESS_WITHIN_BUDGET',
  flowId: 'FLOW-38',
  createdAt: '2026-04-10T10:00:00Z',
};

const wastedOutcome: CycleOutcomeRecord = {
  cycleId: 'CYCLE-002',
  outcome: 'WASTED_CYCLE',
  flowId: 'FLOW-38',
  createdAt: '2026-04-10T10:01:00Z',
};

const escalationOutcome: CycleOutcomeRecord = {
  cycleId: 'CYCLE-003',
  outcome: 'ESCALATION_REQUIRED',
  flowId: 'FLOW-38',
  createdAt: '2026-04-10T10:02:00Z',
};

const sampleRule: DistilledRule = {
  ruleId:   'DR-CYCLE-001-1',
  ruleText: 'CF-801: idempotency check (cycleId, patternId) before any delta write',
  cycleId:  'CYCLE-001',
  flowId:   'FLOW-38',
};

// ── RagQualityBadge (RQ-1..RQ-6) ────────────────────────────────────────────

describe('RagQualityBadge', () => {

  it('RQ-1: score >= 0.85 → tier "high"', () => {
    expect(getQualityTier(0.85)).toBe('high');
    expect(getQualityTier(1.00)).toBe('high');
    expect(getQualityTier(0.92)).toBe('high');
  });

  it('RQ-2: score 0.5–0.84 → tier "medium"', () => {
    expect(getQualityTier(0.50)).toBe('medium');
    expect(getQualityTier(0.75)).toBe('medium');
    expect(getQualityTier(0.84)).toBe('medium');
  });

  it('RQ-3: score < 0.5 → tier "low"', () => {
    expect(getQualityTier(0.49)).toBe('low');
    expect(getQualityTier(0.00)).toBe('low');
  });

  it('RQ-4: renders score as percentage display', () => {
    render(<RagQualityBadge patternId="PAT-001" qualityScore={0.92} />);
    expect(screen.getByTestId('quality-badge-PAT-001')).toHaveTextContent('92%');
  });

  it('RQ-5: data-quality-tier attribute matches computed tier', () => {
    render(<RagQualityBadge patternId="PAT-MED" qualityScore={0.65} />);
    const badge = screen.getByTestId('quality-badge-PAT-MED');
    expect(badge).toHaveAttribute('data-quality-tier', 'medium');
  });

  it('RQ-6: aria-label contains score percentage', () => {
    render(<RagQualityBadge patternId="PAT-LOW" qualityScore={0.30} />);
    const badge = screen.getByTestId('quality-badge-PAT-LOW');
    expect(badge).toHaveAttribute('aria-label', 'Quality score: 30%');
  });

});

// ── CycleOutcomeTag (RQ-7..RQ-12) ───────────────────────────────────────────

describe('CycleOutcomeTag', () => {

  it('RQ-7: SUCCESS_WITHIN_BUDGET renders "Success" label', () => {
    render(<CycleOutcomeTag cycleId="C-001" outcome="SUCCESS_WITHIN_BUDGET" />);
    expect(screen.getByTestId('outcome-tag-C-001')).toHaveTextContent('Success');
  });

  it('RQ-8: WASTED_CYCLE renders "Wasted" label', () => {
    render(<CycleOutcomeTag cycleId="C-002" outcome="WASTED_CYCLE" />);
    expect(screen.getByTestId('outcome-tag-C-002')).toHaveTextContent('Wasted');
  });

  it('RQ-9: ESCALATION_REQUIRED renders "Escalate" label', () => {
    render(<CycleOutcomeTag cycleId="C-003" outcome="ESCALATION_REQUIRED" />);
    expect(screen.getByTestId('outcome-tag-C-003')).toHaveTextContent('Escalate');
  });

  it('RQ-10: data-outcome attribute set to outcome value', () => {
    render(<CycleOutcomeTag cycleId="C-004" outcome="SUCCESS_WITHIN_BUDGET" />);
    expect(screen.getByTestId('outcome-tag-C-004')).toHaveAttribute('data-outcome', 'SUCCESS_WITHIN_BUDGET');
  });

  it('RQ-11: WASTED_CYCLE has correct CSS class', () => {
    render(<CycleOutcomeTag cycleId="C-005" outcome="WASTED_CYCLE" />);
    const tag = screen.getByTestId('outcome-tag-C-005');
    expect(tag).toHaveClass('cycle-outcome-tag--wasted-cycle');
  });

  it('RQ-12: SUCCESS_WITHIN_BUDGET has correct CSS class', () => {
    render(<CycleOutcomeTag cycleId="C-006" outcome="SUCCESS_WITHIN_BUDGET" />);
    const tag = screen.getByTestId('outcome-tag-C-006');
    expect(tag).toHaveClass('cycle-outcome-tag--success-within-budget');
  });

});

// ── DistilledRuleCard (RQ-13..RQ-18) ────────────────────────────────────────

describe('DistilledRuleCard', () => {

  it('RQ-13: renders rule text', () => {
    render(<DistilledRuleCard rule={sampleRule} />);
    expect(screen.getByTestId(`rule-text-${sampleRule.ruleId}`)).toHaveTextContent(sampleRule.ruleText);
  });

  it('RQ-14: renders cycleId (CF-802 traceability)', () => {
    render(<DistilledRuleCard rule={sampleRule} />);
    expect(screen.getByTestId(`rule-cycle-${sampleRule.ruleId}`)).toHaveTextContent(sampleRule.cycleId);
  });

  it('RQ-15: renders flowId', () => {
    render(<DistilledRuleCard rule={sampleRule} />);
    expect(screen.getByTestId(`rule-flow-${sampleRule.ruleId}`)).toHaveTextContent(sampleRule.flowId);
  });

  it('RQ-16: data-rule-id attribute set', () => {
    render(<DistilledRuleCard rule={sampleRule} />);
    expect(screen.getByTestId(`rule-card-${sampleRule.ruleId}`)).toHaveAttribute('data-rule-id', sampleRule.ruleId);
  });

  it('RQ-17: data-cycle-id attribute matches cycleId (CF-802)', () => {
    render(<DistilledRuleCard rule={sampleRule} />);
    expect(screen.getByTestId(`rule-card-${sampleRule.ruleId}`)).toHaveAttribute('data-cycle-id', sampleRule.cycleId);
  });

  it('RQ-18: renders without error for minimal rule', () => {
    const minimalRule: DistilledRule = {
      ruleId: 'DR-MIN', ruleText: 'A rule.', cycleId: 'CYC-MIN', flowId: 'FLOW-01',
    };
    const { container } = render(<DistilledRuleCard rule={minimalRule} />);
    expect(container.firstChild).not.toBeNull();
  });

});

// ── RagQualityScreen (RQ-19..RQ-24) ─────────────────────────────────────────

describe('RagQualityScreen', () => {

  it('RQ-19: empty patterns list shows "No patterns found"', () => {
    render(<RagQualityScreen patterns={[]} outcomes={[successOutcome]} />);
    expect(screen.getByTestId('no-patterns-message')).toHaveTextContent('No patterns found');
  });

  it('RQ-20: empty outcomes list shows "No outcomes recorded"', () => {
    render(<RagQualityScreen patterns={[highPattern]} outcomes={[]} />);
    expect(screen.getByTestId('no-outcomes-message')).toHaveTextContent('No outcomes recorded');
  });

  it('RQ-21: pattern list renders one item per pattern', () => {
    render(<RagQualityScreen patterns={[highPattern, mediumPattern, lowPattern]} outcomes={[]} />);
    const list = screen.getByTestId('pattern-list');
    expect(list.children).toHaveLength(3);
  });

  it('RQ-22: outcome list renders one item per outcome', () => {
    render(<RagQualityScreen patterns={[]} outcomes={[successOutcome, wastedOutcome, escalationOutcome]} />);
    const list = screen.getByTestId('outcome-list');
    expect(list.children).toHaveLength(3);
  });

  it('RQ-23: each pattern row contains RagQualityBadge with correct score', () => {
    render(<RagQualityScreen patterns={[highPattern]} outcomes={[]} />);
    const badge = screen.getByTestId(`quality-badge-${highPattern.patternId}`);
    expect(badge).toHaveAttribute('data-quality-score', String(highPattern.qualityScore));
  });

  it('RQ-24: each outcome row contains CycleOutcomeTag with correct outcome', () => {
    render(<RagQualityScreen patterns={[]} outcomes={[successOutcome]} />);
    const tag = screen.getByTestId(`outcome-tag-${successOutcome.cycleId}`);
    expect(tag).toHaveAttribute('data-outcome', 'SUCCESS_WITHIN_BUDGET');
  });

});
