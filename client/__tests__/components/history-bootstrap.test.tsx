/**
 * FLOW-45 — History Bootstrap UI Tests.
 *
 * 24 tests in 4 groups:
 *   HB-1..HB-6:  ArchPatternCard — patternId, patternType, description + data attributes
 *   HB-7..HB-12: PhilosophySummaryRow — type label, count, aria-label
 *   HB-13..HB-18: BootstrapStatusBadge — COMPLETE/PARTIAL/FAILED + data attributes
 *   HB-19..HB-24: HistoryBootstrapScreen — patterns list + summaries list + empty states
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ArchPatternCard } from '../../src/components/history-bootstrap/ArchPatternCard';
import { PhilosophySummaryRow } from '../../src/components/history-bootstrap/PhilosophySummaryRow';
import { BootstrapStatusBadge } from '../../src/components/history-bootstrap/BootstrapStatusBadge';
import { HistoryBootstrapScreen } from '../../src/components/history-bootstrap/HistoryBootstrapScreen';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const patternFabricFirst = {
  patternId:   'AP-001',
  patternType: 'FABRIC_FIRST' as const,
  description: 'All infra access goes through fabric interfaces.',
};
const patternDataIntegrity = {
  patternId:   'AP-003',
  patternType: 'DATA_INTEGRITY' as const,
  description: 'storeDocument BEFORE enqueue.',
};
const patternMultiTenant = {
  patternId:   'AP-004',
  patternType: 'MULTI_TENANT' as const,
  description: 'Tenant context via AsyncLocalStorage.',
};

const summaryFabricFirst = {
  summarizationRunId: 'SUM-001',
  patternType:        'FABRIC_FIRST',
  patternCount:       2,
};
const summaryDataIntegrity = {
  summarizationRunId: 'SUM-001',
  patternType:        'DATA_INTEGRITY',
  patternCount:       1,
};

// ── ArchPatternCard ───────────────────────────────────────────────────────────

describe('HB-1..HB-6: ArchPatternCard', () => {

  it('HB-1: renders patternId', () => {
    render(<ArchPatternCard {...patternFabricFirst} />);
    expect(screen.getByTestId('arch-pattern-id-AP-001')).toHaveTextContent('AP-001');
  });

  it('HB-2: renders patternType', () => {
    render(<ArchPatternCard {...patternFabricFirst} />);
    expect(screen.getByTestId('arch-pattern-type-AP-001')).toHaveTextContent('FABRIC_FIRST');
  });

  it('HB-3: renders description text', () => {
    render(<ArchPatternCard {...patternFabricFirst} />);
    expect(screen.getByTestId('arch-pattern-desc-AP-001')).toHaveTextContent('All infra access');
  });

  it('HB-4: data-testid contains patternId', () => {
    render(<ArchPatternCard {...patternDataIntegrity} />);
    expect(screen.getByTestId('arch-pattern-AP-003')).toBeInTheDocument();
  });

  it('HB-5: data-pattern-type attribute matches patternType', () => {
    render(<ArchPatternCard {...patternMultiTenant} />);
    expect(screen.getByTestId('arch-pattern-AP-004')).toHaveAttribute('data-pattern-type', 'MULTI_TENANT');
  });

  it('HB-6: aria-label includes patternId and patternType', () => {
    render(<ArchPatternCard {...patternFabricFirst} />);
    expect(screen.getByTestId('arch-pattern-AP-001')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('AP-001'),
    );
  });

});

// ── PhilosophySummaryRow ──────────────────────────────────────────────────────

describe('HB-7..HB-12: PhilosophySummaryRow', () => {

  it('HB-7: renders patternType label', () => {
    render(<PhilosophySummaryRow {...summaryFabricFirst} />);
    expect(screen.getByTestId('summary-type-SUM-001-FABRIC_FIRST')).toHaveTextContent('FABRIC_FIRST');
  });

  it('HB-8: renders patternCount', () => {
    render(<PhilosophySummaryRow {...summaryFabricFirst} />);
    expect(screen.getByTestId('summary-count-SUM-001-FABRIC_FIRST')).toHaveTextContent('2');
  });

  it('HB-9: zero count rendered (not an error)', () => {
    render(<PhilosophySummaryRow summarizationRunId="SUM-002" patternType="UNKNOWN" patternCount={0} />);
    expect(screen.getByTestId('summary-count-SUM-002-UNKNOWN')).toHaveTextContent('0');
  });

  it('HB-10: data-testid for row contains runId and patternType', () => {
    render(<PhilosophySummaryRow {...summaryDataIntegrity} />);
    expect(screen.getByTestId('summary-row-SUM-001-DATA_INTEGRITY')).toBeInTheDocument();
  });

  it('HB-11: data-pattern-type attribute matches patternType', () => {
    render(<PhilosophySummaryRow {...summaryFabricFirst} />);
    expect(screen.getByTestId('summary-row-SUM-001-FABRIC_FIRST')).toHaveAttribute('data-pattern-type', 'FABRIC_FIRST');
  });

  it('HB-12: aria-label includes count', () => {
    render(<PhilosophySummaryRow {...summaryFabricFirst} />);
    expect(screen.getByTestId('summary-count-SUM-001-FABRIC_FIRST')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('2'),
    );
  });

});

// ── BootstrapStatusBadge ──────────────────────────────────────────────────────

describe('HB-13..HB-18: BootstrapStatusBadge', () => {

  it('HB-13: COMPLETE renders "Complete" label', () => {
    render(<BootstrapStatusBadge bootstrapRunId="RUN-001" completionStatus="COMPLETE" />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('HB-14: PARTIAL renders "Partial" label', () => {
    render(<BootstrapStatusBadge bootstrapRunId="RUN-002" completionStatus="PARTIAL" />);
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });

  it('HB-15: FAILED renders "Failed" label', () => {
    render(<BootstrapStatusBadge bootstrapRunId="RUN-003" completionStatus="FAILED" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('HB-16: data-testid contains bootstrapRunId', () => {
    render(<BootstrapStatusBadge bootstrapRunId="RUN-004" completionStatus="COMPLETE" />);
    expect(screen.getByTestId('bootstrap-status-RUN-004')).toBeInTheDocument();
  });

  it('HB-17: data-status attribute matches completionStatus', () => {
    render(<BootstrapStatusBadge bootstrapRunId="RUN-005" completionStatus="PARTIAL" />);
    expect(screen.getByTestId('bootstrap-status-RUN-005')).toHaveAttribute('data-status', 'PARTIAL');
  });

  it('HB-18: CSS class includes status variant', () => {
    render(<BootstrapStatusBadge bootstrapRunId="RUN-006" completionStatus="FAILED" />);
    expect(screen.getByTestId('bootstrap-status-RUN-006').className).toContain('bootstrap-status-badge--failed');
  });

});

// ── HistoryBootstrapScreen ────────────────────────────────────────────────────

describe('HB-19..HB-24: HistoryBootstrapScreen', () => {

  it('HB-19: renders patterns list when non-empty', () => {
    render(
      <HistoryBootstrapScreen
        bootstrapRunId="RUN-001"
        completionStatus="COMPLETE"
        patterns={[patternFabricFirst, patternDataIntegrity]}
        summaries={[]}
      />
    );
    expect(screen.getByTestId('patterns-list')).toBeInTheDocument();
    expect(screen.getByTestId('pattern-item-AP-001')).toBeInTheDocument();
    expect(screen.getByTestId('pattern-item-AP-003')).toBeInTheDocument();
  });

  it('HB-20: renders empty state for patterns when empty', () => {
    render(
      <HistoryBootstrapScreen
        bootstrapRunId="RUN-002"
        completionStatus="PARTIAL"
        patterns={[]}
        summaries={[]}
      />
    );
    expect(screen.getByTestId('patterns-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('patterns-list')).not.toBeInTheDocument();
  });

  it('HB-21: renders summaries list when non-empty', () => {
    render(
      <HistoryBootstrapScreen
        bootstrapRunId="RUN-003"
        completionStatus="COMPLETE"
        patterns={[]}
        summaries={[summaryFabricFirst, summaryDataIntegrity]}
      />
    );
    expect(screen.getByTestId('summaries-list')).toBeInTheDocument();
    expect(screen.getByTestId('summary-item-FABRIC_FIRST')).toBeInTheDocument();
    expect(screen.getByTestId('summary-item-DATA_INTEGRITY')).toBeInTheDocument();
  });

  it('HB-22: renders empty state for summaries when empty', () => {
    render(
      <HistoryBootstrapScreen
        bootstrapRunId="RUN-004"
        completionStatus="PARTIAL"
        patterns={[]}
        summaries={[]}
      />
    );
    expect(screen.getByTestId('summaries-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('summaries-list')).not.toBeInTheDocument();
  });

  it('HB-23: full integration — COMPLETE status badge shown with patterns', () => {
    render(
      <HistoryBootstrapScreen
        bootstrapRunId="RUN-005"
        completionStatus="COMPLETE"
        patterns={[patternFabricFirst, patternDataIntegrity, patternMultiTenant]}
        summaries={[summaryFabricFirst]}
      />
    );
    expect(screen.getByTestId('bootstrap-status-RUN-005')).toHaveTextContent('Complete');
    expect(screen.getByTestId('arch-pattern-AP-001')).toHaveAttribute('data-pattern-type', 'FABRIC_FIRST');
    expect(screen.getByTestId('arch-pattern-AP-003')).toHaveAttribute('data-pattern-type', 'DATA_INTEGRITY');
    expect(screen.getByTestId('arch-pattern-AP-004')).toHaveAttribute('data-pattern-type', 'MULTI_TENANT');
  });

  it('HB-24: full integration — summaries show grouped pattern counts', () => {
    render(
      <HistoryBootstrapScreen
        bootstrapRunId="RUN-006"
        completionStatus="COMPLETE"
        patterns={[]}
        summaries={[summaryFabricFirst, summaryDataIntegrity]}
      />
    );
    expect(screen.getByTestId('summary-count-SUM-001-FABRIC_FIRST')).toHaveTextContent('2');
    expect(screen.getByTestId('summary-count-SUM-001-DATA_INTEGRITY')).toHaveTextContent('1');
  });

});
