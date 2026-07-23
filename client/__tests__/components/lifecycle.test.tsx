/**
 * FlowLifecyclePanel — unit tests.
 * Stage 3.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FlowLifecyclePanel } from '../../src/components/lifecycle';
import type { FlowLifecycleRecord, LifecycleStatus } from '../../src/hooks/useFlowLifecycle';

const makeRecord = (status: LifecycleStatus = 'PENDING'): FlowLifecycleRecord => ({
  flowId: 'FLOW-01',
  status,
  updatedAt: '2026-03-24T10:00:00Z',
  updatedBy: 'system',
});

const noop = () => {};

describe('FlowLifecyclePanel', () => {
  it('renders lifecycle panel', () => {
    render(
      <FlowLifecyclePanel
        flowId="FLOW-01" record={makeRecord()} loading={false} error={null}
        allowedNext={['ACTIVE', 'FAILED']} onLoad={noop} onTransition={noop}
      />,
    );
    expect(screen.getByTestId('lifecycle-panel')).toBeInTheDocument();
  });

  it('shows status badge for PENDING', () => {
    render(
      <FlowLifecyclePanel
        flowId="FLOW-01" record={makeRecord('PENDING')} loading={false} error={null}
        allowedNext={['ACTIVE', 'FAILED']} onLoad={noop} onTransition={noop}
      />,
    );
    expect(screen.getByTestId('lifecycle-status-badge')).toHaveTextContent('PENDING');
  });

  it('shows status badge for ACTIVE', () => {
    render(
      <FlowLifecyclePanel
        flowId="FLOW-01" record={makeRecord('ACTIVE')} loading={false} error={null}
        allowedNext={['DEPRECATED', 'FAILED']} onLoad={noop} onTransition={noop}
      />,
    );
    expect(screen.getByTestId('lifecycle-status-badge')).toHaveTextContent('ACTIVE');
  });

  it('renders transition buttons for each allowed next status', () => {
    render(
      <FlowLifecyclePanel
        flowId="FLOW-01" record={makeRecord('PENDING')} loading={false} error={null}
        allowedNext={['ACTIVE', 'FAILED']} onLoad={noop} onTransition={noop}
      />,
    );
    expect(screen.getByTestId('transition-to-active')).toBeInTheDocument();
    expect(screen.getByTestId('transition-to-failed')).toBeInTheDocument();
  });

  it('calls onTransition with correct status when button clicked', () => {
    const onTransition = jest.fn();
    render(
      <FlowLifecyclePanel
        flowId="FLOW-01" record={makeRecord('PENDING')} loading={false} error={null}
        allowedNext={['ACTIVE']} onLoad={noop} onTransition={onTransition}
      />,
    );
    fireEvent.click(screen.getByTestId('transition-to-active'));
    expect(onTransition).toHaveBeenCalledWith('ACTIVE');
  });

  it('shows terminal state message when no transitions allowed', () => {
    render(
      <FlowLifecyclePanel
        flowId="FLOW-01" record={makeRecord('DEPRECATED')} loading={false} error={null}
        allowedNext={[]} onLoad={noop} onTransition={noop}
      />,
    );
    expect(screen.getByTestId('terminal-state-msg')).toBeInTheDocument();
  });

  it('shows no-record message when record is null', () => {
    render(
      <FlowLifecyclePanel
        flowId="FLOW-01" record={null} loading={false} error={null}
        allowedNext={[]} onLoad={noop} onTransition={noop}
      />,
    );
    expect(screen.getByTestId('lifecycle-no-record')).toBeInTheDocument();
  });

  it('calls onLoad when Refresh button clicked', () => {
    const onLoad = jest.fn();
    render(
      <FlowLifecyclePanel
        flowId="FLOW-01" record={makeRecord()} loading={false} error={null}
        allowedNext={[]} onLoad={onLoad} onTransition={noop}
      />,
    );
    fireEvent.click(screen.getByTestId('lifecycle-refresh-btn'));
    expect(onLoad).toHaveBeenCalledWith('FLOW-01');
  });

  it('disables transition buttons when loading', () => {
    render(
      <FlowLifecyclePanel
        flowId="FLOW-01" record={makeRecord('PENDING')} loading={true} error={null}
        allowedNext={['ACTIVE']} onLoad={noop} onTransition={noop}
      />,
    );
    expect(screen.getByTestId('transition-to-active')).toBeDisabled();
  });

  it('shows error when error is provided', () => {
    render(
      <FlowLifecyclePanel
        flowId="FLOW-01" record={null} loading={false} error="Transition failed"
        allowedNext={[]} onLoad={noop} onTransition={noop}
      />,
    );
    expect(screen.getByTestId('lifecycle-error')).toHaveTextContent('Transition failed');
  });
});
