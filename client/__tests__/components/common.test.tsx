/**
 * P10.1 Tests — Common Components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataCard } from '../../src/components/common/DataCard';
import { LoadingState } from '../../src/components/common/LoadingState';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { FabricIcon } from '../../src/components/common/FabricIcon';
import { ErrorBoundary } from '../../src/components/common/ErrorBoundary';

// ══════════════════════════════════════════════════════
// DataCard
// ══════════════════════════════════════════════════════

describe('DataCard', () => {
  it('should render title and value', () => {
    render(<DataCard title="Factories" value={42} />);
    expect(screen.getByTestId('data-card-title')).toHaveTextContent('Factories');
    expect(screen.getByTestId('data-card-value')).toHaveTextContent('42');
  });

  it('should render subtitle when provided', () => {
    render(<DataCard title="Score" value="0.85" subtitle="Last 24h" />);
    expect(screen.getByTestId('data-card-subtitle')).toHaveTextContent('Last 24h');
  });

  it('should render trend indicator when provided', () => {
    render(<DataCard title="Pass Rate" value="92%" trend="up" />);
    expect(screen.getByTestId('data-card-trend')).toHaveTextContent('↑');
  });

  it('should not render trend when not provided', () => {
    render(<DataCard title="Count" value={10} />);
    expect(screen.queryByTestId('data-card-trend')).toBeNull();
  });

  it('should not render subtitle when not provided', () => {
    render(<DataCard title="Count" value={10} />);
    expect(screen.queryByTestId('data-card-subtitle')).toBeNull();
  });
});

// ══════════════════════════════════════════════════════
// LoadingState
// ══════════════════════════════════════════════════════

describe('LoadingState', () => {
  it('should render with default message', () => {
    render(<LoadingState />);
    expect(screen.getByTestId('loading-message')).toHaveTextContent('Loading...');
  });

  it('should render with custom message', () => {
    render(<LoadingState message="Fetching health data..." />);
    expect(screen.getByTestId('loading-message')).toHaveTextContent('Fetching health data...');
  });

  it('should render spinner', () => {
    render(<LoadingState />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════
// StatusBadge
// ══════════════════════════════════════════════════════

describe('StatusBadge', () => {
  it('should render HEALTHY badge with green style', () => {
    render(<StatusBadge status="HEALTHY" />);
    const badge = screen.getByTestId('status-badge-HEALTHY');
    expect(badge).toHaveTextContent('HEALTHY');
    expect(badge.className).toContain('bg-green');
  });

  it('should render DOWN badge with red style', () => {
    render(<StatusBadge status="DOWN" />);
    const badge = screen.getByTestId('status-badge-DOWN');
    expect(badge.className).toContain('bg-red');
  });

  it('should render DEGRADED badge with yellow style', () => {
    render(<StatusBadge status="DEGRADED" />);
    const badge = screen.getByTestId('status-badge-DEGRADED');
    expect(badge.className).toContain('bg-yellow');
  });

  it('should handle unknown status with default gray style', () => {
    render(<StatusBadge status="WEIRD" />);
    const badge = screen.getByTestId('status-badge-WEIRD');
    expect(badge.className).toContain('bg-gray');
  });

  it('should render promotion statuses', () => {
    render(<StatusBadge status="MINIMAL" />);
    expect(screen.getByTestId('status-badge-MINIMAL')).toHaveTextContent('MINIMAL');
  });

  it('should support size prop', () => {
    render(<StatusBadge status="HEALTHY" size="md" />);
    const badge = screen.getByTestId('status-badge-HEALTHY');
    expect(badge.className).toContain('py-1');
  });
});

// ══════════════════════════════════════════════════════
// FabricIcon
// ══════════════════════════════════════════════════════

describe('FabricIcon', () => {
  it('should render SVG for DATABASE', () => {
    render(<FabricIcon fabricType="DATABASE" />);
    const svg = screen.getByTestId('fabric-icon-DATABASE');
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });

  it('should render SVG for QUEUE', () => {
    render(<FabricIcon fabricType="QUEUE" />);
    expect(screen.getByTestId('fabric-icon-QUEUE')).toBeInTheDocument();
  });

  it('should render SVG for AI_ENGINE', () => {
    render(<FabricIcon fabricType="AI_ENGINE" />);
    expect(screen.getByTestId('fabric-icon-AI_ENGINE')).toBeInTheDocument();
  });

  it('should render fallback for unknown fabric', () => {
    render(<FabricIcon fabricType="UNKNOWN" />);
    expect(screen.getByTestId('fabric-icon-UNKNOWN')).toBeInTheDocument();
  });

  it('should accept custom size', () => {
    render(<FabricIcon fabricType="DATABASE" size={32} />);
    const svg = screen.getByTestId('fabric-icon-DATABASE');
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('32');
  });
});

// ══════════════════════════════════════════════════════
// ErrorBoundary
// ══════════════════════════════════════════════════════

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors
  const originalError = console.error;
  beforeAll(() => { console.error = jest.fn(); });
  afterAll(() => { console.error = originalError; });

  function ThrowingChild(): React.ReactElement {
    throw new Error('Test error');
  }

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('should show error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('error-message')).toHaveTextContent('Test error');
  });

  it('should show custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error</div>}>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });
});
