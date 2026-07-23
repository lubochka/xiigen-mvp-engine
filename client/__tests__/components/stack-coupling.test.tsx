/**
 * FLOW-37 — Stack Coupling UI Tests.
 *
 * 24 tests in 4 groups:
 *   SC-1..SC-6:   StackCouplingBadge — category display + aria labels + data attributes
 *   SC-7..SC-12:  PortingStatusTag — status variants + CSS classes + data attributes
 *   SC-13..SC-18: CompatibilityReportCard — content + CF-799 INCOMPATIBLE prominence + dimensions
 *   SC-19..SC-24: StackPortingScreen — classifications list + reports list + empty states + integration
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { StackCouplingBadge } from '../../src/components/stack-coupling/StackCouplingBadge';
import { PortingStatusTag } from '../../src/components/stack-coupling/PortingStatusTag';
import { CompatibilityReportCard } from '../../src/components/stack-coupling/CompatibilityReportCard';
import { StackPortingScreen } from '../../src/components/stack-coupling/StackPortingScreen';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const neutralClassification  = { stackId: 'stack-react',   category: 'CONCEPT_NEUTRAL'  } as const;
const variesClassification   = { stackId: 'stack-vue',     category: 'IMPL_VARIES'      } as const;
const coupledClassification  = { stackId: 'stack-angular', category: 'STACK_COUPLED'    } as const;
const incompatClassification = { stackId: 'stack-legacy',  category: 'INCOMPATIBLE'     } as const;

const compatibleReport = {
  reportId:      'RPT-001',
  taskTypeId:    'T-100',
  stackId:       'stack-react',
  compatibility: 'COMPATIBLE' as const,
};

const incompatReport = {
  reportId:               'RPT-002',
  taskTypeId:             'T-101',
  stackId:                'stack-legacy',
  compatibility:          'INCOMPATIBLE' as const,
  incompatibleDimensions: ['data_model', 'event_schema'],
};

// ── StackCouplingBadge ────────────────────────────────────────────────────────

describe('SC-1..SC-6: StackCouplingBadge', () => {

  it('SC-1: CONCEPT_NEUTRAL renders "Neutral" label', () => {
    render(<StackCouplingBadge {...neutralClassification} />);
    expect(screen.getByText('Neutral')).toBeInTheDocument();
  });

  it('SC-2: IMPL_VARIES renders "Impl Varies" label', () => {
    render(<StackCouplingBadge {...variesClassification} />);
    expect(screen.getByText('Impl Varies')).toBeInTheDocument();
  });

  it('SC-3: STACK_COUPLED renders "Stack Coupled" label', () => {
    render(<StackCouplingBadge {...coupledClassification} />);
    expect(screen.getByText('Stack Coupled')).toBeInTheDocument();
  });

  it('SC-4: INCOMPATIBLE renders "Incompatible" label', () => {
    render(<StackCouplingBadge {...incompatClassification} />);
    expect(screen.getByText('Incompatible')).toBeInTheDocument();
  });

  it('SC-5: data-testid contains stackId', () => {
    render(<StackCouplingBadge {...neutralClassification} />);
    expect(screen.getByTestId('coupling-badge-stack-react')).toBeInTheDocument();
  });

  it('SC-6: aria-label includes stack name and category', () => {
    render(<StackCouplingBadge {...incompatClassification} />);
    const badge = screen.getByTestId('coupling-badge-stack-legacy');
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('stack-legacy'));
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Incompatible'));
  });

});

// ── PortingStatusTag ──────────────────────────────────────────────────────────

describe('SC-7..SC-12: PortingStatusTag', () => {

  it('SC-7: COMPLETE renders "Complete" label', () => {
    render(<PortingStatusTag portingRunId="RUN-001" status="COMPLETE" />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('SC-8: PARTIAL renders "Partial" label', () => {
    render(<PortingStatusTag portingRunId="RUN-002" status="PARTIAL" />);
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });

  it('SC-9: FAILED renders "Failed" label', () => {
    render(<PortingStatusTag portingRunId="RUN-003" status="FAILED" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('SC-10: data-testid contains portingRunId', () => {
    render(<PortingStatusTag portingRunId="RUN-004" status="COMPLETE" />);
    expect(screen.getByTestId('porting-status-RUN-004')).toBeInTheDocument();
  });

  it('SC-11: data-status attribute matches status', () => {
    render(<PortingStatusTag portingRunId="RUN-005" status="PARTIAL" />);
    const tag = screen.getByTestId('porting-status-RUN-005');
    expect(tag).toHaveAttribute('data-status', 'PARTIAL');
  });

  it('SC-12: CSS class includes status variant', () => {
    render(<PortingStatusTag portingRunId="RUN-006" status="FAILED" />);
    const tag = screen.getByTestId('porting-status-RUN-006');
    expect(tag.className).toContain('porting-status-tag--failed');
  });

});

// ── CompatibilityReportCard ───────────────────────────────────────────────────

describe('SC-13..SC-18: CompatibilityReportCard', () => {

  it('SC-13: renders taskTypeId and stackId', () => {
    render(<CompatibilityReportCard {...compatibleReport} />);
    expect(screen.getByTestId(`report-task-type-${compatibleReport.reportId}`)).toHaveTextContent('T-100');
    expect(screen.getByTestId(`report-stack-${compatibleReport.reportId}`)).toHaveTextContent('stack-react');
  });

  it('SC-14: COMPATIBLE shows "Compatible" status', () => {
    render(<CompatibilityReportCard {...compatibleReport} />);
    expect(screen.getByTestId(`report-status-${compatibleReport.reportId}`)).toHaveTextContent('Compatible');
  });

  it('SC-15: CF-799 — INCOMPATIBLE shows "Incompatible" status prominently', () => {
    render(<CompatibilityReportCard {...incompatReport} />);
    const status = screen.getByTestId(`report-status-${incompatReport.reportId}`);
    expect(status).toHaveTextContent('Incompatible');
    expect(screen.getByTestId(`compatibility-card-${incompatReport.reportId}`))
      .toHaveAttribute('data-compatibility', 'INCOMPATIBLE');
  });

  it('SC-16: incompatibleDimensions list rendered when present', () => {
    render(<CompatibilityReportCard {...incompatReport} />);
    const dimList = screen.getByTestId(`report-dimensions-${incompatReport.reportId}`);
    expect(dimList).toBeInTheDocument();
    expect(dimList).toHaveTextContent('data_model');
    expect(dimList).toHaveTextContent('event_schema');
  });

  it('SC-17: incompatibleDimensions list absent when undefined', () => {
    render(<CompatibilityReportCard {...compatibleReport} />);
    expect(screen.queryByTestId(`report-dimensions-${compatibleReport.reportId}`)).not.toBeInTheDocument();
  });

  it('SC-18: CSS class includes compatibility variant', () => {
    render(<CompatibilityReportCard {...incompatReport} />);
    const card = screen.getByTestId(`compatibility-card-${incompatReport.reportId}`);
    expect(card.className).toContain('compatibility-report-card--incompatible');
  });

});

// ── StackPortingScreen ────────────────────────────────────────────────────────

describe('SC-19..SC-24: StackPortingScreen', () => {

  it('SC-19: renders classifications list when non-empty', () => {
    render(
      <StackPortingScreen
        classifications={[neutralClassification, incompatClassification]}
        reports={[]}
      />
    );
    expect(screen.getByTestId('classifications-list')).toBeInTheDocument();
    expect(screen.getByTestId('classification-item-stack-react')).toBeInTheDocument();
    expect(screen.getByTestId('classification-item-stack-legacy')).toBeInTheDocument();
  });

  it('SC-20: renders empty state for classifications when empty', () => {
    render(<StackPortingScreen classifications={[]} reports={[]} />);
    expect(screen.getByTestId('classifications-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('classifications-list')).not.toBeInTheDocument();
  });

  it('SC-21: renders reports list when non-empty', () => {
    render(
      <StackPortingScreen
        classifications={[]}
        reports={[compatibleReport, incompatReport]}
      />
    );
    expect(screen.getByTestId('reports-list')).toBeInTheDocument();
    expect(screen.getByTestId(`report-item-${compatibleReport.reportId}`)).toBeInTheDocument();
    expect(screen.getByTestId(`report-item-${incompatReport.reportId}`)).toBeInTheDocument();
  });

  it('SC-22: renders empty state for reports when empty', () => {
    render(<StackPortingScreen classifications={[]} reports={[]} />);
    expect(screen.getByTestId('reports-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('reports-list')).not.toBeInTheDocument();
  });

  it('SC-23: full integration — all 4 categories shown as badges', () => {
    render(
      <StackPortingScreen
        classifications={[neutralClassification, variesClassification, coupledClassification, incompatClassification]}
        reports={[]}
      />
    );
    expect(screen.getByTestId('coupling-badge-stack-react')).toBeInTheDocument();
    expect(screen.getByTestId('coupling-badge-stack-vue')).toBeInTheDocument();
    expect(screen.getByTestId('coupling-badge-stack-angular')).toBeInTheDocument();
    expect(screen.getByTestId('coupling-badge-stack-legacy')).toBeInTheDocument();
  });

  it('SC-24: full integration — mixed COMPATIBLE and INCOMPATIBLE reports', () => {
    render(
      <StackPortingScreen
        classifications={[]}
        reports={[compatibleReport, incompatReport]}
      />
    );
    expect(screen.getByTestId(`report-status-${compatibleReport.reportId}`)).toHaveTextContent('Compatible');
    expect(screen.getByTestId(`report-status-${incompatReport.reportId}`)).toHaveTextContent('Incompatible');
  });

});
