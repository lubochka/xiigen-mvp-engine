/**
 * RunTracePanel + NodeTraceRow — unit tests.
 * Stage 3.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RunTracePanel, NodeTraceRow } from '../../src/components/run-trace';
import type { RunTrace, NodeTrace } from '../../src/hooks/useRunTrace';

const makeNode = (overrides?: Partial<NodeTrace>): NodeTrace => ({
  nodeId: 'n1',
  nodeType: 'ai-generate',
  status: 'PASS',
  score: 0.92,
  durationMs: 245,
  ...overrides,
});

const makeTrace = (overrides?: Partial<RunTrace>): RunTrace => ({
  runId: 'run-abc123',
  flowId: 'FLOW-01',
  taskTypeId: 'T47',
  tenantId: 'sys',
  status: 'PASS',
  score: 0.88,
  nodes: [makeNode()],
  startedAt: '2026-03-24T10:00:00Z',
  ...overrides,
});

describe('NodeTraceRow', () => {
  it('renders nodeType and nodeId', () => {
    render(<NodeTraceRow node={makeNode()} />);
    expect(screen.getByText('ai-generate')).toBeInTheDocument();
    expect(screen.getByText('n1')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    render(<NodeTraceRow node={makeNode({ status: 'FAIL' })} />);
    expect(screen.getByTestId('node-status-badge')).toHaveTextContent('FAIL');
  });

  it('shows score when present', () => {
    render(<NodeTraceRow node={makeNode({ score: 0.92 })} />);
    expect(screen.getByTestId('node-score')).toHaveTextContent('0.92');
  });

  it('shows duration', () => {
    render(<NodeTraceRow node={makeNode({ durationMs: 245 })} />);
    expect(screen.getByTestId('node-duration')).toHaveTextContent('245ms');
  });

  it('shows errorCode when present', () => {
    render(<NodeTraceRow node={makeNode({ status: 'FAIL', errorCode: 'HANDLER_FAILED' })} />);
    expect(screen.getByTestId('node-error-code')).toHaveTextContent('HANDLER_FAILED');
  });

  it('does not show score element when score is absent', () => {
    const { queryByTestId } = render(<NodeTraceRow node={makeNode({ score: undefined })} />);
    expect(queryByTestId('node-score')).toBeNull();
  });
});

describe('RunTracePanel', () => {
  it('shows loading state', () => {
    render(<RunTracePanel trace={null} polling={false} loading={true} error={null} />);
    expect(screen.getByTestId('run-trace-loading')).toBeInTheDocument();
  });

  it('shows error when no trace and error present', () => {
    render(<RunTracePanel trace={null} polling={false} loading={false} error="Not found" />);
    expect(screen.getByTestId('run-trace-error')).toHaveTextContent('Not found');
  });

  it('shows empty state when no trace', () => {
    render(<RunTracePanel trace={null} polling={false} loading={false} error={null} />);
    expect(screen.getByTestId('run-trace-empty')).toBeInTheDocument();
  });

  it('renders run ID in header', () => {
    render(<RunTracePanel trace={makeTrace()} polling={false} loading={false} error={null} />);
    expect(screen.getByText('run-abc123')).toBeInTheDocument();
  });

  it('shows run status badge', () => {
    render(<RunTracePanel trace={makeTrace({ status: 'FAIL' })} polling={false} loading={false} error={null} />);
    expect(screen.getByTestId('run-status-badge')).toHaveTextContent('FAIL');
  });

  it('shows run score', () => {
    render(<RunTracePanel trace={makeTrace({ score: 0.88 })} polling={false} loading={false} error={null} />);
    expect(screen.getByTestId('run-score')).toHaveTextContent('0.88');
  });

  it('shows Live indicator when polling', () => {
    render(<RunTracePanel trace={makeTrace({ status: 'RUNNING' })} polling={true} loading={false} error={null} />);
    expect(screen.getByTestId('polling-indicator')).toBeInTheDocument();
  });

  it('does not show Live indicator when not polling', () => {
    const { queryByTestId } = render(
      <RunTracePanel trace={makeTrace()} polling={false} loading={false} error={null} />,
    );
    expect(queryByTestId('polling-indicator')).toBeNull();
  });

  it('renders a row for each node', () => {
    const trace = makeTrace({
      nodes: [
        makeNode({ nodeId: 'n1', nodeType: 'rag-retrieve' }),
        makeNode({ nodeId: 'n2', nodeType: 'ai-generate', status: 'FAIL' }),
        makeNode({ nodeId: 'n3', nodeType: 'score', status: 'SKIP' }),
      ],
    });
    render(<RunTracePanel trace={trace} polling={false} loading={false} error={null} />);
    expect(screen.getByTestId('node-trace-n1')).toBeInTheDocument();
    expect(screen.getByTestId('node-trace-n2')).toBeInTheDocument();
    expect(screen.getByTestId('node-trace-n3')).toBeInTheDocument();
  });

  it('shows PASS/FAIL/SKIP counts', () => {
    const trace = makeTrace({
      nodes: [
        makeNode({ nodeId: 'n1', status: 'PASS' }),
        makeNode({ nodeId: 'n2', status: 'FAIL' }),
        makeNode({ nodeId: 'n3', status: 'SKIP' }),
      ],
    });
    render(<RunTracePanel trace={trace} polling={false} loading={false} error={null} />);
    expect(screen.getByText(/1 PASS/)).toBeInTheDocument();
    expect(screen.getByText(/1 FAIL/)).toBeInTheDocument();
    expect(screen.getByText(/1 SKIP/)).toBeInTheDocument();
  });
});
