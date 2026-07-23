/**
 * FLOW-39 — OSS Curriculum UI Tests.
 *
 * 24 tests in 4 groups:
 *   OC-1..OC-6:   CurriculumTierBadge — tier labels + data attributes + aria
 *   OC-7..OC-12:  ShadowRunStatusCard — CF-804 ossModel + cycleId + status variants
 *   OC-13..OC-18: LearningSignalRow — IRON-3-SIGNAL display (3 signals)
 *   OC-19..OC-24: OssCurriculumScreen — tier list + shadow run list + empty states
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { CurriculumTierBadge } from '../../src/components/oss-curriculum/CurriculumTierBadge';
import { ShadowRunStatusCard } from '../../src/components/oss-curriculum/ShadowRunStatusCard';
import { LearningSignalRow } from '../../src/components/oss-curriculum/LearningSignalRow';
import { OssCurriculumScreen } from '../../src/components/oss-curriculum/OssCurriculumScreen';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const tier1 = { dpoTripleId: 'DPO-001', curriculumTier: 1 };
const tier3 = { dpoTripleId: 'DPO-002', curriculumTier: 3 };
const tier5 = { dpoTripleId: 'DPO-003', curriculumTier: 5 };

const shadowRunPending = {
  shadowRunId: 'SR-001', ossModel: 'llama3:8b', cycleId: 'CYCLE-1', status: 'PENDING' as const,
};
const shadowRunComplete = {
  shadowRunId: 'SR-002', ossModel: 'codellama:13b', cycleId: 'CYCLE-2', status: 'COMPLETE' as const, grade: 0.82,
};

// ── CurriculumTierBadge ────────────────────────────────────────────────────────

describe('OC-1..OC-6: CurriculumTierBadge', () => {

  it('OC-1: tier 1 renders ROUTING label', () => {
    render(<CurriculumTierBadge {...tier1} />);
    expect(screen.getByText(/Tier 1.*Routing/i)).toBeInTheDocument();
  });

  it('OC-2: tier 3 renders PROCESSING label', () => {
    render(<CurriculumTierBadge {...tier3} />);
    expect(screen.getByText(/Tier 3.*Processing/i)).toBeInTheDocument();
  });

  it('OC-3: tier 5 renders SCHEDULED label', () => {
    render(<CurriculumTierBadge {...tier5} />);
    expect(screen.getByText(/Tier 5.*Scheduled/i)).toBeInTheDocument();
  });

  it('OC-4: data-testid contains dpoTripleId', () => {
    render(<CurriculumTierBadge {...tier1} />);
    expect(screen.getByTestId('tier-badge-DPO-001')).toBeInTheDocument();
  });

  it('OC-5: data-tier attribute matches tier number', () => {
    render(<CurriculumTierBadge {...tier3} />);
    const badge = screen.getByTestId('tier-badge-DPO-002');
    expect(badge).toHaveAttribute('data-tier', '3');
  });

  it('OC-6: aria-label includes tier label', () => {
    render(<CurriculumTierBadge {...tier5} />);
    const badge = screen.getByTestId('tier-badge-DPO-003');
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Tier 5'));
  });

});

// ── ShadowRunStatusCard ────────────────────────────────────────────────────────

describe('OC-7..OC-12: ShadowRunStatusCard', () => {

  it('OC-7: CF-804 — ossModel displayed', () => {
    render(<ShadowRunStatusCard {...shadowRunPending} />);
    expect(screen.getByTestId(`shadow-run-model-${shadowRunPending.shadowRunId}`)).toHaveTextContent('llama3:8b');
  });

  it('OC-8: CF-804 — cycleId displayed', () => {
    render(<ShadowRunStatusCard {...shadowRunPending} />);
    expect(screen.getByTestId(`shadow-run-cycle-${shadowRunPending.shadowRunId}`)).toHaveTextContent('CYCLE-1');
  });

  it('OC-9: PENDING status shown', () => {
    render(<ShadowRunStatusCard {...shadowRunPending} />);
    expect(screen.getByTestId(`shadow-run-status-${shadowRunPending.shadowRunId}`)).toHaveTextContent('PENDING');
  });

  it('OC-10: COMPLETE status shown', () => {
    render(<ShadowRunStatusCard {...shadowRunComplete} />);
    expect(screen.getByTestId(`shadow-run-status-${shadowRunComplete.shadowRunId}`)).toHaveTextContent('COMPLETE');
  });

  it('OC-11: grade displayed when present', () => {
    render(<ShadowRunStatusCard {...shadowRunComplete} />);
    expect(screen.getByTestId(`shadow-run-grade-${shadowRunComplete.shadowRunId}`)).toBeInTheDocument();
    expect(screen.getByTestId(`shadow-run-grade-${shadowRunComplete.shadowRunId}`)).toHaveTextContent('82%');
  });

  it('OC-12: grade not shown when null', () => {
    render(<ShadowRunStatusCard {...shadowRunPending} />);
    expect(screen.queryByTestId(`shadow-run-grade-${shadowRunPending.shadowRunId}`)).not.toBeInTheDocument();
  });

});

// ── LearningSignalRow ─────────────────────────────────────────────────────────

describe('OC-13..OC-18: LearningSignalRow', () => {

  it('OC-13: IMPROVING trend label shown', () => {
    render(<LearningSignalRow signalRecordId="SIG-001" gradeTrend="IMPROVING" ragContextSize={5} graphContextSize={3} />);
    expect(screen.getByTestId('signal-trend-SIG-001')).toHaveTextContent('Improving');
  });

  it('OC-14: STATIC trend label shown', () => {
    render(<LearningSignalRow signalRecordId="SIG-002" gradeTrend="STATIC" ragContextSize={4} graphContextSize={2} />);
    expect(screen.getByTestId('signal-trend-SIG-002')).toHaveTextContent('Static');
  });

  it('OC-15: DECLINING trend label shown', () => {
    render(<LearningSignalRow signalRecordId="SIG-003" gradeTrend="DECLINING" ragContextSize={3} graphContextSize={1} />);
    expect(screen.getByTestId('signal-trend-SIG-003')).toHaveTextContent('Declining');
  });

  it('OC-16: ragContextSize shown (signal 2 of 3)', () => {
    render(<LearningSignalRow signalRecordId="SIG-004" gradeTrend="STATIC" ragContextSize={7} graphContextSize={4} />);
    expect(screen.getByTestId('signal-rag-SIG-004')).toHaveTextContent('7');
  });

  it('OC-17: graphContextSize shown (signal 3 of 3)', () => {
    render(<LearningSignalRow signalRecordId="SIG-005" gradeTrend="IMPROVING" ragContextSize={5} graphContextSize={9} />);
    expect(screen.getByTestId('signal-graph-SIG-005')).toHaveTextContent('9');
  });

  it('OC-18: data-trend attribute matches trend value', () => {
    render(<LearningSignalRow signalRecordId="SIG-006" gradeTrend="IMPROVING" ragContextSize={5} graphContextSize={3} />);
    expect(screen.getByTestId('signal-trend-SIG-006')).toHaveAttribute('data-trend', 'IMPROVING');
  });

});

// ── OssCurriculumScreen ────────────────────────────────────────────────────────

describe('OC-19..OC-24: OssCurriculumScreen', () => {

  it('OC-19: renders tier assignment list when non-empty', () => {
    render(<OssCurriculumScreen tierAssignments={[tier1, tier3]} shadowRuns={[]} />);
    expect(screen.getByTestId('tier-assignments-list')).toBeInTheDocument();
    expect(screen.getByTestId('tier-item-DPO-001')).toBeInTheDocument();
    expect(screen.getByTestId('tier-item-DPO-002')).toBeInTheDocument();
  });

  it('OC-20: renders empty state for tiers when empty', () => {
    render(<OssCurriculumScreen tierAssignments={[]} shadowRuns={[]} />);
    expect(screen.getByTestId('tier-assignments-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('tier-assignments-list')).not.toBeInTheDocument();
  });

  it('OC-21: renders shadow run list when non-empty', () => {
    render(<OssCurriculumScreen tierAssignments={[]} shadowRuns={[shadowRunPending, shadowRunComplete]} />);
    expect(screen.getByTestId('shadow-runs-list')).toBeInTheDocument();
    expect(screen.getByTestId(`shadow-run-item-${shadowRunPending.shadowRunId}`)).toBeInTheDocument();
  });

  it('OC-22: renders empty state for shadow runs when empty', () => {
    render(<OssCurriculumScreen tierAssignments={[]} shadowRuns={[]} />);
    expect(screen.getByTestId('shadow-runs-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('shadow-runs-list')).not.toBeInTheDocument();
  });

  it('OC-23: full integration — 5 tier badges rendered', () => {
    const allTiers = [
      { dpoTripleId: 'A', curriculumTier: 1 },
      { dpoTripleId: 'B', curriculumTier: 2 },
      { dpoTripleId: 'C', curriculumTier: 3 },
      { dpoTripleId: 'D', curriculumTier: 4 },
      { dpoTripleId: 'E', curriculumTier: 5 },
    ];
    render(<OssCurriculumScreen tierAssignments={allTiers} shadowRuns={[]} />);
    for (const item of allTiers) {
      expect(screen.getByTestId(`tier-badge-${item.dpoTripleId}`)).toBeInTheDocument();
    }
  });

  it('OC-24: full integration — shadow run shows CF-804 fields', () => {
    render(<OssCurriculumScreen tierAssignments={[]} shadowRuns={[shadowRunComplete]} />);
    expect(screen.getByTestId(`shadow-run-model-${shadowRunComplete.shadowRunId}`)).toHaveTextContent('codellama:13b');
    expect(screen.getByTestId(`shadow-run-cycle-${shadowRunComplete.shadowRunId}`)).toHaveTextContent('CYCLE-2');
  });

});
